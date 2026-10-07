import { describe, expect, it } from 'vitest';
import { SHAFT_X } from '../src/data/constants';
import { M } from '../src/data/materials';
import { D } from '../src/sim/decimal';
import { CO_PICKS, DAY, GOLD_SCRIP, STEP_S } from '../src/co/data/co';
import { boxHits, idleControl, type Control } from '../src/co/sim/body';
import {
  buy,
  buyBook,
  buyRelic,
  echoGain,
  echoesIfTonight,
  gradeOf,
  nextDay,
  rerollTinker,
  settleDusk,
  signContract,
  singDown,
  streakMult,
} from '../src/co/sim/contract';
import { aimTile, pickGem, startDay, stepDay } from '../src/co/sim/day';
import { daySeed, makeMine } from '../src/co/sim/mine';
import { fromSave, newGame, toSave, type Game } from '../src/co/sim/state';
import { crewRate, pickTier, quota, shopOres } from '../src/co/sim/stats';

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
