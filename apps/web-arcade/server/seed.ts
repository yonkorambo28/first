// Demo catalogue. Every game here is fictional — swap in real upcoming launches
// (Steam "Coming Soon" / Roblox upcoming experiences) before going live.
import type { Game, Market, Metric, Outcome, Platform } from "../shared/types.ts";

const DAY = 24 * 60 * 60 * 1000;

interface MetricSpec {
  question: (title: string) => string;
  unit: string;
  outcomes: Outcome[];
  source: string;
  /** Days after launch that trading stops. */
  closeOffsetDays: number;
  /** Days after launch that the number is read for settlement. */
  measureOffsetDays: number;
}

const k = (n: number) => n * 1_000;
const m = (n: number) => n * 1_000_000;

const METRICS: Record<Metric, MetricSpec> = {
  wishlists_d1: {
    question: (t) => `How many wishlists will ${t} have on launch day?`,
    unit: "wishlists",
    outcomes: [
      { label: "< 10K", min: 0, max: k(10) },
      { label: "10K – 50K", min: k(10), max: k(50) },
      { label: "50K – 150K", min: k(50), max: k(150) },
      { label: "150K – 500K", min: k(150), max: k(500) },
      { label: "500K+", min: k(500), max: null },
    ],
    source: "Gamalytic wishlist estimate, last reading before release (api.gamalytic.com/game/{appid})",
    closeOffsetDays: 0,
    measureOffsetDays: 0,
  },
  favorites_d1: {
    question: (t) => `How many favorites will ${t} have at the end of launch day?`,
    unit: "favorites",
    outcomes: [
      { label: "< 5K", min: 0, max: k(5) },
      { label: "5K – 25K", min: k(5), max: k(25) },
      { label: "25K – 100K", min: k(25), max: k(100) },
      { label: "100K – 500K", min: k(100), max: k(500) },
      { label: "500K+", min: k(500), max: null },
    ],
    source: "Roblox games API favoritedCount, 24h after launch (games.roblox.com/v1/games)",
    closeOffsetDays: 0,
    measureOffsetDays: 1,
  },
  revenue_w1: {
    question: (t) => `What will ${t} gross in its first week?`,
    unit: "USD",
    outcomes: [
      { label: "< $50K", min: 0, max: k(50) },
      { label: "$50K – $250K", min: k(50), max: k(250) },
      { label: "$250K – $1M", min: k(250), max: m(1) },
      { label: "$1M – $5M", min: m(1), max: m(5) },
      { label: "$5M+", min: m(5), max: null },
    ],
    source: "Gamalytic gross revenue estimate, 7 days after launch (api.gamalytic.com/game/{appid})",
    closeOffsetDays: 1,
    measureOffsetDays: 7,
  },
  revenue_m1: {
    question: (t) => `What will ${t} gross in its first month?`,
    unit: "USD",
    outcomes: [
      { label: "< $100K", min: 0, max: k(100) },
      { label: "$100K – $500K", min: k(100), max: k(500) },
      { label: "$500K – $2M", min: k(500), max: m(2) },
      { label: "$2M – $10M", min: m(2), max: m(10) },
      { label: "$10M+", min: m(10), max: null },
    ],
    source: "Gamalytic gross revenue estimate, 30 days after launch (api.gamalytic.com/game/{appid})",
    closeOffsetDays: 7,
    measureOffsetDays: 30,
  },
  reviews_w1: {
    question: (t) => `How many Steam reviews will ${t} have after 7 days?`,
    unit: "reviews",
    outcomes: [
      { label: "< 100", min: 0, max: 100 },
      { label: "100 – 500", min: 100, max: 500 },
      { label: "500 – 2K", min: 500, max: k(2) },
      { label: "2K – 10K", min: k(2), max: k(10) },
      { label: "10K+", min: k(10), max: null },
    ],
    source: "Steam appreviews query_summary.total_reviews, 7 days after launch (store.steampowered.com/appreviews)",
    closeOffsetDays: 1,
    measureOffsetDays: 7,
  },
  rating_w1: {
    question: (t) => `What % positive will ${t} be rated after 7 days?`,
    unit: "% positive",
    outcomes: [
      { label: "< 70%", min: 0, max: 70 },
      { label: "70 – 80%", min: 70, max: 80 },
      { label: "80 – 90%", min: 80, max: 90 },
      { label: "90 – 95%", min: 90, max: 95 },
      { label: "95%+", min: 95, max: null },
    ],
    source: "Steam appreviews total_positive ÷ total_reviews · Roblox votes API upVotes ÷ all votes, 7 days after launch",
    closeOffsetDays: 1,
    measureOffsetDays: 7,
  },
  visits_w1: {
    question: (t) => `How many visits will ${t} get in its first week?`,
    unit: "visits",
    outcomes: [
      { label: "< 100K", min: 0, max: k(100) },
      { label: "100K – 1M", min: k(100), max: m(1) },
      { label: "1M – 10M", min: m(1), max: m(10) },
      { label: "10M – 50M", min: m(10), max: m(50) },
      { label: "50M+", min: m(50), max: null },
    ],
    source: "Roblox games API visits, 7 days after launch minus visits at launch (games.roblox.com/v1/games)",
    closeOffsetDays: 1,
    measureOffsetDays: 7,
  },
};

export const PLATFORM_METRICS: Record<Platform, Metric[]> = {
  steam: ["wishlists_d1", "revenue_w1", "revenue_m1", "reviews_w1", "rating_w1"],
  roblox: ["favorites_d1", "visits_w1", "revenue_w1", "revenue_m1", "rating_w1"],
};

