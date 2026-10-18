// In-browser stand-in for the HTTP API: runs the same Engine and keeps state in localStorage.
// Used by the standalone build (VITE_STANDALONE=1) so the game works as a single static page.
import { Engine, freshState, GameError, type State } from "../../server/engine.ts";
import type { Api, ResolvedEvent, Subscribe } from "./api.ts";
import type { MarketView, Trade } from "../../shared/types.ts";

const STATE_KEY = "gandi.state";
const ADMIN_KEY = "dev-admin";

let engine: Engine | null = null;
type Handlers = Parameters<Subscribe>[0];
const listeners = new Set<Handlers>();

function load(): State | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as State) : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(engine!.state));
  } catch {
    /* storage blocked — the session still works, it just won't survive a reload */
  }
}

function emitMarket(m: MarketView) {
  listeners.forEach((h) => h.market?.(m));
}
function emitTrade(t: Trade) {
  emitMarket(engine!.marketView(engine!.market(t.marketId)));
  listeners.forEach((h) => h.trade?.(t));
}

function get(): Engine {
  if (engine) return engine;
  engine = new Engine(load() ?? freshState());
  engine.ensureBots();
  // Warm the lobby up on first visit so it doesn't open on a dead market.
  if (!engine.state.trades.length) for (let i = 0; i < 25; i++) engine.botTick();
  save();
  setInterval(() => {
    const t = engine!.botTick();
    if (!t) return;
    save();
    emitTrade(t);
  }, 6000);
  return engine;
}

const token = () => {
  try {
    return localStorage.getItem("gandi.token") ?? undefined;
  } catch {
    return undefined;
  }
};

/** Run an engine call like a request: async, errors as rejections, state saved after writes. */
function run<T>(fn: (e: Engine) => T, write = false): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const out = fn(get());
      if (write) save();
      // Round-trip through JSON so callers never hold live engine objects.
      resolve(JSON.parse(JSON.stringify(out)));
    } catch (err) {
      reject(err instanceof GameError ? Object.assign(new Error(err.message), { status: err.status }) : err);
    }
  });
}

const needsServer = () =>
  Promise.reject(new Error("Live game data needs the server version (npm run dev); browsers can't call these APIs directly."));

export const localApi: Api = {
  signUp: (name, avatar) =>
    run((e) => {
      const u = e.signUp(name, avatar);
      return { token: u.id, me: e.me(u) };
    }, true),
  me: () => run((e) => e.me(e.user(token()))),
  games: () => run((e) => e.games()),
  game: (id) =>
    run((e) => {
      const g = e.game(id);
      return { game: e.gameView(g), feed: e.feed(g.id, 30) };
    }),
  feed: () => run((e) => e.feed(undefined, 30)),
  leaderboard: () => run((e) => e.leaderboard()),
  quote: (marketId, outcome, spend) => run((e) => e.quote(marketId, outcome, spend)),
  buy: (marketId, outcome, spend) =>
    run((e) => {
      const u = e.user(token());
      const out = e.buy(u, marketId, outcome, spend);
      setTimeout(() => emitTrade(out.trade));
      return { ...out, me: e.me(u) };
    }, true),
  sell: (marketId, outcome, shares) =>
    run((e) => {
      const u = e.user(token());
      const out = e.sell(u, marketId, outcome, shares);
      setTimeout(() => emitTrade(out.trade));
      return { ...out, me: e.me(u) };
    }, true),
  crate: () =>
    run((e) => {
      const u = e.user(token());
      return { ...e.openCrate(u), me: e.me(u) };
    }, true),
  resolve: (key, marketId, value, source) =>
    run((e) => {
      if (key !== ADMIN_KEY) throw new GameError("Bad admin key", 403);
      const out = e.resolve(marketId, value, source);
      const copy: ResolvedEvent = JSON.parse(JSON.stringify(out));
      setTimeout(() => {
        emitMarket(copy.market);
        listeners.forEach((h) => h.resolved?.(copy));
      });
      return out;
    }, true),
  addGame: needsServer,
  readGame: needsServer,
};

export const localSubscribe: Subscribe = (handlers) => {
  listeners.add(handlers);
  return () => listeners.delete(handlers);
};
