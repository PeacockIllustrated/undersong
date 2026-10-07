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
  sound: {
    label: 'Sound',
    hint: 'Picks, ore, the forge, purchases and the verses. Press M to mute or unmute.',
  },
  music: {
    label: 'The hum',
    hint: 'A low drone under the mountain that deepens as you dig.',
  },
  levels: ['Off', 'Low', 'Medium', 'High'],
  muted: 'Sound off',
  unmuted: 'Sound on',
  mutedSub: 'Press M again to bring it back',
  aim: {
    label: 'Aim on touch',
    hint: 'What shows the tile under your finger: a magnifier above it, a crosshair floating above it, or nothing.',
    loupe: 'Magnifier',
    crosshair: 'Crosshair',
    off: 'Off',
  },
  smartDig: {
    label: 'Smart dig',
    hint: 'A tap beside ore digs the ore. A long press on ore takes the whole vein you can see.',
  },
  haptics: {
    label: 'Vibration',
    hint: 'A short buzz when you break rock, stronger on ore during a Vein Rush. Phones that can vibrate only.',
  },
  numbers: {
    label: 'Numbers',
    hint: 'Big numbers as 1.5M, or as 1.50e6.',
    short: '1.5M',
    scientific: '1.50e6',
  },
} as const;
