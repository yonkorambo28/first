# Design direction: web market

The visual and interaction direction for `apps/web-market`. It sits on top of the screen spec in
`05-web-market-spec.md`, which covers browse, the event page, the trade ticket, portfolio, leaderboard and
advanced mode. It replaces the arcade prototype's look (`apps/web-arcade/client`: pixel font, neon pink and
yellow on `#0b0b1a`, confetti).

**How this was researched, and its limits.** Direct page fetches were blocked from this environment,
and so were font-file downloads from npm CDNs, so everything here comes from search-result excerpts. Tags:

- **[official]**: the company's own page or post, seen through search excerpts.
- **[secondary]**: press, guides or third-party design-token write-ups. Many "DESIGN.md" sites
  reverse-engineer colors from live pages, so treat their hex values as approximate.
- **[unverified]**: from my own familiarity, with no source I could reach. Check these before building on them.

Every hex value proposed below is my own. The contrast ratios were worked out by hand from WCAG relative
luminance, so re-check them with a contrast tool once the tokens are in CSS.

---

## Summary: "Launch Night"

**Launch Night** treats every market like a game's release night in a store you already trust. The game's own capsule
art does the shouting. The interface around it is calm, dark and dense with numbers, like the Steam
library or the Riot client. The interface itself carries one saturated brand accent (an electric lime), a
color-blind-safe blue/orange pair for Yes/No, and big, tabular numerals so a probability reads at a glance.
Friendliness comes from plain-language copy, a teaching trade ticket, and earned "Called it" badges styled
like achievements. It does not come from confetti, streaks, or casino-style urgency.

---

## What to borrow from where

