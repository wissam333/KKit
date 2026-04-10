<template>
  <div
    class="game-wrap"
    tabindex="0"
    @keydown="onKey"
    @keyup="offKey"
    ref="gameWrap"
  >
    <!-- TOP HUD -->
    <div class="hud">
      <div class="hud-left">
        <div class="hud-logo">
          <span class="hud-icon">🌿</span>
          <span class="hud-name">Together</span>
        </div>
        <div class="hud-players">
          <div class="hud-player p1-pill">
            <span class="pip-dot p1c" />
            <span>{{ myName }}</span>
          </div>
          <div class="hud-amp">&amp;</div>
          <div class="hud-player p2-pill" :class="{ ghost: !partnerConnected }">
            <span class="pip-dot p2c" />
            <span>{{ partnerConnected ? partnerName : "Waiting…" }}</span>
          </div>
        </div>
      </div>

      <div class="hud-center">
        <div class="level-badge">
          <Icon name="mdi:map-marker" size="12" />
          Level {{ currentLevel + 1 }} / {{ LEVELS.length }}
        </div>
        <div class="goal-hint">
          <Icon name="mdi:flag-checkered" size="11" />
          Both reach the flag!
        </div>
      </div>

      <div class="hud-right">
        <div v-if="!partnerConnected" class="wait-chip">
          <span class="blink-dot" />
          Waiting for partner
        </div>
        <div v-else class="online-chip">
          <span class="green-dot" />
          Co-op live
        </div>
      </div>
    </div>

    <!-- CANVAS -->
    <div class="arena" ref="arenaRef">
      <canvas ref="canvas" class="game-canvas" />

      <!-- OVERLAYS -->
      <transition name="fade">
        <div v-if="overlay" class="overlay">
          <div class="overlay-card" :class="overlay.type">
            <div class="ov-emoji">{{ overlay.emoji }}</div>
            <h2 class="ov-title">{{ overlay.title }}</h2>
            <p class="ov-sub">{{ overlay.sub }}</p>
            <div v-if="overlay.type === 'win'" class="ov-confetti">
              <span
                v-for="i in 16"
                :key="i"
                class="conf"
                :style="{
                  background: [
                    '#fbbf24',
                    '#34d399',
                    '#38bdf8',
                    '#f472b6',
                    '#a78bfa',
                  ][i % 5],
                  left: i * 6.25 + '%',
                  animationDelay: i * 0.09 + 's',
                  animationDuration: 1.2 + (i % 3) * 0.3 + 's',
                }"
              />
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- CONTROLS -->
    <div class="ctrl-bar">
      <div class="ctrl-desktop">
        <div class="ctrl-hint">
          <kbd>A</kbd><kbd>D</kbd> Move &nbsp; <kbd>W</kbd> /
          <kbd>Space</kbd> Jump &nbsp; <kbd>S</kbd> Drop through
        </div>
        <div class="ctrl-hint tip">
          💡 Stand on your partner to reach higher platforms!
        </div>
      </div>
      <div class="ctrl-mobile">
        <button
          class="mb-btn"
          @touchstart.prevent="mTouch('a', true)"
          @touchend.prevent="mTouch('a', false)"
        >
          ◀
        </button>
        <div class="mb-vert">
          <button
            class="mb-btn"
            @touchstart.prevent="mTouch('w', true)"
            @touchend.prevent="mTouch('w', false)"
          >
            ▲
          </button>
          <button
            class="mb-btn"
            @touchstart.prevent="mTouch('s', true)"
            @touchend.prevent="mTouch('s', false)"
          >
            ▼
          </button>
        </div>
        <button
          class="mb-btn"
          @touchstart.prevent="mTouch('d', true)"
          @touchend.prevent="mTouch('d', false)"
        >
          ▶
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";

const props = defineProps({ room: { type: Object, required: true } });

// ── Refs ───────────────────────────────────────────────────────────────────
const canvas = ref(null);
const arenaRef = ref(null);
const gameWrap = ref(null);
const overlay = ref(null);

// ── Identity ───────────────────────────────────────────────────────────────
const myRole = ref("p1");
const partnerConnected = ref(false);
const partnerName = ref("Partner");
const myName = computed(() => props.room.myName.value || "Explorer");
const currentLevel = ref(0);

// ── Canvas dimensions ──────────────────────────────────────────────────────
let CW = 900,
  CH = 440;

