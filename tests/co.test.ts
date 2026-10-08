import { describe, expect, it } from 'vitest';
import { SHAFT_X } from '../src/data/constants';
import { M } from '../src/data/materials';
import { biomeAt } from '../src/data/biomes';
import { D } from '../src/sim/decimal';
import { CO_PICKS, DAY, GOLD_SCRIP, STEP_S } from '../src/co/data/co';
import { boxHits, idleControl, type Control } from '../src/co/sim/body';
import {
  buy,
  buyBook,
  buyRelic,
  canBuy,
  echoGain,
  echoesIfTonight,
  gradeOf,
  nextDay,
  rerollTinker,
  seamOpen,
  settleDusk,
  signContract,
  singDown,
  streakMult,
} from '../src/co/sim/contract';
import { aimTile, pickGem, startDay, stepDay } from '../src/co/sim/day';
import { daySeed, makeMine } from '../src/co/sim/mine';
import { fromSave, newGame, toSave, type Game } from '../src/co/sim/state';
import { charges, crewRate, handMult, packCap, pickTier, quota, shopOres } from '../src/co/sim/stats';

const run = (g: Game, c: Partial<Control>, seconds: number): void => {
  const ctl = { ...idleControl(), ...c };
  for (let i = 0; i < Math.round(seconds / STEP_S); i++) {
    stepDay(g, ctl, STEP_S);
    ctl.jumpPressed = false;
    ctl.throwPressed = false;
    ctl.ladderPressed = false;
  }
};

const started = (): Game => {
  const g = newGame(1234);
  signContract(g, 99);
  return g;
};

describe('Holloway & Co. mine', () => {
  it('is the same mine for the same seed and day, and a new one each day', () => {
    const a = makeMine(daySeed(5, 1), 8);
    const b = makeMine(daySeed(5, 1), 8);
    const c = makeMine(daySeed(5, 2), 8);
    expect(Buffer.from(a.mat).equals(Buffer.from(b.mat))).toBe(true);
    expect(Buffer.from(a.mat).equals(Buffer.from(c.mat))).toBe(false);
  });

  it('has coal seams and a laddered shaft', () => {
    const w = makeMine(daySeed(7, 1), 16);
    expect(w.mat.filter((m) => m === M.COAL).length).toBeGreaterThan(200);
    const top = w.surf[SHAFT_X]!;
    for (let d = 0; d <= 16; d++) {
      expect(w.get(SHAFT_X, top + d)).toBe(M.AIR);
      expect(w.objects[String(w.idx(SHAFT_X, top + d))]).toBe('rope');
    }
  });
});

describe('the Foreman', () => {
  it('stands on the ground at dawn and never sinks into rock', () => {
    const g = started();
    run(g, {}, 1);
    const b = g.day!.body;
    expect(b.onGround).toBe(true);
    expect(boxHits(g.world!, b.x, b.y)).toBe(false);
  });

  it('runs, and jumps about three tiles', () => {
    const g = started();
    run(g, {}, 0.5);
    const b = g.day!.body;
    const x0 = b.x;
    run(g, { ax: 1 }, 0.4);
    expect(b.x).toBeGreaterThan(x0 + 1);
    const y0 = b.y;
    let top = b.y;
    const ctl = { ...idleControl(), jump: true, jumpPressed: true };
    for (let i = 0; i < 60; i++) {
      stepDay(g, ctl, STEP_S);
      ctl.jumpPressed = false;
      top = Math.min(top, b.y);
    }
    expect(y0 - top).toBeGreaterThan(2.5);
    expect(y0 - top).toBeLessThan(4);
  });

  it('climbs down the shaft ladder', () => {
    const g = started();
    const b = g.day!.body;
    b.x = SHAFT_X + 0.5;
    run(g, { down: true }, 1.2);
    expect(b.y).toBeGreaterThan(g.world!.surf[SHAFT_X]! + 3);
    expect(boxHits(g.world!, b.x, b.y)).toBe(false);
  });

  it('digs the tile it aims at and carries the coal back to the kibble', () => {
    const g = started();
    const w = g.world!;
    const b = g.day!.body;
    run(g, {}, 0.3);
    // put a coal tile right beside the Foreman and dig it
    const tx = Math.floor(b.x) + 1;
    const ty = Math.floor(b.y) - 1;
    w.set(tx, ty, M.COAL);
    const aim = { aimX: tx + 0.5, aimY: ty + 0.5 };
    expect(aimTile(g, { ...idleControl(), ...aim })).toEqual({ x: tx, y: ty });
    // the kibble banks at once when standing by it, so walk away first
    b.x += 4;
    b.y = w.surf[Math.floor(b.x)]!;
    w.set(Math.floor(b.x) + 1, Math.floor(b.y) - 1, M.COAL);
    run(g, { fire: true, aimX: Math.floor(b.x) + 1.5, aimY: Math.floor(b.y) - 0.5 }, 2);
    expect(g.day!.pack.coal.toNumber()).toBeGreaterThan(0);
    b.x = SHAFT_X + 1.5;
    b.y = w.surf[SHAFT_X + 1]!;
    run(g, {}, 0.1);
    expect(g.day!.pack.coal.toNumber()).toBe(0);
    expect(g.day!.byHand.toNumber()).toBeGreaterThan(0);
  });
});

