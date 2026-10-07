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
