# 04 — Shared platform

Status: plan. Scope: the parts the Roblox experience, the plain web market and the walkable casino share. Front-end details are in the other planning docs.

## Summary

- One repo with **pnpm workspaces + Turborepo**. The TypeScript code the products share becomes packages: `contract`, `market-core`, `progression`, `data-sources`, `oracle`, `db`.
- One backend, **`apps/api`**, serves all three front-ends. It runs on Postgres with Drizzle and uses pg-boss for scheduled jobs. Web clients get live updates over SSE; Roblox game servers poll over HTTPS.
- The Roblox app can't import TypeScript. It talks to a versioned JSON contract instead. Luau types and test fixtures are generated from that contract, and CI fails if they drift.
- Games enter the catalogue through a **candidate queue**: automatic discovery feeds it and a human approves each game. Nothing lists itself.
- Settlement follows one written policy (below) for all products, with an append-only record of every reading.
- **Biggest risk:** Roblox's Community Standards ban "simulated gambling", which reportedly includes "virtual chips" and "simulated betting". The Roblox front-end must be designed around this rule (open question 1).

## Repo layout

```
launch-markets/
├─ apps/
│  ├─ api/               Express API, SSE, admin, jobs (from web-arcade/server)
│  ├─ web-arcade/        today's prototype client; becomes the casino front-end or stays as the demo
│  ├─ web-market/        plain Polymarket/Kalshi-style site
│  ├─ web-casino/        walkable casino (may absorb web-arcade)
│  └─ roblox/            Rojo project: src/{server,client,shared}, default.project.json
├─ packages/
│  ├─ contract/          zod schemas for every API request/response + generated OpenAPI + JSON Schema
│  ├─ market-core/       LMSR, bucket lookup, metric specs, trade/resolve/void maths (pure, isomorphic)
│  ├─ progression/       XP, levels, quests, badges, crates (pure)
│  ├─ data-sources/      Steam, Gamalytic, Roblox HTTP clients (server only)
│  ├─ oracle/            measure times, settlementValue(), reading validation (pure)
│  ├─ db/                Drizzle schema, migrations, repositories
│  └─ config/            tsconfig.base.json, shared vitest config
├─ tools/
│  └─ gen-luau/          contract JSON Schema -> apps/roblox/src/shared/Contract.luau
├─ fixtures/contract/    golden JSON responses (used by TS tests and Luau tests)
├─ docs/
├─ .github/workflows/ci.yml
├─ pnpm-workspace.yaml   turbo.json   rokit.toml   selene.toml   stylua.toml
```

Why pnpm + Turborepo: pnpm's strict `node_modules` catches undeclared dependencies between packages, and Turborepo caches `typecheck`/`test`/`build` per package with very little config ([pnpm workspaces](https://pnpm.io/workspaces), [Turborepo](https://turborepo.com/docs)). If Turbo feels like too much at first, `pnpm -r run test` works. Turbo can be added later without moving anything.

Packages ship TypeScript source only, with no build step: `"exports": "./src/index.ts"`. Each app compiles them itself (Vite for the clients, tsx for the API). `market-core` and `progression` must stay free of Node imports so the standalone browser demo (`client/src/localApi.ts` runs the engine in the browser) keeps working.

## Shared packages

| Package | From prototype | Notes |
| --- | --- | --- |
| `contract` | `shared/types.ts` | Rewrite the types as zod schemas and derive the TS types with `z.infer`. Export JSON Schema and OpenAPI. The API validates every request and response against these schemas. URLs are versioned (`/api/v1`). |
| `market-core` | `lmsr.ts`, the trading/resolve parts of `engine.ts`, `METRICS`/`PLATFORM_METRICS`/`marketsFor` from `seed.ts` | Pure functions over plain data (`buy(state, …) → {state, ledgerEntries}`). No storage. Add `void()`. |
| `progression` | `progression.ts` | Unchanged at first. Each product can turn modules on or off; Roblox may skip crates. |
| `data-sources` | `sources/*.ts` | Remove `process.env` reads (the Gamalytic header name becomes an option). Add the discovery calls (see the catalogue section). |
| `oracle` | `measureAt`, `settlementValue`, `collect` from `oracle.ts` | The schedule (`oracleTick`) moves into `apps/api` because it needs the DB. |
| `db` | `store.ts` (replaced) | Drizzle schema (below). |

