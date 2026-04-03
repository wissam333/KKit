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
        <!-- GramKit -->
        <NuxtLink to="/gramkit" class="entry-card gramkit-card">
          <div class="card-glow gramkit-glow" />
          <div class="card-icon gramkit-icon">
            <Icon name="mdi:translate" size="28" />
          </div>
          <div class="card-body">
            <h2 class="card-title">GramKit</h2>
            <p class="card-desc">{{ $t("gramkitDesc") }}</p>
          </div>
          <div class="card-arrow">
            <Icon name="mdi:arrow-right" size="18" />
          </div>
          <div class="card-tag">{{ $t("language") }}</div>
        </NuxtLink>

        <!-- Toolbox -->
        <NuxtLink to="/toolbox/mirror" class="entry-card toolbox-card">
          <div class="card-glow toolbox-glow" />
          <div class="card-icon toolbox-icon">
            <Icon name="mdi:toolbox-outline" size="28" />
          </div>
          <div class="card-body">
            <h2 class="card-title">Toolbox</h2>
            <p class="card-desc">{{ $t("toolboxDesc") }}</p>
          </div>
          <div class="card-arrow">
            <Icon name="mdi:arrow-right" size="18" />
          </div>
          <div class="card-tag">{{ $t("tools") }}</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { locale } = useI18n();
const { init } = useTheme();

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
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;

  @media (max-width: 480px) {
    gap: 28px;
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
  gap: 14px;
  padding: 22px 20px 20px;
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
    flex-direction: row;
    align-items: center;
    padding: 16px;
    gap: 14px;
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

.gramkit-glow {
  background: radial-gradient(
    circle at 30% 30%,
    var(--primary-soft),
    transparent 70%
  );
}

.toolbox-glow {
  background: radial-gradient(
    circle at 30% 30%,
    rgba(20, 184, 166, 0.08),
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

  @media (max-width: 520px) {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }
}

.entry-card:hover .card-icon {
  transform: scale(1.08) rotate(-4deg);
}

.gramkit-icon {
  background: var(--primary-soft);
  border: 1.5px solid var(--primary-mid);
  color: var(--primary);
}

.toolbox-icon {
  background: rgba(20, 184, 166, 0.1);
  border: 1.5px solid rgba(20, 184, 166, 0.2);
  color: #14b8a6;
}

/* ─── Card body ─────────────────────────────────────── */
.card-body {
  flex: 1;
  min-width: 0;

  @media (max-width: 520px) {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
}

.card-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: -0.02em;

  @media (max-width: 520px) {
    font-size: 0.98rem;
    margin-bottom: 2px;
  }
}

.card-desc {
  font-size: 0.78rem;
  color: var(--text-sub);
  margin: 0;
  line-height: 1.5;

  @media (max-width: 520px) {
    font-size: 0.74rem;
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

  @media (max-width: 520px) {
    position: static;
    flex-shrink: 0;
    opacity: 0.6;
  }
}

/* ─── Tag badge ─────────────────────────────────────── */
.card-tag {
  position: absolute;
  bottom: 14px;
  right: 16px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  padding: 2px 8px;
  border-radius: 6px;

  [dir="rtl"] & {
    right: auto;
    left: 16px;
  }

  @media (max-width: 520px) {
    display: none;
  }
}
</style>
