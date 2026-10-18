// Market + player state and every operation that changes it. No HTTP here, so it is easy to test.
import type {
  Game,
  GameEvent,
  GameView,
  Market,
  MarketView,
  PublicUser,
  Snapshot,
  Trade,
  User,
} from "../shared/types.ts";
import { prices, proceedsForSell, sharesForSpend } from "./lmsr.ts";
import {
  award,
  CRATE_COOLDOWN_MS,
  ensureQuests,
  grantXp,
  levelInfo,
  progressQuests,
  rollCrate,
  today,
} from "./progression.ts";
import { BOT_NAMES, marketsFor, seedCatalogue } from "./seed.ts";

export const STARTING_COINS = 1000;
export const MIN_STAKE = 5;
const HISTORY_LIMIT = 200;
const FEED_LIMIT = 300;

export interface State {
  games: Game[];
  markets: Market[];
  users: User[];
  trades: Trade[];
  history: Record<string, { at: string; prices: number[] }[]>;
  /** Readings of real games' public numbers (see server/oracle.ts). */
  snapshots?: Snapshot[];
}

/** randomUUID only exists in secure contexts in browsers, so fall back for plain-http pages. */
const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export class GameError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function freshState(now = Date.now()): State {
  const { games, markets } = seedCatalogue(now);
  const history: State["history"] = {};
  for (const mk of markets) history[mk.id] = [{ at: new Date(now).toISOString(), prices: prices(mk.q, mk.b) }];
  return { games, markets, users: [], trades: [], history };
}

export class Engine {
  constructor(public state: State) {}

  // ---------- lookups ----------

  user(id: string | undefined): User {
    const u = this.state.users.find((x) => x.id === id);
    if (!u) throw new GameError("Not signed in", 401);
    ensureQuests(u);
    return u;
  }

  market(id: string): Market {
    const mk = this.state.markets.find((x) => x.id === id);
    if (!mk) throw new GameError("Market not found", 404);
    this.refreshStatus(mk);
    return mk;
  }

  game(id: string): Game {
    const g = this.state.games.find((x) => x.id === id);
    if (!g) throw new GameError("Game not found", 404);
    return g;
  }

  private refreshStatus(mk: Market, now = Date.now()) {
    if (mk.status === "open" && Date.parse(mk.closesAt) <= now) mk.status = "closed";
  }

  // ---------- views ----------

  marketView(mk: Market): MarketView {
    this.refreshStatus(mk);
    return { ...mk, prices: prices(mk.q, mk.b), history: this.state.history[mk.id] ?? [] };
  }

  gameView(g: Game): GameView {
    const markets = this.state.markets.filter((x) => x.gameId === g.id).map((x) => this.marketView(x));
    return { ...g, markets, hype: markets.reduce((s, x) => s + x.volume, 0) };
  }

  games(): GameView[] {
    return this.state.games
      .map((g) => this.gameView(g))
      .sort((a, b) => Date.parse(a.launchAt) - Date.parse(b.launchAt));
  }

  netWorth(u: User): number {
    let total = u.coins;
    for (const p of u.positions) {
      const mk = this.state.markets.find((x) => x.id === p.marketId);
      if (mk && mk.status !== "resolved") total += p.shares * prices(mk.q, mk.b)[p.outcome];
    }
    return Math.round(total);
  }

  publicUser(u: User): PublicUser {
    return {
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      level: levelInfo(u.xp),
      netWorth: this.netWorth(u),
      wins: u.wins,
      losses: u.losses,
      streak: u.streak,
      bestStreak: u.bestStreak,
      badges: u.badges,
    };
  }

  me(u: User) {
    return {
      ...u,
      level: levelInfo(u.xp),
      netWorth: this.netWorth(u),
      crateReadyAt: u.lastCrateAt ? new Date(Date.parse(u.lastCrateAt) + CRATE_COOLDOWN_MS).toISOString() : null,
    };
  }

  leaderboard(): PublicUser[] {
    return this.state.users
      .map((u) => this.publicUser(u))
      .sort((a, b) => b.netWorth - a.netWorth)
      .slice(0, 50);
  }

  feed(gameId?: string, limit = 25): Trade[] {
    const list = gameId ? this.state.trades.filter((t) => t.gameId === gameId) : this.state.trades;
    return list.slice(-limit).reverse();
  }

  /** Add a game (e.g. a real upcoming launch) and open its markets. */
  addGame(game: Game) {
    if (this.state.games.some((g) => g.id === game.id)) throw new GameError("That game is already listed");
    const markets = marketsFor(game);
    this.state.games.push(game);
    this.state.markets.push(...markets);
    const at = new Date().toISOString();
    for (const mk of markets) this.state.history[mk.id] = [{ at, prices: prices(mk.q, mk.b) }];
    return this.gameView(game);
  }

