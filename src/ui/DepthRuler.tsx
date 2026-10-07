// Polish item 7: a depth ruler on the right edge, to scale, with a band per biome.
// Reached bands show their colour; the next one is hatched and unnamed. Markers: you, your best, the Homecoming line,
// and (M9-05) last run's ghost at this minute.
import { BIOMES, BIOME_BAND, biomeAt } from '../data/biomes';
import { SHAFT_X, ftFromDepthTiles } from '../data/constants';
import { homecoming, homeUntilD } from '../sim/power';
import { ghostDepth } from '../sim/memory';
import type { UiBridge } from './App';

export function DepthRuler({ ui }: { ui: UiBridge }) {
  const g = ui.game;
  const s = g.state;
  if (s.stats.bestDepthD < 1) return null;
  const best = s.stats.bestDepthD;
  // to scale down to the bottom of the next biome below your best
  const nextB = BIOMES[Math.min(BIOMES.length - 1, biomeAt(best).id + 1)]!;
  const bottom = Math.min(nextB.d1, nextB.d0 + 120);
  const pct = (d: number): string => `${Math.max(0, Math.min(100, (d / bottom) * 100))}%`;
  const you = g.world.depth(s.foreman.y);
  // hidden in Holloway: the ruler is for the dig
  if (you < 1) return null;
  const home = homecoming(s) > 1 ? homeUntilD(s) : null;
  // M9-05: where you were at this minute of the last run
  const ghost = ghostDepth(s);
  return (
    <div class="ruler" aria-label="Depth ruler">
      {BIOMES.filter((b) => b.id > 0 && b.d0 < bottom).map((b) => {
        const reached = best >= b.d0;
        return (
          <button
            key={b.id}
            class={`band ${reached ? '' : 'unknown'}`}
            style={{
              top: pct(b.d0),
              height: `calc(${pct(Math.min(b.d1, bottom))} - ${pct(b.d0)})`,
              background: reached ? BIOME_BAND[b.id] : undefined,
            }}
            title={
              reached ? `${b.name} · ${ftFromDepthTiles(b.d0)} ft` : `${ftFromDepthTiles(b.d0)} ft · not yet`
            }
            aria-label={reached ? `Show ${b.name}` : 'Not reached yet'}
            onClick={() => reached && ui.lookAt(SHAFT_X, g.world.surf[SHAFT_X]! + Math.max(b.d0, 1))}
          />
        );
      })}
      {home !== null && <i class="mark home-mark" style={{ top: pct(home) }} title="Homecoming ends here" />}
      {ghost !== null && ghost >= 1 && (
        <i
          class="mark ghost-mark"
          style={{ top: pct(ghost) }}
          title={`Last cycle at this minute: ${ftFromDepthTiles(ghost)} ft`}
        />
      )}
      <i class="mark best-mark" style={{ top: pct(best) }} title={`Deepest: ${ftFromDepthTiles(best)} ft`} />
      <i class="mark you-mark" style={{ top: pct(you) }} title={`You: ${ftFromDepthTiles(you)} ft`} />
    </div>
  );
}
