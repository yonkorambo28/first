# Web market: screens and data

The build spec for `apps/web-market`, the plain prediction-market version. It combines the market
structure in `02-web-market.md` with two research notes:

- `research/prediction-market-ui.md`: how Polymarket, Kalshi and Manifold lay out their pages.
- `research/game-data-fields.md`: every field a game shows on its Steam wishlist / store page and its
  Roblox page, and which API returns it.

Both research notes were written without live access to those sites or APIs (the sandbox blocked them).
Items marked "check" below need one live look or test call before we rely on them.

## Principles

- **Look like a market, not a game.** Polymarket's bones (cards, outcome rows, right-rail ticket, tabs),
  Kalshi's rules summary and range ladders, Manifold's "chance after trade" line.
- **Show the game the way the player already knows it.** The game panel mirrors what the Steam wishlist
  row and store page show (and the Roblox experience page), using the same wording: Steam's own review
  label, Steam's own "Coming soon" text.
- **Every number has a source and a time.** Estimates are labelled as estimates and credited.
- **Coins, never dollars.** "$" appears only inside revenue ranges.

## Screens

### 1. Browse (`/`)

- Header: logo, search (games, studios), coin balance, profile.
- Chip row: All · Steam · Roblox · Launching this week · Resolving · Resolved.
- Sort: Trending · Volume · Launch date · Newest.
- Featured row: 3–5 upcoming launches as large cards with a chart.
- Card grid (3 columns, 1 on mobile). Each card is a wishlist row plus the market:

```
[capsule art]  Hollow Pines                        STEAM · in 3d
               Lanternfly Games · Co-op · Horror · Survival
               Very Positive (1,204) · $19.99 · Win · Deck ✓      ← same as the Steam wishlist row
Week-1 revenue
  $100K–250K   38%  ▲4   [Yes] [No]
  $50K–100K    27%  ▼2   [Yes] [No]
5 markets · 12.4K vol · 31 traders
```

  Roblox card: icon, name, creator + verified tick, genre, Like % · Active now · Visits, then the top two
  outcomes. Status chip in the corner once not open: Closed, Proposed, Disputed, Resolved: …, Void.

### 2. Event page (`/e/:slug`), one per game launch

Left column, top to bottom:

1. **Game panel** (see "Data we show" below): art, title, studio, Steam/Roblox link, launch date in
   Steam's wording, tags, platforms, review label, price, live stats, short description, screenshots.
2. **Market stats line:** volume · traders · status chip · share.
3. **Metric tabs:** one per market (Wishlists · Week-1 revenue · Month-1 revenue · Week-1 reviews ·
   Week-1 rating, or the Roblox set).
4. **Odds chart:** top 4 ranges, current % in the legend, ranges 1D / 1W / 1M / ALL. Vertical markers at
   Launch and Measure time.
5. **Outcome rows** in numeric order (never sorted by %), with a Ranges / "Or more" toggle:
   `$100K–250K   38%   ▲4   [Yes 38¢] [No 62¢]`. "Or more" view shows cumulative rows
   (`$100K or more  47%`). The player's position shows inline under the row it's in.
6. **Rules summary**, always visible (3 lines: what is measured, when, from which source) with
   "Full rules and edge cases" expanding below.
7. **Timeline stepper:** Listed · Launch · Trading closes · Measured · Proposed · Final.
8. **Game stats over time:** small charts of the real numbers we've recorded (reviews, players, visits,
   wishlist estimate), so people can see the trend they're betting on.
9. **Tabs:** Activity · Top holders · Comments (phase 2) · Related launches.

Right column: the trade ticket, sticky. On mobile it opens as a bottom sheet from any Yes/No button.

Resolved banner: `Resolved: $100K–250K · Read 142,310 at Nov 11 15:02 UTC · Source ↗`.
Dispute banner: `Proposed: 142,310 → $100K–250K · disputes close in 31h · Dispute`.

### 3. Trade ticket

```
$100K–250K · Week-1 revenue
[ Buy ]  Sell
[ Yes 38¢ ]  [ No 62¢ ]
Amount   [ 100 ] coins     [+10] [+50] [+100] [Max]
Avg price            40.1¢
Shares               249.4
Chance after trade   38% → 43%
To win               249 coins (2.49x)
[ Buy Yes · 100 coins ]
Play money. No cash value.
```

States: quoting, price moved (re-confirm), success toast with link to position, not enough coins,
market closed (ticket replaced by status and timeline). The Sell tab shows shares held, "You receive"
and profit/loss.

### 4. Portfolio and leaderboard

