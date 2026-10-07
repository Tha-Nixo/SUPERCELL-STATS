# Competitor research — Supercell stats sites (2026-10-07)

Method: RoyaleAPI, StatsRoyale, Brawlify, ClashOfStats and ClashSpot block fetchers (Cloudflare 403), so their cells rest on search-engine page summaries and app listings. ✓ verified, p partial, ✗ absent, ? unverified, – not applicable. Anything marked `?` must be re-checked before it drives a decision.

## Feature matrix

RAPI = RoyaleAPI, SR = StatsRoyale, DS = DeckShop, RT = RoyaleTracker, BFY = Brawlify, BTN = BrawlTime.ninja, COS = ClashOfStats, CSP = ClashSpot, CNJ = Clash Ninja. Every site offers tag lookup, as does ours.

| Feature | RAPI | SR | DS | RT | BFY | BTN | COS | CSP | CNJ | Ours |
|---|---|---|---|---|---|---|---|---|---|---|
| Stored history (more than 25 battles, trophy graph, clan history) | ✓ | ? | ? | ? | ✓ | ? | ✓ | ✓ | ✓ | p (last 25 battles only) |
| Leaderboards | ✓ | ✓ | ? | ✓ | ✓ | ✓ | ✓ | ✓ | ? | ✗ |
| Crawled meta / win rates | ✓ | ✓ | p | ✓ | ✓ | ✓ | – | – | – | ✗ |
| Deck builder / analyzer | ✓ | p | ✓ | ✓ | – | – | – | – | – | ✗ |
| Clan war / CWL analytics | ✓ | ? | ? | ? | – | – | ✓ | ✓ | ✓ | ✗ |
| Events / rotation / map stats | ? | ✓ | p | ? | ✓ | ✓ | – | – | – | ✗ |
| Upgrade tracker / calculators | – | – | – | – | – | – | ? | p | ✓ | ✗ |
| Accounts / favourites / push | ? | ? | ? | ? | ? | ✗ | ? | ✓ | ✓ | p (local recent searches) |
| Share image / signature | ? | ? | ? | ? | ? | ✓ | ? | ✓ | ? | ✗ |
| Mobile app | ? | ✓ | ? | ? | ✓ | ? | ✓ | ? | ✓ | ✗ |
| Multi-language UI | ✓ | ✓ | ✓ | ? | ✓ | ✓ | ✓ | ? | ? | ✗ |

Sources: https://royaleapi.com/blog/clan-wars-2-tools, https://apps.apple.com/us/app/-/id1264722932, https://www.deckshop.pro, https://royaletracker.gg, https://brawlify.com/player/RLLQ2UQQ8/history, https://brawltime.ninja/about, https://apps.apple.com/app/id1546458325, https://www.patreon.com/clashspot/about, https://www.clash.ninja, https://discuss.royaleapi.com/t/export-more-than-25-battles-player-history/3514 (summary only).
Also checked: DeckMelon, TrophyCoach, Clanalyze, ClashPerk, Brawlytics. Chocolate Clash closed in 2025; clashtrack.com is gone.

## Traffic drivers

