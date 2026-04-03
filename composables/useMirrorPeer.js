// composables/useMirrorPeer.js
import { ref, onUnmounted } from "vue";

export const useMirrorPeer = () => {
  const peerId = ref("");
  const status = ref("idle");
  const connectedPeers = ref([]);

  let peer = null;
  let connections = new Map();
  const messageHandlers = new Set();

  const loadPeerJS = () =>
    new Promise((resolve, reject) => {
      if (window.Peer) return resolve();
      const s = document.createElement("script");
      s.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  const init = async (desiredId = null) => {
    if (!import.meta.client) return;
    status.value = "loading";

    try {
      await loadPeerJS();
      if (peer && !peer.destroyed) peer.destroy();

      // Use explicit STUN/TURN so mobile across networks works
      peer = new window.Peer(desiredId || undefined, {
        debug: 0,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
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
          ],
        },
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("PeerJS timeout")),
          20000,
        );

        peer.on("open", (id) => {
          clearTimeout(timeout);
          peerId.value = id;
          status.value = "ready";
          resolve(id);
        });

        peer.on("error", (err) => {
          clearTimeout(timeout);
          if (err.type === "unavailable-id") {
            peer.destroy();
            init().then(resolve).catch(reject);
            return;
          }
          status.value = "error";
          console.error("[MirrorPeer] error:", err);
          reject(err);
        });
      });

      peer.on("connection", (conn) => {
        setupConnection(conn);
      });
    } catch (err) {
      status.value = "error";
      console.error("[MirrorPeer] init failed:", err);
    }
  };

  const setupConnection = (conn) => {
    conn.on("open", () => {
      connections.set(conn.peer, conn);
      if (!connectedPeers.value.includes(conn.peer)) {
        connectedPeers.value = [...connectedPeers.value, conn.peer];
      }
    });

    conn.on("data", (data) => {
      for (const handler of messageHandlers) {
        handler(data, conn.peer);
      }
    });

    conn.on("close", () => {
      connections.delete(conn.peer);
      connectedPeers.value = connectedPeers.value.filter(
        (id) => id !== conn.peer,
      );
    });

    conn.on("error", (err) => {
      console.warn("[MirrorPeer] conn error:", err);
      connections.delete(conn.peer);
      connectedPeers.value = connectedPeers.value.filter(
        (id) => id !== conn.peer,
      );
    });
  };

  const connectTo = (remotePeerId) => {
    if (!peer || peer.destroyed) return null;
    if (connections.has(remotePeerId)) return connections.get(remotePeerId);
    const conn = peer.connect(remotePeerId, { reliable: true });
    setupConnection(conn);
    return conn;
  };

  const broadcast = (data) => {
    for (const [, conn] of connections) {
      try {
        if (conn.open) conn.send(data);
      } catch {}
    }
  };

  const sendTo = (remotePeerId, data) => {
    const conn = connections.get(remotePeerId);
    try {
      if (conn?.open) conn.send(data);
    } catch {}
  };

  const onMessage = (handler) => {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  };

  const getPeer = () => peer;

  const destroy = () => {
    if (peer && !peer.destroyed) peer.destroy();
    connections.clear();
    connectedPeers.value = [];
    peerId.value = "";
    status.value = "idle";
    messageHandlers.clear();
  };

  onUnmounted(destroy);

  return {
    peerId,
    status,
    connectedPeers,
    init,
    connectTo,
    broadcast,
    sendTo,
    onMessage,
    getPeer,
    destroy,
  };
};