describe('days, nights and the Cave-in', () => {
  it('quotas grow each day, with soft early days and audits', () => {
    const g = newGame(1);
    expect(quota(g.s, 1).toNumber()).toBe(34);
    expect(quota(g.s, 6).gt(quota(g.s, 5))).toBe(true);
    expect(quota(g.s, 7).toNumber()).toBeGreaterThan(quota(g.s, 6).toNumber() * 1.5);
  });

  it('a missed quota brings the roof down and pays Echoes', () => {
    const g = started();
    g.s.contract.coal = D(800);
    run(g, {}, DAY.baseS + 0.1);
    expect(g.s.phase).toBe('dusk');
    settleDusk(g);
    expect(g.s.phase).toBe('cavein');
    expect(g.s.meta.echoes.toNumber()).toBe(echoGain(D(800), 0, 0).toNumber());
    expect(g.s.meta.echoes.toNumber()).toBeGreaterThan(0);
  });

  it('a met quota goes to the night shop, and the next day is harder', () => {
    const g = started();
    g.s.contract.levels.hand = 40;
    startDay(g);
    run(g, {}, DAY.baseS + 0.1);
    settleDusk(g);
    expect(g.s.phase).toBe('night');
    expect(g.s.contract.scrip.toNumber()).toBeGreaterThan(0);
    g.s.contract.scrip = D(1000);
    // a copper pick needs copper as well as scrip (ADR-H009); the crew may have banked some
    g.s.contract.ores.copper = 0;
    expect(buy(g, 'pick')).toBe(false);
    g.s.contract.ores.copper = 8;
    expect(buy(g, 'pick')).toBe(true);
    expect(g.s.contract.ores.copper).toBe(0);
    expect(g.s.contract.levels.pick).toBe(1);
    nextDay(g);
    expect(g.s.contract.day).toBe(2);
    expect(g.s.phase).toBe('day');
  });

  it('the Survey Book spends Echoes and Old Hands staffs the next contract', () => {
    const g = newGame(3);
    g.s.meta.echoes = D(10);
    expect(buyBook(g, 'oldHands')).toBe(true);
    signContract(g, 5);
    expect(g.s.contract.levels.hand).toBe(3);
  });

  it('saves and loads without losing big numbers', () => {
    const g = started();
    g.s.contract.scrip = D('1e40');
    g.s.meta.echoes = D(12);
    const back = fromSave(JSON.parse(JSON.stringify(toSave(g.s))), 1);
    expect(back.contract.scrip.eq(D('1e40'))).toBe(true);
    expect(back.meta.echoes.toNumber()).toBe(12);
    expect(back.contract.levels.hand).toBe(0);
  });

  it('reads an old save without ore stock, streak or tinker', () => {
    const g = started();
    const raw = toSave(g.s) as { contract: Record<string, unknown> };
    delete raw.contract.ores;
    delete raw.contract.streak;
    delete raw.contract.tinker;
    const back = fromSave(JSON.parse(JSON.stringify(raw)), 1);
    expect(back.contract.ores.iron).toBe(0);
    expect(back.contract.streak).toBe(0);
    expect(back.contract.tinker.offers).toEqual([]);
  });
});

