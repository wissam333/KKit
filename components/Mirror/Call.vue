<template>
  <div class="call-layout">
    <!-- LEFT: Your camera -->
    <div class="call-panel">
      <div class="call-panel-header">
        <div class="cph-left">
          <Icon name="mdi:account" size="16" />
          <span
            >{{ isViewer ? $t("viewer") : $t("host") }} — {{ $t("you") }}</span
          >
        </div>
        <span class="call-badge" :class="callState">{{ callStateLabel }}</span>
      </div>

      <!-- Waiting to start -->
      <div v-if="callState === 'idle'" class="call-waiting">
        <div class="call-avatar">
          <Icon name="mdi:account-circle" size="64" />
        </div>
        <p class="call-waiting-text">{{ $t("readyToCall") }}</p>
        <div class="call-actions-row">
          <button
            class="call-start-btn"
            :disabled="!peerReady"
            @click="startCall"
          >
            <Icon name="mdi:video" size="18" />{{ $t("startVideoCall") }}
          </button>
          <button
            class="call-start-btn audio-only"
            :disabled="!peerReady"
            @click="startAudioCall"
          >
            <Icon name="mdi:phone" size="18" />{{ $t("audioOnly") }}
          </button>
        </div>
        <p v-if="!peerReady" class="call-hint">
          <Icon name="mdi:loading" size="13" class="spin" />
          {{ $t("waitingForPeer") }}
        </p>
        <p v-else class="call-hint success">
          <Icon name="mdi:check-circle" size="13" /> {{ $t("peerConnected") }}
        </p>
      </div>

      <!-- Calling / ringing -->
      <div v-if="callState === 'calling'" class="call-waiting">
        <div class="call-avatar ringing">
          <Icon name="mdi:phone-ring" size="64" />
        </div>
        <p class="call-waiting-text">{{ $t("calling") }}…</p>
        <button class="call-stop-btn" @click="hangUp">
          <Icon name="mdi:phone-hangup" size="16" />{{ $t("cancel") }}
        </button>
      </div>

      <!-- Incoming call -->
      <div v-if="callState === 'incoming'" class="call-waiting">
        <div class="call-avatar ringing">
          <Icon name="mdi:phone-incoming" size="64" />
        </div>
        <p class="call-waiting-text">{{ $t("incomingCall") }}</p>
        <div class="call-actions-row">
          <button class="call-start-btn" @click="answerCall">
            <Icon name="mdi:phone" size="16" />{{ $t("answer") }}
          </button>
          <button class="call-stop-btn" @click="rejectCall">
            <Icon name="mdi:phone-hangup" size="16" />{{ $t("decline") }}
          </button>
        </div>
      </div>

      <!-- In call: local preview -->
      <template v-if="callState === 'connected'">
        <div class="video-wrap local">
          <video
            ref="localVideoEl"
            class="call-video mirror"
            autoplay
            muted
            playsinline
          />
          <div class="video-label">
            <Icon name="mdi:account" size="12" />{{ $t("you") }}
          </div>
        </div>

        <div class="local-controls">
          <button
            class="ctrl-btn"
            :class="{ off: micMuted }"
            @click="toggleMic"
          >
            <Icon
              :name="micMuted ? 'mdi:microphone-off' : 'mdi:microphone'"
              size="18"
            />
          </button>
          <button class="ctrl-btn hangup" @click="hangUp">
            <Icon name="mdi:phone-hangup" size="18" />
          </button>
          <button class="ctrl-btn" :class="{ off: camOff }" @click="toggleCam">
            <Icon :name="camOff ? 'mdi:video-off' : 'mdi:video'" size="18" />
          </button>
        </div>

        <div class="call-timer">
          <Icon name="mdi:clock-outline" size="13" />{{ callDuration }}
        </div>
      </template>
    </div>

    <!-- RIGHT: Remote video -->
    <div class="call-panel remote-panel">
      <div class="call-panel-header">
        <div class="cph-left">
          <Icon name="mdi:account-circle-outline" size="16" />
          <span>{{ $t("remoteDevice") }}</span>
        </div>
        <span v-if="callState === 'connected'" class="live-badge">
          <span class="live-dot" />LIVE
        </span>
      </div>

      <div
        class="video-wrap remote"
        :class="{ active: callState === 'connected' }"
      >
        <video ref="remoteVideoEl" class="call-video" autoplay playsinline />
        <div v-if="callState !== 'connected'" class="video-placeholder">
          <Icon name="mdi:account-off-outline" size="48" />
          <p>{{ $t("waitingForRemote") }}</p>
        </div>
        <div v-if="callState === 'connected'" class="remote-controls">
          <button class="ctrl-btn sm" @click="toggleRemoteMute">
            <Icon
              :name="remoteMuted ? 'mdi:volume-off' : 'mdi:volume-high'"
              size="15"
            />
          </button>
          <button class="ctrl-btn sm" @click="goFullscreen">
            <Icon name="mdi:fullscreen" size="15" />
          </button>
        </div>
      </div>

      <!-- Share panel only shown on host side -->
      <div v-if="!isViewer" class="share-section">
        <MirrorSharePanel :url="shareUrl" :status="peer.status.value" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  sessionId: String,
  hostPeerId: { type: String, default: "" },
});

