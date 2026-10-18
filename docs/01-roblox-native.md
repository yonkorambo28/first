# Track 1: Native Roblox experience

Status: plan, not started. Prototype it builds on: `apps/web-arcade` (bucketed markets, LMSR, progression, oracle).

## Summary

We can ship the Roblox version, but not as a betting market. Roblox bans **simulated gambling**, and its earlier rules text named "playing with virtual chips" and "simulated betting" as examples [1][2][3]. Free play coins staked on outcomes fit that description closely, so a straight port of the web-arcade loop (stake coins, LMSR shares, 1 coin per winning share, cash out) is the riskiest version we could build.

The plan is a **forecasting game** instead: a "launch call" pick'em. Players call which bucket a game's number will land in. A correct call scores **Insight Points**, with more points the less the crowd believed in that bucket. A wrong call scores zero. Nothing is staked, nothing is lost, and points can't be spent, traded or bought. The LMSR stays, but only to drive the crowd odds board. XP, levels, quests, badges, streaks and the oracle carry over almost unchanged.

The Roblox servers are thin clients of our own backend. The backend owns markets, picks, scoring and the oracle. It is the web-arcade engine extracted into a shared package, so all three tracks settle from the same numbers. Roblox servers reach it over `HttpService` with a key kept in the Roblox secrets store.

MVP: about 7–9 person-weeks. v1: another 8–10.

## Compliance

**What Roblox says**

- Maturity guidelines: "Gambling is the practice of exchanging real world money, Robux, or in-experience items of value for a game of chance. While experiences cannot contain playable gambling content, including simulated gambling, you can depict unplayable gambling content, such as showing a casino or people playing cards." [1][2]
- Earlier Community Standards text, quoted in the 2023 class action and in press coverage: "Experiences that include simulated gambling, including playing with virtual chips, simulated betting, or exchanging real money, Robux, or in-experience items of value are not allowed." [3][4] The current page says that both simulated and actual gambling are prohibited [5].
- On developer forums, a casino game whose currency was free to earn was reportedly removed under the gambling standard, and the appeal was denied. This is anecdotal [6].
- Paid random items: anything random bought directly or indirectly with Robux needs odds shown up front and a `PolicyService` check for each user's eligibility [7][8].
- Roblox faced new scrutiny over simulated gambling in 2026 [9]. Expect stricter enforcement, not looser.

**Our reading.** Predicting a real-world number is arguably skill, not "a game of chance." Even so, "simulated betting" is broad enough that a coin-staking market would rely on a moderator agreeing with that argument. We should design so the question never comes up.

**Design rules that keep us clear**

1. **No stake, no loss.** A call costs nothing. A wrong call scores 0. No coins, chips, wallet or balance anywhere.
2. **Points are a score, not a currency.** Insight Points (IP) only feed XP, leaderboards and badges. They can't be spent, traded, gifted or converted into anything.
3. **Two separate economies.** Anything bought with Robux is cosmetic and can never be won or lost through calls. Points never unlock anything that is also sold for Robux.
4. **No randomness for sale.** No paid crates, wheels or luck boosts. The web arcade's random daily crate becomes a fixed daily check-in reward. That keeps us out of the paid-random-items rules [7] and avoids anything that looks like a loot box to a parent.
5. **No casino language or imagery.** We don't use the words bet, wager, odds, payout, cash out, chips, bookie or jackpot, and there are no slot or roulette visuals. We use "call", "crowd %", "points" and "streak" instead. Track 3's casino and horse-racing theme must not come to Roblox. It would at best push us to 13+ under "unplayable gambling content" [1] and at worst read as simulated gambling.
6. **No real-world prizes, ever.** That includes Robux, gift cards and merch giveaways tied to rank. This also keeps us clear of sweepstakes law.
7. **No funnel to real money.** No in-experience links or prompts to a cash version of the product (if track 2 ever goes real-money). Roblox also restricts off-platform links.

**Maturity questionnaire.** If we follow the rules above, the honest answers are "no gambling content" and no other flagged content, which should give the widest age rating (Minimal / all ages) [1][2]. Re-answer the questionnaire if any casino-like art slips in.

**Age.** A large share of players will be under 13. Chat uses Roblox's built-in TextChatService only, which since January 2026 is age-checked and limited by age group [10]. Any text players can write, such as a call comment or a custom title, goes through `TextService` filtering. The backend stores only the Roblox UserId, the player's calls and their progression: no names, emails or free text. We need a short privacy notice. We avoid pushy, urgent messages, following Roblox's guidance for minors [8].

**Uncertain, ask Roblox before launch:** whether "pick'em with points" around real-world outcomes is fine. The closest common genre is sports pick'em and fantasy-style games. Post on DevForum or contact developer relations, and keep the answer on file.

