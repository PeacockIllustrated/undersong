// Wording for the Settings panel (M5-01).
export const SETTINGS_TEXT = {
  title: 'Settings',
  open: 'Settings',
  back: 'Back',
  note: 'Settings are kept on this device, apart from your save. Starting over leaves them as they are.',
  on: 'On',
  off: 'Off',
  motion: {
    label: 'Motion',
    hint: 'Screen shake, pulsing buttons and sliding panels. Auto follows your device.',
    auto: 'Auto',
    full: 'Full',
    reduced: 'Reduced',
  },
  text: {
    label: 'Text size',
    hint: 'Panels, cards and the HUD.',
    sizes: ['Normal', 'Large', 'Larger'],
  },
  marks: {
    label: 'Shape marks',
    hint: 'A moon over faces too dark to work at full speed, and a heat badge on rock too hot to work, so neither relies on colour.',
  },
  numbers: {
    label: 'Numbers',
    hint: 'Big numbers as 1.5M, or as 1.50e6.',
    short: '1.5M',
    scientific: '1.50e6',
  },
} as const;
