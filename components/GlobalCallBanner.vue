<template>
  <div v-if="incomingCalls.length" class="incoming-calls-banner">
    <audio ref="ringAudio" src="/audio/ringtone.mp3" loop preload="auto" />

    <div v-for="ic in incomingCalls" :key="ic.peerId" class="incoming-item">
      <Icon name="mdi:phone-ring" size="16" class="ring-anim" />
      <span class="ic-name">{{ ic.name }} {{ $t("isCalling") }}</span>
      <button class="ic-btn answer" @click="answerCall(ic)">
        <Icon name="mdi:phone" size="14" />
      </button>
      <button class="ic-btn decline" @click="declineCall(ic)">
        <Icon name="mdi:phone-hangup" size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
/* Global Call Banner Components */
import { ref, watch, nextTick } from "vue";
import { useCalls } from "~/composables/useCalls";

const { incomingCalls, answerBus, declineBus } = useCalls();
const ringAudio = ref(null);

watch(
  () => incomingCalls.value.length,
  (newLength) => {
    nextTick(() => {
      if (newLength > 0) {
        ringAudio.value?.play().catch(() => {});
      } else {
        if (ringAudio.value) {
          ringAudio.value.pause();
          ringAudio.value.currentTime = 0;
        }
      }
    });
  },
  { immediate: true },
);

const answerCall = (ic) => {
  answerBus.emit(ic);
};

const declineCall = (ic) => {
  declineBus.emit(ic);
  incomingCalls.value = incomingCalls.value.filter(
    (c) => c.peerId !== ic.peerId,
  );
};
</script>

<style scoped lang="scss">
/* Global Banner Styles */
.incoming-calls-banner {
  position: fixed;
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
  background: var(--bg-surface, #ffffff);
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.ic-name {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
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