describe('ore, grades and the tinker', () => {
  it('banks ore at the kibble, sells gold, and stocks the rest', () => {
    const g = started();
    const d = g.day!;
    d.pack.ores.iron = 3;
    d.pack.ores.gold = 2;
    d.body.x = SHAFT_X + 1.5;
    d.body.y = g.world!.surf[SHAFT_X + 1]!;
    run(g, {}, 0.1);
    expect(g.s.contract.ores.iron).toBe(3);
    expect(g.s.contract.ores.gold).toBe(0);
    expect(d.oreScrip.toNumber()).toBe(GOLD_SCRIP * 2);
  });

  it('store items cost ore, and the pick ladder opens harder rock', () => {
    const g = started();
    expect(shopOres(g.s, 'boots')[0]?.id).toBe('iron');
    expect(shopOres(g.s, 'hand')).toEqual([]);
    expect(CO_PICKS.length).toBe(16);
    for (let i = 1; i < CO_PICKS.length; i++) {
      expect(CO_PICKS[i]!.power).toBeGreaterThan(CO_PICKS[i - 1]!.power);
      expect(CO_PICKS[i]!.gate).toBeGreaterThanOrEqual(CO_PICKS[i - 1]!.gate);
    }
    g.s.contract.levels.pick = 3;
    expect(pickTier(g.s)).toBe(CO_PICKS[3]!.gate);
  });

  it('heartstone still banked pays an Echo each at the Cave-in', () => {
    const g = started();
    run(g, {}, DAY.baseS + 0.1);
    g.s.contract.levels.hand = 0;
    const base = echoesIfTonight(g).toNumber();
    g.s.contract.ores.heart = 5;
    expect(echoesIfTonight(g).toNumber()).toBe(base + 5);
  });

  it('grades a shift and multiplies a streak', () => {
    expect(gradeOf(0.9)).toBe(null);
    expect(gradeOf(1)?.name).toBe('Quota met');
    expect(gradeOf(2.1)?.name).toBe('Bumper shift');
    expect(gradeOf(3)?.name).toBe('Record shift');
    expect(streakMult(1)).toBe(1);
    expect(streakMult(3)).toBeCloseTo(1.3);
    expect(streakMult(100)).toBe(3);
  });

  it('a gem pick covers every gem', () => {
    expect(pickGem(0)).toBe('topaz');
    expect(pickGem(0.9999)).toBe('diamond');
  });

  it("the tinker sells tonight's relics, rerolls, and Sing it down ends the contract", () => {
    const g = started();
    g.s.contract.levels.hand = 60;
    startDay(g);
    run(g, {}, DAY.baseS + 0.1);
    settleDusk(g);
    expect(g.s.phase).toBe('night');
    expect(g.s.tally!.grade).not.toBe(null);
    expect(g.s.contract.streak).toBe(1);
    expect(g.s.contract.tinker.offers.length).toBe(3);
    g.s.contract.scrip = D(1e6);
    const r = g.s.contract.tinker.offers[0]!;
    expect(buyRelic(g, r)).toBe(true);
    expect(g.s.contract.relics).toContain(r);
    expect(rerollTinker(g)).toBe(true);
    expect(g.s.contract.tinker.offers).not.toContain(r);
    expect(singDown(g)).toBe(true);
    expect(g.s.phase).toBe('cavein');
    expect(g.s.meta.echoes.toNumber()).toBeGreaterThan(0);
  });

  it('gangs tunnel to ore and stock it', () => {
    const g = started();
    g.s.contract.levels.hand = 5;
    startDay(g);
    const w = g.world!;
    const gang = g.day!.gangs[0]!;
    // an iron tile a few columns out on the gang's row
    const tx = gang.x + gang.side * 4;
    for (let x = gang.x; x !== tx; x += gang.side) {
      w.set(x, gang.y - 1, M.AIR);
      w.set(x, gang.y, M.AIR);
    }
    w.set(tx, gang.y, M.IRON);
    g.s.contract.levels.pick = 3;
    run(g, {}, 40);
    expect(g.s.contract.ores.iron).toBeGreaterThan(0);
  });
});

