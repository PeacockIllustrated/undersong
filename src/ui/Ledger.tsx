// M13-05: the ledger, a page of the Survey Book with the village's totals.
import { FT_PER_TILE } from '../data/constants';
import type { GameState } from '../sim/state';
import { LEDGER_TEXT as T } from '../story/qol';
import { fmt } from './format';

export function Ledger({ s }: { s: GameState }) {
  const mins = (ms: number): string => T.mins(Math.floor(ms / 60_000));
  const runs = s.survey.filter((p) => p.hand === 'yours' && p.min !== undefined).map((p) => p.min!);
  const rows: [string, string][] = [
    [T.played, mins(s.totalT)],
    [T.playedRun, mins(s.t)],
    [T.tiles, s.stats.tilesEver.toLocaleString('en-GB')],
    [T.tilesRun, s.stats.tilesMined.toLocaleString('en-GB')],
    [T.deepest, `${(s.stats.bestDepthD * FT_PER_TILE).toLocaleString('en-GB')} ft`],
    [T.caveIns, String(s.stats.caveIns)],
    [T.fastest, runs.length ? T.mins(Math.min(...runs)) : T.none],
    [T.echoes, fmt(s.echoesEver)],
    [T.chests, String(s.stats.chests)],
    [T.collapses, String(s.stats.collapses)],
  ];
  return (
    <section>
      <h3>{T.title}</h3>
      <table class="ledger">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} class={k === T.playedRun || k === T.tilesRun ? 'sub' : ''}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
