// Polish item 4: one tip per system, shown once ever, when that system is in play this run.
// Seen tips are kept in story.ever as `tip:<id>` (a free-form list that survives a Cave-in), so no save change.
// M7-04: a tip whose act the player has left behind is dropped unseen; it would only teach what they already know.
import { HELPERS } from '../data/helpers';
import { biomeAt } from '../data/biomes';
import { helperOffered } from '../sim/helpers';
import type { Game } from '../sim/game';
import type { GameState } from '../sim/state';

type Act = 'I' | 'II' | 'III' | 'IV';
const ACTS: readonly Act[] = ['I', 'II', 'III', 'IV'];

export interface Tip {
  id: string;
  title: string;
  text: string;
  /** Where "Show me" goes: the nearest water, or a Village tab. */
  show?: 'water' | 'hands' | 'loom';
  /** The act it belongs to; once the player's deepest dig is past it, the tip is dropped. None: never dropped. */
  act?: Act;
  when(s: GameState, g: Game): boolean;
}

const has = (s: GameState, k: string): boolean => s.stats.firsts[k] !== undefined;

export const TIPS: readonly Tip[] = [
  {
    id: 'queue',
    title: 'Changed your mind?',
    text: 'Tap a numbered tile to take it out of the queue. Clear queue, or Esc, stops the lot.',
    act: 'I',
    when: (s) => s.foreman.queue.length >= 3,
  },
  {
    id: 'torch',
    title: 'Torches',
    text: 'Pick the torch, then tap open ground to set one. Tap a torch again to take it back.',
    act: 'I',
    when: (s) => s.res.torch.gt(0) && s.stats.maxDepthD > 6,
  },
  {
    id: 'support',
    title: 'Supports',
    text: 'A support stops the roof coming down where it stands. Set them in long open runs.',
    act: 'II',
    when: (s) => s.res.support.gt(0),
  },
  {
    id: 'pump',
    title: 'Water',
    text: 'Set a pump on dry ground by the water. Bram’s crew can tend them for you later.',
    show: 'water',
    act: 'III',
    // only once there is water in this run's mine to show
    when: (s, g) => g.wet.size > 0 && (has(s, 'halls') || s.res.pump.gt(0)),
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
    act: 'IV',
    when: (s) => s.story.seen.includes('tooHot'),
  },
  {
    id: 'loom',
    title: 'The Song-loom',
    text: 'Each verse you have found can be woven into a charm. Slot charms in the Loom tab.',
    show: 'loom',
    act: 'III',
    when: (s) => s.buildings.songloom > 0,
  },
];

export const tipSeen = (s: GameState, id: string): boolean => s.story.ever.includes(`tip:${id}`);

/** Is this tip's act behind the deepest the player has ever dug? */
export function tipStale(s: GameState, t: Tip): boolean {
  if (!t.act) return false;
  return ACTS.indexOf(biomeAt(s.stats.bestDepthD).act) > ACTS.indexOf(t.act);
}

/** The next tip to show, if any. */
export function nextTip(g: Game): Tip | undefined {
  const s = g.state;
  return TIPS.find((t) => !tipSeen(s, t.id) && !tipStale(s, t) && t.when(s, g));
}