// ── Physics ────────────────────────────────────────────────────────────────
const GRAVITY = 0.54;
const JUMP_VEL = -13.8;
const MOVE_SPD = 4.4;
const P_W = 28,
  P_H = 42;

// ── Palette ────────────────────────────────────────────────────────────────
const PAL = {
  p1: "#38bdf8",
  p1d: "#0284c7",
  p2: "#fb923c",
  p2d: "#c2410c",
  plate: "#a78bfa",
  gate: "#f472b6",
  gem: "#34d399",
  flag: "#fbbf24",
  ground: "#2a6644",
  groundDk: "#1b3a2d",
  stone: "#2a3a4a",
  stoneDk: "#1a2635",
  vine: "#1e5236",
};

// ── Level data ─────────────────────────────────────────────────────────────
const LEVELS = [
  {
    name: "Forest Entry",
    sky: ["#0a1520", "#0d2540"],
    spawn: [
      { x: 60, y: 330 },
      { x: 110, y: 330 },
    ],
    platforms: [
      { x: 0, y: 370, w: 900, h: 50, type: "dirt" },
      { x: 80, y: 295, w: 110, h: 14, type: "stone" },
      { x: 260, y: 235, w: 90, h: 14, type: "stone" },
      { x: 420, y: 175, w: 100, h: 14, type: "stone" }, // tall — needs stack
      { x: 580, y: 280, w: 110, h: 14, type: "stone" },
      { x: 730, y: 215, w: 120, h: 14, type: "stone" },
    ],
    plates: [],
    gates: [],
    goal: { x: 840, y: 171, w: 26, h: 44 },
    decs: [
      { t: "tree", x: 30, y: 370 },
      { t: "tree", x: 450, y: 370 },
      { t: "gem", x: 280, y: 204 },
      { t: "gem", x: 600, y: 248 },
      { t: "vine", x: 320, y: 40, h: 180 },
    ],
  },
  {
    name: "The Gate",
    sky: ["#12082e", "#1f1050"],
    spawn: [
      { x: 60, y: 330 },
      { x: 100, y: 330 },
    ],
    platforms: [
      { x: 0, y: 370, w: 360, h: 50, type: "dirt" },
      { x: 520, y: 370, w: 380, h: 50, type: "dirt" },
      { x: 130, y: 285, w: 100, h: 14, type: "stone" },
      { x: 270, y: 210, w: 80, h: 14, type: "stone" },
      { x: 570, y: 295, w: 100, h: 14, type: "stone" },
      { x: 710, y: 215, w: 130, h: 14, type: "stone" },
    ],
    plates: [{ x: 140, y: 271, w: 75, h: 11, gateId: "A", pressed: false }],
    gates: [{ id: "A", x: 465, y: 255, w: 18, h: 115, open: false }],
    goal: { x: 820, y: 171, w: 26, h: 44 },
    decs: [
      { t: "water", x: 355, y: 315, w: 165, h: 55 },
      { t: "gem", x: 290, y: 178 },
      { t: "vine", x: 660, y: 30, h: 200 },
    ],
  },
  {
    name: "Cave Ascent",
    sky: ["#050b08", "#0a160e"],
    spawn: [
      { x: 60, y: 330 },
      { x: 100, y: 330 },
    ],
    platforms: [
      { x: 0, y: 370, w: 180, h: 50, type: "dirt" },
      { x: 190, y: 320, w: 90, h: 14, type: "stone" },
      { x: 340, y: 270, w: 80, h: 14, type: "stone" },
      { x: 210, y: 205, w: 80, h: 14, type: "stone" },
      { x: 70, y: 145, w: 110, h: 14, type: "stone" },
      { x: 200, y: 80, w: 90, h: 14, type: "stone" }, // very high — stack needed
      { x: 360, y: 130, w: 110, h: 14, type: "stone" },
      { x: 530, y: 200, w: 90, h: 14, type: "stone" },
      { x: 670, y: 260, w: 90, h: 14, type: "stone" },
      { x: 580, y: 370, w: 220, h: 50, type: "dirt" },
      { x: 740, y: 370, w: 160, h: 50, type: "dirt" },
    ],
    plates: [{ x: 210, y: 66, w: 70, h: 11, gateId: "B", pressed: false }],
    gates: [{ id: "B", x: 515, y: 145, w: 16, h: 56, open: false }],
    goal: { x: 855, y: 326, w: 26, h: 44 },
    decs: [
      { t: "vine", x: 145, y: 20, h: 260 },
      { t: "vine", x: 480, y: 60, h: 160 },
      { t: "gem", x: 360, y: 98 },
      { t: "gem", x: 545, y: 168 },
      { t: "gem", x: 690, y: 228 },
      { t: "tree", x: 590, y: 370 },
    ],
  },
];

