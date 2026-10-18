import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Engine, GameError } from "./engine.ts";
import { load, saver } from "./store.ts";
import { importRobloxGame, importSteamGame } from "./catalog.ts";
import { collect, oracleTick } from "./oracle.ts";
import { UpstreamError } from "./sources/http.ts";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_FILE = resolve(process.env.DATA_FILE ?? "data/db.json");
const ADMIN_KEY = process.env.ADMIN_KEY ?? (process.env.NODE_ENV === "production" ? "" : "dev-admin");
const BOT_INTERVAL_MS = Number(process.env.BOT_INTERVAL_MS ?? 12_000);
const ORACLE_INTERVAL_MS = Number(process.env.ORACLE_INTERVAL_MS ?? 15 * 60_000);
const oracleOpts = {
  gamalyticKey: process.env.GAMALYTIC_API_KEY,
  everyMs: Number(process.env.ORACLE_READ_EVERY_MS ?? 6 * 3_600_000),
};

const engine = new Engine(load(DATA_FILE));
engine.ensureBots();
const store = saver(DATA_FILE, () => engine.state);
store.schedule();

// ---------- live updates (server-sent events) ----------

const clients = new Set<Response>();
function broadcast(type: string, data: unknown) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
}
function broadcastMarket(marketId: string) {
  broadcast("market", engine.marketView(engine.market(marketId)));
}

// ---------- app ----------

const app = express();
app.use(express.json());

const userId = (req: Request) => req.header("authorization")?.replace(/^Bearer\s+/i, "");

/** Wrap a handler: run it, persist, and turn GameErrors into JSON errors. */
const route =
  (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = fn(req, res);
      if (req.method !== "GET") store.schedule();
      if (out !== undefined) res.json(out);
    } catch (e) {
      next(e);
    }
  };

const asyncRoute =
  (fn: (req: Request) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
    fn(req)
      .then((out) => {
        store.schedule();
        res.json(out);
      })
      .catch(next);
  };

const requireAdmin = (req: Request) => {
  if (!ADMIN_KEY || req.header("x-admin-key") !== ADMIN_KEY) throw new GameError("Bad admin key", 403);
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/stream", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  clients.add(res);
  req.on("close", () => clients.delete(res));
});

app.post(
  "/api/auth",
  route((req) => {
    const { name, avatar } = req.body ?? {};
    const u = engine.signUp(String(name ?? ""), typeof avatar === "string" ? avatar.slice(0, 4) : "🎮");
    return { token: u.id, me: engine.me(u) };
  }),
);

app.get(
  "/api/me",
  route((req) => engine.me(engine.user(userId(req)))),
);

app.get(
  "/api/games",
  route(() => engine.games()),
);

app.get(
  "/api/games/:id",
  route((req) => {
    const g = engine.game(String(req.params.id));
    return { game: engine.gameView(g), feed: engine.feed(g.id, 30) };
  }),
);

app.get(
  "/api/feed",
  route(() => engine.feed(undefined, 30)),
);

app.get(
  "/api/leaderboard",
  route(() => engine.leaderboard()),
);

app.get(
  "/api/users/:id",
  route((req) => engine.publicUser(engine.user(String(req.params.id)))),
);

app.post(
  "/api/markets/:id/quote",
  route((req) => engine.quote(String(req.params.id), Number(req.body?.outcome), Number(req.body?.spend))),
);

app.post(
  "/api/markets/:id/buy",
  route((req) => {
    const u = engine.user(userId(req));
    const out = engine.buy(u, String(req.params.id), Number(req.body?.outcome), Number(req.body?.spend));
    broadcastMarket(out.trade.marketId);
    broadcast("trade", out.trade);
    return { ...out, me: engine.me(u) };
  }),
);

app.post(
  "/api/markets/:id/sell",
  route((req) => {
    const u = engine.user(userId(req));
    const out = engine.sell(u, String(req.params.id), Number(req.body?.outcome), Number(req.body?.shares));
    broadcastMarket(out.trade.marketId);
    broadcast("trade", out.trade);
    return { ...out, me: engine.me(u) };
  }),
);

app.post(
  "/api/crate",
  route((req) => {
    const u = engine.user(userId(req));
    return { ...engine.openCrate(u), me: engine.me(u) };
  }),
);

app.post(
  "/api/admin/resolve",
  route((req) => {
    requireAdmin(req);
    const { marketId, value, source } = req.body ?? {};
    const out = engine.resolve(String(marketId), Number(value), source ? String(source) : undefined);
    broadcast("market", out.market);
    broadcast("resolved", out);
    return out;
  }),
);

// List a real game: { platform: "steam", steamAppId } or { platform: "roblox", robloxPlaceId }, plus optional launchAt.
app.post(
  "/api/admin/games",
  asyncRoute(async (req) => {
    requireAdmin(req);
    const { platform, steamAppId, robloxPlaceId, launchAt } = req.body ?? {};
    const game =
      platform === "steam"
        ? await importSteamGame(Number(steamAppId), launchAt)
        : platform === "roblox"
          ? await importRobloxGame(Number(robloxPlaceId), launchAt)
          : null;
    if (!game) throw new GameError("platform must be steam or roblox");
    const view = engine.addGame(game);
    broadcast("games", { id: view.id });
    return view;
  }),
);

// Read a game's live public numbers right now (also saved as a reading).
app.post(
  "/api/admin/games/:id/read",
  asyncRoute(async (req) => {
    requireAdmin(req);
    const snap = await collect(engine.game(String(req.params.id)), oracleOpts);
    (engine.state.snapshots ??= []).push(snap);
    return snap;
  }),
);

app.get(
  "/api/games/:id/readings",
  route((req) => (engine.state.snapshots ?? []).filter((s) => s.gameId === String(req.params.id)).slice(-20)),
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Serve the built client in production.
const dist = resolve("dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof GameError || err instanceof UpstreamError)
    return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something broke" });
});

if (BOT_INTERVAL_MS > 0) {
  setInterval(() => {
    const trade = engine.botTick();
    if (!trade) return;
    broadcastMarket(trade.marketId);
    broadcast("trade", trade);
    store.schedule();
  }, BOT_INTERVAL_MS);
}

if (ORACLE_INTERVAL_MS > 0) {
  const runOracle = () =>
    oracleTick(engine, oracleOpts)
      .then((settled) => {
        for (const out of settled) {
          broadcast("market", out.market);
          broadcast("resolved", out);
        }
        store.schedule();
      })
      .catch((e) => console.error("oracle:", e));
  setInterval(runOracle, ORACLE_INTERVAL_MS);
  runOracle();
}

app.listen(PORT, () => console.log(`Gandi API on http://localhost:${PORT}`));

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    store.flush();
    process.exit(0);
  });
}
