// M8-03: a buy button that honours the ×1 / ×10 / Max toggle, shows the total, and says when it will be ready.
// M8-05: the price sits inside the button, the resource you are short of in red, and descriptions fold to a line.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { BULK_STEPS, HOLD_BUY } from '../data/ui';
import { RES_NAMES, type ResKey } from '../data/resources';
import type { Decimal } from '../sim/decimal';
import { bulkCost, type BulkKind } from '../sim/bulk';
import { canPay } from '../sim/economy';
import type { GameState } from '../sim/state';
import { BULK_LABEL, readyText } from '../story/shop';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { readyIn } from './rates';
import { RES_ICON } from './icons';
import { fmt } from './format';

type Costs = { res: ResKey; amount: Decimal }[];

export function Cost({ costs, have }: { costs: Costs; have: Record<ResKey, Decimal> }) {
  return (
    <span class="cost">
      {costs.map((c) => (
        <span key={c.res} class={have[c.res].gte(c.amount) ? '' : 'short'} title={RES_NAMES[c.res]}>
          <img src={spriteURL(RES_ICON[c.res])} alt={RES_NAMES[c.res]} />
          {fmt(c.amount)}
        </span>
      ))}
    </span>
  );
}

/**
 * M13-02: holding the button keeps buying, faster the longer it is held, until it can't pay. A tap buys once; a
 * hold that has bought swallows the click its release would make. The keyboard's own key repeat does the rest.
 */
function useHold(buy: () => void, can: () => boolean) {
  const latest = useRef({ buy, can });
  latest.current = { buy, can };
  const st = useRef<{ timer: number; gap: number; bought: boolean }>({ timer: 0, gap: 0, bought: false });
  const stop = (): void => {
    window.clearTimeout(st.current.timer);
    st.current.timer = 0;
  };
  const tick = (): void => {
    if (!latest.current.can()) return stop();
    latest.current.buy();
    st.current.bought = true;
    st.current.gap = Math.max(HOLD_BUY.minMs, st.current.gap * HOLD_BUY.speedUp);
    st.current.timer = window.setTimeout(tick, st.current.gap);
  };
  useEffect(() => {
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    return () => {
      stop();
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
    };
  }, []);
  return {
    onPointerDown: (e: PointerEvent): void => {
      if (e.button !== 0) return;
      // keep the pointer even if the card moves under it once the price changes
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // no live pointer to hold (a synthetic event): the window listeners still end it
      }
      stop();
      st.current.bought = false;
      st.current.gap = HOLD_BUY.everyMs / HOLD_BUY.speedUp;
      st.current.timer = window.setTimeout(tick, HOLD_BUY.delayMs);
    },
    onContextMenu: (e: Event): void => e.preventDefault(),
    onClick: (): void => {
      stop();
      if (st.current.bought) st.current.bought = false;
      else latest.current.buy();
    },
  };
}

/** A buy button with its price inside it, and "ready in" beside it while it can't be paid. */
export function PriceButton({
  s,
  costs,
  onClick,
  primary,
  hold,
  children,
}: {
  s: GameState;
  costs: Costs;
  onClick: () => void;
  primary?: boolean;
  /** M13-02: holding keeps buying. Only for buys that can be made again and again. */
  hold?: () => boolean;
  children: ComponentChildren;
}) {
  const ok = canPay(s, costs);
  const h = useHold(onClick, hold ?? (() => false));
  return (
    <div class="row">
      <button
        class={`btn buy ${primary ? 'primary' : ''} ${ok ? 'can' : ''} ${hold ? 'holdable' : ''}`}
        disabled={!ok}
        {...(hold ? h : { onClick })}
      >
        <span class="lbl">{children}</span>
        <Cost costs={costs} have={s.res} />
      </button>
      {!ok && <span class="small ready">{readyText(readyIn(costs, s))}</span>}
    </div>
  );
}

/** A card's description: one line, the rest behind a tap. */
export function Desc({ children }: { children: ComponentChildren }) {
  const [open, set] = useState(false);
  return (
    <p
      class={`desc ${open ? 'open' : ''}`}
      onClick={() => set(!open)}
      title={open ? undefined : 'Tap to read more'}
    >
      {children}
    </p>
  );
}

/** Flex order for a shop card: what you can buy now comes first. */
export const first = (ok: boolean): { order: number } => ({ order: ok ? 0 : 1 });

export type BulkStep = (typeof BULK_STEPS)[number];
let step: BulkStep = 1;
const subs = new Set<() => void>();

export function BulkToggle() {
  const [, set] = useState(0);
  return (
    <div class="seg bulk" role="radiogroup" aria-label="How many to buy">
      {BULK_STEPS.map((k) => (
        <button
          key={k}
          role="radio"
          aria-checked={step === k}
          class={step === k ? 'on' : ''}
          onClick={() => {
            step = k;
            set((n) => n + 1);
            for (const f of subs) f();
          }}
        >
          {BULK_LABEL[String(k)]}
        </button>
      ))}
    </div>
  );
}

export function BuyRow({
  ui,
  of,
  primary,
  children,
}: {
  ui: UiBridge;
  of: BulkKind;
  primary?: boolean;
  children: ComponentChildren;
}) {
  const [, set] = useState(0);
  // re-render when the toggle changes, without lifting it into every sheet's state
  useEffect(() => {
    const f = (): void => set((n) => n + 1);
    subs.add(f);
    return () => void subs.delete(f);
  }, []);
  const s = ui.game.state;
  const b = bulkCost(s, of, step);
  if (!b) return null;
  return (
    <PriceButton
      s={s}
      costs={b.costs}
      primary={primary}
      onClick={() => {
        // the price may have moved since this render, so ask again at the moment of buying
        const now = bulkCost(ui.game.state, of, step);
        if (now) ui.dispatch({ type: 'buyMany', of, n: now.n });
      }}
      hold={() => {
        const now = bulkCost(ui.game.state, of, step);
        return !!now && canPay(ui.game.state, now.costs);
      }}
    >
      {children}
      {b.n > 1 && <span class="many"> ×{b.n}</span>}
    </PriceButton>
  );
}
