# 02 — Web prediction market (`apps/web-market`)

Track (2): a plain web prediction market for Steam and Roblox launches. It is laid out like Polymarket and Kalshi (events, outcome rows, price charts, rules text, portfolio) and keeps the prototype's market maker and settlement code. Play money at launch.

## Summary

- **Structure:** one **event per game launch**. Each metric gets a **bracket group** (Kalshi-style ranges, shown as Polymarket-style Yes/No rows). "Over X?" ladder questions are **views over the same brackets**, not separate markets, so prices can't contradict each other. A few standalone binaries ("Launches on announced date?") sit alongside.
- **Pricing:** keep the prototype's **LMSR house market maker** and add basket trades (buy several brackets at once). No order book. Low-volume niche markets can't support a CLOB.
- **Settlement:** reuse `oracle.ts` and `sources/*`. Every market shows rules text written from a template, with fixed answers for delayed launches, missing data, estimate revisions, Early Access and free-to-play games. Settlement runs through a proposed → final step with a 48-hour dispute window.
- **Money:** play money only, with no purchase and no prize, like Manifold today. Sweepstakes are being banned state by state, so skip them. Real money would mean listing contracts through an existing CFTC-registered exchange, not running one ourselves.
- **MVP:** about 5–7 weeks for one developer, on Postgres with Discord and Google login. It shares `packages/` with the other versions.

## How the big markets do it

| | Polymarket | Kalshi | Manifold |
|---|---|---|---|
| Unit | Binary Yes/No market. Markets are grouped into **events**. Mutually exclusive groups use **negRisk**: exactly one market resolves Yes, and a No in one market converts into a Yes in every other | Binary contract. **Series → event → market** hierarchy. Bracket events cover every outcome with non-overlapping ranges and open-ended tails; exactly one settles Yes | Binary, multiple choice (the answers can be set to sum to 100%), plus "Set" markets with independent answers. Numeric markets were deprecated |
| Pricing | Central limit order book (CLOB), plus liquidity rewards paid to market makers | CLOB, plus designated market makers and a liquidity incentive program | AMM: a parameterized CPMM ("Maniswap") seeded by the creator's subsidy, with limit orders on top |
| Resolution | UMA optimistic oracle: an answer is proposed with a bond, then a dispute window, then a token vote if disputed | Rulebook for each contract names the source, time and boundaries; the exchange settles | Market creator resolves; "N/A" refunds traders |
| Money | USDC offshore; CFTC-registered Polymarket US since late 2025 | CFTC-registered exchange (DCM), USD | Play mana. A sweepcash real-money mode ran Sept 2024 – Mar 2025, then was shut down |

Pages they all share:

