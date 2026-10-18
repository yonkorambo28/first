// Roblox's public web APIs. No key needed; they rate-limit by IP, so batch universe ids.
// Docs: https://create.roblox.com/docs/cloud/reference/domains/games
import { getJson, UpstreamError, type Fetch } from "./http.ts";

/** Roblox URLs show the place id; every other endpoint wants the universe id. */
export async function robloxUniverseId(placeId: number, fetchImpl?: Fetch) {
  const r = await getJson<{ universeId: number | null }>(
    `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
    { fetchImpl },
  );
  if (!r.universeId) throw new UpstreamError(`No Roblox experience for place ${placeId}`, 404);
  return r.universeId;
}

interface GameDetail {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string | null;
  creator: { name: string };
  playing: number;
  visits: number;
  favoritedCount: number;
  genre: string;
  created: string;
}

export async function robloxGames(universeIds: number[], fetchImpl?: Fetch) {
  const r = await getJson<{ data: GameDetail[] }>(
    `https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`,
    { fetchImpl },
  );
  return r.data;
}

export async function robloxVotes(universeIds: number[], fetchImpl?: Fetch) {
  const r = await getJson<{ data: { id: number; upVotes: number; downVotes: number }[] }>(
    `https://games.roblox.com/v1/games/votes?universeIds=${universeIds.join(",")}`,
    { fetchImpl },
  );
  return r.data;
}

export async function robloxIcon(universeId: number, fetchImpl?: Fetch) {
  const r = await getJson<{ data: { imageUrl: string | null }[] }>(
    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`,
    { fetchImpl },
  );
  return r.data[0]?.imageUrl ?? undefined;
}

/** Visits, favorites, live players and votes for one experience. */
export async function robloxStats(universeId: number, fetchImpl?: Fetch) {
  const [[game], [votes]] = await Promise.all([robloxGames([universeId], fetchImpl), robloxVotes([universeId], fetchImpl)]);
  if (!game) throw new UpstreamError(`Roblox universe ${universeId} not found`, 404);
  return {
    visits: game.visits,
    favorites: game.favoritedCount,
    playing: game.playing,
    upVotes: votes?.upVotes ?? 0,
    downVotes: votes?.downVotes ?? 0,
  };
}
