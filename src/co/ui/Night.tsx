// Night: the tally sheet for the day, tomorrow's quota, and the Company Store. Hold a buy button to keep buying.
import { useEffect, useRef, useState } from 'preact/hooks';
import { spriteURL } from '../../render/sprites';
import { D, type Decimal } from '../../sim/decimal';
import { fmt } from '../../ui/format';
import { CO_PICKS, ORES, ORE_IDS, RELICS, SHOP, type OreId, type ShopId } from '../data/co';
import { canBuy, echoesIfTonight, relicCost, rerollCost, streakMult } from '../sim/contract';
import { NIGHT, TALLY_LINES } from '../story/company';
import type { Game } from '../sim/state';
import { crewRate, dayLength, hands, isAudit, promoted, quota, shopCost, shopOres } from '../sim/stats';
import type { Bridge } from './App';

/** Store icons borrowed from Undersong's item sheet; anything missing falls back to a letter. */
const ICON: Partial<Record<ShopId, string>> = {
  hand: 'miner-icon',
  whetstone: 'rubble',
  pack: 'timber',
  hours: 'obj-lantern',
  ladders: 'obj-rope',
  shaft: 'obj-support',
  deputy: 'badge',
  charges: 'charge',
  blast: 'charge-lit',
  footKibble: 'bar-stack',
  jetpack: 'jetpack',
  doubleJump: 'feather',
  boots: 'pit-boots',
  putter: 'putter',
  shotfirer: 'shotfirer',
  lampman: 'lampman',
  pumpman: 'pumpman',
};

/** What each purchase does to a number the player can read, so the jump is visible before buying. */
function preview(g: Game, id: ShopId): string {
  const l = g.s.contract.levels[id];
  switch (id) {
    case 'hand':
      return `${l} → ${l + 1} hands`;
    case 'pick': {
      const a = CO_PICKS[l];
      const b = CO_PICKS[l + 1];
      return a && b ? `power ${a.power} → ${b.power}` : 'best pick';
    }
    case 'whetstone':
      return `+${l * 20}% → +${(l + 1) * 20}%`;
    case 'hours':
      return `${dayLength(g.s)} s → ${dayLength(g.s) + 20} s`;
    case 'deputy':
    case 'putter':
    case 'shotfirer':
    case 'lampman':
    case 'pumpman':
      return `${l} → ${l + 1} · ${promoted(g.s)} of ${hands(g.s)} hands promoted`;
    default:
      return l > 0 ? `level ${l} → ${l + 1}` : 'new';
  }
}

/** Whole-percent shares of the day's coal that always add to 100 (largest remainder). */
function shares(vals: readonly Decimal[]): number[] {
  const all = vals.reduce((a, v) => a.add(v), D(0));
  if (all.lte(0)) return vals.map(() => 0);
  const raw = vals.map((v) => v.div(all).toNumber() * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    out[i]!++;
  }
  return out;
}

function OreChip({ id, n, short }: { id: OreId; n: number; short?: boolean }) {
  return (
    <span class={`ore ${short ? 'short' : ''}`} title={`${ORES[id].name}: ${ORES[id].job}`}>
      <img src={spriteURL(ORES[id].sprite)} alt={ORES[id].name} />
      {n}
    </span>
  );
}

function Stock({ g }: { g: Game }) {
  const c = g.s.contract;
  const held = ORE_IDS.filter((k) => k !== 'gold' && c.ores[k] > 0);
  return (
    <div class="stock">
      <span class="lbl">{NIGHT.stock}</span>
      {held.length ? (
        <div class="ore-row">
          {held.map((k) => (
            <OreChip key={k} id={k} n={c.ores[k]} />
          ))}
        </div>
      ) : (
        <small class="muted">{NIGHT.stockEmpty}</small>
      )}
    </div>
  );
}

function Tinker({ g, bridge }: { g: Game; bridge: Bridge }) {
  const c = g.s.contract;
  const price = relicCost(g);
  const reroll = rerollCost(g);
  return (
    <section class="card tinker">
      <div class="store-head">
        <h2>
          <img class="h-icon" src={spriteURL('tinker-cart')} alt="" />
          {NIGHT.tinker}
        </h2>
      </div>
      <p class="muted small">{NIGHT.tinkerLine}</p>
      <div class="tinker-offers">
        {c.tinker.offers.length === 0 && <p class="muted small">{NIGHT.tinkerEmpty}</p>}
        {c.tinker.offers.map((r) => (
          <button key={r} class="offer" disabled={c.scrip.lt(price)} onClick={() => bridge.buyRelic(r)}>
            <img src={spriteURL(`relic-${r}`)} alt="" />
            <b>{RELICS[r].name}</b>
            <span>{RELICS[r].blurb}</span>
            <em>{fmt(price)}</em>
          </button>
        ))}
      </div>
      <button class="quiet" disabled={c.scrip.lt(reroll)} onClick={() => bridge.reroll()}>
        {NIGHT.reroll} · {fmt(reroll)}
      </button>
    </section>
  );
}

