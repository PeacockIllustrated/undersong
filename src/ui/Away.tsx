// "While you were away": what the village did with the time the page was closed. canon §4.8
import { RES_NAMES } from '../data/resources';
import { ftFromDepthTiles } from '../data/constants';
import { OFFLINE } from '../data/upgrades';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { RES_ICON } from './icons';
import { fmt } from './format';

function span(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${Math.max(1, m)} min`;
}

export function AwaySheet({ ui }: { ui: UiBridge }) {
  const a = ui.away;
  if (!a) return null;
  const s = ui.game.state;
  const capH = s.upgrades.longShift ? OFFLINE.longShift.capH : OFFLINE.capH;
  const capped = a.awayS > capH * 3600;
  return (
    <div class="sheet-wrap verse-wrap" onClick={(e) => e.target === e.currentTarget && ui.clearAway()}>
      <div class="panel sheet away" role="dialog" aria-label="While you were away">
        <h2>While you were away</h2>
        <p>
          You were gone {span(a.awayS)}.{' '}
          {s.miners.length > 0 ? 'The village worked' : 'The forge ticked over'} for {span(a.creditedS)} of it
          {capped ? `; nobody works more than ${capH} hours without you` : ''}.
        </p>
        {a.gains.length > 0 ? (
          <ul class="gains">
            {a.gains.map((x) => (
              <li key={x.res}>
                <img src={spriteURL(RES_ICON[x.res])} alt="" />+{fmt(x.n)} <span>{RES_NAMES[x.res]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted">Nothing came up the shaft. Hire miners and they keep digging while you rest.</p>
        )}
        {a.tiles > 0 && (
          <p class="small">
            {a.tiles} tiles dug{a.deeperD !== null ? `, down to ${ftFromDepthTiles(a.deeperD)} ft` : ''}.
          </p>
        )}
        <button class="btn primary" onClick={() => ui.clearAway()}>
          Back to the dig
        </button>
      </div>
    </div>
  );
}
