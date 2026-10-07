// M8-03: a buy button that honours the ×1 / ×10 / Max toggle, shows the total, and says when it will be ready.
// M8-05: the price sits inside the button, the resource you are short of in red, and descriptions fold to a line.
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { BULK_STEPS } from '../data/ui';
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

/** A buy button with its price inside it, and "ready in" beside it while it can't be paid. */
export function PriceButton({
  s,
  costs,
  onClick,
  primary,
  children,
}: {
  s: GameState;
  costs: Costs;
  onClick: () => void;
  primary?: boolean;
  children: ComponentChildren;
}) {
  const ok = canPay(s, costs);
  return (
    <div class="row">
      <button
        class={`btn buy ${primary ? 'primary' : ''} ${ok ? 'can' : ''}`}
        disabled={!ok}
        onClick={onClick}
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
      onClick={() => ui.dispatch({ type: 'buyMany', of, n: b.n })}
    >
      {children}
      {b.n > 1 && <span class="many"> ×{b.n}</span>}
    </PriceButton>
  );
}
