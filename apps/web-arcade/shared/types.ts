// Types shared by the API server and the web client.

export type Platform = "steam" | "roblox";

/** What a market measures. Each one has its own resolution source. */
export type Metric =
  | "wishlists_d1" // Steam: wishlists on launch day
  | "favorites_d1" // Roblox: favorites on launch day (Roblox has no wishlists)
  | "revenue_w1"
  | "revenue_m1"
  | "reviews_w1" // Steam: review count after 7 days
  | "rating_w1" // % positive (Steam reviews / Roblox likes) after 7 days
  | "visits_w1"; // Roblox: place visits after 7 days

export type MarketStatus = "open" | "closed" | "resolved";

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  studio: string;
  genre: string;
  tagline: string;
  /** ISO date-time of the launch. */
  launchAt: string;
  /** Two CSS colours used for the game's card art. */
  palette: [string, string];
  emoji: string;
  /** Cover art (Steam header image / Roblox icon) for real games. */
  imageUrl?: string;
  /** Steam app id — used for Steam reviews and Gamalytic estimates. */
  steamAppId?: number;
  /** Roblox universe id — used for visits, favorites and votes. */
  robloxUniverseId?: number;
}

export interface Outcome {
  label: string;
  /** Inclusive lower bound of the bucket (in the metric's unit). */
  min: number;
  /** Exclusive upper bound; null = open-ended. */
  max: number | null;
}

export interface Market {
  id: string;
  gameId: string;
  metric: Metric;
  question: string;
  unit: string;
  outcomes: Outcome[];
  /** LMSR outstanding shares per outcome. */
  q: number[];
  /** LMSR liquidity parameter. */
  b: number;
  closesAt: string;
  /** When the number is read for settlement (launch + 1, 7 or 30 days). */
  measureAt: string;
  status: MarketStatus;
  resolution?: { value: number; outcome: number; resolvedAt: string; source: string };
  /** Where the real number comes from when we resolve. */
  source: string;
  volume: number;
}

export interface Position {
  marketId: string;
  outcome: number;
  shares: number;
  /** Total coins spent on the shares currently held. */
  cost: number;
  /** Bought at least once while this outcome was priced under 20¢. */
  underdog?: boolean;
}

export interface QuestProgress {
  id: string;
  title: string;
  goal: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earnedAt: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  xp: number;
  streak: number;
  bestStreak: number;
  wins: number;
  losses: number;
  positions: Position[];
  badges: Badge[];
  lastCrateAt: string | null;
  quests: { day: string; items: QuestProgress[] };
  isBot?: boolean;
  createdAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  marketId: string;
  gameId: string;
  outcome: number;
  side: "buy" | "sell";
  shares: number;
  coins: number;
  /** Probability of the outcome right after the trade. */
  priceAfter: number;
  at: string;
}

/** Things that happened because of an action — the client turns them into pop-ups. */
export type GameEvent =
  | { kind: "xp"; amount: number; reason: string }
  | { kind: "coins"; amount: number; reason: string }
  | { kind: "level_up"; level: number; title: string }
  | { kind: "badge"; badge: Badge }
  | { kind: "quest_done"; quest: QuestProgress }
  | { kind: "streak"; streak: number };

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForLevel: number;
}

export interface PublicUser {
  id: string;
  name: string;
  avatar: string;
  level: LevelInfo;
  netWorth: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  badges: Badge[];
}

export interface MarketView extends Market {
  prices: number[];
  /** Probability history of every outcome, oldest first. */
  history: { at: string; prices: number[] }[];
}

export interface GameView extends Game {
  markets: MarketView[];
  hype: number;
}

/** One reading of a real game's public numbers, saved over time so we can measure deltas. */
export interface Snapshot {
  gameId: string;
  at: string;
  steam?: { totalReviews: number; totalPositive: number };
  gamalytic?: {
    revenue: number | null;
    copiesSold: number | null;
    wishlists: number | null;
    followers: number | null;
    unreleased: boolean | null;
  };
  roblox?: { visits: number; favorites: number; playing: number; upVotes: number; downVotes: number };
  errors?: string[];
}
