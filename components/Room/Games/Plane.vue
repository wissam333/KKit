<template>
  <div class="game-wrapper" ref="wrapperRef">
    <!-- ══════════════════ LOBBY ══════════════════ -->
    <div v-if="phase === 'lobby'" class="lobby-screen">
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
                <span class="ability-tag">{{ abilityLabel(p.ability) }}</span>
              </div>
            </button>
          </div>
        </div>

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

        <div class="controls-hint" v-if="!isMobile">
          <div class="ctrl-row">
            <kbd>W A S D</kbd><span>or</span><kbd>↑ ← ↓ →</kbd><span>fly</span>
            <kbd>SPACE</kbd><span>fire</span> <kbd>E</kbd><span>ability</span>
          </div>
        </div>

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

        <button
          v-if="isMobile"
          class="btn-fullscreen-lobby"
          @click="toggle(wrapperRef)"
        >
          {{ isFullscreen ? "✕ EXIT FULLSCREEN" : "⛶ FULLSCREEN + LANDSCAPE" }}
        </button>

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
                class="bar-inner ammo"
                :style="{ width: (myAmmo / 30) * 100 + '%' }"
              />
            </div>
            <span class="bar-num ammo-num">{{ myAmmo }}</span>
          </div>
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

        <div class="hud-center">
          <div class="kill-counter">
            <span class="kill-icon">✈</span>
            <span class="kill-num">{{ myKills }}</span>
            <span class="kill-lbl">KILLS</span>
          </div>
          <div class="wave-badge" v-if="wave > 1">WAVE {{ wave }}</div>
        </div>

        <div class="hud-right">
          <div v-for="(ep, idx) in enemyHuds" :key="idx" class="enemy-hud-item">
            <span class="eh-name">{{ ep.name }}</span>
            <div class="bar-outer sm">
              <div class="bar-inner enemy" :style="{ width: ep.hpPct + '%' }" />
            </div>
          </div>
          <button
            class="hud-fs-btn"
            @click="toggle(wrapperRef)"
            :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          >
            <span class="hud-fs-icon">{{ isFullscreen ? "⊡" : "⛶" }}</span>
            <span class="hud-fs-lbl">{{ isFullscreen ? "EXIT" : "FULL" }}</span>
          </button>
        </div>
      </div>

      <!-- Streak notification -->
      <transition name="streak">
        <div v-if="streakVisible" class="streak-banner">{{ streakText }}</div>
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

      <div class="ctrl-hint" v-if="!isMobile">
        WASD/Arrows · SPACE fire · E ability
      </div>

      <!-- ═══════════════════════════════════════════
           MOBILE GAMEPAD
      ═══════════════════════════════════════════ -->
      <template v-if="isMobile">
        <div class="portrait-nudge" v-if="isPortrait">
          <span>↻ Rotate for best experience</span>
        </div>

        <!--
          JOYSTICK ZONE
          Covers left 50%, bottom 55%.
          Touch events are on this zone; we track touch ID so
          fire/ability buttons on the right never confuse it.
        -->
        <div
          class="joystick-zone"
          @touchstart.prevent="jsStart"
          @touchmove.prevent="jsMove"
          @touchend.prevent="jsEnd"
          @touchcancel.prevent="jsEnd"
        >
          <!-- Idle hint: visible only when no touch active -->
          <transition name="fade-hint">
            <div class="js-idle-hint" v-if="!jsActive">
              <div class="js-idle-ring" />
              <span class="js-idle-label">STEER</span>
            </div>
          </transition>

          <!--
            Floating joystick base: snaps to where thumb lands.
            Always rendered; opacity driven by jsActive so there's
            no flash / invisible-element issue.
          -->
          <div class="js-base" :style="jsBaseStyle">
            <div class="js-ring" />
            <div class="js-cardinal js-up">▲</div>
            <div class="js-cardinal js-down">▼</div>
            <div class="js-cardinal js-left">◀</div>
            <div class="js-cardinal js-right">▶</div>
            <!-- Knob: position driven by jsDelta -->
            <div class="js-knob" :style="jsKnobStyle" />
            <!-- Direction indicator arc -->
            <div
              class="js-direction-arc"
              :style="jsDirectionArcStyle"
              v-if="jsActive && jsMoving"
            />
          </div>
        </div>

        <!-- Right action zone -->
        <div class="action-zone">
          <button
            class="btn-ability"
            :class="{ 'btn-ability--ready': myAbilityCd === 0 }"
            @touchstart.prevent="mobileKey('ability', true)"
            @touchend.prevent="mobileKey('ability', false)"
            @touchcancel.prevent="mobileKey('ability', false)"
          >
            <span class="btn-ability__icon">⚡</span>
            <span class="btn-ability__label">{{
              abilityLabel(myAbilityName).split(" ").slice(1).join(" ")
            }}</span>
            <span class="btn-ability__cd" v-if="myAbilityCd > 0"
              >{{ Math.ceil(myAbilityCd / 60) }}s</span
            >
            <span class="btn-ability__cd btn-ability__cd--ready" v-else
              >RDY</span
            >
            <svg class="btn-ability__arc" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" class="arc-track" />
              <circle
                cx="28"
                cy="28"
                r="24"
                class="arc-fill"
                :style="{
                  strokeDashoffset:
                    myAbilityMax > 0 ? 150.8 * (myAbilityCd / myAbilityMax) : 0,
                }"
              />
            </svg>
          </button>

          <button
            class="btn-fire"
            @touchstart.prevent="mobileKey('fire', true)"
            @touchend.prevent="mobileKey('fire', false)"
            @touchcancel.prevent="mobileKey('fire', false)"
          >
            <span class="btn-fire__icon">🔥</span>
            <span class="btn-fire__label">FIRE</span>
          </button>
        </div>
      </template>

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
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useFullscreen } from "~/composables/useFullscreen";

