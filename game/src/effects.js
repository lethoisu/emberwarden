// Emberwarden — particles, floating combat text and screen shake.
// Pure presentation: the game logic never reads anything here.

export function createEffects() {
  const particles = [];
  const floats = [];
  const bolts = [];
  let shakeTime = 0;
  let shakeMag = 0;
  let flashTime = 0;

  function burst(x, y, color, n, speed, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.25,
        life: life * (0.6 + Math.random() * 0.6),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 0.92,
        grav: 60,
      });
    }
  }

  return {
    particles,
    floats,
    bolts,

    spark(x, y, color) { burst(x, y, color, 7, 130, 0.45, 3); },
    poof(x, y, color) { burst(x, y, color, 14, 90, 0.6, 4); },
    splash(x, y, color) { burst(x, y, color, 18, 170, 0.5, 4); },
    emberDrift(x, y) { burst(x, y, '#ffb347', 1, 24, 1.6, 2.5); },
    heal(x, y) { burst(x, y, '#7dffb0', 6, 50, 0.7, 3); },

    // A jagged lightning arc between two points, drawn for a blink.
    bolt(x1, y1, x2, y2, color) {
      const segs = 5;
      const pts = [{ x: x1, y: y1 }];
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const mx = x1 + (x2 - x1) * t;
        const my = y1 + (y2 - y1) * t;
        const off = (Math.random() * 14 - 7) * (i % 2 === 0 ? 1 : -1);
        pts.push({ x: mx + off, y: my + off * 0.6 });
      }
      pts.push({ x: x2, y: y2 });
      bolts.push({ pts, color, life: 0.22, maxLife: 0.22 });
    },

    // Full-screen dawn flash for the Ember Surge.
    surgeFlash() { flashTime = 0.55; },
    flashAlpha() { return flashTime > 0 ? Math.min(0.55, flashTime) : 0; },

    text(x, y, str, color, big = false) {
      floats.push({ x, y, str, color, life: 1.0, maxLife: 1.0, big });
    },

    shake(mag, secs) {
      shakeMag = Math.max(shakeMag, mag);
      shakeTime = Math.max(shakeTime, secs);
    },

    update(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.life -= dt;
        f.y -= 34 * dt;
        if (f.life <= 0) floats.splice(i, 1);
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        bolts[i].life -= dt;
        if (bolts[i].life <= 0) bolts.splice(i, 1);
      }
      if (flashTime > 0) flashTime -= dt;
      if (shakeTime > 0) {
        shakeTime -= dt;
        if (shakeTime <= 0) shakeMag = 0;
      }
    },

    shakeOffset() {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      const m = shakeMag * (shakeTime / 0.4);
      return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
    },

    draw(ctx) {
      for (const p of particles) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Lightning arcs: bright core plus a soft halo stroke.
      for (const b of bolts) {
        const a = Math.max(0, b.life / b.maxLife);
        ctx.globalAlpha = a;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        b.pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        b.pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const f of floats) {
        const a = Math.max(0, f.life / f.maxLife);
        ctx.globalAlpha = a;
        ctx.font = f.big ? 'bold 17px system-ui, sans-serif' : 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(20,10,40,0.85)';
        ctx.strokeText(f.str, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.str, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    },
  };
}
