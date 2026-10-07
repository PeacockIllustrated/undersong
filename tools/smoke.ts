// M12-03 (ADR-039): the layout smoke test. Serves the built game (dist/), boots every save fixture and a new
// game at 1280×800 and 390×844, and fails on any page error or horizontal overflow. Screenshots go to
// smoke-shots/, which CI keeps as an artifact. Run `npm run build` first.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright';
import { fromJSON, pack } from '../src/save/codec';
import { SAVE_KEY } from '../src/data/constants';

const DIST = 'dist';
const OUT = 'smoke-shots';
const FIXTURES = 'tests/fixtures/saves';
const WAIT_MS = 2500;
const VIEWS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
} as const;
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.sprite': 'text/plain',
  '.txt': 'text/plain',
};

if (!existsSync(join(DIST, 'index.html')))
  throw new Error('dist/index.html missing: run `npm run build` first');
mkdirSync(OUT, { recursive: true });

const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, path === '/' ? 'index.html' : path);
  if (!existsSync(file)) file = join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;

/** Each fixture, upgraded and packed the way the game keeps it, with no time away to catch up on. */
const saves: [string, string | null][] = [['new', null]];
for (const f of readdirSync(FIXTURES).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))) {
  const s = fromJSON(readFileSync(join(FIXTURES, f), 'utf8'));
  s.savedAt = 0;
  saves.push([f.replace('.json', ''), pack(s)]);
}

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const fails: string[] = [];
for (const [name, save] of saves)
  for (const [view, opts] of Object.entries(VIEWS)) {
    const ctx = await browser.newContext(opts);
    if (save)
      await ctx.addInitScript(
        ([k, d]) => {
          if (!sessionStorage.getItem('smoke')) {
            localStorage.setItem(k, d);
            sessionStorage.setItem('smoke', '1');
          }
        },
        [SAVE_KEY, save] as const,
      );
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForTimeout(WAIT_MS);
    let over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(OUT, `${name}-${view}.png`) });
    // M13-07: each panel of the drawer opens without errors or overflow
    for (const [key, panel] of [
      ['v', 'village'],
      ['b', 'survey'],
    ] as const) {
      await page.keyboard.press(key);
      await page.waitForTimeout(400);
      if (!(await page.locator(`.drawer.${panel}`).count())) errors.push(`the ${panel} drawer did not open`);
      over = Math.max(
        over,
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      );
      await page.screenshot({ path: join(OUT, `${name}-${view}-${panel}.png`) });
    }
    const tag = `${name} at ${view}`;
    for (const e of errors) fails.push(`${tag}: page error: ${e}`);
    if (over > 0) fails.push(`${tag}: ${over}px of horizontal overflow`);
    console.log(`${errors.length || over > 0 ? '✗' : '✓'} ${tag}`);
    await ctx.close();
  }
await browser.close();
server.close();

if (fails.length) {
  console.error(`\n${fails.join('\n')}`);
  process.exit(1);
}
console.log(`\nAll ${saves.length * 2} boots clean. Screenshots in ${OUT}/.`);
