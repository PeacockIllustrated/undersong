# Holloway & Co.: canon (hybrid branch)

Every number lives in `src/co/data/co.ts`, under the section numbers below. Change it there and update this page.

- §2 **Day:** 180 s base, +20 s per Lantern hours level, last bell at 20 s. At dusk, a full pack is banked at 50%.
- §3 **Quota:** Q(d) = 30 × 1.38^(d−1), rounded up. Days 1–5 × 0.6 (day 1 = 18). Every 7th day is an audit, × 1.6.
- §4 **Body:** 0.7 × 1.45 tiles, run 6 tiles/s, gravity 52, jump 18.2 (about 3 tiles), with coyote time, a jump buffer, ladders, swimming, double jump and a jetpack.
- §5 **Digging:** seconds per tile = H(depth) / (pick power × 4 × hand mult), reach 2.6 tiles. A rush builds +25% per quick break, up to ×3.
- §6 **Coal seams** are fbm noise over Undersong's generator. A coal tile gives 3 coal.
- §7 **Shaft:** 8 tiles deep, +8 per level, laddered, with the kibble at the headframe (or the shaft foot once bought).
- §8 **Crew:** a hand digs 0.35 × √pick power coal/s. A deputy leads 10 hands for +50%.
- §9 **Company Store:** cost(n) = base × growth^n scrip, with 14 items. See `SHOP`.
- §10 **Kit at dawn:** ladders and charges, from upgrades.
- §11 **Chests:** 15 × (1 + depth/12) scrip, with a 30% chance of one of 8 relics.
- §12 **Echoes:** max(1, ⌊√(coal / 20) × (1 + 0.15·days) × (1 + 0.25·verses)⌋), or 0 if no coal went up. Each Echo ever earned gives +2% digging.
- §13 **Survey Book:** 8 rows, cost(l) = base × growth^l Echoes.
- **Save:** `hollowayco.save`, version 1, lz-string.
