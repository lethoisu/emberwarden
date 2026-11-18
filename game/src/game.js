// Emberwarden — the game itself: state machine, economy, waves, combat
// resolution. Rendering lives in render.js, input in input.js; this file
// owns every rule that decides whether the player wins or loses.

import {
  START_GOLD, START_LIVES, WAVE_CLEAR_BASE, WAVE_CLEAR_PER_WAVE,
  TITHE_RATE, TITHE_CAP, SCORE_PER_GOLD, VICTORY_BONUS, TOWERS,
  STAR_LIVES,
} from './config.js';
import { createRng } from './random.js';
import { makeEnemy, buildSpawnQueue, waveCount, stepEnemy, applySlow } from './enemies.js';
import { makeTower, towerStats, acquireTarget, fireTower, applyUpgrade, sellValue, canUpgrade, upgradeCost, cycleTargetMode } from './towers.js';
import { applySurge, surgeUsesPerWave, surgeDamage } from './surge.js';
import { plotAt, PATH_LENGTH } from './map.js';

export function createGame(deps) {
  const { audio, effects } = deps;
  const rng = createRng((Date.now() ^ 0x5eed) >>> 0);

  const game = {
    state: 'title', // title | build | wave | victory | defeat
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    wave: 0,
    kills: 0,
    time: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveTotal: 0,
    selectedPlot: -1,
    selectedTowerId: -1,
    placing: null,
    hoverPlot: -1,
    hover: { x: 0, y: 0 },
    paused: false,
    speed: 1,
    banner: null,
    stats: { placed: 0, upgraded: 0, sold: 0, leaked: 0, earned: 0, surges: 0, elites: 0 },
    treeFlash: 0,
    surgeLeft: surgeUsesPerWave(),
    surgeFlash: 0,
    victoryStats: null,
    defeatStats: null,
    bestScore: 0,
  };

  // Best score persists in the browser only; the Node sim has no storage.
  try {
    if (typeof localStorage !== 'undefined') {
      game.bestScore = Number(localStorage.getItem('emberwarden-best') || 0) || 0;
    }
  } catch { /* private mode: no best score, game still plays */ }

  function showBanner(title, sub, secs = 2.2) {
    game.banner = { title, sub, until: game.time + secs };
  }

  function selectedTower() {
    return game.towers.find((t) => t.id === game.selectedTowerId) || null;
  }

  function resetRun() {
    game.gold = START_GOLD;
    game.lives = START_LIVES;
    game.score = 0;
    game.wave = 0;
    game.kills = 0;
    game.time = 0;
    game.towers = [];
    game.enemies = [];
    game.projectiles = [];
    game.spawnQueue = [];
    game.waveTotal = 0;
    game.selectedPlot = -1;
    game.selectedTowerId = -1;
    game.placing = null;
    game.paused = false;
    game.speed = 1;
    game.banner = null;
    game.stats = { placed: 0, upgraded: 0, sold: 0, leaked: 0, earned: 0, surges: 0, elites: 0 };
    game.treeFlash = 0;
    game.surgeLeft = surgeUsesPerWave();
    game.surgeFlash = 0;
    game.victoryStats = null;
    game.defeatStats = null;
  }

  function startGame() {
    resetRun();
    game.state = 'build';
    audio.unlock();
    audio.startPad();
    audio.horn();
    showBanner('Defend the Ember Tree', 'Place wardens on the stone plots, then start Wave 1.', 3);
  }

  function startWave() {
    if (game.state !== 'build') return false;
    if (game.wave >= waveCount()) return false;
    game.wave += 1;
    game.spawnQueue = buildSpawnQueue(game.wave - 1, rng);
    game.waveTotal = game.spawnQueue.length;
    game.spawnTimer = 0;
    game.surgeLeft = surgeUsesPerWave();
    game.state = 'wave';
    game.selectedPlot = -1;
    game.selectedTowerId = -1;
    game.placing = null;
    audio.horn();
    if (game.wave === waveCount()) audio.bossRoar();
    const names = { 10: 'The Gloom Matriarch comes' };
    showBanner(`Wave ${game.wave} of ${waveCount()}`, names[game.wave] || 'The Gloom stirs in the cave…');
    return true;
  }

  function plotOccupied(i) {
    return game.towers.some((t) => t.plotIndex === i);
  }

  function buyTower(key) {
    if (game.state !== 'build' && game.state !== 'wave') return false;
    if (game.selectedPlot < 0 || plotOccupied(game.selectedPlot)) return false;
    const def = TOWERS[key];
    if (!def) return false;
    if (game.gold < def.cost) {
      audio.error();
      showBanner('Not enough gold', `${def.name} costs ${def.cost} gold.`, 1.4);
      return false;
    }
    game.gold -= def.cost;
    const tower = makeTower(key, game.selectedPlot);
    game.towers.push(tower);
    game.stats.placed += 1;
    game.selectedTowerId = tower.id;
    game.selectedPlot = -1;
    game.placing = null;
    audio.place();
    effects.poof(tower.x, tower.y - 10, def.color);
    return true;
  }

  function upgradeSelected() {
    const tower = selectedTower();
    if (!tower || !canUpgrade(tower)) return false;
    const cost = upgradeCost(tower);
    if (game.gold < cost) {
      audio.error();
      showBanner('Not enough gold', `Upgrade costs ${cost} gold.`, 1.4);
      return false;
    }
    game.gold -= cost;
    applyUpgrade(tower);
    game.stats.upgraded += 1;
    audio.upgrade();
    effects.heal(tower.x, tower.y - 10);
    effects.text(tower.x, tower.y - 34, 'LEVEL UP!', '#7dffb0', true);
    return true;
  }

  function sellSelected() {
    const tower = selectedTower();
    if (!tower) return false;
    const value = sellValue(tower);
    game.gold += value;
    game.towers = game.towers.filter((t) => t.id !== tower.id);
    game.selectedTowerId = -1;
    game.stats.sold += 1;
    audio.coin();
    effects.text(tower.x, tower.y - 30, `+${value} gold`, '#ffd166');
    return true;
  }

  // Ember Surge: one dawnlight burst per wave, free, timed by the player.
  function useSurge() {
    if (game.state !== 'wave' || game.surgeLeft <= 0) return false;
    if (game.enemies.length === 0) return false;
    game.surgeLeft -= 1;
    game.stats.surges += 1;
    game.surgeFlash = 0.6;
    const struck = applySurge(game.enemies, game.wave, damageEnemy);
    effects.surgeFlash();
    effects.text(480, 150, `EMBER SURGE! ${struck} struck`, '#ffe9b8', true);
    audio.surge();
    return true;
  }

  function cycleSelectedTargetMode() {
    const tower = selectedTower();
    if (!tower) return null;
    return cycleTargetMode(tower);
  }

  function victoryStars() {
    if (game.lives >= STAR_LIVES.three) return 3;
    if (game.lives >= STAR_LIVES.two) return 2;
    return 1;
  }

  function clickAt(x, y) {
    if (game.state === 'title' || game.state === 'victory' || game.state === 'defeat') return;
    // A tower first (towers sit on plots, so check them before the plot).
    for (const t of game.towers) {
      if (Math.hypot(x - t.x, y - t.y) <= 26) {
        game.selectedTowerId = t.id;
        game.selectedPlot = -1;
        game.placing = null;
        audio.click();
        return;
      }
    }
    const plot = plotAt(x, y);
    if (plot >= 0) {
      game.selectedPlot = plot;
      game.selectedTowerId = -1;
      audio.click();
      return;
    }
    game.selectedPlot = -1;
    game.selectedTowerId = -1;
    game.placing = null;
  }

  function waveCleared() {
    const bonus = WAVE_CLEAR_BASE + WAVE_CLEAR_PER_WAVE * game.wave;
    const tithe = Math.min(TITHE_CAP, Math.floor(game.gold * TITHE_RATE));
    game.gold += bonus + tithe;
    game.score += 100 * game.wave;
    audio.waveClear();
    if (game.wave >= waveCount()) {
      game.score += VICTORY_BONUS;
      game.state = 'victory';
      if (game.score > game.bestScore) {
        game.bestScore = game.score;
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem('emberwarden-best', String(game.bestScore));
        } catch { /* ignore */ }
      }
      game.victoryStats = {
        score: game.score,
        kills: game.kills,
        waves: game.wave,
        placed: game.stats.placed,
        leaked: game.stats.leaked,
        livesLeft: game.lives,
        stars: victoryStars(),
        surges: game.stats.surges,
        elites: game.stats.elites,
      };
      audio.victory();
      showBanner('The grove is safe!', '', 4);
      return;
    }
    game.state = 'build';
    showBanner(
      `Wave ${game.wave} cleared!`,
      `+${bonus} gold bonus  •  +${tithe} ember tithe  •  next wave when ready`,
      2.6,
    );
  }

  function killEnemy(e) {
    e.dead = true;
    game.gold += e.bounty;
    game.score += e.bounty * SCORE_PER_GOLD;
    game.kills += 1;
    if (e.elite) game.stats.elites += 1;
    game.stats.earned += e.bounty;
    effects.poof(e.x, e.y, e.color);
    if (e.elite) effects.text(e.x, e.y - 26, `ELITE +${e.bounty}`, '#ffd166', true);
    else effects.text(e.x, e.y - 14, `+${e.bounty}`, '#ffd166');
    audio.pop();
  }

  function leakEnemy(e) {
    e.leaked = true;
    game.lives -= e.lives;
    game.stats.leaked += 1;
    game.treeFlash = 0.5;
    effects.shake(7, 0.35);
    effects.splash(e.x, e.y, '#ff6b6b');
    audio.leak();
    if (game.lives <= 0) {
      game.lives = 0;
      game.state = 'defeat';
      game.defeatStats = {
        score: game.score,
        kills: game.kills,
        wave: game.wave,
        placed: game.stats.placed,
        leaked: game.stats.leaked,
      };
      audio.defeat();
    }
  }

  function damageEnemy(e, amount) {
    if (e.dead || e.leaked) return;
    e.hp -= amount;
    if (e.hp <= 0) killEnemy(e);
  }

  function updateProjectiles(dt) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
      const p = game.projectiles[i];
      const target = game.enemies.find((e) => e.id === p.targetId && !e.dead && !e.leaked);
      const tx = target ? target.x : p.lastX;
      const ty = target ? target.y : p.lastY;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 6) {
        // Impact.
        if (target) {
          if (p.splash > 0) {
            effects.splash(tx, ty, p.color);
            audio.hit();
            for (const e of game.enemies) {
              if (e.dead || e.leaked) continue;
              if (Math.hypot(e.x - tx, e.y - ty) <= p.splash + e.radius) {
                damageEnemy(e, p.damage);
              }
            }
          } else if (p.chain > 0) {
            // Volt Bloom: the bolt arcs to the nearest foes, each arc
            // weaker than the last.
            effects.bolt(p.x, p.y, tx, ty, p.color);
            damageEnemy(target, p.damage);
            let from = target;
            let dmg = p.damage;
            for (let c = 0; c < p.chain; c++) {
              dmg = Math.round(dmg * 0.6);
              let next = null;
              let nextD = 95;
              for (const e of game.enemies) {
                if (e.dead || e.leaked || e === from) continue;
                const dd = Math.hypot(e.x - from.x, e.y - from.y);
                if (dd < nextD) { next = e; nextD = dd; }
              }
              if (!next) break;
              effects.bolt(from.x, from.y, next.x, next.y, p.color);
              damageEnemy(next, dmg);
              from = next;
            }
          } else {
            effects.spark(tx, ty, p.color);
            damageEnemy(target, p.damage);
            if (p.slowPct > 0) applySlow(target, p.slowPct, p.slowSecs, game.time);
          }
        }
        game.projectiles.splice(i, 1);
        continue;
      }
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      p.lastX = tx;
      p.lastY = ty;
      // Trail.
      if (Math.random() < 0.5) effects.spark(p.x, p.y, p.color);
    }
  }

  function update(dt) {
    if (game.paused) return;
    game.time += dt;
    if (game.treeFlash > 0) game.treeFlash -= dt;
    if (game.surgeFlash > 0) game.surgeFlash -= dt;
    for (const t of game.towers) {
      if (t.flash > 0) t.flash -= dt;
      if (t.recoil > 0) t.recoil -= dt;
    }
    effects.update(dt);

    if (game.state === 'title' || game.state === 'victory' || game.state === 'defeat') {
      // Ambient drift only: embers rise from the tree on the title screen.
      if (Math.random() < dt * 6) {
        effects.emberDrift(884 + (Math.random() * 40 - 20), 470 + (Math.random() * 20 - 10));
      }
      return;
    }

    // Spawning.
    if (game.state === 'wave' && game.spawnQueue.length > 0) {
      game.spawnTimer += dt;
      while (game.spawnQueue.length > 0 && game.spawnQueue[0].at <= game.spawnTimer) {
        const spawn = game.spawnQueue.shift();
        game.enemies.push(makeEnemy(spawn.key, game.wave, rng, spawn.elite));
      }
    }

    // Towers fire.
    for (const tower of game.towers) {
      const target = acquireTarget(tower, game.enemies);
      if (target) {
        const p = fireTower(tower, target, dt);
        if (p) {
          p.lastX = target.x;
          p.lastY = target.y;
          game.projectiles.push(p);
          audio.shoot(tower.key);
        }
      } else {
        tower.cooldown = Math.max(0, tower.cooldown - dt);
      }
    }

    updateProjectiles(dt);

    // Enemies walk.
    for (const e of game.enemies) {
      if (e.dead || e.leaked) continue;
      if (stepEnemy(e, dt, game.time) === 'leaked') leakEnemy(e);
    }
    game.enemies = game.enemies.filter((e) => !e.dead && !e.leaked);

    // Wave end?
    if (game.state === 'wave' && game.spawnQueue.length === 0 && game.enemies.length === 0) {
      waveCleared();
    }
  }

  function getHud() {
    return {
      state: game.state,
      gold: game.gold,
      lives: game.lives,
      score: game.score,
      wave: game.wave,
      waveTotal: waveCount(),
      kills: game.kills,
      paused: game.paused,
      speed: game.speed,
      enemiesLeft: game.enemies.length + game.spawnQueue.length,
      selectedPlot: game.selectedPlot,
      selectedTower: selectedTower(),
      placing: game.placing,
      banner: game.banner && game.time < game.banner.until ? game.banner : null,
      surgeLeft: game.surgeLeft,
      surgeDamage: surgeDamage(Math.max(1, game.wave)),
      boss: game.enemies.find((e) => e.key === 'matriarch' && !e.dead && !e.leaked) || null,
      totalEnemies: game.enemies.length + game.spawnQueue.length,
    };
  }

  return {
    // State is read by render.js / main.js; rules only change it through here.
    get state() { return game.state; },
    get gold() { return game.gold; },
    get lives() { return game.lives; },
    get score() { return game.score; },
    get wave() { return game.wave; },
    get kills() { return game.kills; },
    get time() { return game.time; },
    get towers() { return game.towers; },
    get enemies() { return game.enemies; },
    get projectiles() { return game.projectiles; },
    get selectedPlot() { return game.selectedPlot; },
    set selectedPlot(v) { game.selectedPlot = v; },
    get selectedTowerId() { return game.selectedTowerId; },
    set selectedTowerId(v) { game.selectedTowerId = v; },
    get placing() { return game.placing; },
    get hoverPlot() { return game.hoverPlot; },
    set hoverPlot(v) { game.hoverPlot = v; },
    get hover() { return game.hover; },
    get paused() { return game.paused; },
    get speed() { return game.speed; },
    get banner() { return game.banner && game.time < game.banner.until ? game.banner : null; },
    get treeFlash() { return game.treeFlash; },
    get surgeLeft() { return game.surgeLeft; },
    get surgeFlash() { return game.surgeFlash; },
    get boss() { return game.enemies.find((e) => e.key === 'matriarch' && !e.dead && !e.leaked) || null; },
    get effects() { return effects; },
    get stats() { return game.stats; },
    get victoryStats() { return game.victoryStats; },
    get defeatStats() { return game.defeatStats; },
    get bestScore() { return game.bestScore; },
    get enemiesLeft() { return game.enemies.length + game.spawnQueue.length; },
    get waveTotal() { return game.waveTotal; },

    startGame,
    startWave,
    buyTower,
    upgradeSelected,
    sellSelected,
    useSurge,
    cycleSelectedTargetMode,
    victoryStars,
    clickAt,
    plotOccupied,
    selectedTower,
    update,
    getHud,

    setSpeed(n) { game.speed = n === 2 ? 2 : 1; },
    togglePause() {
      if (game.state === 'build' || game.state === 'wave') {
        game.paused = !game.paused;
      }
    },
    setPlacing(key) {
      game.placing = key;
      game.selectedTowerId = -1;
    },
    cancelSelection() {
      game.selectedPlot = -1;
      game.selectedTowerId = -1;
      game.placing = null;
    },
    setHover(x, y) {
      game.hover.x = x;
      game.hover.y = y;
      game.hoverPlot = plotAt(x, y);
    },
    // Test/demo hook: grant gold (used by shots.js demo scenes only).
    grantGold(n) { game.gold += n; },
    // Test/demo hook: set gold to a plausible value after a demo scene is
    // built, so the HUD reads like a real game in screenshots.
    setGold(n) { game.gold = Math.max(0, Math.floor(n)); },
  };
}
