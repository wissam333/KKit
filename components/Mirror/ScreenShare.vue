<template>
  <div class="screen-layout">
    <!-- HOST PANEL -->
    <div class="screen-panel">
      <div class="screen-panel-header">
        <div class="sph-left">
          <Icon name="mdi:monitor-share" size="16" /><span>{{
            $t("hostShareScreen")
          }}</span>
        </div>
        <span class="sc-badge" :class="hostState">{{ hostStateLabel }}</span>
      </div>

      <div v-if="!isSecure" class="warn-banner">
        <Icon name="mdi:lock-alert-outline" size="16" />
        <span
          >Screen capture requires HTTPS. Run:
          <code>nuxt dev --https --host</code></span
        >
      </div>

      <!-- Step 1: Peer connecting -->
      <div class="sc-step" v-if="hostState === 'idle'">
        <div class="sc-num">1</div>
        <div class="sc-body">
          <p class="sc-title">Connecting to network…</p>
          <div class="sc-spinner-row">
            <Icon name="mdi:loading" size="18" class="spin" /><span
              >Setting up peer connection</span
            >
          </div>
        </div>
      </div>

      <!-- Step 2: Ready to capture -->
      <div class="sc-step" v-if="hostState === 'ready'">
        <div class="sc-num">1</div>
        <div class="sc-body">
          <p class="sc-title">{{ $t("captureYourScreen") }}</p>
          <p class="sc-desc">{{ $t("captureDesc") }}</p>
          <button class="sc-btn" :disabled="!isSecure" @click="startCapture">
            <Icon name="mdi:cast-variant" size="16" />{{
              $t("startScreenCapture")
            }}
          </button>
        </div>
      </div>

      <!-- Preview + link after capture -->
      <template v-if="hostState === 'captured' || hostState === 'streaming'">
        <div class="sc-preview-wrap">
          <video
            ref="hostVideoEl"
            class="sc-video"
            autoplay
            muted
            playsinline
          />
          <div class="sc-preview-badge">
            <span class="live-dot active" />{{ $t("yourScreenPreview") }}
          </div>
        </div>

        <div class="sc-step" v-if="hostState === 'captured'">
          <div class="sc-num">2</div>
          <div class="sc-body">
            <p class="sc-title">{{ $t("sendLinkToViewer") }}</p>
            <div class="share-link-row">
              <span class="share-link-text">{{ viewerUrl }}</span>
              <button class="sc-btn sm" @click="copyViewerUrl">
                <Icon
                  :name="viewerUrlCopied ? 'mdi:check' : 'mdi:content-copy'"
                  size="13"
                />
                {{ viewerUrlCopied ? $t("copied") : $t("copy") }}
              </button>
            </div>
            <canvas
              ref="screenQrEl"
              class="qr-canvas-sm"
              style="margin-top: 10px"
            />
            <p class="sc-desc" style="margin-top: 8px">
              {{ $t("waitingForViewer") }}
            </p>
            <div class="sc-waiting-anim">
              <span class="dot-pulse" /><span
                class="dot-pulse"
                style="animation-delay: 0.2s"
              /><span class="dot-pulse" style="animation-delay: 0.4s" />
            </div>
          </div>
        </div>

        <div class="sc-connected-banner" v-if="hostState === 'streaming'">
          <Icon name="mdi:check-circle-outline" size="18" />{{
            $t("viewerConnectedStreaming")
          }}
          <button class="sc-stop-btn" @click="stopShare">
            <Icon name="mdi:stop-circle-outline" size="13" />{{ $t("stop") }}
          </button>
        </div>
      </template>
    </div>

    <!-- VIEWER PANEL -->
    <div class="screen-panel">
      <div class="screen-panel-header">
        <div class="sph-left">
          <Icon name="mdi:television-play" size="16" /><span>{{
            $t("viewerWatchSharedScreen")
          }}</span>
        </div>
        <span class="sc-badge" :class="viewerState">{{
          viewerStateLabel
        }}</span>
      </div>

      <div
        class="sc-step"
        v-if="viewerState === 'idle' || viewerState === 'waiting'"
      >
        <div class="sc-num">1</div>
        <div class="sc-body">
          <p class="sc-title">{{ $t("waitingForHostScreen") }}</p>
          <p class="sc-desc">
            Open the viewer link from the host, or scan their QR code.
          </p>
          <div class="sc-waiting-anim" style="margin-top: 10px">
            <span class="dot-pulse" /><span
              class="dot-pulse"
              style="animation-delay: 0.2s"
            /><span class="dot-pulse" style="animation-delay: 0.4s" />
          </div>
        </div>
      </div>

      <div class="sc-step" v-if="viewerState === 'connecting'">
        <div class="sc-num">2</div>
        <div class="sc-body">
          <p class="sc-title">{{ $t("connectingToHost") }}</p>
          <div class="sc-spinner-row">
            <Icon name="mdi:loading" size="18" class="spin" /><span>{{
              $t("webrtcHandshake")
            }}</span>
          </div>
        </div>
      </div>

      <div
        class="sc-viewer-wrap"
        :class="{ active: viewerState === 'connected' }"
      >
        <video
          ref="viewerVideoEl"
          class="sc-video sc-video--viewer"
          autoplay
          playsinline
        />
        <div v-if="viewerState !== 'connected'" class="sc-viewer-placeholder">
          <Icon name="mdi:television-off" size="38" />
          <p>{{ $t("waitingForStream") }}</p>
        </div>
        <div v-if="viewerState === 'connected'" class="sc-viewer-controls">
          <button class="sc-ctrl-btn" @click="toggleMute">
            <Icon
              :name="viewerMuted ? 'mdi:volume-off' : 'mdi:volume-high'"
              size="15"
            />
          </button>
          <button class="sc-ctrl-btn" @click="goFullscreen">
            <Icon name="mdi:fullscreen" size="15" />
          </button>
          <button class="sc-ctrl-btn" @click="screenshot">
            <Icon name="mdi:camera-outline" size="15" />
          </button>
        </div>
      </div>

      <div class="sc-how">
        <div class="how-title">
          <Icon name="mdi:help-circle-outline" size="13" />{{
            $t("howItWorks")
          }}
        </div>
        <div class="how-steps">
          <div class="how-step">
            <span class="how-dot">1</span>Host clicks "Start Screen Capture"
          </div>
          <div class="how-step">
            <span class="how-dot">2</span>Host shares the viewer link or QR
          </div>
          <div class="how-step">
            <span class="how-dot">3</span>Viewer opens the link
          </div>
          <div class="how-step">
            <span class="how-dot">4</span>Stream starts automatically
          </div>
        </div>
        <p class="how-note">
          <Icon name="mdi:lock-outline" size="12" />Works across WiFi networks —
          no server needed
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";

