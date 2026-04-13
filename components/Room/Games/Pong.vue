<template>
  <div class="pong-wrapper" ref="wrapperRef">
    <!-- ══════════════════ LOBBY ══════════════════ -->
    <div v-if="phase === 'lobby'" class="lobby-screen">
      <div class="lobby-bg">
        <div class="lb-net" />
        <div class="lb-paddle left" :style="{ top: demoLeftY + 'px' }" />
        <div class="lb-paddle right" :style="{ top: demoRightY + 'px' }" />
        <div
          class="lb-ball"
          :style="{ left: demoBallX + 'px', top: demoBallY + 'px' }"
        />
      </div>

      <div class="lobby-inner">
        <div class="lobby-icon">🏓</div>
        <h1 class="lobby-title">{{ $t("pong.title") }}</h1>
        <p class="lobby-sub">{{ $t("pong.subtitle") }}</p>

        <div class="score-display">
          <div class="score-side">
            <div class="score-name">{{ room.myName.value }}</div>
            <div class="score-num cyan">0</div>
          </div>
          <div class="score-divider">{{ $t("pong.lobby.vs") }}</div>
          <div class="score-side">
            <div class="score-name">{{ opponentName }}</div>
            <div class="score-num yellow">0</div>
          </div>
        </div>

        <div class="player-status">
          <div class="status-row" :class="{ ready: imReady }">
            <span class="status-dot" />
            <span class="status-name">{{ room.myName.value }}</span>
            <span class="status-label">{{
              imReady
                ? `✓ ${$t("pong.lobby.ready")}`
                : $t("pong.lobby.notReady")
            }}</span>
          </div>
          <div class="status-row" :class="{ ready: opponentReady }">
            <span class="status-dot" />
            <span class="status-name">{{ opponentName }}</span>
            <span class="status-label">{{
              opponentReady
                ? `✓ ${$t("pong.lobby.ready")}`
                : $t("pong.lobby.waitingDots")
            }}</span>
          </div>
        </div>

        <div v-if="countdown > 0" class="countdown-badge">
          {{ $t("pong.lobby.startingIn", { n: countdown }) }}
        </div>

        <div class="lobby-controls" v-if="!isMobile">
          <span class="ctrl-hint-item">
            <kbd>W</kbd><kbd>S</kbd> {{ $t("pong.lobby.ctrlOr") }} <kbd>↑</kbd
            ><kbd>↓</kbd> — {{ $t("pong.lobby.ctrlMove") }}
          </span>
        </div>

        <div class="lobby-actions">
          <button
            class="btn-ready"
            :class="{ active: imReady }"
            @click="toggleReady"
          >
            {{
              imReady
                ? `⚡ ${$t("pong.lobby.readyActive")}`
                : $t("pong.lobby.readyUp")
            }}
          </button>
          <button class="btn-back" @click="emit('exit')">
            ← {{ $t("common.back") }}
          </button>
        </div>

        <p class="lobby-hint">{{ $t("pong.lobby.hint") }}</p>
      </div>
    </div>

    <!-- ══════════════════ GAME ══════════════════ -->
    <div v-else-if="phase === 'playing'" class="game-screen">
      <canvas
        ref="canvasRef"
        class="game-canvas"
        :width="canvasW"
        :height="canvasH"
      />

      <!-- Score HUD overlay -->
      <div class="score-hud">
        <div class="hud-score cyan">{{ myScore }}</div>
        <div class="hud-label">
          {{ amHost ? room.myName.value : opponentName }}
        </div>
        <div class="hud-divider">:</div>
        <div class="hud-label">
          {{ amHost ? opponentName : room.myName.value }}
        </div>
        <div class="hud-score yellow">{{ oppScore }}</div>
      </div>

      <!-- Mobile controls -->
      <template v-if="isMobile">
        <div class="mobile-controls">
          <div
            class="mobile-half top"
            @touchstart.prevent="mobileUp = true"
            @touchend.prevent="mobileUp = false"
            @touchcancel.prevent="mobileUp = false"
          >
            <span class="mobile-arrow">▲</span>
          </div>
          <div
            class="mobile-half bottom"
            @touchstart.prevent="mobileDown = true"
            @touchend.prevent="mobileDown = false"
            @touchcancel.prevent="mobileDown = false"
          >
            <span class="mobile-arrow">▼</span>
          </div>
        </div>
      </template>
    </div>

    <!-- ══════════════════ RESULTS ══════════════════ -->
    <div v-else-if="phase === 'results'" class="results-screen">
      <div class="results-inner">
        <div class="res-icon">
          {{ winner === room.myName.value ? "🏆" : "😤" }}
        </div>
        <h2
          class="res-title"
          :class="winner === room.myName.value ? 'victory' : 'defeat'"
        >
          {{
            winner === room.myName.value
              ? $t("common.victory")
              : $t("common.defeated")
          }}
        </h2>
        <p class="res-sub">
          {{ $t("pong.results.winsMatch", { name: winner }) }}
        </p>
        <div class="res-scores">
          <div class="res-score-item">
            <span class="rs-name">{{ room.myName.value }}</span>
            <span class="rs-val cyan">{{ myScore }}</span>
          </div>
          <div class="res-score-item">
            <span class="rs-name">{{ opponentName }}</span>
            <span class="rs-val yellow">{{ oppScore }}</span>
          </div>
        </div>
        <div class="res-actions">
          <button class="btn-ready active" @click="backToLobby">
            ↩ {{ $t("pong.results.rematch") }}
          </button>
          <button class="btn-back" @click="emit('exit')">
            ← {{ $t("pong.results.backToGames") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { usePong } from "~/composables/usePong";

const props = defineProps({ room: { type: Object, required: true } });
const emit = defineEmits(["exit"]);

const wrapperRef = ref(null);
const canvasRef = ref(null);

const game = usePong(props.room, canvasRef, wrapperRef);
const {
  phase,
  isMobile,
  myScore,
  oppScore,
  winner,
  countdown,
  opponentName,
  opponentReady,
  imReady,
  canvasW,
  canvasH,
  amHost,
  mobileUp,
  mobileDown,
  toggleReady,
  backToLobby,
  mount,
  unmount,
} = game;

const demoLeftY = ref(80);
const demoRightY = ref(120);
const demoBallX = ref(160);
const demoBallY = ref(100);
let dvx = 1.8,
  dvy = 1.2;
let demoId = null;

const demoLoop = () => {
  demoBallX.value += dvx;
  demoBallY.value += dvy;
  if (demoBallX.value > 300 || demoBallX.value < 20) dvx *= -1;
  if (demoBallY.value > 180 || demoBallY.value < 10) dvy *= -1;
  demoLeftY.value += (demoBallY.value - 20 - demoLeftY.value) * 0.05;
  demoRightY.value += (demoBallY.value - 20 - demoRightY.value) * 0.04;
  demoId = requestAnimationFrame(demoLoop);
};

onMounted(() => {
  mount();
  demoId = requestAnimationFrame(demoLoop);
});
onUnmounted(() => {
  unmount();
  cancelAnimationFrame(demoId);
});
</script>

<style scoped lang="scss">
/* ── Theme tokens ─────────────────────────────────────────────────────────── */
.pong-wrapper {
  --g-bg: #04080f;
  --g-surface: #080e1a;
  --g-elevated: #0c1628;
  --g-border: #1e3a5f;
  --g-border-hi: #4fc3f7;
  --g-text: #e0f2ff;
  --g-text-sub: #546e7a;
  --g-text-dim: #1e3a5f;
  --g-accent: #4fc3f7;
  --g-accent2: #ffd54f;
  --g-tag-bg: #0d1e30;
  --g-tag-border: #1e3a5f;
}
:root:not(.dark) .pong-wrapper {
  --g-bg: var(--bg-page);
  --g-surface: var(--bg-surface);
  --g-elevated: var(--bg-elevated);
  --g-border: var(--border-color);
  --g-border-hi: var(--primary);
  --g-text: var(--text-primary);
  --g-text-sub: var(--text-sub);
  --g-text-dim: var(--text-muted);
  --g-accent: var(--primary);
  --g-accent2: var(--secondary);
  --g-tag-bg: var(--bg-elevated);
  --g-tag-border: var(--border-color);
}

/* ═══════════════════════════════════════════════════
   BASE
═══════════════════════════════════════════════════ */
.pong-wrapper {
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: var(--g-bg);
  display: flex;
  align-items: center;
  justify-content: center;

  position: relative;
  overflow: hidden;
  transition: background 0.3s;
}

/* ═══════════════════════════════════════════════════
   LOBBY
═══════════════════════════════════════════════════ */
.lobby-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.lobby-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0.1;
  pointer-events: none;
}
:root:not(.dark) .lobby-bg {
  opacity: 0.06;
}
.lb-net {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    var(--g-accent) 0px,
    var(--g-accent) 10px,
    transparent 10px,
    transparent 20px
  );
}
.lb-paddle {
  position: absolute;
  width: 12px;
  height: 60px;
  background: var(--g-accent);
  border-radius: 4px;
  transition: top 0.05s linear;
}
.lb-paddle.left {
  left: 40px;
}
.lb-paddle.right {
  right: 40px;
  background: var(--g-accent2);
}
.lb-ball {
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--g-text);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.lobby-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 24px 16px;
  max-width: 440px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.lobby-icon {
  font-size: 52px;
  animation: bounce 1.8s ease-in-out infinite;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
.lobby-title {
  font-size: clamp(36px, 8vw, 64px);
  color: var(--g-text);
  letter-spacing: 14px;
  margin: 0;
  font-weight: 900;
  text-shadow: 0 0 30px color-mix(in srgb, var(--g-accent) 38%, transparent);
}
.lobby-sub {
  font-size: 9px;
  color: color-mix(in srgb, var(--g-accent) 31%, transparent);
  letter-spacing: 5px;
  margin: -8px 0 0;
}
.score-display {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--g-surface);
  border: 1px solid var(--g-border);
  border-radius: 8px;
  padding: 12px 24px;
  width: 100%;
  justify-content: center;
}
.score-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}
.score-name {
  font-size: 9px;
  color: var(--g-text-sub);
  letter-spacing: 2px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.score-num {
  font-size: 32px;
  font-weight: 900;
}
.cyan {
  color: var(--g-accent);
  text-shadow: 0 0 16px color-mix(in srgb, var(--g-accent) 50%, transparent);
}
.yellow {
  color: var(--g-accent2);
  text-shadow: 0 0 16px color-mix(in srgb, var(--g-accent2) 50%, transparent);
}
.score-divider {
  font-size: 12px;
  color: var(--g-text-dim);
  letter-spacing: 2px;
}
.player-status {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--g-surface);
  border: 1px solid var(--g-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--g-text-sub);
  transition: border-color 0.2s;
}
.status-row.ready {
  border-color: color-mix(in srgb, var(--g-accent) 25%, transparent);
  color: var(--g-accent);
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--g-border);
  flex-shrink: 0;
  transition: background 0.2s;
}
.status-row.ready .status-dot {
  background: var(--g-accent);
  box-shadow: 0 0 8px var(--g-accent);
}
.status-name {
  flex: 1;
  font-weight: bold;
  text-align: left;
}
.status-label {
  font-size: 9px;
  letter-spacing: 1px;
}
.countdown-badge {
  font-size: 13px;
  color: var(--g-accent2);
  letter-spacing: 4px;
  animation: pulse 0.8s ease-in-out infinite alternate;
}
@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}
.lobby-controls {
  font-size: 10px;
  color: var(--g-text-dim);
}
.ctrl-hint-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
kbd {
  background: var(--g-tag-bg);
  border: 1px solid var(--g-tag-border);
  border-radius: 3px;
  padding: 1px 5px;

  font-size: 9px;
  color: var(--g-text-sub);
}
.lobby-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  width: 100%;
}
.btn-ready {
  padding: 11px 28px;
  background: var(--g-surface);
  border: 2px solid var(--g-accent);
  border-radius: 6px;
  color: var(--g-accent);

  font-size: 12px;
  font-weight: bold;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ready.active,
.btn-ready:hover {
  background: var(--g-accent);
  color: var(--g-bg);
}
.btn-back {
  padding: 11px 18px;
  background: transparent;
  border: 1.5px solid var(--g-border);
  border-radius: 6px;
  color: var(--g-text-sub);

  font-size: 11px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-back:hover {
  border-color: var(--g-text-sub);
  color: var(--g-text);
}
.lobby-hint {
  font-size: 9px;
  color: var(--g-text-dim);
  letter-spacing: 2px;
  margin: 0;
}

/* ═══════════════════════════════════════════════════
   GAME
═══════════════════════════════════════════════════ */
.game-screen {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #04080f;
}
.game-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border: 1px solid #0f2a44;
  border-radius: 4px;
  image-rendering: crisp-edges;
}
@media (max-width: 768px) {
  .game-canvas {
    width: 100vw !important;
    height: 100svh !important;
    max-height: unset;
    border: none;
    border-radius: 0;
  }
}
.score-hud {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: #04080fcc;
  border: 1px solid #1e3a5f;
  border-radius: 6px;
  padding: 4px 14px;
  pointer-events: none;
  white-space: nowrap;
}
.hud-score {
  font-size: 22px;
  font-weight: 900;
}
.hud-label {
  font-size: 9px;
  color: #546e7a;
  letter-spacing: 1px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hud-divider {
  font-size: 18px;
  color: #1e3a5f;
  font-weight: bold;
}
.mobile-controls {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  z-index: 10;
}
.mobile-half {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 16px;
  pointer-events: all;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}
.mobile-half.top {
  background: linear-gradient(to bottom, #4fc3f708, transparent);
}
.mobile-half.bottom {
  background: linear-gradient(to top, #4fc3f708, transparent);
}
.mobile-arrow {
  font-size: 28px;
  color: #4fc3f740;
  user-select: none;
}

/* ═══════════════════════════════════════════════════
   RESULTS
═══════════════════════════════════════════════════ */
.results-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    ellipse at 50% 30%,
    color-mix(in srgb, var(--g-bg) 80%, #0d1f2a) 0%,
    var(--g-bg) 70%
  );
}
.results-inner {
  text-align: center;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  width: 100%;
}
.res-icon {
  font-size: 64px;
  animation: bounce 1.6s ease-in-out infinite;
}
.res-title {
  font-size: clamp(28px, 6vw, 48px);
  letter-spacing: 8px;
  margin: 0;
  font-weight: 900;
}
.res-title.victory {
  color: var(--g-accent2);
  text-shadow: 0 0 30px color-mix(in srgb, var(--g-accent2) 50%, transparent);
}
.res-title.defeat {
  color: #ef5350;
  text-shadow: 0 0 30px #ef535060;
}
.res-sub {
  font-size: 11px;
  color: var(--g-text-sub);
  letter-spacing: 2px;
  margin: 0;
}
.res-scores {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.res-score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--g-surface);
  border: 1px solid var(--g-border);
  border-radius: 6px;
  padding: 10px 16px;
}
.rs-name {
  font-size: 12px;
  color: var(--g-text-sub);
  font-weight: bold;
}
.rs-val {
  font-size: 20px;
  font-weight: 900;
}
.res-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
