import { ref, onUnmounted } from "vue";

export const useRoom = () => {
  const roomId = ref("");
  const myPeerId = ref("");
  const myName = ref("");
  const status = ref("idle"); // idle | loading | ready | error
  const members = ref([]); // [{ peerId, name, joined }]
  const messages = ref([]); // chat + file messages

  const isCameraActive = ref(true);
  const isMicActive = ref(true);
  const localStream = ref(null);

  let peer = null;
  const dataConns = new Map(); // peerId -> DataConnection
  const mediaConns = new Map(); // peerId -> { call, stream }
  const messageHandlers = new Set();
  const leaveTimers = new Map(); // peerId -> timer (grace period before evicting on disconnect)

  // ── PeerJS loader ────────────────────────────────────────────────────────
  const loadPeerJS = () =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject();
      if (window.Peer) return resolve();
      const s = document.createElement("script");
      s.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  // ── ICE servers ──────────────────────────────────────────────────────────
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  // ── Init peer ────────────────────────────────────────────────────────────
  const init = async (name, desiredId = null) => {
    if (!import.meta.client) return;
    myName.value = name || "Guest";
    status.value = "loading";

    try {
      await loadPeerJS();
      if (peer && !peer.destroyed) peer.destroy();

      peer = new window.Peer(desiredId || undefined, {
        debug: 0,
        config: { iceServers },
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("PeerJS timeout")),
          20000,
        );
        peer.on("open", (id) => {
          clearTimeout(timeout);
          myPeerId.value = id;
          status.value = "ready";
          resolve(id);
        });
        peer.on("error", (err) => {
          clearTimeout(timeout);
          if (err.type === "unavailable-id") {
            peer.destroy();
            init(name).then(resolve).catch(reject);
            return;
          }
          status.value = "error";
          reject(err);
        });
      });

      peer.on("connection", (conn) => _setupDataConn(conn));
      peer.on("call", (call) => _handleIncomingCall(call));
    } catch (err) {
      status.value = "error";
      console.error("[Room] init failed:", err);
    }
  };

  // ── Data connection setup ─────────────────────────────────────────────────
  const _setupDataConn = (conn) => {
    conn.on("open", () => {
      dataConns.set(conn.peer, conn);
      conn.send({
        type: "join",
        peerId: myPeerId.value,
        name: myName.value,
        roomId: roomId.value,
      });
    });

    conn.on("data", (data) => _handleData(data, conn.peer));

    conn.on("close", () => {
      dataConns.delete(conn.peer);
      // Don't evict immediately — the peer may be refreshing and will rejoin
      // with a new peer ID within a few seconds. If they do, _addMember will
      // cancel this timer and clean up the old entry by name instead.
      const timer = setTimeout(() => {
        _removeMember(conn.peer);
        mediaConns.delete(conn.peer);
        leaveTimers.delete(conn.peer);
      }, 6000);
      leaveTimers.set(conn.peer, { timer, peerId: conn.peer });
    });

    conn.on("error", (err) => {
      console.warn("[Room] data conn error:", err);
      dataConns.delete(conn.peer);
      const timer = setTimeout(() => {
        _removeMember(conn.peer);
        leaveTimers.delete(conn.peer);
      }, 6000);
      leaveTimers.set(conn.peer, { timer, peerId: conn.peer });
    });
  };

  // ── Handle incoming data ──────────────────────────────────────────────────
  const _handleData = (data, fromPeerId) => {
    if (data.type === "join") {
      // If someone with the same name is already in the member list under a
      // different peer ID, they refreshed — evict the stale entry and close
      // any media connection that was open to that old ID.
      const stale = members.value.find(
        (m) => m.name === data.name && m.peerId !== data.peerId,
      );
      if (stale) {
        _cancelLeaveTimer(stale.peerId);
        _removeMember(stale.peerId);
        const staleMedia = mediaConns.get(stale.peerId);
        if (staleMedia) {
          try {
            staleMedia.call?.close();
          } catch {}
          mediaConns.delete(stale.peerId);
        }
        dataConns.delete(stale.peerId);
        // Tell our VideoGrid etc. that the old stream is gone
        for (const handler of messageHandlers) {
          handler({ type: "call-ended", peerId: stale.peerId }, stale.peerId);
        }
      }

      _addMember({ peerId: data.peerId, name: data.name });

      // Send our info back + current member list so the joiner
      // knows everyone in the room.
      const conn = dataConns.get(fromPeerId);
      if (conn?.open) {
        conn.send({
          type: "join-ack",
          peerId: myPeerId.value,
          name: myName.value,
          // Full member list so the joiner can discover and data-connect everyone
          members: members.value,
        });
      }

      // Notify ALL existing peers about the new joiner so they can open a
      // data channel to them. Without this, B never learns C joined at all.
      broadcast(
        { type: "peer-joined", peerId: data.peerId, name: data.name },
        [data.peerId], // don't echo back to the joiner
      );
    } else if (data.type === "join-ack") {
      _addMember({ peerId: data.peerId, name: data.name });

      // Learn about every other member already in the room and open a
      // data channel to each — data-only, no auto media call.
      if (Array.isArray(data.members)) {
        data.members.forEach((m) => {
          if (m.peerId !== myPeerId.value) {
            _addMember(m);
            if (!dataConns.has(m.peerId)) connectTo(m.peerId);
          }
        });
      }
    } else if (data.type === "peer-joined") {
      // A peer we didn't know about just joined; open a data channel to them.
      const { peerId, name } = data;
      if (peerId === myPeerId.value) return;
      _addMember({ peerId, name });
      if (!dataConns.has(peerId)) connectTo(peerId);
    } else if (data.type === "leave") {
      _removeMember(data.peerId);
    } else if (data.type === "chat" || data.type === "file") {
      messages.value = [...messages.value, { ...data, fromMe: false }];
    }

    for (const handler of messageHandlers) {
      handler(data, fromPeerId);
    }
  };

  const _cancelLeaveTimer = (peerId) => {
    const entry = leaveTimers.get(peerId);
    if (entry) {
      clearTimeout(entry.timer);
      leaveTimers.delete(peerId);
    }
  };

  const _addMember = (member) => {
    // Cancel any pending eviction for this peer (e.g. they reconnected quickly)
    _cancelLeaveTimer(member.peerId);
    if (
      !members.value.find((m) => m.peerId === member.peerId) &&
      member.peerId !== myPeerId.value
    ) {
      members.value = [...members.value, { ...member, joined: Date.now() }];
    }
  };

  const _removeMember = (peerId) => {
    members.value = members.value.filter((m) => m.peerId !== peerId);
  };

  // ── Connect to another peer (data channel) ───────────────────────────────
  const connectTo = (remotePeerId) => {
    if (!peer || peer.destroyed) return;
    if (dataConns.has(remotePeerId)) return;
    const conn = peer.connect(remotePeerId, { reliable: true });
    _setupDataConn(conn);
  };

  // ── Broadcast data ────────────────────────────────────────────────────────
  const broadcast = (data, excludePeers = []) => {
    for (const [peerId, conn] of dataConns) {
      if (excludePeers.includes(peerId)) continue;
      try {
        if (conn.open) conn.send(data);
      } catch {}
    }
  };

  const sendTo = (peerId, data) => {
    const conn = dataConns.get(peerId);
    try {
      if (conn?.open) conn.send(data);
    } catch {}
  };

  // ── Chat + File ───────────────────────────────────────────────────────────
  const sendChat = (text) => {
    const msg = {
      type: "chat",
      id: Date.now() + Math.random().toString(36).slice(2),
      peerId: myPeerId.value,
      name: myName.value,
      text,
      time: Date.now(),
      fromMe: true,
    };
    messages.value = [...messages.value, msg];
    broadcast({ ...msg, fromMe: false });
  };

  const sendFile = async (file) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (file.size > 5 * 1024 * 1024) {
      const msg = {
        type: "file",
        id: Date.now() + Math.random().toString(36).slice(2),
        peerId: myPeerId.value,
        name: myName.value,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isImage,
        isVideo,
        url: null,
        tooBig: true,
        time: Date.now(),
        fromMe: true,
      };
      messages.value = [...messages.value, msg];
      return;
    }

    const reader = new FileReader();
    const base64 = await new Promise((res, rej) => {
      reader.onload = (e) => res(e.target.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    const msg = {
      type: "file",
      id: Date.now() + Math.random().toString(36).slice(2),
      peerId: myPeerId.value,
      name: myName.value,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isImage,
      isVideo,
      url: base64,
      time: Date.now(),
      fromMe: true,
    };
    messages.value = [...messages.value, msg];
    broadcast({ ...msg, fromMe: false });
  };

  // ── Media Core ────────────────────────────────────────────────────────────
  const _syncTrackStates = (stream) => {
    stream.getVideoTracks().forEach((t) => (t.enabled = isCameraActive.value));
    stream.getAudioTracks().forEach((t) => (t.enabled = isMicActive.value));
  };

  const getLocalStream = async (video = true) => {
    if (localStream.value) {
      _syncTrackStates(localStream.value);
      return localStream.value;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720, facingMode: "user" } : false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStream.value = stream;
      _syncTrackStates(stream);
      return stream;
    } catch (e) {
      console.error("[Room] getUserMedia failed:", e);
      return null;
    }
  };

  const toggleCamera = () => {
    isCameraActive.value = !isCameraActive.value;
    if (localStream.value) {
      localStream.value
        .getVideoTracks()
        .forEach((t) => (t.enabled = isCameraActive.value));
    }
  };

  const toggleMic = () => {
    isMicActive.value = !isMicActive.value;
    if (localStream.value) {
      localStream.value
        .getAudioTracks()
        .forEach((t) => (t.enabled = isMicActive.value));
    }
  };

  const stopLocalStream = () => {
    if (localStream.value) {
      localStream.value.getTracks().forEach((t) => t.stop());
      localStream.value = null;
    }
    isCameraActive.value = false;
    isMicActive.value = false;
  };

  const callPeer = async (remotePeerId, withVideo = true) => {
    const stream = await getLocalStream(withVideo);
    if (!stream || !peer) return null;

    const call = peer.call(remotePeerId, stream, {
      metadata: { name: myName.value, withVideo },
    });

    // Track the call so components can check state via mediaConns
    mediaConns.set(remotePeerId, { call, stream: null });

    call.on("stream", (remoteStream) => {
      const existing = mediaConns.get(remotePeerId) || {};
      mediaConns.set(remotePeerId, { ...existing, call, stream: remoteStream });
      for (const handler of messageHandlers) {
        handler(
          { type: "remote-stream", peerId: remotePeerId, stream: remoteStream },
          remotePeerId,
        );
      }
    });

    call.on("close", () => {
      mediaConns.delete(remotePeerId);
      for (const handler of messageHandlers) {
        handler({ type: "call-ended", peerId: remotePeerId }, remotePeerId);
      }
    });

    call.on("error", (err) => {
      console.warn("[Room] media call error:", err);
      mediaConns.delete(remotePeerId);
    });

    return call;
  };

  const _handleIncomingCall = async (call) => {
    const remotePeerId = call.peer;
    for (const handler of messageHandlers) {
      handler(
        {
          type: "incoming-call",
          call,
          peerId: remotePeerId,
          metadata: call.metadata,
        },
        remotePeerId,
      );
    }
  };

  const answerCall = async (call, withVideo = true) => {
    const stream = await getLocalStream(withVideo);
    if (!stream) return;
    call.answer(stream);
    mediaConns.set(call.peer, { call, stream: null });

    call.on("stream", (remoteStream) => {
      const existing = mediaConns.get(call.peer) || {};
      mediaConns.set(call.peer, { ...existing, stream: remoteStream });
      for (const handler of messageHandlers) {
        handler(
          { type: "remote-stream", peerId: call.peer, stream: remoteStream },
          call.peer,
        );
      }
    });

    call.on("close", () => {
      mediaConns.delete(call.peer);
      for (const handler of messageHandlers) {
        handler({ type: "call-ended", peerId: call.peer }, call.peer);
      }
    });

    call.on("error", (err) => {
      console.warn("[Room] answer call error:", err);
      mediaConns.delete(call.peer);
    });
  };

  const hangUpPeer = (remotePeerId) => {
    const conn = mediaConns.get(remotePeerId);
    conn?.call?.close();
    mediaConns.delete(remotePeerId);
  };

  // ── Screen share ──────────────────────────────────────────────────────────
  const getScreenStream = async () => {
    if (navigator.mediaDevices?.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor",
            selfBrowserSurface: "exclude",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            suppressLocalAudioPlayback: true,
          },
        });
        return stream;
      } catch (e) {
        if (e.name === "NotAllowedError") return null;
      }
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
    } catch {
      return null;
    }
  };

  // ── Message handler subscription ─────────────────────────────────────────
  const onMessage = (handler) => {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  };

  const getPeer = () => peer;
  const getDataConn = (peerId) => dataConns.get(peerId);

  // ── Destroy ───────────────────────────────────────────────────────────────
  const destroy = () => {
    broadcast({ type: "leave", peerId: myPeerId.value });
    stopLocalStream();
    for (const [, { call }] of mediaConns) {
      try {
        call?.close();
      } catch {}
    }
    for (const [, entry] of leaveTimers) clearTimeout(entry.timer);
    leaveTimers.clear();
    mediaConns.clear();
    dataConns.clear();
    if (peer && !peer.destroyed) peer.destroy();
    members.value = [];
    messages.value = [];
    myPeerId.value = "";
    status.value = "idle";
    messageHandlers.clear();
  };

  onUnmounted(destroy);

  return {
    roomId,
    myPeerId,
    myName,
    status,
    members,
    messages,
    isCameraActive,
    isMicActive,
    localStream,
    init,
    connectTo,
    broadcast,
    sendTo,
    sendChat,
    sendFile,
    callPeer,
    answerCall,
    hangUpPeer,
    toggleCamera,
    toggleMic,
    getLocalStream,
    stopLocalStream,
    getScreenStream,
    onMessage,
    getPeer,
    getDataConn,
    destroy,
  };
};
