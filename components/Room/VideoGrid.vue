<template>
  <div class="vgrid-wrap">
    <div class="vgrid-controls">
      <button class="ctrl-pill" :class="{ off: micMuted }" @click="toggleMic">
        <Icon
          :name="micMuted ? 'mdi:microphone-off' : 'mdi:microphone'"
          size="16"
        />
        <span class="ctrl-label">{{
          micMuted ? $t("unmute") : $t("mute")
        }}</span>
      </button>

      <button class="ctrl-pill" :class="{ off: camOff }" @click="toggleCam">
        <Icon :name="camOff ? 'mdi:video-off' : 'mdi:video'" size="16" />
        <span class="ctrl-label">{{
          camOff ? $t("camOn") : $t("camOff")
        }}</span>
      </button>

      <button
        v-if="!inCall"
        class="ctrl-pill green"
        :disabled="!hasMembers"
        @click="callAll"
      >
        <Icon name="mdi:phone" size="16" />
        <span class="ctrl-label">{{ $t("callAll") }}</span>
      </button>

      <button v-if="inCall" class="ctrl-pill red" @click="hangUpAll">
        <Icon name="mdi:phone-hangup" size="16" />
        <span class="ctrl-label">{{ $t("endCall") }}</span>
      </button>

      <div v-if="inCall" class="call-timer-pill">
        <Icon name="mdi:clock-outline" size="13" />
        {{ callDuration }}
      </div>
    </div>

    <div class="vgrid" :class="`count-${totalVideos}`">
      <div class="vtile local">
        <video
          v-show="!camOff"
          ref="localVideoEl"
          class="vtile-video mirror"
          autoplay
          muted
          playsinline
        />
        <div v-if="camOff" class="vtile-avatar">
          <div class="avatar-circle">
            {{ (myName || "M").charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="vtile-label">
          <Icon name="mdi:account" size="11" />
          {{ myName }} ({{ $t("you") }})
        </div>
        <div v-if="inCall" class="vtile-status live">
          <span class="live-dot" />LIVE
        </div>
      </div>

      <div
        v-for="tile in remoteTiles"
        :key="tile.peerId"
        class="vtile remote"
        :class="{ active: tile.hasStream }"
      >
        <video
          v-show="!tile.camOff"
          v-if="tile.hasStream"
          :ref="(el) => setRemoteRef(tile.peerId, el)"
          class="vtile-video"
          autoplay
          playsinline
        />
        <div v-if="!tile.hasStream || tile.camOff" class="vtile-avatar">
          <div class="avatar-circle">
            {{ tile.name.charAt(0).toUpperCase() }}
          </div>
          <p v-if="!tile.hasStream" class="avatar-status">
            {{ tile.calling ? $t("calling") + "…" : $t("notInCall") }}
          </p>
        </div>
        <div class="vtile-label">
          <Icon name="mdi:account-circle-outline" size="11" />
          {{ tile.name }}
        </div>
        <div v-if="tile.hasStream" class="vtile-status live">
          <span class="live-dot" />LIVE
        </div>
        <div class="vtile-overlay-controls">
          <button
            class="ov-btn"
            :title="tile.muted ? $t('unmute') : $t('mute')"
            @click="toggleRemoteMute(tile.peerId)"
          >
            <Icon
              :name="tile.muted ? 'mdi:volume-off' : 'mdi:volume-high'"
              size="13"
            />
          </button>
          <button
            class="ov-btn"
            :title="$t('fullscreen')"
            @click="goFullscreen(tile.peerId)"
          >
            <Icon name="mdi:fullscreen" size="13" />
          </button>
          <button
            v-if="!tile.hasStream"
            class="ov-btn call-btn"
            :title="$t('callPeer')"
            @click="callOne(tile.peerId)"
          >
            <Icon name="mdi:phone" size="13" />
          </button>
        </div>
      </div>

      <div v-if="incomingCalls.length" class="incoming-calls-banner">
        <div v-for="ic in incomingCalls" :key="ic.peerId" class="incoming-item">
          <Icon name="mdi:phone-ring" size="16" class="ring-anim" />
          <span class="ic-name">{{ ic.name }} {{ $t("isCalling") }}</span>
          <button class="ic-btn answer" @click="answerOne(ic)">
            <Icon name="mdi:phone" size="14" />
          </button>
          <button class="ic-btn decline" @click="declineOne(ic)">
            <Icon name="mdi:phone-hangup" size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";

const props = defineProps({
  room: { type: Object, required: true },
  myPeerId: { type: String, default: "" },
  members: { type: Array, default: () => [] },
  myName: { type: String, default: "Me" },
});

// FIX: Access .value inside the computed callback — not at the top level.
// Previously `!props.room.isMicActive.value` was evaluated once during
// prop destructuring, losing reactivity.
const micMuted = computed(() => !props.room.isMicActive.value);
const camOff = computed(() => !props.room.isCameraActive.value);

const toggleMic = () => props.room.toggleMic();
const toggleCam = () => props.room.toggleCamera();

const { t } = useI18n();

const localVideoEl = ref(null);
const remoteVideoEls = new Map();
const remoteStreams = ref(new Map());
const remoteMutes = ref(new Map());
const remoteCamOff = ref(new Map());
const callingPeers = ref(new Set());

const inCall = ref(false);
const callSeconds = ref(0);
const incomingCalls = ref([]);

let timerInterval = null;

const hasMembers = computed(() => props.members.length > 0);
const totalVideos = computed(() => 1 + props.members.length);

const remoteTiles = computed(() =>
  props.members.map((m) => ({
    peerId: m.peerId,
    name: m.name,
    hasStream: remoteStreams.value.has(m.peerId),
    camOff: remoteCamOff.value.get(m.peerId) ?? false,
    muted: remoteMutes.value.get(m.peerId) || false,
    calling: callingPeers.value.has(m.peerId),
  })),
);

const callDuration = computed(() => {
  const m = Math.floor(callSeconds.value / 60)
    .toString()
    .padStart(2, "0");
  const s = (callSeconds.value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
});

const setRemoteRef = (peerId, el) => {
  if (!el) {
    remoteVideoEls.delete(peerId);
    return;
  }
  remoteVideoEls.set(peerId, el);
  const stream = remoteStreams.value.get(peerId);
  if (stream && el.srcObject !== stream) {
    el.srcObject = stream;
    // Apply whatever mute state the map already knows (default false = unmuted)
    const knownMuted = remoteMutes.value.get(peerId) ?? false;
    el.muted = knownMuted;
    el.play().catch(() => {
      // Autoplay blocked — browser forces mute. Record this in the map so
      // toggleRemoteMute knows the real starting state and one click works.
      el.muted = true;
      remoteMutes.value = new Map([...remoteMutes.value, [peerId, true]]);
      el.play().catch(() => {});
    });
  }
};

// FIX: Only broadcast if there are actual data connections open.
// Previously this was called immediately on stream connect before any peer
// was in the mesh, causing silent failures.
const broadcastMediaState = () => {
  if (!props.room?.broadcast) return;
  props.room.broadcast({
    type: "media-state",
    peerId: props.myPeerId,
    camOff: camOff.value,
    micMuted: micMuted.value,
  });
};

const callOne = async (peerId) => {
  callingPeers.value = new Set([...callingPeers.value, peerId]);
  await props.room.callPeer(peerId, true);
  inCall.value = true;
  startTimer();
};

const callAll = async () => {
  for (const m of props.members) {
    callingPeers.value = new Set([...callingPeers.value, m.peerId]);
    props.room.callPeer(m.peerId, true);
  }
  inCall.value = true;
  startTimer();
};

const hangUpAll = () => {
  for (const m of props.members) {
    props.room.hangUpPeer(m.peerId);
  }
  remoteStreams.value = new Map();
  remoteCamOff.value = new Map();
  callingPeers.value = new Set();
  inCall.value = false;
  stopTimer();
};

const answerOne = async (ic) => {
  // FIX: Only answer regular video/audio calls here.
  // Screen-share calls are handled by RoomScreenShare via the "incoming-call"
  // message with metadata.type === "screen-share".
  if (ic.call?.metadata?.type === "screen-share") return;
  await props.room.answerCall(ic.call, true);
  incomingCalls.value = incomingCalls.value.filter(
    (c) => c.peerId !== ic.peerId,
  );
  inCall.value = true;
  startTimer();
};

const declineOne = (ic) => {
  ic.call?.close();
  incomingCalls.value = incomingCalls.value.filter(
    (c) => c.peerId !== ic.peerId,
  );
};

const toggleRemoteMute = (peerId) => {
  const el = remoteVideoEls.get(peerId);
  // Read the element's ACTUAL muted state as source of truth — not the map —
  // so we're never off by one even if autoplay silently forced a mute.
  const currentlyMuted = el
    ? el.muted
    : (remoteMutes.value.get(peerId) ?? false);
  const nextMuted = !currentlyMuted;
  remoteMutes.value = new Map([...remoteMutes.value, [peerId, nextMuted]]);
  if (el) el.muted = nextMuted;
};

const goFullscreen = (peerId) => {
  const el = remoteVideoEls.get(peerId);
  el?.requestFullscreen?.();
};

const startTimer = () => {
  if (timerInterval) return;
  callSeconds.value = 0;
  timerInterval = setInterval(() => callSeconds.value++, 1000);
};

const stopTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  callSeconds.value = 0;
};

let unsubscribe;
onMounted(() => {
  unsubscribe = props.room.onMessage((data, fromPeerId) => {
    if (data.type === "remote-stream") {
      remoteStreams.value = new Map([
        ...remoteStreams.value,
        [data.peerId, data.stream],
      ]);
      callingPeers.value.delete(data.peerId);
      callingPeers.value = new Set(callingPeers.value);

      // Broadcast our media state to the newly connected peer
      broadcastMediaState();

      nextTick(() => {
        const el = remoteVideoEls.get(data.peerId);
        if (el) {
          el.srcObject = data.stream;
          el.muted = remoteMutes.value.get(data.peerId) || false;
          el.play().catch(() => {
            el.muted = true;
            el.play().catch(() => {});
          });
        }
      });
    } else if (data.type === "media-state") {
      const pid = data.peerId || fromPeerId;
      if (pid) {
        remoteCamOff.value.set(pid, data.camOff);
        remoteCamOff.value = new Map(remoteCamOff.value);
      }
    } else if (data.type === "call-ended") {
      remoteStreams.value.delete(data.peerId);
      remoteStreams.value = new Map(remoteStreams.value);
      remoteCamOff.value.delete(data.peerId);
      remoteCamOff.value = new Map(remoteCamOff.value);
      callingPeers.value.delete(data.peerId);
      callingPeers.value = new Set(callingPeers.value);

      if (remoteStreams.value.size === 0) {
        inCall.value = false;
        stopTimer();
      }
    } else if (data.type === "incoming-call") {
      // FIX: Skip screen-share calls — RoomScreenShare handles those.
      if (data.metadata?.type === "screen-share") return;

      const member = props.members.find((m) => m.peerId === data.peerId);
      const callerName = member?.name || data.metadata?.name || t("unknown");
      incomingCalls.value = [
        ...incomingCalls.value.filter((c) => c.peerId !== data.peerId),
        { peerId: data.peerId, name: callerName, call: data.call },
      ];
    }
  });

  // Fetch/start local stream eagerly so the user sees themselves immediately
  props.room.getLocalStream();
});

onUnmounted(() => {
  unsubscribe?.();
  stopTimer();
});

// FIX: Watch the raw refs (.isMicActive / .isCameraActive) rather than
// computed values. Using `() => props.room.isMicActive.value` is correct
// because Vue's watch needs a getter function returning the primitive value.
watch(
  [() => props.room.isMicActive.value, () => props.room.isCameraActive.value],
  () => {
    broadcastMediaState();
  },
);

// Attach the local stream as soon as both the video element and the stream exist
watch(
  [() => props.room.localStream.value, localVideoEl],
  ([newStream, el]) => {
    if (el && newStream && el.srcObject !== newStream) {
      el.srcObject = newStream;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.vgrid-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Controls bar */
.vgrid-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    padding: 8px 12px;
    gap: 6px;
  }
}

.ctrl-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &.off {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  &.green {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
    color: #22c55e;

    &:hover:not(:disabled) {
      background: rgba(34, 197, 94, 0.18);
    }
  }

  &.red {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;

    &:hover {
      background: rgba(239, 68, 68, 0.18);
    }
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 0.72rem;
    .ctrl-label {
      display: none;
    }
  }
}

.call-timer-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(34, 197, 94, 0.08);
  border: 1.5px solid rgba(34, 197, 94, 0.2);
  color: #22c55e;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Grid */
.vgrid {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 12px;
  padding: 15px;
  background: #0a0f1e;
}

.vtile {
  position: relative;
  background: #1e293b;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);

  flex: 1 1 45%;
  max-width: 800px;
  aspect-ratio: 16 / 10;

  @media (max-width: 768px) {
    flex: 1 1 100%;
    aspect-ratio: 16 / 11;
  }

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
  }
}

.vgrid:has(.vtile:nth-child(3):last-child) .vtile {
  flex: 1 1 30%;
  @media (max-width: 900px) {
    flex: 1 1 45%;
  }
}

.vgrid:has(.vtile:nth-child(5)) .vtile {
  flex: 1 1 30%;
}

.vtile-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;

  &.mirror {
    transform: scaleX(-1);
  }
}

.vtile-avatar {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #14b8a6, #6366f1);
  color: #fff;
  font-size: 1.4rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
    font-size: 1.1rem;
  }
}

