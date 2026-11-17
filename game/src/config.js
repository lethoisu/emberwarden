// Emberwarden — tuning, map and content tables.
// Every number the game balances on lives here so the rest of the code
// stays about behaviour, not magic constants.

export const VIEW_W = 960;
export const VIEW_H = 600;

// The winding path the Gloom walks, from the cave (left) to the Ember Tree.
export const PATH = [
  { x: -30, y: 110 },
  { x: 190, y: 110 },
  { x: 190, y: 290 },
  { x: 740, y: 290 },
  { x: 740, y: 470 },
  { x: 848, y: 470 },
];
export const PATH_WIDTH = 46;
export const TREE = { x: 884, y: 470, r: 34 };

// Build plots: fixed pads beside the path where wardens may stand.
export const PLOTS = [
  { x: 95, y: 190 }, { x: 95, y: 40 },
  { x: 120, y: 200 }, { x: 265, y: 200 },
  { x: 300, y: 205 }, { x: 430, y: 205 }, { x: 560, y: 205 },
  { x: 300, y: 375 }, { x: 430, y: 375 }, { x: 560, y: 375 },
  { x: 665, y: 380 }, { x: 815, y: 380 },
  { x: 700, y: 545 },
];
export const PLOT_R = 24;

// Starting resources.
export const START_GOLD = 100;
export const START_LIVES = 20;
export const SELL_RATE = 0.7; // refund share of everything invested in a tower
export const WAVE_CLEAR_BASE = 20; // gold bonus on clearing a wave
export const WAVE_CLEAR_PER_WAVE = 5;
export const TITHE_RATE = 0.1; // +10% of unspent gold at wave clear
export const TITHE_CAP = 30;
export const SCORE_PER_GOLD = 10; // score per bounty gold earned
export const VICTORY_BONUS = 1000;

// Tower types. levels[i] is the stat block at level i+1; upgradeCost[i] is
// the price to go from level i+1 to level i+2.
export const TOWERS = {
  spark: {
    key: 'spark',
    name: 'Spark Spire',
    short: 'Spark',
    desc: 'Fast ember bolts. Cheap, reliable, single target.',
    color: '#ffb347',
    glow: '#ff8c1a',
    cost: 50,
    levels: [
      { damage: 8, rate: 2.0, range: 112, upgradeCost: 40 },
      { damage: 14, rate: 2.4, range: 118, upgradeCost: 65 },
      { damage: 24, rate: 3.0, range: 128, upgradeCost: 0 },
    ],
  },
  frost: {
    key: 'frost',
    name: 'Frost Bloom',
    short: 'Frost',
    desc: 'Chilling bolts that slow the Gloom. Counters fast packs.',
    color: '#7fe7ff',
    glow: '#38b6e8',
    cost: 70,
    levels: [
      { damage: 4, rate: 1.0, range: 104, slowPct: 0.45, slowSecs: 1.5, upgradeCost: 55 },
      { damage: 8, rate: 1.1, range: 112, slowPct: 0.55, slowSecs: 1.8, upgradeCost: 85 },
      { damage: 15, rate: 1.3, range: 122, slowPct: 0.65, slowSecs: 2.2, upgradeCost: 0 },
    ],
  },
  thorn: {
    key: 'thorn',
    name: 'Thorn Cannon',
    short: 'Thorn',
    desc: 'Slow, heavy seed-bombs that burst and hurt a whole cluster.',
    color: '#b8ff7a',
    glow: '#6fce3e',
    cost: 100,
    levels: [
      { damage: 26, rate: 0.5, range: 132, splash: 52, upgradeCost: 75 },
      { damage: 50, rate: 0.55, range: 140, splash: 62, upgradeCost: 125 },
      { damage: 88, rate: 0.65, range: 150, splash: 76, upgradeCost: 0 },
    ],
  },
};
export const TOWER_ORDER = ['spark', 'frost', 'thorn'];

// Enemy types. hpMul grows with the wave; speed is px/s on the path.
export const ENEMIES = {
  mote: {
    key: 'mote', name: 'Mote',
    hp: 26, speed: 60, bounty: 6, lives: 1, radius: 11,
    color: '#8f7bff', glow: '#5a3df0',
  },
  wisp: {
    key: 'wisp', name: 'Wisp',
    hp: 44, speed: 74, bounty: 8, lives: 1, radius: 10,
    color: '#ff7ad9', glow: '#d6339c',
  },
  husk: {
    key: 'husk', name: 'Husk',
    hp: 130, speed: 31, bounty: 11, lives: 1, radius: 15,
    color: '#9aa7bd', glow: '#5d6b82',
  },
  shade: {
    key: 'shade', name: 'Shade',
    hp: 85, speed: 46, bounty: 13, lives: 2, radius: 12,
    color: '#3d4b66', glow: '#1c2438', slowImmune: true,
  },
  matriarch: {
    key: 'matriarch', name: 'Gloom Matriarch',
    hp: 1200, speed: 23, bounty: 160, lives: 5, radius: 26,
    color: '#c9a0ff', glow: '#7b2ff7',
  },
};

// Wave list: [enemyKey, count] groups, spawned in order, interval seconds
// between spawns. Enemy hp scales by 1 + 0.16 * (wave - 1).
export const WAVES = [
  { groups: [['mote', 8]], interval: 0.9 },
  { groups: [['mote', 12]], interval: 0.8 },
  { groups: [['mote', 8], ['husk', 4]], interval: 0.75 },
  { groups: [['wisp', 10], ['mote', 6]], interval: 0.7 },
  { groups: [['husk', 8], ['wisp', 8]], interval: 0.65 },
  { groups: [['shade', 6], ['mote', 10]], interval: 0.65 },
  { groups: [['husk', 12], ['wisp', 8], ['shade', 4]], interval: 0.6 },
  { groups: [['wisp', 16], ['shade', 8]], interval: 0.55 },
  { groups: [['husk', 10], ['shade', 10], ['wisp', 10]], interval: 0.55 },
  { groups: [['matriarch', 1], ['mote', 8], ['wisp', 6]], interval: 0.6 },
];
export const HP_PER_WAVE = 0.22;

export const PALETTE = {
  skyTop: '#1b1740',
  skyMid: '#241d4e',
  skyBot: '#33254f',
  ground: '#241a33',
  groundAlt: '#2a1f3d',
  path: '#4a3560',
  pathEdge: '#5d4472',
  plot: '#3a2b52',
  plotEdge: '#6b5583',
  plotOk: '#7dffb0',
  plotBad: '#ff7a7a',
  gold: '#ffd166',
  text: '#f4efff',
  dim: '#b9aed6',
  danger: '#ff6b6b',
  ember: '#ff9a3c',
};
