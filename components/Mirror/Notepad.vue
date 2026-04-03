<template>
  <div class="two-col">
    <div class="editor-panel">
      <div class="panel-header">
        <span class="panel-title">
          <Icon name="mdi:pencil-outline" size="15" />{{ $t("liveNotepad") }}
        </span>
        <div class="panel-actions">
          <span
            class="live-dot"
            :class="{ active: peer.status.value === 'ready' }"
          />
          <span class="live-label">{{ $t("live") }}</span>
          <button class="icon-btn" @click="clearContent">
            <Icon name="mdi:delete-outline" size="15" />
          </button>
          <button class="icon-btn" @click="copyContent">
            <Icon
              :name="noteCopied ? 'mdi:check' : 'mdi:content-copy'"
              size="15"
            />
          </button>
        </div>
      </div>
      <textarea
        v-model="noteContent"
        class="note-textarea"
        :placeholder="$t('startTyping')"
        @input="onInput"
      />
      <div class="editor-footer">
        <span class="char-info"
          >{{ noteContent.length }} {{ $t("chars") }} · {{ lineCount }}
          {{ $t("lines") }}</span
        >
        <span class="session-badge"
          ><Icon name="mdi:key-outline" size="12" />{{
            peerId.slice(0, 8)
          }}</span
        >
      </div>
    </div>

    <div class="side-col">
      <MirrorSharePanel :url="shareUrl" :status="peer.status.value" />

      <div class="hint-card">
        <Icon name="mdi:information-outline" size="16" class="hint-icon" />
        <p class="hint-text">{{ $t("bothDevicesSameWifi") }}</p>
      </div>

      <div class="peers-card">
        <div class="peers-title">
          <Icon name="mdi:devices" size="15" />{{ $t("connectedDevices") }}
        </div>
        <div class="peer-list">
          <div class="peer-row peer-row--self">
            <Icon name="mdi:monitor" size="15" />
            <span
              >{{ $t("thisDevice") }}
              <span class="self-badge">{{ $t("host") }}</span></span
            >
          </div>
          <div v-for="p in peer.connectedPeers.value" :key="p" class="peer-row">
            <Icon name="mdi:cellphone" size="15" />
            <span>{{ p.slice(0, 8) }}</span>
            <span class="peer-dot" />
          </div>
          <div v-if="!peer.connectedPeers.value.length" class="peer-empty">
            {{ $t("noOtherDevices") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";

const props = defineProps({
  sessionId: String,
  hostPeerId: { type: String, default: "" },
});

const { $toast } = useNuxtApp();
const noteContent = ref("");
const noteCopied = ref(false);
const lineCount = computed(() => noteContent.value.split("\n").length);
const isViewer = computed(() => !!props.hostPeerId);

const peer = useMirrorPeer();
const peerId = peer.peerId;

const shareUrl = computed(() => {
  if (!import.meta.client || !peerId.value) return "";
  return `${window.location.origin}/toolbox/mirror?peer=${peerId.value}&mode=notepad`;
});

const onInput = () => {
  if (isViewer.value) return;
  peer.broadcast({ type: "note", text: noteContent.value });
};

const clearContent = () => {
  if (isViewer.value) return;
  noteContent.value = "";
  onInput();
};

const copyContent = async () => {
  await navigator.clipboard.writeText(noteContent.value);
  noteCopied.value = true;
  setTimeout(() => (noteCopied.value = false), 2000);
};

onMounted(async () => {
  if (isViewer.value) {
    await peer.init(); // random ID for viewer
    peer.onMessage((data) => {
      if (data.type === "note") noteContent.value = data.text;
    });
    peer.connectTo(props.hostPeerId);
    // Ask for current note once connected
    watch(peer.connectedPeers, (peers) => {
      if (peers.length > 0) peer.broadcast({ type: "note_request" });
    });
  } else {
    await peer.init(props.sessionId);
    peer.onMessage((data) => {
      if (data.type === "note") noteContent.value = data.text;
      if (data.type === "note_request") {
        peer.broadcast({ type: "note", text: noteContent.value });
      }
    });
    watch(peer.connectedPeers, () => {
      peer.broadcast({ type: "note", text: noteContent.value });
    });
  }
});
</script>

<style scoped lang="scss">
.two-col {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 16px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}
.editor-panel {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
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
.live-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
}
.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: none;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  &:hover {
    color: var(--text-primary);
    background: var(--bg-surface);
  }
}
.note-textarea {
  flex: 1;
  min-height: 340px;
  padding: 16px;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-size: 0.92rem;
  font-family: "Courier New", monospace;
  color: var(--text-primary);
  line-height: 1.7;
  &::placeholder {
    color: var(--text-muted);
  }
}
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid var(--border-color);
}
.char-info {
  font-size: 0.72rem;
  color: var(--text-muted);
}
.session-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 3px 8px;
  border-radius: 6px;
}
.side-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hint-card {
  background: rgba(20, 184, 166, 0.06);
  border: 1px solid rgba(20, 184, 166, 0.2);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.hint-icon {
  color: #14b8a6;
  flex-shrink: 0;
  margin-top: 2px;
}
.hint-text {
  font-size: 0.78rem;
  color: var(--text-sub);
  margin: 0;
  line-height: 1.5;
}
.peers-card {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
}
.peers-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
}
.peer-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.peer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--text-sub);
  &--self {
    color: var(--text-primary);
  }
}
.peer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  margin-inline-start: auto;
}
.self-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(20, 184, 166, 0.1);
  color: #14b8a6;
  font-size: 0.65rem;
  font-weight: 700;
}
.peer-empty {
  font-size: 0.74rem;
  color: var(--text-muted);
  font-style: italic;
}
</style>