const props = defineProps({ room: { type: Object, required: true } });

const wrapperRef = ref(null);
const canvasRef = ref(null);
const canvasW = ref(900);
const canvasH = ref(550);

// ── Fullscreen ────────────────────────────────────────────────────────────────
const {
  isFullscreen,
  toggle,
  mount: fsMount,
  unmount: fsUnmount,
} = useFullscreen();

// ── Game engine ───────────────────────────────────────────────────────────────
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
  planeTypes,
} = game;

// ── Portrait detection ────────────────────────────────────────────────────────
const isPortrait = ref(false);
const checkOrientation = () => {
  isPortrait.value = window.innerHeight > window.innerWidth;
};

const JOYSTICK_RADIUS = 56; // max knob travel in px
const DEADZONE = 12; // ignore tiny movements

const jsActive = ref(false);
const jsMoving = ref(false); // true once thumb moves beyond deadzone
const jsTouchId = ref(null); // locked touch identifier
const jsOriginClient = ref({ x: 0, y: 0 }); // origin in CLIENT (viewport) coords
const jsOriginZone = ref({ x: 0, y: 0 }); // origin relative to zone element
const jsDelta = ref({ x: 0, y: 0 }); // clamped knob offset in px
const jsAngle = ref(0); // radians, for direction arc

// Base floats to where thumb landed (zone-relative for CSS positioning)
const jsBaseStyle = computed(() => ({
  position: "absolute",
  left: jsOriginZone.value.x + "px",
  top: jsOriginZone.value.y + "px",
  transform: "translate(-50%, -50%)",
  opacity: jsActive.value ? 1 : 0,
  // scale-in animation when thumb lands
  transition: jsActive.value ? "opacity 0.08s" : "opacity 0.18s",
}));

// Knob offsets from the base center
const jsKnobStyle = computed(() => ({
  transform: `translate(calc(-50% + ${jsDelta.value.x}px), calc(-50% + ${jsDelta.value.y}px))`,
}));

// Tiny wedge arc that shows the current thrust direction
const jsDirectionArcStyle = computed(() => ({
  transform: `translate(-50%, -50%) rotate(${jsAngle.value}rad)`,
  opacity: jsMoving.value ? 0.6 : 0,
}));

// ── Touch handlers ────────────────────────────────────────────────────────────

