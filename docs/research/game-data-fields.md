# Game data fields: what Steam and Roblox show, and where to get it

Researched 2026-10-18. Goal: each game page in our app should "show the same data the games do on their wish lists", meaning what a player sees for the game on their Steam wishlist or store page, or on a Roblox experience page.

**How this was checked.** This sandbox can't reach store.steampowered.com, api.steampowered.com, games.roblox.com or gamalytic.com directly, so I couldn't call any endpoint live. The field names come from three primary machine-readable sources:

- Valve's own protobuf definitions as dumped by SteamDB: [SteamDatabase/Protobufs `webui/common.proto`](https://github.com/SteamDatabase/Protobufs/blob/master/webui/common.proto), [`service_storebrowse.proto`](https://github.com/SteamDatabase/Protobufs/blob/master/webui/service_storebrowse.proto) and [`service_wishlist.proto`](https://github.com/SteamDatabase/Protobufs/blob/master/webui/service_wishlist.proto). The Steam wishlist and store pages are built from these same messages.
- xPaw's [Steam Web API documentation `api.json`](https://github.com/xPaw/SteamWebAPIDocumentation), for parameters.
- Roblox's merged OpenAPI spec in [Roblox/creator-docs `content/en-us/reference/cloud/openapi.json`](https://github.com/Roblox/creator-docs/blob/main/content/en-us/reference/cloud/openapi.json). It includes the legacy `games.roblox.com`, `thumbnails.roblox.com` and `badges.roblox.com` APIs along with their auth requirements.

Anything marked **(unverified)** comes from memory or third-party reports and needs one live call before we rely on it.

---

## 1. Steam wishlist page: what each item shows

