// Emberwarden — boot and DOM shell: the canvas, the top bar, the build
// panel, and the animation loop. The game rules live in game.js; this
// file only wires them to the page.

import { VIEW_W, VIEW_H, TOWERS, TOWER_ORDER } from './config.js';
import { createAudio } from './audio.js';
import { createEffects } from './effects.js';
import { createGame } from './game.js';
import { drawGame } from './render.js';
import { attachInput } from './input.js';
import { applyShot } from './shots.js';
import { towerStats, canUpgrade, upgradeCost, sellValue } from './towers.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const audio = createAudio();
const effects = createEffects();
const game = createGame({ audio, effects });

// Exposed for the play-test harness (and curious players): read-only-ish
// access to the live game state. No cheats beyond what shots.js uses.
window.__ember = game;

const el = (id) => document.getElementById(id);
const hud = {
  gold: el('hud-gold'),
  lives: el('hud-lives'),
  score: el('hud-score'),
  wave: el('hud-wave'),
  kills: el('hud-kills'),
  waveBtn: el('btn-wave'),
  beginBtn: el('btn-begin'),
  speedBtn: el('btn-speed'),
  pauseBtn: el('btn-pause'),
  muteBtn: el('btn-mute'),
  panel: el('panel'),
  toast: el('toast'),
};

let lastHudJson = '';
function syncHud() {
  const h = game.getHud();
  const json = JSON.stringify([
    h.gold, h.lives, h.score, h.wave, h.kills, h.state, h.paused, h.speed,
    h.enemiesLeft, h.selectedPlot, h.selectedTower ? h.selectedTower.id : -1,
  ]);
  if (json === lastHudJson) return;
  lastHudJson = json;
  hud.gold.textContent = h.gold;
  hud.lives.textContent = h.lives;
  hud.score.textContent = h.score;
  hud.wave.textContent = h.wave === 0 ? '—' : `${h.wave} / ${h.waveTotal}`;
  hud.kills.textContent = h.kills;
  hud.waveBtn.disabled = h.state !== 'build';
  hud.waveBtn.style.display = (h.state === 'build' || h.state === 'wave') ? '' : 'none';
  hud.waveBtn.textContent = h.state === 'build'
    ? (h.wave === 0 ? '▶ Start Wave 1' : `▶ Start Wave ${h.wave + 1}`)
    : h.state === 'wave' ? `Wave ${h.wave} — ${h.enemiesLeft} left` : '—';
  hud.beginBtn.style.display = (h.state === 'title' || h.state === 'victory' || h.state === 'defeat') ? '' : 'none';
  hud.beginBtn.textContent = h.state === 'title' ? 'Begin the Watch' : 'Play Again';
  hud.speedBtn.textContent = `Speed ${h.speed}×`;
  hud.pauseBtn.textContent = h.paused ? 'Resume' : 'Pause';
  hud.pauseBtn.disabled = !(h.state === 'build' || h.state === 'wave');
  hud.muteBtn.textContent = audio.isMuted() ? '🔇 Muted' : '🔊 Sound';
  renderPanel(h);
}

function towerCard(key) {
  const def = TOWERS[key];
  const s = def.levels[0];
  const btn = document.createElement('button');
  btn.className = 'tower-btn';
  btn.innerHTML = `<span class="dot" style="background:${def.color}"></span>
    <span class="tname">${def.name}</span>
    <span class="tcost">🪙 ${def.cost}</span>
    <span class="tdesc">${def.desc}</span>
    <span class="tstats">DMG ${s.damage} · ${s.rate}/s · RNG ${s.range}${s.splash ? ` · splash ${s.splash}` : ''}${s.slowPct ? ` · slow ${Math.round(s.slowPct * 100)}%` : ''}</span>`;
  btn.addEventListener('click', () => {
    audio.unlock();
    if (game.selectedPlot >= 0) {
      if (game.buyTower(key)) syncHud();
      else syncHud();
    } else {
      game.setPlacing(key);
      hud.toast.textContent = `${def.name} selected — click a glowing plot to build it.`;
      syncHud();
    }
  });
  return btn;
}

