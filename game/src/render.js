// Emberwarden — everything the player sees on the canvas: the grove, the
// path, the tree, wardens, the Gloom, and the title / victory / defeat
// screens. DOM (in main.js) owns the buttons and panels; this file owns
// the picture.

import { VIEW_W, VIEW_H, PATH, PLOTS, PLOT_R, TREE, PALETTE, TOWERS } from './config.js';
import { pathPointAt, PATH_LENGTH } from './map.js';
import { towerStats } from './towers.js';
import { createRng } from './random.js';

const rng = createRng(20261116);
const STARS = Array.from({ length: 70 }, () => ({
  x: rng.range(0, VIEW_W), y: rng.range(0, 240),
  r: rng.range(0.6, 1.8), tw: rng.range(0, Math.PI * 2),
}));
const FIREFLIES = Array.from({ length: 26 }, () => ({
  x: rng.range(0, VIEW_W), y: rng.range(80, VIEW_H - 40),
  ph: rng.range(0, Math.PI * 2), sp: rng.range(0.2, 0.7), r: rng.range(1.2, 2.4),
}));
// Fixed scenery so the grove reads the same every run: pines, grass,
// stones and drifting clouds, all seeded from the same RNG.
const PINES = Array.from({ length: 14 }, () => ({
  x: rng.range(0, VIEW_W), y: rng.range(300, 580),
  s: rng.range(0.7, 1.4), shade: rng.range(0, 1) > 0.5,
}));
const GRASS = Array.from({ length: 60 }, () => ({
  x: rng.range(0, VIEW_W), y: rng.range(310, 590),
  h: rng.range(4, 9), lean: rng.range(-2, 2),
}));
const STONES = Array.from({ length: 26 }, () => ({
  t: rng.range(0, 1), off: rng.range(-16, 16), r: rng.range(2, 4.5),
}));
const CLOUDS = Array.from({ length: 5 }, () => ({
  x: rng.range(0, VIEW_W), y: rng.range(18, 90),
  w: rng.range(70, 150), sp: rng.range(2, 6),
}));

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPath(ctx) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Outer edge.
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = 50;
  ctx.beginPath();
  PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  // Inner tread.
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = 42;
  ctx.beginPath();
  PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  // Centre dashes.
  ctx.strokeStyle = 'rgba(255, 214, 140, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 16]);
  ctx.beginPath();
  PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  // Worn stones scattered along the tread.
  ctx.fillStyle = 'rgba(214, 196, 232, 0.35)';
  for (const s of STONES) {
    const p = pathPointAt(s.t * PATH_LENGTH);
    ctx.beginPath();
    ctx.arc(p.x + s.off, p.y + (s.off * 0.4), s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlots(ctx, game) {
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    const occupied = game.towers.some((t) => t.plotIndex === i);
    if (occupied) continue;
    const selected = game.selectedPlot === i;
    const hovered = game.hoverPlot === i && game.state !== 'title';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLOT_R, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#4d3a6e' : PALETTE.plot;
    ctx.fill();
    ctx.lineWidth = selected ? 3 : 2;
    ctx.strokeStyle = selected ? PALETTE.plotOk : hovered ? '#c9b8ec' : PALETTE.plotEdge;
    ctx.stroke();
    // Rune ring.
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLOT_R - 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201, 184, 236, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (selected || hovered) {
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9ccf5';
      ctx.fillText('BUILD', p.x, p.y + 4);
    }
  }
}

function drawTree(ctx, game, time) {
  const pulse = 1 + Math.sin(time * 2.2) * 0.05;
  const glowR = 74 * pulse + (game.treeFlash > 0 ? 26 : 0);
  const grad = ctx.createRadialGradient(TREE.x, TREE.y, 8, TREE.x, TREE.y, glowR);
  grad.addColorStop(0, game.treeFlash > 0 ? 'rgba(255, 90, 90, 0.85)' : 'rgba(255, 154, 60, 0.75)');
  grad.addColorStop(1, 'rgba(255, 154, 60, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(TREE.x, TREE.y, glowR, 0, Math.PI * 2);
  ctx.fill();
  // Trunk.
  ctx.strokeStyle = '#5d3d24';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(TREE.x, TREE.y + 30);
  ctx.quadraticCurveTo(TREE.x - 6, TREE.y + 6, TREE.x, TREE.y - 12);
  ctx.stroke();
  // Canopy: three warm blobs.
  const blobs = [
    { dx: -16, dy: -18, r: 20 },
    { dx: 14, dy: -20, r: 22 },
    { dx: 0, dy: -34, r: 20 },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(TREE.x + b.dx, TREE.y + b.dy, 2, TREE.x + b.dx, TREE.y + b.dy, b.r);
    g.addColorStop(0, '#ffb347');
    g.addColorStop(1, '#c25e1e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(TREE.x + b.dx, TREE.y + b.dy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ember heart.
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(TREE.x, TREE.y - 16, 5 + Math.sin(time * 3) * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9b8';
  ctx.fillText('EMBER TREE', TREE.x, TREE.y + 52);
}

function drawTower(ctx, tower, time) {
  const stats = towerStats(tower.key, tower.level);
  // Recoil: the whole head kicks back a touch on firing.
  const recoil = tower.recoil > 0 ? Math.sin((tower.recoil / 0.14) * Math.PI) * 3 : 0;
  const rx = tower.x - Math.cos(tower.angle) * recoil;
  const ry = tower.y - Math.sin(tower.angle) * recoil;
  // Range ring when selected or placing.
  // (drawn by caller through game.hover/selected state; see drawRange)
  // Shadow + base.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(tower.x, tower.y + 14, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const baseGrad = ctx.createLinearGradient(tower.x, tower.y - 18, tower.x, tower.y + 16);
  baseGrad.addColorStop(0, '#5a4a7d');
  baseGrad.addColorStop(1, '#33264d');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = tower.color;
  ctx.stroke();
  // Aim barrel.
  ctx.strokeStyle = tower.color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rx, ry - 8);
  ctx.lineTo(rx + Math.cos(tower.angle) * 16, ry - 8 + Math.sin(tower.angle) * 16);
  ctx.stroke();
  // Head by type.
  const hx = rx;
  const hy = ry - 10;
  if (tower.key === 'spark') {
    ctx.fillStyle = tower.color;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 11);
    ctx.lineTo(hx + 8, hy + 5);
    ctx.lineTo(hx - 8, hy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(hx, hy - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.key === 'frost') {
    ctx.strokeStyle = tower.color;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + time * 0.2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10);
      ctx.stroke();
    }
    ctx.fillStyle = '#eafcff';
    ctx.beginPath();
    ctx.arc(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.key === 'volt') {
    // Volt: a crackling yellow bloom — three zigzag petals.
    ctx.strokeStyle = tower.color;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + time * 0.6;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6);
      ctx.lineTo(hx + Math.cos(a + 0.5) * 9, hy + Math.sin(a + 0.5) * 9);
      ctx.lineTo(hx + Math.cos(a) * 13, hy + Math.sin(a) * 13);
      ctx.stroke();
    }
    ctx.fillStyle = '#fffbe0';
    ctx.beginPath();
    ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.key === 'dawn') {
    // Dawnspire: a tall pink lance with a rising sun orb.
    ctx.strokeStyle = '#ffb7e2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 10);
    ctx.lineTo(hx, hy - 14);
    ctx.stroke();
    const g = ctx.createRadialGradient(hx, hy - 14, 1, hx, hy - 14, 10);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, tower.color);
    g.addColorStop(1, 'rgba(224, 86, 155, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy - 14, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Thorn: spiked seed pod.
    ctx.fillStyle = tower.color;
    ctx.beginPath();
    ctx.arc(hx, hy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4d7a24';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a) * 7, hy + Math.sin(a) * 7);
      ctx.lineTo(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12);
      ctx.stroke();
    }
    ctx.fillStyle = '#2f4d14';
    ctx.beginPath();
    ctx.arc(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Level pips.
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(tower.x - 8 + i * 8, tower.y + 24, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Max level: a gold crown ring so a Lv 3 warden reads at a glance.
  if (tower.level >= 3) {
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Muzzle flash.
  if (tower.flash > 0) {
    ctx.globalAlpha = Math.min(1, tower.flash * 6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx + Math.cos(tower.angle) * 16, hy + Math.sin(tower.angle) * 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Range circle for the selected tower.
  if (game.selectedTowerId === tower.id) {
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawEnemy(ctx, e, time) {
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + e.radius * 0.8, e.radius * 0.9, e.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  const bob = Math.sin(time * 6 + e.id) * 1.5;
  const y = e.y + bob;
  if (e.key === 'mote') {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = e.glow;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + time * 2;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(a) * e.radius, y + Math.sin(a) * e.radius);
      ctx.lineTo(e.x + Math.cos(a) * (e.radius + 4), y + Math.sin(a) * (e.radius + 4));
      ctx.stroke();
    }
  } else if (e.key === 'wisp') {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(e.x, y - e.radius - 4);
    ctx.quadraticCurveTo(e.x + e.radius, y, e.x, y + e.radius);
    ctx.quadraticCurveTo(e.x - e.radius, y, e.x, y - e.radius - 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.x - 3, y - 2, 2, 0, Math.PI * 2);
    ctx.arc(e.x + 3, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.key === 'husk') {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x - 8, y - 4);
    ctx.lineTo(e.x - 2, y + 2);
    ctx.lineTo(e.x - 8, y + 8);
    ctx.stroke();
    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.arc(e.x - 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(e.x + 5, y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.key === 'shade') {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(e.x, y - e.radius - 4);
    ctx.lineTo(e.x + e.radius, y + e.radius);
    ctx.lineTo(e.x - e.radius, y + e.radius);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5d73';
    ctx.beginPath();
    ctx.arc(e.x - 4, y - 2, 2, 0, Math.PI * 2);
    ctx.arc(e.x + 4, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.key === 'swarm') {
    // Emberling: a tiny buzzing spark with fluttering wings.
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 200, 0.9)';
    ctx.lineWidth = 1.5;
    const flap = Math.sin(time * 18 + e.id) * 4;
    ctx.beginPath();
    ctx.moveTo(e.x - 2, y - 2);
    ctx.lineTo(e.x - 8, y - 6 - flap);
    ctx.moveTo(e.x + 2, y - 2);
    ctx.lineTo(e.x + 8, y - 6 - flap);
    ctx.stroke();
    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.arc(e.x - 2, y - 1, 1.5, 0, Math.PI * 2);
    ctx.arc(e.x + 2, y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.key === 'wraith') {
    // Wraith: a pale, translucent shroud that slowly knits itself whole.
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(e.x, y - e.radius - 6);
    ctx.quadraticCurveTo(e.x + e.radius + 4, y - 4, e.x + e.radius - 2, y + e.radius);
    ctx.lineTo(e.x + 5, y + e.radius - 5);
    ctx.lineTo(e.x, y + e.radius + 2);
    ctx.lineTo(e.x - 5, y + e.radius - 5);
    ctx.lineTo(e.x - e.radius + 2, y + e.radius);
    ctx.quadraticCurveTo(e.x - e.radius - 4, y - 4, e.x, y - e.radius - 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0e2b22';
    ctx.beginPath();
    ctx.arc(e.x - 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(e.x + 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Regen shimmer: a soft green ring that pulses as it heals.
    ctx.strokeStyle = `rgba(125, 255, 176, ${0.25 + Math.sin(time * 4 + e.id) * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(e.x, y, e.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Matriarch: crowned orb.
    const g = ctx.createRadialGradient(e.x - 6, y - 8, 2, e.x, y, e.radius + 4);
    g.addColorStop(0, '#e9d5ff');
    g.addColorStop(1, e.glow);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(e.x + i * 9 - 4, y - e.radius + 2);
      ctx.lineTo(e.x + i * 9, y - e.radius - 9);
      ctx.lineTo(e.x + i * 9 + 4, y - e.radius + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.arc(e.x - 8, y - 4, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 8, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Enraged Matriarch: her crown burns red below half health.
    if (e.key === 'matriarch' && e.enrageBelow > 0 && e.hp < e.maxHp * e.enrageBelow) {
      ctx.fillStyle = '#ff5d3c';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(e.x + i * 9 - 4, y - e.radius + 2);
        ctx.lineTo(e.x + i * 9, y - e.radius - 14 - Math.sin(time * 9 + i) * 2);
        ctx.lineTo(e.x + i * 9 + 4, y - e.radius + 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // Elite ring: gold, so the double-bounty foe is obvious.
  if (e.elite) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(e.x, y, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', e.x, y - e.radius - 9);
  }
  // Slow tint.
  if (e.slowUntil > 0 && time < e.slowUntil) {
    ctx.strokeStyle = 'rgba(127, 231, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, y, e.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // HP bar when hurt.
  if (e.hp < e.maxHp) {
    const w = Math.max(24, e.radius * 2);
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(10, 6, 24, 0.8)';
    ctx.fillRect(e.x - w / 2, y - e.radius - 11, w, 5);
    ctx.fillStyle = frac > 0.5 ? '#7dffb0' : frac > 0.25 ? '#ffd166' : '#ff6b6b';
    ctx.fillRect(e.x - w / 2 + 1, y - e.radius - 10, (w - 2) * frac, 3);
  }
}

function drawOverlayPanel(ctx, lines, accent) {
  const w = 560;
  const h = 92 + lines.length * 26;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2 - 30;
  ctx.fillStyle = 'rgba(16, 10, 34, 0.88)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.stroke();
  return { x, y, w, h };
}

export function drawGame(ctx, game, time) {
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars.
  for (const s of STARS) {
    ctx.globalAlpha = 0.4 + Math.sin(time * 1.4 + s.tw) * 0.3;
    ctx.fillStyle = '#e8e2ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Distant hills.
  ctx.fillStyle = '#1d1533';
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.quadraticCurveTo(200, 120, 420, 190);
  ctx.quadraticCurveTo(640, 250, 960, 150);
  ctx.lineTo(960, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  // Moon with a soft halo, top right — drawn after the hills so it sits
  // in the sky above the ridge, not behind it.
  const moonGrad = ctx.createRadialGradient(830, 62, 6, 830, 62, 70);
  moonGrad.addColorStop(0, 'rgba(255, 244, 214, 0.9)');
  moonGrad.addColorStop(0.35, 'rgba(255, 244, 214, 0.25)');
  moonGrad.addColorStop(1, 'rgba(255, 244, 214, 0)');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(830, 62, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff4d6';
  ctx.beginPath();
  ctx.arc(830, 62, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214, 196, 160, 0.6)';
  ctx.beginPath();
  ctx.arc(822, 56, 5, 0, Math.PI * 2);
  ctx.arc(838, 68, 3.5, 0, Math.PI * 2);
  ctx.arc(834, 52, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Drifting clouds.
  ctx.fillStyle = 'rgba(180, 164, 220, 0.16)';
  for (const c of CLOUDS) {
    const cx = ((c.x + time * c.sp) % (VIEW_W + 180)) - 90;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, c.w / 2, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 22, c.y + 5, c.w / 3, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ground.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 300, VIEW_W, VIEW_H - 300);
  ctx.fillStyle = PALETTE.groundAlt;
  ctx.fillRect(0, 300, VIEW_W, 4);
  // Pine silhouettes along the bottom edge, behind the path.
  for (const p of PINES) {
    ctx.fillStyle = p.shade ? '#17102c' : '#1b1338';
    const s = p.s;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 46 * s);
    ctx.lineTo(p.x - 13 * s, p.y);
    ctx.lineTo(p.x + 13 * s, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 62 * s);
    ctx.lineTo(p.x - 9 * s, p.y - 22 * s);
    ctx.lineTo(p.x + 9 * s, p.y - 22 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Grass tufts.
  ctx.strokeStyle = 'rgba(125, 255, 176, 0.28)';
  ctx.lineWidth = 1.2;
  for (const g of GRASS) {
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + g.lean, g.y - g.h);
    ctx.stroke();
  }
  // Fireflies.
  for (const f of FIREFLIES) {
    const fx = f.x + Math.sin(time * f.sp + f.ph) * 18;
    const fy = f.y + Math.cos(time * f.sp * 0.8 + f.ph) * 10;
    ctx.globalAlpha = 0.35 + Math.sin(time * 2 + f.ph) * 0.25;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(fx, fy, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const shake = game.effects.shakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawPath(ctx);
  drawPlots(ctx, game);
  drawTree(ctx, game, time);

  // Placing range preview.
  if (game.placing && game.selectedPlot >= 0) {
    const p = PLOTS[game.selectedPlot];
    const def = TOWERS[game.placing];
    const range = def.levels[0].range;
    ctx.beginPath();
    ctx.arc(p.x, p.y, range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const t of game.towers) drawTower(ctx, t, time);
  for (const e of game.enemies) drawEnemy(ctx, e, time);

  // Projectiles.
  for (const p of game.projectiles) {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius + 5);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, p.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
    ctx.fill();
  }

  game.effects.draw(ctx);
  ctx.restore();

  // Ember Surge flash: a dawn wash over the whole scene.
  const flashA = game.effects.flashAlpha();
  if (flashA > 0) {
    ctx.fillStyle = `rgba(255, 226, 150, ${flashA})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // Low lives: a pulsing red vignette at the edges.
  if ((game.state === 'build' || game.state === 'wave') && game.lives <= 5) {
    const pulse = 0.10 + Math.sin(time * 4) * 0.05;
    const vig = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 240, VIEW_W / 2, VIEW_H / 2, 560);
    vig.addColorStop(0, 'rgba(255, 60, 60, 0)');
    vig.addColorStop(1, `rgba(255, 60, 60, ${pulse})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // Boss health bar, top centre, while the Matriarch lives.
  const boss = game.boss;
  if (boss) {
    const w = 340;
    const x = (VIEW_W - w) / 2;
    const y = 14;
    const frac = Math.max(0, boss.hp / boss.maxHp);
    const enraged = boss.enrageBelow > 0 && frac < boss.enrageBelow;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = enraged ? '#ff8a6b' : '#e9d5ff';
    ctx.fillText(enraged ? '👑 GLOOM MATRIARCH — ENRAGED!' : '👑 GLOOM MATRIARCH', VIEW_W / 2, y + 11);
    ctx.fillStyle = 'rgba(10, 6, 24, 0.8)';
    roundRect(ctx, x, y + 16, w, 12, 6);
    ctx.fill();
    ctx.fillStyle = enraged ? '#ff5d3c' : '#b06cff';
    roundRect(ctx, x + 1, y + 17, (w - 2) * frac, 10, 5);
    ctx.fill();
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y + 16, w, 12, 6);
    ctx.stroke();
  }
  // Wave progress: a thin bar, top left, with its label beside it.
  if (game.state === 'wave') {
    const total = game.waveTotal || 1;
    const frac = Math.max(0, Math.min(1, 1 - game.enemiesLeft / total));
    ctx.fillStyle = 'rgba(10, 6, 24, 0.7)';
    ctx.fillRect(20, 12, 140, 6);
    ctx.fillStyle = '#7dffb0';
    ctx.fillRect(20, 12, 140 * frac, 6);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e6dcff';
    ctx.fillText(`Wave ${game.wave} — ${game.enemiesLeft} foes left`, 170, 19);
  }

  // Banner.
  const banner = game.banner;
  if (banner && game.state !== 'victory' && game.state !== 'defeat') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(16, 10, 34, 0.9)';
    ctx.strokeText(banner.title, VIEW_W / 2, 74);
    ctx.fillStyle = '#ffe9b8';
    ctx.fillText(banner.title, VIEW_W / 2, 74);
    if (banner.sub) {
      ctx.font = '15px system-ui, sans-serif';
      ctx.strokeText(banner.sub, VIEW_W / 2, 100);
      ctx.fillStyle = '#e6dcff';
      ctx.fillText(banner.sub, VIEW_W / 2, 100);
    }
  }

  // Paused veil.
  if (game.paused && (game.state === 'build' || game.state === 'wave')) {
    ctx.fillStyle = 'rgba(10, 6, 24, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillStyle = '#f4efff';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#b9aed6';
    ctx.fillText('Press P or the Pause button to resume', VIEW_W / 2, VIEW_H / 2 + 30);
  }

  // Title screen.
  if (game.state === 'title') {
    ctx.fillStyle = 'rgba(12, 7, 28, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    const glow = ctx.createRadialGradient(VIEW_W / 2, 190, 10, VIEW_W / 2, 190, 260);
    glow.addColorStop(0, 'rgba(255, 154, 60, 0.35)');
    glow.addColorStop(1, 'rgba(255, 154, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('EMBERWARDEN', VIEW_W / 2, 168);
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillStyle = '#e6dcff';
    ctx.fillText('Defend the last Ember Tree from the Gloom', VIEW_W / 2, 202);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#c9bfe8';
    const lines = [
      'The Gloom walks the winding path to your tree. Build wardens on the stone plots.',
      'Earn gold for every creature you banish. Survive all 10 waves — the Matriarch comes last.',
    ];
    lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, 248 + i * 26));
    // The roster: all five wardens, so the title shows the game's variety.
    const roster = [
      ['Spark', '#ffb347', 'fast · cheap'],
      ['Frost', '#7fe7ff', 'slows the swift'],
      ['Thorn', '#b8ff7a', 'splash clusters'],
      ['Volt', '#ffe14d', 'chain lightning'],
      ['Dawn', '#ff9de2', 'boss killer'],
    ];
    ctx.font = 'bold 13px system-ui, sans-serif';
    roster.forEach((r, i) => {
      const x = 200 + i * 140;
      const y = 322;
      ctx.fillStyle = r[1];
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4efff';
      ctx.fillText(r[0], x, y + 26);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#b9aed6';
      ctx.fillText(r[2], x, y + 44);
      ctx.font = 'bold 13px system-ui, sans-serif';
    });
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('5 wardens  ·  7 foes  ·  elite hunts  ·  Ember Surge  ·  10 waves  ·  1 boss', VIEW_W / 2, 402);
    const best = game.bestScore > 0 ? `Best score: ${game.bestScore}   •   ` : '';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#b9aed6';
    ctx.fillText(`${best}Click a plot, build a warden, press SPACE to start the wave.`, VIEW_W / 2, 432);
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = 0.6 + Math.sin(time * 3) * 0.4 > 0.7 ? '#ffe9b8' : '#b9aed6';
    ctx.fillText('Press ENTER or click BEGIN THE WATCH above', VIEW_W / 2, 470);
  }

  // Victory / defeat screens.
  if (game.state === 'victory' || game.state === 'defeat') {
    const win = game.state === 'victory';
    const stats = win ? game.victoryStats : game.defeatStats;
    ctx.fillStyle = 'rgba(12, 7, 28, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const panel = drawOverlayPanel(
      ctx,
      ['', '', '', '', '', ''],
      win ? '#ffd166' : '#ff6b6b',
    );
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillStyle = win ? '#ffd166' : '#ff6b6b';
    ctx.fillText(win ? 'THE GROVE IS SAFE!' : 'THE EMBER FADES…', VIEW_W / 2, panel.y + 58);
    // Victory stars: 3 for 15+ lives, 2 for 8+, else 1 — the run's grade.
    if (win) {
      const stars = stats.stars || 1;
      ctx.font = 'bold 34px system-ui, sans-serif';
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? '#ffd166' : 'rgba(185, 174, 214, 0.35)';
        ctx.fillText('★', VIEW_W / 2 - 44 + i * 44, panel.y + 100);
      }
    }
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#e6dcff';
    const rows = win
      ? [
          `Final score: ${stats.score}  •  Waves cleared: ${stats.waves} / 10`,
          `Creatures banished: ${stats.kills}  •  Elites banished: ${stats.elites || 0}  •  Surges: ${stats.surges || 0}`,
          `Wardens built: ${stats.placed}  •  Leaks: ${stats.leaked}  •  Lives remaining: ${stats.livesLeft}`,
          `Victory bonus +${1000} included. The tree burns on.`,
        ]
      : [
          `Score: ${stats.score}  •  Reached wave ${stats.wave} of 10`,
          `Creatures banished: ${stats.kills}  •  Wardens built: ${stats.placed}`,
          `The Gloom reached the tree ${stats.leaked} time${stats.leaked === 1 ? '' : 's'}.`,
          'Rebuild, rethink the placement — and try again.',
        ];
    rows.forEach((r, i) => ctx.fillText(r, VIEW_W / 2, panel.y + (win ? 132 : 96) + i * 26));
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = 0.6 + Math.sin(time * 3) * 0.4 > 0.7 ? '#ffe9b8' : '#b9aed6';
    ctx.fillText('Press R or click PLAY AGAIN above', VIEW_W / 2, panel.y + panel.h - 18);
  }
}