const props = defineProps({
  sessionId: String,
  viewerPeerId: { type: String, default: "" },
});

const { $toast } = useNuxtApp();
const { t } = useI18n();
const peer = useMirrorPeer();

const hostVideoEl = ref(null);
const viewerVideoEl = ref(null);
const screenQrEl = ref(null);

const hostState = ref("idle");
const viewerState = ref("idle");
const viewerMuted = ref(false);
const viewerUrlCopied = ref(false);

let localStream = null;
let activeMediaConns = []; // host can stream to multiple viewers

const isSecure = computed(() => {
  if (!import.meta.client) return true;
  return (
    location.protocol === "https:" ||
    ["localhost", "127.0.0.1"].includes(location.hostname)
  );
});

const hostStateLabel = computed(
  () =>
    ({
      idle: "Connecting…",
      ready: t("ready"),
      captured: t("screenCaptured"),
      streaming: t("streaming"),
    })[hostState.value] ?? "",
);

const viewerStateLabel = computed(
  () =>
    ({
      idle: t("idle"),
      waiting: t("ready"),
      connecting: t("connecting"),
      connected: t("receiving"),
    })[viewerState.value] ?? "",
);

const viewerUrl = computed(() => {
  if (!import.meta.client || !peer.peerId.value) return "";
  return `${window.location.origin}/toolbox/mirror?peer=${peer.peerId.value}&mode=screen&role=viewer`;
});

// ── QR ────────────────────────────────────────────────────────────────────────
const loadQR = () =>
  new Promise((res, rej) => {
    if (window.QRCode) return res();
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

const renderQR = async (el, url) => {
  if (!el || !url) return;
  await loadQR();
  el.width = 140;
  el.height = 140;
  const ctx = el.getContext("2d");
  ctx.clearRect(0, 0, 140, 140);
  const tmp = document.createElement("div");
  document.body.appendChild(tmp);
  try {
    new window.QRCode(tmp, {
      text: url,
      width: 140,
      height: 140,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M,
    });
    const gen = tmp.querySelector("canvas");
    if (gen) ctx.drawImage(gen, 0, 0);
  } catch {}
  document.body.removeChild(tmp);
};

watch(
  () => viewerUrl.value,
  (v) => {
    if (v && screenQrEl.value) renderQR(screenQrEl.value, v);
  },
);

// ── Host: capture screen ──────────────────────────────────────────────────────
const startCapture = async () => {
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30, cursor: "always" },
      audio: true,
    });

    // Show preview to host immediately
    await nextTick();
    if (hostVideoEl.value) {
      hostVideoEl.value.srcObject = localStream;
      // Force play — needed on some browsers
      hostVideoEl.value.play().catch(() => {});
    }

    hostState.value = "captured";
    localStream.getVideoTracks()[0].addEventListener("ended", stopShare);

    await nextTick();
    renderQR(screenQrEl.value, viewerUrl.value);

    // ← HOST calls any already-connected viewers immediately
    // (viewers that connected before capture started)
    for (const viewerId of peer.connectedPeers.value) {
      callViewer(viewerId);
    }
  } catch (e) {
    $toast?.error(
      e.name === "NotAllowedError" ? "Permission denied." : e.message,
    );
  }
};