**Other risks.** Steam capsule art is copyrighted, so uploading it as Roblox decals risks moderation and takedowns. Use our own art plus the game's title. Roblox experience icons can probably be shown via `rbxthumb://` (verify). Gamalytic requires visible attribution wherever its data appears.

## Architecture

**Toolchain.** Strict Luau with **Rojo** to sync files into Studio, **Rokit** to pin tool versions, **Wally** for packages, **Selene** and **StyLua** for lint and format, **Lune** plus **Jest-Lua** for headless tests in CI. The world geometry (hub, boards, NPCs) is built in Studio and checked in as `.rbxm` models that Rojo mounts. The alternative is roblox-ts, which compiles TypeScript to Luau and suits a TS team. But little code would be shared, because the backend owns the logic. Luau has the larger hiring pool and documentation base.

**Where state lives**

| Data | Home | Why |
| --- | --- | --- |
| Games, markets, crowd %, calls, scores, oracle readings | **Our backend** (shared `market-core` package + Postgres) | One source of truth across all three tracks; the oracle must run off-Roblox anyway |
| Player profile cache, cosmetics owned, purchase receipts, settings | `DataStoreService`, session-locked via ProfileStore | Robux purchases must be recorded in Roblox-side storage [8]; 4 MB per key is plenty [11] |
| Global leaderboard (all time, season) | Backend computes it; a job writes the top 100 to an `OrderedDataStore` for physical boards | Cheap reads in-world |
| Live crowd % for the boards | `MemoryStoreService` hash map, one key per market, 60s TTL | Every server shows the same numbers without each one calling the backend; per-key limits (~15k reads/min) are far above what we need [12] |
| "Market moved", "market settled" pings | `MessagingService` topic, plus Open Cloud publish from the backend | 1 kB messages and best-effort delivery are fine for nudges. Always re-read state after a ping [13] |

**Why the LMSR and scoring run on the backend, not in Luau.** Calls from many servers have to update one shared price vector in a fixed order. MemoryStore `UpdateAsync` could do it, but then there is a second engine to keep in sync with track 2's, and scores would be computed in two places. The backend is also needed anyway: `HttpService` can't call `games.roblox.com` and most other roblox.com web APIs (only selected Open Cloud endpoints are allowed) [14][15]. So the Roblox stats for the oracle have to be read off-platform, as `server/sources/roblox.ts` already does.

**The bridge**

- Only Roblox **server** scripts call the backend; clients use RemoteEvents to talk to their server. The backend trusts a shared key read with `HttpService:GetSecret()` from the experience's secrets store, locked to our API domain [16]. The key is rotated each quarter. The server passes the player's UserId, which a client can't spoof because clients never reach the backend.
- Budget: each Roblox server gets 500 HTTP requests per minute [14]. Each server polls `GET /v1/board` every 10–15 s, but only the one that wins a MemoryStore lease does the poll. The others read the MemoryStore copy. Calls are batched in `POST /v1/calls` every 2 s. Profile sync happens on join and leave. Even a busy server stays under 40 requests per minute.
- If the backend is down, boards show the last cached snapshot with a "calls paused" banner. The game stays playable as a hangout (cosmetics, quests view).
- Endpoints (new, versioned, server-to-server): `board`, `calls`, `profile/:userId`, `leaderboard`, `settlements?since=`.

**Oracle.** Unchanged from the web arcade: Steam appreviews, Gamalytic and the Roblox games/votes APIs, read every 6 hours, settled at the measure time. Roblox revenue isn't public, so the Roblox board drops revenue markets for Roblox games, or keeps them only with manual settlement and a "settled by staff" tag.

## Experience design

**The place.** A single hub called "Launch Pad": a bright plaza laid out like a game-studio convention, not a casino.

- **Market boards.** Each upcoming game gets a big physical board showing its art, a launch countdown, five bucket columns whose height is the crowd %, and a ticker. Walk up and press E (or tap) to open the call sheet.
- **Call sheet (UI).** The question, five buckets with crowd % and the points each would score if right, one button per bucket, and a confirm. You can change a call until the market closes; the points are locked at the crowd % when you last confirmed. Points = `round(20 / p)`, capped at 500. That gives 100 points for a 20% bucket and 25 for an 80% one. This is the "underdog" reward without a stake. It reuses the LMSR price `p`, and each call nudges the board by a fixed small amount.
- **NPCs.** "The Analyst" runs onboarding (three tutorial calls on past launches with known results). "The Archivist" shows settled markets and how each one was measured, which builds trust in the oracle. A news-desk NPC reads out the daily quests.
- **Results stage.** When a game settles, every server gets a ping. A short show plays: confetti on the winning bucket, and players who called it get a spotlight emote. This is the social peak and should be timed for after-school hours.
- **Progression** (port of `progression.ts`). XP for each call plus more for correct ones, levels at 100·n², the same titles, three shared daily quests, call streaks, and a daily check-in with fixed rewards (XP + cosmetic shards; no random rolls).
- **Badges** via `BadgeService`: First Call, Underdog Hunter, On Fire, Oracle, Both Worlds (Steam and Roblox), Early Bird (a call 7+ days before launch).
- **Leaderboards.** A physical top-100 wall from the OrderedDataStore, a friends board (via `Players:GetFriendsAsync`, with ranks pulled from the backend), and weekly seasons with cosmetic rewards for brackets (top 1% get a trail, and so on). Seasons reset the points.
- **Social.** Show who among your friends called what ("3 friends backed 50k–100k"). "Visit this game" portals use `TeleportService` to send players to the Roblox experiences being forecast. That is good for those studios and could lead to partnerships. Private servers for friend groups.