interface SeedGame extends Omit<Game, "launchAt"> {
  launchInDays: number;
  /** Prior belief per metric — sets the opening odds so markets don't all start flat. */
  priors: Partial<Record<Metric, number[]>>;
}

const GAMES: SeedGame[] = [
  {
    id: "hollow-pines",
    title: "Hollow Pines",
    platform: "steam",
    studio: "Lanternfly Games",
    genre: "Co-op survival horror",
    tagline: "Four friends, one cabin, something in the trees.",
    palette: ["#0f3d2e", "#7ae582"],
    emoji: "🌲",
    launchInDays: 3,
    priors: { wishlists_d1: [5, 20, 40, 25, 10], rating_w1: [10, 20, 40, 20, 10] },
  },
  {
    id: "neon-drift-2099",
    title: "Neon Drift 2099",
    platform: "steam",
    studio: "Chromewave",
    genre: "Arcade racer",
    tagline: "Drift through a city that never stops glowing.",
    palette: ["#2b0a3d", "#ff4ecd"],
    emoji: "🏎️",
    launchInDays: 9,
    priors: { wishlists_d1: [10, 35, 35, 15, 5] },
  },
  {
    id: "ironroot-colony",
    title: "Ironroot Colony",
    platform: "steam",
    studio: "Deepstack Interactive",
    genre: "Colony sim",
    tagline: "Dig down. Build up. Don't wake the roots.",
    palette: ["#3d2b0a", "#ffb84e"],
    emoji: "⛏️",
    launchInDays: 16,
    priors: { wishlists_d1: [3, 12, 30, 35, 20], revenue_m1: [5, 15, 30, 35, 15] },
  },
  {
    id: "starlit-kitchen",
    title: "Starlit Kitchen",
    platform: "steam",
    studio: "Tiny Comet",
    genre: "Cozy cooking",
    tagline: "Run a noodle stand on the edge of the galaxy.",
    palette: ["#1a1f4d", "#ffd6a5"],
    emoji: "🍜",
    launchInDays: -2,
    priors: { wishlists_d1: [10, 40, 30, 15, 5] },
  },
  {
    id: "obby-rush-lava",
    title: "Obby Rush: Lava Tower",
    platform: "roblox",
    studio: "JumpKing Studios",
    genre: "Obby",
    tagline: "100 floors. The lava rises every 30 seconds.",
    palette: ["#4d0f0a", "#ff7b00"],
    emoji: "🌋",
    launchInDays: 2,
    priors: { visits_w1: [5, 25, 40, 20, 10] },
  },
  {
    id: "pet-kingdom-tycoon",
    title: "Pet Kingdom Tycoon",
    platform: "roblox",
    studio: "Fluffworks",
    genre: "Tycoon / pets",
    tagline: "Hatch, merge, and rule a kingdom of pets.",
    palette: ["#0a2d4d", "#64dfdf"],
    emoji: "🐾",
    launchInDays: 6,
    priors: { visits_w1: [3, 15, 35, 30, 17], favorites_d1: [5, 20, 35, 30, 10] },
  },
  {
    id: "sky-heist",
    title: "Sky Heist",
    platform: "roblox",
    studio: "Cloudnine Dev",
    genre: "Team heist",
    tagline: "Rob a floating bank. Try not to fall off.",
    palette: ["#0d1b2a", "#a2d2ff"],
    emoji: "💰",
    launchInDays: 12,
    priors: {},
  },
];

/** Shares that make the LMSR opening price equal the prior. */
function openingShares(prior: number[] | undefined, n: number, b: number): number[] {
  const p = prior && prior.length === n ? prior : Array(n).fill(1);
  const s = p.reduce((a, x) => a + x, 0);
  return p.map((x) => b * Math.log(x / s) + b * Math.log(n));
}

const ROBUX_SOURCE =
  "Developer-reported Creator Dashboard earnings converted at the DevEx rate (Roblox has no public revenue API)";

/** The five markets every game gets, with opening odds set from an optional prior. */
export function marketsFor(game: Game, priors: Partial<Record<Metric, number[]>> = {}): Market[] {
  const launch = Date.parse(game.launchAt);
  return PLATFORM_METRICS[game.platform].map((metric) => {
    const spec = METRICS[metric];
    const b = 120;
    const isRobux = game.platform === "roblox" && metric.startsWith("revenue");
    return {
      id: `${game.id}:${metric}`,
      gameId: game.id,
      metric,
      question: spec.question(game.title),
      unit: spec.unit,
      outcomes: spec.outcomes,
      q: openingShares(priors[metric], spec.outcomes.length, b),
      b,
      closesAt: new Date(launch + spec.closeOffsetDays * DAY).toISOString(),
      measureAt: new Date(launch + spec.measureOffsetDays * DAY).toISOString(),
      status: "open",
      source: isRobux ? ROBUX_SOURCE : spec.source,
      volume: 0,
    };
  });
}

export function seedCatalogue(now = Date.now()): { games: Game[]; markets: Market[] } {
  const games: Game[] = [];
  const markets: Market[] = [];
  for (const g of GAMES) {
    const { launchInDays, priors, ...rest } = g;
    const game = { ...rest, launchAt: new Date(now + launchInDays * DAY).toISOString() };
    games.push(game);
    markets.push(...marketsFor(game, priors));
  }
  return { games, markets };
}

export const BOT_NAMES: [string, string][] = [
  ["PixelProphet", "🧙"],
  ["WishlistWendy", "📈"],
  ["obby_oracle", "🦊"],
  ["SteamSage", "♨️"],
  ["CozyCalls", "🍵"],
  ["DevExDan", "💸"],
  ["LaunchLurker", "👀"],
  ["HypeTrainHank", "🚂"],
];
