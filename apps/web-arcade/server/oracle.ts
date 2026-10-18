// Reads real games' public numbers on a schedule and settles markets once their measure time passes.
// Markets whose number isn't public (Roblox revenue) are left for launch control.
import type { Game, Market, Metric, Snapshot } from "../shared/types.ts";
import type { Engine } from "./engine.ts";
import { gamalyticGame } from "./sources/gamalytic.ts";
import type { Fetch } from "./sources/http.ts";
import { robloxStats } from "./sources/roblox.ts";
import { steamReviews } from "./sources/steam.ts";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Track a game from a week before launch until its month-one numbers are in. */
const WATCH_BEFORE = 7 * DAY;
const WATCH_AFTER = 32 * DAY;
/** A reading counts for a measure time if it was taken within this long after it. */
const MEASURE_WINDOW = 2 * DAY;

export interface OracleOptions {
  gamalyticKey?: string;
  fetchImpl?: Fetch;
  /** How often to read each tracked game. */
  everyMs?: number;
}

export function isTracked(g: Game) {
  return Boolean(g.steamAppId || g.robloxUniverseId);
}

/** Take one reading of every public number we know how to get for a game. */
export async function collect(game: Game, opts: OracleOptions = {}, now = Date.now()): Promise<Snapshot> {
  const snap: Snapshot = { gameId: game.id, at: new Date(now).toISOString() };
  const errors: string[] = [];
  const attempt = async (fn: () => Promise<void>) => fn().catch((e: Error) => void errors.push(e.message));
  if (game.steamAppId) {
    const id = game.steamAppId;
    await Promise.all([
      attempt(async () => void (snap.steam = await steamReviews(id, opts.fetchImpl))),
      attempt(async () => void (snap.gamalytic = await gamalyticGame(id, { apiKey: opts.gamalyticKey, fetchImpl: opts.fetchImpl }))),
    ]);
  }
  if (game.robloxUniverseId) {
    const id = game.robloxUniverseId;
    await attempt(async () => void (snap.roblox = await robloxStats(id, opts.fetchImpl)));
  }
  if (errors.length) snap.errors = errors;
  return snap;
}

const OFFSET_DAYS: Record<Metric, number> = {
  wishlists_d1: 0,
  favorites_d1: 1,
  visits_w1: 7,
  reviews_w1: 7,
  rating_w1: 7,
  revenue_w1: 7,
  revenue_m1: 30,
};

export function measureAt(mk: Market, game: Game) {
  return mk.measureAt ? Date.parse(mk.measureAt) : Date.parse(game.launchAt) + OFFSET_DAYS[mk.metric] * DAY;
}

/** First reading taken at or after `t` (within the window) that has the field we need. */
function readingAfter(snaps: Snapshot[], t: number, has: (s: Snapshot) => boolean) {
  return snaps.find((s) => {
    const at = Date.parse(s.at);
    return at >= t && at <= t + MEASURE_WINDOW && has(s);
  });
}

/** Last reading taken at or before `t` that has the field we need. */
function readingBefore(snaps: Snapshot[], t: number, has: (s: Snapshot) => boolean) {
  return snaps.filter((s) => Date.parse(s.at) <= t && has(s)).at(-1);
}

/**
 * The settlement number for a market from saved readings, or null if we can't know it yet
 * (or ever — then it needs launch control).
 */
export function settlementValue(mk: Market, game: Game, all: Snapshot[]): { value: number; source: string } | null {
  const snaps = all.filter((s) => s.gameId === game.id).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const t = measureAt(mk, game);
  const launch = Date.parse(game.launchAt);
  const when = (s: Snapshot) => new Date(s.at).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  switch (mk.metric) {
    case "wishlists_d1": {
      // Gamalytic stops showing wishlists once a game is out, so use the last pre-launch estimate.
      const s = readingBefore(snaps, launch, (x) => x.gamalytic?.wishlists != null);
      return s ? { value: s.gamalytic!.wishlists!, source: `Gamalytic wishlist estimate at ${when(s)}` } : null;
    }
    case "favorites_d1": {
      const s = readingAfter(snaps, t, (x) => !!x.roblox);
      return s ? { value: s.roblox!.favorites, source: `Roblox games API favoritedCount at ${when(s)}` } : null;
    }
    case "visits_w1": {
      const end = readingAfter(snaps, t, (x) => !!x.roblox);
      const start = readingBefore(snaps, launch, (x) => !!x.roblox) ?? readingAfter(snaps, launch, (x) => !!x.roblox);
      if (!end || !start || start === end) return null;
      return {
        value: Math.max(0, end.roblox!.visits - start.roblox!.visits),
        source: `Roblox visits ${when(end)} minus ${when(start)}`,
      };
    }
    case "reviews_w1": {
      const s = readingAfter(snaps, t, (x) => !!x.steam);
      return s ? { value: s.steam!.totalReviews, source: `Steam appreviews total_reviews at ${when(s)}` } : null;
    }
    case "rating_w1": {
      if (game.platform === "steam") {
        const s = readingAfter(snaps, t, (x) => !!x.steam && x.steam.totalReviews > 0);
        if (!s) return null;
        const pct = (100 * s.steam!.totalPositive) / s.steam!.totalReviews;
        return { value: Math.round(pct * 10) / 10, source: `Steam % positive at ${when(s)}` };
      }
      const s = readingAfter(snaps, t, (x) => !!x.roblox && x.roblox.upVotes + x.roblox.downVotes > 0);
      if (!s) return null;
      const pct = (100 * s.roblox!.upVotes) / (s.roblox!.upVotes + s.roblox!.downVotes);
      return { value: Math.round(pct * 10) / 10, source: `Roblox like ratio at ${when(s)}` };
    }
    case "revenue_w1":
    case "revenue_m1": {
      if (game.platform !== "steam") return null; // Roblox earnings aren't public.
      const s = readingAfter(snaps, t, (x) => x.gamalytic?.revenue != null);
      return s ? { value: s.gamalytic!.revenue!, source: `Gamalytic gross revenue estimate at ${when(s)}` } : null;
    }
  }
}

/**
 * One pass: read every tracked game that's due, then settle any market whose number is in.
 * Returns what it settled so the server can broadcast it.
 */
export async function oracleTick(engine: Engine, opts: OracleOptions = {}, now = Date.now()) {
  const every = opts.everyMs ?? 6 * HOUR;
  const snaps = (engine.state.snapshots ??= []);

  for (const game of engine.state.games.filter(isTracked)) {
    const launch = Date.parse(game.launchAt);
    if (now < launch - WATCH_BEFORE || now > launch + WATCH_AFTER) continue;
    const last = snaps.filter((s) => s.gameId === game.id).at(-1);
    // Read on the regular cadence, and also right after each measure time so settlement isn't late.
    const pending = engine.state.markets.filter((m) => m.gameId === game.id && m.status !== "resolved");
    const justDue = pending.some((m) => {
      const t = measureAt(m, game);
      return now >= t && (!last || Date.parse(last.at) < t);
    });
    if (last && now - Date.parse(last.at) < every && !justDue) continue;
    snaps.push(await collect(game, opts, now));
  }

  const settled = [];
  for (const mk of engine.state.markets) {
    if (mk.status === "resolved") continue;
    const game = engine.state.games.find((g) => g.id === mk.gameId);
    if (!game || !isTracked(game) || now < measureAt(mk, game)) continue;
    const v = settlementValue(mk, game, snaps);
    if (v) settled.push(engine.resolve(mk.id, v.value, v.source));
  }
  return settled;
}