  // ---------- players ----------

  signUp(name: string, avatar = "🎮", isBot = false): User {
    const clean = name.trim().slice(0, 20);
    if (!/^[\w .-]{2,20}$/.test(clean)) throw new GameError("Pick a 2–20 character name (letters, numbers, _ . -)");
    if (this.state.users.some((u) => u.name.toLowerCase() === clean.toLowerCase()))
      throw new GameError("That name is taken");
    const u: User = {
      id: newId(),
      name: clean,
      avatar,
      coins: STARTING_COINS,
      xp: 0,
      streak: 0,
      bestStreak: 0,
      wins: 0,
      losses: 0,
      positions: [],
      badges: [],
      lastCrateAt: null,
      quests: { day: "", items: [] },
      isBot,
      createdAt: new Date().toISOString(),
    };
    ensureQuests(u);
    this.state.users.push(u);
    return u;
  }

  openCrate(u: User, now = Date.now(), rand = Math.random) {
    if (u.lastCrateAt && now - Date.parse(u.lastCrateAt) < CRATE_COOLDOWN_MS)
      throw new GameError("Your crate is still recharging");
    const amount = rollCrate(rand);
    u.coins += amount;
    u.lastCrateAt = new Date(now).toISOString();
    const events: GameEvent[] = [{ kind: "coins", amount, reason: "Daily crate" }];
    grantXp(u, 10, "Opened your crate", events);
    return { amount, events };
  }

  // ---------- trading ----------

  quote(marketId: string, outcome: number, spend: number) {
    const mk = this.market(marketId);
    this.checkOutcome(mk, outcome);
    const before = prices(mk.q, mk.b)[outcome];
    const shares = sharesForSpend(mk.q, mk.b, outcome, spend);
    const after = mk.q.slice();
    after[outcome] += shares;
    return {
      shares,
      priceBefore: before,
      priceAfter: prices(after, mk.b)[outcome],
      payout: shares,
      multiplier: spend > 0 ? shares / spend : 0,
    };
  }

  buy(u: User, marketId: string, outcome: number, spend: number) {
    const mk = this.market(marketId);
    this.checkTradable(mk);
    this.checkOutcome(mk, outcome);
    spend = Math.floor(spend);
    if (!Number.isFinite(spend) || spend < MIN_STAKE) throw new GameError(`Minimum stake is ${MIN_STAKE} coins`);
    if (spend > u.coins) throw new GameError("Not enough coins");

    const priceBefore = prices(mk.q, mk.b)[outcome];
    const shares = sharesForSpend(mk.q, mk.b, outcome, spend);
    mk.q[outcome] += shares;
    mk.volume += spend;
    u.coins -= spend;

    let pos = u.positions.find((p) => p.marketId === mk.id && p.outcome === outcome);
    if (!pos) {
      pos = { marketId: mk.id, outcome, shares: 0, cost: 0 };
      u.positions.push(pos);
    }
    pos.shares += shares;
    pos.cost += spend;
    if (priceBefore < 0.2) pos.underdog = true;

    const trade = this.record(u, mk, outcome, "buy", shares, spend);

    const events: GameEvent[] = [];
    if (!u.isBot) {
      const game = this.game(mk.gameId);
      const gamesToday = new Set(
        this.state.trades
          .filter((t) => t.userId === u.id && t.side === "buy" && t.at.startsWith(today()))
          .map((t) => t.gameId),
      ).size;
      grantXp(u, 10 + Math.min(20, spend / 20), "Prediction locked", events);
      award(u, "first_call", events);
      if (spend >= 500) award(u, "whale", events);
      const platforms = new Set(u.positions.map((p) => this.game(this.market(p.marketId).gameId).platform));
      if (platforms.size === 2) award(u, "both_worlds", events);
      progressQuests(u, { platform: game.platform, gameId: game.id, priceBefore, spend, gamesToday }, events);
    }
    return { trade, position: { ...pos }, events };
  }

  sell(u: User, marketId: string, outcome: number, shares: number) {
    const mk = this.market(marketId);
    this.checkTradable(mk);
    const pos = u.positions.find((p) => p.marketId === mk.id && p.outcome === outcome);
    if (!pos || pos.shares <= 0) throw new GameError("You don't hold that outcome");
    if (!(shares > 0)) throw new GameError("Nothing to sell");
    shares = Math.min(shares, pos.shares);

    const proceeds = proceedsForSell(mk.q, mk.b, outcome, shares);
    mk.q[outcome] -= shares;
    mk.volume += proceeds;
    const coins = Math.floor(proceeds);
    u.coins += coins;
    pos.cost -= pos.cost * (shares / pos.shares);
    pos.shares -= shares;
    if (pos.shares < 1e-6) u.positions = u.positions.filter((p) => p !== pos);

    const trade = this.record(u, mk, outcome, "sell", shares, coins);
    return { trade, events: [] as GameEvent[] };
  }

