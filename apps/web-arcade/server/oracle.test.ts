import { describe, expect, it } from "vitest";
import type { Game } from "../shared/types.ts";
import { Engine, freshState } from "./engine.ts";
import { oracleTick } from "./oracle.ts";
import type { Fetch } from "./sources/http.ts";

const DAY = 86_400_000;
const LAUNCH = Date.parse("2026-11-01T17:00:00Z");

/** Fake upstream APIs whose numbers depend on a mutable clock. */
function fakeApis(clock: { now: number }): Fetch {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const days = (clock.now - LAUNCH) / DAY;
    const out = days >= 0;
    if (url.includes("store.steampowered.com/appreviews"))
      return json({ success: 1, query_summary: { total_reviews: out ? 1200 : 0, total_positive: out ? 1000 : 0, total_negative: 200 } });
    if (url.includes("api.gamalytic.com/game"))
      return json(out ? { unreleased: false, revenue: 600_000, copiesSold: 30_000 } : { unreleased: true, wishlists: 80_000, followers: 6_000 });
    if (url.includes("games.roblox.com/v1/games/votes"))
      return json({ data: [{ id: 42, upVotes: 900, downVotes: 100 }] });
    if (url.includes("games.roblox.com/v1/games"))
      return json({ data: [{ id: 42, visits: out ? 1_000 + Math.floor(days) * 500_000 : 1_000, favoritedCount: out ? 30_000 : 2_000, playing: 10 }] });
    return new Response("not found", { status: 404 });
  }) as Fetch;
}

const steamGame: Game = {
  id: "real-steam",
  title: "Real Steam Game",
  platform: "steam",
  studio: "S",
  genre: "G",
  tagline: "",
  launchAt: new Date(LAUNCH).toISOString(),
  palette: ["#000", "#fff"],
  emoji: "🎮",
  steamAppId: 123,
};
const robloxGame: Game = { ...steamGame, id: "real-roblox", platform: "roblox", steamAppId: undefined, robloxUniverseId: 42 };

describe("oracle", () => {
  it("reads games over time and settles markets from the right readings", async () => {
    const e = new Engine(freshState(LAUNCH - 10 * DAY));
    e.addGame(steamGame);
    e.addGame(robloxGame);
    const clock = { now: LAUNCH - 2 * DAY };
    const opts = { fetchImpl: fakeApis(clock), everyMs: DAY };
    const status = (id: string) => e.state.markets.find((m) => m.id === id)!;

    // Daily readings from two days before launch to a week after.
    const settled = [];
    for (; clock.now <= LAUNCH + 7 * DAY + 3_600_000; clock.now += DAY / 2) settled.push(...(await oracleTick(e, opts, clock.now)));

    expect(status("real-steam:wishlists_d1").resolution?.value).toBe(80_000);
    expect(status("real-steam:reviews_w1").resolution?.value).toBe(1200);
    expect(status("real-steam:rating_w1").resolution?.value).toBeCloseTo(83.3);
    expect(status("real-steam:revenue_w1").resolution?.value).toBe(600_000);
    expect(status("real-steam:revenue_m1").status).not.toBe("resolved");

    expect(status("real-roblox:favorites_d1").resolution?.value).toBe(30_000);
    expect(status("real-roblox:visits_w1").resolution?.value).toBe(3_500_000);
    expect(status("real-roblox:rating_w1").resolution?.value).toBe(90);
    // Roblox earnings aren't public, so these wait for launch control.
    expect(status("real-roblox:revenue_w1").status).not.toBe("resolved");

    // Demo games without external ids are never touched.
    expect(e.state.snapshots!.every((s) => s.gameId.startsWith("real-"))).toBe(true);
    expect(settled.length).toBe(7);
  });

  it("records upstream errors without throwing", async () => {
    const e = new Engine(freshState(LAUNCH));
    e.addGame(steamGame);
    const failing = (async () => new Response("nope", { status: 503 })) as unknown as Fetch;
    await oracleTick(e, { fetchImpl: failing }, LAUNCH - DAY);
    expect(e.state.snapshots![0].errors?.length).toBe(2);
  });
});