// ── Runtime objects ────────────────────────────────────────────────────────
let plats = [],
  plates = [],
  gates = [],
  goal = null,
  decs = [],
  particles = [],
  floatTexts = [];

function makeP(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    onGround: false,
    onPart: false,
    facing: 1,
    anim: "idle",
    leg: 0,
  };
}
let p1 = makeP(60, 330),
  p2 = makeP(110, 330);
const me = () => (myRole.value === "p1" ? p1 : p2);
const opp = () => (myRole.value === "p1" ? p2 : p1);

// ── Input ──────────────────────────────────────────────────────────────────
const keys = {};
const onKey = (e) => {
  keys[e.key.toLowerCase()] = true;
  e.preventDefault();
};
const offKey = (e) => {
  keys[e.key.toLowerCase()] = false;
};
const mTouch = (k, v) => {
  keys[k] = v;
};

// ── Load level ─────────────────────────────────────────────────────────────
function loadLevel(idx) {
  const L = LEVELS[idx];
  plats = L.platforms.map((p) => ({ ...p }));
  plates = L.plates.map((pp) => ({ ...pp, pressed: false }));
  gates = L.gates.map((g) => ({ ...g, open: false }));
  goal = { ...L.goal, reached1: false, reached2: false };
  decs = L.decs.map((d) => ({ ...d }));
  particles = [];
  floatTexts = [];
  const s1 = L.spawn[0],
    s2 = L.spawn[1];
  p1 = makeP(s1.x, s1.y);
  p2 = makeP(s2.x, s2.y);
  overlay.value = null;
}

// ── Rect overlap ───────────────────────────────────────────────────────────
function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── Resolve player vs solid rects ──────────────────────────────────────────
function resolveVsRects(p, rects) {
  p.onGround = false;
  for (const r of rects) {
    if (!overlap(p.x, p.y, P_W, P_H, r.x, r.y, r.w, r.h)) continue;
    const dBottom = p.y + P_H - r.y;
    const dTop = r.y + r.h - p.y;
    const dLeft = p.x + P_W - r.x;
    const dRight = r.x + r.w - p.x;
    const minV = Math.min(dBottom, dTop);
    const minH = Math.min(dLeft, dRight);
    if (minV <= minH) {
      if (dBottom < dTop) {
        p.y = r.y - P_H;
        if (p.vy > 0) p.vy = 0;
        p.onGround = true;
      } else {
        p.y = r.y + r.h;
        if (p.vy < 0) p.vy = 0;
      }
    } else {
      if (dLeft < dRight) p.x = r.x - P_W;
      else p.x = r.x + r.w;
      p.vx = 0;
    }
  }
}

// ── Player stacking ────────────────────────────────────────────────────────
function resolveStack(bottom, top) {
  top.onPart = false;
  if (!overlap(top.x, top.y, P_W, P_H, bottom.x, bottom.y, P_W, P_H)) return;
  const topFoot = top.y + P_H;
  const botHead = bottom.y;
  const overlapY = topFoot - botHead;
  if (overlapY > 0 && overlapY < P_H * 0.65 && top.vy >= 0) {
    top.y = bottom.y - P_H;
    top.vy = 0;
    top.onGround = true;
    top.onPart = true;
  }
}

// ── Pressure plates ────────────────────────────────────────────────────────
function updatePlates() {
  for (const pp of plates) {
    const was = pp.pressed;
    pp.pressed = false;
    for (const player of [p1, p2]) {
      const foot = player.y + P_H;
      if (
        foot >= pp.y &&
        foot <= pp.y + 22 &&
        player.x + P_W > pp.x &&
        player.x < pp.x + pp.w
      ) {
        pp.pressed = true;
      }
    }
    const g = gates.find((g) => g.id === pp.gateId);
    if (g) g.open = pp.pressed;
    if (!was && pp.pressed) {
      burst(pp.x + pp.w / 2, pp.y, PAL.plate, 8);
      floatTexts.push({
        t: "🔓 Opened!",
        x: pp.x + pp.w / 2,
        y: pp.y - 16,
        a: 1,
        vy: -1,
        col: PAL.plate,
        sz: 14,
      });
    }
  }
}

