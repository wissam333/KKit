// composables/useSkymatch.js
// Core game engine — fixed: planes now fly correctly

import { ref, computed, nextTick, watch } from "vue";
import { useGameSounds } from "./useGameSounds";
import { useGameRenderer } from "./useGameRenderer";

const BULLET_SPEED = 9;
const BULLET_LIFE = 62;
const RELOAD_FRAMES = 12;
const MAX_AMMO = 30;
const AMMO_REGEN = 180;
const AI_COUNT = 3;
const CANVAS_BASE_W = 900;
const CANVAS_BASE_H = 550;
const POWERUP_SPAWN_INTERVAL = 480;

const POWERUP_TYPES = [
  {
    id: "ammo",
    icon: "🔴",
    label: "AMMO REFILL",
    color: "#ef5350",
    glowColor: "#ef5350",
    effect: "ammo",
  },
  {
    id: "repair",
    icon: "💚",
    label: "REPAIR KIT",
    color: "#66bb6a",
    glowColor: "#66bb6a",
    effect: "repair",
  },
  {
    id: "speed",
    icon: "⚡",
    label: "SPEED BOOST",
    color: "#ffd54f",
    glowColor: "#ffd54f",
    effect: "speed",
  },
];

export const planeTypes = [
  {
    id: "fokker",
    name: "Fokker Dr.I",
    icon: "🛩",
    speed: 3.8,
    hp: 80,
    color: "#e05a00",
    accel: 0.18,
    drag: 0.97,
    ability: "roll",
    abilityCd: 240,
  },
  {
    id: "sopwith",
    name: "Sopwith Camel",
    icon: "✈",
    speed: 4.2,
    hp: 70,
    color: "#1976d2",
    accel: 0.2,
    drag: 0.96,
    ability: "burst",
    abilityCd: 200,
  },
  {
    id: "spad",
    name: "SPAD XIII",
    icon: "🛫",
    speed: 5.0,
    hp: 60,
    color: "#2e7d32",
    accel: 0.22,
    drag: 0.95,
    ability: "boost",
    abilityCd: 180,
  },
  {
    id: "albatros",
    name: "Albatros D.V",
    icon: "🛬",
    speed: 3.5,
    hp: 100,
    color: "#7b1fa2",
    accel: 0.16,
    drag: 0.975,
    ability: "repair",
    abilityCd: 280,
  },
];

