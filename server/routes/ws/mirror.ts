// server/routes/ws/mirror.ts
// Nuxt 3 WebSocket signaling server for screen mirroring, notes, draw, clipboard

// ── Global safety net ─────────────────────────────────────────────────────────
// Nitro/uWebSockets throws ECONNABORTED / ECONNRESET at the process level when
// a client disconnects abruptly while a write is in flight. This prevents the
// dev server from restarting every few seconds.
if (process.env.NODE_ENV !== "production") {
  // In dev only – swallow broken-pipe style errors that come from WS writes
  process.on("uncaughtException", (err: any) => {
    if (
      err?.code === "ECONNABORTED" ||
      err?.code === "ECONNRESET" ||
      err?.code === "EPIPE" ||
      err?.message?.includes("write ECONNABORTED") ||
      err?.message?.includes("write ECONNRESET") ||
      err?.message?.includes("write EPIPE")
    ) {
      // Silently ignore – this is just a client that closed its socket
      return;
    }
    // Re-throw anything else so real bugs still surface
    throw err;
  });
}

interface SessionPeer {
  peer: any;
  role: "host" | "viewer";
  id: string;
}

// In-memory session store: sessionId → peers[]
const sessions = new Map<string, SessionPeer[]>();

const getPeers = (sessionId: string): SessionPeer[] => {
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  return sessions.get(sessionId)!;
};

const removePeer = (sessionId: string, id: string) => {
  const peers = getPeers(sessionId);
  const idx = peers.findIndex((p) => p.id === id);
  if (idx !== -1) peers.splice(idx, 1);
};

const isOpen = (peer: any): boolean => {
  try {
    // crossws exposes readyState on the underlying socket
    const ws = peer.websocket ?? peer._ws ?? peer;
    if (typeof ws.readyState === "number") return ws.readyState === 1; // OPEN
    return true; // assume open if we can't check
  } catch {
    return false;
  }
};

const sendTo = (peer: any, data: object) => {
  if (!isOpen(peer)) return;
  try {
    peer.send(JSON.stringify(data));
  } catch (err: any) {
    // Swallow expected disconnection errors – don't let them bubble up
    if (
      err?.code !== "ECONNABORTED" &&
      err?.code !== "ECONNRESET" &&
      err?.code !== "EPIPE"
    ) {
      console.warn("[ws-mirror] sendTo error:", err?.message);
    }
  }
};

const broadcastToSession = (
  sessionId: string,
  data: object,
  excludeId?: string,
) => {
  for (const sp of getPeers(sessionId)) {
    if (sp.id !== excludeId) sendTo(sp.peer, data);
  }
};

export default defineWebSocketHandler({
  open(peer) {
    const url = new URL(peer.request?.url ?? "", "http://localhost");
    const session = url.searchParams.get("session") ?? "";
    const role = (url.searchParams.get("role") ?? "viewer") as
      | "host"
      | "viewer";
    const id = Math.random().toString(36).slice(2, 10);

    if (!session) {
      sendTo(peer, { type: "error", message: "Missing session parameter" });
      peer.close();
      return;
    }

    // Store metadata on peer object
    (peer as any)._session = session;
    (peer as any)._role = role;
    (peer as any)._id = id;

    // Add to session
    const peers = getPeers(session);
    peers.push({ peer, role, id });

    // Confirm connection
    sendTo(peer, { type: "connected", id, role, session });

    console.log(
      `[ws-mirror] ${role} ${id} joined session ${session} (${peers.length} total)`,
    );

    // If a viewer just joined and there's a host → notify host
    if (role === "viewer") {
      const host = peers.find((p) => p.role === "host" && p.id !== id);
      if (host) {
        sendTo(host.peer, { type: "viewer_ready", viewerId: id });
      }
    }

    // If a host just joined and there are waiting viewers → notify them
    if (role === "host") {
      const viewers = peers.filter((p) => p.role === "viewer");
      for (const v of viewers) {
        sendTo(peer, { type: "viewer_ready", viewerId: v.id });
      }
    }
  },

  message(peer, message) {
    const session: string = (peer as any)._session ?? "";
    const id: string = (peer as any)._id ?? "";
    const role: string = (peer as any)._role ?? "";

    let msg: any;
    try {
      msg = JSON.parse(message.text());
    } catch {
      return;
    }

    const peers = getPeers(session);

    // ── WebRTC signaling relay ────────────────────────────────────────────────
    if (msg.type === "offer") {
      // Host → all viewers
      const viewers = peers.filter((p) => p.role === "viewer");
      for (const v of viewers) {
        sendTo(v.peer, { type: "offer", offer: msg.offer });
      }
      return;
    }

    if (msg.type === "answer") {
      // Viewer → host
      const host = peers.find((p) => p.role === "host");
      if (host) sendTo(host.peer, { type: "answer", answer: msg.answer });
      return;
    }

    if (msg.type === "ice") {
      // Relay ICE candidate to all other peers in session
      for (const sp of peers) {
        if (sp.id !== id)
          sendTo(sp.peer, { type: "ice", candidate: msg.candidate });
      }
      return;
    }

    if (msg.type === "cancel") {
      // Host stopped sharing → notify viewers
      broadcastToSession(session, { type: "cancel" }, id);
      return;
    }

    // ── Notepad sync ──────────────────────────────────────────────────────────
    if (msg.type === "note") {
      broadcastToSession(session, { type: "note", text: msg.text }, id);
      return;
    }

    // ── Draw sync ─────────────────────────────────────────────────────────────
    if (msg.type === "draw") {
      broadcastToSession(session, { type: "draw", strokes: msg.strokes }, id);
      return;
    }

    if (msg.type === "draw_clear") {
      broadcastToSession(session, { type: "draw_clear" }, id);
      return;
    }

    // ── Clipboard sync ────────────────────────────────────────────────────────
    if (msg.type === "clip") {
      broadcastToSession(session, { type: "clip", item: msg.item }, id);
      return;
    }

    // ── Generic broadcast (fallback) ──────────────────────────────────────────
    broadcastToSession(session, { ...msg, from: id }, id);
  },

  close(peer) {
    const session: string = (peer as any)._session ?? "";
    const id: string = (peer as any)._id ?? "";
    const role: string = (peer as any)._role ?? "";

    if (!session) return;

    removePeer(session, id);
    console.log(`[ws-mirror] ${role} ${id} left session ${session}`);

    // Notify remaining peers
    broadcastToSession(session, { type: "peer_left", role, id });

    // Clean up empty sessions
    if (getPeers(session).length === 0) {
      sessions.delete(session);
    }
  },

  error(peer, error: any) {
    // ECONNABORTED / ECONNRESET / EPIPE = client closed abruptly, not a real error
    if (
      error?.code === "ECONNABORTED" ||
      error?.code === "ECONNRESET" ||
      error?.code === "EPIPE" ||
      error?.message?.includes("ECONNABORTED") ||
      error?.message?.includes("ECONNRESET")
    ) {
      return;
    }
    console.error("[ws-mirror] unexpected error:", error);
  },
});
