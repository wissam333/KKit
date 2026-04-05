<template>
  <div class="entry-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- Background mesh -->
    <div class="entry-bg" aria-hidden="true">
      <div class="mesh mesh-1" />
      <div class="mesh mesh-2" />
    </div>

    <div class="entry-content">
      <!-- Headline -->
      <div class="entry-headline">
        <span class="entry-eyebrow">{{ $t("welcomeTo") }}</span>
        <h1 class="entry-title">KKit</h1>
        <p class="entry-desc">{{ $t("entryDesc") }}</p>
      </div>

      <!-- Cards -->
      <div class="entry-cards">
        <!-- Mirror Room -->
        <NuxtLink to="/toolbox/rooms" class="entry-card mirror-card">
          <div class="card-glow mirror-glow" />
          <div class="card-icon mirror-icon">
            <Icon name="mdi:video-wireless-outline" size="28" />
          </div>
          <div class="card-body">
            <h2 class="card-title">Mirror Room</h2>
            <p class="card-desc">{{ $t("mirrorDesc") }}</p>
            <!-- Feature pills -->
            <div class="feature-pills">
              <span class="pill"
                ><Icon name="mdi:video" size="10" />{{
                  $t("mirrorFeature.video")
                }}</span
              >
              <span class="pill"
                ><Icon name="mdi:monitor-share" size="10" />{{
                  $t("mirrorFeature.screen")
                }}</span
              >
              <span class="pill"
                ><Icon name="mdi:draw" size="10" />{{
                  $t("mirrorFeature.board")
                }}</span
              >
              <span class="pill"
                ><Icon name="mdi:chat-outline" size="10" />{{
                  $t("mirrorFeature.chat")
                }}</span
              >
            </div>
          </div>
          <div class="card-arrow">
            <Icon name="mdi:arrow-right" size="18" />
          </div>
          <div class="card-badge p2p-badge">
            <Icon name="mdi:shield-check-outline" size="10" />
            {{ $t("p2pBadge") }}
          </div>
        </NuxtLink>

        <!-- GramKit -->
        <NuxtLink to="/gramkit" class="entry-card gramkit-card">
          <div class="card-glow gramkit-glow" />
          <div class="card-icon gramkit-icon">
            <Icon name="mdi:telegram" size="28" />
          </div>
          <div class="card-body">
            <h2 class="card-title">GramKit</h2>
            <p class="card-desc">{{ $t("gramkitDesc") }}</p>
            <!-- Requirements notice -->
            <div class="req-notice">
              <Icon name="mdi:information-outline" size="12" class="req-icon" />
              <span>{{ $t("gramkitReq.label") }}</span>
              <a
                href="https://my.telegram.org"
                target="_blank"
                rel="noopener"
                class="req-link"
                @click.prevent.stop="
                  () => window.open('https://my.telegram.org', '_blank')
                "
              >
                my.telegram.org
                <Icon name="mdi:open-in-new" size="10" />
              </a>
            </div>
          </div>
          <div class="card-arrow">
            <Icon name="mdi:arrow-right" size="18" />
          </div>
          <div class="card-badge tg-badge">
            <Icon name="mdi:key-outline" size="10" />
            {{ $t("gramkitTag") }}
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { locale, t } = useI18n();
const { init } = useTheme();

const showTgHint = ref(false);

const tgSteps = computed(() => [
  {
    title: t("gramkitHint.step1.title"),
    desc: t("gramkitHint.step1.desc"),
    link: "https://my.telegram.org",
  },
  {
    title: t("gramkitHint.step2.title"),
    desc: t("gramkitHint.step2.desc"),
    link: null,
  },
  {
    title: t("gramkitHint.step3.title"),
    desc: t("gramkitHint.step3.desc"),
    link: null,
  },
]);

onMounted(() => init());
</script>

<style lang="scss" scoped>
/* ─── Page shell ───────────────────────────────────── */
.entry-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--bg-page);
  padding: 80px 20px 40px;

  @media (max-width: 480px) {
    padding: 70px 16px 32px;
    align-items: flex-start;
    padding-top: 90px;
  }
}

/* ─── Background blobs ─────────────────────────────── */
.entry-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.mesh {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
}

.mesh-1 {
  width: 500px;
  height: 500px;
  background: var(--primary-soft);
  top: -120px;
  left: -100px;

  @media (max-width: 480px) {
    width: 280px;
    height: 280px;
    top: -60px;
    left: -60px;
  }
}

