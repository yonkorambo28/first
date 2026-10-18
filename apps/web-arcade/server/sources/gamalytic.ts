// Gamalytic estimates for Steam games: https://api.gamalytic.com/reference/
// Free without a key (250 requests/day, some fields missing). Paid plans add wishlist
// estimates and history; set GAMALYTIC_API_KEY. Field names below are what the API returns
// for /game/{appid}; anything absent comes back as null rather than guessed.
import { getJson, type Fetch } from "./http.ts";

interface GamalyticGame {
  name?: string;
  unreleased?: boolean;
  revenue?: number;
  copiesSold?: number;
  wishlists?: number;
  followers?: number;
  reviews?: number;
  reviewScore?: number;
  releaseDate?: number | string;
  history?: { timeStamp: number; revenue?: number; sales?: number; wishlists?: number; followers?: number }[];
}

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export async function gamalyticGame(appId: number, opts: { apiKey?: string; fetchImpl?: Fetch } = {}) {
  const fields = "name,unreleased,revenue,copiesSold,wishlists,followers,reviews,reviewScore,releaseDate,history";
  const g = await getJson<GamalyticGame>(`https://api.gamalytic.com/game/${appId}?fields=${fields}`, {
    fetchImpl: opts.fetchImpl,
    // The key header name is shown next to your key on your Gamalytic profile page.
    headers: opts.apiKey ? { [process.env.GAMALYTIC_KEY_HEADER ?? "api-key"]: opts.apiKey } : {},
  });
  const last = g.history?.at(-1);
  return {
    revenue: num(g.revenue) ?? num(last?.revenue),
    copiesSold: num(g.copiesSold) ?? num(last?.sales),
    wishlists: num(g.wishlists) ?? num(last?.wishlists),
    followers: num(g.followers) ?? num(last?.followers),
    unreleased: typeof g.unreleased === "boolean" ? g.unreleased : null,
  };
}
