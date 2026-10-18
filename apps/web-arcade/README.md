# Gandi — launch calls

A prediction market for upcoming **Steam** and **Roblox** game launches that plays like a game.
Players call launch-day wishlists, week-one and month-one revenue, week-one reviews, ratings and
visits, then level up, keep streaks, finish daily quests and climb the leaderboard as the real numbers land.

> **Play money only.** Coins are free, can't be bought, and have no cash value. See
> [Real money](#real-money) before changing that.

## Run it

```bash
npm install
npm run dev          # API on :8787, web on http://localhost:5173
npm test             # market-maker + engine tests
npm run build && npm start   # production: one server on :8787 serving the built client
```

`npm run build:standalone` writes `dist-standalone/gandi.html`: one static page that runs the whole
market in the browser (state in localStorage, demo bots included). Good for sharing a playable demo.

Settle markets at `#/control` with the admin key (`dev-admin` in dev; set `ADMIN_KEY` in production).

| Env var           | Default        | What it does                                  |
| ----------------- | -------------- | --------------------------------------------- |
| `PORT`            | `8787`         | API / production port                         |
| `ADMIN_KEY`       | `dev-admin`\*  | Key for `POST /api/admin/resolve`             |
| `DATA_FILE`       | `data/db.json` | Where state is saved                          |
| `BOT_INTERVAL_MS` | `12000`        | Demo bots trade this often; `0` turns them off |
| `GAMALYTIC_API_KEY` | none         | Paid Gamalytic key (wishlist estimates, more requests) |
| `GAMALYTIC_KEY_HEADER` | `api-key` | Header the key is sent in; check your Gamalytic profile page |
| `ORACLE_INTERVAL_MS` | `900000`    | How often the settlement job wakes up; `0` turns it off |
| `ORACLE_READ_EVERY_MS` | `21600000` | How often each tracked game is read (6 hours) |

\* empty (resolution disabled) when `NODE_ENV=production` and no key is set.

## How the market works

Each question (e.g. *"How many wishlists will Hollow Pines have on launch day?"*) is a **bucketed
market**, like Kalshi's range markets: five ranges, one of them will be right. Every share of the winning
bucket pays **1 coin**.

Prices come from an **LMSR automated market maker** (`server/lmsr.ts`), so the house is always the
counterparty: there's no order book to fill and a market is tradeable with a single player. Buying a
bucket pushes its price up and the others down; prices always sum to 100¢. Players can cash out
early at the current price. A market's worst-case house loss is `b·ln(5)` ≈ 193 coins at `b = 120`.

| Platform | Markets                                                                                   |
| -------- | ----------------------------------------------------------------------------------------- |
| Steam    | Day-1 wishlists · Week-1 revenue · Month-1 revenue · Week-1 review count · Week-1 % positive |
| Roblox   | Day-1 favorites · Week-1 visits · Week-1 revenue · Month-1 revenue · Week-1 like ratio       |

Roblox has no wishlists, so its launch-day market uses favorites instead. Trading on day-1 markets stops
at launch; week-one markets stop a day after launch and month-one markets a week after, before the
numbers are close to final.

### Where the numbers come from

List a real game at `#/control` with its **Steam app id** (the number in `store.steampowered.com/app/<id>`)
or **Roblox place id** (the number in `roblox.com/games/<id>`). The server pulls the title, studio, art and
(for Steam) the release date, opens five markets, then reads the game's numbers every 6 hours from a week
before launch to a month after. When a market's measure time passes, it settles from the first reading
taken after that time and names the reading as its source. Code: `server/sources/*`, `server/oracle.ts`.

| Market | Read from | Measured |
| ------ | --------- | -------- |
| Steam day-1 wishlists | Gamalytic `wishlists` estimate (paid plan) | last reading before launch |
| Steam week-1 / month-1 revenue | Gamalytic `revenue` (gross estimate) | launch + 7 / 30 days |
| Steam week-1 reviews | Steam `appreviews` `total_reviews` | launch + 7 days |
| Steam week-1 rating | Steam `total_positive ÷ total_reviews` | launch + 7 days |
| Roblox day-1 favorites | Roblox games API `favoritedCount` | launch + 1 day |
| Roblox week-1 visits | Roblox games API `visits`, end minus start | launch + 7 days, minus at launch |
| Roblox week-1 rating | Roblox votes API `upVotes ÷ (up + down)` | launch + 7 days |
| Roblox revenue | not public, settled by hand in launch control | |

The endpoints:

- **Steam** (public, no key): `store.steampowered.com/appreviews/<appid>?json=1&language=all&purchase_type=all`
  for review totals ([docs](https://partner.steamgames.com/doc/store/getreviews)), and
  `store.steampowered.com/api/appdetails?appids=<appid>` for the store page and release date.
- **Gamalytic** ([docs](https://api.gamalytic.com/reference/)): `api.gamalytic.com/game/<appid>`. It works
  without a key at 250 requests a day with some fields hidden. Wishlist estimates need a paid plan
  (Starter or above). The API asks you to credit Gamalytic and link to it wherever the data appears.
- **Roblox** (public, no key, rate-limited by IP;
  [docs](https://create.roblox.com/docs/cloud/reference/domains/games)):
  `apis.roblox.com/universes/v1/places/<placeId>/universe` turns a place id into a universe id, then
  `games.roblox.com/v1/games?universeIds=` gives visits, favorites and live players,
  `games.roblox.com/v1/games/votes?universeIds=` gives likes, and `thumbnails.roblox.com/v1/games/icons` gives the icon.

Notes:

- These APIs only work from the server. Browsers block them (CORS), so the standalone page can't list real games.
- Roblox has no release-date field, so you enter the launch time yourself. Steam store dates like "Q1 2027"
  also need one.
- Week-1 Roblox visits need a reading from around launch as the starting point, so list Roblox games before they launch.
- Gamalytic's field names come from its game page data, and its docs warn the API may change. Press
  **Read live numbers** in launch control after adding your key to check that every field comes back.

## The game layer

- **Bet slip as a game move:** pick a bucket on the board, choose a chip, see the multiplier and payout, hit **LOCK IN**.
- **Pop-ups everywhere:** XP, coins, quest completions and streaks arrive as toasts; badges, level-ups and wins get a full-screen confetti splash.
- **Progression:** XP for every call and more for correct ones; level n needs 100·n² XP and pays a coin bonus. Titles go from *Rookie Scout* to *Market Legend*.
- **Daily quests:** three a day, the same for everyone (e.g. *"Back an underdog under 20¢"*).
- **Daily crate:** a free coin top-up every 20 hours, so nobody gets locked out after going broke.
- **Streaks and badges:** First Call, Underdog Hunter, On Fire, Oracle, Whale, Both Worlds.
- **Live lobby:** game cards with countdowns and hype meters, plus a live feed of everyone's calls over server-sent events.

## Code map

```
shared/types.ts        types shared by server and client
server/lmsr.ts         market maker math
server/engine.ts       markets, trading, resolution, bots (no HTTP; unit-tested)
server/progression.ts  XP, levels, quests, badges, crates
server/seed.ts         demo games and market definitions (all fictional)
server/sources/        Steam, Gamalytic and Roblox API clients
server/oracle.ts       readings over time + automatic settlement
server/catalog.ts      list a real game from a Steam app id or Roblox place id
server/index.ts        Express API + SSE stream + static hosting
client/src/            React app (lobby, game page, profile, leaderboard, launch control)
```

## Before a real launch

- **Auth:** the session token is the user id. Swap in real auth (Discord / Roblox OAuth / Steam OpenID) first.
- **Storage:** state lives in one JSON file. Move to Postgres once there's more than one server.
- **Real games:** list them in launch control and remove the fictional ones from `server/seed.ts`.
- **Ages:** Roblox players skew young. Keep it play-money and avoid casino-style dark patterns if you target that audience.

## Real money

Cash or crypto stakes on game outcomes count as gambling or event-contract trading in most places.
In the US that means CFTC oversight (how Kalshi operates), state gambling law, or an offshore crypto set-up
(how Polymarket started). Get legal advice before adding paid coins or prizes. The play-money,
free-to-play setup here is the same model Manifold launched with.