// ── Update a player ────────────────────────────────────────────────────────
function updatePlayer(p, controlled) {
  if (controlled) {
    const L = keys["a"] || keys["arrowleft"];
    const R = keys["d"] || keys["arrowright"];
    const jump = keys["w"] || keys["arrowup"] || keys[" "];

    if (L) {
      p.vx = -MOVE_SPD;
      p.facing = -1;
    } else if (R) {
      p.vx = MOVE_SPD;
      p.facing = 1;
    } else {
      p.vx *= 0.5;
    }

    if (jump && p.onGround) {
      p.vy = JUMP_VEL;
      p.onGround = false;
      p.onPart = false;
      burst(p.x + P_W / 2, p.y + P_H, "#ffffff", 5);
    }

    // Anim
    if (!p.onGround) p.anim = "jump";
    else if (Math.abs(p.vx) > 0.5) {
      p.anim = "walk";
      p.leg += 0.19;
    } else p.anim = "idle";
  }

  // Physics
  p.vy += GRAVITY;
  p.x += p.vx;
  p.y += p.vy;

  // Bounds
  if (p.x < 0) {
    p.x = 0;
    p.vx = 0;
  }
  if (p.x + P_W > CW) {
    p.x = CW - P_W;
    p.vx = 0;
  }
  if (p.y > CH + 80) {
    p.x = 60;
    p.y = 310;
    p.vy = 0;
  } // respawn

  // Solid rects: platforms + closed gates
  const solids = [...plats, ...gates.filter((g) => !g.open)];
  resolveVsRects(p, solids);
}

// ── Gem pickup ─────────────────────────────────────────────────────────────
function checkGems() {
  for (const d of decs) {
    if (d.t !== "gem" || d.collected) continue;
    for (const p of [p1, p2]) {
      if (overlap(p.x, p.y, P_W, P_H, d.x - 10, d.y - 10, 20, 20)) {
        d.collected = true;
        burst(d.x, d.y, PAL.gem, 10);
        floatTexts.push({
          t: "✨",
          x: d.x,
          y: d.y,
          a: 1,
          vy: -1.5,
          col: PAL.gem,
          sz: 18,
        });
      }
    }
  }
}

// ── Goal check ────────────────────────────────────────────────────────────
function checkGoal() {
  if (!goal || overlay.value) return;
  if (overlap(p1.x, p1.y, P_W, P_H, goal.x, goal.y, goal.w, goal.h))
    goal.reached1 = true;
  if (overlap(p2.x, p2.y, P_W, P_H, goal.x, goal.y, goal.w, goal.h))
    goal.reached2 = true;
  if (goal.reached1 && goal.reached2) onLevelClear();
}

function onLevelClear() {
  burst(goal.x + goal.w / 2, goal.y, PAL.flag, 22);
  broadcastG({ type: "level-done", level: currentLevel.value });
  advanceLevel();
}

function advanceLevel() {
  if (currentLevel.value + 1 < LEVELS.length) {
    overlay.value = {
      type: "levelup",
      emoji: "🌟",
      title: "Amazing!",
      sub: `Level ${currentLevel.value + 1} cleared! Next in 3s…`,
    };
    setTimeout(() => {
      currentLevel.value++;
      loadLevel(currentLevel.value);
    }, 3000);
  } else {
    overlay.value = {
      type: "win",
      emoji: "🏆",
      title: "You did it!",
      sub: "All levels complete — you explored it all together!",
    };
  }
}

// ── Particles ──────────────────────────────────────────────────────────────
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * (1.5 + Math.random() * 3.5),
      vy: Math.sin(a) * (1.5 + Math.random() * 3.5) - 1.5,
      a: 1,
      sz: 3 + Math.random() * 5,
      col: Array.isArray(col)
        ? col[Math.floor(Math.random() * col.length)]
        : col,
      life: 35 + Math.random() * 25,
    });
  }
}

// ── Draw ───────────────────────────────────────────────────────────────────
let starCache = null;
let tick = 0;