const { $toast } = useNuxtApp();
const { t } = useI18n();
const peer = useMirrorPeer();

const localVideoEl = ref(null);
const remoteVideoEl = ref(null);

const callState = ref("idle"); // idle | calling | incoming | connected
const micMuted = ref(false);
const camOff = ref(false);
const remoteMuted = ref(false);
const peerReady = ref(false);
const audioOnly = ref(false);

let localStream = null;
let activeCall = null;
let incomingCall = null;
let timerInterval = null;
const callSeconds = ref(0);

const isViewer = computed(() => !!props.hostPeerId);

const shareUrl = computed(() => {
  if (!import.meta.client || !peer.peerId.value) return "";
  return `${window.location.origin}/toolbox/mirror?peer=${peer.peerId.value}&mode=call`;
});

const callStateLabel = computed(
  () =>
    ({
      idle: peerReady.value ? t("ready") : t("waiting"),
      calling: t("calling"),
      incoming: t("incomingCall"),
      connected: t("connected"),
    })[callState.value] ?? "",
);

const callDuration = computed(() => {
  const m = Math.floor(callSeconds.value / 60)
    .toString()
    .padStart(2, "0");
  const s = (callSeconds.value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
});

// ── Get user media ────────────────────────────────────────────────────────────
const getMedia = async (video = true) => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: 1280, height: 720, facingMode: "user" } : false,
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    if (localVideoEl.value) {
      localVideoEl.value.srcObject = localStream;
      localVideoEl.value.play().catch(() => {});
    }
    return localStream;
  } catch (e) {
    $toast?.error(
      e.name === "NotAllowedError"
        ? "Camera/mic permission denied."
        : e.message,
    );
    return null;
  }
};

// ── Attach remote stream ──────────────────────────────────────────────────────
const attachRemote = async (stream) => {
  if (!remoteVideoEl.value) return;
  remoteVideoEl.value.srcObject = stream;
  remoteVideoEl.value.muted = false;
  try {
    await remoteVideoEl.value.play();
  } catch {
    remoteVideoEl.value.muted = true;
    remoteVideoEl.value.play().catch(() => {});
  }
  callState.value = "connected";
  // Start call timer
  callSeconds.value = 0;
  timerInterval = setInterval(() => callSeconds.value++, 1000);
};

// ── Host starts a call ────────────────────────────────────────────────────────
const startCall = async () => {
  audioOnly.value = false;
  await _initiateCall(true);
};

const startAudioCall = async () => {
  audioOnly.value = true;
  await _initiateCall(false);
};

const _initiateCall = async (withVideo) => {
  if (!peer.connectedPeers.value.length) {
    $toast?.error("No peer connected yet. Share the link first.");
    return;
  }
  const stream = await getMedia(withVideo);
  if (!stream) return;

  callState.value = "calling";
  const peerInstance = peer.getPeer();
  const remotePeerId = peer.connectedPeers.value[0];

  try {
    const call = peerInstance.call(remotePeerId, stream, {
      metadata: { audioOnly: !withVideo },
    });
    activeCall = call;

    call.on("stream", (remoteStream) => {
      attachRemote(remoteStream);
    });

    call.on("close", () => endCall());
    call.on("error", (e) => {
      $toast?.error("Call error: " + e.message);
      endCall();
    });
  } catch (e) {
    $toast?.error("Could not start call: " + e.message);
    endCall();
  }
};

// ── Handle incoming call ──────────────────────────────────────────────────────
const setupIncomingCallHandler = () => {
  const peerInstance = peer.getPeer();
  if (!peerInstance) return;

  peerInstance.on("call", (call) => {
    incomingCall = call;
    audioOnly.value = call.metadata?.audioOnly ?? false;
    callState.value = "incoming";
  });
};

const answerCall = async () => {
  if (!incomingCall) return;
  const stream = await getMedia(!audioOnly.value);
  if (!stream) return;

  incomingCall.answer(stream);
  activeCall = incomingCall;
  incomingCall = null;

  activeCall.on("stream", (remoteStream) => {
    attachRemote(remoteStream);
  });

  activeCall.on("close", () => endCall());
  activeCall.on("error", (e) => {
    $toast?.error("Call error: " + e.message);
    endCall();
  });
};