## Monetization

**Allowed, and planned:**

- **Cosmetic passes and developer products** [17]: avatar trails, board-viewing emotes, name-plate frames, hub decorations for a player's spot on the wall.
- **Cosmetic season pass:** a Robux track alongside the free track, both cosmetic only.
- **VIP / private servers.**
- **Creator Rewards**, which replaced Premium engagement payouts in July 2025 [18][19]: the daily engagement reward goes to experiences an active spender plays for 10+ minutes. This fits a daily check-in habit.

**Never monetized:** anything that changes points or scoring, extra calls, call changes after close, "insurance", early or extra information about outcomes, score multipliers or luck, paid random items, and buying a spot on the leaderboard. Robux never touches the forecasting loop. Immersive or rewarded ads only for users `PolicyService` allows, and probably not in the MVP.

## MVP & roadmap

**MVP (7–9 person-weeks: ~6 Roblox, ~2 backend, ~1 art/UX)**

- Extract `lmsr.ts`, the engine and the oracle into `packages/market-core`; add the scoring rule and the server-to-server API with key auth.
- Hub with 6–8 boards, call sheet, HUD, toasts, onboarding with the Analyst.
- Steam and Roblox markets (no Roblox revenue), oracle settlement, results ping.
- XP, levels, daily quests, check-in, five badges, all-time and weekly leaderboard wall.
- ProfileStore player data, a backend-down mode, and moderation-safe text (no free text at all in the MVP).
- Maturity questionnaire, privacy notice, written confirmation from Roblox if possible.

**v1 (+8–10 person-weeks)**

- Seasons and cosmetic season pass, cosmetic shop, friends board and friend-call feed.
- Results-stage show, TeleportService portals, private servers, mobile UI polish, localization (ES, PT-BR).
- Analytics funnels and A/B tests on the call-sheet layout.

**Later**

- Studio partnerships (featured boards for upcoming Roblox launches).
- Creator-proposed markets, curated only.
- Team leagues.
- Linking with Roblox OAuth so the same player has one profile on the web track. Only if track 2 stays play-money.

## Folder layout

```
apps/roblox/
  README.md
  default.project.json        Rojo project (maps src/ and models/ into the DataModel)
  rokit.toml                  pinned tools: rojo, wally, selene, stylua, lune
  wally.toml                  packages: ProfileStore, React-Lua or Fusion, Jest-Lua
  selene.toml  stylua.toml
  src/
    server/                   ServerScriptService
      Bridge.luau             HttpService client, secret, batching, backoff
      BoardCache.luau         MemoryStore lease + snapshot fan-out
      Calls.luau              validate + queue calls per player
      Profiles.luau           ProfileStore session, cosmetics, receipts
      Progression.luau        XP/quests/check-in (mirrors backend results)
      Leaderboards.luau       OrderedDataStore wall, friends board
      Badges.luau  Purchases.luau  Settlements.luau (MessagingService)
    client/                   StarterPlayerScripts
      ui/ CallSheet  Hud  Toasts  Onboarding  Leaderboard
      Boards.luau             board rendering + proximity prompts
    shared/                   ReplicatedStorage
      Types.luau  Config.luau  Format.luau  Remotes.luau  Scoring.luau
  models/                     .rbxm hub, boards, NPCs (built in Studio)
  tests/                      Lune + Jest-Lua specs
packages/market-core/         extracted from apps/web-arcade/server (lmsr, engine, oracle, sources)
apps/api/                     HTTP service the Roblox servers (and tracks 2/3) call
```

## Risks

