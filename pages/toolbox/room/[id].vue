<template>
  <div
    class="room-page"
    :dir="locale === 'ar' ? 'rtl' : 'ltr'"
    :class="{ 'sidebar-open': sidebarOpen }"
  >
    <!-- ── TOP BAR ──────────────────────────────────────────────── -->
    <header class="room-topbar">
      <div class="topbar-left">
        <NuxtLink to="/toolbox/rooms" class="back-btn">
          <Icon name="mdi:arrow-left" size="16" />
        </NuxtLink>
        <div class="room-info">
          <span class="room-label">{{ $t("room") }}</span>
          <span class="room-id">{{ roomId }}</span>
        </div>
        <div class="member-pips">
          <div
            v-for="m in allMembers.slice(0, 4)"
            :key="m.peerId"
            class="member-pip"
            :title="m.name"
          >
            {{ m.name.charAt(0).toUpperCase() }}
          </div>
          <div v-if="allMembers.length > 4" class="member-pip overflow">
            +{{ allMembers.length - 4 }}
          </div>
        </div>
      </div>

      <div class="topbar-center">
        <div class="tab-nav desktop-only">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tnav-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <Icon :name="tab.icon" size="15" />
            <span>{{ $t(tab.labelKey) }}</span>
            <span v-if="tab.key === 'chat' && unreadCount" class="badge">{{
              unreadCount
            }}</span>
          </button>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Back to lobby button when a game is active -->
        <button
          v-if="activeTab === 'games' && selectedGame"
          class="icon-btn"
          :title="$t('backToLobby')"
          @click="selectedGame = null"
        >
          <Icon name="mdi:gamepad-variant-outline" size="18" />
        </button>
        <button
          class="icon-btn"
          :title="$t('shareRoom')"
          @click="showShare = true"
        >
          <Icon name="mdi:share-variant-outline" size="18" />
        </button>
      </div>
    </header>

    <!-- ── MOBILE TAB BAR ────────────────────────────────────────── -->
    <div class="mobile-tabs mobile-only">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="mtab"
        :class="{ active: activeTab === tab.key }"
        @click="
          activeTab = tab.key;
          sidebarOpen = false;
        "
      >
        <Icon :name="tab.icon" size="18" />
        <span class="mtab-label">{{ $t(tab.labelKey) }}</span>
        <span v-if="tab.key === 'chat' && unreadCount" class="mbadge">{{
          unreadCount
        }}</span>
      </button>
    </div>

    <!-- ── MAIN CONTENT ──────────────────────────────────────────── -->
    <main class="room-main">
      <div v-show="activeTab === 'video'" class="tab-panel">
        <RoomVideoGrid
          :room="room"
          :my-peer-id="room.myPeerId.value"
          :members="room.members.value"
          :my-name="room.myName.value"
        />
      </div>

      <div v-show="activeTab === 'board'" class="tab-panel">
        <RoomWhiteboard :room="room" />
      </div>

      <div v-show="activeTab === 'chat'" class="tab-panel" @click="clearUnread">
        <RoomChat :room="room" />
      </div>

      <div v-show="activeTab === 'screen'" class="tab-panel">
        <RoomScreenShare :room="room" />
      </div>

      <!-- GAMES: lobby or active game -->
      <div
        v-show="activeTab === 'games'"
        class="tab-panel"
        style="height: 100%"
      >
        <!-- Lobby — shown when no game is selected -->
        <RoomGamesLobby
          v-if="!selectedGame"
          :room="room"
          @select="onGameSelect"
        />

        <!-- Active game — keyed so it fully remounts on game change -->
        <template v-else>
          <RoomGamesPong
            v-if="selectedGame === 'pong'"
            :key="'pong'"
            :room="room"
            @exit="selectedGame = null"
          />
          <RoomGamesPlane
            v-else-if="selectedGame === 'skyaces'"
            :key="'skyaces'"
            :room="room"
            @exit="selectedGame = null"
          />
        </template>
      </div>
    </main>

    <!-- ── SHARE MODAL ───────────────────────────────────────────── -->
    <SharedUiDialogAppModal
      v-model="showShare"
      :title="$t('inviteToRoom')"
      max-width="360px"
    >
      <div class="share-modal-content">
        <MirrorSharePanel
          :url="shareUrl"
          :status="room.status.value"
          :label="$t('scanToJoin')"
        />
        <div class="room-code-display">
          <span class="rcd-label">{{ $t("roomCode") }}</span>
          <span class="rcd-code">{{ roomId }}</span>
        </div>
      </div>
    </SharedUiDialogAppModal>

    <!-- ── CONNECTING OVERLAY ────────────────────────────────────── -->
    <div v-if="room.status.value === 'loading'" class="connecting-overlay">
      <div class="conn-card">
        <Icon name="mdi:loading" size="30" class="spin" />
        <span>{{ $t("connectingToRoom") }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const route = useRoute();
const router = useRouter();

definePageMeta({ ssr: false });

const roomId = computed(() => (route.params.id || "").toUpperCase());
const nameParam = computed(() =>
  decodeURIComponent(route.query.name || "Guest"),
);
const isJoining = computed(() => !!route.query.join);

const room = useRoom();
const activeTab = ref("video");
const sidebarOpen = ref(false);
const showShare = ref(false);
const unreadCount = ref(0);

// Which game is running — null means show the lobby
const selectedGame = ref(null);

const tabs = [
  { key: "video", labelKey: "videoCall", icon: "mdi:video-outline" },
  { key: "board", labelKey: "whiteboard", icon: "mdi:draw" },
  { key: "chat", labelKey: "chat", icon: "mdi:chat-outline" },
  { key: "screen", labelKey: "screenShare", icon: "mdi:monitor-share" },
  { key: "games", labelKey: "games", icon: "mdi:gamepad-variant-outline" },
];

// When leaving the games tab, reset back to lobby so it's fresh next visit
watch(activeTab, (newTab, oldTab) => {
  if (newTab === "chat") unreadCount.value = 0;
  if (oldTab === "games") selectedGame.value = null;
});

const onGameSelect = (game) => {
  selectedGame.value = game;
};

const allMembers = computed(() => [
  { peerId: room.myPeerId.value, name: room.myName.value, isMe: true },
  ...room.members.value,
]);

const shareUrl = computed(() => {
  if (!import.meta.client) return "";
  return `${window.location.origin}/toolbox/room/${roomId.value}?join=1&name=Guest`;
});

const clearUnread = () => {
  if (activeTab.value === "chat") unreadCount.value = 0;
};

watch(
  () => room.messages.value.length,
  (newLen, oldLen) => {
    if (activeTab.value === "chat") return;
    const newMessages = room.messages.value.slice(oldLen);
    const hasIncoming = newMessages.some((m) => !m.fromMe);
    if (hasIncoming) unreadCount.value++;
  },
);

onMounted(async () => {
  if (!nameParam.value || nameParam.value === "Guest") {
    const saved = localStorage.getItem("room-name");
    if (!saved) {
      router.replace(`/toolbox/rooms`);
      return;
    }
  }

  const name = nameParam.value || localStorage.getItem("room-name") || "Guest";

  if (isJoining.value) {
    await room.init(name);
    room.roomId.value = roomId.value;
    room.connectTo(roomId.value);

    watch(room.members, (members) => {
      members.forEach((m) => {
        if (!room.getDataConn(m.peerId)) {
          room.connectTo(m.peerId);
        }
      });
    });
  } else {
    await room.init(name, roomId.value);
    room.roomId.value = roomId.value;
  }

  if (room.status.value === "error") {
    $toast?.error(t("connectionError"));
  }
});

onUnmounted(() => {
  room.destroy();
});
</script>

<style scoped lang="scss">
.room-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-page);
  font-family: "Tajawal", sans-serif;

  height: calc(100dvh - 62px);
  @media (max-width: 991px) {
    height: calc(100dvh - 54px);
  }
}

