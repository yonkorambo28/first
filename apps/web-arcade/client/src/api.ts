import type { GameEvent, GameView, MarketView, PublicUser, Snapshot, Trade, User, LevelInfo } from "../../shared/types.ts";

export type Me = User & { level: LevelInfo; netWorth: number; crateReadyAt: string | null };

const TOKEN_KEY = "gandi.token";

export const token = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private mode — session only */
    }
  },
};

async function call<T>(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const t = token.get();
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? res.statusText), { status: res.status });
  return data as T;
}

export interface Quote {
  shares: number;
  priceBefore: number;
  priceAfter: number;
  payout: number;
  multiplier: number;
}

type WithMe<T> = T & { me: Me; events: GameEvent[] };

const httpApi = {
  signUp: (name: string, avatar: string) => call<{ token: string; me: Me }>("/auth", { name, avatar }),
  me: () => call<Me>("/me"),
  games: () => call<GameView[]>("/games"),
  game: (id: string) => call<{ game: GameView; feed: Trade[] }>(`/games/${id}`),
  feed: () => call<Trade[]>("/feed"),
  leaderboard: () => call<PublicUser[]>("/leaderboard"),
  quote: (marketId: string, outcome: number, spend: number) =>
    call<Quote>(`/markets/${encodeURIComponent(marketId)}/quote`, { outcome, spend }),
  buy: (marketId: string, outcome: number, spend: number) =>
    call<WithMe<{ trade: Trade }>>(`/markets/${encodeURIComponent(marketId)}/buy`, { outcome, spend }),
  sell: (marketId: string, outcome: number, shares: number) =>
    call<WithMe<{ trade: Trade }>>(`/markets/${encodeURIComponent(marketId)}/sell`, { outcome, shares }),
  crate: () => call<WithMe<{ amount: number }>>("/crate", {}),
  resolve: (key: string, marketId: string, value: number, source?: string) =>
    call<{ market: MarketView }>("/admin/resolve", { marketId, value, source }, { "x-admin-key": key }),
  addGame: (key: string, body: { platform: "steam" | "roblox"; steamAppId?: number; robloxPlaceId?: number; launchAt?: string }) =>
    call<GameView>("/admin/games", body, { "x-admin-key": key }),
  readGame: (key: string, gameId: string) =>
    call<Snapshot>(`/admin/games/${encodeURIComponent(gameId)}/read`, {}, { "x-admin-key": key }),
};

export interface ResolvedEvent {
  market: MarketView;
  results: { userId: string; events: GameEvent[]; payout: number; profit: number }[];
}

/** Subscribe to live market/trade updates. Returns an unsubscribe function. */
function httpSubscribe(handlers: {
  market?: (m: MarketView) => void;
  trade?: (t: Trade) => void;
  resolved?: (r: ResolvedEvent) => void;
  /** The game list changed (a game was added). */
  games?: () => void;
}) {
  const es = new EventSource("/api/stream");
  for (const [type, fn] of Object.entries(handlers)) {
    es.addEventListener(type, (e) => fn(JSON.parse((e as MessageEvent).data)));
  }
  return () => es.close();
}

export type Api = typeof httpApi;
export type Subscribe = typeof httpSubscribe;

// The standalone build runs the whole market in the browser instead of talking to the server.
import { localApi, localSubscribe } from "./localApi.ts";

const standalone = import.meta.env.VITE_STANDALONE === "1";
export const api: Api = standalone ? localApi : httpApi;
export const subscribe: Subscribe = standalone ? localSubscribe : httpSubscribe;