1. **A policy takedown.** A moderator could read even no-stake pick'em as simulated gambling. Mitigation: the design rules above, written confirmation from Roblox, no casino visuals.
2. **The oracle depends on unofficial endpoints.** The Roblox web APIs are rate-limited and undocumented in places, and Gamalytic's estimates are estimates. Mitigation: a manual override in launch control, and a visible "how this was measured" note on every settled market.
3. **A slow loop.** Launches settle days or weeks after a call, and Roblox players expect instant feedback. Mitigation: daily quests, the check-in, onboarding calls on past launches, and a dense calendar of 10+ open markets at once.
4. **Content supply.** Few Steam games resonate with a young Roblox audience. Lean on Roblox launches and big Steam titles.
5. **Backend availability.** An outage silences every server. Mitigation: cached boards and paused calls.
6. **Children's privacy.** Keep backend data to the UserId and calls, get a legal review of the privacy notice, and never collect contact info.

## Open questions for the owner

1. **Coins or no coins?** Do we accept the no-stake points model, or try play coins staked on an LMSR like the web arcade? *Recommended: no-stake points. Staking is the one choice most likely to get the experience removed.*
2. **Who is it for?** All ages, or 13+ only? *Recommended: all ages with no gambling imagery, for the largest audience; revisit only if a feature truly needs 13+.*
3. **One backend for all tracks?** Should Roblox share one backend and market set with tracks 2 and 3, or run its own? *Recommended: share `market-core` and one oracle, but keep Roblox leaderboards and points separate.*
4. **Roblox revenue markets.** Settle them by hand, or drop them? *Recommended: drop them from the Roblox board in the MVP.*
5. **Toolchain.** Luau + Rojo, or roblox-ts? *Recommended: Luau + Rojo.*
6. **Ask Roblox first?** Contact Roblox for a policy read before building past the MVP? *Recommended: yes, during the MVP, before any marketing spend.*
7. **Monetization at launch.** Ship with no monetization and add cosmetics in v1? *Recommended: launch free and add cosmetics in v1 once retention is known.*
8. **Account linking.** Link Roblox accounts to the web tracks via Roblox OAuth later? *Recommended: not while any track considers real money.*

## Sources

1. Roblox Creator Docs, Experience guidelines (Gambling): https://create.roblox.com/docs/production/promotion/experience-guidelines (mirror: https://github.com/Roblox/creator-docs/blob/main/content/en-us/production/promotion/experience-guidelines.md)
2. Roblox Creator Docs, Content maturity labels / questionnaire: https://create.roblox.com/docs/production/promotion/content-maturity
3. TechCrunch, Roblox gambling class action (2023): https://techcrunch.com/2023/08/18/roblox-children-gambling-class-action-lawsuit-robux/amp
4. KTVU, lawsuit quoting Roblox rules: https://www.ktvu.com/news/lawsuit-filed-in-california-court-claims-roblox-facilitates-child-gambling
5. Roblox Community Standards: https://about.roblox.com/community-standards
6. DevForum, "Free to Play Slot Machines Allowed?": https://devforum.roblox.com/t/free-to-play-slot-machines-allowed/3909513
7. Roblox Creator Docs, Paid random items policy: https://create.roblox.com/docs/production/monetization/paid-random-items
8. Roblox Creator Docs, Monetization overview (PolicyService, minors): https://create.roblox.com/docs/production/monetization
9. Report on 2026 advocacy complaints about simulated gambling: https://bvwd.ca.gov/expert-time/Roblox-Faces-Growing-Scrutiny-Over-Child-Safety-and-InGame-Spending-Practices-21-7571
10. Roblox press release, age checks for chat (Jan 2026): https://www.nasdaq.com/press-release/roblox-requires-users-worldwide-age-check-access-chat-2026-01-07
11. Roblox Creator Docs, Data store limits: https://create.roblox.com/docs/cloud-services/data-stores/error-codes-and-limits
12. Roblox Creator Docs, Memory stores: https://create.roblox.com/docs/cloud-services/memory-stores
13. Roblox Engine API, MessagingService (limits): https://create.roblox.com/docs/reference/engine/classes/MessagingService
14. Roblox Creator Docs, HTTP service (Open Cloud endpoints, limits): https://create.roblox.com/docs/cloud-services/http-service
15. DevForum, "HttpService is not allowed to access ROBLOX resources": https://devforum.roblox.com/t/httpservice-is-not-allowed-to-access-roblox-resources/2271427 and "Use Open Cloud via HttpService without proxies": https://devforum.roblox.com/t/use-open-cloud-via-httpservice-without-proxies/3656373
16. Roblox Creator Docs, Secrets stores: https://create.roblox.com/docs/cloud-services/secrets
17. Roblox Creator Docs, Developer products: https://create.roblox.com/docs/production/monetization/developer-products
18. Roblox Creator Docs, Engagement-based payouts (deprecated July 2025): https://create.roblox.com/docs/production/monetization/engagement-based-payouts
19. Roblox Creator Docs, Creator Rewards: https://create.roblox.com/docs/creator-rewards
20. Rojo: https://rojo.space/docs
