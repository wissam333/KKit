<template>
  <div class="games-lobby">
    <div class="bg-grid" />

    <div class="header">
      <h1 class="title">
        {{ $t("gameroom.title1")
        }}<span class="accent">{{ $t("gameroom.title2") }}</span>
      </h1>
      <p class="subtitle">{{ $t("gameroom.subtitle") }}</p>
    </div>

    <div class="game-cards">
      <!-- PONG -->
      <div class="game-card" @click="emit('select', 'pong')">
        <div class="card-bg pong-bg" />
        <div class="card-preview">
          <div class="pong-demo">
            <div class="pong-net" />
            <div class="pong-paddle left" />
            <div class="pong-ball" />
            <div class="pong-paddle right" />
          </div>
        </div>
        <div class="card-info">
          <div class="card-tag">{{ $t("gameroom.pong.tag") }}</div>
          <h2 class="card-title">{{ $t("gameroom.pong.title") }}</h2>
          <p class="card-desc">{{ $t("gameroom.pong.desc") }}</p>
          <div class="card-meta">
            <span class="meta-item"
              >🏓 {{ $t("gameroom.pong.meta.paddles") }}</span
            >
            <span class="meta-item"
              >⚡ {{ $t("gameroom.pong.meta.realtime") }}</span
            >
            <span class="meta-item"
              >🏆 {{ $t("gameroom.pong.meta.firstTo") }}</span
            >
          </div>
          <div class="card-cta">{{ $t("gameroom.pong.cta") }}</div>
        </div>
      </div>

      <!-- SKYACES -->
      <div class="game-card" @click="emit('select', 'skyaces')">
        <div class="card-bg sky-bg" />
        <div class="card-preview">
          <div class="sky-demo">
            <div
              class="sky-star"
              v-for="i in 12"
              :key="i"
              :style="starStyle(i)"
            />
            <div class="sky-plane left-plane">✈</div>
            <div class="sky-plane right-plane">🛩</div>
            <div class="sky-bullet" />
          </div>
        </div>
        <div class="card-info">
          <div class="card-tag">{{ $t("gameroom.skyaces.tag") }}</div>
          <h2 class="card-title">{{ $t("gameroom.skyaces.title") }}</h2>
          <p class="card-desc">{{ $t("gameroom.skyaces.desc") }}</p>
          <div class="card-meta">
            <span class="meta-item"
              >🛩 {{ $t("gameroom.skyaces.meta.aircraft") }}</span
            >
            <span class="meta-item"
              >🤖 {{ $t("gameroom.skyaces.meta.ai") }}</span
            >
            <span class="meta-item"
              >⚡ {{ $t("gameroom.skyaces.meta.abilities") }}</span
            >
          </div>
          <div class="card-cta">{{ $t("gameroom.skyaces.cta") }}</div>
        </div>
      </div>
    </div>

    <p class="footer-hint">✦ {{ $t("gameroom.footer") }}</p>
  </div>
</template>

<script setup>
defineProps({ room: { type: Object, required: true } });
const emit = defineEmits(["select"]);

const starStyle = (i) => ({
  left: `${(i * 137.5) % 100}%`,
  top: `${(i * 61.3) % 80}%`,
  width: `${i % 3 === 0 ? 2 : 1}px`,
  height: `${i % 3 === 0 ? 2 : 1}px`,
  animationDelay: `${(i * 0.4) % 3}s`,
});
</script>