function draw() {
  const ctx = canvas.value?.getContext("2d");
  if (!ctx) return;
  tick++;

  const L = LEVELS[currentLevel.value];
  ctx.clearRect(0, 0, CW, CH);

  // Sky
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, L.sky[0]);
  sk.addColorStop(1, L.sky[1]);
  ctx.fillStyle = sk;
  ctx.fillRect(0, 0, CW, CH);

  // Stars
  if (!starCache) {
    starCache = Array.from({ length: 55 }, () => ({
      x: Math.random() * CW,
      y: Math.random() * CH * 0.55,
      r: 0.5 + Math.random() * 1.5,
      base: Math.random() * Math.PI * 2,
    }));
  }
  for (const s of starCache) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tick * 0.015 + s.base);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Decorations (back layer)
  for (const d of decs) drawDec(ctx, d, tick);

  // Platforms
  for (const p of plats) drawPlat(ctx, p, tick);

  // Pressure plates
  for (const pp of plates) drawPlate(ctx, pp);

  // Gates
  for (const g of gates) drawGate(ctx, g);

  // Goal
  if (goal) drawGoal(ctx, goal, tick);

  // Players — draw partner first (behind me)
  drawPlayer(
    ctx,
    opp(),
    myRole.value === "p1" ? PAL.p2 : PAL.p1,
    myRole.value === "p1" ? PAL.p2d : PAL.p1d,
    false,
  );
  drawPlayer(
    ctx,
    me(),
    myRole.value === "p1" ? PAL.p1 : PAL.p2,
    myRole.value === "p1" ? PAL.p1d : PAL.p2d,
    true,
  );

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.a -= 1 / p.life;
    if (p.a <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating texts
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const f = floatTexts[i];
    f.y += f.vy;
    f.a -= 0.02;
    if (f.a <= 0) {
      floatTexts.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = f.a;
    ctx.fillStyle = f.col;
    ctx.font = `bold ${f.sz}px Tajawal,sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(f.t, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // Invite banner if solo
  if (!partnerConnected.value) {
    ctx.fillStyle = "rgba(251,191,36,0.75)";
    ctx.font = "bold 13px Tajawal,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⬆  Share the room link so a friend can join!", CW / 2, 26);
  }
}

function drawPlat(ctx, p, tick) {
  if (p.type === "dirt") {
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, PAL.ground);
    g.addColorStop(0.35, PAL.groundDk);
    g.addColorStop(1, "#0d1a10");
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // grass blades
    ctx.strokeStyle = "#3a8857";
    ctx.lineWidth = 1.5;
    for (let gx = p.x + 6; gx < p.x + p.w - 4; gx += 12) {
      const bh = 4 + Math.sin(gx * 0.7) * 2;
      ctx.beginPath();
      ctx.moveTo(gx, p.y);
      ctx.quadraticCurveTo(gx + 2, p.y - bh, gx + 4, p.y - bh - 1);
      ctx.stroke();
    }
  } else {
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, PAL.stone);
    g.addColorStop(1, PAL.stoneDk);
    ctx.fillStyle = g;
    rr(ctx, p.x, p.y, p.w, p.h, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    // stone dots
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let tx = p.x + 14; tx < p.x + p.w - 8; tx += 22) {
      ctx.beginPath();
      ctx.arc(tx, p.y + p.h / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlate(ctx, pp) {
  const glow = pp.pressed;
  ctx.shadowBlur = glow ? 18 : 6;
  ctx.shadowColor = PAL.plate;
  ctx.globalAlpha = glow ? 0.95 : 0.55;
  ctx.fillStyle = PAL.plate;
  ctx.fillRect(pp.x, pp.y + (glow ? 4 : 0), pp.w, pp.h - (glow ? 4 : 0));
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("▼ STAND", pp.x + pp.w / 2, pp.y - 5);
}

function drawGate(ctx, g) {
  ctx.globalAlpha = g.open ? 0.15 : 1;
  const gr = ctx.createLinearGradient(g.x, g.y, g.x + g.w, g.y);
  gr.addColorStop(0, PAL.gate);
  gr.addColorStop(1, "#7c3aed");
  ctx.fillStyle = gr;
  ctx.shadowBlur = g.open ? 0 : 16;
  ctx.shadowColor = PAL.gate;
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  if (!g.open) {
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔒", g.x + g.w / 2, g.y + g.h / 2 + 4);
  }
}

function drawGoal(ctx, g, tick) {
  const wave = Math.sin(tick * 0.05) * 4;
  // Glow aura
  ctx.globalAlpha = 0.15 + 0.08 * Math.sin(tick * 0.06);
  ctx.fillStyle = PAL.flag;
  ctx.beginPath();
  ctx.arc(g.x + g.w / 2, g.y + g.h / 2, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Pole
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(g.x + 2, g.y + g.h);
  ctx.lineTo(g.x + 2, g.y - 8);
  ctx.stroke();
  // Flag
  ctx.fillStyle = PAL.flag;
  ctx.shadowBlur = 14;
  ctx.shadowColor = PAL.flag;
  ctx.beginPath();
  ctx.moveTo(g.x + 2, g.y - 8);
  ctx.lineTo(g.x + 22, g.y + 4 + wave);
  ctx.lineTo(g.x + 2, g.y + 16 + wave);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // GOAL label
  ctx.fillStyle = PAL.flag;
  ctx.font = "bold 9px Tajawal,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GOAL", g.x + g.w / 2, g.y + g.h + 14);
  // Check marks
  if (g.reached1) {
    ctx.fillStyle = PAL.p1;
    ctx.font = "11px sans-serif";
    ctx.fillText("✓P1", g.x - 18, g.y + g.h + 12);
  }
  if (g.reached2) {
    ctx.fillStyle = PAL.p2;
    ctx.font = "11px sans-serif";
    ctx.fillText("✓P2", g.x + g.w + 8, g.y + g.h + 12);
  }
}

function drawDec(ctx, d, tick) {
  if (d.t === "tree") {
    ctx.fillStyle = "#1e3a28";
    ctx.fillRect(d.x + 10, d.y - 70, 8, 70);
    ctx.fillStyle = "#1e5236";
    ctx.beginPath();
    ctx.arc(d.x + 14, d.y - 75, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a6644";
    ctx.beginPath();
    ctx.arc(d.x + 14, d.y - 95, 20, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.t === "vine") {
    ctx.strokeStyle = PAL.vine;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + Math.sin(tick * 0.02) * 10, d.y + d.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = PAL.vine;
    for (let j = 0; j < d.h; j += 30) {
      ctx.beginPath();
      ctx.ellipse(d.x + 10, d.y + j + 15, 9, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (d.t === "gem" && !d.collected) {
    const pulse = 0.7 + 0.3 * Math.sin(tick * 0.06 + d.x);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PAL.gem;
    ctx.shadowBlur = 10;
    ctx.shadowColor = PAL.gem;
    // diamond shape
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 10);
    ctx.lineTo(d.x + 10, d.y);
    ctx.lineTo(d.x, d.y + 10);
    ctx.lineTo(d.x - 10, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  } else if (d.t === "water") {
    const wv = Math.sin(tick * 0.04) * 3;
    ctx.fillStyle = "rgba(30,100,200,0.5)";
    ctx.beginPath();
    ctx.moveTo(d.x, d.y + wv);
    ctx.lineTo(d.x + d.w, d.y - wv);
    ctx.lineTo(d.x + d.w, d.y + d.h);
    ctx.lineTo(d.x, d.y + d.h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlayer(ctx, p, col, dkCol, isMe) {
  const cx = p.x + P_W / 2;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, p.y + P_H + 3, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Glow
  if (isMe) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = col;
  }
  // Body
  const bg = ctx.createLinearGradient(p.x, p.y, p.x, p.y + P_H);
  bg.addColorStop(0, col);
  bg.addColorStop(1, dkCol);
  ctx.fillStyle = bg;
  rr(ctx, p.x + 5, p.y + 14, P_W - 10, P_H - 26, 5);
  ctx.fill();
  // Legs
  const ls = Math.sin(p.leg) * (p.anim === "walk" ? 8 : 0);
  ctx.fillStyle = dkCol;
  rr(ctx, p.x + 5, p.y + P_H - 14, 8, 14 + ls, 3);
  ctx.fill();
  rr(ctx, p.x + P_W - 13, p.y + P_H - 14, 8, 14 - ls, 3);
  ctx.fill();
  // Arms
  const as = Math.sin(p.leg + Math.PI) * (p.anim === "walk" ? 7 : 0);
  ctx.fillStyle = col;
  rr(ctx, p.x - 4, p.y + 16, 7, 14 + as, 3);
  ctx.fill();
  rr(ctx, p.x + P_W - 3, p.y + 16, 7, 14 - as, 3);
  ctx.fill();
  // Head
  ctx.fillStyle = col;
  ctx.shadowBlur = isMe ? 16 : 4;
  ctx.shadowColor = col;
  ctx.beginPath();
  ctx.arc(cx, p.y + 10, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Eyes
  const dir = p.facing;
  const ex1 = dir === 1 ? cx + 2 : cx - 8;
  const ex2 = ex1 + 6 * dir;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex1, p.y + 8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex2, p.y + 8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(ex1 + dir, p.y + 9, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex2 + dir, p.y + 9, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Name
  ctx.fillStyle = isMe ? col : "rgba(255,255,255,0.45)";
  ctx.font = `${isMe ? "bold " : ""} 8px Tajawal,sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(
    isMe ? "YOU" : myRole.value === "p1" ? partnerName.value : "P1",
    cx,
    p.y - 4,
  );
  // On-partner indicator
  if (p.onPart) {
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(251,191,36,0.85)";
    ctx.fillText("⬆", cx, p.y - 14);
  }
}

// round-rect helper
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Game loop ──────────────────────────────────────────────────────────────
let rafId = null,
  lastSync = 0;

function loop() {
  updatePlayer(me(), true);
  // Stacking
  resolveStack(opp(), me());
  resolveStack(me(), opp());
  // Re-run collision for me after stack
  resolveVsRects(me(), [...plats, ...gates.filter((g) => !g.open)]);
  // Logic
  updatePlates();
  checkGems();
  checkGoal();
  // Net
  const now = Date.now();
  if (now - lastSync > 48) {
    const m = me();
    broadcastG({
      type: "pos",
      x: m.x,
      y: m.y,
      vx: m.vx,
      vy: m.vy,
      facing: m.facing,
      anim: m.anim,
      leg: m.leg,
      onGround: m.onGround,
    });
    lastSync = now;
  }
  draw();
  rafId = requestAnimationFrame(loop);
}

// ── Net ────────────────────────────────────────────────────────────────────
function broadcastG(data) {
  props.room.broadcast({ ...data, _g: "together" });
}

let unsub = null;
function handleMsg(data) {
  if (data._g !== "together") return;
  if (data.type === "pos") {
    const t = opp();
    t.x = data.x;
    t.y = data.y;
    t.vx = data.vx;
    t.vy = data.vy;
    t.facing = data.facing;
    t.anim = data.anim;
    t.leg = data.leg;
    t.onGround = data.onGround;
  } else if (data.type === "hello") {
    partnerConnected.value = true;
    partnerName.value = data.name || "Partner";
    if (myRole.value === "p1")
      broadcastG({
        type: "welcome",
        name: myName.value,
        level: currentLevel.value,
      });
  } else if (data.type === "welcome") {
    partnerConnected.value = true;
    partnerName.value = data.name || "Partner";
    if (data.level !== currentLevel.value) {
      currentLevel.value = data.level;
      loadLevel(data.level);
    }
  } else if (data.type === "level-done") {
    if (!overlay.value) advanceLevel();
  }
}

// ── Resize ─────────────────────────────────────────────────────────────────
function resize() {
  if (!arenaRef.value || !canvas.value) return;
  CW = arenaRef.value.clientWidth;
  CH = arenaRef.value.clientHeight;
  canvas.value.width = CW;
  canvas.value.height = CH;
  starCache = null;
}

// ── Mount ──────────────────────────────────────────────────────────────────
onMounted(() => {
  nextTick(() => {
    resize();
    window.addEventListener("resize", resize);
    gameWrap.value?.focus();

    loadLevel(0);
    myRole.value = props.room.members.value.length === 0 ? "p1" : "p2";
    if (props.room.members.value.length > 0) partnerConnected.value = true;

    unsub = props.room.onMessage(handleMsg);
    setTimeout(() => broadcastG({ type: "hello", name: myName.value }), 600);
    loop();
  });
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resize);
  unsub?.();
});

