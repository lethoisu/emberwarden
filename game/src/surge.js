// Emberwarden — the Ember Surge: the warden's active ability.
// Once per wave, a burst of dawnlight strikes every creature on the
// path. It costs no gold; the decision is timing — spend it early to
// clear a swarm, or hold it for the Matriarch. Pure rule, no drawing:
// render.js shows the flash, game.js owns the uses-left count.

import { SURGE } from './config.js';

export function surgeDamage(wave) {
  return SURGE.damageBase + SURGE.damagePerWave * (wave - 1);
}

export function surgeUsesPerWave() {
  return SURGE.usesPerWave;
}

// Strike every living enemy. `damageEnemy` is game.js's own resolver, so
// kills, bounties and score flow through the same path as any other hit.
// Returns how many creatures were struck.
export function applySurge(enemies, wave, damageEnemy) {
  const damage = surgeDamage(wave);
  let struck = 0;
  for (const e of [...enemies]) {
    if (e.dead || e.leaked) continue;
    damageEnemy(e, damage);
    struck++;
  }
  return struck;
}
