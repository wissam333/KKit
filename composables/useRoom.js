import { ref, computed, onUnmounted } from "vue";

export const useRoom = () => {
  const roomId = ref("");
  const myPeerId = ref("");
  const myName = ref("");
  const status = ref("idle"); // idle | loading | ready | error
  const members = ref([]); // [{ peerId, name, joined }]
  const messages = ref([]); // chat + file messages

  // --- Reactive Media State ---
  const isCameraActive = ref(true);
  const isMicActive = ref(true);
  const localStream = ref(null);

  let peer = null;
  const dataConns = new Map(); // peerId -> DataConnection
  const mediaConns = new Map(); // peerId -> { call, stream }
  const messageHandlers = new Set();

  // ── PeerJS loader ─────────────────────────────────────────────────────────
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

  // ── ICE servers ───────────────────────────────────────────────────────────
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

  // ── Init peer ─────────────────────────────────────────────────────────────
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

      // Incoming data connections
      peer.on("connection", (conn) => {
        _setupDataConn(conn);
      });

      // Incoming media calls — route through messageHandlers so all
      // components (VideoGrid, ScreenShare) can handle them in one place.
      peer.on("call", (call) => {
        _handleIncomingCall(call);
      });
    } catch (err) {
      status.value = "error";
      console.error("[Room] init failed:", err);
    }
  };

  // ── Data connection setup ─────────────────────────────────────────────────
  const _setupDataConn = (conn) => {
    conn.on("open", () => {
      dataConns.set(conn.peer, conn);
      // Send our identity
      conn.send({
        type: "join",
        peerId: myPeerId.value,
        name: myName.value,
        roomId: roomId.value,
      });
    });

    conn.on("data", (data) => {
      _handleData(data, conn.peer);
    });

    conn.on("close", () => {
      _removeMember(conn.peer);
      dataConns.delete(conn.peer);
      mediaConns.delete(conn.peer);
    });

    conn.on("error", (err) => {
      console.warn("[Room] data conn error:", err);
      _removeMember(conn.peer);
      dataConns.delete(conn.peer);
    });
  };

  // ── Handle incoming data ──────────────────────────────────────────────────
  const _handleData = (data, fromPeerId) => {
    if (data.type === "join") {
      _addMember({ peerId: data.peerId, name: data.name });
      // Send back our info
      const conn = dataConns.get(fromPeerId);
      if (conn?.open) {
        conn.send({
          type: "join-ack",
          peerId: myPeerId.value,
          name: myName.value,
          members: members.value,
        });
      }
    } else if (data.type === "join-ack") {
      _addMember({ peerId: data.peerId, name: data.name });
      // Also learn about other members
      if (Array.isArray(data.members)) {
        data.members.forEach((m) => {
          if (m.peerId !== myPeerId.value) _addMember(m);
        });
      }
    } else if (data.type === "leave") {
      _removeMember(data.peerId);
    } else if (data.type === "chat" || data.type === "file") {
      messages.value = [...messages.value, { ...data, fromMe: false }];
    }

    // Notify all handlers
    for (const handler of messageHandlers) {
      handler(data, fromPeerId);
    }
  };

  const _addMember = (member) => {
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

  // ── Connect to another peer (join mesh) ───────────────────────────────────
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

    // Read as base64 for images/small files (< 5MB)
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
      // Re-sync every time we hand the stream to a new caller (e.g. callPeer)
      // so that a mute toggled before the call still takes effect.
      _syncTrackStates(localStream.value);
      return localStream.value;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720, facingMode: "user" } : false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStream.value = stream;
      // Force-apply whatever flags were set before the stream arrived
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
    // Always derive the new state by flipping the flag, then push it to the
    // track. Never read track.enabled to decide the next state — the flag IS
    // the source of truth. This avoids the double-click bug where flag and
    // track.enabled were one step out of sync.
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
            // Hint for browsers/PWA that support it
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
        // Fall through to mobile camera fallback
      }
    }

    // Mobile PWA fallback: use rear camera as "share"
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
