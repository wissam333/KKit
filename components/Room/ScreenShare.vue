<template>
  <div class="ss-wrap">
    <!-- Header -->
    <div class="ss-header">
      <div class="ss-header-left">
        <Icon name="mdi:monitor-share" size="16" />
        <span>{{ $t("screenShare") }}</span>
      </div>
      <div class="ss-header-right">
        <div v-if="isSharingLocally" class="live-badge">
          <span class="live-dot" />{{ $t("youAreSharing") }}
        </div>
        <div v-else-if="remoteSharerId" class="live-badge purple">
          <span class="live-dot purple" />
          {{ remoteSharerName }} {{ $t("isSharing") }}
        </div>
      </div>
    </div>

    <!-- Main screen view -->
    <div class="ss-main">
      <!-- Remote share view -->
      <div v-if="remoteSharerId && remoteStream" class="ss-remote-view">
        <video ref="remoteVideoEl" class="ss-video" autoplay playsinline />
        <div class="ss-remote-overlay">
          <button class="ss-overlay-btn" @click="goFullscreen">
            <Icon name="mdi:fullscreen" size="16" />
            {{ $t("fullscreen") }}
          </button>
        </div>
      </div>

      <!-- Local share preview -->
      <div
        v-else-if="isSharingLocally && localScreenStream"
        class="ss-local-view"
      >
        <video
          ref="localVideoEl"
          class="ss-video mirror-none"
          autoplay
          muted
          playsinline
        />
        <div class="ss-local-label">
          <Icon name="mdi:eye-outline" size="13" />
          {{ $t("yourScreen") }} — {{ $t("othersCanSee") }}
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="ss-empty">
        <div class="ss-empty-icon">
          <Icon name="mdi:monitor-off" size="48" />
        </div>
        <h3>{{ $t("noScreenSharing") }}</h3>
        <p>{{ $t("noScreenSharingDesc") }}</p>

        <div class="ss-actions">
          <SharedUiButtonBase
            variant="primary"
            icon-left="mdi:monitor-share"
            :loading="starting"
            @click="startShare"
          >
            {{ $t("shareYourScreen") }}
          </SharedUiButtonBase>

          <div v-if="isMobile" class="mobile-hint">
            <Icon name="mdi:information-outline" size="13" />
            {{ $t("mobileShareHint") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="ss-footer">
      <div class="footer-left">
        <div class="sharing-members">
          <div
            v-for="m in allMembers"
            :key="m.peerId"
            class="sharing-member"
            :class="{
              active:
                m.peerId === remoteSharerId || (m.isMe && isSharingLocally),
            }"
          >
            <div class="sm-avatar">
              {{ m.name.charAt(0).toUpperCase() }}
            </div>
            <span class="sm-name">{{ m.isMe ? $t("you") : m.name }}</span>
            <Icon
              v-if="m.peerId === remoteSharerId || (m.isMe && isSharingLocally)"
              name="mdi:monitor-share"
              size="12"
              style="color: #14b8a6"
            />
          </div>
        </div>
      </div>

      <div class="footer-right">
        <SharedUiButtonBase
          v-if="!isSharingLocally"
          variant="primary"
          size="sm"
          icon-left="mdi:monitor-share"
          :loading="starting"
          @click="startShare"
        >
          {{ $t("shareScreen") }}
        </SharedUiButtonBase>

        <SharedUiButtonBase
          v-else
          variant="error"
          size="sm"
          icon-left="mdi:monitor-off"
          @click="stopShare"
        >
          {{ $t("stopSharing") }}
        </SharedUiButtonBase>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";

const props = defineProps({
  room: { type: Object, required: true },
});

const { t } = useI18n();
const { $toast } = useNuxtApp();

const localVideoEl = ref(null);
const remoteVideoEl = ref(null);
const isSharingLocally = ref(false);
const starting = ref(false);
const remoteSharerId = ref(null);
const remoteStream = ref(null);

// FIX: renamed from `localStream` to `localScreenStream` to avoid shadowing
// props.room.localStream (the camera stream). This was silently stopping the
// wrong stream on cleanup in some edge cases.
let localScreenStream = null;

// Keep a map of screen-share calls so we can close them cleanly
const screenCalls = new Map(); // peerId -> MediaConnection

const isMobile = computed(() => {
  if (!import.meta.client) return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
});

const allMembers = computed(() => [
  {
    peerId: props.room.myPeerId.value,
    name: props.room.myName.value,
    isMe: true,
  },
  ...props.room.members.value,
]);

const remoteSharerName = computed(() => {
  const m = props.room.members.value.find(
    (m) => m.peerId === remoteSharerId.value,
  );
  return m?.name || t("peer");
});

// ── Start screen share ────────────────────────────────────────────────────
const startShare = async () => {
  if (starting.value) return;
  starting.value = true;

  try {
    localScreenStream = await props.room.getScreenStream();
    if (!localScreenStream) {
      starting.value = false;
      return;
    }

    isSharingLocally.value = true;

    await nextTick();
    if (localVideoEl.value) {
      localVideoEl.value.srcObject = localScreenStream;
      localVideoEl.value.play().catch(() => {});
    }

    // Notify peers via data channel
    props.room.broadcast({
      type: "screen-share-start",
      peerId: props.room.myPeerId.value,
      name: props.room.myName.value,
    });

    // FIX: Use props.room.getPeer() but do NOT add another peer.on("call")
    // listener here. All incoming calls are already routed through useRoom's
    // messageHandlers as "incoming-call" events. We only call out from here.
    const peer = props.room.getPeer();
    for (const m of props.room.members.value) {
      try {
        const call = peer.call(m.peerId, localScreenStream, {
          metadata: { type: "screen-share", name: props.room.myName.value },
        });
        screenCalls.set(m.peerId, call);
        call.on("close", () => {
          screenCalls.delete(m.peerId);
          if (isSharingLocally.value) stopShare();
        });
        call.on("error", () => {
          screenCalls.delete(m.peerId);
        });
      } catch {}
    }

    // Auto-stop when the browser's native "Stop sharing" button is clicked
    localScreenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
      stopShare();
    });
  } catch (e) {
    console.error("[ScreenShare] startShare error:", e);
    $toast?.error(t("screenShareFailed"));
  } finally {
    starting.value = false;
  }
};

