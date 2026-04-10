<template>
  <div class="game-wrapper" ref="wrapperRef">
    <!-- ══════════════════ LOBBY ══════════════════ -->
    <div v-if="phase === 'lobby'" class="lobby-screen">
      <!-- Animated sky background particles -->
      <div class="lobby-bg">
        <div
          v-for="i in 20"
          :key="i"
          class="star-particle"
          :style="starStyle(i)"
        />
      </div>

      <div class="lobby-inner">
        <div class="ww1-emblem">✈</div>
        <h1 class="game-title">SKY<span class="title-accent">ACES</span></h1>
        <p class="game-sub">WW1 AERIAL COMBAT · MULTIPLAYER</p>

        <!-- Plane picker -->
        <div class="section-block">
          <p class="section-label">◈ CHOOSE YOUR AIRCRAFT ◈</p>
          <div class="plane-grid">
            <button
              v-for="p in planeTypes"
              :key="p.id"
              class="plane-card"
              :class="{ selected: chosenPlane === p.id }"
              :style="chosenPlane === p.id ? `--accent: ${p.color}` : ''"
              @click="chosenPlane = p.id"
            >
              <span class="pc-icon">{{ p.icon }}</span>
              <span class="pc-name">{{ p.name }}</span>
              <div class="pc-stats">
                <div class="stat-bar-row">
                  <span class="stat-lbl">SPD</span>
                  <div class="stat-bar">
                    <div
                      class="stat-fill"
                      :style="{
                        width: (p.speed / 5.5) * 100 + '%',
                        background: p.color,
                      }"
                    />
                  </div>
                </div>
                <div class="stat-bar-row">
                  <span class="stat-lbl">HP</span>
                  <div class="stat-bar">
                    <div
                      class="stat-fill"
                      :style="{
                        width: (p.hp / 110) * 100 + '%',
                        background: p.color,
                      }"
                    />
                  </div>
                </div>
              </div>
              <div class="pc-ability">
                <span class="ability-tag">
                  {{ abilityLabel(p.ability) }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- Pilot list -->
        <div class="section-block">
          <p class="section-label">
            ◈ HANGAR ({{ lobbyPlayers.length + 1 }}) ◈
          </p>
          <div class="pilot-list">
            <div class="pilot-entry me">
              <span class="pilot-icon">{{ myPlaneIcon }}</span>
              <span class="pilot-name">{{ room.myName.value }}</span>
              <span class="pilot-plane">{{ myPlaneData.name }}</span>
              <span v-if="imReady" class="status-ready">✓ READY</span>
              <span v-else class="status-wait">○ WAITING</span>
            </div>
            <div
              v-for="lp in lobbyPlayers"
              :key="lp.peerId"
              class="pilot-entry"
            >
              <span class="pilot-icon">{{ lp.planeIcon || "✈" }}</span>
              <span class="pilot-name">{{ lp.name }}</span>
              <span class="pilot-plane">{{ planeName(lp.planeId) }}</span>
              <span v-if="lp.ready" class="status-ready">✓ READY</span>
              <span v-else class="status-wait">… PICKING</span>
            </div>
          </div>
        </div>

        <!-- Controls hint -->
        <div class="controls-hint">
          <div class="ctrl-row">
            <kbd>W A S D</kbd><span>or</span><kbd>↑ ← ↓ →</kbd><span>fly</span>
            <kbd>SPACE</kbd><span>fire</span> <kbd>E</kbd><span>ability</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="lobby-actions">
          <button
            class="btn-ready"
            :class="{ active: imReady }"
            @click="toggleReady"
          >
            <span class="btn-inner">{{
              imReady ? "⚡ READY!" : "READY UP"
            }}</span>
          </button>
          <button v-if="canStartSolo" class="btn-solo" @click="startSolo">
            🛩 FLY SOLO
          </button>
        </div>

        <p class="lobby-hint">All pilots ready → countdown begins</p>
      </div>
    </div>

    <!-- ══════════════════ GAME ══════════════════ -->
    <div
      v-else-if="phase === 'playing' || phase === 'ending'"
      class="game-screen"
    >
      <canvas
        ref="canvasRef"
        class="game-canvas"
        :width="canvasW"
        :height="canvasH"
      />

      <!-- HUD -->
      <div class="hud">
        <!-- Left: HP + Ammo + Ability -->
        <div class="hud-left">
          <div class="hud-row">
            <span class="hud-lbl">HP</span>
            <div class="bar-outer">
              <div
                class="bar-inner"
                :style="{ width: myHpPct + '%', background: hpColor }"
              />
            </div>
            <span class="bar-num" :style="{ color: hpColor }">{{ myHp }}</span>
          </div>
          <div class="hud-row">
            <span class="hud-lbl">AMM</span>
            <div class="bar-outer">
              <div
                class="bar-inner"
                :style="{
                  width: (myAmmo / 30) * 100 + '%',
                  background: '#ffd54f',
                }"
              />
            </div>
            <span class="bar-num" style="color: #ffd54f">{{ myAmmo }}</span>
          </div>

          <!-- Ability cooldown -->
          <div class="ability-hud" :class="{ ready: myAbilityCd === 0 }">
            <span class="ability-hud-key">E</span>
            <div class="ability-hud-label">
              {{ abilityLabel(myAbilityName) }}
            </div>
            <div class="ability-cd-bar">
              <div
                class="ability-cd-fill"
                :style="{
                  width:
                    myAbilityMax > 0
                      ? (1 - myAbilityCd / myAbilityMax) * 100 + '%'
                      : '100%',
                }"
              />
            </div>
            <span class="ability-cd-text" v-if="myAbilityCd > 0"
              >{{ Math.ceil(myAbilityCd / 60) }}s</span
            >
            <span class="ability-cd-text ready" v-else>RDY!</span>
          </div>
        </div>

        <!-- Center: Kills + Wave -->
        <div class="hud-center">
          <div class="kill-counter">
            <span class="kill-icon">✈</span>
            <span class="kill-num">{{ myKills }}</span>
            <span class="kill-lbl">KILLS</span>
          </div>
          <div class="wave-badge" v-if="wave > 1">WAVE {{ wave }}</div>
        </div>

        <!-- Right: Enemies -->
        <div class="hud-right">
          <div v-for="(ep, idx) in enemyHuds" :key="idx" class="enemy-hud-item">
            <span class="eh-name">{{ ep.name }}</span>
            <div class="bar-outer sm">
              <div class="bar-inner enemy" :style="{ width: ep.hpPct + '%' }" />
            </div>
          </div>
        </div>
      </div>

      <!-- Streak notification -->
      <transition name="streak">
        <div v-if="streakVisible" class="streak-banner">
          {{ streakText }}
        </div>
      </transition>

      <!-- Floating texts -->
      <div
        v-for="ft in floatingTexts"
        :key="ft.id"
        class="floating-text"
        :style="{
          left: ft.x + 'px',
          top: ft.y + 'px',
          color: ft.color,
          opacity: ft.life / 80,
        }"
      >
        {{ ft.text }}
      </div>

      <!-- Controls hint -->
      <div class="ctrl-hint">
        <span>{{
          isMobile
            ? "🕹 Tap to fly · Fire btn · E = ability"
            : "WASD/Arrows · SPACE fire · E ability"
        }}</span>
      </div>

      <!-- Mobile controls -->
      <div v-if="isMobile" class="mobile-ctrl">
        <div class="dpad">
          <button
            class="dpad-btn up"
            @touchstart.prevent="mobileKey('up', true)"
            @touchend.prevent="mobileKey('up', false)"
          >
            ▲
          </button>
          <button
            class="dpad-btn down"
            @touchstart.prevent="mobileKey('down', true)"
            @touchend.prevent="mobileKey('down', false)"
          >
            ▼
          </button>
          <button
            class="dpad-btn left"
            @touchstart.prevent="mobileKey('left', true)"
            @touchend.prevent="mobileKey('left', false)"
          >
            ◀
          </button>
          <button
            class="dpad-btn right"
            @touchstart.prevent="mobileKey('right', true)"
            @touchend.prevent="mobileKey('right', false)"
          >
            ▶
          </button>
        </div>
        <div class="mobile-right-btns">
          <button
            class="ability-btn"
            @touchstart.prevent="mobileKey('ability', true)"
            @touchend.prevent="mobileKey('ability', false)"
          >
            E
          </button>
          <button
            class="fire-btn"
            @touchstart.prevent="mobileKey('fire', true)"
            @touchend.prevent="mobileKey('fire', false)"
          >
            🔥
          </button>
        </div>
      </div>

      <!-- Kill feed -->
      <div class="kill-feed">
        <transition-group name="kf">
          <div v-for="kf in killFeed" :key="kf.id" class="kf-item">
            {{ kf.text }}
          </div>
        </transition-group>
      </div>
    </div>

    <!-- ══════════════════ RESULTS ══════════════════ -->
    <div v-if="phase === 'results'" class="results-screen">
      <div class="results-bg">
        <div
          v-for="i in 16"
          :key="i"
          class="res-particle"
          :style="resParticleStyle(i)"
        />
      </div>
      <div class="results-inner">
        <div class="res-trophy">
          {{ resultsWinner === room.myName.value ? "🏆" : "💀" }}
        </div>
        <h2
          class="res-title"
          :class="resultsWinner === room.myName.value ? 'victory' : 'defeat'"
        >
          {{ resultsWinner === room.myName.value ? "VICTORY!" : "DEFEATED" }}
        </h2>
        <p class="res-sub">{{ resultsWinner }} claims the skies!</p>

        <div class="scoreboard">
          <div class="sb-header">
            <span>RANK</span><span>PILOT</span><span>KILLS</span
            ><span>ASSISTS</span>
          </div>
          <div
            v-for="(p, idx) in sortedFinalScores"
            :key="idx"
            class="score-row"
            :class="{ winner: idx === 0, mine: p.name === room.myName.value }"
          >
            <span class="sr-rank">{{
              ["🥇", "🥈", "🥉"][idx] || `#${idx + 1}`
            }}</span>
            <span class="sr-name">{{ p.name }}</span>
            <span class="sr-kills">{{ p.kills }}</span>
            <span class="sr-assists">{{ p.assists || 0 }}</span>
          </div>
        </div>

        <button class="btn-ready active" @click="backToLobby">
          ↩ PLAY AGAIN
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ room: { type: Object, required: true } });