function SingDown({ g, bridge }: { g: Game; bridge: Bridge }) {
  const [sure, setSure] = useState(false);
  const e = echoesIfTonight(g);
  return (
    <div class="sing">
      <div>
        <b>{NIGHT.singTitle}</b>
        <span>
          {NIGHT.singLine} <b class="echo-n">+{fmt(e)} Echoes</b>
        </span>
        {g.s.contract.ores.heart > 0 && <small class="muted">({NIGHT.heart})</small>}
      </div>
      {!sure ? (
        <button class="quiet" onClick={() => setSure(true)}>
          {NIGHT.singTitle}…
        </button>
      ) : (
        <div class="confirm">
          <span>{NIGHT.singAsk}</span>
          <button class="danger" onClick={() => bridge.singDown()}>
            {NIGHT.singYes}
          </button>
          <button onClick={() => setSure(false)}>{NIGHT.singNo}</button>
        </div>
      )}
    </div>
  );
}

function Row({ g, bridge, id }: { g: Game; bridge: Bridge; id: ShopId }) {
  const def = SHOP.find((d) => d.id === id)!;
  const cost = shopCost(g.s, id);
  const ores = shopOres(g.s, id);
  const can = canBuy(g, id);
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
  const pick = id === 'pick' ? CO_PICKS[g.s.contract.levels.pick + 1] : null;
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
        {cost && ores.length > 0 && (
          <span class="ore-need">
            {ores.map((o) => (
              <OreChip key={o.id} id={o.id} n={o.n} short={g.s.contract.ores[o.id] < o.n} />
            ))}
          </span>
        )}
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
        {cost ? (cost.gt(0) ? `${fmt(cost)}` : 'Free') : 'Maxed'}
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
  const rows = t
    ? ([
        ['by you', t.byHand.sub(t.late)],
        ['by the crew', t.byCrew],
        ['hauled by putters', t.byHaul],
        ['late, at half', t.late],
      ] as const)
    : [];
  const pct = shares(rows.map((r) => r[1]));
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
              {t.grade && (
                <div class="grade-stamp">
                  <b>{t.grade}</b>
                  {t.streak > 1 && (
                    <span class="streak">
                      Streak {t.streak} · ×{streakMult(t.streak).toFixed(2).replace(/0$/, '')}
                    </span>
                  )}
                </div>
              )}
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
                {rows.map(([k, v], i) =>
                  v.gt(0) ? (
                    <div class="sub" key={k}>
                      <dt>{k}</dt>
                      <dd>
                        {fmt(v.floor())} <small class="pct">{pct[i]}%</small>
                      </dd>
                    </div>
                  ) : null,
                )}
                <div>
                  <dt>Surplus coal sold</dt>
                  <dd>+{fmt(t.surplusScrip)}</dd>
                </div>
                {t.gradeScrip.gt(0) && (
                  <div class="hot">
                    <dt>{t.grade} bonus</dt>
                    <dd>+{fmt(t.gradeScrip)}</dd>
                  </div>
                )}
                {t.oreScrip.gt(0) && (
                  <div>
                    <dt>Gold sold</dt>
                    <dd>+{fmt(t.oreScrip)}</dd>
                  </div>
                )}
                <div>
                  <dt>Chests</dt>
                  <dd>+{fmt(t.chestScrip)}</dd>
                </div>
              </dl>
              {ORE_IDS.some((k) => k !== 'gold' && t.ores[k] > 0) && (
                <div class="ore-row banked">
                  <span class="lbl">Ore banked</span>
                  {ORE_IDS.filter((k) => k !== 'gold' && t.ores[k] > 0).map((k) => (
                    <OreChip key={k} id={k} n={t.ores[k]} />
                  ))}
                </div>
              )}
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
          <SingDown g={g} bridge={bridge} />
        </section>
        <section class="card store">
          <div class="store-head">
            <h2>The Company Store</h2>
            <div class="purse">
              <span class="lbl">Scrip</span>
              <b>{fmt(s.contract.scrip.floor())}</b>
            </div>
          </div>
          <Stock g={g} />
          <div class="shop-list">
            {shown.map((d) => (
              <Row key={d.id} g={g} bridge={bridge} id={d.id} />
            ))}
          </div>
        </section>
        <Tinker g={g} bridge={bridge} />
      </div>
    </div>
  );
}
