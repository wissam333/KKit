<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="tool-header">
      <NuxtLink to="/" class="back-btn"
        ><Icon name="mdi:arrow-left" size="16"
      /></NuxtLink>
      <div class="tool-header-icon teal">
        <Icon name="mdi:cast" size="22" />
      </div>
      <div>
        <h1 class="tool-title">{{ $t("screenMirror") }}</h1>
        <p class="tool-sub">{{ $t("screenMirrorSub") }}</p>
      </div>
    </div>

    <div v-if="!sessionId" class="init-loading">
      <Icon name="mdi:loading" size="24" class="spin" />
      <span>Setting up connection…</span>
    </div>

    <template v-else>
      <!-- Hide tab switcher for viewers — they're locked to their mode -->
      <div v-if="!hostPeerId" class="mode-tabs">
        <button
          v-for="m in modes"
          :key="m.value"
          class="mode-tab"
          :class="{ active: mode === m.value }"
          @click="mode = m.value"
        >
          <Icon :name="m.icon" size="15" />{{ $t(m.labelKey) }}
        </button>
      </div>

      <MirrorNotepad
        v-if="mode === 'notepad'"
        :session-id="notepadSessionId"
        :host-peer-id="mode === 'notepad' ? hostPeerId : ''"
      />
      <MirrorWhiteboard
        v-if="mode === 'draw'"
        :session-id="drawSessionId"
        :host-peer-id="mode === 'draw' ? hostPeerId : ''"
      />
      <MirrorClipboard
        v-if="mode === 'clipboard'"
        :session-id="clipboardSessionId"
        :host-peer-id="mode === 'clipboard' ? hostPeerId : ''"
      />
      <MirrorScreenShare
        v-if="mode === 'screen'"
        :session-id="screenSessionId"
        :viewer-peer-id="
          mode === 'screen' && roleParam === 'viewer' ? hostPeerId : ''
        "
      />
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from "vue";

const { locale } = useI18n();
const router = useRouter();

const sessionId = ref("");
const mode = ref("screen");
const hostPeerId = ref(""); // ← the host's actual peer ID when viewing

const modes = [
  { value: "notepad", labelKey: "notepad", icon: "mdi:note-text-outline" },
  { value: "draw", labelKey: "whiteboard", icon: "mdi:draw" },
  {
    value: "clipboard",
    labelKey: "clipboard",
    icon: "mdi:clipboard-text-outline",
  },
  { value: "screen", labelKey: "screenShare", icon: "mdi:monitor-share" },
];

// Host peer IDs per mode (stable, derived from session)
const notepadSessionId = computed(() =>
  sessionId.value ? `${sessionId.value}-note` : "",
);
const drawSessionId = computed(() =>
  sessionId.value ? `${sessionId.value}-draw` : "",
);
const clipboardSessionId = computed(() =>
  sessionId.value ? `${sessionId.value}-clip` : "",
);
const screenSessionId = computed(() =>
  sessionId.value ? `${sessionId.value}-scrn` : "",
);

// When viewing, hostPeerId is the peer URL param — pass it to the active component
// Host components receive empty string hostPeerId so they know they're the host
const roleParam = ref("");
onMounted(() => {
  roleParam.value = params.get("role") ?? "";
  const params = new URLSearchParams(window.location.search);
  const peerParam = params.get("peer"); // e.g. "ABC123-draw"
  const modeParam = params.get("mode"); // e.g. "draw"
  const sessionParam = params.get("session");

  if (peerParam && modeParam) {
    // ── VIEWER opening a shared link ──
    // Extract base session from peer ID (e.g. "ABC123-draw" → "ABC123")
    const parts = peerParam.split("-");
    parts.pop();
    sessionId.value = parts.join("-") || peerParam;
    mode.value = modeParam;
    hostPeerId.value = peerParam; // full peer ID including suffix
  } else if (sessionParam) {
    sessionId.value = sessionParam;
  } else {
    // Brand new host session
    const newId = Math.random().toString(36).slice(2, 8).toUpperCase();
    sessionId.value = newId;
    router.replace({ query: { session: newId } });
  }
});
</script>
<style scoped lang="scss">
.tool-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px 16px 80px;
  font-family: "Tajawal", sans-serif;
}
.tool-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  flex-shrink: 0;
  &:hover {
    color: var(--text-primary);
  }
}
.tool-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &.teal {
    background: rgba(20, 184, 166, 0.1);
    color: #14b8a6;
    border: 1.5px solid rgba(20, 184, 166, 0.2);
  }
}
.tool-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
}
.tool-sub {
  font-size: 0.8rem;
  color: var(--text-sub);
  margin: 0;
}
.init-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.mode-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1.5px solid var(--border-color);
}
.mode-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  font-size: 0.83rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s;
  margin-bottom: -1.5px;
  &.active {
    color: #14b8a6;
    border-bottom-color: #14b8a6;
  }
  &:hover:not(.active) {
    color: var(--text-primary);
  }
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
