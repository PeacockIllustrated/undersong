// M11 Beyond the song: markers, deep picks, Auto Cave-in and the keys of New Song+. Story text only.
import { KEY_FX, type KeyId } from '../data/beyond';
import { FT_PER_TILE } from '../data/constants';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const roman = (n: number): string => ROMAN[n - 1] ?? String(n);

export const MARKER_TEXT = {
  reached: (ft: number, echoes: number, gold: number): [string, string] => [
    `The ${ft.toLocaleString('en-GB')} ft marker`,
    `+${echoes} Echoes · +${gold} Gold bars`,
  ],
  next: (ft: number): string => `Next marker at ${ft.toLocaleString('en-GB')} ft`,
};

export const DEEP_PICK_TEXT = {
  name: (n: number): string => `Deep pick ${roman(n)}`,
  waits: (ft: number): string => `The next deep pick waits at the ${ft.toLocaleString('en-GB')} ft marker.`,
  sealFirst: 'The best pick Holloway knows how to make, until the shaft is sealed and the mountain goes on.',
};

export const AUTO_TEXT = {
  label: 'Auto Cave-in',
  hint: (min: number): string =>
    `The village caves in by itself once the Echoes on offer have not risen for ${min} minutes. Never ahead of the ending's choice, and never while you are away. Kept with your save.`,
  done: (echoes: number): [string, string] => ['The village caved in by itself', `+${echoes} Echoes`],
  page: 'by itself',
};

const times = (n: number): string => (n === 2 ? 'twice as' : `×${n}`);

export const KEY_TEXT: Record<KeyId, { name: string; text: string }> = {
  wet: {
    name: 'A wet year',
    text: `Rain comes ${times(KEY_FX.wet.rainOften)} often and stays ${times(KEY_FX.wet.rainLong)} long.`,
  },
  hot: {
    name: 'A hot year',
    text: `The deep is warm ${KEY_FX.hot.earlierD * FT_PER_TILE} ft higher, and ember and gold ore come up ×${KEY_FX.hot.drop}.`,
  },
  rich: { name: 'Rich veins', text: `Every ore comes up ×${KEY_FX.rich.drop}.` },
  hard: {
    name: 'A hard year',
    text: `The rock is harder: everyone digs ×${KEY_FX.hard.dig}, and Cave-ins give ×${KEY_FX.hard.echoes} Echoes.`,
  },
};

export const KEY_UI = {
  next: 'The next mountain will be in',
  now: 'This mountain is in',
};
