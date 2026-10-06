// Sound (ADR-027): every effect is synthesised with Web Audio from these recipes, so there are no audio files.
// canon §16 lists the cues, the verse motif and the drone roots. Times are in seconds, frequencies in Hz.

/** One oscillator: starts at `at`, rises over `a`, decays over `d`, optionally sliding to `to` Hz. */
export interface Tone {
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth';
  f: number;
  to?: number;
  at?: number;
  a: number;
  d: number;
  g: number;
}

/** A burst of band-passed noise: the crunch and rumble of rock. */
export interface Noise {
  band: number;
  q: number;
  to?: number;
  at?: number;
  a: number;
  d: number;
  g: number;
}

export interface Cue {
  tones?: readonly Tone[];
  noise?: readonly Noise[];
  /** Shortest gap between two plays, in ms, so a busy mine never turns into a wall of noise. */
  gap: number;
  /** Random pitch spread, as a fraction (0.06 = ±6%), so repeats don't sound mechanical. */
  jitter?: number;
}

const t = (wave: Tone['wave'], f: number, d: number, g: number, more: Partial<Tone> = {}): Tone => ({
  wave,
  f,
  a: 0.004,
  d,
  g,
  ...more,
});
const n = (band: number, d: number, g: number, more: Partial<Noise> = {}): Noise => ({
  band,
  q: 1.2,
  a: 0.003,
  d,
  g,
  ...more,
});

export const CUES = {
  /** The pick striking the face, while the Foreman works it. */
  chip: {
    noise: [n(2600, 0.04, 0.1, { q: 3 })],
    tones: [t('triangle', 900, 0.03, 0.04, { to: 620 })],
    gap: 70,
    jitter: 0.12,
  },
  /** A tile breaks: dirt and grass. */
  breakSoft: {
    noise: [n(520, 0.12, 0.3)],
    tones: [t('sine', 130, 0.12, 0.28, { to: 70 })],
    gap: 40,
    jitter: 0.08,
  },
  /** A tile breaks: stone and the harder rocks. */
  breakStone: {
    noise: [n(1500, 0.09, 0.3, { q: 1.6 })],
    tones: [t('triangle', 230, 0.1, 0.22, { to: 140 })],
    gap: 40,
    jitter: 0.08,
  },
  /** A tile breaks: ore, with a glint on top. */
  breakOre: {
    noise: [n(1500, 0.09, 0.28, { q: 1.6 })],
    tones: [t('triangle', 230, 0.1, 0.2, { to: 140 }), t('sine', 1320, 0.25, 0.07, { at: 0.02 })],
    gap: 40,
    jitter: 0.05,
  },
  /** A tile breaks: resonant crystal and singing stone ring. */
  breakCrystal: {
    noise: [n(3000, 0.05, 0.12, { q: 2 })],
    tones: [
      t('sine', 1760, 0.7, 0.09),
      t('sine', 2637, 0.5, 0.05, { at: 0.01 }),
      t('triangle', 880, 0.4, 0.05),
    ],
    gap: 60,
    jitter: 0.03,
  },
  /** A miner's tile breaking somewhere on screen: the same crunch, small and far off. */
  breakFar: {
    noise: [n(900, 0.07, 0.07)],
    tones: [t('triangle', 180, 0.07, 0.05, { to: 120 })],
    gap: 120,
    jitter: 0.15,
  },
  /** Ore into the Foreman's pack. Pitched up a step for each link of a Vein Rush. */
  drop: {
    tones: [t('triangle', 988, 0.1, 0.1, { to: 1319 }), t('sine', 1976, 0.12, 0.03, { at: 0.03 })],
    gap: 50,
  },
  /** The forge turns out a bar. */
  smelt: { tones: [t('triangle', 1568, 0.45, 0.05), t('sine', 2093, 0.3, 0.025, { at: 0.005 })], gap: 1800 },
  /** Anything bought. */
  bought: { tones: [t('triangle', 784, 0.16, 0.13), t('triangle', 1175, 0.22, 0.13, { at: 0.07 })], gap: 60 },
  /** A tap the Foreman can't act on: a dull knock. */
  refused: { tones: [t('triangle', 98, 0.14, 0.3)], noise: [n(320, 0.07, 0.15)], gap: 150 },
  /** A pest turns up: a dry chitter. */
  pest: {
    tones: [
      t('square', 2300, 0.03, 0.025, { to: 2700 }),
      t('square', 2500, 0.03, 0.02, { at: 0.07, to: 2900 }),
    ],
    gap: 400,
    jitter: 0.1,
  },
  /** A pest is cleared: a pop. */
  pestCleared: { tones: [t('sine', 520, 0.08, 0.16, { to: 1150 })], gap: 50, jitter: 0.08 },
  /** A chest opens. */
  chest: {
    tones: [
      t('triangle', 1047, 0.3, 0.08),
      t('triangle', 1319, 0.3, 0.08, { at: 0.06 }),
      t('triangle', 1568, 0.3, 0.08, { at: 0.12 }),
      t('sine', 2093, 0.5, 0.07, { at: 0.18 }),
    ],
    gap: 200,
  },
  /** Deeper than ever before. */
  record: {
    tones: [
      t('triangle', 523, 0.25, 0.1),
      t('triangle', 659, 0.25, 0.1, { at: 0.08 }),
      t('triangle', 784, 0.25, 0.1, { at: 0.16 }),
      t('sine', 1047, 0.7, 0.11, { at: 0.24 }),
    ],
    noise: [n(6000, 0.6, 0.03, { at: 0.24, q: 0.8 })],
    gap: 1000,
  },
  /** A new biome. */
  biome: { tones: [t('sine', 392, 1.4, 0.09), t('sine', 587, 1.6, 0.07, { at: 0.18 })], gap: 2000 },
  /** A small roof fall. */
  collapse: {
    noise: [n(200, 1.2, 0.45, { q: 0.7, to: 90 })],
    tones: [t('sine', 60, 1.0, 0.35, { to: 38 })],
    gap: 600,
  },
  /** The Cave-in. */
  caveIn: {
    noise: [n(140, 3.2, 0.6, { q: 0.6, to: 60, a: 0.2 })],
    tones: [t('sine', 44, 3, 0.55, { to: 26, a: 0.1 })],
    gap: 3000,
  },
  /** A button press in the panels. */
  ui: { tones: [t('triangle', 1250, 0.03, 0.035)], gap: 30 },
} as const satisfies Record<string, Cue>;

