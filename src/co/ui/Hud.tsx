// The day's HUD: day and quota, the clock, the pack, scrip and the kit. Big, readable numbers (ADR-020).
import { useState } from 'preact/hooks';
import { spriteURL } from '../../render/sprites';
import { D } from '../../sim/decimal';
import { fmt } from '../../ui/format';
import { CO_PICKS, DAY, ORES, ORE_IDS, RELICS, TOOLS } from '../data/co';
import { packOre } from '../sim/day';
import { owned } from '../sim/tools';
import { CONTROLS, HINTS, TALLY_LINES } from '../story/company';
import type { Game } from '../sim/state';
import { crewRate, isAudit, packCap, pickIndex } from '../sim/stats';
import type { Bridge } from './App';

const clock = (s: number): string => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function Hud({ g, bridge }: { g: Game; bridge: Bridge }) {
  const d = g.day;
  if (!d) return null;
  const s = g.s;
  const left = d.length - d.t;
  const frac = d.quota.gt(0) ? Math.min(1, d.deposited.div(d.quota).toNumber()) : 1;
  const used = d.pack.coal.toNumber() + packOre(d);
  const pick = CO_PICKS[pickIndex(s)]!;
  const spill = Math.floor(d.spill.coal) + ORE_IDS.reduce((a, k) => a + d.spill.ores[k], 0);
  const cap = packCap(s);
  const crew = crewRate(s);
  const dusk = s.phase === 'dusk';
  return (
    <>
      <div class="hud">
        <div class="hud-day">
          <span class="lbl">Day</span>
          <b>{s.contract.day}</b>
          {isAudit(s.contract.day) && <span class="chip chip-warn">Audit</span>}
        </div>
        <div class={`quota ${d.met ? 'met' : ''}`}>
          <div class="quota-fill" style={{ width: `${frac * 100}%` }} />
          <div class="quota-text">
            <b>{fmt(d.deposited.floor())}</b> / {fmt(d.quota)} coal
          </div>
        </div>
        <div class={`clock ${left <= DAY.lastBellS ? 'late' : ''}`}>{clock(left)}</div>
        <button class="hud-btn" aria-label="Pause" onClick={() => bridge.setPaused(true)}>
          ||
        </button>
      </div>
      <div class="hud-side">
        <div class="stat">
          <span class="lbl">Scrip</span>
          <b>{fmt(s.contract.scrip.floor())}</b>
        </div>
        <div class={`stat pack ${used >= cap ? 'full' : ''}`}>
          <span class="lbl">Pack</span>
          <b>
            {used}/{cap}
          </b>
          <div class="bar">
            <div style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
          </div>
          {spill > 0 && <small class="spill">+{spill} waiting for putters</small>}
          {packOre(d) > 0 && (
            <div class="ore-row">
              {ORE_IDS.filter((k) => d.pack.ores[k] > 0).map((k) => (
                <span key={k} class="ore" title={`${ORES[k].name}: ${ORES[k].job}`}>
                  <img src={spriteURL(ORES[k].sprite)} alt="" />
                  {d.pack.ores[k]}
                </span>
              ))}
            </div>
          )}
        </div>
        {d.heat > 0.02 && (
          <div class={`stat heat ${d.heat > 0.7 ? 'full' : ''}`}>
            <span class="lbl">Heat</span>
            <div class="bar">
              <div style={{ width: `${Math.round(d.heat * 100)}%` }} />
            </div>
          </div>
        )}
        {crew > 0 && (
          <div class="stat">
            <span class="lbl">Crew</span>
            <b>{fmt(d.byCrew.floor())}</b>
            <small>{crew >= 10 ? fmt(D(crew)) : crew.toFixed(1)}/s</small>
          </div>
        )}
        {s.contract.relics.length > 0 && (
          <div class="relics">
            {s.contract.relics.map((r) => (
              <span key={r} class="relic" title={`${RELICS[r].name}: ${RELICS[r].blurb}`}>
                <img src={spriteURL(`relic-${r}`)} alt={RELICS[r].name} />
              </span>
            ))}
          </div>
        )}
      </div>
      <div class="kit">
        {owned(s).map((id) => {
          const t = TOOLS.find((x) => x.id === id)!;
          const n = TOOLS.indexOf(t) + 1;
          const left = id === 'mortar' ? d.shellsLeft : id === 'drill' ? d.rigsLeft : null;
          return (
            <button
              key={id}
              class={`kit-slot tool ${d.tool === id ? 'on' : ''} ${left === 0 ? 'dim' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                bridge.input.selectTool(n - 1);
              }}
              title={t.name}
            >
              <span class="key">{n}</span>
              <img src={spriteURL(id === 'pick' ? pick.sprite : t.sprite)} alt="" />
              {id === 'pick' && <span>{pick.name}</span>}
              {left !== null && <b>{left}</b>}
            </button>
          );
        })}
        <div class={`kit-slot keyed ${d.charges ? '' : 'dim'}`}>
          <span class="key">E</span>
          <span>
            Charges <b>{d.charges}</b>
          </span>
        </div>
        <div class={`kit-slot keyed ${d.ladders ? '' : 'dim'}`}>
          <span class="key">F</span>
          <span>
            Ladders <b>{d.ladders}</b>
          </span>
        </div>
        <div class={`kit-slot keyed ${d.platforms ? '' : 'dim'}`}>
          <span class="key">G</span>
          <span>
            Platforms <b>{d.platforms}</b>
          </span>
        </div>
        {d.rush.chain > 0 && (
          <div class="rush">
            RUSH ×
            {Math.min(3, 1 + 0.25 * d.rush.chain)
              .toFixed(2)
              .replace(/\.?0+$/, '')}
          </div>
        )}
      </div>
      {s.contract.day === 1 && d.t < 25 && !s.meta.contracts && <div class="hint">{HINTS.first}</div>}
      {dusk && <DuskStamp g={g} />}
    </>
  );
}

function DuskStamp({ g }: { g: Game }) {
  const d = g.day!;
  const ok = d.deposited.gte(d.quota);
  const lines = ok ? TALLY_LINES.passed : TALLY_LINES.failed;
  return (
    <div class={`stamp ${ok ? 'ok' : 'bad'}`}>
      <div class="stamp-big">{ok ? 'Quota met' : 'Short'}</div>
      <div class="stamp-num">
        {fmt(d.deposited.floor())} / {fmt(d.quota)} coal
      </div>
      <div class="stamp-line">{lines[g.s.contract.day % lines.length]}</div>
    </div>
  );
}

export function PauseMenu({ bridge }: { bridge: Bridge }) {
  const [sure, setSure] = useState(false);
  return (
    <div class="screen pause">
      <div class="card narrow">
        <h2>Paused</h2>
        <button class="big" onClick={() => bridge.setPaused(false)}>
          Back to the mine
        </button>
        <button onClick={() => bridge.setMuted(!bridge.muted)}>
          {bridge.muted ? 'Sound: off' : 'Sound: on'}
        </button>
        <button
          onClick={() => {
            const caps = [50, 100, 200, 400];
            bridge.setCrowd(caps[(caps.indexOf(bridge.crowd) + 1) % caps.length]!);
          }}
        >
          Crew drawn: up to {bridge.crowd}
        </button>
        <Controls />
        {!sure ? (
          <button class="quiet" onClick={() => setSure(true)}>
            Start over…
          </button>
        ) : (
          <div class="confirm">
            <span>Wipe this save and start again?</span>
            <button class="danger" onClick={() => bridge.startOver()}>
              Yes, wipe it
            </button>
            <button onClick={() => setSure(false)}>Keep it</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Controls() {
  return (
    <dl class="controls">
      {CONTROLS.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
