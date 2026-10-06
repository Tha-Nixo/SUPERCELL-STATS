# SupercellStats restyle — design spec

Date: 2026-10-06 · Status: approved in chat by the owner (direction, scope, navigation) · Next: phased implementation plan (writing-plans).

## Goal

Make supercellstats.com look modern and clean, easier to understand and easier to navigate, on desktop and on phones, without regressing anything the production gate (lint, typecheck, unit tests, Playwright e2e, Lighthouse) currently guarantees.

## Decisions taken with the owner

| Question | Decision |
|---|---|
| Visual direction | **Clean modern dashboard** (Linear/Vercel feel): neutral dark surfaces, strong typography, generous spacing, one accent colour per game, data first. |
| Scope | **Everything, in phases**, each phase = one PR with tests + review + deploy, so production is never left half-restyled. |
| Player-page navigation | **Sticky header + sticky section tabs**; two columns on desktop, one on mobile; tabs scroll horizontally on small screens. |

## Problems observed on production (2026-10-06 screenshots, 1440 px and 390 px)

1. Phone: the trophy number is clipped (`322,20…`), tabs wrap onto two rows, the page is ~4400 px tall.
2. Empty glyph boxes where icons/emoji are expected (above the game title, next to trophy counts). May be a server-side Chromium font limit, but emoji as UI icons is fragile anyway → replace with SVG icons.
3. Player page is one long column with no way to jump: recent battles sit three screens down; tab state is local component state (`useState`) so it is not linkable and "back" does not restore it.
4. `GamePage.tsx` (≈680 lines) mixes layout, search, and per-game tab logic for three games; `theme.css` carries unused default shadcn light tokens while the real look is hard-coded Tailwind classes. Styling decisions are scattered.

## Design system

Tokens live in `src/styles/theme.css` as CSS variables exposed to Tailwind 4 (`@theme`), replacing the unused shadcn defaults. Components use tokens, never raw hex.

- **Surfaces:** `--bg #0B0F1A` (page, unchanged), `--surface-1 #11172A` (cards), `--surface-2 #172038` (raised / hover), `--border rgba(255,255,255,.08)`.
- **Text:** `--text #F2F5FF`, `--text-muted rgba(255,255,255,.70)`, `--text-subtle rgba(255,255,255,.60)` (the floor — AA on `--bg`, 7.2:1 measured; nothing below white/60 for text).
- **Accent per game** (`data-game` attribute on the page root switches `--accent`, `--accent-soft`): Clash Royale `#4C8DFF`, Brawl Stars `#FFC21A`, Clash of Clans `#5BD65B`. Semantic: win `#34D399`, loss `#F87171`, draw `#94A3B8`.
- **Type:** Inter variable (already self-hosted) for all text; the existing Clash display font only for the game wordmark and h1. Scale: 12 / 14 / 16 / 20 / 28 / 40. Numbers use `tabular-nums`; big numbers use `clamp()` so they never clip on a 320 px viewport.
- **Shape/space:** radius 12 (cards) and 999 (pills); 4-pt spacing grid; one shadow level; hairline borders instead of heavy outlines.
- **Icons:** lucide-react SVG only (already a dependency); no emoji in UI chrome.
- **Motion:** 150–200 ms opacity/transform only; everything disabled under `prefers-reduced-motion`. No blur-filter blobs (they cost 480 ms TBT before).

## Shared components (new, `src/app/ui/`)

| Component | Responsibility |
|---|---|
| `AppHeader` | Sticky top bar: back to games, search box, game switcher (CR · BS · CoC). |
| `SearchBox` | Player-tag input with validation message, `/` focuses it from anywhere, recent searches list (existing `recentSearches` service). |
| `PlayerSummaryBar` | Compact player identity (name, level, trophies, league) — becomes the sticky condensed bar after scrolling past the hero. |
| `SectionTabs` | Accessible tablist (`role=tablist`, arrow keys), horizontally scrollable on mobile, **state in the URL** (`?tab=<id>`, default first tab, invalid id falls back). |
| `Card`, `StatTile`, `Row`, `Pill` | Visual primitives replacing the ad-hoc class strings. |
| `Skeleton`, `EmptyState`, `ErrorState` | Loading placeholders (no layout shift), empty and error views; retry re-runs the search for the **URL tag**. |

