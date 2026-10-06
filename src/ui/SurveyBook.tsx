// The Survey Book: this run, the Cave-in, Echo upgrades, verses, and pages from earlier cycles.
import { useState } from 'preact/hooks';
import { CAVE_IN } from '../data/economy';
import { UPGRADES, type Branch } from '../data/upgrades';
import { VERSES } from '../story/verses';
import { canCaveIn, echoGain, maxFt, versesThisRun } from '../sim/cavein';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { fmt } from './format';

const BRANCH_NAME: Record<Branch, string> = { hands: 'Hands', lamps: 'Lamps', memory: 'Memory' };

export function SurveyBook({ ui, close }: { ui: UiBridge; close: () => void }) {
  const s = ui.game.state;
  const [confirm, setConfirm] = useState(false);
  const ready = canCaveIn(s);
  const ft = maxFt(s);
  const gain = echoGain(s);

  return (
    <div class="sheet-wrap side" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="book sheet" role="dialog" aria-label="Survey Book">
        <div class="sheet-head">
          <h2>Survey Book</h2>
          <button class="btn" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

        <section>
          <h3>Cycle {s.cycle}</h3>
          <p>
            Deepest this cycle: <b>{ft} ft</b>. Verses found: <b>{versesThisRun(s)}</b> of 12.
          </p>
          {ready ? (
            <>
              <p>
                The timbers groan. Let the mountain settle and the village will forget all of this, but you
                keep what you heard.
              </p>
              {!confirm ? (
                <button class="btn danger" onClick={() => setConfirm(true)}>
                  Let it cave in · +{fmt(gain)} Echoes
                </button>
              ) : (
                <div class="row">
                  <button class="btn danger" onClick={() => (ui.dispatch({ type: 'caveIn' }), close())}>
                    Yes, let it go
                  </button>
                  <button class="btn" onClick={() => setConfirm(false)}>
                    Not yet
                  </button>
                </div>
              )}
            </>
          ) : (
            <p class="muted">
              The mountain holds. It will settle once you reach {CAVE_IN.minFt} ft{' '}
              {s.verses.run[CAVE_IN.verse] ? '' : `and find Verse ${VERSES[CAVE_IN.verse]!.n}`}. Right now a
              Cave-in would give {fmt(gain)} Echoes.
            </p>
          )}
        </section>

        <section>
          <h3>
            Echoes <img class="inline" src={spriteURL('echo')} alt="" /> {fmt(s.echoes)}
          </h3>
          <div class="branches">
            {(['hands', 'lamps', 'memory'] as Branch[]).map((b) => (
              <div key={b} class="branch">
                <h4>{BRANCH_NAME[b]}</h4>
                {UPGRADES.filter((u) => u.branch === b).map((u) => {
                  const owned = !!s.upgrades[u.id];
                  const locked = !!u.requires && !s.upgrades[u.requires];
                  return (
                    <button
                      key={u.id}
                      class={`upg ${owned ? 'owned' : ''}`}
                      disabled={owned || locked || s.echoes.lt(u.cost)}
                      onClick={() => ui.dispatch({ type: 'buyUpgrade', id: u.id })}
                    >
                      <b>{u.name}</b>
                      <span>{u.text}</span>
                      <em>
                        {owned
                          ? 'Remembered'
                          : locked
                            ? 'Needs the one above'
                            : `${u.cost} Echo${u.cost > 1 ? 'es' : ''}`}
                      </em>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>Verses</h3>
          <ol class="verses">
            {VERSES.map((v, i) => (
              <li key={v.n} class={s.verses.known[i] ? 'known' : ''}>
                <span class="vn">{v.n}</span>
                {s.verses.known[i] ? (
                  <span>
                    {v.lines[0]} {v.lines[1]}
                  </span>
                ) : (
                  <span class="muted">Somewhere in the {v.biome}.</span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3>Pages</h3>
          <table class="pages">
            <thead>
              <tr>
                <th>Cycle</th>
                <th>Depth</th>
                <th>Verses</th>
                <th>Echoes</th>
              </tr>
            </thead>
            <tbody>
              {s.survey.map((p, i) => (
                <tr key={i} class={p.hand}>
                  <td>{p.hand === 'old' ? '—' : p.cycle}</td>
                  <td>{p.depthFt} ft</td>
                  <td>{p.verses}</td>
                  <td>{p.echoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="small muted">
            The first pages were here when you opened the book. The handwriting is yours.
          </p>
        </section>
      </div>
    </div>
  );
}