const wrapperRef = ref(null);
const canvasRef = ref(null);
const canvasW = ref(900);
const canvasH = ref(550);

const game = useSkymatch(props.room, canvasRef, canvasW, canvasH, wrapperRef);

const {
  phase,
  chosenPlane,
  imReady,
  lobbyPlayers,
  isMobile,
  killFeed,
  myKills,
  myHp,
  myAmmo,
  myAbilityCd,
  myAbilityMax,
  myAbilityName,
  resultsWinner,
  sortedFinalScores,
  streakText,
  streakVisible,
  floatingTexts,
  wave,
  myPlaneData,
  myPlaneIcon,
  myHpPct,
  hpColor,
  canStartSolo,
  enemyHuds,
  toggleReady,
  startSolo,
  backToLobby,
  mobileKey,
} = game;

onMounted(() => game.mount());
onUnmounted(() => game.unmount());

// ── Helpers ───────────────────────────────────────────────────────────────────
const abilityLabel = (id) =>
  ({
    roll: "🔄 BARREL ROLL",
    burst: "🔴 BURST FIRE",
    boost: "⚡ SPEED BOOST",
    repair: "💚 FIELD REPAIR",
  })[id] || "—";

const planeName = (id) => planeTypes.find((p) => p.id === id)?.name || id;

