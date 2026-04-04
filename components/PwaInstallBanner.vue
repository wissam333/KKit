<template>
  <Transition name="pwa-slide">
    <div
      v-if="showBanner"
      class="pwa-banner"
      :dir="locale === 'ar' ? 'rtl' : 'ltr'"
    >
      <div class="pwa-banner-inner">
        <div class="pwa-icon">
          <Icon name="mdi:cellphone-arrow-down" size="20" />
        </div>
        <div class="pwa-text">
          <div class="pwa-title">{{ $t("pwa.installTitle") }}</div>
          <div class="pwa-sub">{{ $t("pwa.installSub") }}</div>
        </div>
        <div class="pwa-actions">
          <button class="pwa-install-btn" @click="install">
            {{ $t("pwa.install") }}
          </button>
          <button class="pwa-later-btn" @click="dismiss">
            {{ $t("pwa.later") }}
          </button>
        </div>
        <button class="pwa-close" @click="dismiss" :title="$t('pwa.close')">
          <Icon name="mdi:close" size="15" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const { locale } = useI18n();
const { showBanner, install, dismiss } = usePwaInstall();
</script>

<style scoped lang="scss">
.pwa-banner {
  position: fixed;
  bottom: 72px; // above mobile nav bar
  inset-inline: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;

  @media (min-width: 768px) {
    bottom: 24px;
    justify-content: flex-end;
    padding-inline-end: 24px;
  }
}

.pwa-banner-inner {
  pointer-events: all;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  max-width: 480px;
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
    min-width: 340px;
  }
}

.pwa-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
  background: rgba(20, 184, 166, 0.12);
  border: 1.5px solid rgba(20, 184, 166, 0.25);
  color: #14b8a6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwa-text {
  flex: 1;
  min-width: 0;
}
.pwa-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.pwa-sub {
  font-size: 0.74rem;
  color: var(--text-sub);
}

.pwa-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pwa-install-btn {
  padding: 7px 14px;
  border-radius: 9px;
  background: #14b8a6;
  color: #fff;
  border: none;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.18s;
  &:hover {
    opacity: 0.85;
  }
}

.pwa-later-btn {
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  &:hover {
    color: var(--text-primary);
  }
}

.pwa-close {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  flex-shrink: 0;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    color: var(--text-primary);
  }
}

/* Transition */
.pwa-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.pwa-slide-leave-active {
  transition: all 0.2s ease;
}
.pwa-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.pwa-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