- **Event page:** title and art, a list of outcome rows with probability and Yes/No buttons, a multi-line price chart, a rules box (resolution source, close time, edge cases), timeline, comments, and a recent trades tab.
- **Elsewhere:** a portfolio (open positions, P&L, history), a site-wide activity feed, and leaderboards (Manifold's leagues).

Kalshi and Polymarket already list video-game questions such as the GTA VI release date, so the category has precedent.

## Recommended market structure

**Event** = one game launch ("Hollow Pines — Steam launch"). It holds:

1. **Metric groups**, one per metric (day-1 wishlists, week-1 revenue, and so on). Each is a set of **6–8 mutually exclusive brackets** that cover every value, open-ended at both ends. This is the prototype's bucketed market with more buckets, priced by **one LMSR over all brackets**.
2. **Ladder view** for each group: "≥ 25K?", "≥ 50K?", "≥ 100K?", one Yes/No row per bracket edge. The Yes price of "≥ X" is the sum of the prices of the brackets above X. Buying Yes means buying that set of brackets; buying No means buying the rest. This is the negRisk idea without separate contracts. It gives traders Kalshi's familiar "above X" rows while every price stays consistent.
3. **Standalone binaries** where a bracket doesn't fit: "Launches on its announced date?", "Steam rating reaches Very Positive (≥ 80%, 50+ reviews) by day 7?", "Peak concurrent players above 10K in week 1?" (future source: Steam `GetNumberOfCurrentPlayers` polling). Each is a 2-outcome LMSR.

The page has a **Brackets / Ladder** toggle. Brackets is the default for wishlists and revenue; Ladder is the default for reviews and visits.

Bracket edges are chosen at listing time and **log-spaced around a prior**, for example:

- Gamalytic followers × typical conversion for wishlists
- comparable-genre medians for revenue

Edges are rounded to readable numbers (10K / 25K / 50K / 100K...). Admins can edit them until the first trade.

**Basket trade math** (an extension to `lmsr.ts`). Buying `spend` worth of every outcome in set S, where P_S is the sum of the current prices in S, gives

`x = b·ln(1 + (e^{spend/b} − 1) / P_S)` shares of each outcome in S.

This is the prototype's single-outcome formula with p replaced by P_S. A basket that wins pays 1 per share. Positions are stored per bracket, so ladder and bracket holdings net out automatically.

## Pricing mechanism

| Option | Fit for this product |
|---|---|
| CLOB (Polymarket, Kalshi) | Needs active market makers. With dozens of traders per game, books sit empty or wide. Both big platforms pay market makers to fix this. Reject for MVP. |
| CPMM (Manifold) | Good for binaries. For multi-outcome markets, Manifold fixes p = 0.5, and liquidity added later is partly lost. Bracket groups are our main case. |
| **LMSR (prototype)** | One market maker per group. Prices always sum to 100%, it trades with a single user, and the house's worst-case loss is known: b·ln(n), about 250 coins at b = 120, n = 8. **Recommend.** |
| Hybrid (AMM + limit orders) | Phase 3: resting limit orders that fill against the AMM when its price crosses them, like Manifold. Gives "buy at 30¢" without a full order book. |

Liquidity bootstrapping:

- The house seeds b per group, by tier: b = 80 for small indies and 250 for featured launches. That puts the subsidy at 166–520 coins.
- Later, b can rise with volume (liquidity-sensitive LMSR). No trading fees in play money.
- The prototype's demo bots stay off in production. One clearly labelled "House Analyst" bot may place a prior-based opening trade.

## Market templates and resolution rules

| Metric | Shape | Source (first reading after measure time) | Trading closes |
|---|---|---|---|
| Steam day-1 wishlists | Brackets | Gamalytic wishlist estimate, last reading before launch | Launch |
| Steam week-1 / month-1 revenue | Brackets + ladder | Gamalytic gross revenue estimate at +7d / +30d | +1d / +7d |
| Steam week-1 reviews | Ladder | Steam `appreviews` `total_reviews`, all languages and purchase types | +1d |
| Steam week-1 % positive | Brackets (5-pt) | `total_positive ÷ total_reviews` | +1d |
| Roblox day-1 favorites / week-1 visits | Ladder | Roblox games API | Launch / +1d |
| Roblox week-1 like ratio | Brackets | Roblox votes API | +1d |
| Roblox revenue | **Don't list** (not public) | — | — |

**Rules text template.** Every market shows this, filled in per market:

> Resolves to the bracket containing **[metric]** for **[game]** ([store link]) as reported by **[source]** in the first reading taken at or after **[measure time UTC]** (launch + N days). "Launch" is the first moment the game is purchasable or playable by the public on [platform]. Bracket lower bounds are inclusive and upper bounds exclusive.

Edge cases (the same text appears on every market):

- **Delayed launch.** Close and measure times move with the actual launch. If the game hasn't launched within **90 days** of the date it had when the market was listed, or it's cancelled, the market **voids**.
- **Early Access.** The Early Access launch counts as the launch. Going from Early Access to 1.0 later is a new event. Playtests, demos and betas don't count.
- **Free-to-play.** Steam free-to-play games get no revenue markets. Gamalytic estimates sales, not in-game spend. If a game turns free-to-play before measure time, its revenue markets void.
- **Estimate revisions.** We use the first qualifying reading. Later Gamalytic revisions and Steam review deletions do not change the result. The value read and its timestamp are published.
- **Metric unavailable.** The oracle retries for 48 hours after measure time. If it still has no data, an admin may settle from an archived source (SteamDB or Wayback snapshot), cited in the resolution note. If none exists, the market voids.
- **Platform or region launches.** Only the platform named in the event counts. A simultaneous console launch doesn't count.
- **Void.** Every trade is unwound: each user gets back their net coins spent on the market, the way Manifold handles N/A.

**Resolution flow.** The oracle or an admin **proposes** a result → it shows on the page as "Proposed: 42,310 → 25K–50K" → **48-hour dispute window**. A disputer posts a reason and an evidence link; there is no bond in play money, but there is a rate limit. An admin finalizes or overturns, and every resolution keeps an audit log.

## Currency and legal path

*Not legal advice. Most US gambling law tests for three things: a prize, chance, and paying to enter (consideration). Removing any one changes the analysis, and state law varies.*

1. **Pure play money (recommended start).** Coins are free and can't be bought or cashed out, and there are no prizes. No prize means this generally isn't gambling. Manifold ran this way for years. Optional later: sell cosmetics or a supporter badge that **never buys coins**. Manifold sold mana even without a cash-out, but selling coins weakens the "no consideration" argument and looks bad to Roblox-age users.
2. **Sweepstakes (dual currency: free coins plus redeemable coins). Avoid.** At least six to nine states have banned it outright since 2025, including California (AB 831, in force 1 Jan 2026, criminal penalties), New York, New Jersey, Connecticut, Montana, Nevada, Indiana, Maine and Oklahoma. More bills are pending. Manifold shut its sweepcash mode in March 2025, after about six months. Source counts differ; treat this as a live and worsening risk.
3. **Prize contests.** Monthly leaderboard prizes with free entry and no purchase anywhere on the site. This is lower risk than sweepstakes but still needs state-by-state review: some states restrict skill contests, and official rules must be published. Trigger: a steady user base (for example 1,000+ weekly actives) and a sponsor.
4. **Real money.** Two routes:
   - **Become a DCM:** the CFTC reviews applications against 23 core principles on a 180-day clock, but in practice it takes 7 months to 4 years, plus ongoing self-regulatory duties. Not realistic.
   - **List through an existing DCM or broker:** Underdog runs on Crypto.com's exchange; Polymarket entered the US by buying QCEX. More realistic.

   Sports contracts are tied up in federal preemption litigation, with state cease-and-desist orders in 11+ states and mixed court rulings through 2026. The CFTC opened a new probe of Polymarket in June 2026. Offshore crypto, Polymarket's original model, is not an option for a US-based owner.

   Trigger: proven demand (forecasts that beat the house, active volume) **and** a partner exchange willing to list game-metric contracts. A further issue: settlement sources are third-party *estimates* (Gamalytic), which a regulated exchange may reject.

**Recommend:** step 1 now. Step 3 only after counsel reviews it. Step 4 only through a partner. Skip step 2.

## Data model

Postgres via Drizzle. Changes from the prototype:

- `Game` becomes `events`.
- `Market` splits into `market_groups` + `outcomes`.
- The JSON file becomes tables.
- Progression, quests and crates stay in web-arcade.

```sql
users(id, handle, display_name, avatar_url, balance numeric, created_at, is_admin, banned_at)
auth_identities(user_id, provider, provider_uid, unique(provider, provider_uid))  -- discord|google|steam
events(id, slug, platform, title, studio, image_url, steam_app_id, roblox_universe_id,
       launch_at, launch_at_original, status, created_at)
market_groups(id, event_id, metric, kind /*brackets|binary*/, question, unit, rules_md,
              b numeric, q numeric[], closes_at, measure_at, status /*open|closed|proposed|resolved|void*/)
outcomes(id, group_id, idx, label, min numeric, max numeric null)
trades(id, user_id, group_id, outcome_set int[], side, shares numeric, coins numeric,
       prices_after numeric[], created_at)                        -- append-only ledger
positions(user_id, group_id, outcome_idx, shares, cost_basis, primary key(user_id, group_id, outcome_idx))
price_points(group_id, at, prices numeric[])                      -- chart, downsampled
snapshots(event_id, at, payload jsonb, errors text[])             -- oracle readings (as prototype)
resolutions(group_id, proposed_value, proposed_outcome, source, proposed_by, proposed_at,
            disputes jsonb, final_outcome, finalized_by, finalized_at, void_reason)
comments(id, event_id, group_id null, user_id, body, parent_id, created_at, hidden_at)
balance_ledger(id, user_id, delta, reason /*signup|trade|payout|refund|grant*/, ref_id, created_at)
```

Trades run inside one transaction that locks the `market_groups` row (`SELECT … FOR UPDATE`), so the LMSR state never splits.

**API** (REST + SSE):

- `GET /events`, `GET /events/:slug` (groups, prices, rules, resolution)
- `GET /groups/:id/history?range=`
- `POST /quote` and `POST /trade` with `{groupId, outcomes[], side, spend|shares}`
- `GET /me/portfolio`, `GET /me/trades`
- `GET /leaderboard?period=week|all&metric=profit|calibration`
- `GET /activity`, `GET /stream` (SSE)
- `GET|POST /events/:id/comments`
- `POST /groups/:id/dispute`
- Admin: `POST /admin/events` (from a Steam or Roblox id, via `catalog.ts`), `POST /admin/groups/:id/propose|finalize|void`

**Auth:** Discord and Google through OAuth (Arctic or Auth.js), with Steam OpenID 2.0 as a linkable identity. Steam login doesn't provide an email, but it shows players are real and is good for a "verified Steam player" flair. Sessions are httpOnly cookies, replacing the prototype's user-id token. One account per verified identity, to limit multi-account leaderboard farming.

## MVP and roadmap

| Phase | Scope | Effort (1 dev) |
|---|---|---|
| **0. Extract** | Move lmsr, engine core, sources, oracle and types into `packages/`. Web-arcade keeps passing its tests | 1 wk |
| **1. MVP** | Postgres, auth, event/group pages (bracket and ladder views, chart, rules, timeline), trade ticket with quote, portfolio, activity, all-time leaderboard, admin listing, propose → dispute → finalize flow, void refunds, 10–20 real upcoming games | 4–5 wk |
| **2. Community** | Comments, weekly leaderboards and leagues, calibration score, email/Discord alerts for close and resolve, share cards, public read API | 2–3 wk |
| **3. Depth** | Limit orders against the AMM, standalone binaries with new sources (concurrent players), user-proposed markets with admin review, liquidity-sensitive b | 3–4 wk |
| **4. Money (gated)** | Legal review, prize contests, or talks with a partner exchange | Open |

## Folder layout

```
packages/
  market-core/    lmsr.ts (+ baskets), trade/resolve/void logic, pure + unit-tested
  sources/        steam, gamalytic, roblox clients (from web-arcade/server/sources)
  oracle/         snapshots, settlementValue, scheduler
  rules/          metric templates, bracket-edge generator, rules-text renderer
  db/             Drizzle schema + migrations (shared by web-market, casino, Roblox backend)
  types/          shared domain types
apps/web-market/
  server/         Express (or Hono) routes, auth, SSE, admin
  client/         React + Vite: pages/{Home,Event,Portfolio,Leaderboard,Activity,Admin}, components/{OutcomeRow,PriceChart,TradeTicket,RulesBox,Timeline,Comments}
```

Repo tooling and the shared backend are decided in `docs/04-shared-platform.md`. This plan assumes npm workspaces.

## Risks

- **Source fragility.** Gamalytic is a paid third-party estimate, its API may change, and it requires attribution. Wishlists have no first-party public source. Mitigation: save every reading, show it, and keep admin override plus a void path.
- **Thin activity.** An empty-looking market reads as dead. Seed priors, feature 3–5 launches a week, and post resolutions to Discord.
- **Insider trading.** Developers know their own wishlist numbers. Let anyone flag this in comments, and add a rule barring trades on your own game. Play money limits the harm.
- **Leaderboard farming** with alt accounts. Verified identities, signup grants that unlock with activity, rate limits.
- **Legal drift.** Selling coins, adding prizes or targeting minors changes the legal picture. Gate all three behind owner and counsel sign-off.
- **Bracket mis-sizing.** If the prior is wrong, all the probability ends up in one tail. Keep tails open-ended, and while volume is zero allow admins to split a bracket before close (prices are re-derived and positions carry over).

## Open questions for the owner

1. **Audience and age floor.** 13+, or 18+ only? *Default: 13+, play money only, no coin sales. That keeps parity with the Roblox track.*
2. **Coin sales.** Sell coins at all? *Default: no. Sell cosmetics or a supporter badge later if needed.*
3. **Prizes.** Run free-entry leaderboard prizes within the first year? *Default: no until there are 1,000+ weekly actives and counsel has reviewed it.*
4. **Real-money ambition.** Is a regulated real-money version a goal worth designing for now, which would mean stricter, first-party-only data sources? *Default: no. Design for play money and keep sources swappable.*
5. **Gamalytic plan.** Pay for the plan that wishlist markets need? *Default: yes, Starter tier. Without it, drop day-1 wishlist markets on Steam.*
6. **Who lists markets.** Admins only, or user-proposed with review? *Default: admins only for MVP, user proposals in phase 3.*
7. **Void window for delayed launches.** *Default: 90 days after the listed launch date.*
8. **Shared accounts and balances** across web-market, the casino and Roblox. *Default: shared identity, separate balances per app at first.*
9. **Branding.** Same "Gandi" brand as the arcade, or a separate, more serious name for the market? *Default: same brand, "Markets" section.*

## Sources

- Polymarket negative risk: https://docs.polymarket.com/advanced/neg-risk · markets and events: https://docs.polymarket.com/concepts/markets-events
- Polymarket US / QCEX: https://www.theblock.co/amp/post/363623/polymarket-plans-to-re-enter-us-with-acquisition-of-derivatives-exchange-qcex · https://bitcoinmagazine.com/markets/polymarket-rolls-out-us-app · https://cryptobriefing.com/polymarket-us-regulatory-approval-cftc/
- UMA optimistic oracle and Polymarket liquidity mining: https://discourse.uma.xyz/t/funding-request-polymarket-clob-liquidity-mining-program/1943 · https://pm.wiki/sv/data/glossary/uma
- Kalshi event hierarchy and brackets (third-party): https://docs.allium.so/historical-data/predictions/kalshi/events · https://quantike.substack.com/p/basics-prediction-markets
- Kalshi market maker and liquidity programs: https://help.kalshi.com/faq/what-is-the-market-maker-program · https://help.kalshi.com/incentive-programs/liquidity-incentive-program
- Kalshi litigation overview (third-party, verify against dockets): https://pm.wiki/es/learn/is-kalshi-legal
- GTA VI markets on Kalshi and Polymarket: https://www.actionnetwork.com/prediction-markets/gta-6-release-date-live-odds-kalshi-vs-polymarket-analysis
- Manifold market maker: https://git.nunosempere.com/open.source/manifold/src/commit/0ecff1b581e0e02b13aa9fa7891f588a13aef48c/docs/docs/binary-markets.md · multiple choice p = 0.5 issue: https://manifold.markets/post/manifold-should-do-anything-other-t · numeric deprecation: https://manifold.markets/SG/will-manifold-remove-numeric-market
- Manifold sweepcash shutdown: https://gambling911.com/node/75064 · https://www.longtermwiki.com/wiki/E546
- Sweepstakes bans: https://track360.io/blog/sweepstakes-casino-market-statistics-2026 · https://www.sweepsy.com/news/9-states-consider-sweeps-casino-bans-2026/ · California AB 831: https://casinobeats.com/2025/10/13/california-sweepstakes-casino-ban-ab-831/
- DCM process: https://www.cftc.gov/IndustryOversight/TradingOrganizations/DCMs/dcmhowto.html · https://katten.com/so-you-want-to-apply-to-become-a-cftc-registered-designated-contract-market-dcm-heres-what-you-should-know · timelines and partner routes: https://fiftycentdollars.substack.com/p/regulatory-greenfield · https://sbcamericas.com/2026/06/17/novig-prediction-market-cftc-approval/
- Prototype: `apps/web-arcade/README.md`, `server/lmsr.ts`, `server/oracle.ts`, `shared/types.ts`
