// M10-01: the tinker's cart, parked by the shaft with three offers. Take one. canon §21.1
import { PICKS } from '../data/items';
import { RES_NAMES } from '../data/resources';
import { spriteURL } from '../render/sprites';
import { offerValue } from '../sim/finds';
import { CART_AQUA_NAME, CART_TEXT, CART_UI } from '../story/finds';
import { AQUA_CRATE } from '../data/finds';
import type { UiBridge } from './App';
import { RES_ICON } from './icons';

const mins = (ms: number): string => `${Math.round(ms / 60_000)} min`;
/** Gems and stone are counted as they are: "+12 Aquamarine", not "Aquamarines". */
const MASS = new Set(['aquamarine', 'crystal', 'heartstone']);
const plural = (name: string, n: number): string =>
  n === 1 || MASS.has(name.toLowerCase()) ? name : name.endsWith('ch') ? `${name}es` : `${name}s`;

export function CartSheet({ ui, close }: { ui: UiBridge; close: () => void }) {
  const s = ui.game.state;
  const offers = s.cart.offers;
  if (!offers) return null;
  return (
    <div class="sheet-wrap verse-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="panel sheet cart" role="dialog" aria-label={CART_UI.here}>
        <h2>{CART_UI.here}</h2>
        <p class="small muted">{CART_UI.pick}</p>
        <div class="offers">
          {offers.map((id, i) => {
            const v = offerValue(s, id);
            const t = CART_TEXT[id];
            const icon = v.res
              ? RES_ICON[v.res]
              : id === 'tonic'
                ? 'miner-icon'
                : id === 'grindstone'
                  ? PICKS[s.pickTier]!.sprite
                  : id === 'map'
                    ? 'verse'
                    : 'echo';
            const detail = v.res
              ? `+${v.n} ${plural(RES_NAMES[v.res], v.n)}`
              : t.text(v.ms ? mins(v.ms) : String(v.n));
            return (
              <button
                key={id}
                class="offer"
                onClick={() => {
                  ui.dispatch({ type: 'cart', i });
                  close();
                }}
              >
                <img src={spriteURL(icon)} alt="" />
                <b>{id === 'crate' && v.res === AQUA_CRATE.res ? CART_AQUA_NAME : t.name}</b>
                <span>{detail}</span>
              </button>
            );
          })}
        </div>
        <button class="btn" onClick={close}>
          {CART_UI.leave}
        </button>
      </div>
    </div>
  );
}
