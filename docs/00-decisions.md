# Decisions needed

Every open question from the four plans, merged and de-duplicated. Each has a recommended default; where
two plans disagreed, the recommendation says how it resolves the conflict. Nothing here is legal advice;
the legal points in the plans need a lawyer before any public launch.

Answer by number, e.g. "1 yes, 2 agree, 3 18+ for casino".

## Must decide before building

**1. The Roblox version: points, not bets.**
Roblox bans "simulated gambling"; its rules text has named "virtual chips" and "simulated betting" as
examples. A straight port of the web game, where players stake coins, is the version most likely to be
taken down. The Roblox plan turns it into a free pick'em: calls cost nothing and a right call earns more
points the less the crowd agreed. Points can't be spent, traded or bought.
*Recommended:* build the no-stake points version, keep casino language and imagery out of Roblox entirely,
and ask Roblox (DevForum or developer relations) for a written policy read during the MVP, before any
marketing spend. (`01-roblox-native.md`, `04-shared-platform.md`)

**2. Age limits.**
*Recommended:* Roblox version for all ages; web market 13+; casino 18+ (self-declared), with younger
players pointed to the other two. Australia has rated games with interactive simulated gambling R 18+
since September 2024, and Roblox puts casino content behind its 17+ label. (all four plans)

**3. Coins and leaderboards across versions.**
The plans disagreed: the shared-platform plan wanted separate coins and one leaderboard; the casino plan
wanted shared coins and separate leaderboards.
*Recommended:* one account across the web products; web market and casino share a coin wallet; Roblox
keeps its own points and leaderboard, completely separate from web coins. Leaderboards are per product,
plus an optional combined "overall" ranking later. Keeping Roblox separate is what keeps it out of the
gambling rules in decision 1. (`03-casino.md`, `04-shared-platform.md`, `01-roblox-native.md`)

**4. Never sell coins, and no prizes for now.**
*Recommended:* coins are free only. If money is needed, sell cosmetics or a supporter badge (Robux buys
cosmetics only on Roblox). No leaderboard prizes until there are 1,000+ weekly players and a lawyer has
reviewed it. Real money only ever through a partner exchange already registered with the CFTC, and not
designed for now. (`02-web-market.md`, `03-casino.md`)

**5. Gamalytic plan.**
Steam day-one wishlist markets and automatic discovery of Steam launches need a paid plan.
*Recommended:* Starter (about $25/month); upgrade to Professional only if its game-list API needs it. If
not paying, drop Steam wishlist markets. (`02-web-market.md`, `04-shared-platform.md`)

**6. Roblox revenue markets.**
Roblox earnings aren't public, so these can only be settled by hand.
*Recommended:* drop them unless a studio agrees to share its figures. Same for revenue on free-to-play
Steam games. (all four plans)

## Can decide later

**7. How casino-like the casino looks.**
*Recommended:* racetrack first ("The Launch Track"). Tables are betting windows with felt styling; no
cards, dice, slots or spinning wheels. (`03-casino.md`)

**8. The bookie.**
*Recommended:* scripted lines for the MVP. Later, add a Claude-driven bookie for open-ended chat, capped at
20 messages per player a day (about 1.5¢ per message on the top model, under 0.1¢ on the cheapest). It
can only quote numbers from the engine, and the server checks every number it says. (`03-casino.md`)

**9. House cut on play money.**
*Recommended:* no cut on race pools (the house seed is the only house money); a 4.5% margin on the
bookie's lines, which drains coins from the economy. (`03-casino.md`)

**10. First casino race.**
*Recommended:* Steam week-one review count, since it's free, public and settles reliably. (`03-casino.md`)

**11. Who creates markets.**
*Recommended:* admins only for the MVP; players can propose markets with review in a later phase.
(`02-web-market.md`)

**12. Hosting.**
*Recommended:* Render, about $15–30/month plus Gamalytic. (`04-shared-platform.md`)

**13. Which version to build first.**
Not raised by any plan, but it sets everything else.
*Recommended:* shared packages and backend first (about 1 week), then the web market (4–5 weeks, it's
closest to the prototype), then the casino race card (about 5 weeks). Start the Roblox policy question
with Roblox on day one, and build the Roblox version (7–9 weeks) once there's an answer.

## Estimates from the plans

| Piece | Effort (one developer) | Plan |
| ----- | ---------------------- | ---- |
| Shared packages + backend | about 1 week | `04-shared-platform.md` |
| Web market MVP | 4–5 weeks | `02-web-market.md` |
| Casino MVP (one room, race card) | about 5 weeks | `03-casino.md` |
| Roblox MVP | 7–9 weeks, v1 another 8–10 | `01-roblox-native.md` |
