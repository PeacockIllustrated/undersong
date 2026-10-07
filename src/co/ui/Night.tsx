// Night: the tally sheet for the day, tomorrow's quota, and the Company Store. Hold a buy button to keep buying.
import { useEffect, useRef } from 'preact/hooks';
import { PICKS } from '../../data/items';
import { spriteURL } from '../../render/sprites';
import { D } from '../../sim/decimal';
import { fmt } from '../../ui/format';
import { SHOP, type ShopId } from '../data/co';
import { TALLY_LINES } from '../story/company';
import type { Game } from '../sim/state';
import { crewRate, dayLength, isAudit, quota, shopCost } from '../sim/stats';
import type { Bridge } from './App';

/** Store icons borrowed from Undersong's item sheet; anything missing falls back to a letter. */
const ICON: Partial<Record<ShopId, string>> = {
  hand: 'miner-icon',
  whetstone: 'rubble',
  pack: 'timber',
  hours: 'obj-lantern',
  ladders: 'obj-rope',
  shaft: 'obj-support',
  deputy: 'charm',
  charges: 'chunk-ember',
  blast: 'chunk-ember',
  footKibble: 'bar-stack',
  jetpack: 'lumen',
  doubleJump: 'curio',
  boots: 'bar-iron',
};

/** What each purchase does to a number the player can read, so the jump is visible before buying. */
function preview(g: Game, id: ShopId): string {
  const l = g.s.contract.levels[id];
  switch (id) {
    case 'hand':
      return `${l} → ${l + 1} hands`;
    case 'pick': {
      const a = PICKS[l];
      const b = PICKS[l + 1];
      return a && b ? `power ${a.power} → ${b.power}` : 'best pick';
    }
    case 'whetstone':
      return `+${l * 20}% → +${(l + 1) * 20}%`;
    case 'hours':
      return `${dayLength(g.s)} s → ${dayLength(g.s) + 20} s`;
    case 'deputy':
      return `${l} → ${l + 1} deputies`;
    default:
      return l > 0 ? `level ${l} → ${l + 1}` : 'new';
  }
}

function Row({ g, bridge, id }: { g: Game; bridge: Bridge; id: ShopId }) {
  const def = SHOP.find((d) => d.id === id)!;
  const cost = shopCost(g.s, id);
  const can = !!cost && g.s.contract.scrip.gte(cost);
  const hold = useRef<number | null>(null);
  const stop = (): void => {
    if (hold.current !== null) clearInterval(hold.current);
    hold.current = null;
  };
  useEffect(() => stop, []);
  const start = (): void => {
    if (!bridge.buy(id)) return;
    stop();
    hold.current = window.setInterval(() => {
      if (!bridge.buy(id)) stop();
    }, 140);
  };
  const pick = id === 'pick' ? PICKS[g.s.contract.levels.pick + 1] : null;
  return (
    <div class={`shop-row ${can ? 'can' : ''} ${cost ? '' : 'maxed'}`}>
      <div class="shop-icon">
        {pick || ICON[id] ? (
          <img src={spriteURL(pick ? pick.sprite : ICON[id]!)} alt="" />
        ) : (
          <span>{def.name.slice(0, 1)}</span>
        )}
      </div>
      <div class="shop-text">
        <b>{pick ? pick.name : def.name}</b>
        <span>{def.blurb}</span>
        <small>{preview(g, id)}</small>
      </div>
      <button
        class="buy"
        disabled={!can}
        onPointerDown={(e) => {
          e.preventDefault();
          start();
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => {
          if (e.key === 'Enter') bridge.buy(id);
        }}
      >
        {cost ? `${fmt(cost)}` : 'Maxed'}
      </button>
    </div>
  );
}

export function NightScreen({ g, bridge }: { g: Game; bridge: Bridge }) {
  const s = g.s;
  const t = s.tally;
  const next = s.contract.day + 1;
  const q = quota(s, next);
  const shown = SHOP.filter((d) => (d.fromDay ?? 0) <= next);
  const line = t
    ? t.pardoned
      ? TALLY_LINES.pardoned[0]
      : TALLY_LINES.passed[t.day % TALLY_LINES.passed.length]
    : '';
  const crewDay = crewRate(s) * dayLength(s);
  return (
    <div class="screen night">
      <div class="night-grid">
        <section class="card tally">
          <p class="eyebrow">
            Night {s.contract.day} · Contract {s.contract.n}
          </p>
          <h2>The tally</h2>
          {t && (
            <>
              <p class="tally-line">{line}</p>
              <dl class="sheet">
                <div>
                  <dt>Quota</dt>
                  <dd>{fmt(t.quota)}</dd>
                </div>
                <div>
                  <dt>Deposited</dt>
                  <dd>{fmt(t.deposited.floor())}</dd>
                </div>
                <div class="sub">
                  <dt>by you</dt>
                  <dd>{fmt(t.byHand.floor())}</dd>
                </div>
                <div class="sub">
                  <dt>by the crew</dt>
                  <dd>{fmt(t.byCrew.floor())}</dd>
                </div>
                <div>
                  <dt>Surplus coal sold</dt>
                  <dd>+{fmt(t.surplusScrip)}</dd>
                </div>
                <div>
                  <dt>Ore sold</dt>
                  <dd>+{fmt(t.oreScrip)}</dd>
                </div>
                <div>
                  <dt>Chests</dt>
                  <dd>+{fmt(t.chestScrip)}</dd>
                </div>
              </dl>
            </>
          )}
          <div class={`tomorrow ${isAudit(next) ? 'audit' : ''}`}>
            <span>Day {next} quota</span>
            <b>{fmt(q)} coal</b>
            {isAudit(next) && <small>{TALLY_LINES.audit}</small>}
            <small>Your crew sends up about {fmt(D(Math.floor(crewDay)))} a day.</small>
          </div>
          <button class="big go" onClick={() => bridge.nextDay()}>
            Go down for day {next}
          </button>
          <p class="muted small">Enter also starts the day.</p>
        </section>
        <section class="card store">
          <div class="store-head">
            <h2>The Company Store</h2>
            <div class="purse">
              <span class="lbl">Scrip</span>
              <b>{fmt(s.contract.scrip.floor())}</b>
            </div>
          </div>
          <div class="shop-list">
            {shown.map((d) => (
              <Row key={d.id} g={g} bridge={bridge} id={d.id} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
