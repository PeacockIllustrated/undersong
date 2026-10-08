// The title (first contract) and the Cave-in with the Survey Book (every contract after).
import { spriteURL } from '../../render/sprites';
import { fmt } from '../../ui/format';
import { useState } from 'preact/hooks';
import { VERSES } from '../../story/verses';
import {
  BOOK,
  ECHO_POWER,
  FOREMEN,
  FOREMAN_IDS,
  SEAM_DEFS,
  SEAM_IDS,
  SEAM_UNLOCK_DAY,
  type BookId,
  type ForemanId,
  type SeamId,
} from '../data/co';
import { foremanOpen, seamOpen } from '../sim/contract';
import { CAVEIN, ENDINGS, SIGNING, TALLY_LINES, TITLE, unlockText } from '../story/company';
import type { Game } from '../sim/state';
import { bookCost } from '../sim/stats';
import type { Bridge } from './App';
import { Controls } from './Hud';

export function TitleScreen({ g, bridge }: { g: Game; bridge: Bridge }) {
  return (
    <div class="screen title">
      <div class="card narrow">
        <p class="eyebrow">A branch of Undersong</p>
        <h1>{TITLE.name}</h1>
        <p class="lede">{TITLE.line}</p>
        {(g.s.meta.newSong > 0 || g.s.meta.endings.length > 0) && (
          <p class="new-song">
            {g.s.meta.newSong > 0 && <b>New Song+{g.s.meta.newSong > 1 ? ` ${g.s.meta.newSong}` : ''}</b>}
            {g.s.meta.endings.includes('quota') && <span>{ENDINGS.quota.title}</span>}
            {g.s.meta.endings.includes('song') && <span>{ENDINGS.song.title}</span>}
          </p>
        )}
        <ul class="pitch">
          {TITLE.pitch.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {g.s.meta.contracts > 0 ? (
          <SignTable g={g} bridge={bridge} label={TITLE.sign} />
        ) : (
          <button class="big go" onClick={() => bridge.sign()}>
            {TITLE.sign}
          </button>
        )}
        <Controls />
        <p class="muted small">On a phone: left thumb moves, right thumb aims and digs.</p>
      </div>
    </div>
  );
}

function BookRow({ g, bridge, id }: { g: Game; bridge: Bridge; id: BookId }) {
  const def = BOOK.find((d) => d.id === id)!;
  const cost = bookCost(g.s, id);
  const can = !!cost && g.s.meta.echoes.gte(cost);
  const lvl = g.s.meta.book[id];
  return (
    <div class={`shop-row ${can ? 'can' : ''} ${cost ? '' : 'maxed'}`}>
      <div class="shop-icon echo">
        <img src={spriteURL('echo')} alt="" />
        <span class="lvl">{lvl}</span>
      </div>
      <div class="shop-text">
        <b>{def.name}</b>
        <span>{def.blurb}</span>
      </div>
      <button class="buy" disabled={!can} onClick={() => bridge.buyBook(id)}>
        {cost ? `${fmt(cost)} ◆` : 'Maxed'}
      </button>
    </div>
  );
}

export function CaveInScreen({ g, bridge }: { g: Game; bridge: Bridge }) {
  const c = g.s.caveIn;
  return (
    <div class="screen cavein">
      <div class="night-grid">
        <section class="card tally">
          <p class="eyebrow">Contract {c?.contract ?? g.s.contract.n} is over</p>
          <h2 class={c?.why === 'song' ? 'gold' : 'red'}>
            {c?.why === 'song' ? ENDINGS.song.title : CAVEIN.title}
          </h2>
          {c?.why === 'short' && (
            <p class="tally-line">{TALLY_LINES.failed[(c.days + c.contract) % TALLY_LINES.failed.length]}</p>
          )}
          <p class="tally-line">{c?.why === 'song' ? ENDINGS.song.after : CAVEIN.line}</p>
          {c && (
            <dl class="sheet">
              <div>
                <dt>Days survived</dt>
                <dd>{c.days}</dd>
              </div>
              <div>
                <dt>Coal sent up</dt>
                <dd>{fmt(c.coal.floor())}</dd>
              </div>
              <div>
                <dt>Verses found</dt>
                <dd>{c.verses}</dd>
              </div>
              <div class="big-row">
                <dt>Echoes earned</dt>
                <dd>+{fmt(c.echoes)}</dd>
              </div>
            </dl>
          )}
          <p class="muted small">
            Best day so far: {g.s.meta.bestDay}. Every Echo you have ever earned makes everyone dig{' '}
            {Math.round(ECHO_POWER * 100)}% faster.
          </p>
          <SignTable g={g} bridge={bridge} label={CAVEIN.again} />
          <Song g={g} />
        </section>
        <section class="card store">
          <div class="store-head">
            <h2>{CAVEIN.book}</h2>
            <div class="purse">
              <span class="lbl">Echoes</span>
              <b>{fmt(g.s.meta.echoes)}</b>
            </div>
          </div>
          <p class="muted small">{CAVEIN.bookLine}</p>
          <div class="shop-list">
            {BOOK.map((d) => (
              <BookRow key={d.id} g={g} bridge={bridge} id={d.id} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Pick a Foreman and a Seam, then sign. Locked cards say how to open them. */
export function SignTable({ g, bridge, label }: { g: Game; bridge: Bridge; label: string }) {
  const last = g.s.contract;
  const [fm, setFm] = useState<ForemanId>(foremanOpen(g, last.foreman) ? last.foreman : 'apprentice');
  const [seam, setSeam] = useState<SeamId>(seamOpen(g, last.seam) ? last.seam : 'openCut');
  return (
    <div class="sign">
      <h3>{SIGNING.foreman}</h3>
      <div class="pick-grid">
        {FOREMAN_IDS.map((id) => {
          const f = FOREMEN[id];
          const open = foremanOpen(g, id);
          const badge = g.s.meta.badges.includes(`fm:${id}`);
          return (
            <button
              key={id}
              class={`pick-card ${fm === id ? 'on' : ''} ${open ? '' : 'locked'}`}
              disabled={!open}
              onClick={() => setFm(id)}
              title={open ? f.blurb : unlockText(f.unlock)}
            >
              <img src={spriteURL(f.sprite)} alt="" />
              <b>{f.name}</b>
              <small>{open ? f.who : unlockText(f.unlock)}</small>
              {badge && <span class="badge-dot" title="Day 15 badge" />}
            </button>
          );
        })}
      </div>
      <p class="muted small">{FOREMEN[fm].blurb}</p>
      <h3>{SIGNING.seam}</h3>
      <div class="seam-list">
        {SEAM_IDS.map((id) => {
          const d = SEAM_DEFS[id];
          const open = seamOpen(g, id);
          return (
            <button
              key={id}
              class={`seam ${seam === id ? 'on' : ''} ${open ? '' : 'locked'}`}
              disabled={!open}
              onClick={() => setSeam(id)}
            >
              <b>
                {d.name}
                {g.s.meta.badges.includes(`seam:${id}`) && (
                  <span class="badge-dot inline" title="Badge earned" />
                )}
              </b>
              <small>
                {open
                  ? `${d.kind}. ${d.blurb}`
                  : d.after === 'all'
                    ? 'Survive day ' + SEAM_UNLOCK_DAY + ' on the other five'
                    : `Survive day ${SEAM_UNLOCK_DAY} on ${SEAM_DEFS[d.after!].name}`}
              </small>
            </button>
          );
        })}
      </div>
      <button class="big go" onClick={() => bridge.sign({ foreman: fm, seam })}>
        {label}
      </button>
    </div>
  );
}

/** The verses found so far, in order, with the newest in full. */
export function Song({ g }: { g: Game }) {
  const found = g.s.meta.verses;
  const last = found[found.length - 1];
  return (
    <div class="song">
      <h3>{SIGNING.song}</h3>
      <div class="verse-row">
        {VERSES.map((v, i) => (
          <span key={v.n} class={`verse-n ${found.includes(i) ? 'on' : ''}`}>
            {v.n}
          </span>
        ))}
      </div>
      {last !== undefined ? (
        <p class="verse-text">
          {VERSES[last]!.lines[0]}
          <br />
          {VERSES[last]!.lines[1]}
        </p>
      ) : (
        <p class="muted small">{SIGNING.songEmpty}</p>
      )}
    </div>
  );
}