export function useSkymatch(room, canvasRef, canvasW, canvasH, wrapperRef) {
  const sounds = useGameSounds();
  const renderer = useGameRenderer(canvasRef, canvasW, canvasH);

  // ── Reactive state ──────────────────────────────────────────────────────────
  const phase = ref("lobby");
  const chosenPlane = ref("sopwith");
  const imReady = ref(false);
  const lobbyPlayers = ref([]);
  const isMobile = ref(false);
  const killFeed = ref([]);
  const myKills = ref(0);
  const myHp = ref(100);
  const myAmmo = ref(MAX_AMMO);
  const myAbilityCd = ref(0);
  const myAbilityMax = ref(0);
  const myAbilityName = ref("");
  const resultsWinner = ref("");
  const sortedFinalScores = ref([]);
  const streakText = ref("");
  const streakVisible = ref(false);
  const floatingTexts = ref([]);
  const wave = ref(1);
  const mobileJoystick = ref({ active: false, nx: 0, ny: 0 });

  let gameState = null;
  let animId = null;
  let unsubscribe = null;
  let lobbyPingInterval = null;

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    ability: false,
  };

  const mobileKey = (k, v) => {
    keys[k] = v;
  };

  const onKey = (e, val) => {
    if (["w", "W", "ArrowUp"].includes(e.key)) keys.up = val;
    if (["s", "S", "ArrowDown"].includes(e.key)) keys.down = val;
    if (["a", "A", "ArrowLeft"].includes(e.key)) keys.left = val;
    if (["d", "D", "ArrowRight"].includes(e.key)) keys.right = val;
    if (e.key === " ") {
      e.preventDefault();
      keys.fire = val;
    }
    if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      keys.ability = val;
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const myPlaneData = computed(
    () => planeTypes.find((p) => p.id === chosenPlane.value) || planeTypes[0],
  );
  const myPlaneIcon = computed(() => myPlaneData.value.icon);
  const myHpPct = computed(() =>
    Math.max(0, (myHp.value / myPlaneData.value.hp) * 100),
  );
  const hpColor = computed(() =>
    myHpPct.value > 50 ? "#4caf50" : myHpPct.value > 25 ? "#ff9800" : "#f44336",
  );
  const canStartSolo = computed(() => phase.value === "lobby");
  const enemyHuds = computed(() => {
    if (!gameState) return [];
    return gameState.planes
      .filter((p) => p.id !== room.myPeerId.value && !p.isAI)
      .map((p) => ({
        name: p.name,
        hpPct: Math.max(0, (p.hp / p.maxHp) * 100),
      }));
  });

  // ── Lobby helpers ───────────────────────────────────────────────────────────
  const toggleReady = () => {
    sounds.uiClick();
    imReady.value = !imReady.value;
    broadcastLobby();
    checkAllReady();
  };

  const broadcastLobby = () => {
    if (!room.myPeerId.value) return;
    room.broadcast({
      type: "game-lobby",
      subtype: "player-status",
      peerId: room.myPeerId.value,
      name: room.myName.value,
      planeId: chosenPlane.value,
      planeIcon: myPlaneIcon.value,
      ready: imReady.value,
    });
  };

  const checkAllReady = () => {
    const all = [{ ready: imReady.value }, ...lobbyPlayers.value];
    if (all.length >= 1 && all.every((p) => p.ready))
      setTimeout(() => startGame(), 800);
  };

  const startSolo = () => {
    sounds.uiClick();
    imReady.value = true;
    startGame(true);
  };

  // ── Start game ──────────────────────────────────────────────────────────────
  const startGame = (solo = false) => {
    if (phase.value === "playing") return;
    phase.value = "playing";
    myKills.value = 0;
    myAmmo.value = MAX_AMMO;
    wave.value = 1;

    const isSolo = solo || lobbyPlayers.value.length === 0;
    buildGameState(isSolo);
    room.broadcast({ type: "game-lobby", subtype: "start" });
    nextTick(() => nextTick(() => initCanvas()));
  };

  const initCanvas = (attempt = 0) => {
    const canvas = canvasRef.value;
    if (!canvas) {
      if (attempt < 20) setTimeout(() => initCanvas(attempt + 1), 50);
      return;
    }
    resize();
    renderer.init();
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  };

  // ── _makePlane: ALL fields explicitly defaulted so nothing is ever undefined ─
  const _makePlane = (opts) => {
    const plane = {
      // identity
      id: "",
      isMe: false,
      isAI: false,
      name: "",
      planeId: "sopwith",
      icon: "✈",
      // position & physics — MUST be numbers
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 4.0,
      accel: 0.18,
      drag: 0.97,
      color: "#ffffff",
      // health
      hp: 100,
      maxHp: 100,
      // scoring
      kills: 0,
      assists: 0,
      damageDealt: 0,
      // weapons
      ammo: MAX_AMMO,
      reloadTimer: 0,
      ammoTimer: 0,
      // ability
      ability: "roll",
      abilityCd: 0,
      abilityMaxCd: 240,
      // state flags
      dead: false,
      respawnTimer: 0,
      thrustOn: false,
      trail: [],
      // ability animations
      invincible: false,
      invincibleTimer: 0,
      rolling: false,
      rollAngle: 0,
      speedBoost: false,
      speedBoostTimer: 0,
      burstActive: false,
      burstCount: 0,
      burstTimer: 0,
      repairing: false,
      repairTimer: 0,
      // networking
      targetX: null,
      targetY: null,
      lastSeen: 0,
    };
    // Override with caller's options
    Object.assign(plane, opts);
    return plane;
  };

  // ── Build game state ────────────────────────────────────────────────────────
  const buildGameState = (withAI) => {
    // Ensure canvas is sized BEFORE reading W/H
    resize();
    const W = canvasW.value > 0 ? canvasW.value : CANVAS_BASE_W;
    const H = canvasH.value > 0 ? canvasH.value : CANVAS_BASE_H;

    const pd = myPlaneData.value;
    const myId = room.myPeerId.value;
    const planes = [];

    // ── My plane ──
    planes.push(
      _makePlane({
        id: myId,
        isMe: true,
        isAI: false,
        name: room.myName.value,
        planeId: chosenPlane.value,
        icon: pd.icon,
        x: 80,
        y: H / 2,
        vx: 0,
        vy: 0,
        angle: 0,
        hp: pd.hp,
        maxHp: pd.hp,
        speed: pd.speed,
        accel: pd.accel,
        drag: pd.drag,
        color: pd.color,
        ability: pd.ability,
        abilityCd: 0,
        abilityMaxCd: pd.abilityCd,
      }),
    );

    // ── Remote human planes ──
    const allColors = [
      "#e05a00",
      "#1976d2",
      "#2e7d32",
      "#7b1fa2",
      "#c62828",
      "#00838f",
      "#f9a825",
    ];
    lobbyPlayers.value.forEach((lp, i) => {
      const lpPlane =
        planeTypes.find((p) => p.id === lp.planeId) || planeTypes[1];
      const sx = W - 80 - i * 40;
      const sy = H / 2 + i * 60 - 30;
      planes.push(
        _makePlane({
          id: lp.peerId,
          isMe: false,
          isAI: false,
          name: lp.name,
          planeId: lp.planeId,
          icon: lp.planeIcon || "✈",
          x: sx,
          y: sy,
          vx: 0,
          vy: 0,
          angle: Math.PI,
          hp: lpPlane.hp,
          maxHp: lpPlane.hp,
          speed: lpPlane.speed,
          accel: lpPlane.accel,
          drag: lpPlane.drag,
          color: allColors[(i + 1) % allColors.length],
          ability: lpPlane.ability,
          abilityCd: 0,
          abilityMaxCd: lpPlane.abilityCd,
          targetX: sx,
          targetY: sy,
        }),
      );
    });

    // ── AI planes ──
    if (withAI || planes.length < 2) {
      const aiNames = [
        "Baron Von Richthofen",
        "Manfred",
        "Werner",
        "Ernst",
        "Fritz",
      ];
      const aiColors = ["#c62828", "#00838f", "#f9a825"];
      const aiStyles = ["aggressive", "defensive", "sniper"];
      for (let i = 0; i < AI_COUNT; i++) {
        planes.push(
          _makePlane({
            id: "ai_" + i,
            isMe: false,
            isAI: true,
            name: aiNames[i % aiNames.length],
            planeId: "fokker",
            icon: "🛩",
            x: W - 80 - i * 50,
            y: 80 + (i * (H - 160)) / AI_COUNT,
            vx: 0,
            vy: 0,
            angle: Math.PI,
            hp: 60,
            maxHp: 60,
            speed: 3.0 + i * 0.3,
            accel: 0.15,
            drag: 0.97,
            color: aiColors[i % aiColors.length],
            ability: "burst",
            abilityCd: 0,
            abilityMaxCd: 200,
            aiState: {
              targetId: null,
              fireTimer: 0,
              wanderAngle: 0,
              turnSpd: 0.055 + i * 0.012,
              state: "chase",
              style: aiStyles[i % aiStyles.length],
            },
          }),
        );
      }
    }

    // Clouds
    const clouds = [
      ...Array.from({ length: 5 }, () => ({
        x: Math.random() * W,
        y: 40 + Math.random() * 120,
        r: 35 + Math.random() * 55,
        spd: 0.35 + Math.random() * 0.25,
        alpha: 0.12 + Math.random() * 0.08,
        layer: 1,
      })),
      ...Array.from({ length: 4 }, () => ({
        x: Math.random() * W,
        y: 100 + Math.random() * 160,
        r: 25 + Math.random() * 35,
        spd: 0.18 + Math.random() * 0.15,
        alpha: 0.08 + Math.random() * 0.06,
        layer: 2,
      })),
    ];

    const trees = Array.from({ length: 22 }, () => ({
      x: Math.random() * W,
      h: 18 + Math.random() * 14,
    }));

    gameState = {
      planes,
      bullets: [],
      explosions: [],
      clouds,
      trees,
      powerUps: [],
      frame: 0,
      powerUpTimer: 120,
      teamTarget: null,
    };
  };

  // ── Game loop ───────────────────────────────────────────────────────────────
  const gameLoop = () => {
    if (phase.value !== "playing" && phase.value !== "ending") return;
    update();
    renderer.draw(gameState);
    animId = requestAnimationFrame(gameLoop);
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  const update = () => {
    const gs = gameState;
    gs.frame++;
    const W = canvasW.value;
    const H = canvasH.value;

    // Scroll clouds
    gs.clouds.forEach((c) => {
      c.x -= c.spd;
      if (c.x < -120) c.x = W + 80;
    });

    // Power-up spawning
    gs.powerUpTimer--;
    if (gs.powerUpTimer <= 0) {
      spawnPowerUp(gs);
      gs.powerUpTimer =
        POWERUP_SPAWN_INTERVAL + Math.floor(Math.random() * 120);
    }

    // Power-up lifecycle
    gs.powerUps = gs.powerUps.filter((pu) => {
      if (pu.collected) return false;
      pu.life--;
      return pu.life > 0;
    });

    // My plane
    const me = gs.planes.find((p) => p.isMe);
    if (me && !me.dead) {
      updateMyPlane(me, gs, W, H);
      broadcastMyState(me);
    }

    // Remote humans — smooth lerp toward broadcast position
    gs.planes
      .filter((p) => !p.isMe && !p.isAI && !p.dead)
      .forEach((p) => {
        if (p.targetX !== null) {
          p.x += (p.targetX - p.x) * 0.25;
          p.y += (p.targetY - p.y) * 0.25;
        }
        if (p.lastSeen > 0 && gs.frame - p.lastSeen > 180) p.dead = true;
      });

    // AI
    gs.planes
      .filter((p) => p.isAI && !p.dead)
      .forEach((p) => updateAI(p, gs, W, H));

    // Respawn AI only
    gs.planes
      .filter((p) => p.dead && p.isAI)
      .forEach((p) => {
        p.respawnTimer--;
        if (p.respawnTimer <= 0) respawnPlane(p, W, H);
      });

    // Bullets
    gs.bullets = gs.bullets.filter((b) => {
      b.x += Math.cos(b.angle) * BULLET_SPEED;
      b.y += Math.sin(b.angle) * BULLET_SPEED;
      b.life--;
      if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) return false;

      // Only process damage for bullets owned by me or AI
      const myId = room.myPeerId.value;
      if (b.ownerId !== myId && !b.ownerId.startsWith("ai_")) return true;

      for (const plane of gs.planes) {
        if (plane.id === b.ownerId || plane.dead || plane.invincible) continue;
        if (Math.hypot(plane.x - b.x, plane.y - b.y) < 19) {
          plane.hp -= b.dmg;
          spawnExplosion(b.x, b.y, false, gs);
          if (plane.isMe) {
            renderer.triggerShake(10);
            sounds.hit();
          }
          room.broadcast({
            type: "game-hit",
            victimId: plane.id,
            shooterId: b.ownerId,
            dmg: b.dmg,
            hp: Math.max(0, plane.hp),
            x: b.x,
            y: b.y,
          });
          if (plane.hp <= 0) killPlane(plane, b.ownerId, gs);
          return false;
        }
      }
      return true;
    });

    // Explosions
    gs.explosions = gs.explosions.filter((e) => {
      e.life--;
      e.r += e.big ? 2.2 : 1.5;
      return e.life > 0;
    });

    // Floating text decay
    floatingTexts.value = floatingTexts.value.filter((t) => {
      t.life--;
      t.y -= 0.7;
      return t.life > 0;
    });

    // End condition
    if (phase.value === "playing") checkEndCondition(gs);
  };

  // ── Player plane movement ───────────────────────────────────────────────────
  const updateMyPlane = (me, gs, W, H) => {
    const js = mobileJoystick.value;

    if (js.active) {
      // ── MOBILE: joystick drives velocity directly ──────────────────
      // Rotate plane to face movement direction (visual only, smooth)
      if (Math.hypot(js.nx, js.ny) > 0.1) {
        const targetAngle = Math.atan2(js.ny, js.nx);
        let da = targetAngle - me.angle;
        // Normalize to [-π, π]
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        me.angle += da * 0.12; // smooth visual rotation
      }

      const effectiveSpeed = me.speedBoost ? me.speed * 1.5 : me.speed;
      const effectiveAccel = me.speedBoost ? me.accel * 1.8 : me.accel;

      me.vx += js.nx * effectiveAccel * 1.4;
      me.vy += js.ny * effectiveAccel * 1.4;
      me.thrustOn = Math.hypot(js.nx, js.ny) > 0.1;

      // Speed cap
      const spd = Math.hypot(me.vx, me.vy);
      if (spd > effectiveSpeed) {
        me.vx = (me.vx / spd) * effectiveSpeed;
        me.vy = (me.vy / spd) * effectiveSpeed;
      }
    } else {
      // ── DESKTOP: original keyboard rotation + thrust ───────────────
      if (keys.left) me.angle -= 0.045;
      if (keys.right) me.angle += 0.045;

      const effectiveAccel = me.speedBoost ? me.accel * 1.8 : me.accel;
      const effectiveSpeed = me.speedBoost ? me.speed * 1.5 : me.speed;

      me.thrustOn = keys.up;
      if (keys.up) {
        me.vx += Math.cos(me.angle) * effectiveAccel;
        me.vy += Math.sin(me.angle) * effectiveAccel;
      }
      if (keys.down) {
        me.vx -= Math.cos(me.angle) * effectiveAccel * 0.5;
        me.vy -= Math.sin(me.angle) * effectiveAccel * 0.5;
      }

      // Speed cap
      const spd = Math.hypot(me.vx, me.vy);
      if (spd > effectiveSpeed) {
        me.vx = (me.vx / spd) * effectiveSpeed;
        me.vy = (me.vy / spd) * effectiveSpeed;
      }
    }

    // ── Shared: drag, move, wall bounce ──────────────────────────────
    me.vx *= me.drag;
    me.vy *= me.drag;

    me.x += me.vx;
    me.y += me.vy;

    if (me.x < 22) {
      me.x = 22;
      me.vx = Math.abs(me.vx) * 0.5;
    }
    if (me.x > W - 22) {
      me.x = W - 22;
      me.vx = -Math.abs(me.vx) * 0.5;
    }
    if (me.y < 22) {
      me.y = 22;
      me.vy = Math.abs(me.vy) * 0.5;
    }
    if (me.y > H - 52) {
      me.y = H - 52;
      me.vy = -Math.abs(me.vy) * 0.5;
    }

    // Trail
    me.trail.push({ x: me.x, y: me.y });
    if (me.trail.length > 16) me.trail.shift();

    // Ammo regen
    me.reloadTimer = Math.max(0, me.reloadTimer - 1);
    me.ammoTimer++;
    if (me.ammoTimer >= AMMO_REGEN && me.ammo < MAX_AMMO) {
      me.ammo++;
      me.ammoTimer = 0;
    }

    // Burst fire
    if (me.burstActive) {
      me.burstTimer--;
      if (me.burstTimer <= 0 && me.burstCount > 0) {
        fireBullet(me, gs);
        me.burstCount--;
        me.burstTimer = 5;
        if (me.burstCount <= 0) me.burstActive = false;
      }
    }

    // Normal fire
    if (keys.fire && me.reloadTimer === 0 && me.ammo > 0 && !me.burstActive) {
      fireBullet(me, gs);
      sounds.gunshot();
    }

    // Ability (E)
    me.abilityCd = Math.max(0, me.abilityCd - 1);
    if (keys.ability && me.abilityCd === 0) {
      activateAbility(me, gs);
      keys.ability = false;
    }

    // Ability timers
    if (me.invincibleTimer > 0) {
      me.invincibleTimer--;
      me.rolling = true;
      me.rollAngle = (me.rollAngle || 0) + 0.35;
      if (me.invincibleTimer <= 0) {
        me.invincible = false;
        me.rolling = false;
        me.rollAngle = 0;
      }
    }
    if (me.speedBoostTimer > 0) {
      me.speedBoostTimer--;
      if (me.speedBoostTimer <= 0) me.speedBoost = false;
    }
    if (me.repairTimer > 0) {
      me.repairTimer--;
      if (me.repairTimer % 8 === 0 && me.hp < me.maxHp) {
        me.hp = Math.min(me.maxHp, me.hp + 3);
        pushFloatingText("+3 HP", me.x, me.y - 20, "#66bb6a");
      }
      if (me.repairTimer <= 0) me.repairing = false;
    }

    // Power-up collection
    gs.powerUps
      .filter((pu) => !pu.collected)
      .forEach((pu) => {
        if (Math.hypot(pu.x - me.x, pu.y - me.y) < 24)
          collectPowerUp(me, pu, gs);
      });

    // Sync HUD refs
    myHp.value = me.hp;
    myAmmo.value = me.ammo;
    myAbilityCd.value = me.abilityCd;
    myAbilityMax.value = me.abilityMaxCd;
    myAbilityName.value = me.ability;
  };

  // ── Ability activation ──────────────────────────────────────────────────────
  const activateAbility = (plane, gs) => {
    plane.abilityCd = plane.abilityMaxCd;
    sounds.abilityUse();
    switch (plane.ability) {
      case "roll":
        plane.invincible = true;
        plane.invincibleTimer = 45;
        pushFloatingText("BARREL ROLL!", plane.x, plane.y - 25, "#ffd54f");
        break;
      case "burst":
        plane.burstActive = true;
        plane.burstCount = 5;
        plane.burstTimer = 3;
        pushFloatingText("BURST FIRE!", plane.x, plane.y - 25, "#ef5350");
        break;
      case "boost":
        plane.speedBoost = true;
        plane.speedBoostTimer = 180;
        pushFloatingText("SPEED BOOST!", plane.x, plane.y - 25, "#ffd54f");
        break;
      case "repair":
        plane.repairing = true;
        plane.repairTimer = 120;
        pushFloatingText("REPAIRING...", plane.x, plane.y - 25, "#66bb6a");
        break;
    }
  };

  // ── Power-ups ───────────────────────────────────────────────────────────────
  const spawnPowerUp = (gs) => {
    const W = canvasW.value,
      H = canvasH.value;
    const type =
      POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    gs.powerUps.push({
      ...type,
      x: 80 + Math.random() * (W - 160),
      y: 60 + Math.random() * (H - 140),
      life: 600,
      maxLife: 600,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    });
  };

  const collectPowerUp = (plane, pu, gs) => {
    pu.collected = true;
    sounds.powerUp();
    switch (pu.effect) {
      case "ammo":
        plane.ammo = MAX_AMMO;
        if (plane.isMe) myAmmo.value = MAX_AMMO;
        pushFloatingText("AMMO FULL!", plane.x, plane.y - 30, "#ef5350");
        break;
      case "repair":
        plane.hp = Math.min(plane.maxHp, plane.hp + 30);
        if (plane.isMe) myHp.value = plane.hp;
        pushFloatingText("+30 HP", plane.x, plane.y - 30, "#66bb6a");
        break;
      case "speed":
        plane.speedBoost = true;
        plane.speedBoostTimer = 300;
        pushFloatingText("SPEED BOOST!", plane.x, plane.y - 30, "#ffd54f");
        break;
    }
  };

  // ── AI update ───────────────────────────────────────────────────────────────
  const updateAI = (ai, gs, W, H) => {
    const st = ai.aiState;
    st.fireTimer = Math.max(0, st.fireTimer - 1);
    ai.abilityCd = Math.max(0, ai.abilityCd - 1);

    const MARGIN = 90;
    let wallRepulse = 0,
      nearWall = false;
    if (ai.x < MARGIN) {
      wallRepulse += ((MARGIN - ai.x) / MARGIN) * 1.3;
      nearWall = true;
    }
    if (ai.x > W - MARGIN) {
      wallRepulse -= ((ai.x - (W - MARGIN)) / MARGIN) * 1.3;
      nearWall = true;
    }
    if (ai.y < MARGIN) {
      wallRepulse += ((MARGIN - ai.y) / MARGIN) * 0.9;
      nearWall = true;
    }
    if (ai.y > H - MARGIN) {
      wallRepulse -= ((ai.y - (H - MARGIN)) / MARGIN) * 0.9;
      nearWall = true;
    }

    // Team target coordination
    if (!gs.teamTarget || gs.planes.find((p) => p.id === gs.teamTarget)?.dead) {
      const ht = gs.planes.filter((p) => !p.isAI && !p.dead);
      gs.teamTarget = ht.length > 0 ? ht[0].id : null;
    }

    const targets = gs.planes.filter((p) => p.id !== ai.id && !p.dead);
    if (!targets.length) return;

    let best = null,
      bestDist = Infinity;
    targets.forEach((t) => {
      let d = Math.hypot(t.x - ai.x, t.y - ai.y);
      if (st.style === "sniper" && !t.isAI) d *= 0.7;
      if (st.style === "aggressive" && d < 200) d *= 0.6;
      if (t.id === gs.teamTarget && !t.isAI) d *= 0.75;
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    });
    if (!best) return;

    // State machine
    const hpFrac = ai.hp / ai.maxHp;
    if (hpFrac < 0.2 && bestDist < 350 && st.style !== "aggressive")
      st.state = "retreat";
    else if (bestDist < 130)
      st.state = st.style === "aggressive" ? "attack" : "circle";
    else if (bestDist < 300 || st.style === "aggressive") st.state = "attack";
    else st.state = "chase";

    // Lead-aim
    const travelTime = bestDist / BULLET_SPEED;
    const waveAcc = Math.min(1.4, 1 + (wave.value - 1) * 0.15);
    const aimX = best.x + best.vx * travelTime * waveAcc;
    const aimY = best.y + best.vy * travelTime * waveAcc;
    const toTargetAngle = Math.atan2(aimY - ai.y, aimX - ai.x);

    let desiredAngle;
    if (nearWall) {
      desiredAngle = Math.atan2(H / 2 - ai.y, W / 2 - ai.x) + wallRepulse * 0.5;
    } else if (st.state === "retreat") {
      desiredAngle = toTargetAngle + Math.PI + (Math.random() - 0.5) * 0.7;
    } else if (st.state === "circle") {
      desiredAngle =
        toTargetAngle + Math.PI * 0.5 * (ai.id.endsWith("0") ? 1 : -1);
    } else {
      st.wanderAngle = _normalizeAngle(
        st.wanderAngle + (Math.random() - 0.5) * 0.07,
      );
      desiredAngle = toTargetAngle + st.wanderAngle * 0.12;
    }

    const baseTurnRate = nearWall ? 0.13 : st.turnSpd;
    const waveTurn = baseTurnRate * Math.min(1.5, 1 + (wave.value - 1) * 0.08);
    const da = _normalizeAngle(desiredAngle - ai.angle);
    ai.angle += Math.sign(da) * Math.min(Math.abs(da), waveTurn);
    ai.angle = _normalizeAngle(ai.angle);

    // Thrust & velocity
    ai.thrustOn = !(st.state === "circle" && bestDist < 100);
    const effSpd = ai.speedBoost ? ai.speed * 1.4 : ai.speed;
    if (ai.thrustOn) {
      ai.vx += Math.cos(ai.angle) * ai.accel;
      ai.vy += Math.sin(ai.angle) * ai.accel;
    } else {
      ai.vx *= 0.93;
      ai.vy *= 0.93;
    }
    ai.vx *= ai.drag;
    ai.vy *= ai.drag;
    const spd = Math.hypot(ai.vx, ai.vy);
    if (spd > effSpd) {
      ai.vx = (ai.vx / spd) * effSpd;
      ai.vy = (ai.vy / spd) * effSpd;
    }
    if (spd < 0.5 && ai.thrustOn) {
      ai.vx += Math.cos(ai.angle) * 0.5;
      ai.vy += Math.sin(ai.angle) * 0.5;
    }

    ai.x += ai.vx;
    ai.y += ai.vy;

    // Hard wall clamp
    const PAD = 25;
    if (ai.x < PAD) {
      ai.x = PAD;
      ai.vx = Math.abs(ai.vx);
    }
    if (ai.x > W - PAD) {
      ai.x = W - PAD;
      ai.vx = -Math.abs(ai.vx);
    }
    if (ai.y < PAD) {
      ai.y = PAD;
      ai.vy = Math.abs(ai.vy);
    }
    if (ai.y > H - PAD) {
      ai.y = H - PAD;
      ai.vy = -Math.abs(ai.vy);
    }

    ai.trail.push({ x: ai.x, y: ai.y });
    if (ai.trail.length > 16) ai.trail.shift();

    // Power-up pickup
    gs.powerUps
      .filter((pu) => !pu.collected)
      .forEach((pu) => {
        if (Math.hypot(pu.x - ai.x, pu.y - ai.y) < 22)
          collectPowerUp(ai, pu, gs);
      });

    // Firing
    const baseAimErr = st.style === "sniper" ? 0.16 : 0.24;
    const waveErr = Math.max(0.08, baseAimErr - (wave.value - 1) * 0.02);
    const aimErr = Math.abs(_normalizeAngle(toTargetAngle - ai.angle));
    const maxDist = st.style === "sniper" ? 320 : 270;
    if (
      st.fireTimer === 0 &&
      ai.ammo > 0 &&
      bestDist < maxDist &&
      aimErr < waveErr &&
      st.state !== "retreat"
    ) {
      fireBullet(ai, gs);
      st.fireTimer = (st.style === "aggressive" ? 14 : 20) + Math.random() * 16;
    }

    // AI ability
    if (ai.abilityCd === 0 && Math.random() < 0.008) activateAbility(ai, gs);

    ai.reloadTimer = Math.max(0, ai.reloadTimer - 1);
    ai.ammoTimer++;
    if (ai.ammoTimer >= AMMO_REGEN && ai.ammo < MAX_AMMO) {
      ai.ammo++;
      ai.ammoTimer = 0;
    }
    if (ai.speedBoostTimer > 0) {
      ai.speedBoostTimer--;
      if (ai.speedBoostTimer <= 0) ai.speedBoost = false;
    }
  };

  // ── Fire bullet ─────────────────────────────────────────────────────────────
  const fireBullet = (plane, gs) => {
    if (plane.reloadTimer > 0 || plane.ammo <= 0) return;
    plane.ammo--;
    plane.reloadTimer = RELOAD_FRAMES;
    const spread = plane.burstActive ? (Math.random() - 0.5) * 0.08 : 0;
    gs.bullets.push({
      x: plane.x + Math.cos(plane.angle) * 24,
      y: plane.y + Math.sin(plane.angle) * 24,
      angle: plane.angle + spread,
      ownerId: plane.id,
      dmg: 12 + Math.random() * 6,
      life: BULLET_LIFE,
      color: plane.color,
    });
  };

  // ── Kill / respawn ──────────────────────────────────────────────────────────
  const killPlane = (plane, killerId, gs) => {
    if (plane.dead) return;
    spawnExplosion(plane.x, plane.y, true, gs);
    plane.dead = true;
    plane.hp = 0;
    plane.respawnTimer = plane.isAI
      ? Math.max(120, 180 - wave.value * 10)
      : Infinity;

    const killer = gs.planes.find((p) => p.id === killerId);
    const killName = killer ? killer.name : "Unknown";

    if (killer?.isMe) {
      killer.kills++;
      myKills.value = killer.kills;
      const s = killer.kills;
      if (s === 3) showStreak("HAT TRICK! 🎯");
      else if (s === 5) showStreak("ON FIRE! 🔥");
      else if (s === 7) showStreak("UNSTOPPABLE! ⚡");
      else if (s % 5 === 0 && s > 7) showStreak(`${s} KILLS! 💀`);
      sounds.kill();
    } else if (killer && !killer.isMe && !killer.isAI) {
      killer.kills++;
    }

    if (plane.isMe) {
      renderer.triggerShake(20);
      sounds.explosion(true);
      pushKillFeed("✈ You were shot down!");
    } else sounds.explosion(true);

    pushKillFeed(`${killName} ↯ ${plane.name}`);
  };

  const respawnPlane = (plane, W, H) => {
    plane.dead = false;
    plane.hp = plane.maxHp;
    plane.x = 40 + Math.random() * (W - 80);
    plane.y = 40 + Math.random() * (H - 100);
    plane.vx = 0;
    plane.vy = 0;
    plane.angle = Math.random() * Math.PI * 2;
    plane.trail = [];
    plane.damageDealt = 0;
  };

  const spawnExplosion = (x, y, big, gs) => {
    gs.explosions.push({
      x,
      y,
      r: big ? 10 : 5,
      life: big ? 45 : 22,
      big,
      sparks: big
        ? Array.from({ length: 8 }, () => ({
            dx: Math.cos(Math.random() * Math.PI * 2),
            dy: Math.sin(Math.random() * Math.PI * 2),
          }))
        : null,
    });
  };

  // ── End condition ───────────────────────────────────────────────────────────
  const checkEndCondition = (gs) => {
    const humanPlanes = gs.planes.filter((p) => !p.isAI);
    const aliveHumans = humanPlanes.filter((p) => !p.dead);
    const isMulti = humanPlanes.length > 1;

    if (isMulti) {
      if (aliveHumans.length <= 1) endGame(gs);
    } else {
      const me = gs.planes.find((p) => p.isMe);
      const aliveEnemies = gs.planes.filter((p) => !p.isMe && !p.dead);
      if (!me || me.dead || aliveEnemies.length === 0) endGame(gs);
    }
  };

  const endGame = (gs, forcedWinner = null) => {
    if (phase.value === "ending" || phase.value === "results") return;
    phase.value = "ending";
    cancelAnimationFrame(animId);
    renderer.draw(gs);

    const scores = gs.planes
      .filter((p) => !p.isAI)
      .map((p) => ({ name: p.name, kills: p.kills, assists: p.assists || 0 }))
      .sort((a, b) => b.kills - a.kills);

    sortedFinalScores.value = scores;

    if (forcedWinner) {
      resultsWinner.value = forcedWinner;
    } else {
      resultsWinner.value = scores[0]?.name || "Nobody";
      room.broadcast({
        type: "game-event",
        subtype: "end",
        winner: resultsWinner.value,
      });
    }

    const isWinner = resultsWinner.value === room.myName.value;
    setTimeout(() => {
      isWinner ? sounds.victory() : sounds.defeat();
    }, 300);
    setTimeout(() => {
      phase.value = "results";
    }, 1800);
  };

  // ── Networking ──────────────────────────────────────────────────────────────
  const broadcastMyState = (me) => {
    if (gameState.frame % 2 !== 0) return;
    room.broadcast({
      type: "game-state",
      id: me.id,
      x: Math.round(me.x),
      y: Math.round(me.y),
      angle: +me.angle.toFixed(3),
      vx: +me.vx.toFixed(2),
      vy: +me.vy.toFixed(2),
      hp: me.hp,
      kills: me.kills,
      thrustOn: me.thrustOn,
      trail: me.trail.slice(-6),
    });
  };

  const handleNetworkMessage = (data) => {
    if (data.type === "game-lobby") {
      if (data.subtype === "ping") {
        if (!room.myPeerId.value) return;
        room.broadcast({
          type: "game-lobby",
          subtype: "player-status",
          peerId: room.myPeerId.value,
          name: room.myName.value,
          planeId: chosenPlane.value,
          planeIcon: myPlaneIcon.value,
          ready: imReady.value,
        });
        return;
      }
      if (data.subtype === "player-status") {
        if (
          phase.value !== "lobby" ||
          !data.peerId ||
          data.peerId === room.myPeerId.value
        )
          return;
        const existing = lobbyPlayers.value.find(
          (p) => p.peerId === data.peerId,
        );
        if (existing) {
          Object.assign(existing, {
            planeId: data.planeId,
            planeIcon: data.planeIcon,
            ready: data.ready,
            name: data.name,
          });
          lobbyPlayers.value = [...lobbyPlayers.value];
        } else
          lobbyPlayers.value.push({
            peerId: data.peerId,
            name: data.name,
            planeId: data.planeId,
            planeIcon: data.planeIcon,
            ready: data.ready,
          });
        checkAllReady();
        return;
      }
      if (data.subtype === "start" && phase.value === "lobby") {
        startGame();
        return;
      }
      if (data.subtype === "reset") {
        phase.value = "lobby";
        imReady.value = false;
        lobbyPlayers.value = [];
        killFeed.value = [];
        cancelAnimationFrame(animId);
        gameState = null;
        setTimeout(broadcastLobby, 200);
      }
      return;
    }

    if (!gameState) return;

    if (data.type === "game-state") {
      const p = gameState.planes.find((pl) => pl.id === data.id);
      if (p && !p.isMe) {
        p.targetX = data.x;
        p.targetY = data.y;
        p.angle = data.angle;
        p.vx = data.vx;
        p.vy = data.vy;
        p.hp = data.hp;
        p.kills = data.kills;
        p.thrustOn = data.thrustOn;
        p.trail = data.trail || [];
        p.dead = data.hp <= 0;
        p.lastSeen = gameState.frame;
      }
      return;
    }

    if (data.type === "game-hit") {
      const victim = gameState.planes.find((p) => p.id === data.victimId);
      if (victim && !victim.dead) {
        victim.hp = data.hp;
        spawnExplosion(data.x, data.y, false, gameState);
        if (victim.isMe) {
          renderer.triggerShake(8);
          sounds.hit();
        }
        if (victim.hp <= 0 && !victim.dead)
          killPlane(victim, data.shooterId, gameState);
      }
      return;
    }

    if (data.type === "game-event" && data.subtype === "end") {
      if (phase.value === "playing") endGame(gameState, data.winner);
    }
  };

  // ── Kill feed / floating text ────────────────────────────────────────────────
  const pushKillFeed = (text) => {
    const id = Date.now() + Math.random();
    killFeed.value.push({ id, text });
    setTimeout(() => {
      killFeed.value = killFeed.value.filter((k) => k.id !== id);
    }, 3500);
  };

  const pushFloatingText = (text, x, y, color = "#fff") => {
    floatingTexts.value.push({
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
      life: 80,
    });
  };

  const showStreak = (text) => {
    streakText.value = text;
    streakVisible.value = true;
    setTimeout(() => {
      streakVisible.value = false;
    }, 2200);
  };

  // ── Back to lobby ────────────────────────────────────────────────────────────
  const backToLobby = () => {
    sounds.uiClick();
    cancelAnimationFrame(animId);
    gameState = null;
    phase.value = "lobby";
    imReady.value = false;
    lobbyPlayers.value = [];
    killFeed.value = [];
    myKills.value = 0;
    myHp.value = 100;
    myAmmo.value = MAX_AMMO;
    room.broadcast({ type: "game-lobby", subtype: "reset" });
    setTimeout(() => {
      room.broadcast({ type: "game-lobby", subtype: "ping" });
      broadcastLobby();
    }, 300);
  };

  // ── Resize ───────────────────────────────────────────────────────────────────
  const resize = () => {
    isMobile.value =
      window.innerWidth < 1024 &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (!wrapperRef.value) return;
    const rect = wrapperRef.value.getBoundingClientRect();
    if (rect.width === 0) return;
    const w = Math.min(rect.width, CANVAS_BASE_W);
    const h = Math.round(w * (CANVAS_BASE_H / CANVAS_BASE_W));
    canvasW.value = w;
    canvasH.value = h;
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  const mount = () => {
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));

    unsubscribe = room.onMessage((data) => handleNetworkMessage(data));

    watch(
      () => room.members?.value,
      (members, prev) => {
        if (phase.value !== "lobby") return;
        const prevIds = (prev || []).map((m) => m.peerId);
        if (members?.some((m) => !prevIds.includes(m.peerId)))
          setTimeout(broadcastLobby, 200);
      },
      { deep: true },
    );

    watch(chosenPlane, () => {
      if (phase.value === "lobby") broadcastLobby();
    });

    setTimeout(() => {
      room.broadcast({ type: "game-lobby", subtype: "ping" });
      broadcastLobby();
    }, 400);
    setTimeout(() => {
      if (phase.value === "lobby") {
        room.broadcast({ type: "game-lobby", subtype: "ping" });
        broadcastLobby();
      }
    }, 1200);

    lobbyPingInterval = setInterval(() => {
      if (phase.value !== "lobby") return;
      room.broadcast({ type: "game-lobby", subtype: "ping" });
      broadcastLobby();
    }, 4000);
  };

  const unmount = () => {
    cancelAnimationFrame(animId);
    clearInterval(lobbyPingInterval);
    window.removeEventListener("resize", resize);
    if (unsubscribe) unsubscribe();
  };

  // ── Utilities ─────────────────────────────────────────────────────────────────
  const _normalizeAngle = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };

  // ── Public API ─────────────────────────────────────────────────────────────────
  return {
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
    mount,
    unmount,
    resize,
    planeTypes,
    mobileJoystick,
  };
}