// ── Host calls a viewer (correct direction!) ──────────────────────────────────
const callViewer = (viewerDataPeerId) => {
  if (!localStream) return;
  const peerInstance = peer.getPeer();
  if (!peerInstance) return;

  try {
    const call = peerInstance.call(viewerDataPeerId, localStream);
    activeMediaConns.push(call);
    hostState.value = "streaming";

    call.on("close", () => {
      activeMediaConns = activeMediaConns.filter((c) => c !== call);
      if (activeMediaConns.length === 0 && hostState.value === "streaming") {
        hostState.value = "captured";
      }
      $toast?.info("A viewer disconnected.");
    });

    call.on("error", (e) => {
      console.warn("[ScreenShare] call error:", e);
    });
  } catch (e) {
    console.warn("[ScreenShare] callViewer error:", e);
  }
};

const stopShare = () => {
  localStream?.getTracks().forEach((t) => t.stop());
  activeMediaConns.forEach((c) => c.close());
  activeMediaConns = [];
  localStream = null;
  if (hostVideoEl.value) hostVideoEl.value.srcObject = null;
  hostState.value = "ready";
  // Notify viewers via data channel
  peer.broadcast({ type: "screen_stopped" });
};

// ── Viewer: receive call from host ────────────────────────────────────────────
const setupViewerCallHandling = () => {
  const peerInstance = peer.getPeer();
  if (!peerInstance) return;

  // Viewer answers incoming calls from host
  peerInstance.on("call", async (call) => {
    viewerState.value = "connecting";
    // Answer with no stream — we only want to receive
    call.answer();

    call.on("stream", async (remoteStream) => {
      await nextTick();
      if (viewerVideoEl.value) {
        viewerVideoEl.value.srcObject = remoteStream;
        // Unmuted autoplay needs a user gesture on mobile;
        // muting allows autoplay without gesture
        viewerVideoEl.value.muted = false;
        try {
          await viewerVideoEl.value.play();
        } catch {
          // If autoplay blocked, mute and retry
          viewerVideoEl.value.muted = true;
          viewerVideoEl.value.play().catch(() => {});
        }
        viewerState.value = "connected";
      }
    });

    call.on("close", () => {
      viewerState.value = "waiting";
      if (viewerVideoEl.value) viewerVideoEl.value.srcObject = null;
      $toast?.info("Host stopped sharing.");
    });

    call.on("error", (e) => {
      viewerState.value = "waiting";
      $toast?.error("Connection error: " + e.message);
    });
  });
};

// ── Viewer: tell host "I'm here" via data channel so host calls me ────────────
const announceAsViewer = () => {
  // Connect to the host peer's data channel so host knows we're here
  peer.connectTo(props.viewerPeerId);

  // Wait for data connection to open, then the host's connectedPeers watcher
  // will fire and host will call us with the stream
  // Also send a ping so host can call immediately
  setTimeout(() => {
    peer.broadcast({ type: "viewer_here" });
  }, 800);
};

// Host watches for new data connections and calls them if stream is active
const setupHostViewerWatcher = () => {
  watch(peer.connectedPeers, (newPeers, oldPeers) => {
    if (!localStream) return;
    // Find newly added peers
    const added = newPeers.filter((p) => !oldPeers?.includes(p));
    for (const viewerId of added) {
      callViewer(viewerId);
      hostState.value = "streaming";
    }
  });

  // Also handle viewer_here messages (backup signal)
  peer.onMessage((data, fromPeerId) => {
    if (data.type === "viewer_here" && localStream) {
      callViewer(fromPeerId);
    }
    if (data.type === "screen_stopped") {
      viewerState.value = "waiting";
      if (viewerVideoEl.value) viewerVideoEl.value.srcObject = null;
    }
  });
};

const copyViewerUrl = async () => {
  await navigator.clipboard.writeText(viewerUrl.value);
  viewerUrlCopied.value = true;
  $toast?.success("Viewer link copied!");
  setTimeout(() => (viewerUrlCopied.value = false), 2000);
};

