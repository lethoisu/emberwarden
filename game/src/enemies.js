// Emberwarden — the Gloom: enemy instances and wave composition.
// An enemy walks the path by distance; `dist` is its progress, so the
// tower that shoots "furthest along" just picks the largest dist in range.

import { ENEMIES, WAVES, HP_PER_WAVE } from './config.js';
import { pathPointAt, PATH_LENGTH } from './map.js';

let nextId = 1;

export function makeEnemy(key, wave, rng, elite = false) {
  const def = ENEMIES[key];
  const hpMul = 1 + HP_PER_WAVE * (wave - 1);
  const lateral = rng ? rng.range(-9, 9) : (Math.random() * 18 - 9);
  const e = {
    id: nextId++,
    key,
    name: def.name,
    hp: Math.round(def.hp * hpMul * (elite ? 1.8 : 1)),
    maxHp: Math.round(def.hp * hpMul * (elite ? 1.8 : 1)),
    speed: def.speed * (elite ? 0.9 : 1),
    baseSpeed: def.speed * (elite ? 0.9 : 1),
    bounty: def.bounty * (elite ? 2 : 1),
    lives: def.lives,
    radius: def.radius + (elite ? 2 : 0),
    color: def.color,
    glow: def.glow,
    slowImmune: !!def.slowImmune,
    regenPct: def.regenPct || 0,
    enrageBelow: def.enrageBelow || 0,
    elite,
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

// Expand a wave definition into a spawn queue: [{key, at, elite}] in
// spawn order. From wave 4 on, every 7th spawn is an elite: +80% HP,
// double bounty, a gold ring in the renderer. Elites never include the
// Matriarch herself — she is a boss already.
export function buildSpawnQueue(waveIndex, rng) {
  const wave = WAVES[waveIndex];
  const queue = [];
  let t = 0.5;
  let n = 0;
  for (const [key, count] of wave.groups) {
    for (let i = 0; i < count; i++) {
      n++;
      const elite = waveIndex + 1 >= 4 && key !== 'matriarch' && n % 7 === 0;
      queue.push({ key, at: t, elite });
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
  // The Matriarch enrages below half health: she walks 60% faster and her
  // crown burns brighter (the renderer reads the same fraction).
  if (e.enrageBelow > 0 && e.hp < e.maxHp * e.enrageBelow) speed *= 1.6;
  // Wraiths knit themselves back together: slow, steady regeneration.
  if (e.regenPct > 0 && e.hp < e.maxHp) {
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regenPct * dt);
  }
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