watch(
  () => props.room.members.value.length,
  (n) => {
    if (n > 0) {
      partnerConnected.value = true;
      broadcastG({ type: "hello", name: myName.value });
    } else partnerConnected.value = false;
  },
);
</script>

<style scoped lang="scss">
.game-wrap {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 62px);
  background: #050b08;
  outline: none;
  overflow: hidden;
  font-family: "Tajawal", sans-serif;
  @media (max-width: 991px) {
    height: calc(100dvh - 54px);
  }
}

/* HUD */
.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 50px;
  flex-shrink: 0;
  background: rgba(5, 11, 8, 0.97);
  border-bottom: 1.5px solid rgba(42, 102, 68, 0.45);
  gap: 12px;
  @media (max-width: 600px) {
    height: 42px;
    padding: 0 10px;
  }
}
.hud-left,
.hud-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.hud-right {
  justify-content: flex-end;
}
.hud-center {
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hud-logo {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  font-weight: 900;
  color: #34d399;
  letter-spacing: 0.06em;
}
.hud-icon {
  font-size: 1rem;
}
.hud-players {
  display: flex;
  align-items: center;
  gap: 6px;
  @media (max-width: 480px) {
    display: none;
  }
}
.hud-player {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  &.p1-pill {
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.25);
  }
  &.p2-pill {
    background: rgba(251, 146, 60, 0.1);
    color: #fb923c;
    border: 1px solid rgba(251, 146, 60, 0.25);
  }
  &.ghost {
    opacity: 0.35;
    border-style: dashed;
  }
}
.pip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  &.p1c {
    background: #38bdf8;
  }
  &.p2c {
    background: #fb923c;
  }
}
.hud-amp {
  color: #2a6644;
  font-weight: 900;
  font-size: 0.75rem;
}
.level-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #94a3b8;
}
.goal-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.62rem;
  color: #2a6644;
  font-weight: 600;
}
.wait-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px dashed #2e3347;
}
.online-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #34d399;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.25);
}
.blink-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
  animation: blink 1.2s ease infinite;
}
.green-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  animation: blink 2s ease infinite;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}

