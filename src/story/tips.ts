// Polish item 4: one tip card per system, shown once ever, when that system first appears.
// Seen tips are kept in story.ever as `tip:<id>` (a free-form list that survives a Cave-in), so no save change.
import { HELPERS } from '../data/helpers';
import { helperOffered } from '../sim/helpers';
import type { GameState } from '../sim/state';

export interface Tip {
  id: string;
  title: string;
  text: string;
  /** Where "Show me" goes: the nearest water, or a Village tab. */
  show?: 'water' | 'hands' | 'loom';
  when(s: GameState): boolean;
}

const has = (s: GameState, k: string): boolean => s.stats.firsts[k] !== undefined;

export const TIPS: readonly Tip[] = [
  {
    id: 'queue',
    title: 'Changed your mind?',
    text: 'Tap a numbered tile to take it out of the queue. Clear queue, or Esc, stops the lot.',
    when: (s) => s.foreman.queue.length >= 3,
  },
  {
    id: 'torch',
    title: 'Torches',
    text: 'Pick the torch, then tap open ground to set one. Tap a torch again to take it back.',
    when: (s) => s.res.torch.gt(0) && s.stats.maxDepthD > 6,
  },
  {
    id: 'support',
    title: 'Supports',
    text: 'A support stops the roof coming down where it stands. Set them in long open runs.',
    when: (s) => s.res.support.gt(0),
  },
  {
    id: 'pump',
    title: 'Water',
    text: 'Set a pump on dry ground by the water. Bram’s crew can tend them for you later.',
    show: 'water',
    when: (s) => has(s, 'halls') || s.res.pump.gt(0),
  },
  {
    id: 'hands',
    title: 'Hands for hire',
    text: 'Someone in the village will take a chore off you. Find them under Hands. They stay with you through a Cave-in.',
    show: 'hands',
    when: (s) => HELPERS.some((h) => helperOffered(s, h.id)),
  },
  {
    id: 'heat',
    title: 'Heat',
    text: 'Glowing faces are too hot to work. Set a cooling vent near them, or let water in to cool them.',
    when: (s) => s.story.seen.includes('tooHot'),
  },
  {
    id: 'loom',
    title: 'The Song-loom',
    text: 'Each verse you have found can be woven into a charm. Slot charms in the Loom tab.',
    show: 'loom',
    when: (s) => s.buildings.songloom > 0,
  },
];

export const tipSeen = (s: GameState, id: string): boolean => s.story.ever.includes(`tip:${id}`);

/** The next tip to show, if any. */
export function nextTip(s: GameState): Tip | undefined {
  return TIPS.find((t) => !tipSeen(s, t.id) && t.when(s));
}
