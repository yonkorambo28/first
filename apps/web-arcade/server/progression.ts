// The "game" half of the product: levels, quests, badges, streaks and loot crates.
import type { Badge, GameEvent, LevelInfo, QuestProgress, User } from "../shared/types.ts";

const TITLES = [
  "Rookie Scout",
  "Wishlist Watcher",
  "Hype Analyst",
  "Chart Reader",
  "Launch Oracle",
  "Store-Page Seer",
  "Market Legend",
];

/** Level n needs 100·n² total XP, so each level takes a little longer than the last. */
export function levelInfo(xp: number): LevelInfo {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const floor = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))],
    xpIntoLevel: xp - floor,
    xpForLevel: next - floor,
  };
}

export function grantXp(user: User, amount: number, reason: string, events: GameEvent[]) {
  if (amount <= 0) return;
  const before = levelInfo(user.xp).level;
  user.xp += Math.round(amount);
  events.push({ kind: "xp", amount: Math.round(amount), reason });
  const after = levelInfo(user.xp);
  if (after.level > before) {
    const bonus = 50 * after.level;
    user.coins += bonus;
    events.push({ kind: "level_up", level: after.level, title: after.title });
    events.push({ kind: "coins", amount: bonus, reason: `Level ${after.level} bonus` });
  }
}

// ---------- Quests ----------

type QuestKind = "trades" | "roblox" | "steam" | "underdog" | "games" | "big";

interface QuestTemplate {
  id: QuestKind;
  title: string;
  goal: number;
  rewardCoins: number;
  rewardXp: number;
}

const QUEST_POOL: QuestTemplate[] = [
  { id: "trades", title: "Lock in 3 predictions", goal: 3, rewardCoins: 60, rewardXp: 40 },
  { id: "roblox", title: "Call a Roblox launch", goal: 1, rewardCoins: 40, rewardXp: 30 },
  { id: "steam", title: "Call a Steam launch", goal: 1, rewardCoins: 40, rewardXp: 30 },
  { id: "underdog", title: "Back an underdog (under 20¢)", goal: 1, rewardCoins: 75, rewardXp: 50 },
  { id: "games", title: "Predict on 2 different games", goal: 2, rewardCoins: 60, rewardXp: 40 },
  { id: "big", title: "Stake 150+ coins in one call", goal: 1, rewardCoins: 50, rewardXp: 35 },
];

export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Everyone gets the same three quests on a given day, so players can compare notes. */
export function questsFor(day: string): QuestProgress[] {
  const pool = QUEST_POOL.slice();
  const picked: QuestTemplate[] = [];
  let h = hash(day);
  while (picked.length < 3) {
    picked.push(pool.splice(h % pool.length, 1)[0]);
    h = hash(String(h));
  }
  return picked.map((t) => ({ ...t, progress: 0, claimed: false }));
}

export function ensureQuests(user: User, now = new Date()) {
  const day = today(now);
  if (user.quests.day !== day) user.quests = { day, items: questsFor(day) };
}

export interface TradeContext {
  platform: "steam" | "roblox";
  gameId: string;
  priceBefore: number;
  spend: number;
  /** Distinct games this user has bought into today, including this one. */
  gamesToday: number;
}

export function progressQuests(user: User, ctx: TradeContext, events: GameEvent[]) {
  ensureQuests(user);
  for (const q of user.quests.items) {
    if (q.claimed) continue;
    const kind = q.id as QuestKind;
    if (kind === "trades") q.progress++;
    if (kind === ctx.platform) q.progress++;
    if (kind === "underdog" && ctx.priceBefore < 0.2) q.progress++;
    if (kind === "big" && ctx.spend >= 150) q.progress++;
    if (kind === "games") q.progress = Math.max(q.progress, ctx.gamesToday);
    if (q.progress >= q.goal) {
      q.progress = q.goal;
      q.claimed = true;
      user.coins += q.rewardCoins;
      events.push({ kind: "quest_done", quest: { ...q } });
      events.push({ kind: "coins", amount: q.rewardCoins, reason: q.title });
      grantXp(user, q.rewardXp, "Quest complete", events);
    }
  }
}

// ---------- Badges ----------

const BADGES: Record<string, Omit<Badge, "id" | "earnedAt">> = {
  first_call: { name: "First Call", emoji: "🎯", description: "Locked in your first prediction" },
  underdog: { name: "Underdog Hunter", emoji: "🐺", description: "Won a call bought under 20¢" },
  hot_streak: { name: "On Fire", emoji: "🔥", description: "3 correct calls in a row" },
  oracle: { name: "Oracle", emoji: "🔮", description: "10 correct calls" },
  whale: { name: "Whale", emoji: "🐋", description: "Staked 500+ coins in one call" },
  both_worlds: { name: "Both Worlds", emoji: "🌐", description: "Predicted on Steam and Roblox" },
};

export function award(user: User, id: keyof typeof BADGES, events: GameEvent[]) {
  if (user.badges.some((b) => b.id === id)) return;
  const badge: Badge = { id, ...BADGES[id], earnedAt: new Date().toISOString() };
  user.badges.push(badge);
  events.push({ kind: "badge", badge });
  grantXp(user, 25, `Badge: ${badge.name}`, events);
}

// ---------- Loot crate ----------

export const CRATE_COOLDOWN_MS = 20 * 60 * 60 * 1000;

/** Daily play-money top-up. Weighted so most crates are small and a few are big. */
export function rollCrate(rand = Math.random): number {
  const r = rand();
  if (r < 0.6) return 100;
  if (r < 0.9) return 200;
  if (r < 0.98) return 400;
  return 1000;
}