const rejectCall = () => {
  incomingCall?.close();
  incomingCall = null;
  callState.value = "idle";
};

// ── Controls ──────────────────────────────────────────────────────────────────
const toggleMic = () => {
  micMuted.value = !micMuted.value;
  localStream?.getAudioTracks().forEach((t) => (t.enabled = !micMuted.value));
};

const toggleCam = () => {
  camOff.value = !camOff.value;
  localStream?.getVideoTracks().forEach((t) => (t.enabled = !camOff.value));
};

const toggleRemoteMute = () => {
  remoteMuted.value = !remoteMuted.value;
  if (remoteVideoEl.value) remoteVideoEl.value.muted = remoteMuted.value;
};

const goFullscreen = () => remoteVideoEl.value?.requestFullscreen?.();

const hangUp = () => {
  activeCall?.close();
  endCall();
};

const endCall = () => {
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  activeCall = null;
  if (localVideoEl.value) localVideoEl.value.srcObject = null;
  if (remoteVideoEl.value) remoteVideoEl.value.srcObject = null;
  callState.value = "idle";
  clearInterval(timerInterval);
  callSeconds.value = 0;
  micMuted.value = false;
  camOff.value = false;
};

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (isViewer.value) {
    await peer.init();
    peer.connectTo(props.hostPeerId);
    watch(peer.connectedPeers, (peers) => {
      if (peers.length > 0) peerReady.value = true;
    });
  } else {
    await peer.init(props.sessionId);
    watch(peer.connectedPeers, (peers) => {
      peerReady.value = peers.length > 0;
    });
  }
  setupIncomingCallHandler();
});

onUnmounted(() => {
  localStream?.getTracks().forEach((t) => t.stop());
  activeCall?.close();
  clearInterval(timerInterval);
});
</script>

<style scoped lang="scss">
.call-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}
.call-panel {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.call-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-color);
}
.cph-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}
.call-badge {
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 700;
  &.idle {
    background: var(--bg-elevated);
    color: var(--text-muted);
  }
  &.calling {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
  }
  &.incoming {
    background: rgba(99, 102, 241, 0.12);
    color: #6366f1;
  }
  &.connected {
    background: rgba(34, 197, 94, 0.12);
    color: #22c55e;
  }
}
.live-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 800;
  color: #22c55e;
  letter-spacing: 0.05em;
}
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
  animation: livePulse 1.5s ease-in-out infinite;
}
@keyframes livePulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
.call-waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 20px;
  flex: 1;
}
.call-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  &.ringing {
    border-color: #14b8a6;
    color: #14b8a6;
    animation: ringPulse 1s ease-in-out infinite;
  }
}
@keyframes ringPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.3);
  }
  50% {
    box-shadow: 0 0 0 14px rgba(20, 184, 166, 0);
  }
}
.call-waiting-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.call-actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.call-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: 10px;
  background: #14b8a6;
  border: none;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  &.audio-only {
    background: #6366f1;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    opacity: 0.85;
  }
}
.call-stop-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  &:hover {
    background: rgba(239, 68, 68, 0.18);
  }
}
.call-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  &.success {
    color: #22c55e;
  }
}
.video-wrap {
  position: relative;
  background: #0f172a;
  aspect-ratio: 4/3;
  overflow: hidden;
  &.local {
    margin: 12px;
    border-radius: 12px;
  }
  &.remote {
    margin: 12px;
    border-radius: 12px;
    flex: 1;
    &:not(.active) .call-video {
      opacity: 0;
    }
  }
}
.call-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  &.mirror {
    transform: scaleX(-1);
  }
}
.video-label {
  position: absolute;
  bottom: 8px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.7rem;
  padding: 3px 10px;
  border-radius: 20px;
}
.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.2);
  p {
    font-size: 0.8rem;
    margin: 0;
  }
}
.local-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--border-color);
}
.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  &.off {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }
  &.hangup {
    width: 52px;
    height: 52px;
    background: #ef4444;
    color: #fff;
    &:hover {
      background: #dc2626;
    }
  }
  &.sm {
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.15);
    &:hover {
      background: rgba(0, 0, 0, 0.8);
    }
  }
  &:hover:not(.hangup):not(.sm) {
    background: var(--bg-surface);
  }
}
.remote-controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}
.call-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 8px;
  border-top: 1px solid var(--border-color);
  font-variant-numeric: tabular-nums;
}
.remote-panel {
  display: flex;
  flex-direction: column;
}
.share-section {
  padding: 0 12px 12px;
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
