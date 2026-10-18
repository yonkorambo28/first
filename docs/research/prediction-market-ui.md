# Prediction market UI research

How Polymarket, Kalshi and Manifold lay out their main screens, and what our play-money Steam/Roblox launch market (`docs/02-web-market.md`) should copy.

**How this was researched, and its limits.** Every direct fetch of polymarket.com, kalshi.com, manifold.markets and their help and doc sites was blocked from this environment. Wikipedia and the Wayback Machine were blocked too. So this document is built from search-result excerpts: official help and doc pages where they turned up, plus third-party guides, review sites and mirror sites. Each claim is tagged:

- **[official]**: a Polymarket, Kalshi or Manifold page or doc, seen through search excerpts.
- **[secondary]**: a third-party guide, review or mirror.
- **[unverified]**: from my prior familiarity with these sites, with no source I could reach to confirm it. Check these on the live sites before building against them.

UIs on these sites change monthly. Treat exact labels as a starting point, not a spec.

---

## 1. Home / browse

**Polymarket**

- **Header tabs.** The current site shows Trending, Combos, Perps, Breaking and New, then a category row: Politics, Sports, Crypto, Esports, Finance, Geopolitics, Tech, Culture, Economy, Weather, Mentions and others ([polymarket.com search snapshot](https://polymarket.com/)) [official].
- **Sorting.** You can sort by trending, volume, liquidity, newest or ending soon. Category pages have a "Browse" menu: New, Trending, Popular, Liquid, Ending Soon, Competitive ([polymarket.com/predictions](https://polymarket.com/predictions)) [official].
- **Early-2026 redesign.** The homepage moved toward a carousel of featured events, a "Breaking News" strip driven by probability changes, and "Hot Topics" ranked by volume ([PANews](https://www.panewslab.com/en/articles/019cc7eb-115c-770e-9dfa-76fd8cd2e40a)) [secondary].
- **Card format** (from homepage snapshots) [official, via search excerpt]:
  - **Binary card:** thumbnail, title, one large "NN% chance" figure, and Yes and No buttons.
  - **Multi-outcome card:** the top two outcomes, each with its own % and a small Yes/No pair. Example: "Google 75% / Anthropic 23%".
  - **Footer:** volume as "$566K Vol.". Cards show either 24-hour or total volume ([polymarket.com/economy](https://polymarket.com/economy)).
  - **Not in snapshots:** an end date or a mini chart. A small bookmark icon and a "NEW" badge are [unverified].
- **Search** sits in the top bar. Search results are also cards [unverified].

**Kalshi**

- **Cards** show a question heading such as "Highest temperature in New York City today?", the leading bracket with a "1.86x 52%" style pair, the next bracket, then "$312,941 vol · 5 markets" ([kalshi.com/category/climate](https://kalshi.com/category/climate), [daily temperature](https://kalshi.com/category/climate/daily-temperature)) [official, via search excerpt].
  - The "1.86x" is almost certainly the payout multiple at the current Yes price (1 / 0.52 ≈ 1.9). No source states this.
  - A review site shows the same "Yes (2.19x) / No (1.70x)" convention ([sailgp.com Kalshi app review](https://sailgp.com/prediction-markets/kalshi/app)) [secondary].
- **Navigation** follows category, then sub-category pages (for example `/category/climate/daily-temperature`).
- **Video games is already a category.** The GTA VI release-date event is filed there ([kalshi.com GTA VI](https://kalshi.com/markets/kxgta6/gta-6-release-date/gta6)) [official].

**Manifold**

- **Feed.** A personalized feed plus browse with sort options (trending, new, closing soon, most traded) [unverified].
- **Cards** show creator avatar, title, a large probability for binaries or the top answers for multiple choice, trader count and volume [unverified].
- **Tone.** Manifold is the most "community" of the three: creator names everywhere, a comments preview on the card, and bounties. I couldn't verify its current card fields.

**Takeaway.** The card is the browse unit. It has a thumbnail, the title as a question, the headline probability (or the top 2 outcomes), and "Vol." in the footer, with categories as a chip row and a sort menu. Kalshi adds the market count and a payout multiple.

## 2. Event page with many outcomes

**Polymarket multi-outcome events**

- **Tabs below the chart.** The live GTA VI trailer-views event lists Market Context, Rules, Activity, Comments, Top Holders and Positions ([polymarket.com GTA VI event](https://polymarket.com/event/of-views-of-grand-theft-auto-vi-launch-trailer-on-day-1)) [official, via search excerpt].
  - This event is a range market on a game-launch-adjacent metric: brackets such as <20M, 20–40M, 40–60M and 60–80M, priced 1% / 88% / 12% / 2% ([PredScope mirror](https://predscope.com/event/of-views-of-grand-theft-auto-vi-launch-trailer-on-day-1)) [secondary].
  - It is the closest real-world precedent for our product.
  - Polymarket ran a second event for "lower strikes" after the first set went lopsided ([PredScope](https://predscope.com/event/of-views-of-grand-theft-auto-vi-launch-trailer-on-day-1-lower-strikes)). That is the bracket mis-sizing risk from our plan, in the wild.
- **Header:** image, title, total "Vol.", end date, and share/bookmark icons [unverified].
- **Outcome rows**, top to bottom by probability. Each row has a label, volume, a large "%" with a small ▲/▼ change, then two buttons, "Buy Yes 52¢" and "Buy No 49¢" [unverified, but consistent with the mockup generator's description of percentages with direction-change indicators ([builder.pmxt.dev](https://builder.pmxt.dev/), [fake-a-polymarket](https://fake-a-polymarket.com/)) [secondary]].
- **Row expansion.** Clicking a row expands it with that outcome's order book and chart [unverified].
- **Chart:** multi-line for the leading outcomes, with a legend of colored labels and current %. Time ranges are 1H, 6H, 1D, 1W, 1M, ALL (per a Polymarket-style mockup tool's description, [builder.pmxt.dev](https://builder.pmxt.dev/)) [secondary].
- **Rules** state the question, the resolution source and edge cases. Mirror sites show the resolution source and end date pulled out as separate fields, for example "Resolution date: June 30, 2026 at 12:00 AM UTC", and source-unavailable clauses ("market will remain open until it returns") ([Orrery mirror](https://www.orrery.me/markets/will-polymarket-mindshare-hit-90-by-june-30)) [secondary].
- **Comments** sit at the bottom. One guide says they can be filtered by holders ([startpolymarket](https://startpolymarket.com/guides/how-to-trade/)) [secondary].
  - Commenters show their position ("1.2K Yes") [unverified]. The API's comment schema carries a per-commenter position size, which supports this ([Polymarket docs](https://docs.polymarket.com/api-reference/markets/list-a-markets-top-holders.md)) [official].
  - Top Holders groups the biggest positions by outcome (same doc).
- **Market Context** appears as a tab. I could not find any launch note or description of what it contains [unverified]; it looks like a news/background summary.
- **Related markets** sit in the right rail or below [unverified].

**Kalshi range ladders** (temperature, Fed rate, Bitcoin price)

- **Two ladder shapes**, both documented in guides ([depthfeed](https://depthfeed.com/resources/kalshi-price-data-explained)) [secondary]:
  - **Bands.** Mutually exclusive ranges with open-ended "X or below" / "Y or above" tails. Exactly one settles Yes, and the prices sum to about $1.
  - **"Above X" strikes.** Cumulative; each rung is P(value > strike).
- **Labels are human-friendly:** a strike stored as 63499.99 is shown as "$63,500 or above" (same source).
  - Our plan's Brackets / Ladder toggle maps to these two shapes exactly.
- **Rows.** The page shows "Chance" as the last traded Yes price, as a percentage. Next to it are boxes with the best current offers to buy Yes and to buy No, colored blue and purple in the period an academic paper studied ([Whelan, "Makers and Takers"](https://www.karlwhelan.com/Papers/Kalshi.pdf); [UCD WP](https://www.ucd.ie/economics/t4media/WP2025_19.pdf)) [secondary, academic].
  - The current Kalshi palette leans green/red for Yes/No [unverified].
- **Rules summary.** Each market has one, giving the measured value, the timeline and the verification source. A "View full rules" link opens the full contract terms ([Kalshi help: Rules Summary](https://help.kalshi.com/markets/markets-101/market-rules/rules-summary)) [official].
  - Dates for each stage (listing, open, close, determination, settlement) are in that section ([Kalshi: market life cycle](https://news.kalshi.com/p/what-is-the-market-life-cycle)) [official].
  - Close time and determination time can differ, because Kalshi waits for the source agency's finalized data ([Kalshi Market FAQs](https://help.kalshi.com/en/articles/13823821-market-faqs)) [official].
  - A "Timeline and payout" block is reported by third parties [secondary].
- **Data shown per bracket** (from data products that mirror the page): yes/no bid and ask, last price, 24h and lifetime volume, open interest ([Apify Kalshi scraper](https://apify.com/scrapersdelight/kalshi-markets-scraper)) [secondary].

**Manifold multiple choice**

- **Answer rows** each show a probability bar and a bet button.
- **Mutually exclusive answers** ("sum to 100%") vs **independent sets** are a creator setting (see our plan's table).
- **Layout:** the chart sits above the answers. Comments, trades and positions tabs are below [unverified].

## 3. Trade ticket

**Polymarket**

- **Placement.** A Buy/Sell panel sits in the right-hand column on desktop ([Medium, Polymarket getting started](https://medium.com/polymarket/getting-started-on-polymarket-334bfeec158a); old, 2020) [official, dated].
- **Order type.** A Market/Limit dropdown at the top right of the order box ([startpolymarket](https://startpolymarket.com/guides/how-to-trade/)) [secondary].
- **Market order:**
  - **Sizing.** A dollar amount input with quick buttons +$1, +$5, +$10, +$100, or a custom amount ([startpolymarket](https://startpolymarket.com/guides/how-to-trade/)) [secondary].
  - **Payout line:** "To win", for example "Buying $5 of DEN at 66¢ → To win $7.58" (same source) [secondary].
  - **Tread's docs** describe "Total" and "To profit" lines, and say you can size in USDC or in shares ([Tread docs](https://docs.tread.fi/prediction-markets/polymarket/submitting-a-polymarket-order)) [secondary].
  - **"Avg. price" and "Shares"** lines in the panel [unverified].
- **Limit order:** a limit price in ¢, number of shares, and an optional expiration. Limit orders need at least 5 shares; market orders have a $1 minimum (same guides) [secondary].
- **1-Tap mode:** preset sizes ($1 / $5 / $100, editable), with the payout printed on each button ([startpolymarket crypto guide](https://startpolymarket.com/guides/polymarket-for-crypto-traders/)) [secondary]. This is a sportsbook-style shortcut.
- **Mobile:** the ticket opens as a bottom sheet when you tap Yes/No on a row [unverified].

**Kalshi**

- **Flow.** Pick a strike, then Yes or No, then size in **dollars or contracts**. A quick order fills at the best available price and may sweep several prices ([Kalshi help: Quick Order Purchase](https://help.kalshi.com/en/articles/13823812-quick-order-purchase)) [official].
- **Slip contents.** The slip updates live with cost and "Payout if Yes" ([thelines.com](https://www.thelines.com/prediction-markets/kalshi/how-does-kalshi-work/)) [secondary]. A review recommends checking price, fees, maximum loss and potential payout before submitting ([ats.io](https://ats.io/prediction-markets/kalshi/)) [secondary].
- **Limit orders** set your maximum price.

**Manifold**

- **Ticket preview.** Shows bet amount, payout and **price impact** (new probability) before you confirm ([cryptoslate review](https://cryptoslate.com/prediction-markets/manifold-predictions-review/)) [secondary].
- **Limit orders** are tucked behind a "%" button, per users ([Manifold question](https://manifold.markets/ian/why-dont-you-place-more-limit-order)) [secondary].
- **Fills** hit limit orders first, then the AMM ([Manifold FAQ](https://docs.manifold.markets/faq)) [official].
- **Price impact matters for us.** On an AMM, as with our LMSR, the "probability after your trade" line is the most important number on the ticket. Polymarket and Kalshi lack it because they use order books.

**Sportsbooks (DraftKings/FanDuel)**

I found nothing citable on their slip internals. Two widely known patterns carry over [unverified]:

- a persistent slip that collects selections;
- stake chips with a large "To Win" next to the stake.

Polymarket's 1-Tap mode is the prediction-market version of this.

## 4. Portfolio, activity, leaderboard, profile

- **Polymarket portfolio**
  - **Columns** (legacy docs): Price Avg | Cur., P/L $ | %, and Value initial vs current ([legacy docs](https://legacy-docs.polymarket.com/getting-started/monitoring-positions)) [official, old].
  - **Current guides** add total portfolio value, available cash and a P&L chart with 1D/1W/1M/ALL ranges ([launchpoly](https://launchpoly.com/guides/track-polymarket-portfolio)) [secondary].
  - **"Value"** is marked to the current bid ([newspoly](https://www.newspoly.net/blog/polymarket-portfolio-management)) [secondary].
- **Polymarket profile:** headline stats "Positions Value", "Biggest Win" and "Profit/Loss", then a positions table with a "Current" column, and an activity tab ([polymarket.com/@portfolio](https://polymarket.com/@portfolio)) [official, via search excerpt].
- **Leaderboard.** Polymarket has an official one ranked by P&L and volume over day/week/month/all [unverified]. Third-party boards add ROI and win rate ([PredictFolio](https://polymark.et/product/predictfolio)) [secondary].
- **Kalshi portfolio value** is explained in a help article ([Kalshi help](https://help.kalshi.com/en/articles/13823821-understanding-your-portfolio-value)) [official, title only seen].
- **Manifold leagues** run as monthly seasons with divisions from Bronze to Masters, promotion and demotion per cohort, and scoring on profit in ranked markets only ([Manifold leagues guidelines](https://manifold.markets/community-guidelines/leagues); [DeepWiki](https://deepwiki.com/manifoldmarkets/manifold/5.3-league-system)) [official / secondary]. This is the best model for a play-money leaderboard.
- **Activity:** each market has an Activity tab (live trade feed). Polymarket also has a site-wide activity feed [unverified].

## 5. Terminology, numbers, color, density

**Probability vs price**

- Both platforms show "% chance" as the headline and ¢ on the buttons.
- Yes + No ≈ 100¢ ([polymarket101](https://www.polymarket101.com/en/docs/concepts/how-to-read-odds/)) [secondary].
- On Kalshi, "Chance" is the last trade, while the buttons show the best offer. So the % and the ¢ can differ by the spread ([Whelan](https://www.karlwhelan.com/Papers/Kalshi.pdf)).
- We have no spread: with LMSR, the displayed % equals the marginal price. We can show one number honestly, and the button can show the price you'd actually pay.

**Payout framing**

- Polymarket: "To win $X" [secondary].
- Kalshi: "Payout if Yes" and multipliers like "1.86x" on cards [official / secondary].
- One guide insists Kalshi avoids sportsbook "$10 to win $18" framing ([dimers](https://www.dimers.com/prediction-markets/kalshi/odds)) [secondary], which conflicts with the multipliers on Kalshi's own category pages. Kalshi has evidently moved toward payout multiples on cards.

**Volume and money formatting**

- "$566K Vol.", "$312,941 vol": K/M abbreviations on cards, full numbers on detail pages [official snapshots].
- Manifold prefixes play money "M" or Ṁ ("M100 = $1" for charity) ([gipsyteam](https://www.gipsyteam.com/poker/manifold-review)) [secondary].

**Color**

- Polymarket uses green for Yes / buy, red for No / sell, and blue as the brand accent. Chart lines take one distinct color per outcome [unverified].
- Kalshi used blue and purple for Yes and No in the period the academic paper studied [secondary].
- Both have dark mode [unverified].
- Typography: one sans-serif face, tabular numbers, % set much larger than labels [unverified].

**Density**

- Dense, table-like rows, small thumbnails, no illustrations.
- Hierarchy comes from number size, not decoration.

## 6. Trust and clarity

- **Rules up front, full text one click away.** This is Kalshi's pattern ([Rules Summary](https://help.kalshi.com/markets/markets-101/market-rules/rules-summary)).
- **Named source and exact UTC times.** Both platforms name the resolution source and give exact UTC times.
- **Status vocabulary.** Kalshi's documented market statuses are open, closed (awaiting determination), determined (settlement timer running), disputed, amended (re-determined after dispute) and finalized ([Kalshi API docs: market lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle)) [official]. These are API statuses; the on-page wording may differ.
- **Polymarket's resolution flow** is proposal → 2-hour challenge period → (if disputed) a second proposal → UMA vote ([Polymarket docs: Resolution](https://docs.polymarket.com/concepts/resolution)) [official].
  - The page shows the proposed outcome during the challenge window [unverified as a label].
  - 99.78% of markets resolve without dispute ([Polyflux](https://polyflux.io/blog/polymarket-uma-resolution-disputes/)) [secondary].
- **Edge-case clauses inside the rules,** for example "if the source is unavailable the market stays open" ([Orrery mirror](https://www.orrery.me/markets/will-polymarket-mindshare-hit-90-by-june-30)).
- **Outcome on the page after settlement.** Kalshi shows the final result and determination on the market page once settled ([Kalshi Market FAQs](https://help.kalshi.com/markets/market-faqs)) [official].

---

## What we should copy

Copy the bones from Polymarket: cards, outcome rows, a right-rail ticket and tabs. Copy the ladder semantics and rules summary from Kalshi. Copy the price-impact preview and leagues from Manifold.

### A. Browse (`/`)

```
┌ Header ──────────────────────────────────────────────────────────────┐
│ [logo] Markets   [ Search games, studios… ]      Coins 1,240  [@me]  │
├──────────────────────────────────────────────────────────────────────┤
│ Chips: All · Steam · Roblox · Launching this week · Resolving · New  │  ← category row, Polymarket-style
│ Sort ▾ Trending | Volume | Launch date | Newest | Recently resolved  │  ← "Launch date" replaces "Ending soon"
├──────────────────────────────────────────────────────────────────────┤
│ Featured (carousel of 3–5 launches; large card with chart)           │  ← solves "thin activity"
├──────────────────────────────────────────────────────────────────────┤
│ Card grid (3 col desktop / 1 col mobile):                            │
│ ┌──────────────────────────────────┐                                 │
│ │ [capsule art 64px] Hollow Pines  │  ← Steam capsule / Roblox icon  │
│ │ STEAM · Launches Nov 4 (in 3d)   │  ← platform tag + countdown     │
│ │ Week-1 revenue                   │  ← headline metric for the card │
│ │  $100K–250K   38%  ▲4   [Yes][No]│  ← top 2 brackets, like PM      │
│ │  $50K–100K    27%  ▼2   [Yes][No]│                                 │
│ │ 6 markets · 12.4K Vol. · 31 traders │ ← market count (Kalshi), vol  │
│ └──────────────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Status chip in the card corner when not open: `Closed`, `Proposed`, `Disputed`, `Resolved: $100K–250K`, `Void`.

### B. Event page (`/e/hollow-pines-steam`)

```
┌──────────────────────────────────────────────┬───────────────────────┐
│ [art] Hollow Pines: Steam launch             │ TRADE TICKET (sticky) │
│ Studio · Steam ↗ · Launch Nov 4 15:00 UTC    │ (see C)               │
│ 12.4K Vol. · 31 traders · [Open]  [share]    │                       │
├──────────────────────────────────────────────┤                       │
│ Metric tabs: Wishlists | Wk-1 revenue |      │                       │
│   Wk-1 reviews | Wk-1 % positive | Binaries  │ ← one tab per group   │
├──────────────────────────────────────────────┤                       │
│ CHART  multi-line, top 4 brackets + legend   │                       │
│ with current %. [1D 1W 1M ALL] (no 1H: thin) │                       │
│ Vertical marker at "Launch" and "Measure"    │ ← ours, very useful   │
├──────────────────────────────────────────────┤                       │
│ View: (•) Brackets  ( ) Ladder               │ ← Kalshi's 2 shapes   │
│ Outcome         Chance  24h    Buy           │                       │
│ $250K or more     9%    ▲1   [Yes 9¢][No 91¢]│ ← sorted by value,    │
│ $100K–250K       38%    ▲4   [Yes 38¢][No 62¢]  not by % (ranges     │
│ $50K–100K        27%    ▼2   [Yes 27¢][No 73¢]  must read in order)  │
│ …                                            │                       │
│ Under $10K        3%    —    [Yes 3¢][No 97¢]│                       │
│ Your position: 40 sh $100K–250K (avg 31¢)    │ ← inline, Polymarket  │
├──────────────────────────────────────────────┤                       │
│ RULES SUMMARY (always visible, 3 lines)      │ ← Kalshi pattern      │
│ Resolves to bracket containing Gamalytic     │                       │
│ gross revenue at launch+7d (Nov 11 15:00 UTC)│                       │
│ Trading closes Nov 5 15:00 UTC.              │                       │
│ [Full rules & edge cases ▾]  Source: Gamalytic ↗                     │
│ TIMELINE  ● Listed ● Launch ○ Close ○ Measure ○ Proposed ○ Final    │ ← stepper, maps to status
├──────────────────────────────────────────────┤                       │
│ Tabs: Comments (holder badges) | Activity |  │                       │
│       Top holders | Related launches         │                       │
└──────────────────────────────────────────────┴───────────────────────┘
```

Notes:

- **One number per row.** Since LMSR has no spread, "Chance" and the Yes ¢ are the same. Show both anyway: traders expect the ¢ on the button.
- **Ladder view** rows read "≥ $100K?  47%  [Yes 47¢][No 53¢]". Their tooltip says "= sum of brackets above".
- **When resolved:** the winning row is highlighted with a ✓. A banner on top reads `Resolved: $100K–250K · Read 142,310 at Nov 11 15:02 UTC · Source ↗`.
- **During the dispute window:** the banner reads `Proposed: 142,310 → $100K–250K · disputes close in 31h · [Dispute]`.

### C. Trade ticket (right rail; bottom sheet on mobile)

```
┌ $100K–250K  (Week-1 revenue) ───────────┐
│ [ Buy ]  Sell                           │ ← tabs
│ [ Yes 38¢ ]  [ No 62¢ ]                 │ ← toggle, green / red
│ Amount        [   100 ] coins           │
│ [+10] [+50] [+100] [Max]                │ ← quick-add chips
│ ─────────────────────────────────────── │
│ Avg price           40.1¢               │
│ Shares              249.4               │
│ Chance after trade  38% → 43%           │ ← Manifold price impact; key for AMM
│ To win              249 coins (2.49x)   │ ← PM "to win" + Kalshi multiple
│ [ Buy Yes · 100 coins ]                 │ ← one primary button, states verb+side
│ Play money. No cash value.              │
└─────────────────────────────────────────┘
```

- **States:**
  - Quoting (debounced call to `POST /quote`).
  - Price moved: "Price moved to 41¢. Review" and re-confirm.
  - Success toast: "Bought 249 Yes @ 40.1¢ · View position".
  - Insufficient coins.
  - Market closed: ticket replaced by the status and timeline.
- **Sell tab:** shows the shares held, "You receive", and P/L on those shares.
- **Basket (phase 1+):** multi-select checkboxes on bracket rows ("$50K–250K, 2 brackets, 65%") feed the same ticket.
- **No limit tab in MVP.** Add "Limit" in phase 3 as a small dropdown, as Polymarket does.
- **Mobile:** tapping Yes/No on a row opens a bottom sheet with the ticket at 70% height. The chart stays peeking above.

### Portfolio and leaderboard (brief)

- **Portfolio:** coins, positions value, all-time P/L, and a P/L chart (1W/1M/ALL). Positions table: Event · Outcome · Shares · Avg | Cur · Value · P/L coins and %, plus a status chip. Tabs: Open, Resolved, Activity.
- **Leaderboard:** weekly and all-time profit, with Manifold-style monthly leagues in phase 2. Add a calibration column later.

### Things NOT to copy

- **Order-book UI.** Skip order book tabs, bid/ask depth and "spread" language. We have no book, and an empty depth chart looks dead.
- **Sportsbook mechanics.** No promos, odds boosts, parlays/"Combos", confetti, streaks or "Hot" flames. They push toward gambling, and our audience may be 13+.
- **Dollar signs on play money.** Use "coins" consistently. Revenue brackets are the only "$" on the page.
- **1H / 6H chart ranges and live tickers.** With dozens of traders they show flat lines. Start at 1D.
- **Sorting brackets by probability**, as Polymarket does for candidates. Ranges must stay in numeric order.
- **Perps, crypto wallet flows, KYC prompts and "deposit" buttons** in the header.
- **A "Market Context" AI summary,** until we can source it. A wrong summary next to rules text undermines trust.
- **Multiplier-only framing** (Kalshi cards). Always show the % next to it.