function renderPanel(h) {
  hud.panel.innerHTML = '';
  const tower = h.selectedTower;
  if (tower) {
    const def = TOWERS[tower.key];
    const stats = towerStats(tower.key, tower.level);
    const div = document.createElement('div');
    div.className = 'panel-block';
    div.innerHTML = `<h3>${def.name} <span class="lvl">Lv ${tower.level}</span></h3>
      <p class="muted">DMG ${stats.damage} · ${stats.rate}/s · RNG ${stats.range}${stats.splash ? ` · splash ${stats.splash}` : ''}${stats.slowPct ? ` · slow ${Math.round(stats.slowPct * 100)}% for ${stats.slowSecs}s` : ''}</p>
      <p class="muted">Banished by this warden: ${tower.kills}</p>`;
    if (canUpgrade(tower)) {
      const up = document.createElement('button');
      up.className = 'action-btn';
      up.textContent = `⬆ Upgrade — 🪙 ${upgradeCost(tower)}`;
      up.addEventListener('click', () => { game.upgradeSelected(); syncHud(); });
      div.appendChild(up);
    } else {
      const max = document.createElement('p');
      max.className = 'muted';
      max.textContent = 'Max level reached.';
      div.appendChild(max);
    }
    const sell = document.createElement('button');
    sell.className = 'action-btn ghost';
    sell.textContent = `Sell — +🪙 ${sellValue(tower)}`;
    sell.addEventListener('click', () => { game.sellSelected(); syncHud(); });
    div.appendChild(sell);
    hud.panel.appendChild(div);
    return;
  }
  if (h.selectedPlot >= 0) {
    const div = document.createElement('div');
    div.className = 'panel-block';
    const h3 = document.createElement('h3');
    h3.textContent = 'Build a warden here';
    div.appendChild(h3);
    for (const key of TOWER_ORDER) div.appendChild(towerCard(key));
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'Keys 1 / 2 / 3 build Spark / Frost / Thorn on the selected plot.';
    div.appendChild(hint);
    hud.panel.appendChild(div);
    return;
  }
  const div = document.createElement('div');
  div.className = 'panel-block';
  const h3 = document.createElement('h3');
  h3.textContent = 'Build wardens';
  div.appendChild(h3);
  for (const key of TOWER_ORDER) div.appendChild(towerCard(key));
  const help = document.createElement('p');
  help.className = 'muted';
  help.innerHTML = 'Click a stone plot beside the path, then pick a warden.<br><br>'
    + '<b>Controls</b><br>Click plot — select · Click warden — upgrade / sell<br>'
    + 'Space — start wave · 1/2/3 — build · P — pause · M — mute · Esc — cancel<br><br>'
    + '<b>Tips</b><br>Frost slows fast packs; Thorn bursts clusters;<br>'
    + 'Spark is cheap and never wastes a shot.<br>'
    + 'Unspent gold earns a +10% ember tithe (max +30) at each wave clear.';
  div.appendChild(help);
  hud.panel.appendChild(div);
}

hud.beginBtn.addEventListener('click', () => {
  audio.unlock();
  game.startGame();
  syncHud();
});
hud.waveBtn.addEventListener('click', () => {
  if (game.startWave()) syncHud();
});
hud.speedBtn.addEventListener('click', () => {
  game.setSpeed(game.speed === 1 ? 2 : 1);
  syncHud();
});
hud.pauseBtn.addEventListener('click', () => {
  game.togglePause();
  syncHud();
});
hud.muteBtn.addEventListener('click', () => {
  audio.setMuted(!audio.isMuted());
  syncHud();
});

attachInput(canvas, game, {
  onBegin() {
    game.startGame();
    syncHud();
  },
  onStartWave() {
    game.startWave();
    syncHud();
  },
  onToggleMute() {
    audio.setMuted(!audio.isMuted());
    syncHud();
  },
  onSelectionChange() { syncHud(); },
});

// Resize the canvas backing store for crisp rendering on hidpi screens,
// keeping the logical 960×600 coordinate system.
function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// Demo scenes for screenshots: ?shot=start|play|late|end
const params = new URLSearchParams(window.location.search);
applyShot(game, params);
syncHud();

let last = performance.now();
function frame(now) {
  const rawDt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.update(rawDt * game.speed);
  drawGame(ctx, game, game.time);
  syncHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Screen-reader status line.
const statusEl = document.getElementById('status');
setInterval(() => {
  const h = game.getHud();
  statusEl.textContent = `Emberwarden. Wave ${h.wave} of ${h.waveTotal}. Gold ${h.gold}. Lives ${h.lives}. Score ${h.score}. ${h.state}.`;
}, 2000);