const starStyle = (i) => ({
  left: `${(i * 137.5) % 100}%`,
  top: `${(i * 37.3) % 100}%`,
  animationDelay: `${(i * 0.37) % 3}s`,
  width: `${i % 3 === 0 ? 2 : 1}px`,
  height: `${i % 3 === 0 ? 2 : 1}px`,
});

const resParticleStyle = (i) => ({
  left: `${(i * 97.5) % 100}%`,
  top: `${(i * 53.3) % 100}%`,
  animationDelay: `${(i * 0.25) % 2}s`,
  fontSize: `${14 + (i % 3) * 6}px`,
  opacity: 0.15 + (i % 4) * 0.07,
});
</script>

<style scoped>
/* ── Base ─────────────────────────────────────────────────────────────────── */
.game-wrapper {
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: #04080f;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  font-family: "Courier New", monospace;
}

/* ══════════════════════════════════════════════════════════════════════════════
   LOBBY
══════════════════════════════════════════════════════════════════════════════ */
.lobby-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 0%, #0d2a50 0%, #04080f 65%);
  position: relative;
  overflow: hidden;
}

/* Animated star particles */
.lobby-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.star-particle {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  animation: twinkle 3s ease-in-out infinite alternate;
}
@keyframes twinkle {
  0% {
    opacity: 0.15;
    transform: scale(1);
  }
  100% {
    opacity: 0.85;
    transform: scale(1.8);
  }
}

