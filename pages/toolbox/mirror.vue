<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="tool-header">
      <NuxtLink to="/" class="back-btn">
        <Icon name="mdi:arrow-left" size="16" />
      </NuxtLink>
      <div class="tool-header-icon teal">
        <Icon name="mdi:cast" size="20" />
      </div>
      <div class="tool-header-text">
        <h1 class="tool-title">{{ $t("screenMirror") }}</h1>
        <p class="tool-sub">{{ $t("screenMirrorSub") }}</p>
      </div>
    </div>

    <div v-if="!sessionId" class="init-loading">
      <Icon name="mdi:loading" size="24" class="spin" />
      <span>Setting up connection…</span>
    </div>

    <template v-else>
      <!-- Tab bar — scrollable on mobile -->
      <div v-if="!hostPeerId" class="mode-tabs-wrap">
        <div class="mode-tabs">
          <button
            v-for="m in modes"
            :key="m.value"
            class="mode-tab"
            :class="{ active: mode === m.value }"
            @click="mode = m.value"
          >
            <Icon :name="m.icon" size="14" />
            <span class="mode-tab-label">{{ $t(m.labelKey) }}</span>
          </button>
        </div>
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
      <MirrorCall
        v-if="mode === 'call'"
        :session-id="callSessionId"
        :host-peer-id="mode === 'call' ? hostPeerId : ''"
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
const hostPeerId = ref("");

const modes = [
  { value: "notepad", labelKey: "notepad", icon: "mdi:note-text-outline" },
  { value: "draw", labelKey: "whiteboard", icon: "mdi:draw" },
  {
    value: "clipboard",
    labelKey: "clipboard",
    icon: "mdi:clipboard-text-outline",
  },
  { value: "screen", labelKey: "screenShare", icon: "mdi:monitor-share" },
  { value: "call", labelKey: "videoCall", icon: "mdi:video-outline" },
];

const callSessionId = computed(() =>
  sessionId.value ? `${sessionId.value}-call` : "",
);
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

const roleParam = ref("");
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  roleParam.value = params.get("role") ?? "";
  const peerParam = params.get("peer");
  const modeParam = params.get("mode");
  const sessionParam = params.get("session");

  if (peerParam && modeParam) {
    const parts = peerParam.split("-");
    parts.pop();
    sessionId.value = parts.join("-") || peerParam;
    mode.value = modeParam;
    hostPeerId.value = peerParam;
  } else if (sessionParam) {
    sessionId.value = sessionParam;
  } else {
    const newId = Math.random().toString(36).slice(2, 8).toUpperCase();
    sessionId.value = newId;
    router.replace({ query: { session: newId } });
  }
});
</script>

<style scoped lang="scss">
/* ─── Page wrapper ─────────────────────────────────── */
.tool-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 80px 20px 80px;
  font-family: "Tajawal", sans-serif;

  @media (max-width: 768px) {
    padding: 70px 14px 60px;
  }
  @media (max-width: 480px) {
    padding: 66px 12px 50px;
  }
}

/* ─── Header ────────────────────────────────────────── */
.tool-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: nowrap;

  @media (max-width: 480px) {
    gap: 10px;
    margin-bottom: 16px;
  }
}

.back-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  transition:
    color 0.18s,
    border-color 0.18s;
  &:hover {
    color: var(--text-primary);
    border-color: var(--text-muted);
  }
}

.tool-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    border-radius: 9px;
  }

  &.teal {
    background: rgba(20, 184, 166, 0.1);
    color: #14b8a6;
    border: 1.5px solid rgba(20, 184, 166, 0.2);
  }
}

.tool-header-text {
  min-width: 0;
}

.tool-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
}

.tool-sub {
  font-size: 0.75rem;
  color: var(--text-sub);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 480px) {
    font-size: 0.7rem;
  }
}

/* ─── Init loading ──────────────────────────────────── */
.init-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 0.88rem;
}

/* ─── Mode tabs — scrollable on mobile ─────────────── */
.mode-tabs-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-bottom: 20px;

  &::-webkit-scrollbar {
    display: none;
  }
}

.mode-tabs {
  display: flex;
  border-bottom: 1.5px solid var(--border-color);
  width: max-content;
  min-width: 100%;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s;
  margin-bottom: -1.5px;
  white-space: nowrap;

  @media (max-width: 480px) {
    padding: 8px 11px;
    font-size: 0.78rem;
    gap: 5px;
  }

  &.active {
    color: #14b8a6;
    border-bottom-color: #14b8a6;
  }
  &:hover:not(.active) {
    color: var(--text-primary);
  }
}

/* ─── Spin ──────────────────────────────────────────── */
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
