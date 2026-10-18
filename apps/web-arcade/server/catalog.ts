// List a real upcoming game from its Steam app id or Roblox place id.
import type { Game } from "../shared/types.ts";
import type { Fetch } from "./sources/http.ts";
import { robloxGames, robloxIcon, robloxUniverseId } from "./sources/roblox.ts";
import { steamAppDetails } from "./sources/steam.ts";
import { GameError } from "./engine.ts";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

function launchOrThrow(given: string | undefined, found: string | null, hint: string) {
  const iso = given ? new Date(given).toISOString() : found;
  if (!iso || !Number.isFinite(Date.parse(iso))) throw new GameError(`No exact launch date — ${hint}`);
  return iso;
}

export async function importSteamGame(appId: number, launchAt?: string, fetchImpl?: Fetch): Promise<Game> {
  const d = await steamAppDetails(appId, fetchImpl);
  return {
    id: `steam-${appId}-${slug(d.title)}`,
    title: d.title,
    platform: "steam",
    studio: d.studio,
    genre: d.genre,
    tagline: d.tagline.slice(0, 140),
    launchAt: launchOrThrow(launchAt, d.releaseAt, "the store page doesn't give one, so pass launchAt"),
    palette: ["#0e1a2b", "#4f8fd6"],
    emoji: "🎮",
    imageUrl: d.imageUrl,
    steamAppId: appId,
  };
}

export async function importRobloxGame(placeId: number, launchAt: string | undefined, fetchImpl?: Fetch): Promise<Game> {
  const universeId = await robloxUniverseId(placeId, fetchImpl);
  const [[g], icon] = await Promise.all([robloxGames([universeId], fetchImpl), robloxIcon(universeId, fetchImpl)]);
  if (!g) throw new GameError(`Roblox universe ${universeId} not found`);
  return {
    id: `roblox-${universeId}-${slug(g.name)}`,
    title: g.name,
    platform: "roblox",
    studio: g.creator.name,
    genre: g.genre || "Experience",
    tagline: (g.description ?? "").split("\n")[0].slice(0, 140),
    // Roblox has no release-date field; the studio announces it, so it must be passed in.
    launchAt: launchOrThrow(launchAt, null, "Roblox doesn't publish release dates, so pass launchAt"),
    palette: ["#2b0e0e", "#e2231a"],
    emoji: "🧱",
    imageUrl: icon,
    robloxUniverseId: universeId,
  };
}
