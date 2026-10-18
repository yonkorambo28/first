import { describe, expect, it } from "vitest";
import { Engine, freshState, STARTING_COINS } from "./engine.ts";
import { cost, prices, proceedsForSell, sharesForSpend } from "./lmsr.ts";
import { levelInfo, questsFor } from "./progression.ts";
import type { GameEvent } from "../shared/types.ts";

/** Coins handed out by quests, level-ups etc. alongside the core trade. */
const bonusCoins = (events: GameEvent[]) =>
  events.reduce((s, x) => s + (x.kind === "coins" ? x.amount : 0), 0);

describe("lmsr", () => {
  const q = [0, 0, 0, 0];
  const b = 100;

  it("starts flat and prices sum to 1", () => {
    const p = prices(q, b);
    p.forEach((x) => expect(x).toBeCloseTo(0.25));
    expect(prices([50, -20, 300, 10], b).reduce((a, x) => a + x, 0)).toBeCloseTo(1);
  });

  it("sharesForSpend is the exact inverse of the cost function", () => {
    const x = sharesForSpend(q, b, 2, 73);
    const after = q.slice();
    after[2] += x;
    expect(cost(after, b) - cost(q, b)).toBeCloseTo(73, 8);
  });

  it("buying then selling the same shares round-trips", () => {
    const x = sharesForSpend(q, b, 1, 40);
    const after = q.slice();
    after[1] += x;
    expect(proceedsForSell(after, b, 1, x)).toBeCloseTo(40, 8);
  });
});

describe("engine", () => {
  const setup = () => {
    const e = new Engine(freshState());
    const u = e.signUp("tester");
    const mk = e.state.markets.find((m) => m.gameId === "hollow-pines" && m.metric === "wishlists_d1")!;
    return { e, u, mk };
  };

  it("a buy moves the price, spends coins and emits game events", () => {
    const { e, u, mk } = setup();
    const before = prices(mk.q, mk.b)[2];
    const { events, position } = e.buy(u, mk.id, 2, 100);
    expect(u.coins).toBe(STARTING_COINS - 100 + bonusCoins(events));
    expect(prices(mk.q, mk.b)[2]).toBeGreaterThan(before);
    expect(position.shares).toBeGreaterThan(100);
    expect(events.some((x) => x.kind === "badge" && x.badge.id === "first_call")).toBe(true);
  });

  it("rejects bad trades", () => {
    const { e, u, mk } = setup();
    expect(() => e.buy(u, mk.id, 2, 2)).toThrow(/Minimum/);
    expect(() => e.buy(u, mk.id, 2, 5000)).toThrow(/Not enough/);
    expect(() => e.buy(u, mk.id, 9, 50)).toThrow(/Unknown outcome/);
  });

  it("resolution pays winners 1 coin per share and updates streaks", () => {
    const { e, u, mk } = setup();
    const loser = e.signUp("other");
    const { position } = e.buy(u, mk.id, 2, 100); // 50K – 150K
    e.buy(loser, mk.id, 0, 100);
    const coinsBefore = u.coins;
    const { results } = e.resolve(mk.id, 80_000);
    const mine = results.find((r) => r.userId === u.id)!;
    // The payout itself is one of the coin events, plus any level-up bonus.
    expect(mine.payout).toBe(Math.floor(position.shares));
    expect(u.coins).toBe(coinsBefore + bonusCoins(mine.events));
    expect(u.wins).toBe(1);
    expect(u.streak).toBe(1);
    expect(loser.losses).toBe(1);
    expect(u.positions).toHaveLength(0);
    expect(() => e.buy(u, mk.id, 1, 10)).toThrow(/closed/);
  });

  it("closes markets once their close time passes", () => {
    const { e, u } = setup();
    const done = e.state.markets.find((m) => m.gameId === "starlit-kitchen" && m.metric === "wishlists_d1")!;
    expect(() => e.buy(u, done.id, 1, 10)).toThrow(/closed/);
  });

  it("selling returns coins and shrinks the position", () => {
    const { e, u, mk } = setup();
    const { position } = e.buy(u, mk.id, 1, 200);
    e.sell(u, mk.id, 1, position.shares);
    expect(u.positions).toHaveLength(0);
    expect(u.coins).toBeGreaterThanOrEqual(STARTING_COINS - 200 + 199);
  });

  it("daily crate has a cooldown", () => {
    const { e, u } = setup();
    e.openCrate(u, Date.now(), () => 0);
    expect(u.coins).toBe(STARTING_COINS + 100);
    expect(() => e.openCrate(u)).toThrow(/recharging/);
  });
});

describe("progression", () => {
  it("levels need quadratically more xp", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(399).level).toBe(2);
    expect(levelInfo(400).level).toBe(3);
  });

  it("daily quests are deterministic and distinct", () => {
    const a = questsFor("2026-10-17");
    expect(a.map((x) => x.id)).toEqual(questsFor("2026-10-17").map((x) => x.id));
    expect(new Set(a.map((x) => x.id)).size).toBe(3);
  });
});
