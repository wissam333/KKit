<template>
  <div class="clip-layout">
    <div class="clip-left">
      <div class="panel-header">
        <span class="panel-title">
          <Icon name="mdi:clipboard-text-outline" size="15" />{{
            $t("clipboardSync")
          }}
        </span>
        <span
          class="live-dot"
          :class="{ active: peer.status.value === 'ready' }"
        />
      </div>

      <div class="clip-list">
        <div v-if="!clips.length" class="clip-empty">
          <Icon name="mdi:clipboard-plus-outline" size="32" />
          <p>{{ $t("sendTextLinks") }}</p>
        </div>
        <transition-group name="clip-slide">
          <div v-for="item in clips" :key="item.id" class="clip-item">
            <div class="clip-meta">
              <Icon
                :name="item.type === 'link' ? 'mdi:link-variant' : 'mdi:text'"
                size="12"
              />
              <span class="clip-time">{{ item.time }}</span>
              <span
                class="clip-from"
                :class="item.fromSelf ? 'self' : 'remote'"
              >
                {{ item.fromSelf ? $t("you") : $t("device") }}
              </span>
            </div>
            <p class="clip-text">{{ item.text }}</p>
            <div class="clip-actions">
              <a
                v-if="item.type === 'link'"
                :href="item.text"
                target="_blank"
                class="clip-action-btn"
              >
                <Icon name="mdi:open-in-new" size="11" />{{ $t("open") }}
              </a>
              <button class="clip-action-btn" @click="copyItem(item)">
                <Icon name="mdi:content-copy" size="11" />{{ $t("copy") }}
              </button>
              <button
                class="clip-action-btn icon-only"
                @click="removeItem(item.id)"
              >
                <Icon name="mdi:delete-outline" size="11" />
              </button>
            </div>
          </div>
        </transition-group>
      </div>

      <div class="clip-compose">
        <textarea
          v-model="newClip"
          class="clip-input"
          :placeholder="$t('sendTextLinks')"
          rows="2"
          @keydown.ctrl.enter="send"
        />
        <button class="send-btn" :disabled="!newClip.trim()" @click="send">
          <Icon name="mdi:send" size="14" />
          <span class="send-label">{{ $t("send") }}</span>
        </button>
      </div>
    </div>

    <!-- Right sidebar — stacks on mobile -->
    <div class="clip-right">
      <MirrorSharePanel :url="shareUrl" :status="peer.status.value" />
      <div class="clip-stats">
        <div class="stat-row">
          <Icon name="mdi:send-outline" size="13" />
          <span
            >{{ clips.filter((c) => c.fromSelf).length }} {{ $t("sent") }}</span
          >
        </div>
        <div class="stat-row">
          <Icon name="mdi:download-outline" size="13" />
          <span
            >{{ clips.filter((c) => !c.fromSelf).length }}
            {{ $t("received") }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  sessionId: String,
  hostPeerId: { type: String, default: "" },
});

const { $toast } = useNuxtApp();
const peer = useMirrorPeer();
const isViewer = computed(() => !!props.hostPeerId);

const clips = ref([]);
const newClip = ref("");
let clipId = 0;

const shareUrl = computed(() => {
  if (!import.meta.client || !peer.peerId.value) return "";
  return `${window.location.origin}/toolbox/mirror?peer=${peer.peerId.value}&mode=clipboard`;
});

const send = () => {
  const text = newClip.value.trim();
  if (!text) return;
  const item = {
    id: ++clipId,
    text,
    type: /^https?:\/\//i.test(text) ? "link" : "text",
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    fromSelf: true,
  };
  clips.value.unshift(item);
  peer.broadcast({ type: "clip", item: { ...item, fromSelf: false } });
  newClip.value = "";
};

const copyItem = async (item) => {
  await navigator.clipboard.writeText(item.text);
  $toast?.success("Copied!");
};

const removeItem = (id) => {
  clips.value = clips.value.filter((c) => c.id !== id);
};

onMounted(async () => {
  if (isViewer.value) {
    await peer.init();
    peer.onMessage((data) => {
      if (data.type === "clip")
        clips.value.unshift({ ...data.item, id: ++clipId, fromSelf: false });
    });
    peer.connectTo(props.hostPeerId);
  } else {
    await peer.init(props.sessionId);
    peer.onMessage((data) => {
      if (data.type === "clip")
        clips.value.unshift({ ...data.item, id: ++clipId, fromSelf: false });
    });
  }
});
</script>

<style scoped lang="scss">
/* ─── Layout ─────────────────────────────────────────── */
.clip-layout {
  display: grid;
  grid-template-columns: 1fr 210px;
  gap: 14px;

  @media (max-width: 800px) {
    grid-template-columns: 1fr 180px;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

/* ─── Main panel ─────────────────────────────────────── */
.clip-left {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}

.live-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--border-color);
  &.active {
    background: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
  }
}

/* ─── Clip list ──────────────────────────────────────── */
.clip-list {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px;

  @media (max-width: 480px) {
    max-height: 260px;
  }
}

.clip-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  color: var(--text-muted);
  text-align: center;
  p {
    font-size: 0.8rem;
    margin: 0;
  }
}

.clip-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 9px 11px;
}

.clip-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  color: var(--text-muted);
}

.clip-time {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.clip-from {
  font-size: 0.66rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  &.self {
    background: rgba(20, 184, 166, 0.1);
    color: #14b8a6;
  }
  &.remote {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }
}

.clip-text {
  font-size: 0.84rem;
  color: var(--text-primary);
  margin: 0 0 7px;
  word-break: break-all;
  line-height: 1.5;
}

.clip-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.clip-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  &:hover {
    color: var(--text-primary);
  }
  &.icon-only {
    padding: 3px 6px;
  }
}

/* ─── Compose bar ────────────────────────────────────── */
.clip-compose {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 9px 10px;
  border-top: 1px solid var(--border-color);
}

.clip-input {
  flex: 1;
  resize: none;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 0.84rem;
  color: var(--text-primary);
  font-family: "Tajawal", sans-serif;
  outline: none;
  &::placeholder {
    color: var(--text-muted);
  }
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #14b8a6;
  border: none;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;

  @media (max-width: 360px) {
    padding: 8px 9px;
    .send-label {
      display: none;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    opacity: 0.85;
  }
}

/* ─── Right sidebar ──────────────────────────────────── */
.clip-right {
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 560px) {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
  }
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
}

.clip-stats {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 11px;
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 560px) {
    flex-direction: row;
    gap: 14px;
    align-items: center;
    padding: 10px 14px;
  }
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ─── Transitions ────────────────────────────────────── */
.clip-slide-enter-active {
  transition: all 0.2s ease;
}
.clip-slide-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
