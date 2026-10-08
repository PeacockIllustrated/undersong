// The overlay: HUD by day, the Company Store by night, the Survey Book after a Cave-in. Reads the game, calls the bridge.
import { useEffect, useState } from 'preact/hooks';
import type { BookId, RelicId, ShopId } from '../data/co';
import type { Input } from '../input';
import type { SignOpts } from '../sim/contract';
import type { Game } from '../sim/state';
import { CaveInScreen, TitleScreen } from './Contract';
import { Hud, PauseMenu } from './Hud';
import { NightScreen } from './Night';
import { TouchControls } from './Touch';
import { onToast, toasts } from './toasts';

export interface Bridge {
  g: Game;
  input: Input;
  readonly paused: boolean;
  readonly muted: boolean;
  /** Most crew sprites drawn at once: 50, 100, 200 or 400. */
  readonly crowd: number;
  setCrowd(n: number): void;
  setPaused(p: boolean): void;
  setMuted(m: boolean): void;
  buy(id: ShopId): boolean;
  buyBook(id: BookId): boolean;
  buyRelic(id: RelicId): boolean;
  reroll(): boolean;
  singDown(): void;
  nextDay(): void;
  sign(opts?: SignOpts): void;
  startOver(): void;
}

function useTick(ms: number): number {
  const [n, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((v) => v + 1), ms);
    const off = onToast(() => set((v) => v + 1));
    return () => {
      clearInterval(id);
      off();
    };
  }, [ms]);
  return n;
}

export function App({ bridge }: { bridge: Bridge }) {
  useTick(100);
  const g = bridge.g;
  const phase = g.s.phase;
  const now = performance.now();
  const touch = bridge.input.usingTouch || window.matchMedia('(pointer: coarse)').matches;
  return (
    <div class="co">
      {(phase === 'day' || phase === 'dusk') && <Hud g={g} bridge={bridge} />}
      {phase === 'day' && touch && !bridge.paused && <TouchControls bridge={bridge} />}
      {phase === 'day' && bridge.paused && <PauseMenu bridge={bridge} />}
      {phase === 'night' && <NightScreen g={g} bridge={bridge} />}
      {phase === 'cavein' && <CaveInScreen g={g} bridge={bridge} />}
      {phase === 'title' && <TitleScreen g={g} bridge={bridge} />}
      <div class="toasts" aria-live="polite">
        {toasts(now).map((t) => (
          <div key={t.id} class={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