.lobby-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 24px 16px;
  max-width: 560px;
  width: 100%;
}

.ww1-emblem {
  font-size: 54px;
  filter: drop-shadow(0 0 22px #4fc3f7cc);
  animation: float 3.2s ease-in-out infinite;
  display: block;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(-6deg);
  }
  50% {
    transform: translateY(-12px) rotate(6deg);
  }
}

.game-title {
  font-size: clamp(30px, 7vw, 56px);
  color: #e0f2ff;
  letter-spacing: 12px;
  margin: 6px 0 0;
  text-shadow:
    0 0 30px #4fc3f7aa,
    0 0 60px #4fc3f740;
  font-weight: 900;
}
.title-accent {
  color: #4fc3f7;
}

.game-sub {
  font-size: 10px;
  color: #546e7a;
  letter-spacing: 4px;
  margin: 3px 0 22px;
  text-transform: uppercase;
}

/* Sections */
.section-block {
  margin-bottom: 16px;
}
.section-label {
  font-size: 9px;
  color: #4fc3f780;
  letter-spacing: 4px;
  margin-bottom: 10px;
  text-transform: uppercase;
}

/* Plane grid */
.plane-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.plane-card {
  background: #080e1a;
  border: 1.5px solid #1e3a5f;
  border-radius: 8px;
  padding: 10px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  color: #546e7a;
  position: relative;
  overflow: hidden;
}
.plane-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    transparent 60%,
    var(--accent, #4fc3f7) 18 100%
  );
  opacity: 0;
  transition: opacity 0.2s;
}
.plane-card:hover {
  border-color: #4fc3f760;
  background: #0c1628;
  color: #90a4ae;
}
.plane-card.selected {
  border-color: var(--accent, #4fc3f7);
  background: #0c1628;
  color: #e0f2ff;
  box-shadow:
    0 0 14px var(--accent, #4fc3f7) 44,
    inset 0 0 14px var(--accent, #4fc3f7) 0a;
}
.plane-card.selected::before {
  opacity: 1;
}

.pc-icon {
  font-size: 24px;
}
.pc-name {
  font-size: 10px;
  font-weight: bold;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.pc-stats {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.stat-bar-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.stat-lbl {
  font-size: 8px;
  color: #455a64;
  width: 20px;
  text-align: left;
}
.stat-bar {
  flex: 1;
  height: 4px;
  background: #0d1e30;
  border-radius: 2px;
  overflow: hidden;
}
.stat-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.pc-ability {
  margin-top: 2px;
}
.ability-tag {
  font-size: 8px;
  letter-spacing: 1px;
  background: #0d1e30;
  border: 1px solid #1e3a5f;
  padding: 2px 6px;
  border-radius: 3px;
  color: #607d8b;
}
.plane-card.selected .ability-tag {
  border-color: var(--accent, #4fc3f7) 66;
  color: #90a4ae;
}

/* Pilot list */
.pilot-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pilot-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #080e1a;
  border: 1px solid #1a3050;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 11px;
  color: #78909c;
}
.pilot-entry.me {
  border-color: #4fc3f740;
  color: #4fc3f7;
}
.pilot-icon {
  font-size: 17px;
}
.pilot-name {
  flex: 1;
  text-align: left;
  font-weight: bold;
}
.pilot-plane {
  font-size: 9px;
  color: #455a64;
  letter-spacing: 1px;
}
.status-ready {
  color: #66bb6a;
  font-weight: bold;
  font-size: 10px;
  letter-spacing: 1px;
}
.status-wait {
  color: #455a64;
  font-size: 10px;
  letter-spacing: 1px;
}

/* Controls hint in lobby */
.controls-hint {
  margin: 10px 0 14px;
  padding: 8px 14px;
  background: #080e1a;
  border: 1px solid #1a3050;
  border-radius: 6px;
}
.ctrl-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 10px;
  color: #455a64;
}
kbd {
  background: #0d1e30;
  border: 1px solid #2a4a70;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: "Courier New", monospace;
  font-size: 9px;
  color: #78909c;
  letter-spacing: 1px;
}

/* Lobby actions */
.lobby-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 10px;
}

.btn-ready {
  padding: 11px 30px;
  background: #0c1f3a;
  border: 2px solid #4fc3f7;
  border-radius: 6px;
  color: #4fc3f7;
  font-family: "Courier New", monospace;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.btn-ready::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  transition: transform 0.2s;
}
.btn-inner {
  position: relative;
  z-index: 1;
}
.btn-ready:hover::after,
.btn-ready.active::after {
  transform: translateX(0);
}
.btn-ready:hover .btn-inner,
.btn-ready.active .btn-inner {
  color: #04080f;
}

.btn-solo {
  padding: 11px 18px;
  background: #0a1a0a;
  border: 2px solid #66bb6a;
  border-radius: 6px;
  color: #66bb6a;
  font-family: "Courier New", monospace;
  font-size: 11px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-solo:hover {
  background: #66bb6a;
  color: #04080f;
}

.lobby-hint {
  font-size: 10px;
  color: #2a3a4a;
  letter-spacing: 2px;
}

/* ══════════════════════════════════════════════════════════════════════════════
   GAME SCREEN
══════════════════════════════════════════════════════════════════════════════ */
.game-screen {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-canvas {
  display: block;
  max-width: 100%;
  border: 1px solid #0f2a44;
  border-radius: 4px;
  image-rendering: crisp-edges;
}

/* HUD ─────────────────────────────────────────────────────────────────────── */
.hud {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  pointer-events: none;
}

.hud-left {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 155px;
}

.hud-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.hud-lbl {
  font-size: 8px;
  letter-spacing: 2px;
  color: #455a64;
  width: 28px;
  text-align: right;
}
.bar-outer {
  flex: 1;
  height: 7px;
  background: #080e1a;
  border: 1px solid #1a3050;
  border-radius: 2px;
  overflow: hidden;
}
.bar-outer.sm {
  height: 5px;
}
.bar-inner {
  height: 100%;
  border-radius: 2px;
  transition:
    width 0.25s,
    background 0.35s;
}
.bar-inner.enemy {
  background: #ef5350;
}
.bar-num {
  font-size: 10px;
  color: #cfd8dc;
  min-width: 22px;
}

/* Ability HUD */
.ability-hud {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #080e1a;
  border: 1px solid #1a3050;
  border-radius: 4px;
  padding: 4px 6px;
  opacity: 0.7;
  transition: opacity 0.3s;
}
.ability-hud.ready {
  opacity: 1;
  border-color: #ffd54f44;
}
.ability-hud-key {
  background: #0d1e30;
  border: 1px solid #2a4a70;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 9px;
  color: #ffd54f;
  font-weight: bold;
}
.ability-hud-label {
  font-size: 8px;
  color: #607d8b;
  letter-spacing: 1px;
  flex: 1;
}
.ability-cd-bar {
  width: 36px;
  height: 4px;
  background: #0d1e30;
  border-radius: 2px;
  overflow: hidden;
}
.ability-cd-fill {
  height: 100%;
  background: #ffd54f;
  border-radius: 2px;
  transition: width 0.1s;
}
.ability-cd-text {
  font-size: 8px;
  color: #607d8b;
  min-width: 18px;
  text-align: right;
}
.ability-cd-text.ready {
  color: #ffd54f;
  font-weight: bold;
}

.hud-center {
  flex: 1;
  text-align: center;
}
.kill-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.kill-icon {
  font-size: 14px;
}
.kill-num {
  font-size: 20px;
  color: #ffeb3b;
  font-weight: bold;
  text-shadow: 0 0 12px #ffeb3b80;
}
.kill-lbl {
  font-size: 9px;
  color: #607d8b;
  letter-spacing: 3px;
}
.wave-badge {
  font-size: 9px;
  color: #4fc3f7;
  letter-spacing: 3px;
  border: 1px solid #4fc3f730;
  border-radius: 3px;
  padding: 2px 8px;
  display: inline-block;
  margin-top: 3px;
}

.hud-right {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100px;
}
.enemy-hud-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.eh-name {
  font-size: 9px;
  color: #ef9a9a;
  min-width: 55px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Streak banner */
.streak-banner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(20px, 4vw, 32px);
  font-weight: 900;
  color: #ffeb3b;
  letter-spacing: 6px;
  text-shadow:
    0 0 30px #ffeb3b,
    0 0 60px #ff6d00;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}
.streak-enter-active {
  animation: streakIn 0.35s ease-out;
}
.streak-leave-active {
  animation: streakOut 0.5s ease-in;
}
@keyframes streakIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
@keyframes streakOut {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -60%) scale(0.8);
  }
}

/* Floating texts */
.floating-text {
  position: absolute;
  pointer-events: none;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 2px;
  transform: translateX(-50%);
  text-shadow: 0 0 8px currentColor;
  z-index: 5;
  white-space: nowrap;
  transition: opacity 0.1s;
}

/* Controls hint */
.ctrl-hint {
  position: absolute;
  bottom: 46px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: #2a3a4a;
  letter-spacing: 1px;
  pointer-events: none;
  white-space: nowrap;
}

/* Kill feed */
.kill-feed {
  position: absolute;
  top: 55px;
  right: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  pointer-events: none;
}
.kf-item {
  background: #04080fcc;
  border-left: 2px solid #ef5350;
  padding: 3px 8px;
  font-size: 10px;
  color: #ffcdd2;
  border-radius: 2px;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
}
.kf-enter-active,
.kf-leave-active {
  transition: all 0.3s;
}
.kf-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.kf-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

/* Mobile controls */
.mobile-ctrl {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 14px;
  align-items: flex-end;
}
.dpad {
  position: relative;
  width: 96px;
  height: 96px;
}
.dpad-btn {
  position: absolute;
  width: 32px;
  height: 32px;
  background: #0c1f3a;
  border: 1px solid #4fc3f7;
  border-radius: 5px;
  color: #4fc3f7;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: none;
}
.dpad-btn.up {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}
.dpad-btn.down {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}
.dpad-btn.left {
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}
.dpad-btn.right {
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.mobile-right-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.ability-btn {
  width: 42px;
  height: 42px;
  background: #1a1800;
  border: 2px solid #ffd54f;
  border-radius: 8px;
  color: #ffd54f;
  font-family: "Courier New", monospace;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: none;
}

.fire-btn {
  width: 58px;
  height: 58px;
  background: #1a0808;
  border: 2px solid #ef5350;
  border-radius: 50%;
  color: #fff;
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: none;
  box-shadow: 0 0 18px #ef535055;
}

/* ══════════════════════════════════════════════════════════════════════════════
   RESULTS
══════════════════════════════════════════════════════════════════════════════ */
.results-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 30%, #0d1f12 0%, #04080f 70%);
  overflow: hidden;
}

.results-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.res-particle {
  position: absolute;
  animation: resFloat 4s ease-in-out infinite alternate;
}
@keyframes resFloat {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  100% {
    transform: translateY(-20px) rotate(15deg);
  }
}

.results-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 24px 16px;
  max-width: 400px;
  width: 100%;
}
.res-trophy {
  font-size: 60px;
  animation: float 2s ease-in-out infinite;
  display: block;
}
.res-title {
  font-size: clamp(28px, 6vw, 48px);
  letter-spacing: 8px;
  margin: 8px 0 4px;
  font-weight: 900;
}
.res-title.victory {
  color: #ffd54f;
  text-shadow: 0 0 30px #ffd54faa;
}
.res-title.defeat {
  color: #ef5350;
  text-shadow: 0 0 30px #ef535088;
}
.res-sub {
  font-size: 11px;
  color: #546e7a;
  letter-spacing: 2px;
  margin-bottom: 20px;
}

.scoreboard {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sb-header {
  display: grid;
  grid-template-columns: 32px 1fr 48px 60px;
  gap: 8px;
  font-size: 8px;
  color: #37474f;
  letter-spacing: 2px;
  padding: 0 10px;
  text-transform: uppercase;
}
.score-row {
  display: grid;
  grid-template-columns: 32px 1fr 48px 60px;
  gap: 8px;
  align-items: center;
  background: #080e1a;
  border: 1px solid #1a3050;
  border-radius: 5px;
  padding: 8px 10px;
  font-size: 12px;
  color: #78909c;
}
.score-row.winner {
  border-color: #ffd54f44;
  color: #ffd54f;
}
.score-row.mine {
  border-color: #4fc3f740;
}
.sr-rank {
  font-size: 16px;
  text-align: center;
}
.sr-name {
  text-align: left;
  font-weight: bold;
}
.sr-kills {
  text-align: center;
  font-weight: bold;
}
.sr-assists {
  text-align: center;
  color: #546e7a;
  font-size: 11px;
}
.score-row.winner .sr-kills {
  color: #ffd54f;
}
</style>
