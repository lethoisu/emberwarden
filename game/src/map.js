// Emberwarden — the path the Gloom walks and the build plots beside it.
// The path is a polyline; enemies walk it by distance, so a tower's
// "furthest along" targeting is just a distance comparison.

import { PATH, PLOTS, PLOT_R, TREE } from './config.js';

// Precompute segment lengths so distance -> position is O(segments).
const SEGMENTS = [];
let totalLength = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const a = PATH[i];
  const b = PATH[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  SEGMENTS.push({ a, b, len, start: totalLength });
  totalLength += len;
}

export const PATH_LENGTH = totalLength;
export const TREE_POS = TREE;

export function pathPointAt(dist) {
  const d = Math.max(0, Math.min(totalLength, dist));
  for (const s of SEGMENTS) {
    if (d <= s.start + s.len || s === SEGMENTS[SEGMENTS.length - 1]) {
      const t = s.len === 0 ? 0 : Math.max(0, Math.min(1, (d - s.start) / s.len));
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
    }
  }
  const last = PATH[PATH.length - 1];
  return { x: last.x, y: last.y };
}

// Distance from a point to the nearest path segment (for placement rules).
export function distanceToPath(x, y) {
  let best = Infinity;
  for (const s of SEGMENTS) {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((x - s.a.x) * dx + (y - s.a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = s.a.x + dx * t;
    const py = s.a.y + dy * t;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}

export function plotAt(x, y) {
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    if (Math.hypot(x - p.x, y - p.y) <= PLOT_R + 6) return i;
  }
  return -1;
}

export function plotCenter(i) {
  return PLOTS[i];
}