- Portfolio: coins, value of open positions, all-time profit/loss with a chart; positions table
  (Event · Outcome · Shares · Avg / Now · Value · P/L · status); tabs Open · Resolved · Activity.
- Leaderboard: weekly and all-time profit.

### Advanced mode

A toggle for experienced players, off by default. It adds a depth chart per outcome (how far the odds
move for a given stake; with our market maker this is a curve computed from the pricing, not an order
book), 1H chart ranges, exact share counts and price-impact figures on every row.

### Not copying

Order books as the default view, 1H chart ranges outside advanced mode, sportsbook promos and parlays, streak flames and
confetti, dollar signs on coins, deposit buttons, unsourced AI "market context", sorting ranges by %.

## Data we show

### Steam game panel

| Group | Field | Source | Refresh |
| ----- | ----- | ------ | ------- |
| Identity | Title, header art, developer · publisher, short description, screenshots, first trailer, Steam link | `IStoreBrowseService/GetItems` (fallback `appdetails`) | daily |
| Launch | Release text exactly as Steam shows it ("Coming soon", "Q1 2027", "Nov 4, 2026") | GetItems `release.coming_soon_display` (fallback `appdetails.release_date.date`) | every 6h before launch |
| | Early Access badge, demo available | GetItems | daily |
| Store facts | Top 5 user tags | GetItems `tags` + `IStoreService/GetTagList` for names | daily |
| | Price / discount / Free | GetItems `best_purchase_option` (fallback `appdetails.price_overview`) | 6h |
| | Platforms + Steam Deck status | GetItems `platforms` | daily |
| | Single / multi / co-op, controller support | `appdetails.categories` | daily |
| Live | Review label + "88% of 12,345" | GetItems `reviews.summary_filtered` (matches the store exactly) | hourly in week one, then 6h |
| | Playing now (after launch) | `ISteamUserStats/GetNumberOfCurrentPlayers` | 30 min after launch |
| Community (estimates, credited to Gamalytic) | Wishlists, followers; after launch copies sold and revenue | Gamalytic `/game/{appid}` | daily |
| History | Charts of reviews, players, wishlist estimate | our readings + Gamalytic history | — |

Steam's wishlist and store pages don't show wishlist counts, followers or wishlist rank, and no public
API has them. The only wishlist number available is Gamalytic's estimate (paid plan), so it's labelled
"Est. wishlists · Gamalytic".

### Roblox game panel

| Group | Field | Source | Refresh |
| ----- | ----- | ------ | ------- |
| Identity | Name, icon, thumbnail carousel, creator + verified tick, description, Roblox link | `games/v1/games`, thumbnails API | daily |
| Launch | Created, last updated, playable status | `games/v1/games`, playability status | hourly |
| Store facts | Genre · subgenre, server size, paid-access price, badge count | `games/v1/games` (`genre_l1/l2`, `maxPlayers`, `price`), badges API | daily |
| Live | Active now, visits, favorites | `games/v1/games` (`playing`, `visits`, `favoritedCount`) | 15 min (store daily peak) / hourly |
| | Like % and vote count | votes API | hourly |
| History | Charts of visits, favorites, active players | our readings | — |

Not available publicly: maturity/age label, events, game passes (documented versions need an API key).
Roblox has no pre-launch wishlist, so "launch" is the announced date or the first public reading.

## Changes needed in the data layer

1. Add Steam `GetItems` + `GetTagList` and `GetNumberOfCurrentPlayers` clients. **Check:** one live
   keyless call to confirm GetItems works without a key and the field shapes.
2. Review counts: the prototype uses `purchase_type=all`, which includes key activations and won't match
   the store. Show the store label from GetItems, and decide which count settles review markets (see
   question 2).
3. Extend `Snapshot` with Steam player count, Steam-only review counts, review label and price, and
   Roblox `maxPlayers`/`updated`.
4. Store a separate "game profile" (identity, store facts) refreshed daily, apart from the time-series
   readings.
5. **Check** Gamalytic field names for playtime and price once there's a key.

## Questions for the owner

1. **Gamalytic Starter (about $25/month).** It's the only source for the wishlist number. Without it the
   panel shows no wishlist figure and day-one wishlist markets are dropped. Recommended: yes.
2. **Which review count settles review markets.** The store's number (Steam purchases only, matches what
   players see) or all reviews including key activations (bigger, harder to reconcile). Recommended: the
   store's number, so the market agrees with the Steam page.
3. **Real games or demo games at first.** Recommended: list 5–10 real upcoming launches from day one,
   keeping the fictional ones only for local development.
4. **Comments.** In the first version or phase 2? Recommended: phase 2, with Activity and Top holders at
   launch.
