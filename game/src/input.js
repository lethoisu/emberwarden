// Emberwarden — mouse and keyboard input. Converts page coordinates to
// game coordinates (the canvas is scaled to fit) and forwards intent to
// the game; the sidebar buttons in main.js call the same game methods.

import { VIEW_W, VIEW_H } from './config.js';

export function attachInput(canvas, game, hooks) {
  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW_W / rect.width;
    const scaleY = VIEW_H / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('click', (event) => {
    const p = toGameCoords(event);
    game.clickAt(p.x, p.y);
    hooks.onSelectionChange();
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toGameCoords(event);
    game.setHover(p.x, p.y);
  });

  canvas.addEventListener('mouseleave', () => {
    game.hoverPlot = -1;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const k = event.key.toLowerCase();
    if (k === 'enter' && game.state === 'title') {
      hooks.onBegin();
    } else if (k === 'r' && (game.state === 'victory' || game.state === 'defeat')) {
      hooks.onBegin();
    } else if (k === ' ') {
      if (game.state === 'build') {
        event.preventDefault();
        hooks.onStartWave();
      }
    } else if (k === 'p') {
      game.togglePause();
      hooks.onSelectionChange();
    } else if (k === 'q') {
      hooks.onSurge();
    } else if (k === 't') {
      hooks.onCycleTarget();
    } else if (k === 'm') {
      hooks.onToggleMute();
    } else if (k === 'escape') {
      game.cancelSelection();
      hooks.onSelectionChange();
    } else if (['1', '2', '3', '4', '5'].includes(k)) {
      const keys = ['spark', 'frost', 'thorn', 'volt', 'dawn'];
      const key = keys[Number(k) - 1];
      if (game.selectedPlot >= 0) {
        if (game.buyTower(key)) hooks.onSelectionChange();
        else hooks.onSelectionChange();
      } else {
        game.setPlacing(key);
        hooks.onSelectionChange();
      }
    }
  });
}
