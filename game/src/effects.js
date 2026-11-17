// Emberwarden — particles, floating combat text and screen shake.
// Pure presentation: the game logic never reads anything here.

export function createEffects() {
  const particles = [];
  const floats = [];
  let shakeTime = 0;
  let shakeMag = 0;

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

    spark(x, y, color) { burst(x, y, color, 7, 130, 0.45, 3); },
    poof(x, y, color) { burst(x, y, color, 14, 90, 0.6, 4); },
    splash(x, y, color) { burst(x, y, color, 18, 170, 0.5, 4); },
    emberDrift(x, y) { burst(x, y, '#ffb347', 1, 24, 1.6, 2.5); },
    heal(x, y) { burst(x, y, '#7dffb0', 6, 50, 0.7, 3); },

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