const toggleMute = () => {
  viewerMuted.value = !viewerMuted.value;
  if (viewerVideoEl.value) viewerVideoEl.value.muted = viewerMuted.value;
};

const goFullscreen = () => viewerVideoEl.value?.requestFullscreen?.();

const screenshot = () => {
  if (!viewerVideoEl.value) return;
  const c = document.createElement("canvas");
  c.width = viewerVideoEl.value.videoWidth;
  c.height = viewerVideoEl.value.videoHeight;
  c.getContext("2d").drawImage(viewerVideoEl.value, 0, 0);
  const a = document.createElement("a");
  a.download = `shot-${Date.now()}.png`;
  a.href = c.toDataURL();
  a.click();
};

onMounted(async () => {
  const isViewer = !!props.viewerPeerId;

  await peer.init(props.sessionId);

  if (isViewer) {
    // ── VIEWER SIDE ──
    viewerState.value = "connecting";
    setupViewerCallHandling();
    // Connect data channel to host so host knows we exist
    announceAsViewer();
  } else {
    // ── HOST SIDE ──
    hostState.value = "ready";
    viewerState.value = "waiting";
    setupHostViewerWatcher();
  }
});

onUnmounted(() => {
  localStream?.getTracks().forEach((t) => t.stop());
  activeMediaConns.forEach((c) => c.close());
});
</script>

<style scoped lang="scss">
.screen-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}
.screen-panel {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.screen-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-color);
}
.sph-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}
.warn-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 158, 11, 0.08);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  padding: 10px 14px;
  font-size: 0.78rem;
  color: #b45309;
  code {
    background: var(--bg-elevated);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
  }
}
.sc-badge {
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 700;
  &.idle,
  &.waiting {
    background: var(--bg-elevated);
    color: var(--text-muted);
  }
  &.captured {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
  }
  &.connecting {
    background: rgba(99, 102, 241, 0.12);
    color: #6366f1;
  }
  &.streaming,
  &.connected {
    background: rgba(34, 197, 94, 0.12);
    color: #22c55e;
  }
}
.sc-step {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border-color);
  &:last-child {
    border-bottom: none;
  }
}
.sc-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(20, 184, 166, 0.12);
  border: 1.5px solid rgba(20, 184, 166, 0.25);
  color: #14b8a6;
  font-size: 0.73rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-body {
  flex: 1;
  min-width: 0;
}
.sc-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.sc-desc {
  font-size: 0.77rem;
  color: var(--text-sub);
  margin: 0 0 10px;
  line-height: 1.5;
}
.sc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 9px;
  background: #14b8a6;
  border: none;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  &.sm {
    padding: 5px 10px;
    font-size: 0.75rem;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    opacity: 0.85;
  }
}
.sc-spinner-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-sub);
}
.sc-preview-wrap {
  position: relative;
  margin: 12px;
  border-radius: 10px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 16/9;
}
.sc-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  &--viewer {
    background: #0f172a;
  }
}
.sc-preview-badge {
  position: absolute;
  bottom: 8px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.7rem;
  padding: 3px 10px;
  border-radius: 20px;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-color);
  &.active {
    background: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
  }
}
.share-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
}
.share-link-text {
  flex: 1;
  font-size: 0.65rem;
  color: var(--text-muted);
  word-break: break-all;
}
.qr-canvas-sm {
  border-radius: 8px;
  background: #fff;
  width: 140px;
  height: 140px;
  display: block;
}
.sc-waiting-anim {
  display: flex;
  gap: 6px;
  padding: 8px 0;
}
.dot-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #14b8a6;
  opacity: 0.3;
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}
.sc-connected-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(34, 197, 94, 0.06);
  border-top: 1px solid rgba(34, 197, 94, 0.2);
  font-size: 0.82rem;
  color: #16a34a;
  font-weight: 600;
}
.sc-stop-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
  padding: 4px 12px;
  border-radius: 7px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  &:hover {
    background: rgba(239, 68, 68, 0.18);
  }
}
.sc-viewer-wrap {
  position: relative;
  margin: 12px;
  border-radius: 10px;
  overflow: hidden;
  background: #0f172a;
  aspect-ratio: 16/9;
  &.active .sc-viewer-placeholder {
    display: none;
  }
}
.sc-viewer-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.25);
  p {
    font-size: 0.8rem;
    margin: 0;
  }
}
.sc-viewer-controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}
.sc-ctrl-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
}
.sc-how {
  padding: 12px 14px;
  border-top: 1px solid var(--border-color);
}
.how-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.how-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.how-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-sub);
  line-height: 1.4;
}
.how-dot {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 0.62rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.how-note {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin: 0;
}
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