.room-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
  border-bottom: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  flex-shrink: 0;
  gap: 12px;
  z-index: 100;

  @media (max-width: 640px) {
    height: 50px;
    padding: 0 12px;
  }
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.topbar-center {
  flex: 2;
  display: flex;
  justify-content: center;

  @media (max-width: 640px) {
    display: none;
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: flex-end;
}

.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.18s;
  flex-shrink: 0;

  &:hover {
    color: var(--text-primary);
    border-color: var(--text-muted);
  }
}

.room-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.room-label {
  font-size: 0.62rem;
  color: var(--text-muted);
  font-weight: 600;
  line-height: 1;
}

.room-id {
  font-size: 0.9rem;
  font-weight: 900;
  color: #14b8a6;
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.member-pips {
  display: flex;
  align-items: center;

  @media (max-width: 380px) {
    display: none;
  }
}

.member-pip {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #14b8a6, #6366f1);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-surface);
  margin-inline-start: -6px;

  &:first-child {
    margin-inline-start: 0;
  }

  &.overflow {
    background: var(--bg-elevated);
    color: var(--text-muted);
    border-color: var(--border-color);
    font-size: 0.6rem;
  }
}

.tab-nav {
  display: flex;
  gap: 2px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  padding: 3px;
}

.tnav-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  white-space: nowrap;

  &.active {
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.badge {
  background: #ef4444;
  color: #fff;
  border-radius: 20px;
  font-size: 0.58rem;
  padding: 1px 5px;
  font-weight: 800;
  min-width: 16px;
  text-align: center;
}

.mobile-tabs {
  display: flex;
  border-bottom: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.mtab {
  flex: 1;
  min-width: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 6px 6px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  margin-bottom: -1.5px;

  &.active {
    color: #14b8a6;
    border-bottom-color: #14b8a6;
  }
}

.mtab-label {
  font-size: 0.62rem;
  font-weight: 700;
}

.mbadge {
  position: absolute;
  top: 4px;
  right: 10px;
  background: #ef4444;
  color: #fff;
  border-radius: 20px;
  font-size: 0.55rem;
  padding: 1px 4px;
  font-weight: 800;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-elevated);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    color: var(--text-primary);
    border-color: var(--text-muted);
  }
}

.room-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-panel {
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &[v-show="false"],
  &[style*="display: none"] {
    display: none !important;
  }
}

.share-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.room-code-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 18px;
  width: 100%;
  justify-content: center;
}

.rcd-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 700;
}

.rcd-code {
  font-size: 1.4rem;
  font-weight: 900;
  color: #14b8a6;
  letter-spacing: 0.15em;
}

.connecting-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conn-card {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 16px;
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.desktop-only {
  @media (max-width: 640px) {
    display: none !important;
  }
}

.mobile-only {
  @media (min-width: 641px) {
    display: none !important;
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