  private record(u: User, mk: Market, outcome: number, side: Trade["side"], shares: number, coins: number) {
    const now = new Date().toISOString();
    const p = prices(mk.q, mk.b);
    const trade: Trade = {
      id: newId(),
      userId: u.id,
      userName: u.name,
      avatar: u.avatar,
      marketId: mk.id,
      gameId: mk.gameId,
      outcome,
      side,
      shares,
      coins,
      priceAfter: p[outcome],
      at: now,
    };
    this.state.trades.push(trade);
    if (this.state.trades.length > FEED_LIMIT) this.state.trades.splice(0, this.state.trades.length - FEED_LIMIT);
    const h = (this.state.history[mk.id] ??= []);
    h.push({ at: now, prices: p });
    if (h.length > HISTORY_LIMIT) h.splice(0, h.length - HISTORY_LIMIT);
    return trade;
  }

  private checkTradable(mk: Market) {
    if (mk.status !== "open") throw new GameError("This market is closed");
  }

  private checkOutcome(mk: Market, outcome: number) {
    if (!Number.isInteger(outcome) || outcome < 0 || outcome >= mk.outcomes.length)
      throw new GameError("Unknown outcome");
  }

  // ---------- resolution ----------

  /** Settle a market with the real number. Winning shares pay 1 coin each. */
  resolve(marketId: string, value: number, source?: string) {
    const mk = this.market(marketId);
    if (mk.status === "resolved") throw new GameError("Already resolved");
    if (!Number.isFinite(value) || value < 0) throw new GameError("Value must be a non-negative number");
    const outcome = mk.outcomes.findIndex((o) => value >= o.min && (o.max === null || value < o.max));
    if (outcome < 0) throw new GameError("Value doesn't fall in any bucket");

    mk.status = "resolved";
    mk.resolution = { value, outcome, resolvedAt: new Date().toISOString(), source: source || mk.source };

    const results: { userId: string; events: GameEvent[]; payout: number; profit: number }[] = [];
    for (const u of this.state.users) {
      const held = u.positions.filter((p) => p.marketId === mk.id);
      if (!held.length) continue;
      const events: GameEvent[] = [];
      const winner = held.find((p) => p.outcome === outcome);
      const payout = Math.floor(winner?.shares ?? 0);
      const spent = held.reduce((s, p) => s + p.cost, 0);
      const profit = payout - spent;
      u.coins += payout;
      u.positions = u.positions.filter((p) => p.marketId !== mk.id);

      if (profit > 0) {
        u.wins++;
        u.streak++;
        u.bestStreak = Math.max(u.bestStreak, u.streak);
        events.push({ kind: "coins", amount: payout, reason: `Called it: ${mk.outcomes[outcome].label}` });
        events.push({ kind: "streak", streak: u.streak });
        grantXp(u, 40 + Math.min(160, profit / 5), "Correct call", events);
        if (winner?.underdog) award(u, "underdog", events);
        if (u.streak >= 3) award(u, "hot_streak", events);
        if (u.wins >= 10) award(u, "oracle", events);
      } else {
        u.losses++;
        u.streak = 0;
        if (payout > 0) events.push({ kind: "coins", amount: payout, reason: "Partial payout" });
        grantXp(u, 5, "Played the market", events);
      }
      results.push({ userId: u.id, events, payout, profit });
    }
    return { market: this.marketView(mk), results };
  }

  // ---------- bots (keep the lobby lively in the demo) ----------

  ensureBots() {
    for (const [name, avatar] of BOT_NAMES) {
      if (!this.state.users.some((u) => u.name === name)) this.signUp(name, avatar, true);
    }
  }

  botTick(rand = Math.random) {
    const bots = this.state.users.filter((u) => u.isBot);
    const open = this.state.markets.filter((mk) => (this.refreshStatus(mk), mk.status === "open"));
    if (!bots.length || !open.length) return null;
    const bot = bots[Math.floor(rand() * bots.length)];
    const mk = open[Math.floor(rand() * open.length)];
    // Bots lean towards the favourite with some noise, and sometimes cash out.
    const p = prices(mk.q, mk.b);
    const held = bot.positions.find((x) => x.marketId === mk.id);
    if (held && rand() < 0.25) return this.sell(bot, mk.id, held.outcome, held.shares * 0.5).trade;
    const weights = p.map((x) => x + rand() * 0.35);
    const outcome = weights.indexOf(Math.max(...weights));
    if (bot.coins < 50) bot.coins += 500;
    return this.buy(bot, mk.id, outcome, Math.round(10 + rand() * 70)).trade;
  }
}
