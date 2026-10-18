# 03 — The Launch Track (casino / racetrack track)

Plan for `apps/web-casino`: a walkable web venue where upcoming Steam and Roblox launches run as horses, players bet play money at windows and tables, and a bookie NPC quotes the lines. Data, settlement, accounts and progression come from `apps/web-arcade` (later `packages/*`, see `04-shared-platform.md`).

## Summary

- **Each launch week is a race.** The games launching that week are the field, and they're ranked by a single public metric: Steam week-one review count, or Roblox week-one visits. Players bet win/place/show in a parimutuel pool. The race "runs" across the week: each 6-hour oracle reading moves the horses on the Big Board, so a bet you place on Monday is something you watch, not just something you wait for.
- **Four formats to start with.** The race card (parimutuel W/P/S), the bookie's over/under lines, head-to-head matchups, and a range table, which is the existing LMSR bucket market laid out like a roulette betting layout. Exactas and trifectas come later, once pools are deep enough.
- **The venue.** A 2D top-down pixel-art venue built with Phaser 4 and Tiled maps, a Colyseus room server, a React overlay for bet slips, and Kenney CC0 art. Not 3D.
- **The bookie.** Scripted dialogue for everything that touches coins. An optional Claude-driven flavor layer can be added later. It can only repeat numbers returned by engine tools, and those numbers are checked on the server before anything is shown.
- **Safety.** Play money only: no purchases, no prizes, no cash-out. Age gate (recommended 18+). The prototype's random-weighted daily crate becomes a flat allowance. No slots, no spinning reveals, no loss-chasing prompts.
- **MVP.** One room (grandstand plus bookie booth) and one format (race card). About 5 weeks for one developer.

## Betting formats

| Format | Venue spot | Odds / payout | Settles from | Phase |
| --- | --- | --- | --- | --- |
| **Race card: Win / Place / Show** | Grandstand tote windows | Parimutuel pool, house-seeded | Rank of the field on `reviews_w1` (Steam) or `visits_w1` (Roblox) | MVP |
| **Bookie over/under** | Bookie's booth | Fixed odds locked at bet time, line taken from the LMSR distribution | One game's metric versus the line | 2 |
| **Head-to-head** | Matchup table | Fixed odds from P(A > B) | Two games, same metric | 2 |
| **Range table** | Roulette-style table | Existing LMSR: a share pays 1 coin, cost = price | Existing bucket market (`engine.buy`) | 2 |
| Exacta / trifecta | Grandstand | Parimutuel pool per ordered combination | Top 2 / top 3 in order | 3 |
| Not doing: parlays, betting while a race is running, random "launch roulette" spins, slots | | | | |

### Race card (the core loop)

