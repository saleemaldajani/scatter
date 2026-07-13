(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const fleeEl = document.getElementById("flee-count");
  const resetBtn = document.getElementById("reset");

  const PALETTE = ["#7dffb3", "#5ce1e6", "#f0e68c", "#ff8f70", "#a8b4ff", "#ffb4d9"];
  const BALL_COUNT = 18;
  const FLEE_RADIUS = 140;
  const CLICK_IMPULSE = 22;
  const FRICTION = 0.985;
  const WALL_BOUNCE = 0.72;

  let balls = [];
  let flees = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointer = { x: -9999, y: -9999, down: false };
  let ripples = [];
  let lastTs = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnBalls() {
    balls = [];
    for (let i = 0; i < BALL_COUNT; i++) {
      const r = 14 + Math.random() * 22;
      balls.push({
        x: r + Math.random() * (width - r * 2),
        y: r + Math.random() * (height - r * 2),
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        r,
        color: PALETTE[i % PALETTE.length],
        wobble: Math.random() * Math.PI * 2,
        squash: 1,
      });
    }
  }

  function updateFleeCount() {
    fleeEl.textContent = flees === 1 ? "1 flee" : `${flees} flees`;
  }

  function scatterFrom(x, y, strength = CLICK_IMPULSE) {
    let hit = 0;
    for (const b of balls) {
      const dx = b.x - x;
      const dy = b.y - y;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist < FLEE_RADIUS + b.r) {
        const force = (1 - dist / (FLEE_RADIUS + b.r)) * strength;
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force;
        b.squash = 0.72;
        hit++;
      }
    }
    if (hit > 0) {
      flees += hit;
      updateFleeCount();
    }
    ripples.push({ x, y, life: 1, max: FLEE_RADIUS * 1.15 });
  }

  function softAvoidPointer(dt) {
    if (pointer.x < 0) return;
    for (const b of balls) {
      const dx = b.x - pointer.x;
      const dy = b.y - pointer.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const zone = 90 + b.r;
      if (dist < zone) {
        const push = (1 - dist / zone) * 28 * dt;
        b.vx += (dx / dist) * push;
        b.vy += (dy / dist) * push;
      }
    }
  }

  function resolveBallCollisions() {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const min = a.r + b.r;
        if (dist < min) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (min - dist) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const impact = dvx * nx + dvy * ny;
          if (impact > 0) {
            a.vx -= impact * nx * 0.55;
            a.vy -= impact * ny * 0.55;
            b.vx += impact * nx * 0.55;
            b.vy += impact * ny * 0.55;
          }
        }
      }
    }
  }

  function step(dt) {
    softAvoidPointer(dt);
    for (const b of balls) {
      b.wobble += dt * 2.2;
      b.vx *= FRICTION;
      b.vy *= FRICTION;
      b.x += b.vx;
      b.y += b.vy;
      b.squash += (1 - b.squash) * Math.min(1, dt * 8);

      if (b.x - b.r < 0) {
        b.x = b.r;
        b.vx = Math.abs(b.vx) * WALL_BOUNCE;
      } else if (b.x + b.r > width) {
        b.x = width - b.r;
        b.vx = -Math.abs(b.vx) * WALL_BOUNCE;
      }
      if (b.y - b.r < 0) {
        b.y = b.r;
        b.vy = Math.abs(b.vy) * WALL_BOUNCE;
      } else if (b.y + b.r > height) {
        b.y = height - b.r;
        b.vy = -Math.abs(b.vy) * WALL_BOUNCE;
      }
    }
    resolveBallCollisions();

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].life -= dt * 1.6;
      if (ripples[i].life <= 0) ripples.splice(i, 1);
    }
  }

  function drawBall(b, t) {
    const stretch = 1 + Math.min(0.35, Math.hypot(b.vx, b.vy) * 0.018);
    const angle = Math.atan2(b.vy, b.vx);
    const pulse = 1 + Math.sin(b.wobble + t * 0.001) * 0.03;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.scale(stretch * b.squash * pulse, (1 / stretch) * b.squash * pulse);

    const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, b.r * 0.1, 0, 0, b.r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.22, b.color);
    g.addColorStop(1, shade(b.color, -35));
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-b.r * 0.28, -b.r * 0.32, b.r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();
    ctx.restore();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
    const b = Math.min(255, Math.max(0, (n & 255) + amt));
    return `rgb(${r},${g},${b})`;
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);

    for (const r of ripples) {
      const radius = (1 - r.life) * r.max;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125, 255, 179, ${r.life * 0.55})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const b of balls) drawBall(b, t);
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    step(dt);
    draw(ts);
    requestAnimationFrame(frame);
  }

  function pointerPos(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  canvas.addEventListener("pointermove", (e) => {
    const p = pointerPos(e);
    pointer.x = p.x;
    pointer.y = p.y;
  });

  canvas.addEventListener("pointerleave", () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  canvas.addEventListener("pointerdown", (e) => {
    const p = pointerPos(e);
    pointer.x = p.x;
    pointer.y = p.y;
    scatterFrom(p.x, p.y);
  });

  resetBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    flees = 0;
    updateFleeCount();
    ripples = [];
    spawnBalls();
  });

  window.addEventListener("resize", () => {
    resize();
    for (const b of balls) {
      b.x = Math.min(Math.max(b.r, b.x), width - b.r);
      b.y = Math.min(Math.max(b.r, b.y), height - b.r);
    }
  });

  resize();
  spawnBalls();
  updateFleeCount();
  requestAnimationFrame(frame);
})();
