import { describe, expect, it } from 'vitest';
import { SHAFT_X } from '../src/data/constants';
import { M } from '../src/data/materials';
import { D } from '../src/sim/decimal';
import { DAY, STEP_S } from '../src/co/data/co';
import { boxHits, idleControl, type Control } from '../src/co/sim/body';
import { buy, buyBook, echoGain, nextDay, settleDusk, signContract } from '../src/co/sim/contract';
import { aimTile, startDay, stepDay } from '../src/co/sim/day';
import { daySeed, makeMine } from '../src/co/sim/mine';
import { fromSave, newGame, toSave, type Game } from '../src/co/sim/state';
import { quota } from '../src/co/sim/stats';

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
    expect(quota(g.s, 1).toNumber()).toBe(18);
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
    expect(buy(g, 'pick')).toBe(true);
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
});
