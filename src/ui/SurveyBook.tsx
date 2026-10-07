// The Survey Book: this run, the Cave-in, Echo upgrades, verses, and pages from earlier cycles.
import { FT_PER_TILE } from '../data/constants';
import { AUTO_TEXT, KEY_TEXT, KEY_UI, MARKER_TEXT } from '../story/beyond';
import { markerD, markersReached } from '../sim/beyond';
import { useState } from 'preact/hooks';
import { CAVE_IN } from '../data/economy';
import { UPGRADES, type Branch } from '../data/upgrades';
import { VERSES } from '../story/verses';
import { canCaveIn, echoGain, maxFt, versesThisRun } from '../sim/cavein';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { HOMECOMING } from '../data/helpers';
import { fmt } from './format';
import { ENDING_NOTE } from '../story/ending';
import { NEW_SONG } from '../data/heat';
import { AchievementList } from './Achievements';
import { CURIO, CURIOS } from '../data/finds';
import { BIOMES } from '../data/biomes';
import { CURIO_TEXT, CURIO_UI, RARITY_NAME } from '../story/finds';
import { fullSets } from '../sim/finds';
import { Tabs } from './Drawer';
import { LEDGER_TEXT, SURVEY_TABS } from '../story/qol';
import { Ledger } from './Ledger';

const BRANCH_NAME: Record<Branch, string> = { hands: 'Hands', lamps: 'Lamps', memory: 'Memory' };

export type SurveyTab = 'cycle' | 'echoes' | 'verses' | 'shelf' | 'pages' | 'feats';
/** The last page open, kept for the session; a Cave-in opens the book on its first page. */
let lastTab: SurveyTab = 'cycle';
export function surveyTab(t: SurveyTab): void {
  lastTab = t;
}

