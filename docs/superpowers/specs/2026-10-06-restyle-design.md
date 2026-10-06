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
- Performance budget (next section) is enforced by the build; no API key in `dist/`.
- Data layer (`supercellService.ts`, `gameApiRouter.ts`) is not modified except for bugs found while restyling.

## Performance budget

Baseline measured 2026-10-06 on the production build (`86be52c`), gzip sizes:

| Item | Baseline | Budget (build fails above) |
|---|---|---|
| Initial JS on `/` (entry 4.5 + react 76.6 + motion 41.5 KB) | 122.6 KB | **135 KB** (+10%) |
| JS to render a player page (initial + `GamePage` chunk 40.6 KB) | 163.2 KB | **180 KB** (+10%) |
| Entry chunk alone | 4.5 KB | **8 KB** |
| CSS (single file) | 12.7 KB | **16 KB** |
| Fonts (woff2 actually requested on first paint: latin only) | 48 KB | **50 KB**, no extra font files on the critical path |

Rules:

1. **No new runtime dependency over 5 KB gzip** unless the PR description justifies it (what it replaces, why a ~50-line own implementation is not enough) and the budget table above is raised in the same PR with the new number. Prefer what is already shipped: Tailwind utilities, CSS transitions, lucide icons (imported individually, never the whole set), `motion` (already in the initial bundle — new animations use it instead of a second library).
2. **Per phase growth ≤ 5%** on each budgeted line versus the previous phase; the cumulative cap is the +10% column. Anything above must be paid for by removing something else in the same PR.
3. **Enforced, not honour-system:** `scripts/bundle-budget.json` holds the numbers; `scripts/check-bundle.mjs` computes the gzip sizes of the chunks reachable from `dist/index.html` (and of the `GamePage` chunk) and fails `npm run build` when any exceeds its budget, printing the delta. The file and the check land in the first task of phase 1 (before any UI work) so every later PR is measured against it.
4. **Lab Web Vitals on production** (Lighthouse mobile profile, same method as the 2026-10-06 audit): CLS ≤ 0.05, Total Blocking Time ≤ 150 ms, LCP ≤ 3.0 s (lab values are noisy: re-run once before treating a miss as real), performance score ≥ 90.
5. **Heavy assets stay lazy:** images below the fold use `loading="lazy"` with explicit width/height (no layout shift); the per-game page module and its data components load only on their route (route-level code splitting stays as it is).
6. **Visual effects budget:** no `filter: blur()` / `backdrop-filter` on large areas, no animated gradients, no more than one continuously running animation on screen.

## Phases (each = branch → PR → CI → review → merge → deploy → prod verification)

1. **Foundation:** tokens, shared `ui/` components with unit/e2e coverage, Home, player-page shell (header, search, summary bar, tabs-in-URL, skeleton/empty/error), per-game page modules wired to the *existing* tab contents. Tab ids and `?tab=` land here for all three games.
2. **Clash Royale** profile restyle + battles tab with filters.
3. **Brawl Stars** profile restyle + battles tab with filters.
4. **Clash of Clans** profile restyle.

## Acceptance (every phase)

- `npm run lint`, `typecheck`, `test`, `build` (incl. bundle check) green; CI green.
- Playwright e2e green locally and, after deploy, against production with the three public tags; new e2e per phase: tab selection updates the URL and survives reload/back, `/` focuses search, no console errors, no failed non-image requests.
- Screenshots at 390, 768 and 1440 px for Home and one player page per game committed under `docs/screenshots/` for review (reviewers must look at them).
- Performance budget respected (`npm run build` green) and production Lab Web Vitals within the budget above.
- Lighthouse on production: accessibility 100, best practices 100, SEO 100, performance ≥ 90 on `/` and the three `/game/<id>` pages; no text below AA contrast; every interactive element ≥ 44 px tall on mobile; keyboard: all controls reachable, visible focus ring.
- No clipped text or horizontal scroll at 320 px width.

## Out of scope

Light theme, i18n, new data/endpoints, charts library, authentication, rewriting the data layer, changing the CSP/Caddy config, the pending major dependency upgrades.

## Risks

- Large visual diff: mitigated by phases and screenshots in the PR; reviewers judge screenshots, not only code.
- Tabs-in-URL changes navigation state: covered by e2e (reload, back, invalid `?tab`).
- Per-game page split touches `GamePage.tsx` heavily in phase 1: keep behaviour identical, move code before changing it, e2e with real tags as safety net.
