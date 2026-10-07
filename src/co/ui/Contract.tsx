// The title (first contract) and the Cave-in with the Survey Book (every contract after).
import { spriteURL } from '../../render/sprites';
import { fmt } from '../../ui/format';
import { BOOK, type BookId } from '../data/co';
import { CAVEIN, TITLE } from '../story/company';
import type { Game } from '../sim/state';
import { bookCost } from '../sim/stats';
import type { Bridge } from './App';
import { Controls } from './Hud';

export function TitleScreen({ g, bridge }: { g: Game; bridge: Bridge }) {
  void g;
  return (
    <div class="screen title">
      <div class="card narrow">
        <p class="eyebrow">A branch of Undersong</p>
        <h1>{TITLE.name}</h1>
        <p class="lede">{TITLE.line}</p>
        <ul class="pitch">
          {TITLE.pitch.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <button class="big go" onClick={() => bridge.sign()}>
          {TITLE.sign}
        </button>
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
          <h2 class="red">{CAVEIN.title}</h2>
          <p class="tally-line">{CAVEIN.line}</p>
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
            Best day so far: {g.s.meta.bestDay}. Every Echo you have ever earned makes everyone dig 2% faster.
          </p>
          <button class="big go" onClick={() => bridge.sign()}>
            {CAVEIN.again}
          </button>
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
