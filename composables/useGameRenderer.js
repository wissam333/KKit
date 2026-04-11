// composables/useGameRenderer.js
// All canvas drawing logic — separated from game logic for clean architecture

export function useGameRenderer(canvasRef, canvasW, canvasH) {
  let ctx = null;
  let shakeX = 0;
  let shakeY = 0;
  let shakeFrames = 0;

  const init = () => {
    const canvas = canvasRef.value;
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    return true;
  };

  const triggerShake = (intensity = 12) => {
    shakeX = (Math.random() - 0.5) * intensity;
    shakeY = (Math.random() - 0.5) * intensity;
    shakeFrames = 6;
  };

  const draw = (gs) => {
    if (!ctx || !gs) return;
    const W = canvasW.value;
    const H = canvasH.value;

    // Screen shake
    ctx.save();
    if (shakeFrames > 0) {
      ctx.translate(shakeX * (shakeFrames / 6), shakeY * (shakeFrames / 6));
      shakeFrames--;
    }

    // Sky gradient — deep night sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#04080f");
    sky.addColorStop(0.35, "#0d1f3c");
    sky.addColorStop(0.7, "#1a4a6e");
    sky.addColorStop(1, "#2a6640");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars — deterministic, twinkle via frame
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % W;
      const sy = (i * 23.7) % (H * 0.45);
      const twinkle = Math.sin(gs.frame * 0.04 + i) * 0.4 + 0.6;
      ctx.globalAlpha = twinkle * 0.7;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    // Moon
    _drawMoon(W);

    // Clouds with parallax layers
    _drawClouds(gs.clouds, W);

    // Mountains background
    _drawMountains(W, H, gs.frame);

    // Ground
    _drawGround(W, H, gs.trees, gs.frame);

    // Power-ups
    if (gs.powerUps) {
      gs.powerUps.forEach((pu) => _drawPowerUp(pu, gs.frame));
    }

    // Bullets
    gs.bullets.forEach((b) => _drawBullet(b));

    // Explosions
    gs.explosions.forEach((e) => _drawExplosion(e));

    // Planes
    gs.planes.forEach((p) => {
      if (!p.dead) _drawPlane(p);
    });

    ctx.restore();
  };

  // ── Private draw helpers ───────────────────────────────────────────────────

  const _drawMoon = (W) => {
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#c8e6fa";
    ctx.fillStyle = "#e8f4fd";
    ctx.beginPath();
    ctx.arc(W - 70, 50, 24, 0, Math.PI * 2);
    ctx.fill();
    // Crater detail
    ctx.fillStyle = "#d0e8f8";
    ctx.beginPath();
    ctx.arc(W - 62, 44, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W - 76, 56, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const _drawClouds = (clouds, W) => {
    clouds.forEach((c) => {
      ctx.save();
      ctx.globalAlpha = c.alpha || 0.15;
      ctx.fillStyle = c.layer === 1 ? "#c8dff0" : "#a8c8e0";
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(c.x + c.r * 0.65, c.y - c.r * 0.3, c.r * 0.72, 0, Math.PI * 2);
      ctx.arc(c.x - c.r * 0.5, c.y - c.r * 0.2, c.r * 0.58, 0, Math.PI * 2);
      ctx.arc(c.x + c.r * 0.2, c.y - c.r * 0.45, c.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const _drawMountains = (W, H, frame) => {
    // Far mountains
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#1a3a5c";
    ctx.beginPath();
    ctx.moveTo(0, H - 80);
    const peaks = [
      [W * 0.05, H - 160],
      [W * 0.15, H - 100],
      [W * 0.25, H - 190],
      [W * 0.38, H - 130],
      [W * 0.5, H - 200],
      [W * 0.62, H - 110],
      [W * 0.75, H - 175],
      [W * 0.88, H - 120],
      [W, H - 150],
      [W, H - 80],
    ];
    peaks.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const _drawGround = (W, H, trees, frame) => {
    // Main ground
    ctx.fillStyle = "#1e3d0f";
    ctx.fillRect(0, H - 42, W, 42);

    // Ground texture strips
    ctx.fillStyle = "#162e09";
    ctx.fillRect(0, H - 42, W, 5);
    ctx.fillStyle = "#253d14";
    ctx.fillRect(0, H - 28, W, 3);

    // Scrolling road
    const roadX = (frame * 1.2) % 60;
    ctx.fillStyle = "#2a4a18";
    ctx.fillRect(0, H - 22, W, 6);
    ctx.fillStyle = "#3d6622";
    for (let i = -60; i < W + 60; i += 60) {
      ctx.fillRect(i + roadX, H - 20, 30, 2);
    }

    // Trees
    trees.forEach((t) => {
      // Trunk
      ctx.fillStyle = "#3d2010";
      ctx.fillRect(t.x + 4, H - 42, 4, 10);

      // Tree layers
      const layers = [
        { yOff: 0, w: 14 },
        { yOff: -t.h * 0.45, w: 11 },
        { yOff: -t.h * 0.85, w: 8 },
      ];
      layers.forEach((l) => {
        ctx.fillStyle = l === layers[0] ? "#1e4a10" : "#2a6614";
        ctx.beginPath();
        ctx.moveTo(t.x, H - 38 + l.yOff);
        ctx.lineTo(t.x + 6, H - 38 - t.h + l.yOff);
        ctx.lineTo(t.x + l.w, H - 38 + l.yOff);
        ctx.closePath();
        ctx.fill();
      });
    });
  };

  const _drawPowerUp = (pu, frame) => {
    if (pu.collected) return;
    const pulse = Math.sin(frame * 0.08) * 4;
    const bob = Math.sin(frame * 0.05 + pu.phase) * 5;

    ctx.save();
    ctx.shadowBlur = 16 + pulse;
    ctx.shadowColor = pu.glowColor;

    // Outer ring
    ctx.strokeStyle = pu.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + Math.sin(frame * 0.06) * 0.2;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y + bob, 18 + pulse * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Inner fill
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = pu.color + "33";
    ctx.beginPath();
    ctx.arc(pu.x, pu.y + bob, 14, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.globalAlpha = 1;
    ctx.fillStyle = pu.color;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pu.icon, pu.x, pu.y + bob);

    // Countdown ring
    const lifeRatio = pu.life / pu.maxLife;
    ctx.strokeStyle = pu.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(
      pu.x,
      pu.y + bob,
      20,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * lifeRatio,
    );
    ctx.stroke();

    ctx.restore();
    ctx.textBaseline = "alphabetic";
  };

  const _drawBullet = (b) => {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffeb3b";
    ctx.fillStyle = "#fff9c4";
    // Elongated bullet
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tracer glow
    ctx.fillStyle = "#ffeb3b";
    ctx.beginPath();
    ctx.ellipse(-4, 0, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const _drawExplosion = (e) => {
    const maxLife = e.big ? 45 : 22;
    const alpha = Math.max(0, Math.min(1, e.life / maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#ff6d00";

    const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
    grad.addColorStop(0, "#fffde7");
    grad.addColorStop(0.2, "#ffcc02");
    grad.addColorStop(0.5, "#ff6d00");
    grad.addColorStop(0.8, "#d32f2f");
    grad.addColorStop(1, "rgba(211,47,47,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();

    // Sparks for big explosions
    if (e.big && e.sparks) {
      e.sparks.forEach((s) => {
        ctx.strokeStyle = "#ffcc02";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(
          e.x + s.dx * (1 - alpha) * 30,
          e.y + s.dy * (1 - alpha) * 30,
        );
        ctx.stroke();
      });
    }
    ctx.restore();
  };

  const _drawPlane = (plane) => {
    const { x, y, angle, color, trail, thrustOn, hp, maxHp, name, isMe } =
      plane;

    // Trail
    if (trail.length > 1) {
      ctx.save();
      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.5;
        ctx.strokeStyle = thrustOn
          ? `rgba(200,240,255,${alpha})`
          : `rgba(160,200,230,${alpha * 0.5})`;
        ctx.lineWidth = thrustOn ? 2.5 : 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Thrust flame
    if (thrustOn) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI);
      ctx.globalAlpha = 0.75 + Math.random() * 0.25;
      const flameLen = 16 + Math.random() * 10;
      const fg = ctx.createLinearGradient(8, 0, 8 + flameLen, 0);
      fg.addColorStop(0, "#fff9c4");
      fg.addColorStop(0.3, "#ffcc02");
      fg.addColorStop(0.7, "#ff6d00");
      fg.addColorStop(1, "rgba(255,61,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.quadraticCurveTo(
        8 + flameLen * 0.5,
        (Math.random() - 0.5) * 8,
        8 + flameLen,
        0,
      );
      ctx.quadraticCurveTo(8 + flameLen * 0.5, (Math.random() - 0.5) * 8, 8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Barrel roll effect
    if (plane.rolling) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(1, Math.cos(plane.rollAngle || 0));
      ctx.restore();
    }

    // Draw plane body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowBlur = isMe ? 18 : 10;
    ctx.shadowColor = isMe ? "#4fc3f7cc" : color + "aa";

    // Fuselage
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 23, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker belly
    const belly = ctx.createLinearGradient(0, -6, 0, 6);
    belly.addColorStop(0, color);
    belly.addColorStop(1, "#0008");
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(0, 0, 23, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose cone
    ctx.fillStyle = "#ffffffbb";
    ctx.beginPath();
    ctx.moveTo(23, 0);
    ctx.lineTo(32, -2.5);
    ctx.lineTo(32, 2.5);
    ctx.closePath();
    ctx.fill();

    // Propeller
    const propSpin = Date.now() * 0.02;
    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(32, Math.cos(propSpin) * 8);
    ctx.lineTo(32, -Math.cos(propSpin) * 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(32 + Math.sin(propSpin) * 8, 0);
    ctx.lineTo(32 - Math.sin(propSpin) * 8, 0);
    ctx.stroke();

    // Top wing
    const wg = ctx.createLinearGradient(0, -18, 0, -4);
    wg.addColorStop(0, color + "cc");
    wg.addColorStop(1, color);
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(4, -5);
    ctx.lineTo(-15, -20);
    ctx.lineTo(-20, -17);
    ctx.lineTo(-7, -5);
    ctx.closePath();
    ctx.fill();

    // Bottom wing
    const wg2 = ctx.createLinearGradient(0, 5, 0, 20);
    wg2.addColorStop(0, color);
    wg2.addColorStop(1, color + "cc");
    ctx.fillStyle = wg2;
    ctx.beginPath();
    ctx.moveTo(4, 5);
    ctx.lineTo(-15, 20);
    ctx.lineTo(-20, 17);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.fill();

    // Tail fin
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-19, -2);
    ctx.lineTo(-28, -11);
    ctx.lineTo(-25, -2);
    ctx.closePath();
    ctx.fill();

    // Cockpit glass
    const cg = ctx.createRadialGradient(9, -3, 0, 9, -2, 7);
    cg.addColorStop(0, "#e3f2fd");
    cg.addColorStop(1, "#1565c0aa");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(9, -2, 6.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // My-plane highlight ring
    if (isMe) {
      ctx.strokeStyle = "#4fc3f7";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Invincibility shimmer (barrel roll)
    if (plane.invincible) {
      ctx.strokeStyle = "#fff176";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // HP bar
    const barW = 40,
      barH = 5;
    const hpFrac = Math.max(0, hp / maxHp);
    ctx.fillStyle = "#00000066";
    ctx.beginPath();
    ctx.roundRect(x - barW / 2, y - 38, barW, barH, 2);
    ctx.fill();
    const hpColor =
      hpFrac > 0.5 ? "#66bb6a" : hpFrac > 0.25 ? "#ffa726" : "#ef5350";
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(x - barW / 2, y - 38, barW * hpFrac, barH, 2);
    ctx.fill();

    // Name tag
    ctx.fillStyle = isMe ? "#4fc3f7" : "#ffffffcc";
    ctx.font = isMe
      ? 'bold 10px "Courier New", monospace'
      : '9px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.fillText(name, x, y - 43);

    // Ability cooldown indicator (if applicable)
    if (isMe && plane.abilityMaxCd > 0) {
      const cdFrac = 1 - plane.abilityCd / plane.abilityMaxCd;
      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y - 48, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdFrac);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  return { init, draw, triggerShake };
}
