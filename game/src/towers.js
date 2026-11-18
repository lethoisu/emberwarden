// Emberwarden — wardens (towers): construction, targeting, firing and
// upgrades. A tower fires at the enemy furthest along the path within its
// range; projectiles are simple homing orbs resolved in game.js.

import { TOWERS, SELL_RATE } from './config.js';
import { plotCenter } from './map.js';
import { pickTarget, nextTargetMode, TARGET_LABELS } from './targeting.js';

export { TARGET_LABELS };

let nextId = 1;

export function towerDef(key) {
  return TOWERS[key];
}

export function towerStats(key, level) {
  return TOWERS[key].levels[level - 1];
}

export function makeTower(key, plotIndex) {
  const p = plotCenter(plotIndex);
  return {
    id: nextId++,
    key,
    name: TOWERS[key].name,
    color: TOWERS[key].color,
    glow: TOWERS[key].glow,
    plotIndex,
    x: p.x,
    y: p.y,
    level: 1,
    invested: TOWERS[key].cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    flash: 0,
    recoil: 0,
    mode: 'first',
    kills: 0,
  };
}

export function upgradeCost(tower) {
  const stats = towerStats(tower.key, tower.level);
  return stats.upgradeCost;
}

export function canUpgrade(tower) {
  return tower.level < 3;
}

export function sellValue(tower) {
  return Math.floor(tower.invested * SELL_RATE);
}

export function applyUpgrade(tower) {
  const cost = upgradeCost(tower);
  if (!canUpgrade(tower) || cost <= 0) return 0;
  tower.level += 1;
  tower.invested += cost;
  tower.flash = 0.4;
  return cost;
}

export function cycleTargetMode(tower) {
  tower.mode = nextTargetMode(tower.mode || 'first');
  return tower.mode;
}

// Pick the target: in-range enemies first, then the warden's priority.
export function acquireTarget(tower, enemies) {
  const stats = towerStats(tower.key, tower.level);
  const inRange = [];
  for (const e of enemies) {
    if (e.dead || e.leaked) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= stats.range + e.radius) inRange.push(e);
  }
  return pickTarget(tower.mode || 'first', inRange);
}

// One firing step. Returns a projectile description or null.
export function fireTower(tower, target, dt) {
  const stats = towerStats(tower.key, tower.level);
  tower.cooldown -= dt;
  if (!target) return null;
  if (tower.cooldown > 0) return null;
  tower.cooldown = 1 / stats.rate;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.flash = 0.12;
  tower.recoil = 0.14;
  return {
    kind: tower.key,
    x: tower.x,
    y: tower.y - 14,
    targetId: target.id,
    damage: stats.damage,
    splash: stats.splash || 0,
    slowPct: stats.slowPct || 0,
    slowSecs: stats.slowSecs || 0,
    chain: stats.chain || 0,
    speed: tower.key === 'thorn' ? 260 : tower.key === 'dawn' ? 560 : 420,
    color: tower.color,
    radius: tower.key === 'thorn' ? 7 : tower.key === 'dawn' ? 6 : 4,
  };
}
