// Player preferences (ADR-024). Kept apart from the game save: a Cave-in, an import or Start over never touches them.
// Read by the UI, the renderer and the sound; never by the sim.
import { MUSIC_DEFAULT, SOUND_DEFAULT, SOUND_LEVELS } from './data/sounds';

export type Motion = 'auto' | 'full' | 'reduced';
export type Numbers = 'short' | 'scientific';
/** M7-01: how a touch shows what it is aiming at. */
export type Aim = 'loupe' | 'crosshair' | 'off';

export interface Settings {
  /** 'auto' follows the system's reduced-motion setting. */
  motion: Motion;
  /** Text and panel scale: 1, 1.15 or 1.3. */
  textScale: number;
  /** Shape marks for dark faces and faces too hot to work, so neither is shown by colour alone. */
  marks: boolean;
  numbers: Numbers;
  /** Sound effects level, one of SOUND_LEVELS (0 is off). */
  sound: number;
  /** The drone under the mountain, one of SOUND_LEVELS. */
  music: number;
  /** M7-01: a magnifier above the finger, a crosshair floating above it, or neither. */
  aim: Aim;
  /** M7-02: taps snap to nearby ore, and a long press on ore takes the whole vein. */
  smartDig: boolean;
  /** M7-06: a short buzz on a break, where the device can. */
  haptics: boolean;
}

export const SETTINGS_KEY = 'undersong.settings';
export const TEXT_SCALES = [1, 1.15, 1.3] as const;
export const DEFAULTS: Settings = {
  motion: 'auto',
  textScale: 1,
  marks: true,
  numbers: 'short',
  sound: SOUND_DEFAULT,
  music: MUSIC_DEFAULT,
  aim: 'loupe',
  smartDig: true,
  haptics: true,
};
const level = (v: unknown, d: number): number =>
  SOUND_LEVELS.includes(v as (typeof SOUND_LEVELS)[number]) ? (v as number) : d;

let cur: Settings = load();
const subs = new Set<(s: Settings) => void>();

function load(): Settings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SETTINGS_KEY);
    return raw ? clean(JSON.parse(raw) as Partial<Settings>) : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Anything unknown or out of range falls back to the default, so an old or hand-edited value can't break the page. */
export function clean(p: Partial<Settings>): Settings {
  return {
    motion: p.motion === 'full' || p.motion === 'reduced' ? p.motion : 'auto',
    textScale: TEXT_SCALES.includes(p.textScale as (typeof TEXT_SCALES)[number]) ? p.textScale! : 1,
    marks: typeof p.marks === 'boolean' ? p.marks : true,
    numbers: p.numbers === 'scientific' ? 'scientific' : 'short',
    sound: level(p.sound, SOUND_DEFAULT),
    music: level(p.music, MUSIC_DEFAULT),
    aim: p.aim === 'crosshair' || p.aim === 'off' ? p.aim : 'loupe',
    smartDig: typeof p.smartDig === 'boolean' ? p.smartDig : true,
    haptics: typeof p.haptics === 'boolean' ? p.haptics : true,
  };
}

export function settings(): Settings {
  return cur;
}

export function setSettings(patch: Partial<Settings>): void {
  cur = clean({ ...cur, ...patch });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cur));
  } catch {
    // private windows can refuse storage; the setting still holds for this visit
  }
  for (const f of subs) f(cur);
}

export function onSettings(f: (s: Settings) => void): () => void {
  subs.add(f);
  return () => subs.delete(f);
}

/** True when motion should be cut back: chosen in settings, or 'auto' and the system asks for it. */
export function reducedMotion(): boolean {
  if (cur.motion !== 'auto') return cur.motion === 'reduced';
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