**Luau contract:** CI generates `Contract.luau` (exported types) from the contract's JSON Schema. Candidate generators are the `json-schema-to-luau` crate or a ~150-line script of our own, since the schemas are small. A Luau test run with [Lune](https://github.com/lune-org/lune) decodes every file in `fixtures/contract/` so the Roblox client never sees a shape it hasn't been tested against. LMSR maths is not ported to Luau: the server quotes prices and Roblox only displays them.

## Backend & infrastructure

**One service.** All three products share the same games, markets, readings and settlement. Keeping one API means one source of truth and one oracle. Product differences stay at the edges: per-product feature flags (`product: roblox|market|casino`), and possibly separate economies (open question 2). Split out a realtime or worker process only once there is load.

**Storage: Postgres + Drizzle.** Drizzle is plain TypeScript and SQL-first, with no codegen engine, and it fits the ESM/tsx setup we already have ([Drizzle](https://orm.drizzle.team/docs/overview)). Prisma would work too; this is a preference, not a blocker. Core tables:

- `users`, `identities(provider, subject, user_id)` (providers: discord, google, steam, roblox).
- `games`, `markets`, `outcomes`.
- `ledger(id, user_id, product, delta, reason, ref)`: append-only. A balance is a sum of ledger rows (cached on `wallets`).
- `trades`, `positions`.
- `readings(id, game_id, source, url, fetched_at, http_status, raw jsonb, parsed jsonb, error)`.
- `resolutions(market_id, version, value, outcome, reading_ids[], actor, reason, at)`.
- `audit_log(actor, action, target, before, after, at)`.
- `catalogue_candidates`.

Trades run in a single transaction that does `SELECT … FOR UPDATE` on the market row, so concurrent buys can't read stale `q`.

**Jobs:** [pg-boss](https://github.com/timgit/pg-boss) runs inside the API process. It is a Postgres-backed queue with cron, so there's no Redis to run. Jobs: `oracle.read` (every 6h per tracked game, every 15 min within ±2h of a measure time), `oracle.settle`, `catalogue.discover` (daily), `market.close`.

**Realtime:** keep SSE for the web (the prototype already streams the feed). Use Postgres `LISTEN/NOTIFY` to fan out events once there is more than one instance. Roblox can't hold SSE connections, so each game server polls `GET /api/v1/roblox/sync?since=` every 10–20 s and passes updates to its players. Roblox caps each game server at 500 HTTP requests per minute ([HttpService](https://create.roblox.com/docs/cloud-services/http-service)), so one poll per server is fine. Calls must never be made per player. If the casino adds live avatars walking around together, that presence is a WebSocket feature for the casino alone, not part of the core.

**Auth:**
- Web: Discord and Google over OAuth 2.0, and Steam over OpenID 2.0. Steam returns `https://steamcommunity.com/openid/id/<steamid64>` and asks sites to use Valve's sign-in buttons ([Steam Web API docs](https://steamcommunity.com/dev)). [Arctic](https://arcticjs.dev) covers the OAuth providers; Steam's OpenID check (`check_authentication`) is about 40 lines we write ourselves. Sessions are opaque tokens stored in Postgres, set as httpOnly cookies. This replaces the prototype's "token = user id".
- Roblox in-experience: players never log in to us. The game server calls the API with a pre-shared key kept in the experience's [secrets store](https://create.roblox.com/docs/cloud-services/secrets) (`HttpService:GetSecret`, locked to our API domain) and says which `roblox:<userId>` it is acting for. The API trusts the Roblox user id only on requests signed with that key.
- Account linking (optional): "Sign in with Roblox" on the web uses OAuth 2.0 with the `openid` (+`profile`) scope. A new app is private and limited to 10 users until it passes Roblox's review, which asks for a demo video of up to one minute ([OAuth registration](https://create.roblox.com/docs/cloud/auth/oauth2-registration), [overview](https://create.roblox.com/docs/cloud/auth/oauth2-overview)). Linking would merge the `roblox` identity into a web user, so one profile and leaderboard span both. Linking is not needed for launch, so submit for review early and build it later.

**Hosting (small scale, check current prices):**

| Option | Rough monthly | Notes |
| --- | --- | --- |
| **Render** (recommended) | ~$15–30 | Starter web service $7, plus Postgres from ~$6–19. Static sites for the front-ends. ([Render pricing](https://render.com/pricing)) |
| Railway | ~$10–25 | $5 Hobby credit, then usage. A small Postgres alone is around $10–17. ([Railway pricing explainer](https://livemy.app/blog/railway-pricing)) |
| Fly.io | ~$45+ | The VM is cheap (~$3–4), but Managed Postgres starts at $38. ([Fly pricing](https://fly.io/docs/about/pricing/), [MPG](https://fly.io/docs/mpg)) |
| Vercel + separate API | $0–20 + API host | Fine for static front-ends, but adds a second platform. Doesn't suit long-lived SSE. |

On top of hosting, add Gamalytic at $25–75/month (below).

## Game catalogue pipeline

Every source writes to `catalogue_candidates`. A human approves each game in launch control and sets an exact `launchAt`. Approving a game creates its markets. Nothing goes live automatically.

**Steam (automatic discovery):**
1. Daily, page through `IStoreService/GetAppList` with `if_modified_since` to find new and changed apps. It's official and needs a key, but it has no release-date filter ([IStoreService](https://partner.steamgames.com/doc/webapi/IStoreService)).
2. For each new app, call `appdetails` (already in `sources/steam.ts`). Keep apps with `coming_soon: true` and store the free-text date. `appdetails` is unofficially rate-limited, so throttle hard.
3. Enrich with Gamalytic followers and wishlist estimates. Gamalytic's game-list filters need the Starter plan ($25/month, 2,500 API requests a day). "Full API access" is listed under Professional ($75/month) ([pricing](https://gamalytic.com/pricing)). I couldn't confirm a documented list endpoint with date filters because the [API reference](https://api.gamalytic.com/reference/) didn't load during research. Check it before building step 3 around it.
4. Rank by followers and wishlists, release within 60 days, and an exact date. The top N reach the review queue.
5. SteamDB has no API. Use it by hand for checking, not for scraping.

**Roblox:** there is no release-date field, and no documented "new experiences" endpoint I could confirm.
- **Main route: manual curation.** Studios announce launches on X, Discord and the DevForum. The curator pastes a place id and a launch time.
- **Watchlist detection:** once a place id is known before launch, the oracle polls `games.roblox.com/v1/games`. That endpoint returns `created`, `visits` and `playing`; we record the first reading where the game is public and playable. That reading confirms the actual launch, and its pre-launch values give the baseline that week-one visits need.
- **Optional:** sample the public explore/sort endpoints the Roblox site uses to find young experiences gaining traction. These are undocumented and may change, so use them only to fill the candidate queue.

## Settlement policy (all products)

Each market's rules page shows these terms, and they're stored on the market row so all three UIs show the same text.

1. **Anchor:** all times in UTC, offset from `launchAt`. Day-1 wishlists use the last Gamalytic reading before launch. Day-1 favorites are measured at launch +24h. Week-one markets at +7d, month-one at +30d (as in the prototype).
2. **Which reading counts:** the first valid reading at or after the measure time. Within 6h is preferred. Readings up to 48h late are accepted, and the market shows which reading was used. "Valid" means HTTP 200, the field is present, and the value is no lower than the previous reading for counters that only grow (visits, reviews, favorites).
3. **Missing data:** if there's no valid reading after 48h, the market goes to manual review. If there's still no reading after 7 days, the market is voided.
4. **Revisions:** the settlement reading is final, even if Gamalytic revises its estimate later. The one exception is a clear source or parsing error, which an admin may re-resolve within 72h. A re-resolution reverses and re-pays through ledger rows and gets an audit entry with a reason.
5. **Launch moves:** if the date moves before the market closes, re-anchor every time and keep trades. If the game actually launches before the scheduled close, cancel trades made after the real launch time. If it slips more than 30 days or is cancelled, void the market.
6. **Voids** refund each user's net coins into the market (bought minus sold). The prototype only tracks `pos.cost`, which doesn't give this number, so the ledger has to.
7. **Edge rules:** bucket min is inclusive and max exclusive. Ratings are rounded to 0.1 percentage points. Steam rating markets are voided if there are fewer than 10 reviews. Roblox week-one visits are voided if there's no baseline reading before launch or within 2h after it.
8. **Audit:** keep the raw response for every reading. Each resolution names the reading ids it used. `/api/v1/games/:id/readings` is public.

## Compliance baseline (not legal advice)

- **Play money only.** Coins can't be bought, cashed out, transferred between users or swapped for prizes of value. Prizes of value would bring in sweepstakes and gambling law. Keep the README's warning about real money.
- **Roblox:** Roblox says it bans both real and simulated gambling. News coverage quotes its standards as barring "playing with virtual chips, simulated betting" ([Rolling Stone](https://www.rollingstone.com/culture/culture-news/roblox-child-gambling-lawsuit-1234808313/), [TechCrunch](https://techcrunch.com/2023/08/18/roblox-children-gambling-class-action-lawsuit-robux/amp)). DevForum answers on free-to-play casino mechanics disagree ([thread](https://devforum.roblox.com/t/free-to-play-slot-machines-allowed/3909513)). I couldn't load the live policy page during research. The Roblox build therefore shouldn't have chips, odds or casino theming, and Robux should never touch coins. Framing it as "predictions" with points may still fall under the ban. Read the current [Community Standards](https://about.roblox.com/community-standards) before building it.
- **Ages:** Roblox players include under-13s. On the web, require 13+ through the login providers and don't knowingly collect data from children (COPPA). Consider an 18+ gate on the casino front-end.
- **Attribution:** credit and link Gamalytic wherever its numbers appear (noted in the prototype README, from Gamalytic's docs). Use Valve's official Steam sign-in buttons. Don't use Roblox or Steam logos in a way that suggests endorsement.

## Migration plan from the prototype

1. Add root `pnpm-workspace.yaml`, `turbo.json` and `packages/config`. Move `apps/web-arcade` from npm to pnpm (delete `package-lock.json`). Tests stay green.
2. Create `packages/contract` from `shared/types.ts`. Point the client and server imports at `@gandi/contract`.
3. Create `packages/market-core`: `lmsr.ts`, the metric specs and `marketsFor` from `seed.ts`, and the trading/resolve maths from `engine.ts`, together with `engine.test.ts`. Keep a thin `Engine` wrapper so `localApi.ts` (the standalone demo) still runs.
4. `packages/progression` ← `progression.ts`. `packages/data-sources` ← `sources/*`. `packages/oracle` ← the pure parts of `oracle.ts`, with `oracle.test.ts`.
5. Create `apps/api` from `server/index.ts` and `catalog.ts`. Replace `store.ts` with `packages/db`. Routes move to `/api/v1`. The admin key is replaced by role checks on `users`.
6. Write a one-off script that imports `data/db.json` into Postgres (games, markets, snapshots → readings) and drops the fictional seed games from production.
7. Point the `web-arcade` client at `apps/api`. Then scaffold `web-market`, `web-casino` and `roblox`.

## CI

`.github/workflows/ci.yml`, on PRs and pushes to main:
- **ts job:** `pnpm/action-setup`, `actions/setup-node` (Node 22, pnpm cache), `pnpm install --frozen-lockfile`, then `pnpm turbo run typecheck test build`. It runs with a `postgres:16` service container for the `db`/`api` integration tests.
- **contract job:** regenerate the OpenAPI spec and `Contract.luau`, then `git diff --exit-code`.
- **luau job:** install the toolchain with [Rokit](https://github.com/rojo-rbx/rokit) (rojo, selene, stylua, lune). Run `stylua --check apps/roblox`, `selene apps/roblox/src`, `rojo build -o place.rbxl`, and `lune run tests` against the fixtures. Publishing to Roblox stays manual at first.

## Build order

1. **Monorepo and packages** (steps 1–4). This blocks everything else.
2. **`apps/api` with Postgres, auth and contract v1, plus the settlement policy in `oracle`.** This blocks the web market and Roblox. The casino can start earlier on the standalone engine.
3. **Web market:** the thinnest UI, and the one that proves the API.
4. **Catalogue pipeline:** needed before any public launch with real games. It can run alongside step 3.
5. **Casino:** reuses the web auth and SSE.
6. **Roblox:** the Rojo scaffold and UI can start on fixtures at any time. Connecting it to the API waits on step 2 and on a decision about the Roblox policy. Roblox OAuth linking comes last.

## Open questions for the owner

1. **Roblox gambling policy:** ship a reframed "predictions for points" Roblox game, ask Roblox for clarification first, or drop the Roblox front-end? *Default: ask Roblox first, then build the reframed version only if it's allowed, with no chips, odds or casino look.*
2. **One economy or several:** do coins, XP and leaderboards carry across products? *Default: one account and one global leaderboard, but a separate coin wallet per product, so Roblox stays isolated.*
3. **Gamalytic plan:** Starter ($25) or Professional ($75)? Wishlist markets and list filters need a paid plan. *Default: Starter for now; move to Professional only if the list API needs it.*
4. **Roblox revenue markets:** the number isn't public, so they can only be settled by hand. Keep them? *Default: drop them unless the studio agrees to share figures.*
5. **Casino age gate:** 13+ like the market, or 18+? *Default: 18+ self-declared gate for the casino; 13+ for the market.*
6. **Hosting:** Render or another host? *Default: Render (~$15–30/month).*
7. **Who curates the catalogue, and how many games a week?** *Default: the owner, 3–5 games a week, from the ranked queue.*

## Sources

- Roblox HttpService limits: https://create.roblox.com/docs/cloud-services/http-service
- Roblox secrets store: https://create.roblox.com/docs/cloud-services/secrets
- Roblox OAuth 2.0: https://create.roblox.com/docs/cloud/auth/oauth2-overview , https://create.roblox.com/docs/cloud/auth/oauth2-registration
- Roblox gambling rules (secondary): https://www.rollingstone.com/culture/culture-news/roblox-child-gambling-lawsuit-1234808313/ , https://techcrunch.com/2023/08/18/roblox-children-gambling-class-action-lawsuit-robux/amp , https://devforum.roblox.com/t/free-to-play-slot-machines-allowed/3909513
- Steam OpenID / Web API: https://steamcommunity.com/dev ; IStoreService: https://partner.steamgames.com/doc/webapi/IStoreService ; reviews: https://partner.steamgames.com/doc/store/getreviews
- Gamalytic: https://gamalytic.com/pricing , https://api.gamalytic.com/reference/
- Hosting: https://render.com/pricing , https://fly.io/docs/about/pricing/ , https://fly.io/docs/mpg , https://livemy.app/blog/railway-pricing
- Tooling: https://pnpm.io/workspaces , https://turborepo.com/docs , https://orm.drizzle.team/docs/overview , https://github.com/timgit/pg-boss , https://arcticjs.dev , https://github.com/rojo-rbx/rokit , https://github.com/lune-org/lune , https://docs.rs/json-schema-to-luau
