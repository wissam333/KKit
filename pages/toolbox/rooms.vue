<template>
  <div class="room-lobby" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- Background blobs -->
    <div class="blob blob-1" />
    <div class="blob blob-2" />

    <div class="lobby-card">
      <!-- Logo / Brand -->
      <div class="lobby-brand">
        <div class="brand-icon">
          <Icon name="mdi:video-wireless-outline" size="28" />
        </div>
        <div>
          <h1 class="brand-name">Mirror Room</h1>
          <p class="brand-sub">{{ $t("mirrorRoomSub") }}</p>
        </div>
      </div>

      <!-- Name Input -->
      <div class="field-group">
        <label class="field-label">
          <Icon name="mdi:account-outline" size="14" />
          {{ $t("yourName") }}
        </label>
        <SharedUiFormBaseInput
          v-model="name"
          :placeholder="$t('enterYourName')"
          size="md"
          @keyup.enter="handleCreate"
        />
      </div>

      <!-- Divider -->
      <div class="lobby-divider">
        <div class="divider-tabs">
          <button
            class="dtab"
            :class="{ active: tab === 'create' }"
            @click="tab = 'create'"
          >
            <Icon name="mdi:plus-circle-outline" size="15" />
            {{ $t("createRoom") }}
          </button>
          <button
            class="dtab"
            :class="{ active: tab === 'join' }"
            @click="tab = 'join'"
          >
            <Icon name="mdi:login-variant" size="15" />
            {{ $t("joinRoom") }}
          </button>
        </div>
      </div>

      <!-- Create tab -->
      <div v-if="tab === 'create'" class="tab-content">
        <p class="tab-desc">{{ $t("createRoomDesc") }}</p>
        <SharedUiButtonBase
          variant="primary"
          size="lg"
          icon-left="mdi:plus"
          :loading="loading"
          :disabled="!name.trim()"
          style="width: 100%"
          @click="handleCreate"
        >
          {{ $t("createRoom") }}
        </SharedUiButtonBase>
      </div>

      <!-- Join tab -->
      <div v-else class="tab-content">
        <label class="field-label">
          <Icon name="mdi:key-outline" size="14" />
          {{ $t("roomCode") }}
        </label>
        <SharedUiFormBaseInput
          v-model="joinCode"
          :placeholder="$t('enterRoomCode')"
          size="md"
          style="text-transform: uppercase; letter-spacing: 0.12em"
          @keyup.enter="handleJoin"
        />
        <SharedUiButtonBase
          variant="success"
          size="lg"
          icon-left="mdi:login-variant"
          :loading="loading"
          :disabled="!name.trim() || !joinCode.trim()"
          style="width: 100%; margin-top: 10px"
          @click="handleJoin"
        >
          {{ $t("joinRoom") }}
        </SharedUiButtonBase>
      </div>

      <!-- Features -->
      <div class="feature-list">
        <div v-for="f in features" :key="f.key" class="feature-item">
          <Icon :name="f.icon" size="14" />
          <span>{{ $t(f.key) }}</span>
        </div>
      </div>
    </div>

    <!-- Android / Chrome: native install prompt -->
    <div v-if="showAndroidInstall" class="pwa-banner">
      <Icon name="mdi:cellphone-arrow-down" size="18" />
      <span>{{ $t("installApp") }}</span>
      <button class="pwa-install-btn" @click="installPwa">
        {{ $t("install") }}
      </button>
      <button class="pwa-close-btn" @click="dismissInstall">
        <Icon name="mdi:close" size="14" />
      </button>
    </div>

    <!-- iOS Safari: manual "Add to Home Screen" hint -->
    <div v-if="showIosHint" class="pwa-banner ios">
      <Icon name="mdi:apple" size="18" />
      <span
        >Tap
        <Icon
          name="mdi:export-variant"
          size="14"
          style="vertical-align: middle"
        />
        then <strong>Add to Home Screen</strong></span
      >
      <button class="pwa-close-btn" @click="dismissInstall">
        <Icon name="mdi:close" size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const { locale } = useI18n();
const router = useRouter();

const name = ref(
  import.meta.client ? localStorage.getItem("room-name") || "" : "",
);
const joinCode = ref("");
const tab = ref("create");
const loading = ref(false);

