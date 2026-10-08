// The feats panel (H8): every achievement, earned or not, with how far along the village is.
import { spriteURL } from '../../render/sprites';
import { D } from '../../sim/decimal';
import { fmt } from '../../ui/format';
import { FEATS } from '../data/co';
import { featValue } from '../sim/feats';
import type { Game } from '../sim/state';
import type { Bridge } from './App';

export function FeatsButton({ g, bridge }: { g: Game; bridge: Bridge }) {
  return (
    <button class="feats-btn" onClick={() => bridge.setFeats(true)}>
      <img src={spriteURL('badge')} alt="" />
      Feats {g.s.meta.feats.length}/{FEATS.length}
    </button>
  );
}

export function FeatsPanel({ g, bridge }: { g: Game; bridge: Bridge }) {
  const got = g.s.meta.feats;
  // earned first, then the nearest to done
  const rows = FEATS.map((f) => {
    const v = Math.min(f.n, featValue(g, f.key));
    return { f, v, done: got.includes(f.id), p: v / f.n };
  }).sort((a, b) => Number(b.done) - Number(a.done) || b.p - a.p);
  return (
    <div class="screen feats" onClick={() => bridge.setFeats(false)}>
      <div class="card feats-card" onClick={(e) => e.stopPropagation()}>
        <div class="store-head">
          <h2>Feats</h2>
          <b class="gold">
            {got.length} / {FEATS.length}
          </b>
        </div>
        <div class="feat-grid">
          {rows.map(({ f, v, done, p }) => (
            <div key={f.id} class={`feat ${done ? 'done' : ''}`}>
              <img src={spriteURL('badge')} alt="" />
              <div>
                <b>{f.name}</b>
                <span>{f.blurb}</span>
                {!done && f.n > 1 && (
                  <div class="feat-bar">
                    <i style={{ width: `${Math.round(p * 100)}%` }} />
                    <small>
                      {fmt(D(Math.floor(v)))} / {fmt(D(f.n))}
                    </small>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button class="big" onClick={() => bridge.setFeats(false)}>
          Close
        </button>
      </div>
    </div>
  );
}
