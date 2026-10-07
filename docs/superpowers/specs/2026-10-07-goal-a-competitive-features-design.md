# Goal A — competitive features: design spec

Date: 2026-10-07 · Status: decided by the owner (positioning, scope, order) · Next: one implementation plan per phase (writing-plans), executed with subagents, reviewed, merged, deployed, verified in production.

Background: `docs/research/2026-10-07-competitors.md` (competitor matrix, traffic, policy, rate limits). The restyle spec `docs/superpowers/specs/2026-10-06-restyle-design.md` (Acceptance, Performance budget) and its plans stay in force: every rule there applies here unless this document says otherwise.

## Goal and positioning

Today the site does one thing the big sites do (look up a player) and lacks what makes people come back: leaderboards, a "what is on now" page, catalog pages that rank in search, one search that works for every game. Goal A adds those, using only live official-API data plus a cache. Positioning: **one site for Clash Royale, Brawl Stars and Clash of Clans; free; no accounts; fast; privacy-first.** Out of scope (Goal B): stored history (SQLite), favourites/notifications, clan/war pages, deck tools, player compare page, upgrade tracker, i18n, meta win rates by crawling battles.

## Decisions (not to be reopened)

1. A cache service sits between Caddy and the RoyaleAPI proxies. Caddy keeps injecting the `Authorization` header; the service forwards it upstream and never logs, stores or keys on it. Agents never read the keys.
2. Caddy and CSP changes need sudo, which only the owner has: ONE script written by an agent, run once by the owner (section "Caddy script").
3. Supercell policy: no monetization or perks, the official disclaimer on every page, no unreleased content, no modification of Supercell assets. The proprietary Clash display font is not touched; the site name/domain is not changed (owner's decisions; the risk is documented below).
4. No analytics, no cookies, no server-side storage of tags or IPs, minimal logs.
5. No frontend runtime dependency over 5 KB gzip; new routes are lazy chunks; initial JS must not grow.
6. UI text stays English like the rest of the site. Route slugs follow the owner's wording where he gave one: `/oggi` (label "Today"), `/accounts` ("My accounts"). i18n is Goal B.
7. Third-party data is used only if it is proven to contain released items only and its license allows it; otherwise official API data only.

## Verified API facts (probed through the production site, 2026-10-07)

The proxy keys are injected by Caddy, so `https://supercellstats.com/api/<game>/<path>` reaches the official API. Only structure was recorded; no player data.

| Game | Path (after `/api/<game>`) | Result |
|---|---|---|
| CR | `/locations` | 262 locations (254 countries), fields `id`, `name`, `isCountry`, `countryCode` (Italy = 57000120, `IT`); regions have no `countryCode` |
| CR | `/locations/{id\|global}/pathoflegend/players` | works: `tag, name, expLevel, eloRating, rank, clan` — **this is the player ranking** |
| CR | `/locations/{id\|global}/rankings/players` | **empty** (`items: []`): the old Trophy Road ranking is gone; do not build on it |
| CR | `/locations/{id\|global}/rankings/clans`, `/rankings/clanwars` | work: `tag, name, rank, previousRank, location, clanScore, members, badgeId` |
| CR | `/cards` | 123 cards + 4 `supportItems`: `id, name, maxLevel, maxEvolutionLevel, elixirCost, rarity, iconUrls` |
| CR | `/globaltournaments` | 200, currently `items: []`; `/challenges` → **404** (no longer exists); `/tournaments?name=` works (search); `/leaderboards` 33 entries (several `name: null`); `/locations/global/seasons` 144 ids |
| BS | `/rankings/{global\|CC}/players` and `/clubs` | work with ISO country codes (`IT`) or `global`: players `tag, name, nameColor, icon, trophies, rank, club`; clubs `tag, name, badgeId, trophies, rank, memberCount` |
| BS | `/rankings/{global\|CC}/brawlers/{brawlerId}` | works (same shape as players) |
| BS | `/brawlers` | 108 brawlers: `id, name, starPowers, gadgets, gears, hyperCharges` (lists of `{id, name}`) |
| BS | `/events/rotation` | 18 slots: `startTime, endTime` (compact ISO `20261007T080000.000Z`), `slotId`, `event{id, mode, modeId, map}` |
| CoC | `/locations` | 268 locations with `countryCode` for countries (Italy = 32000120); `/locations/32000006` (international) rankings → **404** |
| CoC | `/locations/{id}/rankings/players`, `/clans`, `/capitals`, `/players-builder-base` | work for countries: players `tag, name, expLevel, trophies, attackWins, defenseWins, rank, previousRank, clan, league, leagueTier`; clans `…clanLevel, members, clanPoints`; capitals `…clanCapitalPoints`; builder base `builderBaseTrophies, builderBaseLeague` |
| CoC | `/goldpass/seasons/current` | `{ startTime, endTime }` |
| CoC | `/leagues`, `/capitalleagues`, `/labels/players` | work (catalog-like lists) |

Consequences: CR player rankings use Path of Legend; CoC has no worldwide ranking (use countries, and check region ids `32000000…` during planning); the `/oggi` Clash Royale section has global tournaments only and must hide itself gracefully when empty; countries can be matched across games through `countryCode` (the unified country selector maps ISO code → CR id, CoC id, BS code).

## Architecture

```
browser → Cloudflare → Caddy (supercellstats.com)
            /api/<game>/*  → rewrite /<game>{uri}, inject Authorization
                           → cache service 127.0.0.1:<port>
                           → https://{proxy|bsproxy|cocproxy}.royaleapi.dev/v1/… → Supercell API
            static + SPA routes → ~/apps/supercellstats/dist
```

### A0 — cache service

- Source in `server/cache/` (Node 22 ESM, no runtime dependencies: `node:http`, global `fetch`), `Dockerfile`, `compose.yaml`, `scripts/deploy-cache.sh` (build image tagged with the git sha, keep the previous tag, run, wait for `healthy`, roll back automatically if it never becomes healthy). Runs through docker as the normal user from `~/apps/supercell-cache`, publishes ONLY `127.0.0.1:<free port>` (pick one not in `ss -tlnp`), non-root, read-only filesystem, memory limit 256 MB, `restart: unless-stopped`, Docker healthcheck, graceful shutdown.
- Interface: `GET|HEAD /<game>/<upstream path>` with `<game>` ∈ `clash-royale | brawl-stars | clash-of-clans`, mapped to the fixed upstream host + `/v1/<path>`. `/_health` and `/_metrics` exist on the same listener but Caddy only forwards `/api/<game>/…`, and paths starting with `/_` are never reachable from outside.
- **Allow-list** (no open proxy): only the endpoint families below, only GET/HEAD; reject encoded slashes, `..`, unknown paths and unknown query parameters (404/400); tags validated `^(%23|#)[0289PYLQGRJCUV]{3,14}$` case-insensitively and normalised upper-case; numeric ids validated; `limit` clamped to 1–200; `after`/`before` cursors length-capped. Families: players (`/players/{tag}`, `/battlelog`, `/upcomingchests`), clans/clubs (`/clans/{tag}`, `/clubs/{tag}` + `/members`), `/cards`, `/brawlers`, `/brawlers/{id}`, `/events/rotation`, `/locations`, `/locations/{id|global}/pathoflegend/players`, `/locations/{id|global}/rankings/{players|clans|clanwars|capitals|players-builder-base}`, `/rankings/{global|CC}/{players|clubs}` and `/brawlers/{id}`, `/globaltournaments`, `/tournaments`, `/goldpass/seasons/current`, `/leagues`, `/capitalleagues`, `/labels/{players|clans}`. The plan must grep the frontend for every `/api/` call and prove the allow-list covers all of them (e2e guard).
- **Cache key:** game + normalised path + sorted allowed query. Never `Authorization`, cookies or client IP.
- **TTLs:** players, battlelogs, upcoming chests 60 s; clans/clubs/members 120 s; rankings 15 min; `/events/rotation` 5 min; `/globaltournaments`, `/tournaments` 2–5 min; `/goldpass` 1 h; `/cards`, `/brawlers`, leagues, labels 1 h; `/locations` 24 h. Negative caching: 404 and 403 120 s (helps the unified search), never 429/5xx. Stale-while-revalidate for 2× TTL, stale-if-error up to 10 minutes beyond TTL (1 h for catalogs). Request coalescing: identical concurrent misses cause one upstream call.
- **Limits:** per client IP token buckets — total 300 req/min (burst 100) and upstream-bound (MISS/revalidate) 60 req/min (burst 20); global per-game upstream limiter (≈8 req/s, burst 16) protecting the shared key; excess → `429` JSON with `Retry-After`; upstream 429 is passed through with its `Retry-After`. The client IP comes from the header Caddy sets (`X-Forwarded-For`, trusted only from `127.0.0.1`): the plan must verify empirically what reaches the service behind Cloudflare. Buckets are bounded in memory (LRU of IPs).
- **Responses:** `X-Cache: HIT | MISS | STALE | BYPASS`, `Age`, `ETag` + `If-None-Match` → 304, `Cache-Control: public, max-age=<small>, stale-while-revalidate=<…>` per family (players ≤ 15 s; rankings/catalogs longer), `Vary` as needed, hop-by-hop headers stripped, upstream timeout 10 s, body cap 2 MB, JSON error bodies `{ "reason": …, "message": … }` compatible with the frontend's current error mapping. In-memory LRU bounded by bytes (≈64 MB).
- **Privacy:** no access log; error logs carry class/status only, never tags together with IPs, never headers. Metrics (`/_metrics`, plain counters: hits, misses, stale, coalesced, limited, upstream errors by status, bytes) are local only.
- **Tests:** vitest (node env) against a fake upstream: hit/miss/stale/coalescing, TTLs with a fake clock, allow-list rejections, limiter (per IP and global), headers, ETag, stale-if-error, no Authorization in the key, body cap, timeouts; a `npm run cache:loadtest` script that proves the limiter under load; a live smoke script for production (second request is a HIT; a burst gets 429).

### Caddy script (owner runs it once)

`~/crowdsec/11-supercellstats-cache-and-routes.sh`, style of `~/crowdsec/10-supercellstats-caddy.sh` (backup, validate with the CrowdSec env as in the earlier scripts, reload, post-checks with automatic rollback, idempotency guard, final summary). It must: (1) refuse to run unless `http://127.0.0.1:<port>/_health` answers; (2) rewrite the three `handle_path /api/<game>/*` blocks in place with a regex transformation that PRESERVES each block's existing `header_up Authorization` line (the agent never reads the token): `rewrite * /<game>{uri}` and `reverse_proxy 127.0.0.1:<port>` instead of the upstream host (drop `header_up Host` and the `transport` block); (3) add every new SPA route to the app handler (table below) and serve prerendered catalog pages from `{path}/index.html` with a REAL 404 for unknown catalog slugs; (4) serve `/sitemap.xml` and `/robots.txt` as static files with sensible `Content-Type`; (5) leave the security headers and the `handle_errors` block byte-identical; (6) keep a commented rollback path (direct upstream routes) and implement automatic rollback on any failed check: `/` 200, `/game/clash-royale` 200, `/nope` 404, `/api/clash-royale/cards` returns JSON with `X-Cache`, the second identical request is `HIT`, `/rankings/clash-royale/players` 200 (once the pages exist; before that the script checks the route matcher with a `/oggi`-style probe that must return the SPA shell 200), a catalog URL 200 and an unknown catalog slug 404.

### Route table

| Route | Kind | Notes |
|---|---|---|
| `/`, `/game/:gameId`, `/game/:gameId/player/:tag` | existing | unchanged |
| `/search` | SPA, `noindex` | `?tag=`; unified search results (A1); add `Disallow: /search` to robots |
| `/accounts` | SPA | "My accounts" (A1) |
| `/rankings` | SPA | redirects (client) to `/rankings/clash-royale/players` |
| `/rankings/:game/:kind` | SPA + static shell per kind for head tags | `?country=<ISO\|global>&after=<cursor>`; kinds: CR `players, clans, clanwars`; BS `players, clubs, brawlers/:brawlerId`; CoC `players, clans, capitals, builder-players` (A2) |
| `/oggi` | SPA + static shell | "Today" (A3) |
| `/clash-royale/cards`, `/clash-royale/cards/:slug` | prerendered | A4 |
| `/brawl-stars/brawlers`, `/brawl-stars/brawlers/:slug` | prerendered | A4 |
| `/clash-of-clans/troops`, `/clash-of-clans/troops/:slug` | prerendered | troops, spells, siege machines, pets, heroes in one slug space with a `kind` label; A4 |
| `/sitemap.xml`, `/robots.txt` | static | A4 regenerates the sitemap; robots keeps `Disallow: /game/*/player/` |

Unknown paths keep returning a real 404 with the app shell (existing behaviour).

## A1 — unified search and "My accounts"

- Home gets one search box above the game cards: "Find a player in any game". Input validated with the existing tag rules (Phase 1 `SearchBox`/`tag.ts`: single source of truth). Submit → `/search?tag=<slug>`.
- `/search` probes `/api/<game>/players/%23TAG` for the three games in parallel (timeout 8 s each, AbortController), shows one card per game in three states: found (name, level / Town Hall / trophies, link to the profile), not found (404), failed (network/429/5xx: message + retry button per game). If exactly one game found and the others are cleanly "not found", `navigate(..., { replace: true })` to the profile. Lightweight response mappers (`pickSummary(game, raw)`), unit-tested; do not import the heavy `supercellService` into this chunk. Honest copy: tags are per game, so a tag can exist in more than one game.
- `/accounts`: localStorage key `ss.accounts.v1` = `{ 'clash-royale'?, 'brawl-stars'?, 'clash-of-clans'?: { tag, savedAt } }` validated on read (corrupt storage never crashes — Phase 3 lesson), one tag per game, add/replace/remove, each saved account loaded in parallel through the cache and shown as a mini comparison card (name, trophies/level, link). A "Save as my account" button on player pages. Text: stored only in this browser.
- Acceptance: unit tests for mappers/storage/validation; e2e with fixtures for all three states, partial failure, auto-redirect on a single match, corrupt storage; CLS ≤ 0.05; 320 px; focus management (results heading focus after submit, retry buttons).

## A2 — rankings

- `/rankings/:game/:kind?country=` with a country `<select>` (native, labelled) populated from `/locations` (cached 24 h), filtered to `isCountry`, mapped through `countryCode`; "Global" only where supported (CR clans/clanwars/Path of Legend, BS all; not CoC: for CoC the default is the visitor's country or Italy). Default country from `navigator.language` region when valid, else `global`/`IT`. Kind tabs per game (`SectionTabs` pattern, URL-addressable), BS `brawlers` kind has a brawler selector (from `/brawlers`).
- Table: rank, previous-rank delta (where provided), name (+ tag), score column per kind (Path of Legend `eloRating`, trophies, clan score, capital points, builder base trophies), clan/club, badge/league art through `GameImage`. Player rows link to `/game/:id/player/:tag`; clan/club rows are not linked (clan pages are Goal B). Mobile: card list below `sm` (Phase 3 brawlers pattern). `limit=50` plus a "Load more" button using `paging.cursors.after` (no infinite scroll; focus stays put). Empty state ("No ranking for this country") and error state with retry.
- SEO: static shell per kind/game (titles like "Clash Royale top players — Supercell Stats"); content is client-rendered (live data), so these pages are not the SEO engine; they are the retention feature.
- Acceptance: unit tests (location mapping, default country, URL parsing with invalid values falling back without rewriting the URL, row mappers); e2e with fixtures (every kind, country change updates the URL and the table, load more, empty, error), the live check through the cache; CLS ≤ 0.05; touch targets ≥ 44 px.

## A3 — Today (`/oggi`)

- Sections: **Brawl Stars events** (`/events/rotation`: active now vs upcoming, mode, map, start/end in the visitor's time zone, countdown to the end of each active slot); **Clash Royale global tournaments** (`/globaltournaments`; currently empty → "No global tournament open right now"; no challenges section because the endpoint is gone); **Clash of Clans Gold Pass** (`/goldpass/seasons/current`: start/end, elapsed bar, countdown). Each section loads independently with its own skeleton/empty/error state; a missing endpoint hides or explains the section, never breaks the page.
- Countdowns: one shared timer (1 s tick only while a countdown is visible), `tabular-nums` so digits never shift the layout, text alternative (not a ticking live region), reduced-motion safe. Parsing of the compact ISO dates is a pure, unit-tested function (including malformed input).
- Mode names: map the camelCase modes (`gemGrab`…) through a small tested prettifier with a safe fallback.
- Acceptance: unit tests (date parsing, countdown formatting, grouping active/upcoming, mode names), e2e with fixtures and a fake clock, empty and failure states, CLS ≤ 0.05, 320 px.

## A4 — catalog pages (SEO)

- Data: committed snapshot files under `src/data/catalog/` produced by `npm run catalog:update` (a script fetching through the production cache and writing deterministic, sorted JSON): CR from `/cards` (+ `supportItems`), BS from `/brawlers`, CoC from the live payload of a maxed public test player (the official API has no CoC catalog endpoint; a maxed account lists every released troop, spell, siege machine, pet, hero and equipment with max levels — the tag stays out of committed files; the script reads it from an environment variable). Build and deploy NEVER depend on the API being up. Schema tests validate each snapshot. Third-party datasets are used only under decision 7.
- Pages (`/clash-royale/cards/:slug`, `/brawl-stars/brawlers/:slug`, `/clash-of-clans/troops/:slug` + index pages): CR card: elixir cost, rarity, max level, evolution flag, icon, related cards (same rarity/elixir, internal links); BS brawler: gadgets, star powers, hypercharge, gears (names), art, link to `/rankings/brawl-stars/brawlers/:id`; CoC item: kind, village, max level, art, related items. Honest limits: no win rates or "decks with this card" without crawling; pages stay factual and link-rich.
- **Prerendering:** extend `scripts/prerender-shells.mjs` (or a sibling) to emit `dist/<path>/index.html` per page with head tags (title, description, canonical, Open Graph, optional JSON-LD `BreadcrumbList`) AND real body content (h1, key facts as text, related links) rendered at build time (e.g. `react-dom/server`), so the HTML response is meaningful without JavaScript. Test: fetch the built HTML and assert the item name in `<h1>`, the facts and the internal links are present. The client then mounts the same page.
- Slugs: kebab-case of the name (`p-e-k-k-a`), id suffix on collision; unit-tested including collisions and names with punctuation.
- Sitemap: generated into `dist/sitemap.xml` at build from the snapshots plus the static routes; `lastmod` = snapshot date. `robots.txt` keeps the existing rules.
- Internal links: names of cards, brawlers and troops in profile tabs link to the catalog pages (44 px targets, accessible names).
- Compliance task inside A4: inventory every hotlink to `royaleapi.github.io` (the site uses it as an icon fallback) and replace it with official art hosts already allowed by the CSP or an unmodified local copy with provenance noted; the new pages must not add that host.
- Acceptance: snapshot/slug/sitemap unit tests; prerender test; e2e (index and detail pages, links from profiles, unknown slug → real 404 against the preview with the Caddy-equivalent behaviour where testable); Lighthouse targets on one detail page.

## Phases and ownership

1. **A0** cache service + `deploy-cache.sh` + Caddy script. Owner action: run the script (once). Everything after A0 deploys with `scripts/deploy.sh`.
2. **A1**, **A2**, **A3**, **A4** — independent after A0 (A4's internal links and the BS per-brawler rankings link benefit from A2); each is one plan, one branch, one PR, one deploy.
3. Closing task: whole-goal verification against the acceptance list, README/DEPLOY updates, memory notes, hand-off text.

## Performance budget

Phase-start numbers are measured on main when A0 starts (build prints them) and written to `scripts/bundle-budget.json` per the restyle procedure. Initial JS and the entry chunk must not grow beyond the per-phase cap. The budget gate is extended to measure the new lazy chunk families by manifest name with absolute caps (proposal: search ≤ 15 KB, rankings ≤ 25 KB, today ≤ 15 KB, catalog ≤ 20 KB gzip, adjustable with a justified PR), keeping the "fail instead of silently pass" rules of `check-bundle.mjs`. CLS ≤ 0.05, no horizontal scroll at 320 px, WCAG AA, touch targets ≥ 44 px on every new page.

## Testing and acceptance (whole goal)

- Unit (Vitest, node env), fixtures e2e (Playwright, `mockApi` extended per feature), CLS/overflow matrix rows for every new page at 320/390/1440, live e2e against production with the three public test tags (env only, never committed), cache service integration + load tests, Lighthouse mobile on `/`, one `/rankings/...` page, `/oggi` and one catalog detail page: accessibility, best practices and SEO 100, performance ≥ 90 (median of ≥ 3 runs).
- Production checks: `X-Cache` header present, a second identical request is a `HIT`, a burst from one IP gets `429` with `Retry-After`, `sitemap.xml` lists the new pages, an unknown catalog slug is a real 404, the disclaimer text is on every new page, CSP unchanged, no console errors.
- Every phase ends with a whole-branch review (cross-task regressions, real-data path, production CSP applied to every page, budget, a11y, screenshots committed under `docs/screenshots/goal-a-<phase>/` and actually looked at).

## Policy checklist (Supercell Fan Content Policy)

Official disclaimer on every new page (reuse `SiteFooter`); no ads, perks or paid features; no unreleased content (official catalogs and maxed-player payloads only); assets unmodified; no analytics; keep the three public test tags out of every committed file.

## Risks

- **Domain and name:** the policy says domains and handles may not contain SUPERCELL or game names without written agreement; `supercellstats.com` does. Owner decision; flag in every hand-off; do not change it.
- **RoyaleAPI proxy:** one person, no documented limits, sees the keys, may change IP (once in 2022). Mitigation: aggressive caching, stale-if-error, limiter, metrics; an own-IP exit is a future option.
- **Proprietary font** `Clash_Regular.otf`: served as is; owner decision.
- **Thin SEO pages:** catalog pages may rank poorly without meta data; they are cheap and link-rich; do not over-invest.
- **API changes:** endpoints can disappear (CR `challenges` did): every section degrades gracefully; the live check in the plan lists the endpoints used.
- **Cloudflare:** API responses are not cached at the edge by default; optional owner action (cache rule for `/api/*/rankings`, `/api/*/cards`) — not required.

## Open questions for the owner (non-blocking)

1. Domain/name risk (see above).
2. UI language: routes `/oggi` and `/accounts` with English UI text; Italian UI arrives with i18n in Goal B — acceptable?
3. Optional Cloudflare cache rule for rankings/catalog API responses.