`GamePage.tsx` is reduced to routing + data loading + shell; each game gets its own page module (`pages/game/ClashRoyale.tsx`, `BrawlStars.tsx`, `ClashOfClans.tsx`) composing the shared components. Existing data components (`CROverview`, `BSProfile`, …) are restyled in place in their game's phase rather than rewritten.

## Pages

- **Home:** shorter hero (wordmark + one-line value statement), three large game cards each with the search box inline and the game accent, recent searches row, footer disclaimer. The three "feature" chips are removed (they advertised nothing the cards don't already say).
- **Player page — desktop (≥1024 px):** sticky header → player hero → sticky tabs → two-column content (primary stats/trend left, secondary clan/deck/achievements right). **Mobile:** same order, single column, summary bar condenses on scroll.
- **Tabs per game** (ids stable, in the URL): Clash Royale `overview | cards | deck | battles | towers`; Brawl Stars `overview | brawlers | progression | battles | club`; Clash of Clans `overview | army | heroes | achievements`. "Battles" is promoted to its own tab with filters (mode, win/loss/draw) for CR and BS.
- **States:** every async region has a skeleton, an empty state and an error state with the real reason from the API mapper.

## Contracts that must not change

- Routes: `/`, `/game/:gameId`, `/game/:gameId/player/:tag` (bare tag; `%23TAG` keeps working). `?tab=` is additive.
- Production CSP in `docs/caddy-tail.caddy`: **no new third-party origin, no inline script, fonts self-hosted.** (Changing it requires the root apply script and is out of scope.)
- Bundle budget enforced by `scripts/check-bundle.mjs` (entry chunk ≈12 KB); no heavy new dependency; no API key in `dist/`.
- Data layer (`supercellService.ts`, `gameApiRouter.ts`) is not modified except for bugs found while restyling.

## Phases (each = branch → PR → CI → review → merge → deploy → prod verification)

1. **Foundation:** tokens, shared `ui/` components with unit/e2e coverage, Home, player-page shell (header, search, summary bar, tabs-in-URL, skeleton/empty/error), per-game page modules wired to the *existing* tab contents. Tab ids and `?tab=` land here for all three games.
2. **Clash Royale** profile restyle + battles tab with filters.
3. **Brawl Stars** profile restyle + battles tab with filters.
4. **Clash of Clans** profile restyle.

## Acceptance (every phase)

- `npm run lint`, `typecheck`, `test`, `build` (incl. bundle check) green; CI green.
- Playwright e2e green locally and, after deploy, against production with the three public tags; new e2e per phase: tab selection updates the URL and survives reload/back, `/` focuses search, no console errors, no failed non-image requests.
- Screenshots at 390, 768 and 1440 px for Home and one player page per game committed under `docs/screenshots/` for review (reviewers must look at them).
- Lighthouse on production: accessibility 100, best practices 100, SEO 100, performance ≥ 90 on `/` and the three `/game/<id>` pages; no text below AA contrast; every interactive element ≥ 44 px tall on mobile; keyboard: all controls reachable, visible focus ring.
- No clipped text or horizontal scroll at 320 px width.

## Out of scope

Light theme, i18n, new data/endpoints, charts library, authentication, rewriting the data layer, changing the CSP/Caddy config, the pending major dependency upgrades.

## Risks

- Large visual diff: mitigated by phases and screenshots in the PR; reviewers judge screenshots, not only code.
- Tabs-in-URL changes navigation state: covered by e2e (reload, back, invalid `?tab`).
- Per-game page split touches `GamePage.tsx` heavily in phase 1: keep behaviour identical, move code before changing it, e2e with real tags as safety net.
