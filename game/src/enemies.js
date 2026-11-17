// Emberwarden — the Gloom: enemy instances and wave composition.
// An enemy walks the path by distance; `dist` is its progress, so the
// tower that shoots "furthest along" just picks the largest dist in range.

import { ENEMIES, WAVES, HP_PER_WAVE } from './config.js';
import { pathPointAt, PATH_LENGTH } from './map.js';

let nextId = 1;

export function makeEnemy(key, wave, rng) {
  const def = ENEMIES[key];
  const hpMul = 1 + HP_PER_WAVE * (wave - 1);
  const lateral = rng ? rng.range(-9, 9) : (Math.random() * 18 - 9);
  const e = {
    id: nextId++,
    key,
    name: def.name,
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    speed: def.speed,
    baseSpeed: def.speed,
    bounty: def.bounty,
    lives: def.lives,
    radius: def.radius,
    color: def.color,
    glow: def.glow,
    slowImmune: !!def.slowImmune,
    dist: 0,
    lateral,
    slowUntil: 0,
    slowPct: 0,
    x: -30,
    y: 110,
    wobble: Math.random() * Math.PI * 2,
    dead: false,
    leaked: false,
  };
  return e;
}

// Expand a wave definition into a spawn queue: [{key, at}] in spawn order.
export function buildSpawnQueue(waveIndex, rng) {
  const wave = WAVES[waveIndex];
  const queue = [];
  let t = 0.5;
  for (const [key, count] of wave.groups) {
    for (let i = 0; i < count; i++) {
      queue.push({ key, at: t });
      t += wave.interval;
    }
    t += 0.9; // breather between groups
  }
  return queue;
}

export function waveCount() {
  return WAVES.length;
}

// Advance one enemy along the path. Returns 'leaked' when it reaches the tree.
export function stepEnemy(e, dt, now) {
  let speed = e.baseSpeed;
  if (!e.slowImmune && now < e.slowUntil) speed *= (1 - e.slowPct);
  e.dist += speed * dt;
  if (e.dist >= PATH_LENGTH) {
    e.leaked = true;
    return 'leaked';
  }
  const p = pathPointAt(e.dist);
  // Lateral offset perpendicular to travel: alternate by wobble phase so the
  // column reads as a shambling crowd rather than a single file line.
  e.wobble += dt * 3;
  const perp = Math.sin(e.wobble * 0.7 + e.id) * 0.4 + e.lateral * 0.6;
  // Approximate perpendicular: the path is axis-aligned, so pick the axis
  // with the smaller local delta by sampling a point slightly ahead.
  const ahead = pathPointAt(Math.min(PATH_LENGTH, e.dist + 4));
  const dx = ahead.x - p.x;
  const dy = ahead.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  e.x = p.x + (-dy / len) * perp;
  e.y = p.y + (dx / len) * perp;
  return 'ok';
}

export function applySlow(e, pct, secs, now) {
  if (e.slowImmune) return;
  e.slowPct = Math.max(e.slowPct, pct);
  e.slowUntil = Math.max(e.slowUntil, now + secs);
}