.mesh-2 {
  width: 420px;
  height: 420px;
  background: rgba(20, 184, 166, 0.12);
  bottom: -100px;
  right: -80px;

  @media (max-width: 480px) {
    width: 240px;
    height: 240px;
    bottom: -60px;
    right: -40px;
  }
}

/* ─── Content ──────────────────────────────────────── */
.entry-content {
  position: relative;
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;

  @media (max-width: 480px) {
    gap: 22px;
  }
}

/* ─── Headline ─────────────────────────────────────── */
.entry-headline {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.entry-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--primary-mid);
}

.entry-title {
  font-size: clamp(2.2rem, 8vw, 3.2rem);
  font-weight: 900;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  margin: 0;
  line-height: 1.05;
}

.entry-desc {
  font-size: 0.9rem;
  color: var(--text-sub);
  margin: 0;
  max-width: 380px;
  line-height: 1.6;

  @media (max-width: 480px) {
    font-size: 0.83rem;
  }
}

/* ─── Cards grid ───────────────────────────────────── */
.entry-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* ─── Entry card ───────────────────────────────────── */
.entry-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px 20px 44px; // extra bottom room for badge
  border-radius: 20px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  text-decoration: none;
  overflow: hidden;
  transition:
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.22s ease,
    border-color 0.22s ease;

  @media (max-width: 520px) {
    padding: 16px 16px 42px;
    gap: 10px;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1);

    .card-arrow {
      transform: translateX(4px);
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(-1px);
  }
}

/* ─── Glow layer ────────────────────────────────────── */
.card-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: 20px;
}

.entry-card:hover .card-glow {
  opacity: 1;
}

.mirror-glow {
  background: radial-gradient(
    circle at 30% 30%,
    rgba(20, 184, 166, 0.1),
    transparent 70%
  );
}

.gramkit-glow {
  background: radial-gradient(
    circle at 30% 30%,
    rgba(41, 182, 246, 0.08),
    transparent 70%
  );
}

/* ─── Card icon ─────────────────────────────────────── */
.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.entry-card:hover .card-icon {
  transform: scale(1.08) rotate(-4deg);
}

.mirror-icon {
  background: rgba(20, 184, 166, 0.1);
  border: 1.5px solid rgba(20, 184, 166, 0.2);
  color: #14b8a6;
}

.gramkit-icon {
  background: rgba(41, 182, 246, 0.1);
  border: 1.5px solid rgba(41, 182, 246, 0.2);
  color: #29b6f6;
}

/* ─── Card body ─────────────────────────────────────── */
.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.card-desc {
  font-size: 0.78rem;
  color: var(--text-sub);
  margin: 0;
  line-height: 1.5;
}

/* ─── Feature pills (Mirror Room) ───────────────────── */
.feature-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #14b8a6;
  background: rgba(20, 184, 166, 0.08);
  border: 1px solid rgba(20, 184, 166, 0.18);
  padding: 2px 7px;
  border-radius: 6px;
  letter-spacing: 0.01em;
}

/* ─── Telegram requirements notice ─────────────────── */
.req-notice {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 0.68rem;
  color: var(--text-muted);
  background: rgba(255, 193, 7, 0.07);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 8px;
  padding: 5px 9px;

  .req-icon {
    color: #f59e0b;
    flex-shrink: 0;
  }
}

.req-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #29b6f6;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

/* ─── Arrow ─────────────────────────────────────────── */
.card-arrow {
  position: absolute;
  top: 20px;
  right: 18px;
  color: var(--text-muted);
  opacity: 0.5;
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;

  [dir="rtl"] & {
    right: auto;
    left: 18px;
    transform: scaleX(-1);
  }
}

/* ─── Badge (bottom bar) ────────────────────────────── */
.card-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 12px;
  border-top: 1px solid var(--border-color);
}

.p2p-badge {
  color: #14b8a6;
  background: rgba(20, 184, 166, 0.05);
}

.tg-badge {
  color: #29b6f6;
  background: rgba(41, 182, 246, 0.05);
}

.tg-step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary-soft);
  border: 1.5px solid var(--primary-mid);
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.tg-step-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tg-step-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}

.tg-step-desc {
  font-size: 0.74rem;
  color: var(--text-sub);
  line-height: 1.5;
}

.tg-step-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #29b6f6;
  text-decoration: none;
  margin-top: 3px;

  &:hover {
    text-decoration: underline;
  }
}

/* ─── Expand transition ─────────────────────────────── */
.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.28s ease,
    opacity 0.2s ease;
  max-height: 400px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
