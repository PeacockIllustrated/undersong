// Wording for the M13 quality-of-life pieces: the key list, the Lately list and the pinned goal.

export const KEYS_TEXT = {
  title: 'Keys',
  open: 'Keys',
  rows: [
    ['V', 'The Village'],
    ['B', 'The Survey Book'],
    ['C', 'The tinker’s cart, while it is parked'],
    ['F', 'Follow the Foreman'],
    ['G', 'The whole mountain'],
    ['1 to 6', 'Pick a tool'],
    ['W A S D or arrows', 'Look around'],
    ['+ and −', 'Zoom'],
    ['M', 'Mute or unmute'],
    ['Esc', 'Close a panel, or stop digging'],
    ['?', 'This list'],
  ] as readonly (readonly [string, string])[],
  holdHint: 'Hold a buy button to keep buying.',
  close: 'Close',
};

export const LATELY_TEXT = {
  title: 'Lately',
  open: 'Lately',
  empty: 'Nothing yet. Everything that flashes up on screen is kept here.',
  note: 'The last 50 things that happened, newest first. Kept on this device, apart from your save.',
  ago: (ms: number): string => {
    const s = Math.round(ms / 1000);
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 48) return `${h} h ago`;
    return `${Math.round(h / 24)} days ago`;
  },
  biome: (name: string): string => `Reached ${name}`,
  close: 'Close',
};

export const DRAWER_TEXT = {
  village: 'Village',
  survey: 'Survey Book',
  menu: 'Menu',
  nav: 'Panels',
  close: 'Close',
  closeKey: 'Close (Esc)',
  newThings: 'Something new here',
};

export const SURVEY_TABS = {
  cycle: 'Cave-in',
  echoes: 'Echoes',
  verses: 'Verses',
  shelf: 'Shelf',
  pages: 'Ledger',
  feats: 'Feats',
};

export const MENU_TABS = { game: 'Save' };

export const PIN_TEXT = {
  pin: 'Pin to the screen',
  unpin: 'Unpin',
  auto: 'Auto',
  autoOn: 'Buying this by itself while it costs a tenth of what you hold. Tap to stop.',
  autoOff: 'Buy this by itself whenever it costs no more than a tenth of what you hold',
  miner: 'A miner',
  whetstone: 'Sharpening',
  plot: 'A barley plot',
  sapling: 'A sapling',
  ready: 'Ready',
  readyToast: (name: string): string => `${name} is ready`,
  readyToastSub: 'Your pinned goal can be bought',
  chipTitle: 'Your pinned goal. Tap to go to it.',
};

export const LEDGER_TEXT = {
  title: 'Ledger',
  time: 'Time',
  mins: (m: number): string => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`),
  played: 'Time in the mountain',
  playedRun: 'This cycle',
  tiles: 'Tiles dug',
  tilesRun: 'This cycle',
  chests: 'Old chests opened',
  caveIns: 'Cave-ins',
  collapses: 'Roofs that fell',
  deepest: 'Deepest ever',
  fastest: 'Fastest Cave-in',
  echoes: 'Echoes earned in all',
  none: '—',
};
