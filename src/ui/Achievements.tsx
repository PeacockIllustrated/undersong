// Achievements (M5-03): the list in the Survey Book, and a toast when one is earned.
import { useEffect, useRef } from 'preact/hooks';
import { ACHIEVEMENT_IDS } from '../data/achievements';
import { achievementsEarned, hasAchievement } from '../sim/achievements';
import type { GameState } from '../sim/state';
import { ACHIEVEMENTS, ACH_TEXT } from '../story/achievements';

export function AchievementList({ s }: { s: GameState }) {
  const n = achievementsEarned(s).length;
  return (
    <section>
      <h3>
        {ACH_TEXT.heading} <span class="small">{ACH_TEXT.count(n, ACHIEVEMENT_IDS.length)}</span>
      </h3>
      <ul class="ach-list">
        {ACHIEVEMENT_IDS.map((id) => {
          const got = hasAchievement(s, id);
          const a = ACHIEVEMENTS[id];
          return (
            <li key={id} class={`ach ${got ? 'got' : ''}`}>
              <span class="ach-mark" aria-hidden="true">
                {got ? '✦' : '·'}
              </span>
              <span>
                <b>{a.name}</b>
                <span class="small">{got ? a.how : `${ACH_TEXT.locked}. ${a.how}`}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Watches for newly earned achievements and announces them with the big toast. Several at once share one toast. */
export function AchievementToasts({ s }: { s: GameState }) {
  const seen = useRef<Set<string> | null>(null);
  const earned = achievementsEarned(s);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(earned);
      return;
    }
    const fresh = earned.filter((id) => !seen.current!.has(id));
    if (!fresh.length) return;
    for (const id of fresh) seen.current.add(id);
    const detail =
      fresh.length === 1
        ? { big: ACHIEVEMENTS[fresh[0]!].name, sub: `${ACH_TEXT.toast} · ${ACHIEVEMENTS[fresh[0]!].how}` }
        : { big: `${fresh.length} achievements`, sub: fresh.map((id) => ACHIEVEMENTS[id].name).join(' · ') };
    window.dispatchEvent(new CustomEvent('undersong:toast', { detail }));
  }, [earned.length]);
  return null;
}