const jsStart = (e) => {
  // If already tracking a touch on the joystick, ignore new ones
  if (jsActive.value) return;

  const t = e.changedTouches[0];
  const rect = e.currentTarget.getBoundingClientRect();

  jsTouchId.value = t.identifier;
  jsOriginClient.value = { x: t.clientX, y: t.clientY };
  jsOriginZone.value = { x: t.clientX - rect.left, y: t.clientY - rect.top };
  jsActive.value = true;
  jsMoving.value = false;

  // Process the initial touch position (treat as if already moved)
  _jsUpdate(t);
};

const jsMove = (e) => {
  if (!jsActive.value) return;

  // Find the touch we're tracking by ID
  const t = Array.from(e.changedTouches).find(
    (t) => t.identifier === jsTouchId.value,
  );
  if (!t) return;

  _jsUpdate(t);
};

const _jsRelease = () => {
  jsActive.value = false;
  jsMoving.value = false;
  jsTouchId.value = null;
  jsDelta.value = { x: 0, y: 0 };
  game.mobileJoystick.value = { active: false, nx: 0, ny: 0 }; // ← replaces the 4x mobileKey calls
};

const jsEnd = (e) => {
  if (!jsActive.value) return;

  if (e.type === "touchcancel") {
    _jsRelease();
    return;
  }

  const released = Array.from(e.changedTouches).some(
    (t) => t.identifier === jsTouchId.value,
  );
  if (!released) return;

  _jsRelease();
};

const _jsUpdate = (touch) => {
  const rawX = touch.clientX - jsOriginClient.value.x;
  const rawY = touch.clientY - jsOriginClient.value.y;
  const dist = Math.hypot(rawX, rawY);

  const clamp = Math.min(dist, JOYSTICK_RADIUS);
  const angle = Math.atan2(rawY, rawX);

  jsAngle.value = angle;
  jsDelta.value = {
    x: Math.cos(angle) * clamp,
    y: Math.sin(angle) * clamp,
  };

  const active = dist > DEADZONE;
  jsMoving.value = active;

  // Normalised direction vector — sent directly to game engine
  const nx = dist > 1 ? rawX / dist : 0;
  const ny = dist > 1 ? rawY / dist : 0;

  // Feed into game engine (replaces the 4x mobileKey calls)
  game.mobileJoystick.value = { active, nx, ny };
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  game.mount();
  fsMount();
  checkOrientation();
  window.addEventListener("resize", checkOrientation);
  window.addEventListener("orientationchange", checkOrientation);
});

onUnmounted(() => {
  game.unmount();
  fsUnmount();
  window.removeEventListener("resize", checkOrientation);
  window.removeEventListener("orientationchange", checkOrientation);
});

// ── Template helpers ──────────────────────────────────────────────────────────
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
/* ═══════════════════════════════════════════════════════════
   BASE
═══════════════════════════════════════════════════════════ */
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
.game-wrapper:fullscreen,
.game-wrapper:-webkit-full-screen {
  width: 100vw !important;
  height: 100svh !important;
  min-height: unset;
}