const stopShare = () => {
  localScreenStream?.getTracks().forEach((t) => t.stop());
  localScreenStream = null;

  // Close all outgoing screen-share calls
  for (const [, call] of screenCalls) {
    try {
      call?.close();
    } catch {}
  }
  screenCalls.clear();

  isSharingLocally.value = false;

  props.room.broadcast({
    type: "screen-share-stop",
    peerId: props.room.myPeerId.value,
  });

  if (localVideoEl.value) localVideoEl.value.srcObject = null;
};

const goFullscreen = () => {
  remoteVideoEl.value?.requestFullscreen?.();
};

// ── Attach remote stream to video element ─────────────────────────────────
watch(remoteStream, (stream) => {
  nextTick(() => {
    if (remoteVideoEl.value && stream) {
      remoteVideoEl.value.srcObject = stream;
      remoteVideoEl.value.play().catch(() => {});
    }
  });
});

// ── Listen for room events ────────────────────────────────────────────────
let unsubscribe;
onMounted(() => {
  unsubscribe = props.room.onMessage((data) => {
    if (data.type === "screen-share-start") {
      remoteSharerId.value = data.peerId;
    } else if (data.type === "screen-share-stop") {
      if (remoteSharerId.value === data.peerId) {
        remoteSharerId.value = null;
        remoteStream.value = null;
        if (remoteVideoEl.value) remoteVideoEl.value.srcObject = null;
      }
    } else if (data.type === "incoming-call") {
      // FIX: Handle screen-share calls here instead of adding a duplicate
      // peer.on("call") handler (which would fire twice and conflict with
      // VideoGrid's handler). useRoom already emits all calls as "incoming-call".
      if (data.metadata?.type !== "screen-share") return;

      const call = data.call;
      remoteSharerId.value = data.peerId;

      // Answer with an empty stream — we only want to *receive* the screen
      call.answer(new MediaStream());

      call.on("stream", (stream) => {
        remoteStream.value = stream;
        nextTick(() => {
          if (remoteVideoEl.value) {
            remoteVideoEl.value.srcObject = stream;
            remoteVideoEl.value.play().catch(() => {});
          }
        });
      });

      call.on("close", () => {
        if (remoteSharerId.value === call.peer) {
          remoteSharerId.value = null;
          remoteStream.value = null;
          if (remoteVideoEl.value) remoteVideoEl.value.srcObject = null;
        }
      });

      call.on("error", () => {
        if (remoteSharerId.value === call.peer) {
          remoteSharerId.value = null;
          remoteStream.value = null;
        }
      });
    }
  });
});

onUnmounted(() => {
  unsubscribe?.();
  if (isSharingLocally.value) stopShare();
});
</script>

<style scoped lang="scss">
.ss-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-page);
}

.ss-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);

  .ss-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(34, 197, 94, 0.1);
  border: 1.5px solid rgba(34, 197, 94, 0.25);
  color: #22c55e;
  font-size: 0.72rem;
  font-weight: 700;

  &.purple {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.25);
    color: #6366f1;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    animation: livePulse 1.5s ease-in-out infinite;

    &.purple {
      background: #6366f1;
    }
  }
}

@keyframes livePulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.ss-main {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #0a0f1e;
}

.ss-remote-view,
.ss-local-view {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ss-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #000;

  &.mirror-none {
    transform: none;
  }
}

.ss-remote-overlay {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
}

.ss-overlay-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 20px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.85);
  }
}

.ss-local-label {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.7rem;
  padding: 4px 12px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  white-space: nowrap;
}

.ss-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}

.ss-empty-icon {
  opacity: 0.25;
  margin-bottom: 4px;
}

.ss-empty h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.ss-empty p {
  margin: 0;
  font-size: 0.8rem;
}

.ss-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.mobile-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 12px;
}

/* Footer */
.ss-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  flex-shrink: 0;
  gap: 10px;
}

.footer-left {
  flex: 1;
  overflow: hidden;
}

.sharing-members {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    display: none;
  }
}

.sharing-member {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-elevated);
  white-space: nowrap;
  transition: all 0.15s;

  &.active {
    border-color: rgba(20, 184, 166, 0.4);
    background: rgba(20, 184, 166, 0.08);
  }
}

.sm-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #14b8a6, #6366f1);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sm-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
}
</style>
