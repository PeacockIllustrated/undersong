// M9-04: a Cave-in worth watching. The shaft folds in, the Echoes count up over this run's verses, a stone drops on
// the cairn, then the new run opens with how deep the last one went. Tap to skip; reduced motion shows a still card.
import { useEffect, useRef, useState } from 'preact/hooks';
import { CEREMONY } from '../data/ui';
import { CAIRN } from '../data/surface';
import { reducedMotion } from '../settings';
import { spriteURL } from '../render/sprites';
import { VERSES } from '../story/verses';
import { CEREMONY_TEXT, lastCycleText } from '../story/memory';
import type { GameState } from '../sim/state';

export function Ceremony({ s, verses, done: onDone }: { s: GameState; verses: number[]; done: () => void }) {
  const [t0] = useState(() => performance.now());
  // the end of the sequence and a tap can land on the same frame: finish once
  const fin = useRef(false);
  const done = (): void => {
    if (fin.current) return;
    fin.current = true;
    onDone();
  };
  const [now, setNow] = useState(t0);
  const still = reducedMotion();
  const entry = [...s.survey].reverse().find((e) => e.hand === 'yours');
  const gain = Number(entry?.echoes ?? 0);
  const ft = entry?.depthFt ?? 0;
  const stones = Math.min(s.survey.filter((e) => e.hand === 'yours').length, CAIRN.stones);

  useEffect(() => {
    if (still) return undefined;
    let raf = 0;
    const tick = (): void => {
      const n = performance.now();
      setNow(n);
      if (n - t0 >= CEREMONY.end) done();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const e = still ? CEREMONY.end : now - t0;
  const k = Math.max(0, Math.min(1, (e - CEREMONY.fold) / (CEREMONY.count - CEREMONY.fold)));
  const shown = Math.round(gain * k);
  // one numeral lights per note, in the order they are sung
  const lit = Math.ceil(k * verses.length);
  return (
    <div
      class={`ceremony ${still ? 'still' : ''} ${e >= CEREMONY.fold ? 'dark' : ''}`}
      role="dialog"
      aria-label={CEREMONY_TEXT.label}
      onClick={done}
    >
      {!still && <div class="fold" />}
      {e >= CEREMONY.fold && (
        <div class="ceremony-card">
          <p class="forget">{CEREMONY_TEXT.forget}</p>
          <div class="echo-count">
            <img src={spriteURL('echo')} alt="" />+{shown} {CEREMONY_TEXT.echoes}
          </div>
          {verses.length > 0 && (
            <div class="sung" aria-label={CEREMONY_TEXT.sung}>
              {verses.map((v, i) => (
                <span key={v} class={i < lit ? 'on' : ''}>
                  {VERSES[v]?.n}
                </span>
              ))}
            </div>
          )}
          {e >= CEREMONY.count && (
            <img
              class={`cairn ${e < CEREMONY.stone && !still ? 'dropping' : ''}`}
              src={spriteURL('cairn', Math.max(0, stones - 1))}
              alt={CEREMONY_TEXT.cairn}
            />
          )}
          {e >= CEREMONY.line && <p class="last">{lastCycleText(ft)}</p>}
          <p class="skip">{still ? CEREMONY_TEXT.carryOn : CEREMONY_TEXT.skip}</p>
        </div>
      )}
    </div>
  );
}
