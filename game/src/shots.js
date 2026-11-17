// Emberwarden — scripted demo scenes for screenshots (?shot=...).
// Each scene drives the real game through its public methods, then runs
// the simulation forward so the shot shows genuine play, not a mock-up.
// The screenshots are real renders of the game's own code.

import { TOWERS } from './config.js';

function placeSet(game, placements) {
  game.grantGold(10000);
  for (const [plot, key] of placements) {
    game.selectedPlot = plot;
    game.buyTower(key);
  }
  // Level a few of them up for a late-game look.
  for (const tower of [...game.towers]) {
    while (tower.level < 2 && game.gold > 200) {
      game.selectedTowerId = tower.id;
      game.upgradeSelected();
    }
  }
  game.cancelSelection();
}

function fastForward(game, seconds) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    game.update(dt);
    if (game.state === 'victory' || game.state === 'defeat') break;
  }
}

export function applyShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return;
  if (shot === 'start') return; // title screen is the default state

  if (shot === 'play') {
    game.startGame();
    placeSet(game, [
      [0, 'spark'], [4, 'spark'], [6, 'frost'], [8, 'thorn'], [11, 'spark'],
    ]);
    // Clear wave 1, then catch wave 2 mid-flow so the shot shows live
    // combat: enemies on the path, projectiles in the air.
    game.startWave(); // wave 1
    fastForward(game, 20);
    if (game.state === 'build') {
      game.startWave(); // wave 2
      fastForward(game, 6.5);
    }
    game.setGold(140);
    return;
  }

  if (shot === 'late') {
    game.startGame();
    placeSet(game, [
      [0, 'spark'], [1, 'frost'], [2, 'spark'], [4, 'thorn'], [5, 'frost'],
      [6, 'spark'], [7, 'thorn'], [8, 'frost'], [9, 'spark'], [11, 'thorn'],
    ]);
    // Walk through waves 1-7 quickly by clearing them with a strong board.
    for (let w = 1; w <= 7; w++) {
      if (game.state !== 'build') break;
      game.startWave();
      fastForward(game, 40);
      if (game.state === 'victory' || game.state === 'defeat') break;
    }
    if (game.state === 'build') {
      game.startWave(); // wave 8 in progress
      fastForward(game, 9);
    }
    game.setGold(230);
    return;
  }

  if (shot === 'end') {
    game.startGame();
    placeSet(game, [
      [0, 'spark'], [1, 'frost'], [2, 'spark'], [3, 'thorn'], [4, 'spark'],
      [5, 'frost'], [6, 'thorn'], [7, 'spark'], [8, 'frost'], [9, 'thorn'],
      [10, 'spark'], [11, 'frost'], [12, 'thorn'],
    ]);
    // Max the board out, then play every wave to the end.
    for (const tower of [...game.towers]) {
      while (tower.level < 3 && game.gold > 300) {
        game.selectedTowerId = tower.id;
        game.upgradeSelected();
      }
    }
    game.cancelSelection();
    for (let w = 1; w <= 10; w++) {
      if (game.state !== 'build') break;
      game.startWave();
      fastForward(game, 60);
      if (game.state === 'victory' || game.state === 'defeat') break;
    }
    game.setGold(410);
    return;
  }
}

export { TOWERS };