describe('crews and promotions (H2)', () => {
  it('a promotion needs a hand, and promoted hands stop hewing', () => {
    const g = started();
    run(g, {}, DAY.baseS + 0.1);
    g.s.contract.levels.hand = 50;
    g.day!.deposited = g.day!.quota;
    settleDusk(g);
    g.s.contract.day = 3;
    g.s.contract.levels.hand = 1;
    g.s.contract.scrip = D(1e6);
    Object.assign(g.s.contract.ores, { tin: 99, iron: 99, glowcap: 99, copper: 99 });
    const before = crewRate(g.s);
    expect(buy(g, 'putter')).toBe(true);
    expect(buy(g, 'putter')).toBe(false);
    expect(crewRate(g.s)).toBeLessThan(before);
  });

  it('putters haul the spill from a full pack', () => {
    const g = started();
    g.s.contract.levels.putter = 2;
    g.s.contract.levels.hand = 2;
    startDay(g);
    const d = g.day!;
    d.spill.coal = 5;
    d.spill.ores.iron = 2;
    run(g, {}, 10);
    expect(d.spill.coal).toBe(0);
    expect(d.byHaul.toNumber()).toBe(5);
    expect(g.s.contract.ores.iron).toBeGreaterThanOrEqual(2);
  });

  it('gangs scale with the payroll and the banners add up to it', () => {
    const g = started();
    g.s.contract.levels.hand = 123;
    g.s.contract.levels.shaft = 6;
    startDay(g);
    const gangs = g.day!.gangs;
    expect(gangs.length).toBeGreaterThan(8);
    expect(gangs.reduce((a, x) => a + x.count, 0)).toBe(123);
  });
});

describe('tools and finds (H3)', () => {
  const armed = (): Game => {
    const g = started();
    Object.assign(g.s.contract.levels, { scatter: 1, mortar: 1, drill: 1, lance: 1 });
    startDay(g);
    run(g, {}, 0.3);
    return g;
  };

  it('swaps tools by number and only to tools on the belt', () => {
    const g = started();
    run(g, { toolSel: 1 }, 0.05);
    expect(g.day!.tool).toBe('pick');
    const h = armed();
    run(h, { toolSel: 2 }, 0.05);
    expect(h.day!.tool).toBe('mortar');
    run(h, { toolCycle: 1 }, STEP_S);
    expect(h.day!.tool).toBe('drill');
  });

  it('the scatter pick breaks rock in a cone and rocket-jumps when fired down in the air', () => {
    const g = armed();
    const w = g.world!;
    const b = g.day!.body;
    g.day!.tool = 'scatter';
    const fx = Math.floor(b.x) + 1;
    const fy = Math.floor(b.y) - 1;
    for (let y = fy - 1; y <= fy + 1; y++) w.set(fx, y, M.DIRT);
    run(g, { fire: true, aimX: fx + 0.5, aimY: fy + 0.5 }, 3);
    expect(g.day!.toolTiles.scatter ?? 0).toBeGreaterThan(1);
    // in the air, fired down: thrown upward
    b.y -= 3;
    b.onGround = false;
    b.vy = 2;
    g.day!.toolCd = 0;
    run(g, { fire: true, aimX: b.x, aimY: b.y + 3 }, STEP_S);
    expect(b.vy).toBeLessThan(0);
  });

  it('a mortar shell bursts on rock and drains the water around it', () => {
    const g = armed();
    const w = g.world!;
    const b = g.day!.body;
    g.day!.tool = 'mortar';
    const tx = Math.floor(b.x) + 5;
    const ty = Math.floor(b.y) - 1;
    for (let x = Math.floor(b.x) + 1; x < tx; x++) w.set(x, ty, M.AIR);
    w.set(tx, ty, M.STONE);
    run(g, { fire: true, aimX: tx + 0.5, aimY: ty + 0.5 }, STEP_S);
    expect(g.day!.shells.length).toBe(1);
    run(g, {}, 1.5);
    expect(g.day!.shells.length).toBe(0);
    expect(g.day!.toolTiles.mortar ?? 0).toBeGreaterThan(0);
  });

  it('a drill rig digs straight down on its own', () => {
    const g = armed();
    g.day!.tool = 'drill';
    run(g, { fire: true, aimX: g.day!.body.x, aimY: g.day!.body.y + 0.5 }, STEP_S);
    expect(g.day!.rigs.length).toBe(1);
    run(g, {}, 20);
    expect(g.day!.rigs[0]!.depth).toBeGreaterThan(2);
  });

  it('platforms hold the Foreman up and S drops through', () => {
    const g = started();
    run(g, {}, 0.3);
    const b = g.day!.body;
    b.y -= 2;
    b.onGround = false;
    run(g, { platformPressed: true }, STEP_S);
    expect(Object.keys(g.day!.plat).length).toBe(1);
    const row = Number(Object.keys(g.day!.plat)[0]) / g.world!.w;
    b.y -= 1;
    run(g, {}, 0.6);
    expect(b.onGround).toBe(true);
    expect(b.y).toBe(Math.floor(row));
    run(g, { down: true }, 0.4);
    expect(b.y).toBeGreaterThan(Math.floor(row));
  });

  it('a long Vein Rush breaks the rest of the vein', () => {
    const g = started();
    run(g, {}, 0.3);
    const w = g.world!;
    const b = g.day!.body;
    // a corridor well away from the kibble: air above, a coal seam at the feet's row, stone below
    const fy = 40;
    const x0 = 8;
    for (let x = x0 - 2; x < x0 + 16; x++) {
      w.set(x, fy - 2, M.AIR);
      w.set(x, fy - 3, M.STONE);
      w.set(x, fy - 1, x < x0 ? M.AIR : M.COAL);
      w.set(x, fy, M.STONE);
    }
    g.s.contract.levels.pack = 10;
    g.s.contract.levels.pick = 5;
    b.y = fy;
    let broke = false;
    for (let k = 0; k < 30; k++) {
      let x = x0;
      while (x < x0 + 14 && w.get(x, fy - 1) !== M.COAL) x++;
      if (x >= x0 + 14) break;
      b.x = x - 0.6;
      b.vx = 0;
      run(g, { fire: true, aimX: x + 0.5, aimY: fy - 0.5 }, 0.5);
      if (g.events.some((e) => e.t === 'veinBreak')) broke = true;
      g.events.length = 0;
    }
    expect(broke).toBe(true);
    expect(w.get(x0 + 13, fy - 1)).toBe(M.AIR);
  });

  it('every biome band has a chest', () => {
    const w = makeMine(daySeed(3, 1), 8);
    const bands = new Set<number>();
    for (const [k, v] of Object.entries(w.objects))
      if (v === 'chest') bands.add(biomeAt(w.depth(Math.floor(Number(k) / w.w))).id);
    for (const id of [1, 2, 3, 4, 5, 6]) expect(bands.has(id)).toBe(true);
  });
});