| Source | Pattern | Why |
| --- | --- | --- |
| Steam store and library | Capsule or header art as the card hero. A wide main column (Valve moved product pages from 940 to 1,200 px) and a media strip with theater and full-screen modes ([Guru3D](https://www.guru3d.com/story/valve-launches-redesigned-steam-store-pages-for-desktop-users/), [WindowsForum](https://windowsforum.com/windows-news.4/steam-store-gets-wider-1200px-main-column-and-enhanced-media-carousel.388440/)) [secondary]. Dark navy base (about `#1b2838` / `#171a21`) ([webdesignhot Steam](https://www.webdesignhot.com/design.md/steam/)) [secondary]. | Players already read "a game" as art plus title plus review label. Reusing that grammar makes a market card feel like a store row. |
| Steam Deck / Big Picture | Controller-first layout with large focus targets and universal search ([SteamDeckHQ](https://steamdeckhq.com/news/new-big-picture-now-in-beta-for-steam-based-on-deck-game-mode/), [Windows Central](https://windowscentral.com/gaming/pc-gaming/valve-is-finally-replacing-big-picture-mode-on-desktops-with-the-steam-deck-ui)) [secondary]. | A focus ring designed as part of the UI is good gamer UX and good accessibility at once. |
| Riot client (Hextech) | One signature accent kept for primary actions and key frames. Riot avoided dated fantasy textures and cut the client's shape language down to three core shapes ([Riot Nexus via Surrender@20](https://www.surrenderat20.net/2017/01/red-post-collection-2016-playlist.html)) [official, via repost]. | Our lime plays that role: it marks primary actions and nothing else. |
| Fortnite / Valorant / Xbox | A shared rarity ladder: gray, green, blue, purple, orange ([Twinfinite](https://twinfinite.net/?p=364784)) [secondary]. Xbox gives rare achievements a distinct toast and shows the share of players who earned them ([Windows Central](https://windowscentral.com/what-new-xbox-rare-achievement-toast-looks-and-sounds), [TrueAchievements](https://i2.trueachievements.com/news/xbox-achievements-redesign)) [secondary]. | Players already know this ladder. We use it only for profile badges, never for prices or buy buttons. |
| Discord | Bright brand color (`#5865F2`) on dark gray. The Accessibility tab has a saturation slider, reduced motion, and a role-color dot as an alternative to colored names ([Discord blog](https://discord.com/blog/improving-app-accessibility-a11y-updates), [Discord support](https://support.discord.com/hc/hi-in/articles/1500010454681-Accessibility-Settings-Tab)) [official]. | Proof that a gamer product can ship real accessibility settings. Copy the dot-plus-label idea for platform and status chips. |
| Roblox | Builder Sans for UI text and Builder Extended for expressive display ([Roblox DevForum](https://devforum.roblox.com/t/2868222)) [official]. | A plain UI face paired with a wide display face is the pairing we propose. Builder itself is licensed for Roblox-related content only, so we don't use it. |
| Twitch / itch.io | Twitch: one brand purple (`#9146FF`) on near-black `#0E0E10` ([webdesignhot Twitch](https://www.webdesignhot.com/design.md/twitch/)) [secondary]. itch.io: a neutral shell where "game art provides most of the color" ([webdesignhot itch.io](https://www.webdesignhot.com/design.md/itch-io/)) [secondary]. | Keep the shell neutral and let the capsule art bring the color. |
| Robinhood | Removed its confetti in 2021 after Massachusetts regulators cited it as gamification aimed at inexperienced investors, and replaced it with a calm geometric illustration ([CNBC](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)) [secondary]. Its 2024 rebrand went to a black, white and neutral palette with one neon accent ([Transform](https://www.transformmagazine.net/articles/2024/financial-platform-robinhood-introduces-new-minimal-visual-identity/)) [secondary]. | This is the clearest real precedent for "celebrate, but not like a slot machine." |
| Manifold | Play money. A thin probability bar on cards, which stopped changing color by probability ([Manifold market on the change](https://manifold.markets/MattP/will-manifold-get-rid-of-the-colore)) [secondary]. A "chance after trade" line (see `prediction-market-ui.md`). | A bar that shows the value without judging it. A ticket that teaches. |
| Kalshi | Chart price lines drawn as steps, so flat stretches read as held prices rather than drift, with a volume histogram underneath ([Kalshi Pro help](https://kalshi.com/pro/help/charts)) [official]. A rules summary next to the ladder. | Honest charting for thin play-money markets. |
| Metaculus | Numeric questions shown as a probability distribution, with a PDF/CDF toggle and hover readouts ([Metaculus](https://www.metaculus.com/how-to-forecast), [platform update](https://pandemic.metaculus.com/questions/3430/platform-update-thread/{{qctrl.question.primary_project.url}})) [official]. | Our range markets are a distribution. Our Ranges / "Or more" toggle is the same idea as PDF/CDF. |

---

## Visual system

### Color tokens

The dark theme is the default; light follows `prefers-color-scheme` and a manual toggle. The rules:

- Yes and No are **blue and orange**, the pair at the core of the Okabe–Ito color-blind-safe palette
  ([AudioEye](https://www.audioeye.com/post/colorblind-friendly-palettes/),
  [NCEAS PDF](https://nceas.ucsb.edu/sites/default/files/2022-06/Colorblind%20Safe%20Color%20Schemes.pdf)).
  Never red and green.
- Up and down use a separate teal/rose pair, and the ▲ ▼ glyph and the +/− sign always come with the color.
- The brand accent is lime, so it is never mistaken for a side of the trade.

| Token | Dark (default) | Light | Use |
| --- | --- | --- | --- |
| `--bg` | `#0E1220` | `#F6F7FB` | page |
| `--surface` | `#161B2B` | `#FFFFFF` | cards, ticket |
| `--surface-2` | `#1E2438` | `#EEF1F7` | inputs, row hover, chips |
| `--surface-3` | `#272E46` | `#E3E8F2` | pressed, selected |
| `--border` | `#2C3450` | `#DCE1EC` | 1px dividers |
| `--text` | `#EEF1FA` | `#12172A` | primary text |
| `--text-2` | `#A9B2CA` | `#4A5470` | labels, meta |
| `--text-3` | `#7C86A2` (≈5.1:1 on bg, ≈4.7:1 on surface) | `#6A7390` (≈4.7:1 on white) | timestamps, captions (lowest level allowed for text) |
| `--brand` | `#C8F04A` lime (≈14:1 on bg) | fill `#C8F04A`, text `#4D6B00` | primary CTA fill (dark text on it), focus ring, logo, selected tab bar |
| `--on-brand` | `#0E1220` | `#0E1220` | text on lime |
| `--yes` | `#4C9DFF` (≈6.7:1) | `#1F6FEB` (≈4.6:1) | Yes buttons, Yes share of bars |
| `--no` | `#FF9B42` (≈8.9:1) | `#B54E08` (≈5.2:1) | No buttons |
| `--up` | `#36D39A` | `#0B7A54` | ▲ change, profit |
| `--down` | `#FF6B8A` | `#C8264D` | ▼ change, loss |
| `--warning` | `#F7C948` | `#8A6100` | Closing soon, Disputed |
| `--danger` | `#FF5470` | `#C21F3E` | errors only (never for No) |
| `--info` | `#9DB2FF` | `#3F51C8` | Proposed, notices |
| `--steam` | chip bg `#1B2838`, text `#C7D5E0` | same | Steam platform chip only |
| `--roblox` | chip bg `#E2E7F0`, text `#12172A` | chip bg `#12172A`, text `#FFFFFF` | Roblox platform chip only (Roblox's mark is monochrome) |
| Rarity (badges only) | common `#A9B2CA`, uncommon `#36D39A`, rare `#4C9DFF`, epic `#B07CFF`, legendary `#FFB547` | darkened 30% in light theme | profile badges, leaderboard tier frames |

Notes:

- **Steam navy.** I chose the chip's navy over Steam's link blue (`#66C0F4`, [secondary]) so the Steam chip
  can never be read as a Yes button.
- **Roblox chip.** The Roblox platform color is my own choice [unverified against Roblox brand guidelines].
  Platform logos come from Simple Icons. Check the trademark terms before shipping.
- **Text on Yes and No.** On solid Yes and No buttons, use `--on-brand` dark text: about 6.7:1 on Yes and
  8.9:1 on No. In the dark theme the default button style is a 16%-alpha tint with colored text, and it
  goes solid on hover or when selected.

### Typography

- **Display: [Unbounded](https://fonts.google.com/specimen/Unbounded/about)** (Google Fonts, OFL, variable
  weight 200–900).
  - It's wide and rounded-square, with the chunky, confident feel of game titles and of Roblox's Builder
    Extended, but it isn't a pixel font or a sci-fi cliché.
  - Use it for the logo, page titles, section heads, the event title over the art, and badges such as
    "Called it".
  - Weight 600–700. Never below 18px, and never for body text or numbers.
  - Note: it was made for the Polkadot ecosystem ([Fontsource README](https://cdn.jsdelivr.net/npm/@fontsource-variable/unbounded@5.2.8/README.md)), which most players won't know or care about.
- **UI and numbers: [Manrope](https://fonts.google.com/specimen/Manrope)** (Google Fonts, OFL, variable
  200–800).
  - It's geometric, friendly and open, and its README lists **tabular figures** among its OpenType
    features ([terrapkg/manrope](https://github.com/terrapkg/pkg-manrope-fonts)).
  - Set `font-variant-numeric: tabular-nums` on every price, %, coin amount and table. Big hero
    probabilities use Manrope 800.
  - Flag: I could not inspect the font file to confirm `tnum` in the Google Fonts build. Test it on a
    column of `1111` / `8888` before committing. The fallback is IBM Plex Sans, which has tabular figures.
- **Why not the others.** Inter and Space Grotesk are excluded by the brief. Atkinson Hyperlegible Next is
  very legible, but I couldn't confirm tabular figures in its web build
  ([CTAN notes](https://ctan.org/tex-archive/fonts/atkinson?lang=en)). Figtree's `tnum` support is
  unconfirmed too.
- **Scale** (rem at 16px): 12 caption, 14 meta, 16 body, 18 row label, 20 ticket figures, 24 h3, 32 h2
  (Unbounded), 40 h1 (Unbounded). Hero % is 44/48 in Manrope 800. The minimum text size is 12px, per
  [Vaadin](https://origin.vaadin.com/docs/v24/designing-apps/typography) [secondary].

### Spacing, radius, elevation

- **Spacing.** A 4px base. Use the steps 4, 8, 12, 16, 24, 32, 48. Card padding is 16 (mobile) or 20 (desktop). Gutters are 16 on mobile and 24 on desktop.
- **Radius.** 8 for chips and inputs, 12 for buttons, 16 for cards and the ticket, 24 for the bottom sheet's top
  corners. Capsule art keeps a 12 radius. This is softer than the Steam store and less bubbly than Roblox.
- **Elevation.** In dark mode, use surface steps rather than shadows: bg → surface → surface-2. Only
  floating layers get a shadow (`0 8px 32px rgb(0 0 0 / .45)`): the ticket on desktop, the sheet, toasts
  and menus. In light mode, cards get `0 1px 2px rgb(18 23 42 / .06)` plus a border.
- **Card hover.** Lift 2px, raise the border to `--surface-3`, and scale the capsule art 1.03 inside its
  clip. This is the store-card hover players expect, without glow.

### Iconography

- **[Lucide](https://lucide.dev)**: ISC license, available from unpkg/jsdelivr (`lucide@1.24.0`)
  ([npm](https://npmjs.com/package/lucide)). Around 1,500 icons ([FreeIcons](https://freeicons.co/vs/lucide/))
  [secondary].
- **Style.** 1.75px stroke at 20px, inheriting `currentColor`.
- **Key icons.** `trending-up` / `trending-down` (paired with ▲▼ text), `clock`, `calendar`,
  `badge-check` (verified creator), `scale` (rules), `flag` (dispute), `trophy`, `coins`, `users`,
  `monitor` / `gamepad-2`.
- **Platform marks.** Steam and Roblox logos come from Simple Icons. They are the only filled icons.

### Motion

| What | Duration / easing | Reduced motion |
| --- | --- | --- |
| Hover, press | 120ms ease-out | color change only, no movement |
| Card lift, art zoom | 180ms `cubic-bezier(.2,0,0,1)` | off |
| Row expand, tab switch | 200ms | instant |
| Bottom sheet in / out | 260ms / 200ms, emphasized decelerate `cubic-bezier(.05,.7,.1,1)` | 120ms fade |
| Price change | the number ticks to its new value over 300ms, then the ▲/▼ gets a background tint that fades over 1.2s | value swaps, no tint fade |
| Chart | no draw-on animation. The live point eases 200ms | static |
| Success state | the button morphs into a check plus "Bought", 400ms, once | static check |

The easing curves are the Material 3 values as reported by
[secondary sources](https://smithery.ai/skills/copyleftdev/google-material-design) [unverified against Material's own docs].

The motion rules:

- No loops longer than 5 seconds, no parallax, no autoplaying trailers with motion, and nothing that
  flashes more than 3 times a second ([web.dev: motion](https://web.dev/learn/accessibility/motion),
  [UMich](https://teamdynamix.umich.edu/TDClient/30/Portal/KB/PrintArticle?ID=14019)).
- Respect `prefers-reduced-motion`, and also offer a "Reduce motion" switch in settings, as Discord does.

---

## Component notes

**Game card (browse).**

- **Art.** A 16:9 capsule on top (mobile) or on the left (desktop list), with the platform chip and "in 3d" countdown
  overlaid on a bottom gradient scrim (`linear-gradient(transparent, rgb(14 18 32 / .85))`) so the text
  passes contrast on any art.
- **Body.** Title in Manrope 700, 18px (Unbounded is too wide for long game titles in a grid). Studio and
  tags in `--text-2`. The Steam row is shown exactly as the spec gives it: "Very Positive (1,204) · $19.99".
- **Outcomes.** The top two outcome rows, then a footer: "5 markets · 12.4K vol · 31 traders".
- **Corner chip.** The status chip goes in the top-right corner of the art.
- **Missing art.** Fall back to a generated tile showing the game's initials on a hue taken from its app ID.
  Never show an empty gray box.

**Outcome row with an inline probability bar.**

- **Layout.** `[label] [bar ████░░░ 38%] [▲4] [Yes 38¢] [No 62¢]`. The bar runs behind the label as a
  full-row fill: a 15%-alpha `--yes` fill, 0–100% wide, so the outcome list reads as a sideways histogram.
  This is the main data viz for range markets.
- **Order.** Rows stay in numeric order, never sorted by %, so the bars form the shape of the distribution
  and the player can see where the market's peak and tails are.
- **"Or more" view.** The bars become cumulative and step down monotonically, like a CDF.
- **The %.** The figure is right-aligned, tabular, 18px 700. The change shows as `▲4` in `--up` or `▼2` in
  `--down`. Zero shows as an en dash in `--text-3`.
- **Position.** The player's holding sits as a sub-line inside the row: "You: 249 Yes · avg 40¢ · +12".
- **Tap target.** The whole row opens the ticket preset to Yes. The Yes and No buttons are each at least
  44×36 px with an 8px gap.

**Trade ticket.**

- **Layout.** Follows the spec. On desktop it's a sticky card in the right rail; on mobile it's a bottom
  sheet (see Mobile).
- **Side toggle.** Yes and No form a two-segment control. The selected side fills with its color and gets a
  check icon, so color isn't the only cue.
- **Amount.** The amount field is big and tabular, with +10 / +50 / +100 / Max chips.
- **Summary.** Four lines: Avg price, Shares, "Chance after trade 38% → 43%" (the arrow animates), and "To
  win 249 coins (2.49×)".
- **CTA.** The button is lime, full width, at least 48px tall, and labeled with the action:
  "Buy Yes · 100 coins".
- **First trades.** For a player's first three trades, an explainer line under the price reads: "38¢ buys a
  share that pays 100 coins if this range wins. 38¢ ≈ the crowd thinks 38% likely."
- **States.**
  - Quoting: skeleton on the figures.
  - Price moved: an amber inline banner, "Price moved to 41¢", and the CTA changes to "Confirm at 41¢".
  - Not enough coins: inline helper text plus a link to the daily coin grant. Never a "deposit" button.
  - Closed: the ticket is swapped for the status and the timeline.

**Game stat panel.** A compact grid of stat tiles, each with a label, value, sparkline and source:

- "Est. wishlists · Gamalytic", "Reviews 1,204 · Very Positive", "Playing now 3,412", and for Roblox
  "Visits", "Active", "Like %".
- Each tile shows a 7-day sparkline (2px line in `--text-2`, last point dotted in `--brand`) and a
  freshness note: "updated 14m ago".
- Estimates use an italic label and a dashed sparkline, so an estimate looks different from a reading.

**Status chip and timeline.**

- **Chips** are pill-shaped, 24px high, and always show an icon plus a word:
  - Open: neutral, green dot
  - Closing soon: `--warning` with a clock icon
  - Closed: neutral with a lock icon
  - Proposed: `--info` with a scale icon
  - Disputed: `--warning` with a flag icon
  - Resolved: inverse chip (text color as the fill) with a check
  - Void: `--text-3` with a ban icon
- **Timeline.** A horizontal stepper on desktop, vertical on mobile, with the steps Listed · Launch ·
  Trading closes · Measured · Proposed · Final.
  - Done steps are filled dots and the current step is a lime ring.
  - Future steps are hollow and show their dates.
  - A "now" marker sits between steps.

**Leaderboard row.**

- **Layout.** Rank (tabular, Unbounded for the top 3), avatar, name, and a tier badge styled as a rarity frame.
  Then profit this week ("+4,210" in `--up` with ▲), win rate, and markets traded.
- **Your row.** It's pinned to the bottom of the viewport when you're off-screen.
- **No loss rankings.** No "biggest losers" board.

**Toasts.**

- **Placement.** Bottom-center on mobile, above the sheet; bottom-right on desktop. 4s, with pause on
  hover or focus.
- **Content.** An icon, one line, and an action, e.g. "Bought 249 Yes · $100K–250K · View position".
- **Live region.** Announced via `aria-live="polite"`.
- **Errors.** Errors stay until dismissed and say what to do: "Couldn't place trade — price changed. Try again."

**Empty states.** Use a small spot illustration (an empty capsule, a controller, a calendar) and one line of copy.

- Empty portfolio: "No predictions yet. Pick a launch you know — your 1,000 coins are waiting."
- Resolved tab before any market has resolved: "Results land after week one. First one: Hollow Pines, Nov 11."
- Search with no results: "No games match 'xyz'. Try a studio name."
- **Loading.** Skeletons in the card's own shape, never a spinner covering the whole page.
- **Errors.** Inline, with a retry button. A stale-data banner reads: "Live stats paused — last update 2h ago."

---

## Friendly, not gambling

The audience includes teens. The UK Children's Code expects services likely to be used by children to
follow age-appropriate design principles and to assess gambling-like mechanics
([BTO on ICO guidance](https://bto.co.uk/blog/ico-publishes-guidance-for-games-designers-on-complying-with-childrens-code.aspx.html))
[secondary]. Robinhood's confetti became an exhibit in a regulator's complaint
([CNBC](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)).

**OK:**

- **Successful trade.** The CTA briefly turns into a check plus "Bought", and a toast with a link to the
  position.
- **Correct resolution.** A **"Called it"** badge on the position and in the activity feed, styled like an
  achievement: an Unbounded label, a rarity frame scaled to how unlikely the call was at entry ("Called it
  at 12%" earns an epic frame), and the date. It's shown once in a modest card. The player can share it as
  an image.
- **Profile achievements** for skill and learning: "First prediction", "Read the rules", "10 resolved",
  "Calibrated" (see below), "Called a 10% shot". The rarity colors are cosmetic only.
- **Calibration and accuracy**, explained in plain words: "When you said 30%, it happened 28% of the time."
  This rewards being right, not trading often.
- **Neutral loss copy:** "This one resolved $50K–100K. Your 100 coins → 0." Show the result and the source,
  without sad animations and without "win it back" prompts.

**Off-limits:**

- **Celebration effects.** Confetti, coin showers, slot-machine number spins, sirens, and fire or streak
  flames (already ruled out in the spec).
- **Pressure tactics.**
  - Countdown timers styled as urgency. A neutral "Closes in 2d" is fine.
  - "Hot streak", "Don't miss out", "X people just bought".
- **Loss-chasing prompts.** Loss-recovery nudges, "double down", and a post-loss "Trade again" CTA.
- **Gambling vocabulary.** "Bet", "odds boost", "parlay" and "jackpot" in the UI. Use "prediction", "chance",
  "shares".
- **Random rewards.** Loot-box-style mystery coin grants, spin wheels and variable-reward chests. The daily
  coin grant is a fixed amount.
- **Anything implying cash.** Dollar signs on coins and "deposit" or "buy coins". The "Play money. No cash value." line stays on the ticket.
- **Confirmshaming.** No guilt-trip copy on dismiss buttons, such as "No thanks, I don't like winning"
  ([Proton](https://proton.me/blog/pl/how-to-recognize-bad-design-in-apps-for-kids-proton)).

---

## Data viz

- **Odds chart.** Up to 4 lines in a fixed categorical order, drawn as steps, as Kalshi does, so a quiet
  play-money market doesn't look like it's drifting.
  - Lines are distinguished by dash pattern as well as color (solid, dashed, dotted, dash-dot) and labeled
    directly at the right edge with the current %, not only in a legend.
  - Launch and Measure markers are vertical 1px `--text-3` lines with top labels.
  - A crosshair readout shows the time and every line's %.
  - Series colors: `#4C9DFF`, `#FFB547`, `#B07CFF`, `#36D39A`, validated in both themes. These deliberately
    reuse the rarity hues, but they never appear on Yes/No buttons near the chart.
  - Load the `dataviz` skill's validator when building the chart.
- **Range distribution.** The outcome rows themselves form the histogram (see above). Optionally, add a
  compact column histogram above the rows on wide screens, with the user's held ranges outlined in lime.
- **Stat sparklines.** No axes. Label the min and max on hover. Shade the range for estimates.
- **Depth chart (advanced mode only).** For each outcome, a curve of "chance after trade" against stake
  (0 to 1,000 coins), from the market maker's pricing.
  - Yes curve rising in `--yes`, No curve falling in `--no`.
  - The current price is a horizontal line; the user's typed stake is a vertical line.
  - The label says "How far your trade moves the chance", not "order book".
  - Progressive disclosure: an "Advanced" switch in settings plus a per-page "Show depth" link.
    Advanced-only figures sit in `--text-2` so the basic view stays the visual default.

---

## Mobile layout

- **Single column.** On the event page: art header (16:9, with title overlaid on the scrim), stat strip
  (horizontal scroll of stat tiles), metric tabs (scrollable segmented control, sticky under the header),
  chart (240px), outcome rows, rules, timeline, then the activity tabs.
- **Ticket as a bottom sheet.** Tapping Yes or No opens the ticket as a bottom sheet: drag handle, close
  button, and the CTA pinned above the safe-area inset. It doesn't stack other sheets; it goes to a
  full page if it needs to scroll ([eBay Playbook](https://playbook.ebay.com/design-system/components/bottom-sheet),
  [Material](https://material.io/components/sheets-bottom)). The keyboard is numeric (`inputmode="decimal"`).
- **Bottom nav** with 4 items: Browse · Portfolio · Leaders · Profile. The coin balance sits in the top bar.
- **Touch targets.** 44×44 pt per Apple, 48dp per Material
  ([OpenReplay](https://blog.openreplay.com/improving-tap-targets-mobile-ux/)), and at least 8px between
  Yes and No.
- **Browse.** A card list with a horizontally scrolling featured rail and a sticky chip row. Pull-to-refresh is the only gesture people need to know.
- **Width.** No horizontal page scroll at 360px. Long range labels wrap rather than truncate.

---

## Accessibility checklist

- [ ] WCAG 2.2 AA contrast. Text 4.5:1 (body) or 3:1 (≥24px or ≥19px bold). UI boundaries and the chart's
      primary lines 3:1. Verify every token pair in both themes.
- [ ] Yes and No never rely on color: they always carry a word (and a check when selected). Up and down always carry ▲/▼ and a sign. Chart lines differ by dash pattern.
- [ ] Test with deuteranopia, protanopia and tritanopia simulation, and in grayscale.
- [ ] Targets at least 24×24 CSS px (2.5.8 AA, [Deque](https://dequeuniversity.com/rules/axe/4.8/target-size)). Primary controls at least 44×44.
- [ ] A visible focus ring on every control: 2px `--brand` plus a 2px `--bg` offset, never removed. Full
      keyboard path through the ticket (Tab order: side → amount → chips → CTA). Esc closes the sheet and
      focus returns to the button that opened it.
- [ ] `prefers-reduced-motion` respected, plus an in-app toggle. No flashing above 3 per second.
- [ ] `tabular-nums` on all figures. Numbers carry readable text for screen readers: "38 percent, up 4"
      instead of "38% ▲4".
- [ ] Live price changes are throttled, not announced on every tick. Trade results go to `aria-live`.
- [ ] Charts have a "View as table" alternative. Sparklines have a text summary.
- [ ] The scrim keeps title text at 4.5:1 over any capsule art.
- [ ] Usable at 200% zoom and at a 320px width. No text in images.
- [ ] Plain-language copy at roughly an 8th-grade reading level. Every term ("share", "resolve") has a tooltip
      the first time it appears.
- [ ] Forms have labels, errors are tied to their fields, and the number input says its unit ("coins").

---

## Alternatives (recommended first)

**1. Launch Night (recommended).** Described above. Dark ink-navy with capsule art as the hero, lime as the
only brand accent, blue/orange Yes/No, Unbounded and Manrope. It reads as a game store first and a market
second. It borrows trust from Steam and Riot and approachability from Manifold. The risk is that lime on navy
can feel "esports energy drink" if overused, so keep it to CTAs and focus.

**2. Field Guide.** Light-first and editorial, closer to Manifold, Metaculus and a good wiki: warm
off-white `#FBF8F3`, ink text, a tomato accent `#E8553D`, and Yes/No in deep blue `#1F5FD1` and amber
`#B86E00`. Type is Bricolage Grotesque for display (its quirks grow at large optical sizes;
[designer notes](https://github.com/ateliertriay/bricolage)) with IBM Plex Sans for numbers. It feels like a
smart community of predictors, and it's the most obviously "not gambling" of the three. It's weaker on "for
gamers": the art carries less punch on light backgrounds, and it may read as homework to 13-year-olds.

**3. Holo Foil.** Collector and achievement led, closer to the Valorant store and Xbox achievements:
near-black `#08090D`, a gold accent `#E8C35A`, rarity frames and holographic gradients on profile and
"Called it" cards, and Chakra Petch for display with Manrope for UI. It has the strongest "gamer" pull and
makes the leaderboard and badges aspirational. It also carries the most risk: rarity and foil cues sit next
to loot-box and casino aesthetics, which matters for a 13+ audience, and gold-on-black looks like premium
currency. It would need strict limits, with foil only on earned badges and never near coins or the ticket.

---

## Flags and unverified items

- **Steam.** The store and redesign dates in sources are inconsistent: one says an August 2025 beta,
  another a June 2026 homepage refresh. Steam hex values come from third-party token extractions.
- **Riot.** The Riot client principles are from a repost of Riot's 2016 Nexus article. The live article
  couldn't be fetched.
- **Font features.** Neither Manrope's nor Unbounded's tabular figures could be checked in the actual
  files (CDN downloads were blocked). Test them in the browser.
- **Motion values.** The Material 3 easing and duration values come from secondary skill files, not Google's
  docs.
- **Polymarket and Kalshi.** Their current Yes/No colors are unconfirmed (see `prediction-market-ui.md`).
  Our blue/orange choice doesn't depend on them.
- **Roblox chip.** The Roblox platform-chip color is my own choice, not from Roblox's brand guidelines.
- **Unbounded.** I found no evidence on how gamers perceive Unbounded. It's a judgment call: prototype the
  card and event header in all three directions before deciding.