export type CueId = keyof typeof CUES;

/** How often the pick strikes while the Foreman works a face: one swing of the sprite (3 frames × 90 ms). */
export const CHIP_EVERY_MS = 270;

/** Semitones a Vein Rush link raises the drop chime. */
export const RUSH_SEMITONES = 2;
/** Highest a Vein Rush can raise it, in semitones. */
export const RUSH_SEMITONES_MAX = 12;

/**
 * The Undersong itself: one note per verse, I to XII (a minor pentatonic that climbs and comes home).
 * Finding a verse plays the song so far, up to that verse's note, at most VERSE_PHRASE notes of it.
 */
export const VERSE_MOTIF = [
  440, 523.25, 587.33, 659.25, 587.33, 783.99, 659.25, 880, 783.99, 659.25, 587.33, 440,
];
export const VERSE_PHRASE = 5;
/** Seconds between the motif's notes, and how long each rings. */
export const VERSE_NOTE_S = 0.24;
export const VERSE_RING_S = 1.3;
export const VERSE_GAIN = 0.12;

/** The drone under the mountain, per biome id (canon §2): its root in Hz. Holloway, on the surface, has none. */
export const DRONE_ROOTS: readonly number[] = [0, 55, 65.41, 49, 73.42, 46.25, 55];
/** The drone is a root and a fifth through a low-pass; it grows louder the deeper the Foreman stands. */
export const DRONE = {
  fifth: 1.5,
  /** Cents the two voices are pulled apart, for a slow beat. */
  detune: 6,
  lowpass: 520,
  /** Gain at the top of Topsoil and at the floor of the Heart, before the music level. */
  gainTop: 0.05,
  gainDeep: 0.16,
  /** Depth in tiles where the drone reaches gainDeep. */
  deepD: 381,
  /** Seconds to glide to a new biome's root. */
  glideS: 2.5,
  /** The slow swell: period in seconds and depth as a fraction of the gain. */
  swellS: 7,
  swell: 0.35,
};

/** Output levels a player can pick in Settings: Off, Low, Medium, High. */
export const SOUND_LEVELS = [0, 0.35, 0.7, 1] as const;
export type SoundLevel = (typeof SOUND_LEVELS)[number];
export const SOUND_DEFAULT: SoundLevel = 0.7;
export const MUSIC_DEFAULT: SoundLevel = 0.35;
/** Master headroom: everything goes through a soft limiter at this gain. */
export const MASTER_GAIN = 1;