/** The Survey Book's pages, inside the drawer (M13-07). */
export function SurveyBook({ ui, close }: { ui: UiBridge; close: () => void }) {
  const [tab, setTabState] = useState<SurveyTab>(lastTab);
  const setTab = (t: SurveyTab): void => {
    lastTab = t;
    setTabState(t);
  };
  const s = ui.game.state;
  const [confirm, setConfirm] = useState(false);
  const ready = canCaveIn(s);
  const ft = maxFt(s);
  const gain = echoGain(s);
  const last = [...s.survey].reverse().find((p) => p.hand === 'yours');
  const echoBuys = UPGRADES.filter(
    (u) => !s.upgrades[u.id] && (!u.requires || s.upgrades[u.requires]) && s.echoes.gte(u.cost),
  ).length;
  // what those Echoes would buy, cheapest first
  const buys: string[] = [];
  let left = s.echoes.add(gain).toNumber();
  const owned = new Set(Object.keys(s.upgrades).filter((k) => s.upgrades[k]));
  for (const u of [...UPGRADES].sort((a, b) => a.cost - b.cost)) {
    if (owned.has(u.id) || (u.requires && !owned.has(u.requires)) || u.cost > left) continue;
    left -= u.cost;
    owned.add(u.id);
    buys.push(u.name);
    if (buys.length >= 3) break;
  }

  return (
    <>
      <Tabs
        label="Survey Book"
        tabs={[
          { id: 'cycle', label: SURVEY_TABS.cycle, n: ready ? 1 : 0 },
          { id: 'echoes', label: SURVEY_TABS.echoes, n: echoBuys },
          { id: 'verses', label: SURVEY_TABS.verses },
          { id: 'shelf', label: SURVEY_TABS.shelf },
          { id: 'pages', label: SURVEY_TABS.pages },
          { id: 'feats', label: SURVEY_TABS.feats },
        ]}
        on={tab}
        set={setTab}
      />
      <div class="book">
        {(s.ngPlus > 0 || s.world.endlessRows > 0) && (
          <p class="small ending-note">
            {s.ngPlus > 0 && `${ENDING_NOTE.songs(s.ngPlus, NEW_SONG.perSong)} `}
            {s.world.endlessRows > 0 && ENDING_NOTE.endless}
            {s.songKey &&
              ` ${KEY_UI.now} ${KEY_TEXT[s.songKey].name.toLowerCase()}: ${KEY_TEXT[s.songKey].text}`}
            {s.ending === 'seal' && ` ${MARKER_TEXT.next(markerD(markersReached(s) + 1) * FT_PER_TILE)}.`}
          </p>
        )}

        {tab === 'cycle' && (
          <section>
            <h3>Cycle {s.cycle}</h3>
            <p>
              Deepest this cycle: <b>{ft} ft</b>. Verses found: <b>{versesThisRun(s)}</b> of 12.
            </p>
            {ready ? (
              <>
                <p class="worth">
                  <b>+{fmt(gain)} Echoes</b>
                  {last ? ` · last time ${last.echoes}` : ''}
                  {buys.length ? ` · enough for ${buys.join(', ')}` : ''}
                </p>
                <p class="small">
                  The village forgets its buildings and bars; you keep Echoes, verses and your helpers, and
                  the way back down goes ×{HOMECOMING.mult} faster until {Math.round(HOMECOMING.frac * 100)}%
                  of your best depth.
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
        )}

        {tab === 'echoes' && (
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
        )}

        {tab === 'verses' && (
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
        )}

        {tab === 'shelf' && (
          <section>
            <h3>
              {CURIO_UI.title} · {s.curios.length} of {CURIOS.length}
            </h3>
            <p class="small muted">{CURIO_UI.intro}</p>
            <div class="shelf">
              {BIOMES.filter((b) => b.id >= 1).map((b) => {
                const set = CURIOS.filter((c) => c.biome === b.id);
                const done = fullSets(s).includes(b.id);
                return (
                  <div key={b.id} class={`shelf-row ${done ? 'done' : ''}`}>
                    <h4>
                      {b.name}
                      {done && (
                        <span class="set">
                          {' '}
                          · {CURIO_UI.setDone} +{Math.round(CURIO.set * 100)}%
                        </span>
                      )}
                    </h4>
                    <div class="curios">
                      {set.map((c) => {
                        const has = s.curios.includes(c.id);
                        const t = CURIO_TEXT[c.id]!;
                        return (
                          <div
                            key={c.id}
                            class={`curio ${c.rarity} ${has ? 'has' : 'missing'}`}
                            title={
                              has
                                ? `${t.name}: ${t.note}`
                                : `${RARITY_NAME[c.rarity]} · ${CURIO_UI.missing} ${b.name}`
                            }
                          >
                            <img
                              src={spriteURL(
                                'curio',
                                c.rarity === 'common' ? 0 : c.rarity === 'fine' ? 1 : 2,
                              )}
                              alt=""
                            />
                            <b>{has ? t.name : '?'}</b>
                            <span>
                              {has
                                ? CURIO_UI.fx(c.fx, Math.round(CURIO.bonus[c.rarity] * 100))
                                : RARITY_NAME[c.rarity]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'pages' && <Ledger s={s} />}
        {tab === 'pages' && (
          <section>
            <h3>Pages</h3>
            <table class="pages">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Depth</th>
                  <th>Verses</th>
                  <th>Echoes</th>
                  <th>{LEDGER_TEXT.time}</th>
                </tr>
              </thead>
              <tbody>
                {s.survey.map((p, i) => (
                  <tr key={i} class={p.hand}>
                    <td>{p.hand === 'old' ? '—' : p.cycle}</td>
                    <td>{p.depthFt} ft</td>
                    <td>{p.verses}</td>
                    <td>
                      {p.echoes}
                      {p.auto && <span class="small muted"> · {AUTO_TEXT.page}</span>}
                    </td>
                    <td>{p.min !== undefined ? LEDGER_TEXT.mins(p.min) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p class="small muted">
              The first pages were here when you opened the book. The handwriting is yours.
            </p>
          </section>
        )}
        {tab === 'feats' && <AchievementList s={s} />}
      </div>
    </>
  );
}