// ── Install prompt state ───────────────────────────────────────────────────
let deferredPrompt = null;
const showAndroidInstall = ref(false);
const showIosHint = ref(false);

const features = [
  { key: "featureVideo", icon: "mdi:video-outline" },
  { key: "featureDraw", icon: "mdi:draw" },
  { key: "featureChat", icon: "mdi:chat-outline" },
  { key: "featureScreen", icon: "mdi:monitor-share" },
  { key: "featureFiles", icon: "mdi:file-send-outline" },
];

const handleCreate = async () => {
  if (!name.value.trim() || loading.value) return;
  loading.value = true;
  if (import.meta.client) localStorage.setItem("room-name", name.value);
  const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
  await nextTick();
  router.push(`/toolbox/room/${roomId}?name=${encodeURIComponent(name.value)}`);
};

const handleJoin = async () => {
  if (!name.value.trim() || !joinCode.value.trim() || loading.value) return;
  loading.value = true;
  if (import.meta.client) localStorage.setItem("room-name", name.value);
  const code = joinCode.value.trim().toUpperCase();
  router.push(
    `/toolbox/room/${code}?name=${encodeURIComponent(name.value)}&join=1`,
  );
};

const dismissInstall = () => {
  showAndroidInstall.value = false;
  showIosHint.value = false;
  // Don't show again for 7 days
  localStorage.setItem("pwa-dismissed", String(Date.now()));
};

const installPwa = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  showAndroidInstall.value = false;
};

onMounted(() => {
  if (!import.meta.client) return;

  // Don't show if user dismissed recently (7 days)
  const dismissed = localStorage.getItem("pwa-dismissed");
  if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000)
    return;

  // Don't show if already installed (running as standalone PWA)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroidChrome =
    /android/i.test(navigator.userAgent) && /chrome/i.test(navigator.userAgent);

  if (isIos) {
    // iOS Safari never fires beforeinstallprompt — show manual hint instead
    showIosHint.value = true;
  } else if (isAndroidChrome) {
    // Android Chrome fires beforeinstallprompt when installability criteria pass.
    // The #1 reason it doesn't fire: missing or broken icon files in public/.
    // Make sure public/pwa-192.png and public/pwa-512.png exist.
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showAndroidInstall.value = true;
    });

    // Fallback: if the event never fires after 3s, the app is likely already
    // installed or the manifest/icons are broken — stay silent.
  }
});
</script>

<style scoped lang="scss">
.room-lobby {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  background: var(--bg-page);
  font-family: "Tajawal", sans-serif;
}

.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.18;
  &.blob-1 {
    width: 400px;
    height: 400px;
    background: #14b8a6;
    top: -100px;
    left: -100px;
  }
  &.blob-2 {
    width: 300px;
    height: 300px;
    background: #6366f1;
    bottom: -80px;
    right: -60px;
  }
}

.lobby-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 8px 48px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (max-width: 480px) {
    padding: 22px 18px;
    border-radius: 18px;
    gap: 16px;
  }
}

.lobby-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgba(20, 184, 166, 0.15),
    rgba(99, 102, 241, 0.15)
  );
  border: 1.5px solid rgba(20, 184, 166, 0.25);
  color: #14b8a6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-name {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.03em;
}

.brand-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.field-group {
  display: flex;
  flex-direction: column;
}

.lobby-divider {
  margin: 0;
}

.divider-tabs {
  display: flex;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
}

.dtab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  transition: all 0.18s;

  &.active {
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 360px) {
    font-size: 0.72rem;
    padding: 7px 8px;
  }
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tab-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
  text-align: center;
}

.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* ── PWA Banner ──────────────────────────────────────── */
.pwa-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  padding: 12px 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  font-size: 0.8rem;
  color: var(--text-primary);
  font-family: "Tajawal", sans-serif;
  z-index: 999;
  max-width: calc(100vw - 32px);
  white-space: nowrap;

  &.ios {
    white-space: normal;
    max-width: 320px;
    text-align: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  @media (max-width: 480px) {
    font-size: 0.75rem;
    padding: 10px 12px;
  }
}

.pwa-install-btn {
  padding: 5px 12px;
  border-radius: 8px;
  background: #14b8a6;
  color: #fff;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  flex-shrink: 0;
}

.pwa-close-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
