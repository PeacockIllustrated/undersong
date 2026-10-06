// Writes tests/fixtures/saves/v{SAVE_VERSION}.json from a short scripted game. Run once per save version.
import { writeFileSync } from 'node:fs';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { toJSON } from '../src/save/codec';
import { SAVE_VERSION } from '../src/sim/state';
import { SHAFT_X, SKY_ROWS, TICK_MS } from '../src/data/constants';

const g = createGame(1234);
apply(g, { type: 'digPath', tiles: [3, 4, 5].map((d) => ({ x: SHAFT_X, y: SKY_ROWS + d })) });
for (let i = 0; i < 600; i++) step(g, TICK_MS);
const out = new URL(`../tests/fixtures/saves/v${SAVE_VERSION}.json`, import.meta.url);
writeFileSync(out, JSON.stringify(JSON.parse(toJSON(g.state)), null, 1) + '\n');
console.log('wrote', out.pathname);