The current wishlist (store.steampowered.com/wishlist/) is a React page. It is fed by `IWishlistService/GetWishlistSortedFiltered`, which returns per item `appid`, `priority`, `date_added`, `category_ids` and a full `store_item` (the `StoreItem` message, built from a `StoreBrowseItemDataRequest`). Press coverage says the redesign shows "platforms, tags, overall review score, and current price with discount", plus Early Access state and add-to-cart ([TechRaptor](https://techraptor.net/content/valve-updates-steam-wishlists-information-new-features), [PC Invasion](https://pcinvasion.com/?p=164760)). The July 2026 update added user-defined wishlist categories and gifting ([Game Developer](https://www.gamedeveloper.com/pc/steam-adds-wishlist-categories-and-cross-region-gifting), [wnhub](https://wnhub.io/news/stores-and-publishing/item-51523)).

What a player sees for one row, and the `StoreItem` field behind it:

| Shown on row | StoreItem field |
|---|---|
| Rank number / drag order | wishlist `priority` (player-specific) |
| Capsule art | `assets.asset_url_format` + `assets.main_capsule` / `small_capsule` / `header` |
| Title | `name` |
| Release date, or "Coming soon" / "Q1 2027" text | `release.steam_release_date` (unix), `release.is_coming_soon`, `release.coming_soon_display`, `release.custom_release_date_message` |
| Early Access badge | `is_early_access`, `release.is_early_access` |
| Demo available marker | `related_items.demos` / `demo_appid` |
| Review summary ("Very Positive", 88% of 12,345) | `reviews.summary_filtered.review_score_label`, `.percent_positive`, `.review_count`, `.review_score` (enum 0–9) |
| Top user tags (about 4–5) | `tags[].tagid` + `weight` (ids only; names come from `IStoreService/GetTagList`) |
| Platforms (Win / Mac / Linux, VR) | `platforms.windows`, `.mac`, `.steamos_linux`, `.vr_support` |
| Steam Deck badge (Verified / Playable / Unsupported) | `platforms.steam_deck_compat_category` (enum: 0 unknown, 1 unsupported, 2 playable, 3 verified **(enum values unverified)**) |
| Price, discount %, original price | `best_purchase_option.formatted_final_price`, `.discount_pct`, `.formatted_original_price`, `.final_price_in_cents` |
| "Free" | `is_free` |
| Date added | wishlist `date_added` (player-specific) |

Rank and date added describe one player's own list, not the game, so they mean nothing on our page. Everything else is a fact about the game.

## 2. Steam store page for an upcoming game

A store page shows these sections:

- header capsule
- trailer and screenshot carousel
- short description
- "All Reviews" and "Recent Reviews" summaries (both say "No user reviews" pre-launch)
- release date, or "To be announced" / "Coming soon"
- developer and publisher links
- franchise
- popular user tags
- Wishlist and Follow buttons
- "Is this game relevant to you?" box
- Steam Deck compatibility
- the purchase box with price and editions (or nothing pre-launch)
- About this game (long description)
- mature content description
- system requirements
- sidebar: features/categories (Single-player, Online PvP, Steam Achievements, Full controller support…), languages table (interface / full audio / subtitles), age rating (ESRB/PEGI…), Metacritic (if any), links (website, Discord, socials)
- DLC
- "More like this"

The page does **not** show follower count, wishlist count or wishlist rank. Steam keeps wishlist counts private. Followers appear only on the game's community group page ([GameDiscoverCo](https://newsletter.gamediscover.co/p/steams-follower-counts-hidden-in)).

## 3. Steam field → API → field name

Two public JSON sources cover almost all of this:

- **A. `store.steampowered.com/api/appdetails?appids=X&cc=us&l=english`.** This is the legacy endpoint we already call. It's undocumented, rate-limited (about 200 requests per 5 minutes per IP, **unverified**) and returns one app per call when filters are used.
- **B. `api.steampowered.com/IStoreBrowseService/GetItems/v1?input_json={"ids":[{"appid":X}],"context":{"language":"english","country_code":"US"},"data_request":{...}}`.** This is what the wishlist and store pages use. It takes up to about 100 ids per call. xPaw's docs list `key` as required, but several projects call it keyless ([ClipFlow #441](https://github.com/Oghenefega/ClipFlow/issues/441), [QIT PR #19](https://github.com/azwrth13/QIT/pull/19), [dlss-swapper #661](https://github.com/beeradmoore/dlss-swapper/issues/661)). The proto comment reads `ePrivilege=1, eWebAPIKeyRequirement=1`, the same as `IStoreService/GetTagList`. **Keyless use is very likely but unverified from here.**

The `data_request` flags are `include_assets`, `include_release`, `include_platforms`, `include_screenshots`, `include_trailers`, `include_ratings`, `include_tag_count` (int), `include_reviews`, `include_basic_info`, `include_supported_languages`, `include_full_description`, `include_links` and `include_extra_details`.

| Data | appdetails (A) | GetItems (B) | Access |
|---|---|---|---|
| Name | `name` | `name` | public, no key |
| Short description | `short_description` | `basic_info.short_description` | public |
| Long description | `about_the_game` / `detailed_description` (HTML) | `full_description_bbcode` | public |
| Header / capsule art | `header_image`, `capsule_image`, `capsule_imagev5`, `background` | `assets.*` (`header`, `main_capsule`, `hero_capsule`, `library_capsule`, `library_hero`, …) joined to `asset_url_format` | public |
| Screenshots | `screenshots[].path_thumbnail` / `path_full` | `screenshots.all_ages_screenshots[].filename` | public |
| Trailers | `movies[]` (`name`, `thumbnail`, video URLs; the format changed with Steam's 2025 move to adaptive streaming, **unverified**) | `trailers.highlights[]` (`trailer_name`, `screenshot_full`, `trailer_url_format`, `adaptive_trailers`) | public |
| Developer / publisher | `developers[]`, `publishers[]` (strings) | `basic_info.developers[].name`, `.publishers[]`, `.franchises[]` | public |
| Release date | `release_date.coming_soon`, `release_date.date` (free text) | `release.steam_release_date` (unix), `is_coming_soon`, `coming_soon_display`, `custom_release_date_message` | public |
| Early access | genre id 70 in `genres` | `is_early_access` | public |
| Genres | `genres[].description` | not as names (use tags) | public |
| Categories / features | `categories[].{id,description}` | `categories.supported_player_categoryids`, `feature_categoryids`, `controller_categoryids` (ids) | public |
| Controller support | `controller_support` ("full"/"partial") | `controller_categoryids` | public |
| User tags | **not present** | `tags[].{tagid,weight}` with `include_tag_count: 20`; names via `IStoreService/GetTagList?language=english` (`response.tags[].{tagid,name}`) | public (same keyless caveat) |
| Platforms | `platforms.{windows,mac,linux}` | `platforms.{windows,mac,steamos_linux,vr_support}` | public |
| Steam Deck compatibility | **not present** | `platforms.steam_deck_compat_category` | public |
| Languages | `supported_languages` (HTML string, asterisk = full audio) | `supported_languages[].{elanguage,supported,full_audio,subtitles}` | public |
| System requirements | `pc_requirements.{minimum,recommended}` (HTML), `mac_`/`linux_requirements` | `extra_details.system_requirements` | public |
| Age rating | `required_age`, `ratings.{esrb,pegi,…}` | `game_rating.{type,rating,descriptors,required_age}` | public |
| Mature content | `content_descriptors.{ids,notes}` | `content_descriptorids` | public |
| Price | `price_overview.{currency,initial,final,discount_percent,final_formatted}`, `is_free` | `best_purchase_option.{final_price_in_cents,original_price_in_cents,discount_pct,formatted_final_price}` | public; depends on `cc` |
| Metacritic | `metacritic.{score,url}` | `extra_details.metacritic` | public |
| DLC | `dlc[]` (appids) | `IStoreBrowseService/GetDLCForApps` | public |
| Achievements count | `achievements.total` | — | public |
| Review label + counts (all time) | `recommendations.total` only (a count, no label) | `reviews.summary_filtered.{review_score_label,percent_positive,review_count}` | public |
| Review counts (exact) | `store.steampowered.com/appreviews/X?json=1&...` gives `query_summary.{review_score, review_score_desc, total_positive, total_negative, total_reviews}`, with totals only on the first page (`cursor=*`) ([Steamworks docs](https://partner.steamgames.com/doc/store/getreviews)) | | public |
| Recent reviews (last 30 days) | Not a field. Approximate with appreviews `day_range=30` (only honoured with `filter=all`) **(unverified)**, or derive from our own snapshots | | public |
| Concurrent players | `api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=X` gives `response.player_count` (parameter list per xPaw: only `appid`) | | public, no key |
| Followers | Not on the store page or in any store API. It is the member count of the game's community group (`steamcommunity.com/games/{appid}/memberslistxml/?xml=1` → `memberCount`, **unverified**). SteamDB shows it. Gamalytic gives `followers` | | scraping / Gamalytic |
| Wishlist count | Never public. Gamalytic estimates it (paid). The owner sees exact counts only in Steamworks | | Gamalytic only |
| Wishlist rank | Not shown as a number. Steam's "Popular Upcoming" and "Most Wishlisted" lists are orderings; SteamDB shows positions from them. The orderings could come from `IStoreQueryService/Query` with `coming_soon_only` (the sort enum is undocumented) | | not available as a clean field |

**Important mismatch with our code.** The store's review label counts only reviews from people who bought on Steam, and excludes off-topic "review bomb" periods. Our `steamReviews()` uses `purchase_type=all`, which includes key activations. Its totals will not match the number a player sees. To match the store, use `purchase_type=steam` (with `filter_offtopic_activity` at its default), or take `reviews.summary_filtered` from GetItems, which is the store's own summary. Keep the `all` counts if a market is defined on them, but label which one is shown.

## 4. Gamalytic

Gamalytic's public game page (e.g. [gamalytic.com/game/294100](https://gamalytic.com/game/294100)) shows:

- copies sold and gross revenue, each with a low–high range
- average playtime (hours)
- review count and review score %
- players / owners
- average daily CCU
- followers
- copies sold in the last 7 days
- DLC breakdown
- "players also played" audience overlap
- store-page insights
- historic charts

Wishlists show "Upgrade to Starter to unlock this" (summarised via search results, since the site blocks fetches).

| Tier | What it adds | Source |
|---|---|---|
| Free / no key | Basic estimates; our code notes 250 API requests per day with some fields missing | [our gamalytic.ts](../../apps/web-arcade/server/sources/gamalytic.ts), [API reference](https://api.gamalytic.com/reference/) |
| Starter, $25/mo | Wishlist estimates for all games, 2,500 API requests per day | [pricing](https://gamalytic.com/pricing) |
| Professional, $75/mo or $810/yr | Unlimited API; wishlist breakdowns by overlap, age, country, library size | [pricing update blog](https://gamalytic.com/blog/pricing-update-3-7-2025) |

For API field names we already request `name, unreleased, revenue, copiesSold, wishlists, followers, reviews, reviewScore, releaseDate, history[{timeStamp, revenue, sales, wishlists, followers}]`. Playtime, price, CCU and audience-overlap field names (`avgPlaytime`, `price`, `players`, `audienceOverlap`?) are **unverified**. Check them against the reference page with a key before using them. All of Gamalytic's figures are model estimates, not Steam data, and we should label them that way.

## 5. Roblox experience page

The page (roblox.com/games/{placeId}) shows:

- thumbnail carousel (images and videos)
- icon
- name
- creator ("By X", with a verified badge)
- like % (thumbs)
- the Play button
- About: description, and a stats grid of Active, Favorites, Visits, Voice chat / Camera, Created, Updated, Server size, Genre, Subgenre
- maturity / age label ("Maturity: Mild", "Ages 9+")
- Store (game passes)
- Badges (with "won yesterday" / "won ever" / rarity)
- Events
- Servers
- Recommended

Every endpoint below is marked in Roblox's OpenAPI with an anonymous security option `{}`, meaning no key or cookie, unless the table says otherwise.

| Shown | Endpoint | Field |
|---|---|---|
| Place → universe id | `apis.roblox.com/universes/v1/places/{placeId}/universe` | `universeId` |
| Name, description | `games.roblox.com/v1/games?universeIds=…` (batch) | `name`, `description` (`sourceName` = untranslated) |
| Creator, verified badge | same | `creator.{id,name,type ("User"/"Group"),hasVerifiedBadge}` |
| Active (playing now) | same | `playing` |
| Visits | same | `visits` |
| Favorites | same | `favoritedCount` (also `/v1/games/{universeId}/favorites/count` → `favoritesCount`) |
| Created / Updated | same | `created`, `updated` (ISO) |
| Server size | same | `maxPlayers` (Open Cloud `Place.serverSize` needs a key) |
| Genre / subgenre | same | `genre`, `genre_l1`, `genre_l2` |
| Paid access price | same / `/v1/games/games-product-info` | `price`, `isForSale`, `localizedFiatPrice` |
| Content restricted | same | `isContentRestricted` |
| Canonical URL | same | `canonicalUrlPath`, `rootPlaceId` |
| Likes / dislikes | `games.roblox.com/v1/games/votes?universeIds=…` | `upVotes`, `downVotes` (like % = up / (up + down)) |
| Icon | `thumbnails.roblox.com/v1/games/icons?universeIds=…&size=512x512&format=Png` | `data[].imageUrl`, `state` |
| Thumbnails carousel | `thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=…&countPerUniverse=10&size=768x432` | `data[].thumbnails[].imageUrl` |
| Videos / media list | `games.roblox.com/v2/games/{universeId}/media` | `assetType`, `imageId`, `videoHash`, `videoTitle`, `approved` |
| Badges | `badges.roblox.com/v1/universes/{universeId}/badges?limit=100` | `name`, `description`, `enabled`, `iconImageId`, `created`, `statistics.{pastDayAwardedCount,awardedCount,winRatePercentage}` |
| Game passes | Legacy `games.roblox.com/v1/games/{universeId}/game-passes` (wrapped by [noblox.js](https://noblox.js.org/lib_games_getGamePasses.js.html); not in the current spec, so **possibly deprecated**). The Open Cloud `/game-passes/v1/universes/{id}/game-passes/creator` needs an API key/OAuth `game-pass:read`. | name, price |
| Languages | `gameinternationalization.roblox.com/v1/supported-languages/games/{universeId}` | `data[].{name,languageCode}` |
| Playable / under review | `games.roblox.com/v1/games/multiget-playability-status?universeIds=…` | `playabilityStatus`, `isPlayable` **(field names unverified)** |
| Age / maturity label | No anonymous endpoint in the spec. Recommendation lists (`/v1/games/recommendations/game/{universeId}`) carry `minimumAge` and `ageRecommendationDisplayName` for the *recommended* games. The page itself uses `apis.roblox.com/experience-guidelines-api/experience-guidelines/get-age-recommendation` (POST `{universeId}`) **(unverified)**. Open Cloud `GET /cloud/v2/universes/{id}` has `ageRating`, `voiceChatEnabled` and device flags, but needs an API key. Background: [experience guidelines](https://create.roblox.com/docs/production/promotion/experience-guidelines) | |
| Events | Open Cloud `/virtual-events/v3/universes/{id}/game-events` needs a key with `universe.event:read`. A public variant probably exists for the page **(unverified)** | |
| Voice / camera | Open Cloud `Universe.voiceChatEnabled` (key) | |

**Upcoming launches on Roblox.** Roblox has no pre-launch wishlist. An unreleased experience is usually private, and the games API returns it with `playing`/`visits` at 0, or not at all (**unverified**). The pre-launch signals are favorites and event "Notify me" counts, the latter not public. Markets should start from the universe id, and treat "launch" as the first public snapshot with `playing > 0` or a date the creator announced.

## 6. What to snapshot over time

All of these change and none of the sources give us a history for free, except Gamalytic `history` (paid):

- **Steam:** `total_reviews`, `total_positive` (both `all` and `steam` purchase types), the review label, `player_count` (CCU), price and discount, release date text (it moves), followers (if scraped), Gamalytic wishlists, followers, copies and revenue, and Deck status.
- **Roblox:** `playing`, `visits`, `favoritedCount`, `upVotes`, `downVotes`, `updated` (marks update days), and `maxPlayers`.

CCU and `playing` are point-in-time values. Sample them more often and store the peak per day. Visits, favorites and reviews are cumulative, so daily deltas give the charts. Our current `Snapshot` type already holds reviews, Gamalytic numbers and the Roblox counts. It is missing Steam CCU, the `steam`-only review counts, price, and the review label.

---

## Recommended game panel spec

"Source" uses these short names: AD = appdetails, GI = IStoreBrowseService/GetItems, AR = appreviews, CCU = GetNumberOfCurrentPlayers, GA = Gamalytic, RG = games/v1/games, RV = votes, RT = thumbnails, RB = badges.

### Steam: game/event page

| Group | Field shown | Source.field | Refresh | Fallback |
|---|---|---|---|---|
| Identity | Title | GI `name` (AD `name`) | daily | stored title |
| | Capsule / hero image | GI `assets.header` / `hero_capsule` (AD `header_image`) | daily | our placeholder |
| | Developer · Publisher | GI `basic_info.developers/publishers[].name` (AD) | daily | "Unknown studio" |
| | Short description | GI `basic_info.short_description` (AD) | daily | hide |
| | Screenshots (6), first trailer | GI `screenshots`, `trailers.highlights[0]` (AD `screenshots`, `movies`) | daily | hide row |
| | Link to Steam page | `https://store.steampowered.com/app/{appid}` | static | — |
| Launch info | Release date or "Coming soon" text, exactly as Steam words it | GI `release.coming_soon_display` / `custom_release_date_message`, else format `steam_release_date`; AD `release_date.date` | every 6 h pre-launch | AD text |
| | Early Access badge | GI `is_early_access` | daily | hide |
| | Demo available | GI `related_items.demos` | daily | hide |
| | Our market close / resolve time | our DB | — | — |
| Live stats | Playing now (after launch) | CCU `player_count` | every 15–30 min post-launch; hourly otherwise | "—" |
| | Reviews: label + "88% of 12,345" | GI `reviews.summary_filtered` (exactly the store's label); AR `query_summary` with `purchase_type=steam` | hourly week one, then 6 h | "No user reviews" |
| | Review counts used for resolution (if `all`) | AR `purchase_type=all` totals | as above | last snapshot |
| Community signal | Est. wishlists (labelled "Gamalytic estimate") | GA `wishlists` | daily | hide (free tier) |
| | Followers | GA `followers` | daily | hide |
| | Est. copies sold / revenue (post-launch, labelled estimate) | GA `copiesSold`, `revenue` | daily | hide |
| | Charts: reviews, CCU, wishlists over time | our snapshots (+ GA `history`) | — | "collecting data" |
| Store facts | Price / discount / Free | GI `best_purchase_option` (AD `price_overview`, `is_free`) for `cc=us` | 6 h | "Price TBA" |
| | Top 5 user tags | GI `tags` → GetTagList names | daily | AD `genres` |
| | Platforms + Steam Deck badge | GI `platforms` | daily | AD `platforms`, no Deck |
| | Players: single / multi / co-op, controller | AD `categories` (names) | daily | hide |
| | Languages (count + "full audio" list) | GI `supported_languages` / AD | weekly | hide |
| | Age rating | GI `game_rating` / AD `ratings` | weekly | hide |

**Steam browse card:** capsule, title, studio, release text, review label + count (or "No reviews yet"), price, top 3 tags, platform/Deck icons, and one market stat (our odds). This mirrors the wishlist row.

### Roblox: game/event page

| Group | Field shown | Source.field | Refresh | Fallback |
|---|---|---|---|---|
| Identity | Name, icon | RG `name`; RT icons `imageUrl` | daily | stored name, placeholder |
| | Creator + verified tick (User/Group) | RG `creator.{name,type,hasVerifiedBadge}` | daily | "Unknown creator" |
| | Thumbnail carousel | RT multiget `thumbnails[]` | daily | icon only |
| | Description | RG `description` | daily | hide |
| Launch info | Created / Last updated | RG `created`, `updated` | hourly | hide |
| | Playable status | `multiget-playability-status` | hourly | assume playable |
| | Maturity / age label | experience-guidelines (unverified) or Open Cloud `ageRating` with our key | weekly | hide |
| Live stats | Active now | RG `playing` | every 5–15 min (store daily peak) | last snapshot |
| | Visits | RG `visits` | hourly | last snapshot |
| | Favorites | RG `favoritedCount` | hourly | last snapshot |
| Community signal | Like % (up / (up + down)) and vote count | RV `upVotes`, `downVotes` | hourly | hide if 0 votes |
| | Charts: visits, favorites, playing | our snapshots | — | "collecting data" |
| Store facts | Genre · Subgenre | RG `genre_l1`, `genre_l2` (else `genre`) | daily | "Experience" |
| | Server size | RG `maxPlayers` | daily | hide |
| | Paid access price | RG `price` | daily | "Free" |
| | Badges count + rarest badge | RB `data[].statistics.winRatePercentage` | daily | hide |

**Roblox browse card:** icon, name, creator + tick, like %, Active now, visits (compact "1.2B"), genre, and our odds.

### Follow-ups before building

1. Make one live keyless call each to GetItems and GetTagList from the server, and confirm the field shapes and enum values above.
2. Change or duplicate the review fetch to `purchase_type=steam`, so the label matches the store.
3. Add `steam.playerCount`, `steam.reviewsSteamOnly`, `steam.priceCents` and `steam.reviewLabel` to `Snapshot`.
4. Check the Gamalytic field names for playtime and price with a key.
5. Test the Roblox age-recommendation and public game-pass endpoints.