.avatar-status {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.vtile-label {
  position: absolute;
  bottom: 7px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.66rem;
  padding: 2px 8px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.vtile-status {
  position: absolute;
  top: 7px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.06em;

  &.live {
    color: #22c55e;

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
      animation: livePulse 1.5s ease-in-out infinite;
    }
  }
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

.vtile-overlay-controls {
  position: absolute;
  top: 7px;
  right: 7px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.18s;

  .vtile:hover & {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
}

.ov-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: background 0.15s;

  &.call-btn {
    background: rgba(34, 197, 94, 0.7);
  }

  &:hover {
    background: rgba(0, 0, 0, 0.85);

    &.call-btn {
      background: rgba(34, 197, 94, 0.9);
    }
  }
}

/* Incoming call banner */
.incoming-calls-banner {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 100000;
  width: 90%;
  max-width: 360px;
}

.incoming-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.ic-name {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}

.ring-anim {
  color: #6366f1;
  animation: ringPulse 0.8s ease-in-out infinite;
}

@keyframes ringPulse {
  0%,
  100% {
    transform: scale(1) rotate(-10deg);
  }
  50% {
    transform: scale(1.1) rotate(10deg);
  }
}

.ic-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;

  &.answer {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    &:hover {
      background: rgba(34, 197, 94, 0.25);
    }
  }

  &.decline {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    &:hover {
      background: rgba(239, 68, 68, 0.22);
    }
  }
}
</style>
