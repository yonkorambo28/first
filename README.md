# Launch Markets

Prediction games on upcoming Steam and Roblox launches: day-one wishlists, week-one and month-one
revenue, week-one reviews, ratings and visits. Play money throughout.

This repo holds several versions that share one data and settlement layer.

| Version | Folder | Status |
| ------- | ------ | ------ |
| Arcade prototype (the original "pop-up" build) | `apps/web-arcade` | Working |
| Native Roblox experience (play money) | `apps/roblox` | Planning: `docs/01-roblox-native.md` |
| Plain web prediction market (Polymarket / Kalshi structure) | `apps/web-market` | Planning: `docs/02-web-market.md` |
| Casino / racetrack you can walk around, with tables and a bookie | `apps/web-casino` | Planning: `docs/03-casino.md` |
| Shared backend, data sources, settlement, repo setup | `packages/*` | Planning: `docs/04-shared-platform.md` |

Start with `docs/00-decisions.md`: the open questions from every plan in one place, each with a recommended default.

## Running the prototype

```bash
cd apps/web-arcade
npm install
npm run dev
```