Semrush, August 2026 visits: RoyaleAPI 8.4M, Brawlify 1.15M, Clash Ninja 1.15M, BrawlTime 0.97M, StatsRoyale 0.53M (https://www.semrush.com/website/royaleapi.com/overview/). SimilarWeb rank, September 2026: RoyaleAPI #7.6k, DeckShop #16k, StatsRoyale #48k, ClashOfStats #96k, ClashSpot #106k. Estimates; the sources disagree. 53–83% of visits are direct (brand). Non-brand queries are decks, catalogs and trackers ("clash royale decks" ~110k/month, "deck builder" ~33k, "brawl stars characters", "coc upgrade tracker").

## What each tier needs

- **Live official-API only (no storage):** rankings pages (CR players/clans/clanwars/Ranked; BS players/clubs/per-brawler; CoC players/clans/capital/league seasons), catalog pages for cards/brawlers/troops, events and rotation, tournaments, player compare, one search box probing all three APIs, CR deck analyzer, live clan views (CR currentriverrace, CoC currentwar/CWL group — 403 when the war log is private), CoC upgrade tracker from the in-game Data Export paste (client side only: https://www.clash.ninja/blog/one-tap-village-updating-is-here).
- **Needs storage (SQLite):** the battlelog holds only 25 battles; Supercell removes CWL data after the season (https://clanalyze.com/faq/). So: track-on-first-lookup history, war/CWL and season-end ranking archives, favourites with Web Push or Telegram, stale-while-revalidate cache with a per-key limiter.
- **Needs crawling (CR and BS only; CoC has no battlelog endpoint):** meta/win rates. DeckMelon: 67.0M battles, hourly refresh, 50-battle minimum, ranked+ladder only, 30-day window (https://deckmelon.com/faq). RoyaleAPI: one person indexing millions of battles a day (https://seeminglee.com/blog/royaleapi/). Disk is not the limit (~150–250 B per battle, 10–17 GB for 67M rows); the API budget is (community report ~0.33–1 req/s per token: https://github.com/SebJana/clash-royale-analytics/issues/3). Not realistic on a residential connection with the shared proxy at first.

## Unified-site opportunities

Tags share one alphabet (`0289CGJLPQRUVY`, https://github.com/RoyaleAPI/cr-api-docs/blob/HEAD/docs/faq.md) but identify per-game accounts; no cross-game, Supercell ID or fan-site OAuth endpoint was found (unverified). Options: one search box that probes the three APIs and lists the matches; a local "My accounts" page holding three tags; cross-game friend compare; a "Today across Supercell" page. TrophyCoach already covers the three games (Pro $7.99/month, API+MCP: https://trophycoach.com/pricing); the wedge is free, no account, privacy-first.

## Policy and rate limits

- **Supercell Fan Content Policy** (updated 2023-09-27, https://supercell.com/en/fan-content-policy/): non-commercial, no fees "including in-app functionalities"; only ads, donations (no perks, so no ad-free tier) and coaching are allowed; no unreleased information; no modifying assets; revocable at any time without warning. Required text: "This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy." Domains and handles may not contain SUPERCELL or game names without written agreement (supercellstats.com does — owner's decision). Licensed art: https://fankit.supercell.com.
- **Official APIs:** keys are IP-bound (up to 5 CIDRs per key), limits enforced but unpublished, terms = the Fan Content Policy. Community figures: ~10 req/s per token. Abuse means an IP ban.
- **Endpoint families:** CR players, battlelog, upcomingchests; clans, members, currentriverrace, riverracelog; cards; tournaments, globaltournaments, challenges; locations rankings (players/clans/clanwars/Ranked), seasons, leaderboards. BS players, battlelog, clubs, members, rankings (players/clubs/brawlers), brawlers, events/rotation. CoC clans, members, warlog, currentwar, CWL group/wars, capitalraidseasons, players (+verifytoken), locations rankings, leagues/seasons, labels, goldpass. (Client libraries: brawlstats `core.py`, coc.py `http.py`.) Swagger needs login; exact paths must be probed.
- **RoyaleAPI proxy** (https://docs.royaleapi.com/proxy.html): fixed IP 45.79.218.79 (changed once, 2022); proxy./bsproxy./cocproxy.royaleapi.dev. No rate-limit, caching, commercial-use or SLA terms documented. One person, funded by ads and donations; closed its own API in 2020 (https://royaleapi.com/blog/sunset-api). It sees the keys. Cache hard.
- **Hotlinking:** `royaleapi.github.io/cr-api-assets` README: "clone this repo and not use these assets directly as if it's a CDN" (https://github.com/RoyaleAPI/cr-api-assets). cdn.brawlify.com terms unverified.