describe('the contract: Foremen and the Union (H4)', () => {
  it('a locked Foreman cannot be signed; an open one changes the rules', () => {
    const g = newGame(9);
    signContract(g, 1, { foreman: 'fieldhand' });
    expect(g.s.contract.foreman).toBe('apprentice');
    const cap = packCap(g.s);
    g.s.meta.bestDay = 8;
    g.s.meta.contracts = 1;
    signContract(g, 2, { foreman: 'fieldhand' });
    expect(g.s.contract.foreman).toBe('fieldhand');
    expect(packCap(g.s)).toBe(cap * 2);
    signContract(g, 3, { foreman: 'smith' });
    expect(charges(g.s)).toBe(4);
    expect(shopOres(g.s, 'pick')[0]!.n).toBe(6);
  });

  it('the Lone Foreman cannot hire, and digs by hand far faster', () => {
    const g = newGame(9);
    g.s.meta.badges.push('fm:apprentice');
    signContract(g, 1, { foreman: 'lone' });
    g.s.contract.levels.whetstone = 2;
    const lone = handMult(g.s);
    g.s.contract.foreman = 'apprentice';
    expect(lone).toBeGreaterThan(handMult(g.s) * 2);
    g.s.contract.foreman = 'lone';
    g.s.phase = 'night';
    g.s.contract.scrip = D(1e6);
    expect(canBuy(g, 'hand')).toBe(false);
  });

  it('Seniority starts part-way up with a crew; Picket Line pays for days past the best', () => {
    const g = newGame(9);
    g.s.meta.bestDay = 20;
    g.s.meta.book.seniority = 1;
    g.s.meta.book.picket = 2;
    signContract(g, 1);
    expect(g.s.contract.day).toBe(8);
    expect(g.s.contract.levels.hand).toBe(21);
    g.s.contract.survived = 15;
    g.s.contract.coal = D(100);
    const base = echoGain(D(100), 15, 0).toNumber();
    // days 8 to 22 survived: 2 past the best of 20, at 2 Echoes each
    expect(echoesIfTonight(g).toNumber()).toBe(base + 4);
  });

  it('surviving day 15 earns the Foreman badge, and day 10 opens the next Seam', () => {
    const g = started();
    g.s.contract.day = 15;
    g.s.contract.levels.hand = 400;
    startDay(g);
    run(g, {}, DAY.baseS + 0.1);
    settleDusk(g);
    expect(g.s.meta.badges).toContain('fm:apprentice');
    expect(g.s.meta.badges).toContain('seam:openCut');
    expect(seamOpen(g, 'drowned')).toBe(true);
    expect(seamOpen(g, 'heart')).toBe(false);
  });
});
