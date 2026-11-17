// Emberwarden — everything the player sees on the canvas: the grove, the
// path, the tree, wardens, the Gloom, and the title / victory / defeat
// screens. DOM (in main.js) owns the buttons and panels; this file owns
// the picture.

import { VIEW_W, VIEW_H, PATH, PLOTS, PLOT_R, TREE, PALETTE, TOWERS } from './config.js';
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
  ctx.moveTo(tower.x, tower.y - 8);
  ctx.lineTo(tower.x + Math.cos(tower.angle) * 16, tower.y - 8 + Math.sin(tower.angle) * 16);
  ctx.stroke();
  // Head by type.
  const hx = tower.x;
  const hy = tower.y - 10;
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
  // Ground.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 300, VIEW_W, VIEW_H - 300);
  ctx.fillStyle = PALETTE.groundAlt;
  ctx.fillRect(0, 300, VIEW_W, 4);
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
    ctx.fillText('EMBERWARDEN', VIEW_W / 2, 190);
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillStyle = '#e6dcff';
    ctx.fillText('Defend the last Ember Tree from the Gloom', VIEW_W / 2, 226);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#c9bfe8';
    const lines = [
      'The Gloom walks the winding path to your tree. Build wardens on the stone plots.',
      'Spark burns fast · Frost slows the swift · Thorn bursts whole clusters.',
      'Earn gold for every creature you banish. Survive all 10 waves — the Matriarch comes last.',
    ];
    lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, 288 + i * 26));
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = 0.6 + Math.sin(time * 3) * 0.4 > 0.7 ? '#ffe9b8' : '#b9aed6';
    ctx.fillText('Press ENTER or click BEGIN THE WATCH above', VIEW_W / 2, 420);
  }

  // Victory / defeat screens.
  if (game.state === 'victory' || game.state === 'defeat') {
    const win = game.state === 'victory';
    const stats = win ? game.victoryStats : game.defeatStats;
    ctx.fillStyle = 'rgba(12, 7, 28, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const panel = drawOverlayPanel(
      ctx,
      ['', '', '', '', ''],
      win ? '#ffd166' : '#ff6b6b',
    );
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillStyle = win ? '#ffd166' : '#ff6b6b';
    ctx.fillText(win ? 'THE GROVE IS SAFE!' : 'THE EMBER FADES…', VIEW_W / 2, panel.y + 58);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#e6dcff';
    const rows = win
      ? [
          `Final score: ${stats.score}  •  Waves cleared: ${stats.waves} / 10`,
          `Creatures banished: ${stats.kills}  •  Wardens built: ${stats.placed}`,
          `Leaks: ${stats.leaked}  •  Lives remaining: ${stats.livesLeft}`,
          `Victory bonus +${1000} included. The tree burns on.`,
        ]
      : [
          `Score: ${stats.score}  •  Reached wave ${stats.wave} of 10`,
          `Creatures banished: ${stats.kills}  •  Wardens built: ${stats.placed}`,
          `The Gloom reached the tree ${stats.leaked} time${stats.leaked === 1 ? '' : 's'}.`,
          'Rebuild, rethink the placement — and try again.',
        ];
    rows.forEach((r, i) => ctx.fillText(r, VIEW_W / 2, panel.y + 96 + i * 26));
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = 0.6 + Math.sin(time * 3) * 0.4 > 0.7 ? '#ffe9b8' : '#b9aed6';
    ctx.fillText('Press R or click PLAY AGAIN above', VIEW_W / 2, panel.y + panel.h - 18);
  }
}