<style scoped lang="scss">
/* ── Theme tokens (game-specific layer on top of global theme) ── */
.games-lobby {
  --g-bg: #04080f;
  --g-surface: #080e1a;
  --g-elevated: #0c1628;
  --g-border: #1e3a5f;
  --g-border-hi: #4fc3f7;
  --g-text: #e0f2ff;
  --g-text-sub: #546e7a;
  --g-text-dim: #4fc3f750;
  --g-accent: #4fc3f7;
  --g-meta-bg: #0d1e30;
  --g-footer: #1e3a5f;
}
:root:not(.dark) .games-lobby {
  --g-bg: var(--bg-page);
  --g-surface: var(--bg-surface);
  --g-elevated: var(--bg-elevated);
  --g-border: var(--border-color);
  --g-border-hi: var(--primary);
  --g-text: var(--text-primary);
  --g-text-sub: var(--text-sub);
  --g-text-dim: var(--text-muted);
  --g-accent: var(--primary);
  --g-meta-bg: var(--bg-elevated);
  --g-footer: var(--border-color);
}
.games-lobby {
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: var(--g-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 24px 16px;
  position: relative;
  overflow: hidden;
  transition: background 0.3s;
}
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(#ffffff06 1px, transparent 1px),
    linear-gradient(90deg, #ffffff06 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  opacity: 0.5;
}
:root:not(.dark) .bg-grid {
  background-image:
    linear-gradient(#00000008 1px, transparent 1px),
    linear-gradient(90deg, #00000008 1px, transparent 1px);
}
.header {
  text-align: center;
}
.title {
  font-size: clamp(28px, 6vw, 52px);
  color: var(--g-text);
  letter-spacing: 10px;
  margin: 0;
  font-weight: 900;
  text-shadow: 0 0 40px color-mix(in srgb, var(--g-accent) 40%, transparent);
}
.accent {
  color: var(--g-accent);
}
.subtitle {
  font-size: 10px;
  color: var(--g-text-dim);
  letter-spacing: 6px;
  margin: 4px 0 0;
}
.game-cards {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 820px;
}
.game-card {
  position: relative;
  width: 340px;
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid var(--g-border);
  cursor: pointer;
  transition:
    transform 0.22s,
    border-color 0.22s,
    box-shadow 0.22s,
    background 0.3s;
  background: var(--g-surface);
  flex-shrink: 0;
}
.game-card:hover {
  transform: translateY(-6px) scale(1.02);
  border-color: var(--g-border-hi);
  box-shadow:
    0 12px 48px color-mix(in srgb, var(--g-accent) 13%, transparent),
    0 0 0 1px color-mix(in srgb, var(--g-accent) 19%, transparent);
}
.card-bg {
  position: absolute;
  inset: 0;
  opacity: 0.06;
  pointer-events: none;
}
.pong-bg {
  background: radial-gradient(circle at 50% 50%, #4fc3f7, transparent 70%);
}
.sky-bg {
  background: radial-gradient(circle at 50% 30%, #e05a00, transparent 70%);
}
.card-preview {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--g-border);
  position: relative;
  overflow: hidden;
}
.pong-demo {
  width: 220px;
  height: 110px;
  border: 1.5px solid color-mix(in srgb, var(--g-accent) 19%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--g-bg) 80%, transparent);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pong-net {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: repeating-linear-gradient(
    to bottom,
    color-mix(in srgb, var(--g-accent) 25%, transparent) 0px,
    color-mix(in srgb, var(--g-accent) 25%, transparent) 6px,
    transparent 6px,
    transparent 12px
  );
}
.pong-paddle {
  position: absolute;
  width: 8px;
  height: 36px;
  background: var(--g-accent);
  border-radius: 3px;
  box-shadow: 0 0 12px color-mix(in srgb, var(--g-accent) 67%, transparent);
  animation: paddleBob 1.4s ease-in-out infinite alternate;
}
.pong-paddle.left {
  left: 10px;
}
.pong-paddle.right {
  right: 10px;
  animation-direction: alternate-reverse;
}
.pong-ball {
  width: 10px;
  height: 10px;
  background: var(--g-text);
  border-radius: 50%;
  box-shadow: 0 0 10px color-mix(in srgb, var(--g-text) 80%, transparent);
  animation: ballBounce 1.1s linear infinite alternate;
}
@keyframes paddleBob {
  0% {
    transform: translateY(-18px);
  }
  100% {
    transform: translateY(18px);
  }
}
@keyframes ballBounce {
  0% {
    transform: translate(-60px, -20px);
  }
  100% {
    transform: translate(60px, 22px);
  }
}
.sky-demo {
  width: 220px;
  height: 110px;
  background: linear-gradient(180deg, #04080f 0%, #0d1f3c 60%, #1a4a6e 100%);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  border: 1.5px solid #1e3a5f;
}
.sky-star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  animation: twinkle 2s ease-in-out infinite alternate;
}
@keyframes twinkle {
  0% {
    opacity: 0.2;
  }
  100% {
    opacity: 0.9;
  }
}
.sky-plane {
  position: absolute;
  font-size: 22px;
  filter: drop-shadow(0 0 8px #4fc3f7cc);
  animation: planeFly 2.2s ease-in-out infinite alternate;
}
.left-plane {
  left: 18px;
  top: 38px;
}
.right-plane {
  right: 18px;
  top: 42px;
  animation-direction: alternate-reverse;
}
.sky-bullet {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 3px;
  background: #ffeb3b;
  border-radius: 2px;
  box-shadow: 0 0 8px #ffeb3b;
  animation: bulletZip 0.9s linear infinite;
}
@keyframes planeFly {
  0% {
    transform: translateY(-8px) rotate(-4deg);
  }
  100% {
    transform: translateY(8px) rotate(4deg);
  }
}
@keyframes bulletZip {
  0% {
    transform: translate(-80px, -50%);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(80px, -50%);
    opacity: 0;
  }
}
.card-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card-tag {
  font-size: 8px;
  color: var(--g-text-dim);
  letter-spacing: 4px;
}
.card-title {
  font-size: 26px;
  color: var(--g-text);
  letter-spacing: 6px;
  margin: 0;
  font-weight: 900;
  text-shadow: 0 0 20px color-mix(in srgb, var(--g-accent) 25%, transparent);
}
.card-desc {
  font-size: 10px;
  color: var(--g-text-sub);
  line-height: 1.6;
  margin: 0;
}
.card-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.meta-item {
  font-size: 9px;
  color: var(--g-text-sub);
  background: var(--g-meta-bg);
  border: 1px solid var(--g-border);
  border-radius: 3px;
  padding: 2px 7px;
  letter-spacing: 1px;
}
.card-cta {
  margin-top: 4px;
  font-size: 11px;
  font-weight: bold;
  color: var(--g-accent);
  letter-spacing: 3px;
  transition: letter-spacing 0.2s;
}
.game-card:hover .card-cta {
  letter-spacing: 5px;
}
.footer-hint {
  font-size: 9px;
  color: var(--g-footer);
  letter-spacing: 3px;
}
@media (max-width: 720px) {
  .game-cards {
    flex-direction: column;
    align-items: center;
  }
  .game-card {
    width: 100%;
    max-width: 380px;
  }
}
</style>
