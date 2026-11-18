// Emberwarden — targeting priorities: how a warden picks its victim.
// Every warden can be told what to hunt: the furthest along the path
// (First), the toughest creature in range (Strong), or the one that just
// stepped onto the path (Last). The choice is a real strategy decision:
// Strong saves the big hits for Husks and the Matriarch, First stops
// leaks, Last mops up stragglers a Frost Bloom has slowed.

export const TARGET_MODES = ['first', 'strong', 'last'];
export const TARGET_LABELS = { first: 'First', strong: 'Strong', last: 'Last' };

export function nextTargetMode(mode) {
  const i = TARGET_MODES.indexOf(mode);
  return TARGET_MODES[(i + 1) % TARGET_MODES.length];
}

// Pick one enemy from the candidates in range, by the warden's mode.
// `dist` is distance along the path (larger = closer to the tree).
export function pickTarget(mode, enemies) {
  let best = null;
  for (const e of enemies) {
    if (e.dead || e.leaked) continue;
    if (!best) { best = e; continue; }
    if (mode === 'strong') {
      if (e.hp > best.hp) best = e;
    } else if (mode === 'last') {
      if (e.dist < best.dist) best = e;
    } else {
      if (e.dist > best.dist) best = e;
    }
  }
  return best;
}