- **Field.** Every tracked launch in a calendar week on one platform, with 4 to 10 horses. Platforms are never mixed, because Steam reviews and Roblox visits can't be compared. If a week has fewer than 4 entries, it becomes head-to-heads instead.
- **Post time.** The earliest launch in the field. Betting closes then, and there is no in-race betting. The result is official once every horse has its launch+7-day reading.
- **Win pool.** With total pool `W`, takeout `t`, and `Wᵢ` coins bet on horse `i`, a winning ticket returns `W(1−t) / Wᵢ` per coin. The board shows odds as `W(1−t)/Wᵢ − 1` to 1. These follow standard parimutuel rules, where real tracks take 15–22% ([Wikipedia](https://en.wikipedia.org/wiki/Parimutuel_betting), [Covers](https://www.covers.com/horse-racing/win-place-and-show-wagering)). With play money I recommend `t = 0` (see open questions).
- **Place and show pools.** These use the profit-split method from US racing rules ([Kentucky 810 KAR 6:020](https://apps.legislature.ky.gov/law/kar/810/006/020.pdf)). For place, take the net pool, subtract the stakes on the top two finishers, split what's left in half between the two horses, and each ticket gets its stake back plus its share. Show works the same way with three horses. Payouts never go below 1.05× (a "minus pool"), and the house covers the difference. Place needs at least 4 horses and show at least 5.
- **House seed (morning line).** An empty pool has no odds, and early on the venue will be quiet. At open, the house puts S coins (e.g. 500) into each pool, split by morning-line probabilities. Those probabilities come from pre-launch wishlists or followers through a simple log model. Whatever the house wins is burned, which also works as a coin sink.
- **Edge cases.** Tied values are a dead heat and the payout is split. If a game's launch slips past post time, or it never gets a reading, it's scratched and bets on it are refunded.
- **Settlement reuse.** `settlementValue(mk, game, snaps)` in `server/oracle.ts` only reads `mk.metric` and `mk.measureAt`. So each horse gets a synthetic `Market` with `metric: "reviews_w1"`, and the race ranks the values that come back. Every Snapshot `collect()` saves becomes a frame of the live race.
- **Why it's fun.** Real underdogs (a cult indie can pass a hyped launch), a week of standings to watch, and everyone cheering at the same board.

### Bookie lines: over/under

- The line is the median of the game's LMSR bucket distribution. Within a bucket it's interpolated linearly, so the line reflects what the crowd thinks. Both sides are quoted at decimal 1.91 (roughly a −110 vig, which acts as a coin sink).
- Alternate lines are priced at `(1 − vig) / p`, where `p` comes from the same cumulative distribution. Odds lock when the bet is placed.
- Each line has a stake cap. The bookie moves the line by one step when one side carries more than 65% of the money.
- **Why it's fun.** It's easy to read ("Over 1,850 reviews?"), it works for a single player, and it gives the bookie something to talk about.

### Head-to-head

- "Hollow Pines vs Neon Drift: more week-one reviews?" Both games must be on the same platform and the same metric.
- P(A > B) comes from Monte Carlo over the two LMSR distributions, assumed independent and uniform within each bucket. Each side is quoted at `(1 − vig) / p`.
- **Why it's fun.** Rivalries. It also fills weeks that are too thin to make a race.

### Range table

- This is the existing LMSR market under a new skin. The five buckets are laid out as a felt betting layout, and players drop chips on them.
- It uses `engine.quote` / `engine.buy` / sell unchanged, so cash-out still works.
- There is no wheel spin. The result arrives when the oracle settles, shown as a plain highlight with the source number next to it.

### Exacta / trifecta (phase 3)

Payout is the net pool divided by stakes on the exact ordered combination. A 6-horse field has 30 exactas and 120 trifectas, so these only work with a few hundred players per race.

## The venue

**2D top-down, not 3D.** Gather's top-down rooms, WorkAdventure's Tiled maps with proximity bubbles ([WorkAdventure](https://workadventu.re/gather-vs-workadventure)), and Habbo / Club Penguin's small themed rooms show that 2D pixel art carries a social venue fine. It's cheap to make, readable on a phone, and easy to extend: a new room is a new Tiled map. Isometric looks nicer, but it doubles the art and depth-sorting work. Revisit it once the loop is proven.

Borrow: walk-up-to-activate and spatial conversations (Gather / WorkAdventure); preset safe chat and layered moderation ([Club Penguin](https://blog.disneygeek.com/?p=55590)); small named rooms with seats (Habbo); one glanceable board of everything live, without the slot reels, timers or bonus pop-ups (social casino lobbies); emotes and simple avatar customization (Roblox hangouts).

**Rooms**

1. **Entrance and cashier.** Age gate. The daily allowance is collected here as a flat amount. House rules are posted.
2. **Grandstand.** The Big Board shows this week's race card with live odds, and the track strip animates horses from oracle readings. Tote windows take W/P/S bets.
3. **Paddock.** One stall per horse, with the store art, trailer link, wishlists/followers, studio, and the Gamalytic credit.
4. **Bookie's booth.** Over/unders, explanations, and stories about each game.
5. **Tables.** Matchup table and range table. You take a seat, which opens the table's chat and bet panel.
6. **Lounge / bar.** Room chat, the replay screen of the last race's photo finish, and NPC patrons for when the room is empty.
7. **Trophy room.** Badges, past race winners, leaderboards, and your own ticket history.

Walking is never required. A "Go to…" menu and a bottom bar reach every window and table directly, which matters for mobile and accessibility.

**Chat.** Text only, scoped to the room or the seated table, with preset emotes and phrases. No voice, no DMs at launch. Server-side profanity filter, report and mute.

**A player's first five minutes**

1. They land at the entrance, confirm their age, pick an avatar, and the cashier hands over 1,000 starting coins. The bookie waves from the next room.
2. A floor arrow leads to the grandstand. The Big Board shows "Race 14 — Steam, week of Nov 2 — 7 runners — post time Tue 17:00 UTC." A one-line tooltip explains win, place and show.
3. They step into the paddock and look at two stalls, one with 40k wishlists and one with 3k plus a cult following.
4. At the tote window they put 50 on the longshot to show. The slip reads "Pays about 4.2× if it finishes top 3. Odds move until post time." They tap **Lock in**.
5. At the booth, the bookie says: "Tote's got your horse at 9 to 1 to win. The favorite's line is over/under 2,100 reviews. Want me to explain the show pool?" They wander into the lounge and see other people's tickets in the feed. A toast says the race runs from Tuesday and they can watch the board move.

## The bookie

**Recommendation: scripted first, Claude-driven flavor later.**

- **Scripted dialogue tree (MVP).** Covers greet, "what's running", "explain W/P/S", "quote me <game>", and "how did my ticket do". Every number is filled in from engine calls. It costs nothing, can't make anything up, and is easy to review for tone.
- **LLM layer (phase 2).** Only for open questions like "tell me about this studio" or "why is this a longshot?". It is grounded in a weekly fact sheet per game (store blurb, studio history, current lines).
- **Model.** I recommend Claude Opus 5.5 (`claude-opus-5-5`) at low effort, with Claude Haiku 5.5 (`claude-haiku-5-5`) as the cheap option. The choice is the owner's.
- **Cost.** At ~3k cached + ~2k fresh input and ~300 output tokens per turn: Opus 5.5 ($4 / $20 per M; cache reads $0.20) is about $0.015 a turn (~$150 per 10k turns); Haiku 5.5 ($0.10 / $0.50 per M) is under $0.001. Cap at ~20 LLM turns per user per day.

**Guardrails for the LLM layer**

- The model only has read tools: `get_lines(gameId)`, `get_race(raceId)`, `get_game_facts(gameId)`. It cannot place bets. A bet only happens when the player taps a UI button, which builds the slip from engine data.
- **Number check.** Before the reply is shown, the server pulls every number and odds string out of it and matches each one against the tool results from that turn. Any mismatch means the reply is dropped and replaced with the scripted quote.
- **System prompt rules.** Never invent or estimate odds. Never promise wins or call a bet a "lock". Never push bigger stakes. Never mention real money, crypto or prizes. If the player says they're chasing losses, are broke, are upset, or seem underage, the bookie suggests a break and points to the allowance. It stays in character but drops the act on safety topics.
- Inputs are treated as untrusted. Game descriptions are data, not instructions. Prompt caching is used for the static persona and the weekly fact sheet.

## Tech stack

| Layer | Pick | Why |
| --- | --- | --- |
| World renderer | **Phaser 4** | First-party Tiled loader with orthogonal and isometric maps, cameras, input, tweens and arcade physics in one package ([Phaser tilemaps](https://cdn.jsdelivr.net/npm/phaser@4.2.0/skills/tilemaps/SKILL.md)). PixiJS is only a renderer, so Tiled needs a third-party package ([pixi-tiledmap](https://cdn.jsdelivr.net/npm/pixi-tiledmap@2.4.0/README.md)) and the rest would be our own code. Three.js / R3F means 3D asset cost and weaker phone performance for no gameplay gain. |
| UI | React overlay | Reuse the bet slip, toasts and profile from `web-arcade/client`. Phaser draws the world; React draws the panels. |
| Room server | **Colyseus** | Authoritative rooms, delta-synced state and matchmaking on Node/TS next to the Express API, with official Phaser tutorials ([Colyseus + Phaser](https://docs.colyseus.io/tutorial/phaser/basic-player-movement)). PartyKit is a good fit for Cloudflare, but it splits our hosting. Socket.IO would mean rebuilding rooms and state sync. |
| Money | Existing engine HTTP API | Colyseus holds positions, seats and chat **only**. Coins never move through the room server. |
| Maps | Tiled (`.tmj`) | One map per room. Doors switch Colyseus rooms. |
| Art | Kenney CC0 packs (Roguelike Indoor, characters) ([OpenGameArt](https://opengameart.org/content/roguelike-indoor-pack)) + a few commissioned pieces (Big Board, bookie) | CC0 has no licensing traps. Avoid LPC sprites unless we accept CC-BY-SA / GPL terms. |
| Mobile | Tap-to-walk with easystar.js pathfinding, the "Go to…" menu, portrait-safe HUD | Most play will be short visits on phones. |

## Safety & legal

Not legal advice. This needs a lawyer before public launch, especially for anything beyond free coins.

- **No value in, no value out.** Coins can't be bought, sold, transferred, cashed out or swapped for prizes. That includes merch and gift cards. Social casinos that use non-redeemable coins only are generally outside gambling law. Redeemable "sweeps coins" are what US states are now banning: six states in 2026 per industry reports ([gambling.com](https://www.gambling.com/us/sweepstakes-casinos/legal), [Bright Side](https://brightsideofnews.com/gambling/news/sweepstakes-casino-ban-us-states-2026/)). Keep it that way, including through any future "season prizes".
- **Age.** I recommend 18+ (self-declared, with age-checked OAuth where available) for this version specifically. Uncertain points:
  - Australia has rated games with interactive simulated gambling R 18+ since 22 Sep 2024 ([Classification Board](https://classification.gov.au/about-us/media-and-news/news/new-classifications-for-gambling-content-video-games)).
  - Roblox puts even unplayable casino content behind its 17+ label ([Roblox guidelines](https://create.roblox.com/docs/production/promotion/experience-guidelines)).
  - Research links teen use of simulated gambling to later gambling problems, though the evidence is correlational ([King et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9517771/)). The UK Gambling Commission found 11% of 11–16s played gambling-style social games ([UKGC via iGB](https://igamingbusiness.com/casino-games/ukgc-cites-concerns-over-children-and-gambling/)).
  - The younger audience belongs in the Roblox-native track, not here.
- **Design rules** (these bind the design):
  - Replace `rollCrate` (random 100/200/400/1000) with a flat daily allowance.
  - No slots, wheels or card games of chance, and no spin or near-miss animations. Near-misses push at-risk players to bet more ([Frontiers 2024](https://doaj.org/article/059ba8f13bc8445e8b43286fb741199d)).
  - No countdown "bet now" bonuses and no loss-chasing offers.
  - No streak bonuses tied to stake size. Streaks count correct calls, not coins wagered.
  - Session-length reminders after 45 minutes, a visible ticket history, and a self-serve cool-off (24h / 7d).
  - Stake cap per bet (e.g. 20% of balance).
- **Framing.** Forecasting game launches, not gambling; no real-money betting ads or affiliates; no Steam/Roblox logos implying endorsement; Gamalytic credit wherever its numbers appear.

## MVP & roadmap

| Phase | Scope | Effort (1 dev) |
| --- | --- | --- |
| **0. Spike** | Phaser + Colyseus: two avatars walk one Tiled room, sit, chat | 1 week |
| **1. MVP** | Entrance and grandstand rooms; race card W/P/S for Steam `reviews_w1`; house seed; Big Board with live race animation from snapshots; scripted bookie; flat allowance; age gate; room chat; mobile "Go to…" | 4 weeks |
| **2. Tables** | Bookie over/under, head-to-head, range table, Roblox `visits_w1` races, paddock, lounge, trophy room, optional Claude bookie | 4–5 weeks |
| **3. Depth** | Exactas / trifectas, seasonal leaderboards (no prizes), avatar cosmetics earned through play, isometric art pass if retention justifies it | 6+ weeks |

MVP success test: 30 weekly actives, at least half of them returning to watch a race they bet on, and median pool depth of at least 3× the house seed.

## Folder layout

```
apps/web-casino/
  README.md
  package.json            # depends on web-arcade engine/oracle (later @launch/core)
  server/
    index.ts              # Express API + Colyseus server on one port
    rooms/VenueRoom.ts    # positions, seats, chat, emotes (no coins)
    rooms/state.ts        # Colyseus schema
    formats/racecard.ts   # fields, post time, W/P/S pools, morning line, dead heats, scratches
    formats/lines.ts      # over/under + head-to-head pricing from LMSR distributions
    formats/*.test.ts
    bookie/script.ts      # dialogue tree; fills numbers from the engine
    bookie/llm.ts         # phase 2: Claude call with read-only tools
    bookie/guard.ts       # numeric check against tool results
    safety/limits.ts      # allowance, stake caps, session reminders, cool-off
  client/src/
    main.tsx              # React shell + Phaser mount
    world/                # BootScene, VenueScene, avatar, pathfinding, doors
    ui/                   # BigBoard, BetSlip, RaceCard, BookieDialog, ChatPanel, GoToMenu
  maps/                   # *.tmj Tiled maps + tilesets
  assets/                 # sprites, CREDITS.md (Kenney, commissions)
```

## Risks

- **Empty-room problem.** A walkable venue with three people in it feels dead. Mitigations: one shared instance, NPC patrons, gatherings at post time and results time, house-seeded pools so odds always exist.
- **Slow feedback.** A race takes a week. Mitigations: the live board from 6-hour snapshots, overlapping races (Steam and Roblox, two weeks open at once), and head-to-heads that settle on day-one metrics.
- **Favorites always win.** Odds price it in; if upsets are too rare, rank on reviews relative to pre-launch wishlists.
- **Data gaps.** Gamalytic wishlists need a paid plan, Roblox launch dates are entered by hand, and Steam dates slip. Scratch and refund rules cover this.
- **Walking friction and chat moderation.** Menus everywhere; presets, filters, report/mute, no DMs.
- **LLM bookie misquotes or crosses a tone line.** Number check, and it stays optional.
- **Being read as gambling** by regulators, platforms or press, even with play money. Mitigated by the safety rules above, 18+, and a lawyer review before launch.

## Open questions for the owner

1. **Age floor for this version.** Default: 18+, self-declared, with the teen audience routed to the Roblox track.
2. **How literal is "casino"?** Default: racetrack-first ("The Launch Track"). The tables are betting windows with felt styling, with no cards, dice or slots. That keeps the classification and platform risk down.
3. **Takeout and vig on play money.** Default: 0% parimutuel takeout (the house seed is the only house money), and a 4.5% bookie vig as a coin sink.
4. **Bookie: scripted only, or Claude-driven too, and on what budget?** Default: scripted for the MVP. Add Claude Opus 5.5 at low effort in phase 2, capped at 20 turns per user per day, or switch to Haiku 5.5 if the budget is tight.
5. **Shared wallet and leaderboard** with the arcade and web-market versions, or separate? Default: shared accounts and coins through the shared platform. Leaderboards per venue.
6. **Chat scope.** Default: text room/table chat plus presets. No voice, no DMs.
7. **First race metric.** Default: Steam week-one review count. It's free, public and settles reliably.
8. **Sign-in.** Default: Discord OAuth for the MVP. Steam OpenID later.

## Sources

- Parimutuel mechanics: [Wikipedia](https://en.wikipedia.org/wiki/Parimutuel_betting), [Covers W/P/S](https://www.covers.com/horse-racing/win-place-and-show-wagering), [America's Best Racing odds](https://www.americasbestracing.net/gambling/2017-horse-betting-odds-explained), [Kentucky 810 KAR 6:020](https://apps.legislature.ky.gov/law/kar/810/006/020.pdf)
- Venues: [WorkAdventure vs Gather](https://workadventu.re/gather-vs-workadventure), [flat.social comparison](https://flat.social/blog/workadventure-alternative), [Club Penguin safe chat (Disney)](https://blog.disneygeek.com/?p=55590)
- Tech: [Phaser 4 tilemaps](https://cdn.jsdelivr.net/npm/phaser@4.2.0/skills/tilemaps/SKILL.md), [pixi-tiledmap](https://cdn.jsdelivr.net/npm/pixi-tiledmap@2.4.0/README.md), [Colyseus Phaser tutorial](https://docs.colyseus.io/tutorial/phaser/basic-player-movement), [Kenney Roguelike Indoor (CC0)](https://opengameart.org/content/roguelike-indoor-pack)
- Legal / harm: [Australia R 18+ simulated gambling](https://classification.gov.au/about-us/media-and-news/news/new-classifications-for-gambling-content-video-games), [Roblox experience guidelines](https://create.roblox.com/docs/production/promotion/experience-guidelines), [Sweepstakes bans 2026](https://www.gambling.com/us/sweepstakes-casinos/legal), [Bright Side of News](https://brightsideofnews.com/gambling/news/sweepstakes-casino-ban-us-states-2026/), [King et al. 2022, simulated gambling in adolescents](https://pmc.ncbi.nlm.nih.gov/articles/PMC9517771/), [Near-miss VR study 2024](https://doaj.org/article/059ba8f13bc8445e8b43286fb741199d), [UKGC on children and social games](https://igamingbusiness.com/casino-games/ukgc-cites-concerns-over-children-and-gambling/)
- Claude pricing: Anthropic API model table (Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50 per M tokens, as of Oct 2026)
- Data layer: `apps/web-arcade/README.md`, `server/oracle.ts`, `server/engine.ts`, `server/progression.ts`