/* Arena */
.arena {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #050b08;
}
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* Overlays */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 11, 8, 0.88);
  backdrop-filter: blur(8px);
  z-index: 20;
}
.overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 40px 52px;
  background: #0a160e;
  border: 1.5px solid #2a6644;
  border-radius: 24px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.65),
    0 0 60px rgba(52, 211, 153, 0.07);
  position: relative;
  overflow: hidden;
  &.win {
    border-color: #fbbf24;
    box-shadow:
      0 32px 80px rgba(0, 0, 0, 0.65),
      0 0 80px rgba(251, 191, 36, 0.12);
  }
}
.ov-emoji {
  font-size: 3.5rem;
  line-height: 1;
}
.ov-title {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 900;
  color: #f1f5f9;
  letter-spacing: 0.04em;
}
.ov-sub {
  margin: 0;
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.5;
}
.ov-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.conf {
  position: absolute;
  top: -12px;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  animation: confFall linear forwards;
}
@keyframes confFall {
  to {
    transform: translateY(430px) rotate(720deg);
    opacity: 0;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Controls */
.ctrl-bar {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  min-height: 40px;
  background: rgba(5, 11, 8, 0.97);
  border-top: 1.5px solid rgba(42, 102, 68, 0.3);
  flex-shrink: 0;
  gap: 16px;
  @media (max-width: 600px) {
    padding: 4px 10px;
  }
}
.ctrl-desktop {
  display: flex;
  align-items: center;
  gap: 20px;
  @media (max-width: 600px) {
    display: none;
  }
}
.ctrl-hint {
  font-size: 0.68rem;
  color: #475569;
  font-weight: 600;
  kbd {
    display: inline-block;
    padding: 1px 5px;
    margin: 0 1px;
    background: #0a160e;
    border: 1.5px solid #2a6644;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.65rem;
    color: #34d399;
  }
  &.tip {
    color: #2a6644;
    font-style: italic;
  }
}
.ctrl-mobile {
  display: none;
  @media (max-width: 600px) {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    justify-content: center;
  }
}
.mb-vert {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mb-btn {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: rgba(42, 102, 68, 0.15);
  border: 1.5px solid rgba(42, 102, 68, 0.4);
  color: #34d399;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.1s;
  &:active {
    background: rgba(52, 211, 153, 0.25);
    border-color: #34d399;
    transform: scale(0.92);
  }
}
</style>