/* ═══════════════════════════════════════════════════════════
   LOBBY
═══════════════════════════════════════════════════════════ */
.lobby-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 0%, #0d2a50 0%, #04080f 65%);
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}
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
  height: 100%;
}
.ww1-emblem {
  font-size: 54px;
  filter: drop-shadow(0 0 22px #4fc3f7cc);
  animation: floatPlane 3.2s ease-in-out infinite;
  display: block;
}
@keyframes floatPlane {
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
    var(--accent, #4fc3f7) 100%
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
.btn-fullscreen-lobby {
  display: block;
  width: 100%;
  margin: 10px 0 6px;
  padding: 11px;
  background: transparent;
  border: 1.5px dashed #4fc3f740;
  border-radius: 6px;
  color: #4fc3f770;
  font-family: "Courier New", monospace;
  font-size: 10px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-fullscreen-lobby:hover {
  border-color: #4fc3f7;
  color: #4fc3f7;
  background: #0c1628;
}
.lobby-hint {
  font-size: 10px;
  color: #2a3a4a;
  letter-spacing: 2px;
}

/* ═══════════════════════════════════════════════════════════
   GAME SCREEN
═══════════════════════════════════════════════════════════ */
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

/* ── HUD ────────────────────────────────────────────────── */
.hud {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  pointer-events: none;
  z-index: 10;
}
.hud-left {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 148px;
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
.bar-inner.ammo {
  background: #ffd54f;
}
.bar-inner.enemy {
  background: #ef5350;
}
.bar-num {
  font-size: 10px;
  color: #cfd8dc;
  min-width: 22px;
}
.ammo-num {
  color: #ffd54f;
}
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
@media (max-width: 768px) {
  .hud-left {
    min-width: 110px;
  }
  .ability-hud {
    display: none;
  }
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
  align-items: flex-end;
  min-width: 90px;
}
.enemy-hud-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.eh-name {
  font-size: 9px;
  color: #ef9a9a;
  min-width: 50px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hud-fs-btn {
  pointer-events: all;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 4px 7px;
  background: #04080fbb;
  border: 1px solid #1e3a5f;
  border-radius: 4px;
  color: #4fc3f760;
  font-family: "Courier New", monospace;
  cursor: pointer;
  transition: all 0.18s;
  line-height: 1;
  margin-top: 4px;
}
.hud-fs-icon {
  font-size: 15px;
}
.hud-fs-lbl {
  font-size: 7px;
  letter-spacing: 1px;
  color: #4fc3f750;
}
.hud-fs-btn:hover {
  border-color: #4fc3f7;
  color: #4fc3f7;
  background: #0c1628bb;
}
.hud-fs-btn:hover .hud-fs-lbl {
  color: #4fc3f7;
}

/* ── Streak / floating / hint ───────────────────────────── */
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
  z-index: 15;
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
.ctrl-hint {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: #2a3a4a;
  letter-spacing: 1px;
  pointer-events: none;
  white-space: nowrap;
}

/* ── Kill feed ──────────────────────────────────────────── */
.kill-feed {
  position: absolute;
  top: 52px;
  right: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  pointer-events: none;
  z-index: 8;
  max-width: 220px;
}
@media (max-width: 768px) {
  .kill-feed {
    top: 48px;
    right: 6px;
    max-width: 160px;
  }
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
.kf-enter-from,
.kf-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

/* ═══════════════════════════════════════════════════════════
   PORTRAIT NUDGE
═══════════════════════════════════════════════════════════ */
.portrait-nudge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #04080fee;
  z-index: 50;
  font-size: 13px;
  letter-spacing: 3px;
  color: #4fc3f7;
  pointer-events: none;
  text-align: center;
  padding: 20px;
}

/* ═══════════════════════════════════════════════════════════
   MOBILE GAMEPAD
═══════════════════════════════════════════════════════════ */

/* ── Joystick zone ──────────────────────────────────────── */
.joystick-zone {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 30%;
  height: 55%;
  min-height: 200px;
  z-index: 20;
  touch-action: none;

  background: radial-gradient(
    ellipse at 30% 70%,
    #4fc3f708 0%,
    transparent 65%
  );
}

/* Floating base — snaps to where thumb lands */
.js-base {
  position: absolute;
  width: 128px;
  height: 128px;
  pointer-events: none;
  /* will-change prevents repaint jank on translate */
  will-change: transform, opacity;
}

.js-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #4fc3f738;
  background: #04080f55;
  backdrop-filter: blur(4px);
  /* Subtle glow when active */
  box-shadow: 0 0 24px #4fc3f718 inset;
}

/* Cardinal direction labels */
.js-cardinal {
  position: absolute;
  font-size: 9px;
  color: #4fc3f728;
  left: 50%;
  top: 50%;
  pointer-events: none;
  line-height: 1;
  user-select: none;
}
.js-up {
  transform: translate(-50%, -50px);
}
.js-down {
  transform: translate(-50%, 38px);
}
.js-left {
  transform: translate(-50px, -50%);
}
.js-right {
  transform: translate(38px, -50%);
}

/* Knob */
.js-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #4fc3f7ee, #1565c0);
  border: 2.5px solid #4fc3f7;
  box-shadow:
    0 0 22px #4fc3f766,
    0 4px 14px #0009;
  pointer-events: none;
  will-change: transform;
  /* smooth knob trailing */
  transition: box-shadow 0.1s;
}

/* Direction arc indicator — a small wedge-shaped div */
.js-direction-arc {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 56px solid #4fc3f722;
  transform-origin: center bottom;
  pointer-events: none;
  transition: opacity 0.1s;
}

/* Idle hint */
.js-idle-hint {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  opacity: 0.4;
}
.js-idle-ring {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 2px dashed #4fc3f7;
  animation: idlePulse 2.2s ease-in-out infinite;
}
@keyframes idlePulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.12);
    opacity: 1;
  }
}
.js-idle-label {
  font-size: 9px;
  letter-spacing: 3px;
  color: #4fc3f7;
  font-weight: bold;
}

/* Fade transition for idle hint */
.fade-hint-enter-active {
  transition: opacity 0.15s;
}
.fade-hint-leave-active {
  transition: opacity 0.25s;
}
.fade-hint-enter-from,
.fade-hint-leave-to {
  opacity: 0;
}

/* ── Action zone ────────────────────────────────────────── */
.action-zone {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20%;
  height: 55%;
  min-height: 200px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 18px 24px 22px;
  touch-action: none;
}

/* ABILITY button */
.btn-ability {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: radial-gradient(circle at 38% 35%, #fff8dc, #e6a800);
  border: 2.5px solid #ffd54f;
  box-shadow:
    0 0 18px #ffd54f33,
    0 4px 14px #0007;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-family: "Courier New", monospace;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  pointer-events: all;
  opacity: 0.5;
  transition:
    opacity 0.25s,
    transform 0.08s,
    box-shadow 0.08s;
  overflow: visible;
}
.btn-ability--ready {
  opacity: 1;
  box-shadow:
    0 0 28px #ffd54f88,
    0 4px 14px #0007;
  animation: abilityPulse 1.4s ease-in-out infinite;
}
@keyframes abilityPulse {
  0%,
  100% {
    box-shadow:
      0 0 18px #ffd54f44,
      0 4px 14px #0007;
  }
  50% {
    box-shadow:
      0 0 36px #ffd54fcc,
      0 4px 14px #0007;
  }
}
.btn-ability:active {
  transform: scale(0.88);
}
.btn-ability__icon {
  font-size: 22px;
  line-height: 1;
}
.btn-ability__label {
  font-size: 7px;
  letter-spacing: 1px;
  color: #5a3d00;
  font-weight: bold;
  text-align: center;
  line-height: 1;
  max-width: 54px;
}
.btn-ability__cd {
  font-size: 8px;
  color: #4a3000;
  font-weight: bold;
}
.btn-ability__cd--ready {
  color: #2a1a00;
}
.btn-ability__arc {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  pointer-events: none;
  transform: rotate(-90deg);
}
.arc-track {
  fill: none;
  stroke: #ffffff18;
  stroke-width: 3;
}
.arc-fill {
  fill: none;
  stroke: #ffd54f;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 150.8;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.15s linear;
}

/* FIRE button */
.btn-fire {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%, #ff7043, #b71c1c);
  border: 3px solid #ef5350;
  box-shadow:
    0 0 28px #ef535055,
    0 6px 18px #0009;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-family: "Courier New", monospace;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  pointer-events: all;
  transition:
    transform 0.08s,
    box-shadow 0.08s;
}
.btn-fire:active {
  transform: scale(0.88);
  box-shadow:
    0 0 44px #ef5350aa,
    0 2px 8px #000b;
}
.btn-fire__icon {
  font-size: 36px;
  line-height: 1;
}
.btn-fire__label {
  font-size: 8px;
  letter-spacing: 3px;
  color: #ffcdd2cc;
  font-weight: bold;
}

/* ═══════════════════════════════════════════════════════════
   RESULTS
═══════════════════════════════════════════════════════════ */
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
  animation: floatPlane 2s ease-in-out infinite;
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
