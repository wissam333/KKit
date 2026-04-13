// composables/usePong.js
// Peer-to-peer Pong — host owns ball physics, clients mirror state.
// dt is in frame-units (~1.0 per frame at 60fps), same convention as useSkymatch.

import { ref, computed, nextTick } from "vue";

const CANVAS_W = 800;
const CANVAS_H = 500;
const PADDLE_W = 14;
const PADDLE_H = 90;
const BALL_SIZE = 12;
const PADDLE_SPEED = 6.5;
const BALL_SPEED_INIT = 5.5;
const BALL_SPEED_MAX = 12;
const WINNING_SCORE = 3;
const TARGET_FPS = 60;
const TARGET_FRAME_MS = 1000 / TARGET_FPS;

let lastTimestamp = 0;

export function usePong(room, canvasRef, wrapperRef) {
  // ── Reactive state ──────────────────────────────────────────────────────────
  const phase = ref("lobby"); // lobby | playing | results
  const isMobile = ref(false);
  const myScore = ref(0);
  const oppScore = ref(0);
  const winner = ref("");
  const countdown = ref(0);
  const opponentName = ref("Waiting...");
  const opponentReady = ref(false);
  const imReady = ref(false);
  const canvasW = ref(CANVAS_W);
  const canvasH = ref(CANVAS_H);

  // ── Host detection (same strategy as SkyAces) ──────────────────────────────
  // The peer whose ID sorts first alphabetically is the host (owns ball).
  const lobbyPeers = ref([]);
  const amHost = computed(() => {
    const allIds = [
      room.myPeerId.value,
      ...lobbyPeers.value.map((p) => p.peerId),
    ];
    return allIds.sort()[0] === room.myPeerId.value;
  });

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys = { up: false, down: false };
  const mobileUp = ref(false);
  const mobileDown = ref(false);

  const onKey = (e, val) => {
    if (["w", "W", "ArrowUp"].includes(e.key)) keys.up = val;
    if (["s", "S", "ArrowDown"].includes(e.key)) keys.down = val;
  };

  // ── Game state (plain object, not reactive — updated each frame) ────────────
  let gs = null;
  let animId = null;
  let ctx = null;
  let unsubscribe = null;
  let countdownInterval = null;

  // ── Build initial game state ────────────────────────────────────────────────
  const buildGameState = () => {
    const W = canvasW.value;
    const H = canvasH.value;
    gs = {
      // Left paddle = host, Right paddle = guest
      leftY: H / 2 - PADDLE_H / 2,
      rightY: H / 2 - PADDLE_H / 2,
      ballX: W / 2,
      ballY: H / 2,
      ballVx: BALL_SPEED_INIT * (Math.random() > 0.5 ? 1 : -1),
      ballVy: BALL_SPEED_INIT * (Math.random() > 0.5 ? 0.6 : -0.6),
      leftScore: 0,
      rightScore: 0,
      frame: 0,
      // Particles for goal celebrations
      particles: [],
      // Trail for ball
      trail: [],
    };
  };

  // ── Resize ──────────────────────────────────────────────────────────────────
  const resize = () => {
    isMobile.value =
      window.innerWidth < 1024 &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (!wrapperRef?.value) return;
    const rect = wrapperRef.value.getBoundingClientRect();
    if (!rect.width) return;
    const w = Math.min(rect.width, CANVAS_W);
    const h = Math.round(w * (CANVAS_H / CANVAS_W));
    canvasW.value = w;
    canvasH.value = h;
  };

  // ── Canvas init ─────────────────────────────────────────────────────────────
  const initCanvas = (attempt = 0) => {
    const canvas = canvasRef.value;
    if (!canvas) {
      if (attempt < 20) setTimeout(() => initCanvas(attempt + 1), 50);
      return;
    }
    ctx = canvas.getContext("2d");
    resize();
    cancelAnimationFrame(animId);
    lastTimestamp = 0;
    animId = requestAnimationFrame(gameLoop);
  };

  // ── Game loop ───────────────────────────────────────────────────────────────
  const gameLoop = (timestamp) => {
    if (phase.value !== "playing") return;
    const raw = lastTimestamp ? timestamp - lastTimestamp : TARGET_FRAME_MS;
    const dt = Math.min(raw / TARGET_FRAME_MS, 2.0);
    lastTimestamp = timestamp;
    update(dt);
    draw();
    animId = requestAnimationFrame(gameLoop);
  };

  // ── Scale helper: converts logical coords to canvas coords ─────────────────
  const sx = (x) => (x / CANVAS_W) * canvasW.value;
  const sy = (y) => (y / CANVAS_H) * canvasH.value;
  const sw = (w) => (w / CANVAS_W) * canvasW.value;
  const sh = (h) => (h / CANVAS_H) * canvasH.value;

  // ── Update ──────────────────────────────────────────────────────────────────
  const update = (dt) => {
    if (!gs) return;
    gs.frame++;
    const W = CANVAS_W;
    const H = CANVAS_H;

    // ── My paddle ──
    // Host = left, Guest = right
    const myUp = keys.up || mobileUp.value;
    const myDown = keys.down || mobileDown.value;

    if (amHost.value) {
      if (myUp) gs.leftY -= PADDLE_SPEED * dt;
      if (myDown) gs.leftY += PADDLE_SPEED * dt;
      gs.leftY = Math.max(0, Math.min(H - PADDLE_H, gs.leftY));
    } else {
      if (myUp) gs.rightY -= PADDLE_SPEED * dt;
      if (myDown) gs.rightY += PADDLE_SPEED * dt;
      gs.rightY = Math.max(0, Math.min(H - PADDLE_H, gs.rightY));
    }

    // Broadcast my paddle position every frame
    broadcastPaddle();

    // Only host simulates ball
    if (amHost.value) {
      // Ball trail
      gs.trail.push({ x: gs.ballX, y: gs.ballY });
      if (gs.trail.length > 10) gs.trail.shift();

      gs.ballX += gs.ballVx * dt;
      gs.ballY += gs.ballVy * dt;

      // Top / bottom wall bounce
      if (gs.ballY - BALL_SIZE / 2 <= 0) {
        gs.ballY = BALL_SIZE / 2;
        gs.ballVy = Math.abs(gs.ballVy);
      }
      if (gs.ballY + BALL_SIZE / 2 >= H) {
        gs.ballY = H - BALL_SIZE / 2;
        gs.ballVy = -Math.abs(gs.ballVy);
      }

      // Left paddle collision
      const lx = PADDLE_W + 8;
      if (
        gs.ballX - BALL_SIZE / 2 <= lx + PADDLE_W &&
        gs.ballX + BALL_SIZE / 2 >= lx &&
        gs.ballY >= gs.leftY &&
        gs.ballY <= gs.leftY + PADDLE_H &&
        gs.ballVx < 0
      ) {
        const hitPos = (gs.ballY - gs.leftY) / PADDLE_H - 0.5; // -0.5 to 0.5
        const angle = hitPos * 1.2; // radians
        const spd = Math.min(
          Math.hypot(gs.ballVx, gs.ballVy) * 1.07,
          BALL_SPEED_MAX,
        );
        gs.ballVx = Math.cos(angle) * spd;
        gs.ballVy = Math.sin(angle) * spd;
        gs.ballX = lx + PADDLE_W + BALL_SIZE / 2 + 1;
        spawnParticles(gs.ballX, gs.ballY, "#4fc3f7");
      }

      // Right paddle collision
      const rx = W - PADDLE_W - 8 - PADDLE_W;
      if (
        gs.ballX + BALL_SIZE / 2 >= rx &&
        gs.ballX - BALL_SIZE / 2 <= rx + PADDLE_W &&
        gs.ballY >= gs.rightY &&
        gs.ballY <= gs.rightY + PADDLE_H &&
        gs.ballVx > 0
      ) {
        const hitPos = (gs.ballY - gs.rightY) / PADDLE_H - 0.5;
        const angle = Math.PI - hitPos * 1.2;
        const spd = Math.min(
          Math.hypot(gs.ballVx, gs.ballVy) * 1.07,
          BALL_SPEED_MAX,
        );
        gs.ballVx = -Math.abs(Math.cos(angle) * spd);
        gs.ballVy = Math.sin(angle) * spd;
        gs.ballX = rx - BALL_SIZE / 2 - 1;
        spawnParticles(gs.ballX, gs.ballY, "#ffd54f");
      }

      // Scoring
      if (gs.ballX < -BALL_SIZE) {
        gs.rightScore++;
        broadcastScore();
        resetBall("right");
        return;
      }
      if (gs.ballX > W + BALL_SIZE) {
        gs.leftScore++;
        broadcastScore();
        resetBall("left");
        return;
      }

      // Broadcast ball state every frame
      broadcastBall();

      // Check win
      if (gs.leftScore >= WINNING_SCORE || gs.rightScore >= WINNING_SCORE) {
        endGame();
      }
    }

    // Particles
    gs.particles = gs.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });

    // Sync HUD reactives
    myScore.value = amHost.value ? gs.leftScore : gs.rightScore;
    oppScore.value = amHost.value ? gs.rightScore : gs.leftScore;
  };

  // ── Reset ball after goal ───────────────────────────────────────────────────
  const resetBall = (scoredSide) => {
    gs.trail = [];
    gs.ballX = CANVAS_W / 2;
    gs.ballY = CANVAS_H / 2;
    // Launch toward the player who just conceded
    const dir = scoredSide === "left" ? -1 : 1;
    const angle = (Math.random() - 0.5) * 0.8;
    gs.ballVx = BALL_SPEED_INIT * dir * Math.cos(angle);
    gs.ballVy = BALL_SPEED_INIT * Math.sin(angle);
    spawnParticles(CANVAS_W / 2, CANVAS_H / 2, "#ffffff");
  };

  // ── Particles ───────────────────────────────────────────────────────────────
  const spawnParticles = (x, y, color) => {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;
      gs.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color,
        r: 2 + Math.random() * 3,
      });
    }
  };

  // ── Draw ────────────────────────────────────────────────────────────────────
  const draw = () => {
    if (!ctx || !gs) return;
    const W = canvasW.value;
    const H = canvasH.value;

    // Background
    ctx.fillStyle = "#04080f";
    ctx.fillRect(0, 0, W, H);

    // Court lines
    ctx.strokeStyle = "#0d2040";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, sh(40), 0, Math.PI * 2);
    ctx.stroke();

    // Ball trail
    gs.trail.forEach((t, i) => {
      const alpha = (i / gs.trail.length) * 0.35;
      const r = sh((BALL_SIZE / 2) * (i / gs.trail.length));
      ctx.beginPath();
      ctx.arc(sx(t.x), sy(t.y), Math.max(1, r), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    // Ball
    const bx = sx(gs.ballX);
    const by = sy(gs.ballY);
    const br = sw(BALL_SIZE / 2);
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Left paddle
    const lx = sw(PADDLE_W + 8);
    const ly = sy(gs.leftY);
    const pw = sw(PADDLE_W);
    const ph = sh(PADDLE_H);
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#4fc3f7";
    ctx.fillStyle = "#4fc3f7";
    ctx.beginPath();
    ctx.roundRect(lx, ly, pw, ph, sw(3));
    ctx.fill();
    ctx.restore();

    // Right paddle
    const rx = W - sw(PADDLE_W + 8) - pw;
    const ry = sy(gs.rightY);
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffd54f";
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.roundRect(rx, ry, pw, ph, sw(3));
    ctx.fill();
    ctx.restore();

    // Particles
    gs.particles.forEach((p) => {
      const alpha = p.life / 1.0;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Scores
    ctx.font = `bold ${sw(48)}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#4fc3f740";
    ctx.fillText(gs.leftScore, W * 0.25, sh(70));
    ctx.fillStyle = "#ffd54f40";
    ctx.fillText(gs.rightScore, W * 0.75, sh(70));

    // Player labels
    ctx.font = `${sw(10)}px "Courier New", monospace`;
    ctx.fillStyle = "#4fc3f760";
    ctx.fillText(
      amHost.value ? room.myName.value : opponentName.value,
      W * 0.25,
      sh(88),
    );
    ctx.fillStyle = "#ffd54f60";
    ctx.fillText(
      amHost.value ? opponentName.value : room.myName.value,
      W * 0.75,
      sh(88),
    );

    // Controls hint (bottom)
    if (!isMobile.value) {
      ctx.font = `${sw(9)}px "Courier New", monospace`;
      ctx.fillStyle = "#1e3a5f";
      ctx.textAlign = "center";
      ctx.fillText("W / S  or  ↑ / ↓  to move", W / 2, H - sh(8));
    }
  };

  // ── Networking ──────────────────────────────────────────────────────────────
  const broadcastPaddle = () => {
    if (!gs) return;
    room.broadcast({
      type: "pong-paddle",
      y: amHost.value ? gs.leftY : gs.rightY,
      isHost: amHost.value,
    });
  };

  const broadcastBall = () => {
    if (!gs || !amHost.value) return;
    if (gs.frame % 2 !== 0) return; // every other frame
    room.broadcast({
      type: "pong-ball",
      x: gs.ballX,
      y: gs.ballY,
      vx: gs.ballVx,
      vy: gs.ballVy,
    });
  };

  const broadcastScore = () => {
    room.broadcast({
      type: "pong-score",
      left: gs.leftScore,
      right: gs.rightScore,
    });
  };

  const handleMessage = (data) => {
    if (data.type === "pong-ready") {
      opponentReady.value = true;
      opponentName.value = data.name || "Opponent";
      lobbyPeers.value = [{ peerId: data.peerId }];
      if (imReady.value) startCountdown();
      return;
    }

    if (!gs) return;

    if (data.type === "pong-paddle") {
      if (data.isHost) gs.leftY = data.y;
      else gs.rightY = data.y;
      return;
    }

    if (data.type === "pong-ball" && !amHost.value) {
      // Non-host mirrors ball from host with light prediction
      gs.ballX = data.x;
      gs.ballY = data.y;
      gs.ballVx = data.vx;
      gs.ballVy = data.vy;
      return;
    }

    if (data.type === "pong-score") {
      gs.leftScore = data.left;
      gs.rightScore = data.right;
      myScore.value = amHost.value ? gs.leftScore : gs.rightScore;
      oppScore.value = amHost.value ? gs.rightScore : gs.leftScore;
      gs.trail = [];
      return;
    }

    if (data.type === "pong-start") {
      startGame();
      return;
    }

    if (data.type === "pong-end") {
      winner.value = data.winner;
      phase.value = "results";
      cancelAnimationFrame(animId);
      return;
    }

    if (data.type === "pong-back-lobby") {
      backToLobby();
    }
  };

  // ── Lobby / ready flow ──────────────────────────────────────────────────────
  const toggleReady = () => {
    imReady.value = !imReady.value;
    room.broadcast({
      type: "pong-ready",
      name: room.myName.value,
      peerId: room.myPeerId.value,
    });
    if (imReady.value && opponentReady.value) startCountdown();
  };

  const startCountdown = () => {
    if (countdownInterval) return;
    countdown.value = 3;
    countdownInterval = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        if (amHost.value) {
          room.broadcast({ type: "pong-start" });
        }
        startGame();
      }
    }, 1000);
  };

  const startGame = () => {
    phase.value = "playing";
    myScore.value = 0;
    oppScore.value = 0;
    buildGameState();
    nextTick(() => nextTick(() => initCanvas()));
  };

  // ── End game ────────────────────────────────────────────────────────────────
  const endGame = () => {
    if (phase.value === "results") return;
    const leftWon = gs.leftScore >= WINNING_SCORE;
    // host = left, guest = right
    const winnerName = leftWon
      ? amHost.value
        ? room.myName.value
        : opponentName.value
      : amHost.value
        ? opponentName.value
        : room.myName.value;
    winner.value = winnerName;
    room.broadcast({ type: "pong-end", winner: winnerName });
    phase.value = "results";
    cancelAnimationFrame(animId);
  };

  // ── Back to lobby ───────────────────────────────────────────────────────────
  const backToLobby = () => {
    cancelAnimationFrame(animId);
    gs = null;
    phase.value = "lobby";
    imReady.value = false;
    opponentReady.value = false;
    countdown.value = 0;
    myScore.value = 0;
    oppScore.value = 0;
    lobbyPeers.value = [];
    room.broadcast({ type: "pong-back-lobby" });
  };

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  const mount = () => {
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));
    unsubscribe = room.onMessage(handleMessage);

    // Announce presence
    setTimeout(() => {
      room.broadcast({
        type: "pong-ready",
        name: room.myName.value,
        peerId: room.myPeerId.value,
      });
    }, 400);
  };

  const unmount = () => {
    cancelAnimationFrame(animId);
    clearInterval(countdownInterval);
    window.removeEventListener("resize", resize);
    if (unsubscribe) unsubscribe();
  };

  return {
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
  };
}
