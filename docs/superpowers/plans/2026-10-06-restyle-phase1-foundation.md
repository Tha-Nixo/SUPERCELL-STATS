# SupercellStats Restyle, Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the restyle foundation: an enforced performance budget, design tokens, shared `src/app/ui/` components, a new Home, and a player-page shell (sticky header, search, summary bar, tabs in the URL, skeleton/empty/error states) hosting the *existing* per-game content through one lazily loaded module per game.

**Architecture:** Tokens live in `src/styles/theme.css` as CSS variables exposed to Tailwind 4 through `@theme inline`; a `data-game` attribute on a page root switches the accent. `GamePage.tsx` shrinks to routing + data loading + shell; game-specific rendering moves to `src/app/pages/game/{ClashRoyale,BrawlStars,ClashOfClans}.tsx`, each selecting one existing data component per `?tab=` id. Pure logic (tab parsing, tag normalisation, emoji stripping, budget arithmetic) is unit tested with Vitest in the node environment; behaviour is tested with Playwright against `vite preview` with the Supercell API served from synthetic fixtures via `page.route`.

**Tech Stack:** React 18, react-router 7 (data router, `lazy` routes), Vite 7, Tailwind CSS 4 (`@tailwindcss/vite`), lucide-react, motion 12, TypeScript 5.9 (strict, `noUnusedLocals`), Vitest 5 (node env), Playwright 1.63 (Chromium), Node 22+ (CI) / Node ≥ 22.18 to run `scripts/screenshots.mjs` (native TypeScript stripping).

**Spec:** `docs/superpowers/specs/2026-10-06-restyle-design.md` (read it before Task 1; this plan argues from it).

**How this plan was checked:** every code block below was built and run in a throw-away copy of the repository (`git archive 18c8708`): after each task `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (with the budget check) and `npm run e2e` were green, and the full e2e suite passed 3× in a row with 6 workers. Budget numbers quoted in the tasks are the ones that run measured.

## Global Constraints

- Routes are unchanged: `/`, `/game/:gameId`, `/game/:gameId/player/:tag` (bare tag; `%23TAG` keeps working). `?tab=` is additive. `src/app/routes.ts` is not edited.
- Production CSP (`docs/caddy-tail.caddy`) is unchanged: no new third-party origin, no inline script, fonts self-hosted (`font-src 'self'`). Inline `style=""` attributes stay allowed (`style-src 'unsafe-inline'`), `<script>` must not be added anywhere.
- No new runtime dependency over 5 KB gzip. This plan adds **no** dependency at all and removes the dev dependency `tw-animate-css`.
- Performance budget (spec, "Performance budget"), enforced by `npm run build` from Task 1 on: initial JS on `/` ≤ **135 KB**, JS to render a player page ≤ **180 KB**, entry chunk ≤ **8 KB**, CSS ≤ **16 KB**, preloaded fonts ≤ **50 KB** with no extra font file on the critical path; per-phase growth ≤ **5 %** on each line versus the phase start (entry chunk exempt, see Plan decisions). Anything above must be paid for in the same task.
- Visual effects budget: no `filter: blur()` / `backdrop-filter` on large areas, no animated gradients, at most one continuously running animation on screen. Motion is 150–200 ms opacity/transform only and is disabled under `prefers-reduced-motion`.
- Accessibility: WCAG AA; **no text dimmer than white/60** (`text-fg-subtle` is the floor; never `text-white/40`, `/45`, `/50`, `/55` in new code); every interactive element ≥ 44 px tall on mobile; all controls keyboard reachable with a visible focus ring; no emoji in UI chrome (lucide SVG icons only, imported one by one).
- Components use tokens (`bg-surface-1`, `text-fg-muted`, `border-line`, `bg-accent`, `rounded-card`...), never raw hex.
- Tailwind scans `.tsx`/`.ts` **including comments**: do not write bare utility-like words (`shadow`, `outline`, `hidden`, `blur`...) in comments of new files; every stray class costs CSS budget.
- Line endings: preserve each file's existing style. CRLF files touched by this plan: `src/app/components/BSProfile.tsx` (edited only through the script in Task 6). Every new file is LF. Check with `git diff --stat` + `grep -c $'\r' <file>` before committing.
- Data layer untouched: `src/app/services/supercellService.ts`, `gameApiRouter.ts`, `recentSearches.ts`, `apiKeys.ts` and `src/app/data/mockStats.ts` are not modified.
- Scope: Phase 1 only. The inside of the CR/BS/CoC data components (`src/app/components/CR*.tsx`, `BS*.tsx`, `CoC*.tsx`, `MatchHistory.tsx`, `StatCard.tsx`, `TrophyTrend.tsx`) is not restyled; they are only re-hosted and receive the new accent through their existing `accent`/`accentColor` props. The two exceptions are listed in Plan decisions (D11, D12).
- Real player tags appear only through `E2E_CR_TAG`, `E2E_BS_TAG`, `E2E_COC_TAG`; never in a committed file. Fixtures use the invented tag `#PYLQGRJC`.
- Every commit leaves `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` green, and the site deployable.
- Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Copy: sentence case, plain verbs, no em dash (`—`) in new UI strings, no exclamation marks, errors say what happened and what to do.

---

## Visual rules (apply to every UI task)

| Rule | Value |
|---|---|
| Page background | `bg-canvas` (`--bg #0B0F1A`), set on `html`/`body` by `theme.css` |
| Surfaces | cards `bg-surface-1` + `border border-line` + `shadow-card`; raised/hover `bg-surface-2`; strong hairline `border-line-strong` |
| Text | primary `text-fg`; secondary `text-fg-muted` (white/70); tertiary/captions `text-fg-subtle` (white/60, the floor) |
| Accent | `text-accent`, `bg-accent`, `bg-accent-soft`; text on a solid accent fill is `text-accent-contrast` (#0B0F1A, ≥ 5.9:1 on all three accents) |
| Semantic | `text-win`/`bg-win-soft`, `text-loss`/`bg-loss-soft`/`border-loss-line`, `text-draw`/`bg-draw-soft` (pre-mixed; never `bg-loss/10`, which adds color-mix fallbacks to the CSS) |
| Type scale | 12 `text-xs` · 14 `text-sm` · 16 `text-base` · 20 `text-xl` · 28 `text-title` · 40 `text-display`; numbers `tabular-nums`; big numbers `text-stat` = `clamp(20px … 28px)` |
| Fonts | Inter (self-hosted) everywhere; `font-display` (Clash) only for h1 and game names, always `font-normal` (the face has one weight) |
| Radii | `rounded-card` 12 px for cards, inputs, buttons; `rounded-pill` for pills, chips and the tab indicator; `rounded-lg` (8 px) only for small inner squares |
| Spacing | 4-pt grid (Tailwind default). Page gutter `px-4 sm:px-6`, content width `max-w-6xl`, card padding `p-4 sm:p-5`, gaps 8/12/16 (`gap-2/3/4`), sections `mt-8`–`mt-12` |
| Grids | always `grid-cols-1 …` (minmax(0,1fr)) so an input's intrinsic width cannot widen the page at 320 px |
| Focus | global `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px }`; do not add `focus:outline-none` to interactive elements in new code (SearchBox's input is the one exception: its field border turns `border-accent` via `focus-within`) |
| Hover / press | colour/border shift over 150 ms (`transition-colors duration-150`); buttons `active:scale-[0.98]`; no hover scale on cards |
| Touch targets | `min-h-11` (44 px) on every button, link-button, tab and chip; icon-only buttons `w-11` |
| Reduced motion | `theme.css` zeroes animation/transition durations under `prefers-reduced-motion: reduce`; skeleton pulse uses `motion-safe:animate-pulse`; `MotionConfig reducedMotion="user"` in `main.tsx` stays |
| Sticky chrome | header `h-14` (56 px, `--header-h`), tab strip `h-12` (48 px, `--tabs-h`), both opaque `bg-canvas` (no backdrop blur) |
| Avoid | gradients as decoration, gradient text, glows/blur blobs, emoji, all-caps tracked eyebrows in new code, decorative status dots, `→` appended to button text (use a lucide `ArrowRight`) |

---

## File Structure

New shared UI (`src/app/ui/`), each file one responsibility:

| File | Responsibility |
|---|---|
| `cx.ts` | `cx(...parts)` class joiner |
| `Button.tsx` | `buttonClasses(variant, className)` + `<Button>`; 44 px, three variants |
| `Card.tsx` | the one surface, optional title/action row |
| `Row.tsx` | label/value line of a list |
| `Pill.tsx` | small non-interactive label with tones |
| `StatTile.tsx` | one headline number with clamp()ed size |
| `Skeleton.tsx` | `Skeleton`, `PlayerPageSkeleton`, `PanelSkeleton` |
| `EmptyState.tsx` | nothing-to-show view with icon, title, next step, action |
| `ErrorState.tsx` | failed request: real reason + Retry |
| `tag.ts` | `tagSlug`, `isPlausibleTag`, `TAG_HINT` (mirror of the service helpers, kept out of the entry chunk) |
| `text.ts` | `stripEmoji` for data strings shown in the chrome |
| `tabs.ts` | `parseTab`, `withTab` (`?tab=` in the URL) |
| `SearchBox.tsx` | player-tag search: validation, `/` shortcut, recent searches datalist |
| `SiteFooter.tsx` | fan-content disclaimer footer |
| `Avatar.tsx` | player image with fallback chain |
| `PlayerSummaryBar.tsx` | player hero (`PlayerSummaryBar`) + condensed header identity (`PlayerSummaryCompact`) + `PlayerSummary` type |
| `AppHeader.tsx` | sticky top bar: back, title slot, game switcher, search |
| `SectionTabs.tsx` | accessible, horizontally scrolling tablist + `TabDef` type |
| `__tests__/{tag,text,tabs}.test.ts` | Vitest |

Per-game page modules (`src/app/pages/game/`):

| File | Responsibility |
|---|---|
| `modules.ts` | `GAME_MODULES` (React.lazy per game), `GameId`, `isGameId` |
| `types.ts` | `GameModuleProps` |
| `tabs.tsx` | `GAME_TABS`: public tab ids/labels/icons per game |
| `summary.tsx` | `buildSummary(game, stats, urlTag)` → `PlayerSummary` (avatar chain, Town Hall art) |
| `GameLanding.tsx` | `/game/:gameId` without tag: big search + recent searches |
| `OverviewExtras.tsx` | trend + latest battles row shared by CR and BS overviews |
| `ClashRoyale.tsx`, `BrawlStars.tsx`, `ClashOfClans.tsx` | default export: one existing data component per tab id |

Modified: `src/styles/theme.css` (rewritten), `src/styles/tailwind.css`, `src/app/pages/{Home,GamePage,NotFound}.tsx`, `src/app/components/ErrorBoundary.tsx`, `src/app/components/BSProfile.tsx` (exports, wrapper removed), `src/app/components/TrophyTrend.tsx` (one hook), `src/app/data/games.ts` (accents, `shortName`), `scripts/check-bundle.mjs`, `vite.config.ts`, `package.json`, `e2e/smoke.spec.ts`.
Deleted: `src/app/components/CRProfile.tsx`.
Budget: `scripts/bundle-budget.json`, `scripts/bundle-budget-lib.mjs`, `scripts/bundle-budget-lib.test.mjs`.
E2E: `e2e/support/{helpers,fixtures,mockApi}.ts`, `e2e/{ui,home,player,tabs,sticky}.spec.ts`.
Screenshots: `scripts/screenshots.mjs`, `docs/screenshots/phase1/*.png`.

## Plan decisions

Where the spec is ambiguous or meets the code, this plan decided. Each line: decision · why · cost if wrong.

- **D1. The 5 % per-phase cap is enforced on every build, the entry chunk is exempt from it (8 KB absolute cap only).** · The spec wants "enforced, not honour-system", and the phase cap is how it keeps growth honest; but Home's new search (SearchBox, recent searches) necessarily lands in the entry chunk (4.49 → 6.65 KB measured), which the spec's own 8 KB line anticipates. · If wrong, the entry can grow to 8 KB in one phase; tighten by removing `entryJs` from `phaseGrowthExempt`.
- **D2. Budget lines are computed from Vite's manifest (`build.manifest: true`, `dist/.vite/manifest.json`), route chunks are referenced by chunk name (`GamePage`, `ClashRoyale`...), sizes are kB = 1000 bytes, gzip level 9; fonts = bytes of fonts preloaded by `dist/index.html`.** · Manifest keys change from source path to `_GamePage-<hash>.js` as soon as another chunk imports from GamePage (observed in Task 4), names are stable; level-9 gzip approximates what Cloudflare serves. The manifest file is public but only lists asset names (and is scanned for tokens like every other file). · If wrong, numbers differ from Vite's printout by < 1 %; phase-start values are measured with the same method (`122.75 / 163.58 / 4.49 / 12.81 / 48.26` at 18c8708), so the comparison stays fair.
- **D3. `tw-animate-css` is removed.** · Its utilities cost 0.39 KB gzip of CSS for one use (`animate-in fade-in slide-in-from-top-2` on CROverview's badge list), and without that saving the token + primitive CSS (Task 2) lands at 13.39 KB against a 13.45 KB phase cap. · The badges list in CROverview loses its 200 ms entrance until Phase 2 restyles that component; the leftover class names are inert.
- **D4. The shadcn theme is replaced, but the element typography defaults (h1–h4, label, button, input) are kept with literal values.** · Phase 2–4 components rely on them for headings without a size class. The shadcn `--radius` overrides go, so `rounded-lg`/`rounded-xl` return to Tailwind's 8/12 px (12 px = the spec's card radius). · Data components lose 2 px of corner radius until their phase.
- **D5. `games.ts` `accent`/`chartPrimary`/`badgeColor` take the spec colours (`#4C8DFF`, `#FFC21A`, `#5BD65B`), with a Vitest test keeping them equal to `theme.css`.** · Data components receive the accent as a hex prop; the shell reads it from `[data-game]` variables; one colour per game across both. · Small hue change in charts and pills; deliberate.
- **D6. Brawl Stars sections receive the game accent, not the player's name colour.** · A name colour can be white or dark and fail contrast; the spec wants one accent per game. · Players lose their name-colour tint on BS panels.
- **D7. Tab ids follow the spec exactly** (`towers`, not CR's old `tower`; BS `home` → `overview`, `battlelog` → `battles`). The BS `club` tab is always listed and shows an EmptyState for players without a club (ids stay stable). Phase 1 battles tab = existing `MatchHistory` (CR) / `BSBattleLog` (BS); filters arrive in Phases 2/3. · Stable public ids. · None known.
- **D8. Tab URL rules:** default tab is written as *no* `?tab` (canonical URL); an unknown/empty id falls back to the first tab without rewriting the URL; ids are matched case-insensitively; clicks push a history entry, arrow keys/Home/End replace it (automatic activation, no history spam); `selectTab` reads `window.location` so two fast key presses cannot use a stale URL (found by stress-running the e2e). · Back restores the previous section, links stay short. · If owners want invalid ids corrected in the address bar, add a `replace` navigation.
- **D9. One player-tag input per page.** The header shows the search only on player pages; the game landing (`/game/:id`) shows one large SearchBox instead; Home has one per game card with distinct labels (`Clash Royale player tag`...). On phones the header search is a toggle that opens a row under the header. · Duplicate inputs labelled "Player tag" would break `getByLabel('Player tag')` in `e2e/smoke.spec.ts` and confuse screen readers; a two-row sticky header would eat ~20 % of a phone screen. · The header search costs one tap on phones.
- **D10. SearchBox validates tags client-side with `src/app/ui/tag.ts`, a copy of `normalizeTag`/`isValidTag` kept equal by a parity test.** · Importing `supercellService.ts` from Home would pull the whole API layer into the entry chunk; the data layer may not be edited to split it. · Two copies of a 3-line rule; the parity test fails if they drift.
- **D11. Bug fix in a data component: `TrophyTrend` measures its width in `useLayoutEffect` instead of `useEffect`.** · Its 720 px default width overflowed 320/390 px screens for one frame (caught by the "no horizontal scroll" e2e under load). · None (same measurement, earlier).
- **D12. `CRProfile.tsx` is deleted and `BSProfile`'s wrapper (its own tablist and blurred background) is removed; its five sections become named exports.** `StatCard.tsx` stays (CoCOverview uses it). · The shell's SectionTabs replaces both internal tablists; the blurred backgrounds broke the "no blur on large areas" rule. · None; content components are untouched.
- **D13. The condensed player identity lives in the header's title slot** (same 56 px height; on phones the game switcher hides while it shows), driven by an IntersectionObserver on the hero. · A separate bar that appears under the header would push content down (layout shift) or need extra sticky height. · The switcher is one scroll-up away on phones while scrolled.
- **D14. Retry always re-runs the search for the URL tag** (the old Retry used whatever was typed in the box). · Spec: "retry re-runs the search for the URL tag". · None.
- **D15. Emoji coming from data strings (`rank`, stat labels) are stripped in the shell (`stripEmoji`) but left inside data components** until their phase. · Data layer is frozen; chrome must be emoji-free. · Some panels keep data emoji (e.g. "1,000 🏆" on BS podiums) until Phases 2–4.
- **D16. Two columns in Phase 1 only where the shell owns the layout:** the CR and BS overview end with a `lg:grid-cols-2` row (trophy trend | latest 5 battles with "All battles"). The inner layout of data components changes in their phase. · Re-hosting only, per scope. · Desktop overview is still mostly one column until Phases 2–4.
- **D17. E2E player pages use synthetic fixtures served by `page.route`** (`e2e/support/mockApi.ts`), game-art CDNs answered with a 1×1 PNG. Real-tag tests stay env-gated in `smoke.spec.ts`. · Deterministic, works in CI (whose preview proxy points at production), never writes a real tag. · Fixtures may drift from the live API shape; the env-gated real-tag tests still cover production.
- **D18. Fonts:** Home's h1 and the game names use the Clash display face, which Home's game titles already requested before this phase; nothing new is preloaded. The fonts budget line counts preloaded fonts only and fails on any preload other than `/fonts/Inter-latin.woff2`. · Spec allows Clash for "wordmark and h1". · If Lighthouse flags the Clash request on `/`, drop `font-display` from Home's h1.
- **D19. Unknown `/game/:id` renders the shared `NotFound` page** instead of GamePage's ad-hoc "Game Not Found" block. · One 404 design. · None.
- **D20. Dead branches for "other games" in GamePage (`STAT_ICONS`, `getStatIcon`, "All Stats" block) are deleted in Task 4.** · All three games were already excluded from them. · None.

---

### Task 1: Enforced performance budget

**Files:**
- Create: `scripts/bundle-budget.json`, `scripts/bundle-budget-lib.mjs`, `scripts/bundle-budget-lib.test.mjs`
- Modify: `scripts/check-bundle.mjs` (whole file, currently 60 lines), `vite.config.ts:9-12` (test include) and `vite.config.ts:47-48` (build)

**Interfaces:**
- Consumes: the existing post-build hook `"build": "tsc && vite build && node scripts/prerender-shells.mjs && node scripts/check-bundle.mjs"` in `package.json` (unchanged).
- Produces:
  - `scripts/bundle-budget.json` keys: `budgets{initialJs,playerPageJs,entryJs,css,fonts}`, `maxPhaseGrowth`, `phaseGrowthExempt: string[]`, `phaseStart{…}`, `playerPageEntries: string[]` (chunk names), `gameModules: string[]` (chunk names; empty until Task 4), `allowedPreloadFonts: string[]`.
  - `scripts/bundle-budget-lib.mjs` exports `toKB(bytes): number`, `gzipBytes(buf): number`, `resolveKey(manifest, ref): string`, `closure(manifest, ref): Set<string>`, `closureOf(manifest, refs): Set<string>`, `preloadedFonts(html): string[]`, `evaluate(measured, budget): Array<{line, value, limit, delta, ok, reason}>`.
  - `npm run build` prints a "performance budget" table and exits 1 when a line is over its limit. Task 4 adds `"ClashRoyale", "BrawlStars", "ClashOfClans"` to `gameModules`.

- [ ] **Step 1: Let Vitest see tests under `scripts/`**

In `vite.config.ts` change the test include (line 11):

```ts
        include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
```

- [ ] **Step 2: Write the failing test**

Create `scripts/bundle-budget-lib.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { closure, closureOf, evaluate, preloadedFonts, resolveKey, toKB } from './bundle-budget-lib.mjs';

const manifest = {
  'index.html': { file: 'assets/index-a.js', isEntry: true, imports: ['_react-b.js', '_motion-c.js'], dynamicImports: ['src/app/pages/GamePage.tsx'] },
  '_react-b.js': { file: 'assets/react-b.js' },
  '_motion-c.js': { file: 'assets/motion-c.js', imports: ['_react-b.js'] },
  // Vite drops the source-path key once another chunk imports the route chunk.
  '_GamePage-d.js': { file: 'assets/GamePage-d.js', name: 'GamePage', isDynamicEntry: true, imports: ['_react-b.js', 'index.html'], dynamicImports: ['src/app/pages/game/ClashRoyale.tsx'] },
  'src/app/pages/game/ClashRoyale.tsx': { file: 'assets/ClashRoyale-e.js', name: 'ClashRoyale', src: 'src/app/pages/game/ClashRoyale.tsx', isDynamicEntry: true, imports: ['_shared-f.js', '_GamePage-d.js'] },
  '_shared-f.js': { file: 'assets/shared-f.js' },
};

const budget = {
  budgets: { initialJs: 135, playerPageJs: 180, entryJs: 8, css: 16, fonts: 50 },
  maxPhaseGrowth: 0.05,
  phaseGrowthExempt: ['entryJs'],
  phaseStart: { initialJs: 122.75, playerPageJs: 163.58, entryJs: 4.49, css: 12.81, fonts: 48.26 },
};

describe('resolveKey', () => {
  it('accepts an exact key, a source path or a lazy chunk name', () => {
    expect(resolveKey(manifest, 'index.html')).toBe('index.html');
    expect(resolveKey(manifest, 'src/app/pages/game/ClashRoyale.tsx')).toBe('src/app/pages/game/ClashRoyale.tsx');
    expect(resolveKey(manifest, 'GamePage')).toBe('_GamePage-d.js');
    expect(resolveKey(manifest, 'ClashRoyale')).toBe('src/app/pages/game/ClashRoyale.tsx');
  });
  it('does not resolve shared (non-lazy) chunks by name', () => {
    expect(() => resolveKey(manifest, 'react')).toThrow(/matches 0 chunks/);
  });
});

describe('closure', () => {
  it('follows static imports only, once each', () => {
    expect([...closure(manifest, 'index.html')].sort()).toEqual(['assets/index-a.js', 'assets/motion-c.js', 'assets/react-b.js']);
  });
  it('unions several keys without duplicates', () => {
    expect([...closureOf(manifest, ['index.html', 'GamePage', 'ClashRoyale'])].sort()).toEqual([
      'assets/ClashRoyale-e.js', 'assets/GamePage-d.js', 'assets/index-a.js', 'assets/motion-c.js', 'assets/react-b.js', 'assets/shared-f.js',
    ]);
  });
  it('fails loudly when a configured entry no longer exists', () => {
    expect(() => closure(manifest, 'Gone')).toThrow(/update scripts\/bundle-budget.json/);
  });
});

describe('preloadedFonts', () => {
  it('reads preload links in any attribute order and ignores other links', () => {
    const html = '<link rel="preload" href="/fonts/Inter-latin.woff2" as="font" type="font/woff2" crossorigin />'
      + '<link as="font" href="/fonts/X.woff2" rel="preload">'
      + '<link rel="preconnect" href="https://cdn.brawlify.com" crossorigin />'
      + '<link rel="modulepreload" href="/assets/react-b.js">';
    expect(preloadedFonts(html)).toEqual(['/fonts/Inter-latin.woff2', '/fonts/X.woff2']);
  });
});

describe('evaluate', () => {
  const at = (overrides) => ({ ...budget.phaseStart, ...overrides });

  it('passes the phase-start numbers themselves', () => {
    expect(evaluate(at({}), budget).every((r) => r.ok)).toBe(true);
  });
  it('fails a line above its absolute budget', () => {
    const row = evaluate(at({ fonts: 50.01 }), budget).find((r) => r.line === 'fonts');
    expect(row).toMatchObject({ ok: false, reason: 'over budget', limit: 50 });
  });
  it('fails a line that grew more than 5% in the phase even under the absolute budget', () => {
    const row = evaluate(at({ initialJs: 129 }), budget).find((r) => r.line === 'initialJs');
    expect(row).toMatchObject({ ok: false, reason: 'over the per-phase growth cap', limit: 128.89, delta: 0.11 });
  });
  it('lets an exempt line grow up to its absolute budget only', () => {
    const rows = evaluate(at({ entryJs: 7.9 }), budget);
    expect(rows.find((r) => r.line === 'entryJs')).toMatchObject({ ok: true, limit: 8 });
    expect(evaluate(at({ entryJs: 8.1 }), budget).find((r) => r.line === 'entryJs')?.ok).toBe(false);
  });
  it('treats a missing measurement as a failure', () => {
    const { css: _css, ...rest } = budget.phaseStart;
    expect(evaluate(rest, budget).find((r) => r.line === 'css')).toMatchObject({ ok: false, reason: 'not measured' });
  });
});

describe('toKB', () => {
  it('uses 1000-byte kB with two decimals', () => {
    expect(toKB(48256)).toBe(48.26);
    expect(toKB(4490)).toBe(4.49);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run scripts/bundle-budget-lib.test.mjs`
Expected: FAIL, `Failed to load url ./bundle-budget-lib.mjs` (module does not exist).

- [ ] **Step 4: Implement the pure helpers**

Create `scripts/bundle-budget-lib.mjs`:

```js
/**
 * Pure helpers behind the performance budget in scripts/check-bundle.mjs.
 * Kept free of file-system access so Vitest can exercise them directly.
 */
import { gzipSync } from 'node:zlib';

/** Bytes to kB (1000 bytes, the unit Vite prints and the spec's table uses), 2 decimals. */
export const toKB = (bytes) => Math.round(bytes / 10) / 100;

/** gzip size of a buffer at the highest level, as a CDN would serve it. */
export const gzipBytes = (buf) => gzipSync(buf, { level: 9 }).length;

/**
 * Manifest key for a budget reference: an exact key ("index.html"), a source
 * path, or the name of a lazily loaded chunk ("GamePage"). Vite keys a chunk
 * by its source path only while no other chunk imports it, so names are the
 * stable way to refer to route chunks.
 */
export function resolveKey(manifest, ref) {
  if (manifest[ref]) return ref;
  const matches = Object.entries(manifest)
    .filter(([, chunk]) => chunk.src === ref || (chunk.isDynamicEntry && chunk.name === ref))
    .map(([key]) => key);
  if (matches.length !== 1) {
    throw new Error(`"${ref}" matches ${matches.length} chunks in the Vite manifest; update scripts/bundle-budget.json`);
  }
  return matches[0];
}

/**
 * Every chunk file statically reachable from a budget reference in a Vite
 * manifest, the referenced chunk's own file included. Dynamic imports are not followed: they are not
 * needed to render the route that owns `key`.
 */
export function closure(manifest, ref) {
  const key = resolveKey(manifest, ref);
  const files = new Set();
  const seen = new Set();
  const stack = [key];
  while (stack.length) {
    const k = stack.pop();
    if (seen.has(k)) continue;
    seen.add(k);
    const chunk = manifest[k];
    if (!chunk) throw new Error(`manifest entry "${k}" is imported but missing`);
    files.add(chunk.file);
    for (const dep of chunk.imports ?? []) stack.push(dep);
  }
  return files;
}

/** Union of the closures of several budget references. */
export function closureOf(manifest, refs) {
  const all = new Set();
  for (const ref of refs) for (const file of closure(manifest, ref)) all.add(file);
  return all;
}

/** href of every <link rel="preload" as="font"> in an HTML document, in document order. */
export function preloadedFonts(html) {
  const out = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel=["']?preload\b/i.test(tag) || !/\bas=["']?font\b/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i);
    if (href) out.push(href[1]);
  }
  return out;
}

/**
 * Compare measured sizes (kB) with the budget file. One row per budget line.
 * The limit of a line is the lower of its absolute budget and, unless the line
 * is exempt, phaseStart × (1 + maxPhaseGrowth).
 */
export function evaluate(measured, budget) {
  return Object.entries(budget.budgets).map(([line, absolute]) => {
    const value = measured[line];
    const start = budget.phaseStart?.[line];
    const exempt = (budget.phaseGrowthExempt ?? []).includes(line);
    const phaseCap = typeof start === 'number' && !exempt
      ? Math.round(start * (1 + budget.maxPhaseGrowth) * 100) / 100
      : Infinity;
    const limit = Math.min(absolute, phaseCap);
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return { line, value: NaN, limit, delta: NaN, ok: false, reason: 'not measured' };
    }
    const ok = value <= limit;
    const reason = ok ? '' : value > absolute ? 'over budget' : 'over the per-phase growth cap';
    return { line, value, limit, delta: Math.round((value - limit) * 100) / 100, ok, reason };
  });
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, 2 files (the existing `supercellService.test.ts` + this one), all tests green.

- [ ] **Step 6: Write the budget file**

Create `scripts/bundle-budget.json` (the `phaseStart` numbers are main at 18c8708 measured with this method; the spec's table shows Vite's own rounding of the same build):

```json
{
  "$comment": "Performance budget, docs/superpowers/specs/2026-10-06-restyle-design.md#performance-budget. Sizes in kB (1000 bytes); JS and CSS are gzip level 9, fonts are raw woff2 bytes. Raising a number needs the justification the spec asks for, in the same PR.",
  "budgets": {
    "initialJs": 135,
    "playerPageJs": 180,
    "entryJs": 8,
    "css": 16,
    "fonts": 50
  },
  "maxPhaseGrowth": 0.05,
  "phaseGrowthExempt": [
    "entryJs"
  ],
  "phase": "restyle phase 1 (foundation)",
  "phaseStart": {
    "initialJs": 122.75,
    "playerPageJs": 163.58,
    "entryJs": 4.49,
    "css": 12.81,
    "fonts": 48.26
  },
  "playerPageEntries": [
    "GamePage"
  ],
  "gameModules": [],
  "allowedPreloadFonts": [
    "/fonts/Inter-latin.woff2"
  ]
}
```

- [ ] **Step 7: Emit the Vite manifest**

In `vite.config.ts`, inside `build: {` (line 47), add before `rollupOptions`:

```ts
        // scripts/check-bundle.mjs reads dist/.vite/manifest.json to know which
        // chunks each route needs (performance budget).
        manifest: true,
```

- [ ] **Step 8: Extend the build check**

Replace `scripts/check-bundle.mjs` with (checks 1–3 are unchanged, check 4 is new):

```js
#!/usr/bin/env node
/**
 * Post-build safety net. Fails the build rather than shipping a bad dist/.
 *
 *  1. No API token in the bundle. A key that reaches the browser is a key
 *     anyone can lift and spend against the owner's quota.
 *  2. No stray PNG. public/images is a WebP pipeline now; a PNG creeping back
 *     in is how 16 MB of art returned last time.
 *  3. Report the entry-chunk weight, so a regression in chunking is visible in
 *     the build log instead of in someone's data plan.
 *  4. Enforce the performance budget in scripts/bundle-budget.json (restyle
 *     spec, "Performance budget"): gzip size of the JS reachable from
 *     dist/index.html, of the JS needed to render a player page, of the entry
 *     chunk and of the CSS, plus the preloaded fonts. Any line over its limit
 *     fails the build and prints the delta.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closure, closureOf, evaluate, gzipBytes, preloadedFonts, toKB } from './bundle-budget-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const JWT = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;
const failures = [];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const chunks = [];
for await (const file of walk(DIST)) {
  const rel = path.relative(DIST, file);
  const ext = path.extname(file).toLowerCase();

  if (['.js', '.css', '.html', '.json', '.webmanifest', '.txt'].includes(ext)) {
    const text = await readFile(file, 'utf8');
    if (JWT.test(text)) failures.push(`API token found in ${rel}`);
  }

  if (ext === '.png' && rel.startsWith('images')) {
    failures.push(`unoptimised PNG shipped: ${rel}`);
  }

  if (ext === '.js') chunks.push({ rel, size: (await stat(file)).size });
}

chunks.sort((a, b) => b.size - a.size);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log('largest JS chunks:');
for (const c of chunks.slice(0, 5)) console.log(`  ${kb(c.size).padStart(8)}  ${c.rel}`);

const entry = chunks.find((c) => /assets\/index-[^/]+\.js$/.test(c.rel));
if (entry) console.log(`entry chunk: ${kb(entry.size)}`);

// ── performance budget ──────────────────────────────────────────────────────
const budget = JSON.parse(await readFile(path.join(ROOT, 'scripts/bundle-budget.json'), 'utf8'));
let manifest = null;
try {
  manifest = JSON.parse(await readFile(path.join(DIST, '.vite/manifest.json'), 'utf8'));
} catch {
  failures.push('dist/.vite/manifest.json missing: build.manifest must stay enabled in vite.config.ts');
}

if (manifest) {
  const gzipOf = async (files) => {
    let total = 0;
    for (const file of files) total += gzipBytes(await readFile(path.join(DIST, file)));
    return toKB(total);
  };
  const measured = {};
  // Each line is measured on its own: one stale reference must not hide the others.
  const measure = async (line, fn) => {
    try {
      measured[line] = await fn();
    } catch (e) {
      failures.push(e.message);
    }
  };
  await measure('initialJs', () => gzipOf(closure(manifest, 'index.html')));
  await measure('entryJs', () => gzipOf([manifest['index.html'].file]));
  // A player page needs the initial JS, the route chunk(s) and the heaviest
  // per-game module (each game page loads only its own).
  await measure('playerPageJs', async () => {
    const routeRefs = ['index.html', ...budget.playerPageEntries];
    const variants = budget.gameModules.length ? budget.gameModules.map((mod) => [...routeRefs, mod]) : [routeRefs];
    let max = 0;
    for (const refs of variants) max = Math.max(max, await gzipOf(closureOf(manifest, refs)));
    return max;
  });
  await measure('css', () => gzipOf(new Set(Object.values(manifest).flatMap((chunk) => chunk.css ?? []))));

  const html = await readFile(path.join(DIST, 'index.html'), 'utf8');
  let fontBytes = 0;
  for (const href of preloadedFonts(html)) {
    if (!budget.allowedPreloadFonts.includes(href)) failures.push(`unexpected font on the critical path: ${href}`);
    fontBytes += (await stat(path.join(DIST, href))).size;
  }
  measured.fonts = toKB(fontBytes);

  console.log('\nperformance budget (kB, gzip; fonts raw):');
  for (const row of evaluate(measured, budget)) {
    const delta = Number.isNaN(row.delta) ? '' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(2)}`;
    console.log(`  ${row.ok ? '✓' : '✗'} ${row.line.padEnd(13)} ${String(row.value).padStart(7)} / ${String(row.limit).padStart(7)}  ${delta}`);
    if (!row.ok) failures.push(`${row.line} ${row.reason}: ${row.value} kB > ${row.limit} kB (${delta} kB)`);
  }
}

if (failures.length) {
  console.error('\nbuild check FAILED:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('build check passed');
```

- [ ] **Step 9: Build and read the table**

Run: `npm run build`
Expected: ends with

```
performance budget (kB, gzip; fonts raw):
  ✓ initialJs      122.75 /  128.89  -6.14
  ✓ playerPageJs   163.58 /  171.76  -8.18
  ✓ entryJs          4.49 /       8  -3.51
  ✓ css             12.81 /   13.45  -0.64
  ✓ fonts           48.26 /      50  -1.74
build check passed
```

If a measured value differs from `phaseStart` by more than 0.05, stop and report (the build is not the one this plan measured).

- [ ] **Step 10: Prove the check fails (failing-first for the build)**

Temporarily set `"css": 12` in `budgets`, run `npm run build`.
Expected: exit code 1 and `✗ css over budget: 12.81 kB > 12 kB (+0.81 kB)`. Restore `"css": 16` and run `npm run build` again: `build check passed`.

- [ ] **Step 11: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green (e2e: 7 passed, 6 skipped without real tags).

- [ ] **Step 12: Commit**

```bash
git add scripts/bundle-budget.json scripts/bundle-budget-lib.mjs scripts/bundle-budget-lib.test.mjs scripts/check-bundle.mjs vite.config.ts
git commit -m "build: enforce the restyle performance budget in check-bundle

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Design tokens, visual primitives, 404 and crash screen

**Files:**
- Modify: `src/styles/theme.css` (whole file, 181 lines of shadcn defaults), `src/styles/tailwind.css:4`, `src/app/data/games.ts` (accent hex values), `src/app/pages/NotFound.tsx` (whole file), `src/app/components/ErrorBoundary.tsx:1,29-53`, `e2e/smoke.spec.ts:1-20`, `package.json` / `package-lock.json` (remove `tw-animate-css`)
- Create: `src/app/ui/{cx.ts,Button.tsx,Card.tsx,Row.tsx,Pill.tsx,StatTile.tsx,Skeleton.tsx,EmptyState.tsx,ErrorState.tsx}`, `src/app/data/__tests__/games.test.ts`, `e2e/support/helpers.ts`, `e2e/ui.spec.ts`

**Interfaces:**
- Consumes: `games: GameTheme[]` and `GameTheme.accent` from `src/app/data/games.ts:18-68`.
- Produces (later tasks import these exact names):
  - Tailwind tokens: `canvas`, `surface-1`, `surface-2`, `line`, `line-strong`, `fg`, `fg-muted`, `fg-subtle`, `accent`, `accent-soft`, `accent-contrast`, `win`, `loss`, `draw`, `win-soft`, `loss-soft`, `loss-line`, `draw-soft`; `font-display`; `text-title`, `text-display`, `text-stat`; `rounded-card`, `rounded-pill`; `shadow-card`; `ease-out-quick`; utility `no-scrollbar`; CSS vars `--header-h` (3.5rem), `--tabs-h` (3rem); `[data-game='<id>']` accent scopes.
  - `cx(...parts: Array<string | false | null | undefined>): string` (`ui/cx.ts`)
  - `type ButtonVariant = 'primary' | 'secondary' | 'ghost'`; `buttonClasses(variant?: ButtonVariant, className?: string): string`; `<Button variant? …ButtonHTMLAttributes>` (`ui/Button.tsx`)
  - `<Card as?: 'div'|'section'|'article' title?: ReactNode action?: ReactNode padding?: 'md'|'none'>` (`ui/Card.tsx`)
  - `<Row label: ReactNode value: ReactNode icon?: ReactNode className?: string>` (`ui/Row.tsx`)
  - `type PillTone = 'neutral'|'accent'|'win'|'loss'|'draw'`; `<Pill tone? icon? className?>{children}</Pill>` (`ui/Pill.tsx`)
  - `<StatTile label: string value: ReactNode sub?: ReactNode icon?: ReactNode>` (`ui/StatTile.tsx`)
  - `Skeleton({className})`, `PlayerPageSkeleton()` (renders `data-testid="player-skeleton"`), `PanelSkeleton()` (`data-testid="panel-skeleton"`) (`ui/Skeleton.tsx`)
  - `<EmptyState icon: ReactNode title: string as?: 'h1'|'h2'|'h3' action?: ReactNode>{children}</EmptyState>` (`data-testid="empty-state"`) (`ui/EmptyState.tsx`)
  - `<ErrorState title: string message: string onRetry?: () => void retrying?: boolean>` (`data-testid="error-state"`, Retry button named "Retry") (`ui/ErrorState.tsx`)
  - E2E helpers (`e2e/support/helpers.ts`): `watch(page, allow?: RegExp[]): string[]`, `expectNoHorizontalScroll(page)`, `expectTouchTargets(locator, min = 44)`, `expectNoEmoji(locator)`.

- [ ] **Step 1: Write the failing accent test**

Create `src/app/data/__tests__/games.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { games } from '../games';

// The data components still take the accent as a hex prop while the shell
// reads it from the [data-game] CSS variables: both must say the same colour.
const css = readFileSync(new URL('../../../styles/theme.css', import.meta.url), 'utf8');

describe('game accents', () => {
  it.each(games.map((g) => [g.id, g.accent]))('%s accent matches theme.css', (id, accent) => {
    const block = css.match(new RegExp(`\\[data-game='${id}'\\]\\s*\\{([^}]*)\\}`));
    expect(block, `no [data-game='${id}'] block in theme.css`).not.toBeNull();
    expect(block![1]).toMatch(new RegExp(`--accent:\\s*${accent};`, 'i'));
  });

  it('uses the spec colours', () => {
    expect(Object.fromEntries(games.map((g) => [g.id, g.accent]))).toEqual({
      'clash-royale': '#4C8DFF',
      'brawl-stars': '#FFC21A',
      'clash-of-clans': '#5BD65B',
    });
  });
});
```

Run: `npx vitest run src/app/data/__tests__/games.test.ts`
Expected: FAIL (4 tests): no `[data-game='clash-royale']` block in theme.css, and the accents are still `#4D7FFF/#FFC800/#8BC34A`.

- [ ] **Step 2: Replace the theme with the token layer**

Replace the whole of `src/styles/theme.css` with:

```css
/*
 * Design tokens (restyle spec, "Design system"). Components use the Tailwind
 * names declared in @theme below (bg-surface-1, text-fg-muted, border-line,
 * bg-accent, rounded-card...), never raw hex.
 *
 * Per-game accent: an ancestor with data-game="<game id>" switches --accent
 * and --accent-soft. Keep the hex values in sync with `accent` in
 * src/app/data/games.ts (a unit test checks it).
 */
:root {
  color-scheme: dark;

  /* surfaces */
  --bg: #0B0F1A;
  --surface-1: #11172A;
  --surface-2: #172038;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);

  /* text: --text-subtle (white/60) is the floor, nothing dimmer for text */
  --text: #F2F5FF;
  --text-muted: rgba(255, 255, 255, 0.70);
  --text-subtle: rgba(255, 255, 255, 0.60);

  /* accent: neutral until a page sets data-game */
  --accent: #F2F5FF;
  --accent-soft: rgba(242, 245, 255, 0.10);
  /* text placed on a solid accent fill (all three accents are light) */
  --accent-contrast: #0B0F1A;

  /* semantic */
  --win: #34D399;
  --loss: #F87171;
  --draw: #94A3B8;
  /* tinted fills for the semantic colours (pre-mixed: no color-mix() fallbacks in the CSS) */
  --win-soft: rgba(52, 211, 153, 0.15);
  --loss-soft: rgba(248, 113, 113, 0.12);
  --loss-line: rgba(248, 113, 113, 0.30);
  --draw-soft: rgba(148, 163, 184, 0.15);

  --focus-ring: #F2F5FF;
  --shadow-1: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 12px 32px -16px rgba(2, 4, 12, 0.8);

  /* sticky chrome heights, shared by AppHeader, SectionTabs and scroll offsets */
  --header-h: 3.5rem;
  --tabs-h: 3rem;
}

[data-game='clash-royale'] {
  --accent: #4C8DFF;
  --accent-soft: rgba(76, 141, 255, 0.14);
}
[data-game='brawl-stars'] {
  --accent: #FFC21A;
  --accent-soft: rgba(255, 194, 26, 0.14);
}
[data-game='clash-of-clans'] {
  --accent: #5BD65B;
  --accent-soft: rgba(91, 214, 91, 0.14);
}

@theme inline {
  --color-canvas: var(--bg);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-line: var(--border);
  --color-line-strong: var(--border-strong);
  --color-fg: var(--text);
  --color-fg-muted: var(--text-muted);
  --color-fg-subtle: var(--text-subtle);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-accent-contrast: var(--accent-contrast);
  --color-win: var(--win);
  --color-loss: var(--loss);
  --color-draw: var(--draw);
  --color-win-soft: var(--win-soft);
  --color-loss-soft: var(--loss-soft);
  --color-loss-line: var(--loss-line);
  --color-draw-soft: var(--draw-soft);

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Clash', 'Inter', sans-serif;

  /* type scale 12 / 14 / 16 / 20 / 28 / 40: xs, sm, base, xl are Tailwind's own */
  --text-title: 1.75rem;
  --text-title--line-height: 1.2;
  --text-display: 2.5rem;
  --text-display--line-height: 1.1;
  /* big numbers: 20px on a 320px phone, 28px from ~900px up, never clipped */
  --text-stat: clamp(1.25rem, 0.95rem + 1.5vw, 1.75rem);
  --text-stat--line-height: 1.1;

  --radius-card: 12px;
  --radius-pill: 999px;

  --shadow-card: var(--shadow-1);

  --ease-out-quick: cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Hide a scrollbar but keep the element scrollable (tab strips on phones). */
@utility no-scrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

@layer base {
  * {
    border-color: var(--border);
  }

  html {
    background-color: var(--bg);
    color: var(--text);
    -webkit-text-size-adjust: 100%;
    /* keeps in-page targets clear of the sticky header + tab strip */
    scroll-padding-top: calc(var(--header-h) + var(--tabs-h));
  }

  body {
    background-color: var(--bg);
    color: var(--text);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  /* One focus ring for everything that has no ring of its own. */
  :focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  ::selection {
    background-color: var(--accent-soft);
  }

  /*
   * Element defaults kept from the previous theme so the per-game data
   * components (restyled in phases 2-4) keep their current heading sizes.
   * Tailwind text-* utilities still override these.
   */
  h1 { font-size: var(--text-2xl); font-weight: 500; line-height: 1.5; }
  h2 { font-size: var(--text-xl); font-weight: 500; line-height: 1.5; }
  h3 { font-size: var(--text-lg); font-weight: 500; line-height: 1.5; }
  h4,
  label,
  button { font-size: var(--text-base); font-weight: 500; line-height: 1.5; }
  input { font-size: var(--text-base); font-weight: 400; line-height: 1.5; }
}

/* Motion is 150-200ms opacity/transform only, and none at all when asked. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Set the spec accents in `games.ts`**

In `src/app/data/games.ts` replace every `'#4D7FFF'` with `'#4C8DFF'` (Clash Royale `accent`, `chartPrimary`, `badgeColor`), every `'#FFC800'` with `'#FFC21A'` (Brawl Stars) and every `'#8BC34A'` with `'#5BD65B'` (Clash of Clans). Nine replacements; nothing else in the file changes.

Run: `npx vitest run src/app/data/__tests__/games.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Drop `tw-animate-css`**

Replace `src/styles/tailwind.css` with:

```css
@import 'tailwindcss' source(none);
@source '../**/*.{js,ts,jsx,tsx}';
```

Run: `npm uninstall tw-animate-css`
Expected: `package.json` loses only the `"tw-animate-css"` devDependency line; `package-lock.json` loses only that package.

- [ ] **Step 5: Create the primitives**

`src/app/ui/cx.ts`:

```ts
/** Join class names, skipping falsy parts: cx('a', cond && 'b'). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
```

`src/app/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Classes for anything that looks like a button (also used on <Link>/<a>).
 * 44px minimum height, 12px radius, press feedback, no colour below AA.
 */
export function buttonClasses(variant: ButtonVariant = 'secondary', className?: string): string {
  return cx(
    'inline-flex min-h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-card px-4 text-sm font-semibold',
    'transition duration-150 ease-out-quick active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    variant === 'primary' && 'bg-accent text-accent-contrast hover:opacity-90',
    variant === 'secondary' && 'border border-line bg-surface-2 text-fg hover:border-line-strong',
    variant === 'ghost' && 'text-fg-muted hover:bg-surface-2 hover:text-fg',
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'secondary', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}
```

`src/app/ui/Card.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'div' | 'section' | 'article';
  /** Heading shown in the card's top row; rendered as an h3. */
  title?: ReactNode;
  /** Right side of the top row (a link or small button). */
  action?: ReactNode;
  /** 'none' when the content brings its own padding (lists, charts). */
  padding?: 'md' | 'none';
}

/** The one surface: hairline border, 12px radius, a single elevation. */
export function Card({ as: Tag = 'div', title, action, padding = 'md', className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cx('rounded-card border border-line bg-surface-1 shadow-card', padding === 'md' && 'p-4 sm:p-5', className)}
      {...rest}
    >
      {(title || action) && (
        <div className={cx('flex items-center justify-between gap-3', padding === 'md' ? 'mb-3' : 'px-4 pt-4 pb-3 sm:px-5')}>
          {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}
```

`src/app/ui/Row.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cx } from './cx';

interface RowProps {
  label: ReactNode;
  value: ReactNode;
  /** Small lucide icon, shown in an accent-tinted square. */
  icon?: ReactNode;
  className?: string;
}

/** Label on the left, value on the right: one line of a stats list. */
export function Row({ label, value, icon, className }: RowProps) {
  return (
    <div className={cx('flex min-h-11 items-center gap-3 py-2', className)}>
      {icon && (
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-4">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{label}</span>
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-fg">{value}</span>
    </div>
  );
}
```

`src/app/ui/Pill.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cx } from './cx';

export type PillTone = 'neutral' | 'accent' | 'win' | 'loss' | 'draw';

const TONES: Record<PillTone, string> = {
  neutral: 'bg-surface-2 text-fg-muted',
  accent: 'bg-accent-soft text-accent',
  win: 'bg-win-soft text-win',
  loss: 'bg-loss-soft text-loss',
  draw: 'bg-draw-soft text-draw',
};

interface PillProps {
  tone?: PillTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Small non-interactive label: league, level, live/demo, result. */
export function Pill({ tone = 'neutral', icon, children, className }: PillProps) {
  return (
    <span className={cx('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-xs font-medium', TONES[tone], className)}>
      {icon && <span aria-hidden="true" className="[&_svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  );
}
```

`src/app/ui/StatTile.tsx`:

```tsx
import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
}

/** One headline number. The value uses the clamp()ed stat size so it never clips at 320px. */
export function StatTile({ label, value, sub, icon }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface-1 p-4">
      <div className="flex min-w-0 items-center gap-2 text-fg-subtle">
        {icon && <span aria-hidden="true" className="text-accent [&_svg]:size-4">{icon}</span>}
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <div className="text-stat font-semibold tracking-tight tabular-nums text-fg wrap-anywhere">{value}</div>
      {sub && <div className="truncate text-xs text-fg-subtle">{sub}</div>}
    </div>
  );
}
```

`src/app/ui/Skeleton.tsx`:

```tsx
import { cx } from './cx';

/** A static placeholder block; the pulsing lives on the wrapper (one animation per screen). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('rounded-card bg-surface-2', className)} />;
}

/**
 * Loading placeholder shaped like the player page (hero, tab strip, tiles,
 * two panels) with the same outer heights, so the real content lands without
 * shifting anything. Screen readers get the shell's live region instead.
 */
export function PlayerPageSkeleton() {
  return (
    <div aria-hidden="true" data-testid="player-skeleton" className="space-y-6 motion-safe:animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 sm:size-16" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-7 w-40 max-w-full rounded-pill" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

/** Placeholder for a tab panel while its game module chunk downloads. */
export function PanelSkeleton() {
  return (
    <div aria-hidden="true" data-testid="panel-skeleton" className="grid gap-4 motion-safe:animate-pulse lg:grid-cols-2">
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
    </div>
  );
}
```

`src/app/ui/EmptyState.tsx`:

```tsx
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  /** Heading level that keeps the heading order (h1 on the 404 page). */
  as?: 'h1' | 'h2' | 'h3';
  /** One or two sentences saying what to do next. */
  children?: ReactNode;
  action?: ReactNode;
}

/** Nothing to show yet: say why and what to do, in the interface's voice. */
export function EmptyState({ icon, title, as: Heading = 'h3', children, action }: EmptyStateProps) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      <span aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent [&_svg]:size-6">
        {icon}
      </span>
      <Heading className="text-base font-semibold leading-snug text-fg">{title}</Heading>
      {children && <div className="mt-2 max-w-sm text-sm text-pretty text-fg-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

`src/app/ui/ErrorState.tsx`:

```tsx
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  /** The real reason, as mapped by the API layer. Shown verbatim. */
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * A failed request. Not a live region on purpose: the page's own status
 * region already announces the failure once.
 */
export function ErrorState({ title, message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div data-testid="error-state" className="flex flex-col gap-4 rounded-card border border-loss-line bg-loss-soft p-5 sm:flex-row sm:items-center">
      <AlertTriangle aria-hidden="true" className="size-6 shrink-0 text-loss" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{title}</p>
        <p className="mt-1 text-sm text-fg-muted wrap-anywhere">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} disabled={retrying} className="shrink-0">
          <RotateCw aria-hidden="true" className={retrying ? 'motion-safe:animate-spin' : undefined} />
          Retry
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Restyle the 404 page with the primitives**

Replace `src/app/pages/NotFound.tsx` (it used an emoji and `bg-[#0B0F1A]`):

```tsx
import { Link } from 'react-router';
import { ArrowLeft, Compass } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { buttonClasses } from '../ui/Button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4 py-16">
      <div className="w-full">
        <EmptyState
          as="h1"
          icon={<Compass />}
          title="Page not found"
          action={
            <Link to="/" className={buttonClasses('primary')}>
              <ArrowLeft aria-hidden="true" />
              Back to all games
            </Link>
          }
        >
          Nothing lives at this address. Pick a game on the home page to search a player.
        </EmptyState>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Restyle the crash screen**

In `src/app/components/ErrorBoundary.tsx` add after line 1:

```tsx
import { buttonClasses } from '../ui/Button';
```

and replace lines 29–53 of `render()` (from `    return (` through its closing `    );`, i.e. the `<div className="min-h-screen bg-[#0B0F1A] …">` block) with:

```tsx
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4 py-16">
        <div className="w-full rounded-card border border-line bg-surface-1 p-6 shadow-card">
          <h1 className="text-xl font-semibold text-fg">Something broke on this page</h1>
          <p className="mt-2 text-sm text-fg-muted">
            The stats failed to render. Reloading usually fixes it; if it keeps happening the
            player's data may contain something we don't handle yet.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => window.location.reload()} className={buttonClasses('primary')}>
              Reload
            </button>
            <a href="/" className={buttonClasses('secondary')}>
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
```

- [ ] **Step 8: Share the e2e helpers**

Create `e2e/support/helpers.ts`:

```ts
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Collect everything that counts as a bug during a page visit: uncaught
 * exceptions, console errors (CSP violations included), failed non-image
 * requests and 5xx responses. `allow` drops console messages a test causes on
 * purpose (e.g. the browser's "Failed to load resource" for a mocked 429).
 */
export function watch(page: Page, allow: RegExp[] = []) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (allow.some((re) => re.test(m.text()))) return;
    problems.push(`console: ${m.text()}`);
  });
  // Third-party game-asset images (arena/card art) can legitimately 404 for new
  // content; the app has onError fallbacks for them, so they are not app bugs.
  page.on('requestfailed', (r) => {
    if (r.resourceType() === 'image') return;
    problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500) problems.push(`http ${r.status()}: ${r.url()}`);
  });
  return problems;
}

/** The page never scrolls sideways (the spec's 320px rule). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(0);
}

/** Every visible match is at least 44px tall (WCAG 2.5.5 target size, as the spec asks on mobile). */
export async function expectTouchTargets(locator: Locator, min = 44) {
  const count = await locator.count();
  expect(count, 'no elements matched the touch-target locator').toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const el = locator.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    const name = (await el.getAttribute('aria-label')) ?? (await el.innerText()).trim().slice(0, 40);
    expect(box!.height, `"${name}" is ${box!.height}px tall`).toBeGreaterThanOrEqual(min);
  }
}

/** No emoji anywhere in the rendered chrome (the spec replaces them with SVG icons). */
export async function expectNoEmoji(locator: Locator) {
  const text = await locator.innerText();
  expect(text.match(/\p{Extended_Pictographic}/gu) ?? []).toEqual([]);
}
```

In `e2e/smoke.spec.ts` replace lines 1–20 (the `import { test, expect, type Page }` line and the local `watch` function) with:

```ts
import { test, expect } from '@playwright/test';
import { watch } from './support/helpers';
```

The tests themselves (`/ loads with no runtime errors`, `an invalid tag shows a friendly error, not a crash`, `a percent-encoded # …`, `an unknown URL renders the not-found page`, the env-gated real-player tests) are unchanged.

- [ ] **Step 9: Write the e2e for tokens and the 404 page**

Create `e2e/ui.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';

test('the page background comes from the --bg token', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  const colors = await page.evaluate(() => ({
    body: getComputedStyle(document.body).backgroundColor,
    token: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase(),
  }));
  expect(colors).toEqual({ body: 'rgb(11, 15, 26)', token: '#0b0f1a' });
});

test('the 404 page uses the shared empty state, no emoji, 44px action', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expectNoEmoji(page.locator('main'));
  await expectTouchTargets(page.getByRole('link', { name: 'Back to all games' }));
  await expectNoHorizontalScroll(page);
  await page.getByRole('link', { name: 'Back to all games' }).click();
  await expect(page).toHaveURL('/');
  expect(problems).toEqual([]);
});
```

- [ ] **Step 10: Full gate and budget**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green; budget table shows `css ≈ 13.01 / 13.45`, `entryJs ≈ 5.49 / 8`. The existing test `an unknown URL renders the not-found page` still passes ("Page not found" matches `/not found|404/i`).

- [ ] **Step 11: Commit**

```bash
git add src/styles src/app/ui src/app/data src/app/pages/NotFound.tsx src/app/components/ErrorBoundary.tsx e2e package.json package-lock.json
git commit -m "feat(ui): design tokens, visual primitives, restyled 404 and crash screen

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: SearchBox and the new Home

**Files:**
- Create: `src/app/ui/tag.ts`, `src/app/ui/__tests__/tag.test.ts`, `src/app/ui/SearchBox.tsx`, `src/app/ui/SiteFooter.tsx`, `e2e/support/fixtures.ts`, `e2e/support/mockApi.ts`, `e2e/home.spec.ts`
- Modify: `src/app/data/games.ts` (add `shortName`), `src/app/pages/Home.tsx` (whole file, 207 lines)

**Interfaces:**
- Consumes: `buttonClasses`, `cx` (Task 2); `getRecentSearches(gameId?: string): RecentSearch[]` and `RecentSearch {gameId, tag, username, thLevel?, trophies, leagueUrl?, clanName?, timestamp}` from `src/app/services/recentSearches.ts:3-29`; `normalizeTag`, `isValidTag` from `src/app/services/supercellService.ts:9-17` (test only); `games`, `getGameById`, `GameTheme` from `src/app/data/games.ts`; token classes (Task 2).
- Produces:
  - `GameTheme.shortName: string` (`'CR' | 'BS' | 'CoC'` values).
  - `tagSlug(input: string): string`, `isPlausibleTag(input: string): boolean`, `TAG_HINT: string` (`ui/tag.ts`).
  - `interface SearchBoxProps { gameId: string; label: string; initialValue?: string; size?: 'md'|'lg'; shortcut?: boolean; busy?: boolean; onSubmitTag?: (slug: string) => void; onBeforeFocus?: () => void; id?: string; className?: string }` and `<SearchBox>` (`ui/SearchBox.tsx`). Default submit navigates to `/game/${gameId}/player/${slug}`.
  - `<SiteFooter note?: string>` (`ui/SiteFooter.tsx`).
  - E2E: `FIXTURE_TAG = 'PYLQGRJC'`, fixture players "Vela Storm" (CR), "Kitebreaker" (BS, no club), "Harrow Keep" (CoC, TH15) in `e2e/support/fixtures.ts`; `mockApi(page, {hold?, fail?}): Promise<string[]>` (decoded API paths requested) and `deferred(): {promise, release}` in `e2e/support/mockApi.ts`.

- [ ] **Step 1: Write the failing parity test**

Create `src/app/ui/__tests__/tag.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isPlausibleTag, tagSlug } from '../tag';
import { isValidTag, normalizeTag } from '../../services/supercellService';

const SAMPLES = ['#2PP', '2pp', '  #o2pp ', 'PCQRQ0LQ', '#ABC', '#2P', '#' + '2'.repeat(14), '#' + '2'.repeat(15), '', '#', 'yy-yy', '#PYLQGRJC'];

describe('tag helpers', () => {
  it.each(SAMPLES)('agree with the API service for %j', (input) => {
    expect('#' + tagSlug(input)).toBe(normalizeTag(input));
    expect(isPlausibleTag(input)).toBe(isValidTag(input));
  });

  it('builds the bare URL slug', () => {
    expect(tagSlug('  #o2pp ')).toBe('02PP');
  });
});
```

Run: `npx vitest run src/app/ui/__tests__/tag.test.ts`
Expected: FAIL, cannot resolve `../tag`.

- [ ] **Step 2: Implement the tag helpers**

Create `src/app/ui/tag.ts`:

```ts
/**
 * Player-tag helpers for the search boxes. They mirror normalizeTag and
 * isValidTag in services/supercellService.ts (ui/__tests__/tag.test.ts keeps
 * them in step) so Home, which ships in the entry chunk, does not pull in the
 * whole API service.
 */
const TAG_CHARSET = /^[0289PYLQGRJCUV]+$/;

/** "  #o2pp " -> "02PP": the bare form used in player URLs. */
export function tagSlug(input: string): string {
  return input.trim().toUpperCase().replace(/^#/, '').replace(/O/g, '0');
}

export function isPlausibleTag(input: string): boolean {
  const t = tagSlug(input);
  return t.length >= 3 && t.length <= 14 && TAG_CHARSET.test(t);
}

export const TAG_HINT = 'Player tags use only 0 2 8 9 P Y L Q G R J C U V.';
```

Run: `npx vitest run src/app/ui/__tests__/tag.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 3: Add `shortName` to the games**

In `src/app/data/games.ts`, in `interface GameTheme` after `name: string;` add:

```ts
  /** Two or three letters for tight spots (header switcher, recent-search chips). */
  shortName: string;
```

and after each `name:` line in `games` add `shortName: 'CR',` (Clash Royale), `shortName: 'BS',` (Brawl Stars), `shortName: 'CoC',` (Clash of Clans).

- [ ] **Step 4: Create SearchBox and SiteFooter**

`src/app/ui/SearchBox.tsx`:

```tsx
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { getRecentSearches } from '../services/recentSearches';
import { buttonClasses } from './Button';
import { cx } from './cx';
import { isPlausibleTag, tagSlug, TAG_HINT } from './tag';

export interface SearchBoxProps {
  gameId: string;
  /** Accessible name of the input (the placeholder is not a label). */
  label: string;
  /** Shown on mount and again whenever it changes, e.g. the URL tag of a player page. */
  initialValue?: string;
  /** 'lg' keeps a reserved line for the hint under the field; 'md' shows it as a popover (header). */
  size?: 'md' | 'lg';
  /** Register the "/" shortcut. Exactly one SearchBox per page sets this. */
  shortcut?: boolean;
  /** A search is running: submitting is ignored and the button is disabled. */
  busy?: boolean;
  /** Receives the bare tag slug of a valid submission. Default: open that player's page. */
  onSubmitTag?: (slug: string) => void;
  /** Runs before the "/" shortcut focuses the input (lets a collapsed header open first). */
  onBeforeFocus?: () => void;
  id?: string;
  className?: string;
}

/** Player-tag search: validates before navigating and offers this game's recent searches. */
export function SearchBox({
  gameId, label, initialValue = '', size = 'md', shortcut = false, busy = false,
  onSubmitTag, onBeforeFocus, id, className,
}: SearchBoxProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const inputId = id ?? `tag-${autoId.replace(/:/g, '')}`;
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState(() => getRecentSearches(gameId));

  // A new URL tag (another player opened) replaces whatever was typed.
  const [prevInitial, setPrevInitial] = useState(initialValue);
  if (prevInitial !== initialValue) {
    setPrevInitial(initialValue);
    setValue(initialValue);
    setError(null);
  }

  const beforeFocus = useRef(onBeforeFocus);
  useEffect(() => {
    beforeFocus.current = onBeforeFocus;
  });

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      e.preventDefault();
      beforeFocus.current?.();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!value.trim()) return setError('Enter a player tag, for example #2PP.');
    if (!isPlausibleTag(value)) return setError(TAG_HINT);
    setError(null);
    const slug = tagSlug(value);
    if (onSubmitTag) onSubmitTag(slug);
    else navigate(`/game/${gameId}/player/${slug}`);
  };

  const messageId = `${inputId}-message`;
  const listId = `${inputId}-recent`;

  return (
    <form role="search" noValidate onSubmit={submit} className={cx('relative', className)}>
      <div
        className={cx(
          'flex h-12 items-center gap-2 rounded-card border bg-canvas pl-3 pr-0.5 transition-colors duration-150',
          error ? 'border-loss' : 'border-line-strong focus-within:border-accent',
        )}
      >
        <Search aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onFocus={() => setRecent(getRecentSearches(gameId))}
          placeholder="#PLAYERTAG"
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          list={recent.length > 0 ? listId : undefined}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle focus:outline-none"
        />
        {shortcut && !value && (
          <kbd aria-hidden="true" className="hidden h-6 items-center rounded-md border border-line px-1.5 text-xs text-fg-subtle sm:flex">/</kbd>
        )}
        <button type="submit" disabled={busy} aria-label="Search player" className={buttonClasses('primary', 'size-11 shrink-0 px-0')}>
          <Search aria-hidden="true" />
        </button>
      </div>
      <p
        id={messageId}
        aria-live="polite"
        className={cx(
          'text-xs text-loss',
          size === 'lg'
            ? 'mt-2 min-h-4'
            : 'absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-line bg-surface-2 px-3 py-2 shadow-card',
          size === 'md' && !error && 'hidden',
        )}
      >
        {error}
      </p>
      {recent.length > 0 && (
        <datalist id={listId}>
          {recent.map((r) => (
            <option key={r.tag} value={r.tag}>{r.username}</option>
          ))}
        </datalist>
      )}
    </form>
  );
}
```

`src/app/ui/SiteFooter.tsx`:

```tsx
interface SiteFooterProps {
  /** Second line; the game pages name their game here. */
  note?: string;
}

export function SiteFooter({ note = 'All game data comes from the official Supercell developer API.' }: SiteFooterProps) {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-xs leading-relaxed text-fg-subtle sm:px-6">
        <p>
          This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy:{' '}
          <a
            href="https://www.supercell.com/fan-content-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg-muted underline underline-offset-2 transition-colors hover:text-fg"
          >
            www.supercell.com/fan-content-policy
          </a>
          .
        </p>
        <p className="mt-2">{note}</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Rewrite Home**

Replace `src/app/pages/Home.tsx`. Hero = wordmark + one sentence (the three feature chips go, per spec); three game cards, each with its own SearchBox (the first one owns the `/` shortcut); a recent-searches row across games; shared footer. No `motion` import anymore (no entrance animation on the LCP content).

```tsx
import { useState } from 'react';
import { Link } from 'react-router';
import { Trophy } from 'lucide-react';
import { games, getGameById, type GameTheme } from '../data/games';
import { getRecentSearches } from '../services/recentSearches';
import { SearchBox } from '../ui/SearchBox';
import { SiteFooter } from '../ui/SiteFooter';

// Official Supercell Fan Kit art. width/height are the intrinsic asset sizes,
// so the browser reserves the box before the image streams in.
const GAME_ART: Record<string, { src: string; width: number; height: number }> = {
  'clash-royale': { src: '/images/characters/cr_character.webp', width: 512, height: 512 },
  'brawl-stars': { src: '/images/bs/shelly_model.webp', width: 160, height: 322 },
  'clash-of-clans': { src: '/images/characters/coc_character.webp', width: 512, height: 512 },
};

// Game logos: width/height are the h-12 rendered box.
const GAME_LOGOS: Record<string, { src: string; width: number; height: number }> = {
  'clash-royale': { src: '/images/logos/cr_logo.webp', width: 96, height: 48 },
  'brawl-stars': { src: '/images/logos/bs_logo.webp', width: 59, height: 48 },
  'clash-of-clans': { src: '/images/logos/coc_logo.webp', width: 105, height: 48 },
};

function GameCard({ game, first }: { game: GameTheme; first: boolean }) {
  const art = GAME_ART[game.id];
  const logo = GAME_LOGOS[game.id];
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-1 p-5 shadow-card transition-colors duration-150 focus-within:border-line-strong hover:border-line-strong sm:p-6">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
      {art && (
        <img
          src={art.src}
          alt=""
          width={art.width}
          height={art.height}
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute -right-4 -bottom-6 h-44 w-auto opacity-15 select-none"
        />
      )}
      <div className="relative flex items-center gap-4">
        {logo && (
          <img
            src={logo.src}
            alt=""
            width={logo.width}
            height={logo.height}
            decoding="async"
            className="h-12 w-auto shrink-0 object-contain"
          />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-tight font-normal text-fg">
            <Link to={`/game/${game.id}`} className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-accent">
              {game.name}
            </Link>
          </h2>
          <p className="text-sm text-fg-muted">{game.tagline}</p>
        </div>
      </div>
      <SearchBox className="relative mt-6" gameId={game.id} label={`${game.name} player tag`} size="lg" shortcut={first} />
    </article>
  );
}

function RecentSearchesRow() {
  const [recent] = useState(() =>
    getRecentSearches()
      .filter((r) => getGameById(r.gameId))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8),
  );
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading" className="mt-12">
      <h2 id="recent-heading" className="text-sm font-semibold text-fg">Recent searches</h2>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {recent.map((r) => (
          <li key={`${r.gameId}-${r.tag}`} data-game={r.gameId} className="shrink-0">
            <Link
              to={`/game/${r.gameId}/player/${r.tag.replace(/^#/, '')}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-surface-1 py-1 pr-4 pl-1.5 text-sm text-fg transition-colors duration-150 hover:border-line-strong"
            >
              <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                {getGameById(r.gameId)!.shortName}
              </span>
              <span className="max-w-48 truncate font-medium">{r.username}</span>
              {r.trophies > 0 && (
                <span className="inline-flex items-center gap-1 text-fg-subtle tabular-nums">
                  <Trophy aria-hidden="true" className="size-3.5" />
                  {r.trophies.toLocaleString()}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="pt-12 pb-8 sm:pt-20 sm:pb-12">
          <h1 className="flex items-center gap-3 font-display text-title font-normal text-fg sm:text-display">
            <img
              src="/images/logos/supercell_logo.webp"
              alt="Supercell"
              width={74}
              height={60}
              decoding="async"
              fetchPriority="high"
              className="h-10 w-auto sm:h-12"
            />
            <span>Stats</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-balance text-fg-muted sm:text-xl">
            Live player stats for Clash Royale, Brawl Stars and Clash of Clans. Search any player by tag.
          </p>
        </section>

        <section aria-label="Games">
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {games.map((game, i) => (
              <li key={game.id} data-game={game.id}>
                <GameCard game={game} first={i === 0} />
              </li>
            ))}
          </ul>
        </section>

        <RecentSearchesRow />
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 6: Add the API fixtures and mock**

`e2e/support/fixtures.ts` (invented players only):

```ts
/**
 * Synthetic Supercell API payloads for e2e tests and screenshots. Invented
 * players: never put a real player's tag or data in this file (real tags only
 * reach the tests through E2E_CR_TAG / E2E_BS_TAG / E2E_COC_TAG).
 */
export const FIXTURE_TAG = 'PYLQGRJC';

const card = (id: number, name: string, rarity: string, level: number, maxLevel: number, elixirCost: number) => ({
  id, name, rarity, level, maxLevel, elixirCost, count: 120, iconUrls: { medium: `https://api-assets.clashroyale.com/cards/300/${id}.png` },
});
const deck = [
  card(26000000, 'Knight', 'common', 14, 16, 3),
  card(26000001, 'Archers', 'common', 14, 16, 3),
  card(26000010, 'Skeleton Army', 'epic', 10, 11, 3),
  card(26000021, 'Hog Rider', 'rare', 12, 14, 4),
  card(28000000, 'Fireball', 'rare', 12, 14, 4),
  card(28000001, 'Arrows', 'common', 14, 16, 3),
  card(27000000, 'Cannon', 'common', 13, 16, 3),
  card(26000035, 'Ice Golem', 'rare', 12, 14, 2),
];

const crBattle = (minutesAgo: number, my: number, opp: number, trophyChange: number) => ({
  type: 'PvP',
  battleTime: new Date(Date.UTC(2026, 9, 6, 10, 0) - minutesAgo * 60_000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '.000Z'),
  gameMode: { id: 72000006, name: 'Ladder' },
  team: [{ tag: `#${FIXTURE_TAG}`, name: 'Vela Storm', crowns: my, trophyChange }],
  opponent: [{ tag: '#2Y0Y', name: 'Opponent', crowns: opp }],
});

export const crPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Vela Storm',
  expLevel: 54,
  trophies: 9123,
  bestTrophies: 9301,
  wins: 4210,
  losses: 3388,
  threeCrownWins: 1530,
  arena: { id: 54000057, name: 'Legendary Arena' },
  clan: { tag: '#2Y0Y', name: 'Lantern Watch' },
  role: 'elder',
  cards: deck,
  currentDeck: deck,
};
export const crBattlelog = [crBattle(5, 3, 1, 31), crBattle(30, 0, 1, -28), crBattle(60, 1, 1, 0), crBattle(90, 2, 0, 30)];

export const bsPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Kitebreaker',
  nameColor: '0xffffffff',
  icon: { id: 28000000 },
  trophies: 41234,
  highestTrophies: 42010,
  expLevel: 211,
  expPoints: 250000,
  '3vs3Victories': 18234,
  soloVictories: 1022,
  duoVictories: 2210,
  brawlers: [
    { id: 16000000, name: 'SHELLY', power: 11, rank: 5, trophies: 1000, highestTrophies: 1020, gadgets: [{ id: 23000255, name: 'FAST FORWARD' }], starPowers: [], gears: [] },
    { id: 16000001, name: 'COLT', power: 9, rank: 4, trophies: 750, highestTrophies: 800, gadgets: [], starPowers: [], gears: [] },
  ],
};
export const bsBattlelog = {
  items: [
    { battleTime: '20261006T095500.000Z', event: { id: 15000001, mode: 'gemGrab', map: 'Hard Rock Mine' }, battle: { mode: 'gemGrab', type: 'ranked', result: 'victory', duration: 121, trophyChange: 8 } },
    { battleTime: '20261006T093000.000Z', event: { id: 15000002, mode: 'brawlBall', map: 'Backyard Bowl' }, battle: { mode: 'brawlBall', type: 'ranked', result: 'defeat', duration: 140, trophyChange: -5 } },
  ],
};

export const cocPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Harrow Keep',
  townHallLevel: 15,
  builderHallLevel: 10,
  expLevel: 210,
  trophies: 5012,
  bestTrophies: 5340,
  warStars: 1450,
  donations: 1200,
  donationsReceived: 900,
  league: { name: 'Legend League' },
  clan: { tag: '#2Y0Y', name: 'Lantern Watch', clanLevel: 18 },
  role: 'coLeader',
  heroes: [
    { name: 'Barbarian King', level: 85, maxLevel: 95, village: 'home' },
    { name: 'Archer Queen', level: 86, maxLevel: 95, village: 'home' },
  ],
  troops: [{ name: 'Barbarian', level: 11, maxLevel: 12, village: 'home' }],
  spells: [{ name: 'Lightning Spell', level: 10, maxLevel: 11, village: 'home' }],
  achievements: [
    { name: 'Conqueror', stars: 3, value: 8123, target: 5000, info: 'Win 5000 multiplayer battles', village: 'home' },
    { name: 'Unbreakable', stars: 3, value: 2100, target: 5000, info: 'Successfully defend against 5000 attacks', village: 'home' },
  ],
};
```

`e2e/support/mockApi.ts` (imports `./fixtures.ts` with the extension so `scripts/screenshots.mjs` can load it under Node's type stripping in Task 8):

```ts
import type { Page } from '@playwright/test';
import { bsBattlelog, bsPlayer, cocPlayer, crBattlelog, crPlayer } from './fixtures.ts';

export { FIXTURE_TAG } from './fixtures.ts';

export interface MockApiOptions {
  /** Player requests wait for this promise: lets a test look at the loading state. */
  hold?: Promise<void>;
  /** Answer the first `times` player requests with this error instead of the fixture. */
  fail?: { status: number; reason: string; times: number };
}

// 1x1 transparent PNG: game art CDNs are answered locally so tests never depend on them.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const ART_HOSTS = /^https:\/\/(cdn\.brawlify\.com|cdn-old\.brawlify\.com|api-assets\.clashroyale\.com|api-assets\.clashofclans\.com|royaleapi\.github\.io)\//;

const PLAYER = /^\/api\/(clash-royale|brawl-stars|clash-of-clans)\/players\/[^/]+$/;

/**
 * Serve the Supercell API from fixtures. Returns the list of API paths the
 * page requested (decoded), in order.
 */
export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<string[]> {
  const calls: string[] = [];
  let failuresLeft = options.fail?.times ?? 0;

  await page.route(ART_HOSTS, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));

  await page.route('**/api/**', async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    calls.push(path);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (PLAYER.test(path)) {
      if (options.hold) await options.hold;
      if (failuresLeft > 0) {
        failuresLeft--;
        return json({ reason: options.fail!.reason, message: options.fail!.reason }, options.fail!.status);
      }
      if (path.startsWith('/api/clash-royale/')) return json(crPlayer);
      if (path.startsWith('/api/brawl-stars/')) return json(bsPlayer);
      return json(cocPlayer);
    }
    if (path.endsWith('/battlelog')) {
      return json(path.startsWith('/api/clash-royale/') ? crBattlelog : bsBattlelog);
    }
    if (path === '/api/clash-royale/cards' || path === '/api/brawl-stars/brawlers') return json({ items: [] });
    return json({ reason: 'notFound', message: 'notFound' }, 404);
  });

  return calls;
}

/** A promise plus the function that settles it. */
export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
```

- [ ] **Step 7: Write the Home e2e**

Create `e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

test('home shows one card per game, each with its own search box', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const name of ['Clash Royale', 'Brawl Stars', 'Clash of Clans']) {
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', expect.stringMatching(/^\/game\//));
    await expect(page.getByLabel(`${name} player tag`)).toBeVisible();
  }
  await expectNoEmoji(page.locator('main'));
  expect(problems).toEqual([]);
});

test('"/" focuses the first search box from anywhere on the page', async ({ page }) => {
  await page.goto('/');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  await expect(page.getByLabel('Clash Royale player tag')).toBeFocused();
});

test('an invalid tag is explained inline and does not navigate', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('Brawl Stars player tag');
  await input.fill('#ABC');
  await input.press('Enter');
  await expect(page.getByText('Player tags use only 0 2 8 9 P Y L Q G R J C U V.')).toBeVisible();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL('/');
});

test('a valid tag opens that game\'s player page', async ({ page }) => {
  const problems = watch(page);
  await mockApi(page);
  await page.goto('/');
  await page.getByLabel('Clash Royale player tag').fill(`#${FIXTURE_TAG.toLowerCase()}`);
  await page.getByLabel('Clash Royale player tag').press('Enter');
  await expect(page).toHaveURL(`/game/clash-royale/player/${FIXTURE_TAG}`);
  await expect(page.getByText('Vela Storm').first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('recent searches from every game appear as a row of links', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('supercell_recent_searches', JSON.stringify([
      { gameId: 'brawl-stars', tag: '#PYLQGRJC', username: 'Kitebreaker', trophies: 41234, timestamp: 2 },
      { gameId: 'clash-of-clans', tag: '#2Y0Y', username: 'Harrow Keep', trophies: 5012, thLevel: 15, timestamp: 1 },
    ]));
  });
  await page.goto('/');
  const row = page.getByRole('region', { name: 'Recent searches' });
  await expect(row.getByRole('link')).toHaveCount(2);
  await expect(row.getByRole('link').first()).toHaveAttribute('href', '/game/brawl-stars/player/PYLQGRJC');
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('nothing scrolls sideways and every control is 44px tall', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page.locator('main').locator('a, button, input'));
  });
});
```

- [ ] **Step 8: Run the e2e**

Run: `npm run build && npx playwright test e2e/home.spec.ts`
Expected: 6 passed. (If `nothing scrolls sideways` fails, check that every grid uses `grid-cols-1` as its base: an `<input>` has an intrinsic width that widens an implicit grid column past 320 px.)

- [ ] **Step 9: Look at it**

Run: `npm run preview -- --port 4174` and open `http://127.0.0.1:4174/` at 390 px and 1440 px wide (browser devtools). Check: three cards with accent hairline, search boxes aligned, no emoji, hero copy on two lines at most, footer link underlined. Stop the preview.

- [ ] **Step 10: Full gate and budget**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green; budget `entryJs ≈ 6.56 / 8`, `initialJs ≈ 124.8 / 128.89`, `css ≈ 13.0 / 13.45`.

- [ ] **Step 11: Commit**

```bash
git add src/app/ui src/app/data/games.ts src/app/pages/Home.tsx e2e
git commit -m "feat(home): search per game card, recent searches row, shared footer

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Move per-game content into lazy page modules (no visual change)

Pure move, as the spec's risk section asks ("move code before changing it"): the old hero, header and tab bars stay exactly as they are; only the game-specific blocks of `GamePage.tsx` move into one module per game, loaded on demand.

**Files:**
- Create: `src/app/pages/game/modules.ts`, `src/app/pages/game/types.ts`, `src/app/pages/game/ClashRoyale.tsx`, `src/app/pages/game/BrawlStars.tsx`, `src/app/pages/game/ClashOfClans.tsx`, `e2e/player.spec.ts`
- Modify: `src/app/pages/GamePage.tsx` (imports lines 1–39, state lines 95–96, game lookup line 90, blocks lines 438–588), `scripts/bundle-budget.json` (`gameModules`)

**Interfaces:**
- Consumes: from `GamePage.tsx` today: `BSProfile({playerStats, accentUrl, accentColor?, bsActiveTab, setBsActiveTab})` (`src/app/components/BSProfile.tsx:693-703`), `CRProfile({playerStats, accentUrl, accentColor})` (`CRProfile.tsx:11-19`), `CoCOverview({playerStats, accent})`, `CoCHeroesDisplay({heroes, heroEquipment, leagueName, leagueBadgeUrl, clanBadgeUrl, accent})`, `CoCArmyDisplay({troops, superTroops, builderBaseTroops, spells, siegeMachines, pets, accent})`, `CoCAchievements({achievements, accent})`, `StatCard({title, value, subtitle?, icon?, accentColor})`, `TrophyTrend({data, accentColor, unit?})`, `MatchHistory({matches, accentColor})`; `PanelSkeleton` (Task 2); `PlayerStats` (`src/app/data/mockStats.ts:277-295`); `GameTheme` (`games.ts`).
- Produces:
  - `GAME_MODULES` (`{ 'clash-royale' | 'brawl-stars' | 'clash-of-clans': LazyExoticComponent }`), `type GameId`, `isGameId(id: string): id is GameId` (`pages/game/modules.ts`).
  - `interface GameModuleProps { game: GameTheme; playerStats: PlayerStats }` (`pages/game/types.ts`; Task 6 adds `tab` and `onTabChange`).
  - Chunks named `ClashRoyale`, `BrawlStars`, `ClashOfClans` in the Vite manifest.

- [ ] **Step 1: Write the player-page e2e (passes before and after the move)**

Create `e2e/player.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const GAMES = [
  { id: 'clash-royale', player: 'Vela Storm' },
  { id: 'brawl-stars', player: 'Kitebreaker' },
  { id: 'clash-of-clans', player: 'Harrow Keep' },
] as const;

for (const { id, player } of GAMES) {
  test(`${id}: a player page renders its game module`, async ({ page }) => {
    const problems = watch(page);
    const calls = await mockApi(page);
    await page.goto(`/game/${id}/player/${FIXTURE_TAG}`);
    await expect(page.getByRole('heading', { name: player }).first()).toBeVisible();
    await expect(page.getByText(/trophies/i).first()).toBeVisible();
    expect(calls).toContain(`/api/${id}/players/#${FIXTURE_TAG}`);
    expect(problems).toEqual([]);
  });
}
```

Run: `npm run build && npx playwright test e2e/player.spec.ts`
Expected: 3 passed on the current code (`.first()` because CROverview repeats the player name in its own h2). This is the safety net for the move.

- [ ] **Step 2: Create the module registry and props type**

`src/app/pages/game/modules.ts`:

```ts
import { lazy } from 'react';

/**
 * One lazily loaded module per game: a player page downloads only its own
 * game's components. Keys are the route's :gameId values.
 */
export const GAME_MODULES = {
  'clash-royale': lazy(() => import('./ClashRoyale')),
  'brawl-stars': lazy(() => import('./BrawlStars')),
  'clash-of-clans': lazy(() => import('./ClashOfClans')),
} as const;

export type GameId = keyof typeof GAME_MODULES;

export function isGameId(id: string): id is GameId {
  return id in GAME_MODULES;
}
```

`src/app/pages/game/types.ts`:

```ts
import type { GameTheme } from '../../data/games';
import type { PlayerStats } from '../../data/mockStats';

/** Props every per-game page module receives from GamePage. */
export interface GameModuleProps {
  game: GameTheme;
  playerStats: PlayerStats;
}
```

- [ ] **Step 3: Create the three modules (code moved verbatim from GamePage)**

`src/app/pages/game/ClashRoyale.tsx` (from GamePage lines 496–501, 575–588):

```tsx
import { motion } from 'motion/react';
import { CRProfile } from '../../components/CRProfile';
import { TrophyTrend } from '../../components/TrophyTrend';
import { MatchHistory } from '../../components/MatchHistory';
import type { GameModuleProps } from './types';

// Moved verbatim from GamePage.tsx (restyle phase 1, task 4). Tabs move to the URL in task 6.
export default function ClashRoyale({ game, playerStats }: GameModuleProps) {
  return (
    <>
      {playerStats.gameVisuals?.cr && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <CRProfile playerStats={playerStats} accentUrl={game.logo || ''} accentColor={game.accent} />
        </motion.div>
      )}

      {playerStats.performanceData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <TrophyTrend data={playerStats.performanceData} accentColor={game.chartPrimary} />
        </motion.div>
      )}

      {playerStats.recentMatches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Recent Battles</h3>
          <MatchHistory matches={playerStats.recentMatches} accentColor={game.accent} />
        </motion.div>
      )}
    </>
  );
}
```

`src/app/pages/game/BrawlStars.tsx` (from GamePage lines 438–447, 466–490, 575–588 and the `bsActiveTab` state):

```tsx
import { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Award, Clock } from 'lucide-react';
import { BSProfile } from '../../components/BSProfile';
import { StatCard } from '../../components/StatCard';
import { TrophyTrend } from '../../components/TrophyTrend';
import { MatchHistory } from '../../components/MatchHistory';
import type { GameModuleProps } from './types';

// Moved verbatim from GamePage.tsx (restyle phase 1, task 4). Tabs move to the URL in task 6.
export default function BrawlStars({ game, playerStats }: GameModuleProps) {
  const [bsActiveTab, setBsActiveTab] = useState<string>('home');
  const onHome = bsActiveTab === 'home';

  const L = playerStats.statLabels ?? {};
  const wins = Math.round(playerStats.totalMatches * playerStats.winRate / 100);
  const kdDisplay = typeof playerStats.kd === 'number'
    ? (Number.isInteger(playerStats.kd) ? String(playerStats.kd) : playerStats.kd.toFixed(2))
    : String(playerStats.kd);

  return (
    <>
      <BSProfile
        playerStats={playerStats}
        accentUrl={game.logo || ''}
        accentColor={playerStats.gameVisuals?.bs?.nameColor ? `#${playerStats.gameVisuals.bs.nameColor.replace('0xff', '')}` : game.accent}
        bsActiveTab={bsActiveTab}
        setBsActiveTab={setBsActiveTab}
      />

      {onHome && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={L.stat1Title ?? 'Win Rate'} value={`${playerStats.winRate}%`}
            subtitle={L.stat1Sub ?? `${wins} wins`}
            icon={<Trophy className="w-6 h-6" />} accentColor={game.accent} />
          <StatCard title={L.stat2Title ?? 'K/D Ratio'} value={L.stat2Value ?? kdDisplay}
            subtitle={L.stat2Sub ?? 'Average per game'}
            icon={<Target className="w-6 h-6" />} accentColor={game.chartPrimary} />
          <StatCard title={L.stat3Title ?? 'Total Matches'} value={L.stat3Value ?? playerStats.totalMatches.toLocaleString()}
            subtitle={L.stat3Sub ?? `${playerStats.hoursPlayed} hours`}
            icon={<Award className="w-6 h-6" />} accentColor={game.chartSecondary} />
          <StatCard title={L.stat4Title ?? 'Trophies'} value={L.stat4Value ?? playerStats.hoursPlayed}
            subtitle={L.stat4Sub ?? ''}
            icon={<Clock className="w-6 h-6" />} accentColor={game.accent} />
        </motion.div>
      )}

      {onHome && playerStats.performanceData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <TrophyTrend data={playerStats.performanceData} accentColor={game.chartPrimary} />
        </motion.div>
      )}

      {onHome && playerStats.recentMatches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Recent Battles</h3>
          <MatchHistory matches={playerStats.recentMatches} accentColor={game.accent} />
        </motion.div>
      )}
    </>
  );
}
```

`src/app/pages/game/ClashOfClans.tsx` (from GamePage lines 449–464, 505–547 and the `cocActiveTab` state):

```tsx
import { useState } from 'react';
import { motion } from 'motion/react';
import { CoCHeroesDisplay } from '../../components/CoCHeroesDisplay';
import { CoCArmyDisplay } from '../../components/CoCArmyDisplay';
import { CoCAchievements } from '../../components/CoCAchievements';
import { CoCOverview } from '../../components/CoCOverview';
import type { GameModuleProps } from './types';

type CocTab = 'overview' | 'army' | 'heroes' | 'achievements';

// Moved verbatim from GamePage.tsx (restyle phase 1, task 4). Tabs move to the URL in task 6.
export default function ClashOfClans({ game, playerStats }: GameModuleProps) {
  const [cocActiveTab, setCocActiveTab] = useState<CocTab>('overview');
  const coc = playerStats.gameVisuals?.coc;

  return (
    <>
      <div className="flex justify-center mt-6">
        <div className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 border border-white/10 shadow-xl overflow-x-auto max-w-full no-scrollbar">
          {(['overview', 'army', 'heroes', 'achievements'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setCocActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap ${cocActiveTab === tab ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
            >
              {tab === 'heroes' ? 'Heroes & Equip' : tab}
            </button>
          ))}
        </div>
      </div>

      {coc && cocActiveTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <CoCOverview playerStats={playerStats} accent={game.accent} />
        </motion.div>
      )}

      {coc && cocActiveTab === 'heroes' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <CoCHeroesDisplay
            heroes={coc.heroes}
            heroEquipment={coc.heroEquipment}
            leagueName={coc.leagueName}
            leagueBadgeUrl={coc.leagueBadgeUrl}
            clanBadgeUrl={coc.clanBadgeUrl}
            accent={game.accent}
          />
        </motion.div>
      )}

      {coc && cocActiveTab === 'army' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <CoCArmyDisplay
            troops={coc.troops}
            superTroops={coc.superTroops}
            builderBaseTroops={coc.builderBaseTroops}
            spells={coc.spells}
            siegeMachines={coc.siegeMachines}
            pets={coc.pets}
            accent={game.accent}
          />
        </motion.div>
      )}

      {coc && cocActiveTab === 'achievements' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <CoCAchievements achievements={coc.achievements ?? []} accent={game.accent} />
        </motion.div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Cut GamePage over to the modules**

Apply these edits to `src/app/pages/GamePage.tsx` (LF file):

1. Line 2: `import { useState, useEffect, useCallback, useRef } from 'react';` → `import { useState, useEffect, useCallback, useRef, Suspense } from 'react';`
2. Lines 4–7 (the multi-line lucide import) → `import { Search, ArrowLeft, Clock, WifiOff, Users, Link2, Check, AlertTriangle } from 'lucide-react';`
3. Delete lines 9–17 (imports of `StatCard`, `TrophyTrend`, `MatchHistory`, `BSProfile`, `CoCHeroesDisplay`, `CoCArmyDisplay`, `CoCAchievements`, `CoCOverview`, `CRProfile`) and put in their place:
   ```tsx
   import { GAME_MODULES, isGameId } from './game/modules';
   import { PanelSkeleton } from '../ui/Skeleton';
   ```
4. Delete lines 22–39 (`// Auto icon mapping…`, `STAT_ICONS`, `getStatIcon`): dead code, every game was excluded from the "All Stats" block that used it (D20).
5. Line 90: `const game = gameId ? getGameById(gameId) : null;` → `const game = gameId && isGameId(gameId) ? getGameById(gameId) : null;`
6. Delete lines 95–96 (`bsActiveTab` and `cocActiveTab` state).
7. After line 205 `const playerStats = result?.data;` add:
   ```tsx
   const GameModule = GAME_MODULES[game.id as keyof typeof GAME_MODULES];
   ```
8. Replace everything from line 438 `{/* ── BRAWL STARS: Main Profile ── */}` up to and including line 588 (the closing `)}` of the `{/* ── Recent Battles ── */}` block), i.e. all game-specific blocks inside `<div className={\`max-w-5xl mx-auto space-y-10 …\`}>` after the player header `</motion.div>`, with:
   ```tsx
              {/* ── Per-game content: one lazily loaded module per game ── */}
              <Suspense fallback={<PanelSkeleton />}>
                <GameModule game={game} playerStats={playerStats} />
              </Suspense>
   ```

Run: `npm run typecheck && npm run lint`
Expected: no errors (an "unused import" error means a step above was skipped).

- [ ] **Step 5: Register the modules in the budget**

In `scripts/bundle-budget.json` set:

```json
  "gameModules": [
    "ClashRoyale",
    "BrawlStars",
    "ClashOfClans"
  ],
```

- [ ] **Step 6: Build, check the split, run e2e**

Run: `npm run build`
Expected: Vite prints `ClashRoyale-*.js`, `BrawlStars-*.js`, `ClashOfClans-*.js` chunks; budget `playerPageJs ≈ 154.3 / 171.76` (down from 163.6: a player page now loads one game's code), `css ≈ 12.97`.

Run: `npm run e2e`
Expected: all green (smoke + ui + home + player).

- [ ] **Step 7: Commit**

```bash
git add src/app/pages scripts/bundle-budget.json e2e/player.spec.ts
git commit -m "refactor(game): move per-game content into lazy page modules

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Player-page shell (header, summary, states, game landing)

**Files:**
- Create: `src/app/ui/text.ts`, `src/app/ui/__tests__/text.test.ts`, `src/app/ui/Avatar.tsx`, `src/app/ui/PlayerSummaryBar.tsx`, `src/app/ui/AppHeader.tsx`, `src/app/pages/game/summary.tsx`, `src/app/pages/game/GameLanding.tsx`
- Modify: `src/app/pages/GamePage.tsx` (whole file), `e2e/player.spec.ts` (whole file)

**Interfaces:**
- Consumes: `searchPlayer(gameId, input): Promise<SearchResult>` with `SearchResult {data: PlayerStats | null; isReal: boolean; error: string | null}` (`src/app/services/gameApiRouter.ts:6-50`); `normalizeTag` (`supercellService.ts:9`); `getRecentSearches`, `saveRecentSearch(gameId, tag, stats)`, `removeRecentSearch(gameId, tag)`, `RecentSearch` (`recentSearches.ts`); `PlayerStats.username/rank/level/trophies/dataNotice/gameVisuals.{cr.arenaId,cr.arenaIconUrl,cr.arenaName,bs.iconId,coc.townHallLevel,coc.leagueName}` (`mockStats.ts:193-295`); from Task 2: `Button`, `buttonClasses`, `cx`, `ErrorState`, `EmptyState`, `Pill`, `Row`, `PlayerPageSkeleton`, `PanelSkeleton`; from Task 3: `SearchBox`, `SearchBoxProps`, `SiteFooter`, `tagSlug`, `GameTheme.shortName`; from Task 4: `GAME_MODULES`, `isGameId`, `GameModuleProps {game, playerStats}`; `NotFound` default export (Task 2).
- Produces:
  - `stripEmoji(text: string): string` (`ui/text.ts`).
  - `<Avatar sources: string[] alt: string fallback: ReactNode className?>` (`ui/Avatar.tsx`; give it a `key` per player).
  - `interface PlayerSummary { name; tag; avatar: {sources, alt, fallback}; trophies?; level?; league?; extra? }`; `<PlayerSummaryBar summary meta?>` with `data-testid="player-summary"` and the page's only visible `h1` (`ui/PlayerSummaryBar.tsx`; Task 7 adds `PlayerSummaryCompact`).
  - `<AppHeader game title? compactNav? search?: Pick<SearchBoxProps,'label'|'initialValue'|'busy'|'onSubmitTag'>>`: nav landmark "Switch game", link "All games", mobile toggle "Search a player"/"Close search" (`ui/AppHeader.tsx`).
  - `buildSummary(game: GameTheme, stats: PlayerStats, urlTag: string): PlayerSummary` (`pages/game/summary.tsx`).
  - `<GameLanding game recent onRemoveRecent>` (`pages/game/GameLanding.tsx`).
  - GamePage DOM contract used by Tasks 6–7: root `<div data-game={game.id}>`, `<main>`, live region `role="status"`, the hero wrapped where Task 7 will add a ref, and `<div className="mt-6 space-y-10">` around the `Suspense`d `GameModule` that Task 6 replaces.

- [ ] **Step 1: Write the failing emoji test**

Create `src/app/ui/__tests__/text.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stripEmoji } from '../text';

describe('stripEmoji', () => {
  it.each([
    ['7123 PL 🏆', '7123 PL'],
    ['⚜️ Grandmaster', 'Grandmaster'],
    ['1,530 👑 3-Crown wins', '1,530 3-Crown wins'],
    ['League 7', 'League 7'],
    ['👨‍👩‍👧', ''],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(stripEmoji(input)).toBe(expected);
  });
});
```

Run: `npx vitest run src/app/ui/__tests__/text.test.ts`
Expected: FAIL, cannot resolve `../text`.

- [ ] **Step 2: Implement it**

Create `src/app/ui/text.ts`:

```ts
/**
 * Drop emoji (with their variation selectors and ZWJ sequences) from a data
 * string. Some API-mapped labels carry one ("7123 PL 🏆"); the restyled
 * chrome shows SVG icons instead.
 */
export function stripEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu, '')
    .replace(/️/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
```

Run: `npx vitest run src/app/ui/__tests__/text.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 3: Write the shell e2e first**

Replace `e2e/player.spec.ts` (the Task 4 test `…a player page renders its game module` becomes `…renders the shell and its game module` and now requires an `h1`; the rest is new):

```ts
import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { FIXTURE_TAG, deferred, mockApi } from './support/mockApi';

const GAMES = [
  { id: 'clash-royale', player: 'Vela Storm' },
  { id: 'brawl-stars', player: 'Kitebreaker' },
  { id: 'clash-of-clans', player: 'Harrow Keep' },
] as const;

for (const { id, player } of GAMES) {
  test(`${id}: a player page renders the shell and its game module`, async ({ page }) => {
    const problems = watch(page);
    const calls = await mockApi(page);
    await page.goto(`/game/${id}/player/${FIXTURE_TAG}`);
    await expect(page.getByRole('heading', { level: 1, name: player })).toBeVisible();
    await expect(page.getByTestId('player-summary').getByText(`#${FIXTURE_TAG}`)).toBeVisible();
    await expect(page.getByText(/trophies/i).first()).toBeVisible();
    await expect(page.locator(`[data-game="${id}"]`).first()).toBeVisible();
    expect(calls).toContain(`/api/${id}/players/#${FIXTURE_TAG}`);
    expect(problems).toEqual([]);
  });
}

test('a skeleton holds the layout while the player loads', async ({ page }) => {
  const gate = deferred();
  await mockApi(page, { hold: gate.promise });
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  await expect(page.getByTestId('player-skeleton')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Searching…');
  gate.release();
  await expect(page.getByRole('heading', { level: 1, name: 'Vela Storm' })).toBeVisible();
  await expect(page.getByTestId('player-skeleton')).toHaveCount(0);
});

test('an API error shows the real reason and Retry reloads the player in the URL', async ({ page }) => {
  const problems = watch(page, [/Failed to load resource/]);
  const calls = await mockApi(page, { fail: { status: 429, reason: 'requestThrottled', times: 1 } });
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
  const error = page.getByTestId('error-state');
  await expect(error.getByText('Search failed')).toBeVisible();
  await expect(error.getByText('Too many requests — please wait a moment and try again.')).toBeVisible();

  // Typed but not submitted: Retry must ignore it.
  await page.getByLabel('Player tag').fill('#2PP');
  await error.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kitebreaker' })).toBeVisible();
  expect(calls.filter((c) => /\/players\/[^/]+$/.test(c))).toEqual([
    `/api/brawl-stars/players/#${FIXTURE_TAG}`,
    `/api/brawl-stars/players/#${FIXTURE_TAG}`,
  ]);
  expect(problems).toEqual([]);
});

test('an unknown player gets a "Player not found" error', async ({ page }) => {
  await mockApi(page, { fail: { status: 404, reason: 'notFound', times: 1 } });
  await page.goto(`/game/clash-of-clans/player/${FIXTURE_TAG}`);
  await expect(page.getByTestId('error-state').getByText('Player not found', { exact: true })).toBeVisible();
});

test('the game landing offers a search box and an empty recent-searches state', async ({ page }) => {
  await page.goto('/game/clash-royale');
  await expect(page.getByRole('heading', { level: 1, name: 'Clash Royale' })).toBeVisible();
  await expect(page.getByLabel('Player tag')).toBeVisible();
  await expect(page.getByTestId('empty-state').getByText('No recent searches yet')).toBeVisible();
});

test('recent searches on the game landing open and can be removed', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('supercell_recent_searches', JSON.stringify([
      { gameId: 'clash-of-clans', tag: '#PYLQGRJC', username: 'Harrow Keep', trophies: 5012, thLevel: 15, clanName: 'Lantern Watch', timestamp: 1 },
    ]));
  });
  await page.goto('/game/clash-of-clans');
  const recent = page.getByRole('region', { name: 'Recent searches' });
  await expect(recent.getByRole('link', { name: /Harrow Keep/ })).toHaveAttribute('href', '/game/clash-of-clans/player/PYLQGRJC');
  await recent.getByRole('button', { name: 'Remove Harrow Keep from recent searches' }).click();
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('the header links back home and switches game', async ({ page }) => {
  await mockApi(page);
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
  const nav = page.getByRole('navigation', { name: 'Switch game' });
  await expect(nav.getByRole('link', { name: 'Brawl Stars' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Clash of Clans' }).click();
  await expect(page).toHaveURL('/game/clash-of-clans');
  await page.getByRole('link', { name: 'All games' }).click();
  await expect(page).toHaveURL('/');
});

test('"/" focuses the header search on a player page', async ({ page }) => {
  await mockApi(page);
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Vela Storm' })).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByLabel('Player tag')).toBeFocused();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the header search opens on request and closes after a search', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
    await expect(page.getByLabel('Player tag')).toBeHidden();
    await page.getByRole('button', { name: 'Search a player' }).click();
    await page.getByLabel('Player tag').fill('#2PP');
    await page.getByLabel('Player tag').press('Enter');
    await expect(page).toHaveURL('/game/clash-royale/player/2PP');
    await expect(page.getByLabel('Player tag')).toBeHidden();
  });
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const { id, player } of GAMES) {
    test(`${id}: no sideways scroll, 44px header and summary controls`, async ({ page }) => {
      await mockApi(page);
      await page.goto(`/game/${id}/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1, name: player })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page.locator('header').locator('a, button'));
      await expectTouchTargets(page.getByTestId('player-summary').locator('a, button'));
    });
  }
});
```

Run: `npm run build && npx playwright test e2e/player.spec.ts`
Expected: FAIL for most tests (no `h1` with the player name, no `player-skeleton`, no `Switch game` navigation…).

- [ ] **Step 4: Create Avatar, PlayerSummaryBar and AppHeader**

`src/app/ui/Avatar.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { cx } from './cx';

interface AvatarProps {
  /** Tried in order; the next one loads when one fails. */
  sources: string[];
  alt: string;
  /** Shown when every source failed or there is none (a lucide icon or a short text). */
  fallback: ReactNode;
  className?: string;
}

/**
 * Square player image with a fallback chain. Give it a `key` that changes
 * with the player so a new player starts again from the first source.
 */
export function Avatar({ sources, alt, fallback, className }: AvatarProps) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  return (
    <span className={cx('flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-surface-2 sm:size-16', className)}>
      {src ? (
        <img
          key={src}
          src={src}
          alt={alt}
          width={48}
          height={48}
          decoding="async"
          onError={() => setIndex((i) => i + 1)}
          className="size-10 object-contain sm:size-12"
        />
      ) : (
        <span aria-hidden="true" className="text-lg font-bold text-fg-muted tabular-nums [&_svg]:size-7">{fallback}</span>
      )}
    </span>
  );
}
```

`src/app/ui/PlayerSummaryBar.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Trophy } from 'lucide-react';
import { Avatar } from './Avatar';
import { Pill } from './Pill';

/** What the shell knows about a player, whatever the game. */
export interface PlayerSummary {
  name: string;
  /** Display form with the leading '#'. */
  tag: string;
  avatar: { sources: string[]; alt: string; fallback: ReactNode };
  trophies?: number;
  level?: number;
  /** League / arena / rank, emoji already stripped. */
  league?: string;
  /** One more fact worth a pill (Clash of Clans: "Town Hall 15"). */
  extra?: string;
}

interface PlayerSummaryBarProps {
  summary: PlayerSummary;
  /** Row under the identity: data source pill, copy-link button. */
  meta?: ReactNode;
}

/** The player hero: identity on the left, the trophy count on the right (stacked on phones). */
export function PlayerSummaryBar({ summary, meta }: PlayerSummaryBarProps) {
  return (
    <section aria-label="Player summary" data-testid="player-summary">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar key={summary.tag} {...summary.avatar} />
          <div className="min-w-0">
            <h1 className="font-display text-title leading-tight font-normal text-fg wrap-anywhere sm:text-display">{summary.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill>{summary.tag}</Pill>
              {summary.league && <Pill tone="accent">{summary.league}</Pill>}
              {summary.level !== undefined && <Pill>Level {summary.level}</Pill>}
              {summary.extra && <Pill>{summary.extra}</Pill>}
            </div>
          </div>
        </div>
        {summary.trophies !== undefined && (
          <div className="flex shrink-0 items-baseline gap-3 sm:flex-col sm:items-end sm:gap-1">
            <span className="text-xs text-fg-subtle">Trophies</span>
            <span className="inline-flex items-center gap-2 text-stat font-semibold tabular-nums text-fg">
              <Trophy aria-hidden="true" className="size-5 text-accent" />
              {summary.trophies.toLocaleString('en-US')}
            </span>
          </div>
        )}
      </div>
      {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
    </section>
  );
}
```

`src/app/ui/AppHeader.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Search, X } from 'lucide-react';
import { games, type GameTheme } from '../data/games';
import { buttonClasses } from './Button';
import { cx } from './cx';
import { SearchBox, type SearchBoxProps } from './SearchBox';

interface AppHeaderProps {
  game: GameTheme;
  /** Replaces the game name in the bar (the condensed player once the hero scrolled away). */
  title?: ReactNode;
  /** Hide the game switcher on phones (it gives its room to `title`). */
  compactNav?: boolean;
  /** Header search, on player pages. The game landing has its own large box instead. */
  search?: Pick<SearchBoxProps, 'label' | 'initialValue' | 'busy' | 'onSubmitTag'>;
}

/**
 * Sticky top bar, one constant height on every width: back to all games,
 * title, game switcher, search. On phones the search is a toggle that opens
 * a row under the bar (only on request, so nothing below it moves by itself).
 */
export function AppHeader({ game, title, compactNav = false, search }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1 px-2 sm:gap-3 sm:px-6">
        <Link to="/" aria-label="All games" className={buttonClasses('ghost', 'w-11 shrink-0 px-0 sm:w-auto sm:px-3')}>
          <ArrowLeft aria-hidden="true" />
          <span className="hidden sm:inline">Games</span>
        </Link>

        <div className="min-w-0 flex-1">
          {title ?? <span className="hidden truncate font-display text-base text-fg sm:block">{game.name}</span>}
        </div>

        <nav aria-label="Switch game" className={cx('shrink-0 items-center gap-1', compactNav ? 'hidden sm:flex' : 'flex')}>
          {games.map((g) => {
            const current = g.id === game.id;
            return (
              <Link
                key={g.id}
                to={`/game/${g.id}`}
                data-game={g.id}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-3 text-xs font-semibold transition-colors duration-150',
                  current ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <span aria-hidden="true" className="lg:hidden">{g.shortName}</span>
                <span className="sr-only lg:not-sr-only">{g.name}</span>
              </Link>
            );
          })}
        </nav>

        {search && (
          <>
            <div
              id="header-search"
              className={cx(
                'md:block md:w-72 lg:w-80',
                searchOpen ? 'absolute inset-x-0 top-full border-b border-line bg-canvas px-4 py-3 md:static md:border-0 md:p-0' : 'hidden',
              )}
            >
              <SearchBox
                {...search}
                gameId={game.id}
                shortcut
                onBeforeFocus={() => setSearchOpen(true)}
                onSubmitTag={(slug) => {
                  setSearchOpen(false);
                  search.onSubmitTag?.(slug);
                }}
              />
            </div>
            <button
              type="button"
              aria-label={searchOpen ? 'Close search' : 'Search a player'}
              aria-expanded={searchOpen}
              aria-controls="header-search"
              onClick={() => setSearchOpen((open) => !open)}
              className={buttonClasses('ghost', 'w-11 shrink-0 px-0 md:hidden')}
            >
              {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Create the summary builder and the game landing**

`src/app/pages/game/summary.tsx` (the Town Hall table moves here from GamePage lines 44–56; image fallbacks become an Avatar chain ending in a lucide icon or the TH number, never an emoji):

```tsx
import { Star, Swords, UserRound } from 'lucide-react';
import type { GameTheme } from '../../data/games';
import type { PlayerStats } from '../../data/mockStats';
import type { PlayerSummary } from '../../ui/PlayerSummaryBar';
import { tagSlug } from '../../ui/tag';
import { stripEmoji } from '../../ui/text';

// Town Hall art stored locally under /images/coc/townhall/. Only levels with
// an asset on disk belong here: a missing level shows its number instead.
const TH_IMAGES: Record<number, string> = {
  1: '/images/coc/townhall/th_01.webp',
  7: '/images/coc/townhall/th_07.webp',
  8: '/images/coc/townhall/th_08.webp',
  9: '/images/coc/townhall/th_09.webp',
  10: '/images/coc/townhall/th_10.webp',
  11: '/images/coc/townhall/th_11.webp',
  12: '/images/coc/townhall/th_12.webp',
  13: '/images/coc/townhall/th_13.webp',
  14: '/images/coc/townhall/th_14.webp',
  15: '/images/coc/townhall/th_15.webp',
  16: '/images/coc/townhall/th_16.webp',
};

/** The shell's view of a player: identity, avatar chain and headline numbers. */
export function buildSummary(game: GameTheme, stats: PlayerStats, urlTag: string): PlayerSummary {
  const visuals = stats.gameVisuals;
  const base = {
    name: stats.username,
    tag: `#${tagSlug(urlTag)}`,
    trophies: stats.trophies,
    level: stats.level,
    league: stripEmoji(stats.rank) || undefined,
  };

  if (game.id === 'clash-royale' && visuals?.cr) {
    const { arenaId, arenaIconUrl, arenaName } = visuals.cr;
    const sources = [
      arenaIconUrl,
      arenaId ? `https://api-assets.clashroyale.com/arenas/72/${arenaId}.png` : undefined,
      arenaId ? `https://royaleapi.github.io/cr-api-assets/arenas/${arenaId}.png` : undefined,
    ].filter((s): s is string => Boolean(s));
    return { ...base, avatar: { sources, alt: arenaName ? `${arenaName} arena` : 'Arena', fallback: <Swords /> } };
  }

  if (game.id === 'brawl-stars' && visuals?.bs) {
    const { iconId } = visuals.bs;
    const sources = iconId ? [`https://cdn.brawlify.com/profile-icons/regular/${iconId}.png`] : [];
    return { ...base, avatar: { sources, alt: 'Player icon', fallback: <Star /> } };
  }

  if (game.id === 'clash-of-clans' && visuals?.coc) {
    const th = visuals.coc.townHallLevel;
    return {
      ...base,
      league: visuals.coc.leagueName || base.league,
      extra: `Town Hall ${th}`,
      avatar: { sources: TH_IMAGES[th] ? [TH_IMAGES[th]] : [], alt: `Town Hall ${th}`, fallback: th },
    };
  }

  return { ...base, avatar: { sources: [], alt: '', fallback: <UserRound /> } };
}
```

`src/app/pages/game/GameLanding.tsx`:

```tsx
import { Link } from 'react-router';
import { History, Trophy, X } from 'lucide-react';
import type { GameTheme } from '../../data/games';
import type { RecentSearch } from '../../services/recentSearches';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Pill } from '../../ui/Pill';
import { Row } from '../../ui/Row';
import { SearchBox } from '../../ui/SearchBox';

interface GameLandingProps {
  game: GameTheme;
  recent: RecentSearch[];
  onRemoveRecent: (tag: string) => void;
}

/** /game/:gameId without a tag: one large search box and this game's recent searches. */
export function GameLanding({ game, recent, onRemoveRecent }: GameLandingProps) {
  return (
    <>
      <section className="pt-6 pb-2 sm:pt-10">
        <h1 className="font-display text-title font-normal text-fg sm:text-display">{game.name}</h1>
        <p className="mt-2 max-w-xl text-base text-fg-muted">
          {game.tagline}. Search a player by tag to see trophies, progress and recent battles.
        </p>
        <SearchBox className="mt-6 max-w-xl" gameId={game.id} label="Player tag" size="lg" shortcut />
      </section>

      <section aria-labelledby="recent-heading" className="mt-8">
        <h2 id="recent-heading" className="mb-3 text-sm font-semibold text-fg">Recent searches</h2>
        {recent.length === 0 ? (
          <EmptyState icon={<History />} title="No recent searches yet">
            Players you look up appear here, so you can reopen them in one tap.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {recent.map((r) => (
              <li key={r.tag} className="flex items-center gap-1 rounded-card border border-line bg-surface-1 pr-1 transition-colors duration-150 hover:border-line-strong">
                <Link to={`/game/${game.id}/player/${r.tag.replace(/^#/, '')}`} className="min-w-0 flex-1 rounded-card px-4">
                  <Row
                    className="min-h-14"
                    label={
                      <>
                        <span className="block truncate font-semibold text-fg">{r.username}</span>
                        <span className="block truncate text-xs text-fg-subtle">{r.clanName ? `${r.tag}, ${r.clanName}` : r.tag}</span>
                      </>
                    }
                    value={
                      r.thLevel !== undefined ? (
                        <Pill tone="accent">TH {r.thLevel}</Pill>
                      ) : r.trophies > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Trophy aria-hidden="true" className="size-4 text-accent" />
                          {r.trophies.toLocaleString('en-US')}
                        </span>
                      ) : null
                    }
                  />
                </Link>
                <Button variant="ghost" aria-label={`Remove ${r.username} from recent searches`} onClick={() => onRemoveRecent(r.tag)} className="w-11 shrink-0 px-0">
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
```

- [ ] **Step 6: Rewrite GamePage as routing + data + shell**

Replace `src/app/pages/GamePage.tsx`. Behaviour kept from the old file: URL is the source of truth (`useEffect` on `urlTag`), `requestId` guard against stale responses, previous player stays dimmed while the next loads, recent searches saved on success, per-page `document.title`, `%23` stripping, copy-link. Changed: Retry uses the URL tag (D14); unknown game renders `NotFound` (D19); the first render of a player URL is already "loading" (no empty frame before the skeleton).

```tsx
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, Info, Link2 } from 'lucide-react';
import { getGameById } from '../data/games';
import { searchPlayer, type SearchResult } from '../services/gameApiRouter';
import { normalizeTag } from '../services/supercellService';
import { getRecentSearches, removeRecentSearch, saveRecentSearch, type RecentSearch } from '../services/recentSearches';
import { AppHeader } from '../ui/AppHeader';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { ErrorState } from '../ui/ErrorState';
import { Pill } from '../ui/Pill';
import { PlayerSummaryBar } from '../ui/PlayerSummaryBar';
import { PanelSkeleton, PlayerPageSkeleton } from '../ui/Skeleton';
import { SiteFooter } from '../ui/SiteFooter';
import { GameLanding } from './game/GameLanding';
import { GAME_MODULES, isGameId } from './game/modules';
import { buildSummary } from './game/summary';
import NotFound from './NotFound';

const SITE_TITLE = 'Supercell Stats — Player stats for Clash Royale, Brawl Stars & Clash of Clans';

/** Routing, data loading and the page shell. Everything game-specific lives in ./game/. */
export default function GamePage() {
  const { gameId, tag: rawUrlTag } = useParams<{ gameId: string; tag?: string }>();
  // A percent-encoded '#' (%23) is decoded by the router into a leading '#'; strip one so we never build '##TAG'.
  const urlTag = rawUrlTag?.replace(/^#/, '');
  const navigate = useNavigate();
  const game = gameId && isGameId(gameId) ? getGameById(gameId) : undefined;

  const [result, setResult] = useState<SearchResult | null>(null);
  // A player URL starts loading on the first render: no empty frame before the skeleton.
  const [isLoading, setIsLoading] = useState(() => Boolean(rawUrlTag));
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => (gameId ? getRecentSearches(gameId) : []));
  const [copied, setCopied] = useState(false);
  // Only the most recent search may write its result (a slow older one must not overwrite it).
  const requestId = useRef(0);

  // Adjust state during render when the route changes (instead of syncing in an effect).
  const [prevGameId, setPrevGameId] = useState(gameId);
  if (prevGameId !== gameId) {
    setPrevGameId(gameId);
    setRecentSearches(gameId ? getRecentSearches(gameId) : []);
  }
  const [prevUrlTag, setPrevUrlTag] = useState(urlTag);
  if (prevUrlTag !== urlTag) {
    setPrevUrlTag(urlTag);
    if (!urlTag) {
      setResult(null);
      setIsLoading(false);
    }
  }

  const performSearch = useCallback(async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || !gameId) return;
    const myRequest = ++requestId.current;
    setIsLoading(true);
    // The previous result stays on screen (dimmed) while the next one loads:
    // blanking it makes every search look like the page broke.
    const res = await searchPlayer(gameId, trimmed);
    if (myRequest !== requestId.current) return;
    setResult(res);
    setIsLoading(false);

    if (res.data) {
      saveRecentSearch(gameId, normalizeTag(trimmed), res.data);
      setRecentSearches(getRecentSearches(gameId));
    }
  }, [gameId]);

  // The URL is the source of truth for which player is shown.
  useEffect(() => {
    if (!urlTag) {
      requestId.current++;   // invalidate any in-flight search
      return;
    }
    // Fetch-on-URL-change: performSearch sets the loading flag before awaiting; no cheaper derivation exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void performSearch(`#${urlTag}`);
  }, [urlTag, performSearch]);

  // Per-page document title
  useEffect(() => {
    if (!game) return;
    const player = result?.data?.username;
    document.title = player && urlTag
      ? `${player} · ${game.name} Stats — Supercell Stats`
      : `${game.name} Stats — Supercell Stats`;
    return () => { document.title = SITE_TITLE; };
  }, [game, result?.data?.username, urlTag]);

  if (!game) return <NotFound />;

  /** Navigating is what triggers the search: one history entry per player. */
  const goToPlayer = (slug: string) => {
    if (isLoading) return;
    if (slug === urlTag) {
      void performSearch(`#${slug}`);   // same player: re-fetch rather than no-op
      return;
    }
    navigate(`/game/${game.id}/player/${slug}`);
  };

  // Retry always means "the player in the address bar", whatever is typed in the search box.
  const retry = () => {
    if (urlTag) void performSearch(`#${urlTag}`);
  };

  const removeRecent = (tag: string) => {
    removeRecentSearch(game.id, tag);
    setRecentSearches(getRecentSearches(game.id));
  };

  const copyPlayerLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context or denied): the URL bar still has it */
    }
  };

  const playerStats = urlTag ? result?.data ?? null : null;
  const error = urlTag && !isLoading ? result?.error ?? null : null;
  const GameModule = GAME_MODULES[game.id as keyof typeof GAME_MODULES];
  const summary = playerStats && urlTag ? buildSummary(game, playerStats, urlTag) : null;

  return (
    <div data-game={game.id} className="flex min-h-dvh flex-col">
      <AppHeader
        game={game}
        search={urlTag ? { label: 'Player tag', initialValue: `#${urlTag}`, busy: isLoading, onSubmitTag: goToPlayer } : undefined}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {/* Screen-reader status for the async search */}
        <p className="sr-only" role="status" aria-live="polite">
          {isLoading
            ? 'Searching…'
            : error
              ? `Search failed: ${error}`
              : playerStats
                ? `Showing stats for ${playerStats.username}`
                : ''}
        </p>

        {!urlTag && <GameLanding game={game} recent={recentSearches} onRemoveRecent={removeRecent} />}

        {urlTag && !playerStats && (
          <h1 className="sr-only">{`${game.name} player #${urlTag}`}</h1>
        )}

        {urlTag && (
          <div className="pt-6 sm:pt-8">
            {error && (
              <ErrorState
                title={error.toLowerCase().includes('not found') ? 'Player not found' : 'Search failed'}
                message={error}
                onRetry={retry}
                retrying={isLoading}
              />
            )}

            {isLoading && !playerStats && <PlayerPageSkeleton />}

            {playerStats && summary && (
              // Refetch keeps the frame: the previous player stays visible, dimmed.
              <div aria-busy={isLoading} className={cx('transition-opacity duration-200', isLoading && 'opacity-50')}>
                <PlayerSummaryBar
                  summary={summary}
                  meta={
                    <>
                      {result?.isReal
                        ? <Pill tone="win">Live from the official Supercell API</Pill>
                        : <Pill>Demo data: stats are randomly generated (VITE_DEMO_MODE)</Pill>}
                      <Button variant="ghost" onClick={() => void copyPlayerLink()}>
                        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                        {copied ? 'Link copied' : 'Copy link'}
                      </Button>
                    </>
                  }
                />

                {playerStats.dataNotice && (
                  <div className="mt-4 flex items-start gap-3 rounded-card border border-line bg-surface-1 p-4 text-sm text-fg-muted">
                    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                    <p>{playerStats.dataNotice}</p>
                  </div>
                )}

                <div className="mt-6 space-y-10">
                  <Suspense fallback={<PanelSkeleton />}>
                    <GameModule game={game} playerStats={playerStats} />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <SiteFooter note={`${game.name} stats. All game data comes from the official Supercell developer API.`} />
    </div>
  );
}
```

- [ ] **Step 7: Run unit, type and e2e checks**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green. Existing tests that now go through the new shell: `smoke.spec.ts` › `an invalid tag shows a friendly error, not a crash` (text from `ErrorState`), `a percent-encoded # in the player URL is treated like the bare tag` (`getByLabel('Player tag')` is the header SearchBox, value `#ABC`), `/game/<id> loads with no runtime errors` (visible `h1` from `GameLanding`). Budget: `css ≈ 12.52`, `playerPageJs ≈ 154.5`.

- [ ] **Step 8: Look at it**

Run: `npm run preview -- --port 4174`, then in a browser with devtools device mode open `/game/clash-royale` and `/game/brawl-stars/player/<any valid tag>` at 390 and 1440 px (real data comes through the preview proxy). Check: header one row at both widths, switcher pills readable, summary trophies never clipped, error state readable. Stop the preview.

- [ ] **Step 9: Commit**

```bash
git add src/app/ui src/app/pages e2e/player.spec.ts
git commit -m "feat(game): player-page shell with header search, summary bar and loading/empty/error states

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Section tabs in the URL, wired to the existing tab contents

**Files:**
- Create: `src/app/ui/tabs.ts`, `src/app/ui/__tests__/tabs.test.ts`, `src/app/ui/SectionTabs.tsx`, `src/app/pages/game/tabs.tsx`, `src/app/pages/game/OverviewExtras.tsx`, `e2e/tabs.spec.ts`
- Modify: `src/app/pages/game/types.ts`, `src/app/pages/game/{ClashRoyale,BrawlStars,ClashOfClans}.tsx` (whole files), `src/app/pages/GamePage.tsx` (imports, tab state, panel), `src/app/components/BSProfile.tsx` (CRLF; via script), `src/app/components/TrophyTrend.tsx:1,31`
- Delete: `src/app/components/CRProfile.tsx`

**Interfaces:**
- Consumes: `CROverview({playerStats, accent, onTabChange?: (tab: string) => void})` (`CROverview.tsx:5-11`, calls `onTabChange('deck')`), `CRCardsList({cards: CRCardData[], accent})`, `CRDeck({playerStats, accent})`, `CRTowerTroops({playerStats, accent})`, `MatchHistory`, `TrophyTrend`, the five BS section components currently private in `BSProfile.tsx` (`BSHome` line 22, `BSBrawlers` 120, `BSProgression` 339, `BSBattleLog` 434, `BSClub` 577; each `({playerStats, accentColor}: {playerStats: PlayerStats, accentColor: string})`), the four CoC components, `GameId` (Task 4), `Card`, `Button`, `EmptyState`, `StatTile`, `stripEmoji`, `cx`.
- Produces:
  - `parseTab(search: string, validIds: readonly string[], fallback: string): string`; `withTab(search: string, id: string, defaultId: string): string` (`ui/tabs.ts`).
  - `interface TabDef { id: string; label: string; icon?: ReactNode }`; `<SectionTabs tabs active onSelect={(id, via: 'pointer'|'keyboard') => void} label idPrefix>`; tab ids `${idPrefix}-tab-<id>`, panel id `${idPrefix}-panel` (`ui/SectionTabs.tsx`).
  - `GAME_TABS: Record<GameId, readonly TabDef[]>` with ids CR `overview|cards|deck|battles|towers`, BS `overview|brawlers|progression|battles|club`, CoC `overview|army|heroes|achievements` (`pages/game/tabs.tsx`).
  - `GameModuleProps` gains `tab: string` and `onTabChange: (id: string) => void`.
  - `BSHome`, `BSBrawlers`, `BSProgression`, `BSBattleLog`, `BSClub` exported from `components/BSProfile.tsx`; `BSProfile` itself is gone.
  - Page DOM: `role="tablist"` named "<Game> player sections" inside a sticky strip at `top: var(--header-h)`; `<section id="player-panel" role="tabpanel">` with an `sr-only` h2 = tab label.

- [ ] **Step 1: Write the failing tab-URL tests**

Create `src/app/ui/__tests__/tabs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseTab, withTab } from '../tabs';

const IDS = ['overview', 'cards', 'deck', 'battles', 'towers'] as const;

describe('parseTab', () => {
  it('returns a valid ?tab id', () => {
    expect(parseTab('?tab=battles', IDS, 'overview')).toBe('battles');
  });
  it('falls back when ?tab is missing, empty or unknown', () => {
    expect(parseTab('', IDS, 'overview')).toBe('overview');
    expect(parseTab('?tab=', IDS, 'overview')).toBe('overview');
    expect(parseTab('?tab=brawlers', IDS, 'overview')).toBe('overview');
    expect(parseTab('?tab=%3Cscript%3E', IDS, 'overview')).toBe('overview');
  });
  it('ignores case and surrounding spaces', () => {
    expect(parseTab('?tab=%20Battles%20', IDS, 'overview')).toBe('battles');
  });
  it('reads ?tab among other parameters and takes the first one', () => {
    expect(parseTab('?ref=share&tab=deck&tab=cards', IDS, 'overview')).toBe('deck');
  });
});

describe('withTab', () => {
  it('sets the tab', () => {
    expect(withTab('', 'battles', 'overview')).toBe('?tab=battles');
  });
  it('drops the parameter for the default tab', () => {
    expect(withTab('?tab=battles', 'overview', 'overview')).toBe('');
  });
  it('keeps other parameters', () => {
    expect(withTab('?ref=share&tab=deck', 'cards', 'overview')).toBe('?ref=share&tab=cards');
    expect(withTab('?ref=share&tab=deck', 'overview', 'overview')).toBe('?ref=share');
  });
});
```

Run: `npx vitest run src/app/ui/__tests__/tabs.test.ts`
Expected: FAIL, cannot resolve `../tabs`.

- [ ] **Step 2: Implement them**

Create `src/app/ui/tabs.ts`:

```ts
/**
 * The selected section of a player page lives in the URL (?tab=<id>), so it
 * can be linked, survives a reload and comes back with the back button.
 */

/** The tab named by `?tab=` in `search`, or `fallback` when it is missing or unknown. */
export function parseTab(search: string, validIds: readonly string[], fallback: string): string {
  const raw = new URLSearchParams(search).get('tab');
  const id = raw?.trim().toLowerCase();
  return id && validIds.includes(id) ? id : fallback;
}

/**
 * `search` with `?tab=` set to `id`; the default tab is written as no
 * parameter at all, so the plain player URL stays canonical. Other
 * parameters are kept. Returns '' or a string starting with '?'.
 */
export function withTab(search: string, id: string, defaultId: string): string {
  const params = new URLSearchParams(search);
  if (id === defaultId) params.delete('tab');
  else params.set('tab', id);
  const next = params.toString();
  return next ? `?${next}` : '';
}
```

Run: `npx vitest run src/app/ui/__tests__/tabs.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 3: Write the tab e2e**

Create `e2e/tabs.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const TABS = {
  'clash-royale': ['overview', 'cards', 'deck', 'battles', 'towers'],
  'brawl-stars': ['overview', 'brawlers', 'progression', 'battles', 'club'],
  'clash-of-clans': ['overview', 'army', 'heroes', 'achievements'],
} as const;

const player = (game: string, search = '') => `/game/${game}/player/${FIXTURE_TAG}${search}`;
const selected = (page: import('@playwright/test').Page) => page.getByRole('tab', { selected: true });

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

for (const [game, ids] of Object.entries(TABS)) {
  test(`${game}: every tab id opens from the URL and renders without errors`, async ({ page }) => {
    const problems = watch(page);
    for (const id of ids) {
      await page.goto(player(game, `?tab=${id}`));
      await expect(selected(page)).toHaveAttribute('id', `player-tab-${id}`);
      await expect(page.getByRole('tabpanel')).toBeVisible();
    }
    expect(problems).toEqual([]);
  });
}

test('selecting a tab updates the URL, survives a reload and comes back with Back', async ({ page }) => {
  await page.goto(player('clash-royale'));
  await expect(selected(page)).toHaveText('Overview');

  await page.getByRole('tab', { name: 'Battles' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles'));
  await expect(selected(page)).toHaveText('Battles');

  await page.reload();
  await expect(selected(page)).toHaveText('Battles');

  await page.getByRole('tab', { name: 'Deck' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=deck'));
  await page.goBack();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles'));
  await expect(selected(page)).toHaveText('Battles');

  await page.getByRole('tab', { name: 'Overview' }).click();
  await expect(page).toHaveURL(player('clash-royale'));
});

test('an unknown ?tab falls back to the first tab', async ({ page }) => {
  const problems = watch(page);
  await page.goto(player('brawl-stars', '?tab=definitely-not-a-tab'));
  await expect(selected(page)).toHaveText('Overview');
  await expect(page.getByRole('heading', { level: 1, name: 'Kitebreaker' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('arrow keys move between tabs without adding history entries', async ({ page }) => {
  await page.goto(player('clash-of-clans'));
  await expect(page.getByRole('heading', { level: 1, name: 'Harrow Keep' })).toBeVisible();
  await page.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Army' })).toBeFocused();
  await expect(page).toHaveURL(player('clash-of-clans', '?tab=army'));
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Achievements' })).toBeFocused();
  await expect(page).toHaveURL(player('clash-of-clans', '?tab=achievements'));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeFocused();
  await expect(page).toHaveURL(player('clash-of-clans'));
  const length = await page.evaluate(() => history.length);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test('"All battles" in the overview opens the Battles tab', async ({ page }) => {
  await page.goto(player('clash-royale'));
  await page.getByRole('button', { name: 'All battles' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles'));
});

test('the club tab explains a player without a club', async ({ page }) => {
  await page.goto(player('brawl-stars', '?tab=club'));
  await expect(page.getByTestId('empty-state').getByText('Not in a club')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('tabs scroll sideways inside their strip, the page does not, and every tab is 44px tall', async ({ page }) => {
    await page.goto(player('brawl-stars'));
    const list = page.getByRole('tablist');
    const { scrollWidth, clientWidth } = await list.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page.getByRole('tab'));

    await page.getByRole('tab', { name: 'Club' }).click();
    await expect(page).toHaveURL(player('brawl-stars', '?tab=club'));
    const box = await page.getByRole('tab', { name: 'Club' }).boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await expectNoHorizontalScroll(page);
  });
});
```

Run: `npm run build && npx playwright test e2e/tabs.spec.ts`
Expected: FAIL (no `role="tab"` elements with these names, no `?tab` handling).

- [ ] **Step 4: Create SectionTabs and the per-game tab table**

`src/app/ui/SectionTabs.tsx` (automatic activation; the key handler starts from the focused tab, not from the `active` prop, because a second key press can arrive before the URL change re-renders):

```tsx
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface TabDef {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SectionTabsProps {
  tabs: readonly TabDef[];
  active: string;
  /** `via` lets the caller replace history for keyboard moves and push it for clicks. */
  onSelect: (id: string, via: 'pointer' | 'keyboard') => void;
  /** Accessible name of the tablist. */
  label: string;
  /** Prefix for element ids: tabs are `${idPrefix}-tab-<id>`, the panel is `${idPrefix}-panel`. */
  idPrefix: string;
}

/**
 * WAI-ARIA tablist with automatic activation: arrows / Home / End move and
 * select, only the selected tab is in the Tab order. Scrolls sideways on
 * small screens and keeps the selected tab in view.
 */
export function SectionTabs({ tabs, active, onSelect, label, idPrefix }: SectionTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Start from the focused tab, not from `active`: a second key press can
    // arrive before the URL change has re-rendered this list.
    const focusedId = (e.target as HTMLElement).id;
    const focused = tabs.findIndex((t) => `${idPrefix}-tab-${t.id}` === focusedId);
    const index = focused >= 0 ? focused : tabs.findIndex((t) => t.id === active);
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(tabs[next].id, 'keyboard');
    listRef.current?.querySelector<HTMLElement>(`#${idPrefix}-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="no-scrollbar -mx-4 flex h-12 items-stretch gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id, 'pointer')}
            className={cx(
              'relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:size-4',
              'after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-pill',
              selected ? 'text-fg after:bg-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            {tab.icon && <span aria-hidden="true" className={selected ? 'text-accent' : undefined}>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

`src/app/pages/game/tabs.tsx`:

```tsx
import { Activity, Award, BarChart2, Castle, Flame, Hammer, Layers, Shield, Swords, Users } from 'lucide-react';
import type { TabDef } from '../../ui/SectionTabs';
import type { GameId } from './modules';

/**
 * Player-page sections per game. The ids are public: they appear in links as
 * ?tab=<id>, so never rename one. The first tab is the default.
 */
export const GAME_TABS: Record<GameId, readonly TabDef[]> = {
  'clash-royale': [
    { id: 'overview', label: 'Overview', icon: <Activity /> },
    { id: 'cards', label: 'Cards', icon: <Layers /> },
    { id: 'deck', label: 'Deck', icon: <Shield /> },
    { id: 'battles', label: 'Battles', icon: <Swords /> },
    { id: 'towers', label: 'Tower troops', icon: <Flame /> },
  ],
  'brawl-stars': [
    { id: 'overview', label: 'Overview', icon: <Activity /> },
    { id: 'brawlers', label: 'Brawlers', icon: <Users /> },
    { id: 'progression', label: 'Progression', icon: <BarChart2 /> },
    { id: 'battles', label: 'Battles', icon: <Swords /> },
    { id: 'club', label: 'Club', icon: <Shield /> },
  ],
  'clash-of-clans': [
    { id: 'overview', label: 'Overview', icon: <Activity /> },
    { id: 'army', label: 'Army', icon: <Hammer /> },
    { id: 'heroes', label: 'Heroes and equipment', icon: <Castle /> },
    { id: 'achievements', label: 'Achievements', icon: <Award /> },
  ],
};
```

- [ ] **Step 5: Export the Brawl Stars sections, remove the wrapper (CRLF-safe)**

`BSProfile.tsx` uses CRLF line endings; edit it with this script so they survive:

```bash
python3 - <<'PY'
p = 'src/app/components/BSProfile.tsx'
s = open(p, newline='').read()
assert '\r\n' in s
for name in ['BSHome', 'BSBrawlers', 'BSProgression', 'BSBattleLog', 'BSClub']:
    s = s.replace(f'\r\nconst {name} = (', f'\r\nexport const {name} = (', 1)
# The wrapper (props interface, TabType, BSProfile with its own tablist and blurred
# background) is replaced by the shell's SectionTabs.
s = s[:s.index('interface BSProfileProps {')].rstrip('\r\n') + '\r\n'
s = s.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion } from 'motion/react';")
s = s.replace('Shield, Home, Search,', 'Shield, Search,')
open(p, 'w', newline='').write(s)
PY
grep -c $'\r$' src/app/components/BSProfile.tsx; wc -l < src/app/components/BSProfile.tsx; grep -n '^export const' src/app/components/BSProfile.tsx
```

Expected: the two counts are equal (691), and five `export const` lines (22, 120, 339, 434, 577).

- [ ] **Step 6: Delete CRProfile and fix TrophyTrend's first frame**

Run: `git rm src/app/components/CRProfile.tsx`

In `src/app/components/TrophyTrend.tsx` (LF) change line 1 to

```tsx
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
```

and replace line 31 `  useEffect(() => {` with

```tsx
  // Layout effect: measure before the first paint, or the 720px default
  // overflows a phone screen for a frame.
  useLayoutEffect(() => {
```

(D11: the 720 px default width made 320/390 px pages scroll sideways for one frame.)

- [ ] **Step 7: Rewrite the module contract and the three modules**

`src/app/pages/game/types.ts`:

```ts
import type { GameTheme } from '../../data/games';
import type { PlayerStats } from '../../data/mockStats';

/** Props every per-game page module receives from GamePage. */
export interface GameModuleProps {
  game: GameTheme;
  playerStats: PlayerStats;
  /** Selected section id, already validated against GAME_TABS (pages/game/tabs.tsx). */
  tab: string;
  /** Switch section from inside the content (e.g. "All battles"). Pushes a history entry. */
  onTabChange: (id: string) => void;
}
```

`src/app/pages/game/OverviewExtras.tsx`:

```tsx
import { ArrowRight, Swords } from 'lucide-react';
import { MatchHistory } from '../../components/MatchHistory';
import { TrophyTrend } from '../../components/TrophyTrend';
import type { PlayerStats } from '../../data/mockStats';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';

interface OverviewExtrasProps {
  playerStats: PlayerStats;
  accent: string;
  chartColor: string;
  onShowBattles: () => void;
}

/** Bottom of the Clash Royale and Brawl Stars overview: trend left, latest battles right (stacked on phones). */
export function OverviewExtras({ playerStats, accent, chartColor, onShowBattles }: OverviewExtrasProps) {
  const latest = playerStats.recentMatches.slice(0, 5);
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        {playerStats.performanceData.length > 1 ? (
          <TrophyTrend data={playerStats.performanceData} accentColor={chartColor} />
        ) : (
          <EmptyState icon={<Swords />} title="No trophy trend yet">
            The trend needs at least two recent battles that moved trophies.
          </EmptyState>
        )}
      </div>
      <Card
        className="min-w-0"
        title="Latest battles"
        action={latest.length > 0 && (
          <Button variant="ghost" onClick={onShowBattles}>
            All battles
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      >
        {latest.length > 0 ? (
          <MatchHistory matches={latest} accentColor={accent} />
        ) : (
          <p className="text-sm text-fg-muted">No battles in the last few days.</p>
        )}
      </Card>
    </div>
  );
}
```

`src/app/pages/game/ClashRoyale.tsx`:

```tsx
import { Swords } from 'lucide-react';
import { CRCardsList } from '../../components/CRCardsList';
import { CRDeck } from '../../components/CRDeck';
import { CROverview } from '../../components/CROverview';
import { CRTowerTroops } from '../../components/CRTowerTroops';
import { MatchHistory } from '../../components/MatchHistory';
import { EmptyState } from '../../ui/EmptyState';
import { OverviewExtras } from './OverviewExtras';
import type { GameModuleProps } from './types';

/** Clash Royale sections: overview | cards | deck | battles | towers. The data components are restyled in phase 2. */
export default function ClashRoyale({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const cr = playerStats.gameVisuals?.cr;
  if (!cr) {
    return (
      <EmptyState icon={<Swords />} title="No Clash Royale profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }

  switch (tab) {
    case 'cards':
      return <CRCardsList cards={cr.cards} accent={game.accent} />;
    case 'deck':
      return <CRDeck playerStats={playerStats} accent={game.accent} />;
    case 'towers':
      return <CRTowerTroops playerStats={playerStats} accent={game.accent} />;
    case 'battles':
      return playerStats.recentMatches.length > 0 ? (
        <MatchHistory matches={playerStats.recentMatches} accentColor={game.accent} />
      ) : (
        <EmptyState icon={<Swords />} title="No recent battles">
          Battles from the last few days appear here once this player has played.
        </EmptyState>
      );
    default:
      return (
        <div className="space-y-8">
          {/* CROverview's "view deck" link still says 'deck'; older code said 'tower' for towers. */}
          <CROverview playerStats={playerStats} accent={game.accent} onTabChange={(id) => onTabChange(id === 'tower' ? 'towers' : id)} />
          <OverviewExtras playerStats={playerStats} accent={game.accent} chartColor={game.chartPrimary} onShowBattles={() => onTabChange('battles')} />
        </div>
      );
  }
}
```

`src/app/pages/game/BrawlStars.tsx` (the four StatCards that GamePage drew on the BS home tab become StatTiles; values pass through `stripEmoji`):

```tsx
import { Award, Clock, Shield, Target, Trophy } from 'lucide-react';
import { BSBattleLog, BSBrawlers, BSClub, BSHome, BSProgression } from '../../components/BSProfile';
import type { PlayerStats } from '../../data/mockStats';
import { EmptyState } from '../../ui/EmptyState';
import { StatTile } from '../../ui/StatTile';
import { stripEmoji } from '../../ui/text';
import { OverviewExtras } from './OverviewExtras';
import type { GameModuleProps } from './types';

/** The four headline numbers the old GamePage showed as StatCards, now StatTiles. */
function headlineStats(stats: PlayerStats) {
  const L = stats.statLabels ?? {};
  const wins = Math.round(stats.totalMatches * stats.winRate / 100);
  const kd = Number.isInteger(stats.kd) ? String(stats.kd) : stats.kd.toFixed(2);
  return [
    { label: L.stat1Title ?? 'Win rate', value: `${stats.winRate}%`, sub: L.stat1Sub ?? `${wins} wins`, icon: <Trophy /> },
    { label: L.stat2Title ?? 'K/D ratio', value: L.stat2Value ?? kd, sub: L.stat2Sub ?? 'Average per game', icon: <Target /> },
    { label: L.stat3Title ?? 'Total matches', value: L.stat3Value ?? stats.totalMatches.toLocaleString('en-US'), sub: L.stat3Sub ?? `${stats.hoursPlayed} hours`, icon: <Award /> },
    { label: L.stat4Title ?? 'Trophies', value: L.stat4Value ?? String(stats.hoursPlayed), sub: L.stat4Sub ?? '', icon: <Clock /> },
  ].map((s) => ({ ...s, value: stripEmoji(s.value), sub: stripEmoji(s.sub) }));
}

/** Brawl Stars sections: overview | brawlers | progression | battles | club. The data components are restyled in phase 3. */
export default function BrawlStars({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const bs = playerStats.gameVisuals?.bs;
  if (!bs) {
    return (
      <EmptyState icon={<Shield />} title="No Brawl Stars profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }
  // Every section takes the game accent now (it used to be the player's name colour, which could be unreadable).
  const accent = game.accent;

  switch (tab) {
    case 'brawlers':
      return <BSBrawlers playerStats={playerStats} accentColor={accent} />;
    case 'progression':
      return <BSProgression playerStats={playerStats} accentColor={accent} />;
    case 'battles':
      return <BSBattleLog playerStats={playerStats} accentColor={accent} />;
    case 'club':
      return bs.club ? (
        <BSClub playerStats={playerStats} accentColor={accent} />
      ) : (
        <EmptyState icon={<Shield />} title={bs.clubTag ? 'Club details are unavailable' : 'Not in a club'}>
          {bs.clubTag
            ? 'The club could not be loaded right now. Reload the page to try again.'
            : 'This player has not joined a club yet.'}
        </EmptyState>
      );
    default:
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {headlineStats(playerStats).map((s) => (
              <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub || undefined} icon={s.icon} />
            ))}
          </div>
          <BSHome playerStats={playerStats} accentColor={accent} />
          <OverviewExtras playerStats={playerStats} accent={accent} chartColor={game.chartPrimary} onShowBattles={() => onTabChange('battles')} />
        </div>
      );
  }
}
```

`src/app/pages/game/ClashOfClans.tsx`:

```tsx
import { Award } from 'lucide-react';
import { CoCAchievements } from '../../components/CoCAchievements';
import { CoCArmyDisplay } from '../../components/CoCArmyDisplay';
import { CoCHeroesDisplay } from '../../components/CoCHeroesDisplay';
import { CoCOverview } from '../../components/CoCOverview';
import { EmptyState } from '../../ui/EmptyState';
import type { GameModuleProps } from './types';

/** Clash of Clans sections: overview | army | heroes | achievements. The data components are restyled in phase 4. */
export default function ClashOfClans({ game, playerStats, tab }: GameModuleProps) {
  const coc = playerStats.gameVisuals?.coc;
  if (!coc) {
    return (
      <EmptyState icon={<Award />} title="No Clash of Clans profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }

  switch (tab) {
    case 'army':
      return (
        <CoCArmyDisplay
          troops={coc.troops}
          superTroops={coc.superTroops}
          builderBaseTroops={coc.builderBaseTroops}
          spells={coc.spells}
          siegeMachines={coc.siegeMachines}
          pets={coc.pets}
          accent={game.accent}
        />
      );
    case 'heroes':
      return (
        <CoCHeroesDisplay
          heroes={coc.heroes}
          heroEquipment={coc.heroEquipment}
          leagueName={coc.leagueName}
          leagueBadgeUrl={coc.leagueBadgeUrl}
          clanBadgeUrl={coc.clanBadgeUrl}
          accent={game.accent}
        />
      );
    case 'achievements':
      return coc.achievements && coc.achievements.length > 0 ? (
        <CoCAchievements achievements={coc.achievements} accent={game.accent} />
      ) : (
        <EmptyState icon={<Award />} title="No achievements in this answer">
          The API sent no achievement progress for this player.
        </EmptyState>
      );
    default:
      return <CoCOverview playerStats={playerStats} accent={game.accent} />;
  }
}
```

- [ ] **Step 8: Put the tabs and the panel into GamePage**

Edits to `src/app/pages/GamePage.tsx` (the Task 5 version):

1. `import { useNavigate, useParams } from 'react-router';` → `import { useLocation, useNavigate, useParams } from 'react-router';`
2. After `import { PanelSkeleton, PlayerPageSkeleton } from '../ui/Skeleton';` add `import { SectionTabs } from '../ui/SectionTabs';`; after `import { SiteFooter } from '../ui/SiteFooter';` add `import { parseTab, withTab } from '../ui/tabs';`; after `import { buildSummary } from './game/summary';` add `import { GAME_TABS } from './game/tabs';`.
3. After `const navigate = useNavigate();` add `const location = useLocation();`.
4. Immediately before `const removeRecent = (tag: string) => {` add:
   ```tsx
     const tabs = GAME_TABS[game.id as keyof typeof GAME_TABS];
     const defaultTab = tabs[0].id;
     const activeTab = parseTab(location.search, tabs.map((t) => t.id), defaultTab);
     // Clicks push a history entry (back returns to the previous section); arrow keys replace it.
     // Reads window.location, not the rendered `location`: two quick key presses
     // can arrive before the first URL change has re-rendered this component.
     const selectTab = (id: string, via: 'pointer' | 'keyboard' = 'pointer') => {
       const { pathname, search } = window.location;
       const next = withTab(search, id, defaultTab);
       if (next === search) return;
       navigate(pathname + next, { replace: via === 'keyboard' });
     };

   ```
5. Replace
   ```tsx
                   <div className="mt-6 space-y-10">
                     <Suspense fallback={<PanelSkeleton />}>
                       <GameModule game={game} playerStats={playerStats} />
                     </Suspense>
                   </div>
   ```
   with
   ```tsx
                   <div className="sticky top-(--header-h) z-20 mt-6 border-b border-line bg-canvas">
                     <SectionTabs
                       tabs={tabs}
                       active={activeTab}
                       onSelect={selectTab}
                       label={`${game.name} player sections`}
                       idPrefix="player"
                     />
                   </div>

                   <section
                     id="player-panel"
                     role="tabpanel"
                     aria-labelledby={`player-tab-${activeTab}`}
                     tabIndex={0}
                     className="pt-6 focus-visible:outline-offset-4"
                   >
                     <h2 className="sr-only">{tabs.find((t) => t.id === activeTab)?.label}</h2>
                     <Suspense fallback={<PanelSkeleton />}>
                       <GameModule game={game} playerStats={playerStats} tab={activeTab} onTabChange={(id) => selectTab(id)} />
                     </Suspense>
                   </section>
   ```

- [ ] **Step 9: Run everything, then stress the tab tests**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green; budget `playerPageJs ≈ 153.8`, `css ≈ 12.49`.

Run: `npx playwright test e2e/tabs.spec.ts --repeat-each 8 --workers 6`
Expected: all passed (this is what exposed the stale-URL and TrophyTrend races; any flake here is a real bug, not a test to loosen).

- [ ] **Step 10: Commit**

```bash
git add src/app e2e/tabs.spec.ts
git commit -m "feat(game): section tabs in the URL for all three games

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Sticky condensed summary

**Files:**
- Modify: `src/app/ui/PlayerSummaryBar.tsx` (append), `src/app/pages/GamePage.tsx`
- Create: `e2e/sticky.spec.ts`

**Interfaces:**
- Consumes: `AppHeader` props `title?: ReactNode`, `compactNav?: boolean` (Task 5); `PlayerSummary` (Task 5); `PanelSkeleton`'s `data-testid="panel-skeleton"` (Task 2).
- Produces: `PlayerSummaryCompact({summary})` with `data-testid="player-summary-compact"` (`ui/PlayerSummaryBar.tsx`); header shows it while the hero is scrolled under the header.

- [ ] **Step 1: Write the failing e2e**

Create `e2e/sticky.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';
import type { Page } from '@playwright/test';

/** Scroll to the bottom once the game module has replaced its skeleton (before that the page is short). */
async function scrollToBottom(page: Page) {
  await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    test('header and tabs stay on screen and the header condenses the player after the hero', async ({ page }) => {
      await mockApi(page);
      await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Kitebreaker' })).toBeVisible();
      await expect(page.getByTestId('player-summary-compact')).toHaveCount(0);

      await scrollToBottom(page);
      const compact = page.getByTestId('player-summary-compact');
      await expect(compact).toBeVisible();
      await expect(compact).toContainText('Kitebreaker');
      await expect(compact).toContainText('41,234');

      expect((await page.locator('header').boundingBox())!.y).toBe(0);
      const tabs = (await page.getByRole('tablist').boundingBox())!;
      expect(Math.round(tabs.y)).toBe(56);
      await expectNoHorizontalScroll(page);

      if (viewport.width < 640) {
        // On phones the switcher gives its room to the condensed player.
        await expect(page.getByRole('navigation', { name: 'Switch game' })).toBeHidden();
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(compact).toHaveCount(0);
    });

    test('switching tab while scrolled keeps the tab strip in place', async ({ page }) => {
      await mockApi(page);
      await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Vela Storm' })).toBeVisible();
      await scrollToBottom(page);
      await expect(page.getByTestId('player-summary-compact')).toBeVisible();
      await page.getByRole('tab', { name: 'Battles' }).click();
      await expect(page.getByRole('tab', { name: 'Battles' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tab', { name: 'Battles' })).toBeInViewport();
    });
  });
}
```

Run: `npm run build && npx playwright test e2e/sticky.spec.ts`
Expected: FAIL at `getByTestId('player-summary-compact')` (not rendered yet).

- [ ] **Step 2: Add the compact identity**

Append to `src/app/ui/PlayerSummaryBar.tsx`:

```tsx

/** The condensed identity the header shows once the hero has scrolled away. */
export function PlayerSummaryCompact({ summary }: { summary: PlayerSummary }) {
  return (
    <div data-testid="player-summary-compact" className="flex min-w-0 items-center gap-2 pl-1">
      <span className="truncate text-sm font-semibold text-fg">{summary.name}</span>
      {summary.trophies !== undefined && (
        <span className="inline-flex shrink-0 items-center gap-1 text-sm text-fg-muted tabular-nums">
          <Trophy aria-hidden="true" className="size-3.5 text-accent" />
          {summary.trophies.toLocaleString('en-US')}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Observe the hero in GamePage**

Edits to `src/app/pages/GamePage.tsx`:

1. `import { PlayerSummaryBar } from '../ui/PlayerSummaryBar';` → `import { PlayerSummaryBar, PlayerSummaryCompact } from '../ui/PlayerSummaryBar';`
2. Before the comment `// Only the most recent search may write its result …` add:
   ```tsx
     // The hero has scrolled under the header: the header shows the condensed player instead.
     const [condensed, setCondensed] = useState(false);
     const heroRef = useRef<HTMLDivElement>(null);
   ```
3. Before the comment `// Per-page document title` add:
   ```tsx
     // Watch the hero rather than listening to scroll events (no work per scrolled pixel).
     const hasPlayer = Boolean(urlTag && result?.data);
     useEffect(() => {
       const hero = heroRef.current;
       if (!hasPlayer || !hero) {
         setCondensed(false);
         return;
       }
       const headerHeight = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3.5; // --header-h
       const observer = new IntersectionObserver(
         ([entry]) => setCondensed(!entry.isIntersecting),
         { rootMargin: `-${headerHeight}px 0px 0px 0px` },
       );
       observer.observe(hero);
       return () => observer.disconnect();
     }, [hasPlayer]);

   ```
4. In `<AppHeader`, after `game={game}` add:
   ```tsx
           title={condensed && summary ? <PlayerSummaryCompact summary={summary} /> : undefined}
           compactNav={condensed && Boolean(summary)}
   ```
5. Wrap the `<PlayerSummaryBar … />` element (with its `meta`) in `<div ref={heroRef}> … </div>` (re-indent its lines by two spaces).

- [ ] **Step 4: Run and stress**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green; budget `playerPageJs ≈ 154.1`, `css ≈ 12.5`.

Run: `npx playwright test --repeat-each 3 --workers 6`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/ui/PlayerSummaryBar.tsx src/app/pages/GamePage.tsx e2e/sticky.spec.ts
git commit -m "feat(game): condensed player identity in the sticky header

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Review screenshots

**Files:**
- Create: `scripts/screenshots.mjs`, `docs/screenshots/phase1/{home,clash-royale,brawl-stars,clash-of-clans}-{390,768,1440}.png`
- Modify: `package.json` (`scripts`)

**Interfaces:**
- Consumes: `mockApi`, `FIXTURE_TAG` from `e2e/support/mockApi.ts` (Task 3, imported with the `.ts` extension under Node's type stripping); `data-testid="player-summary"` (Task 5); `dist/` from `npm run build`.
- Produces: `npm run screenshots` → 12 PNGs in `docs/screenshots/phase1/` (override with `SCREENSHOT_PHASE=phase2` in later phases); `BASE_URL` to shoot production; `E2E_*_TAG` to use live players.

- [ ] **Step 1: Write the script**

Create `scripts/screenshots.mjs` (starts `vite preview` with node directly so it can be stopped; polls until the server answers):

```js
#!/usr/bin/env node
/**
 * Review screenshots (restyle spec, "Acceptance"): Home and one player page
 * per game at 390, 768 and 1440 px, written to docs/screenshots/<phase>/.
 *
 *   npm run build && npm run screenshots              # fixtures, local preview
 *   E2E_CR_TAG=... E2E_BS_TAG=... E2E_COC_TAG=... npm run screenshots
 *                                                     # real players via the preview's API proxy
 *   BASE_URL=https://supercellstats.com npm run screenshots   # production
 *
 * Player pages use the e2e fixtures (e2e/support/) unless the game's E2E_*_TAG
 * is set. Real tags are read from the environment only, never written to disk.
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { FIXTURE_TAG, mockApi } from '../e2e/support/mockApi.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.env.SCREENSHOT_PHASE ?? 'phase1';
const OUT = path.join(ROOT, 'docs/screenshots', PHASE);
const WIDTHS = [390, 768, 1440];
const PORT = 4173;

const PAGES = [
  { name: 'home', path: () => '/' },
  { name: 'clash-royale', game: 'clash-royale', env: 'E2E_CR_TAG' },
  { name: 'brawl-stars', game: 'brawl-stars', env: 'E2E_BS_TAG' },
  { name: 'clash-of-clans', game: 'clash-of-clans', env: 'E2E_COC_TAG' },
];

/** `vite preview` on the built dist/, run with node directly so kill() really stops it. */
async function startPreview() {
  const vite = path.join(ROOT, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`vite preview exited with ${child.exitCode} (is port ${PORT} busy?)`);
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) return child;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill();
  throw new Error('vite preview did not start within 30s');
}

const base = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const preview = process.env.BASE_URL ? null : await startPreview();
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

try {
  for (const entry of PAGES) {
    const realTag = entry.env ? process.env[entry.env]?.replace(/^#/, '') : undefined;
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce' });
      if (entry.game && !realTag) await mockApi(page);
      const url = entry.game ? `/game/${entry.game}/player/${encodeURIComponent(realTag ?? FIXTURE_TAG)}` : entry.path();
      await page.goto(base + url, { waitUntil: 'networkidle' });
      if (entry.game) await page.getByTestId('player-summary').waitFor({ timeout: 15000 });
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(OUT, `${entry.name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`wrote ${path.relative(ROOT, file)}${entry.game ? (realTag ? ' (live data)' : ' (fixtures)') : ''}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  preview?.kill();
}
```

In `package.json` `scripts`, after `"e2e": "playwright test"` add:

```json
    "screenshots": "node scripts/screenshots.mjs"
```

- [ ] **Step 2: Produce the screenshots**

Run: `npm run build && npm run screenshots`
Expected: 12 `wrote docs/screenshots/phase1/…png` lines, player pages marked `(fixtures)`; no process left listening on port 4173 afterwards (`ss -ltn | grep 4173` prints nothing).

Optional, with real players (tags from the environment only): `E2E_CR_TAG=… E2E_BS_TAG=… E2E_COC_TAG=… npm run screenshots` (marked `(live data)`). Do not commit live-data screenshots if the owner prefers fixtures; never write the tags anywhere.

- [ ] **Step 3: Look at every screenshot**

Open all 12 PNGs (Read tool / image viewer). Check and fix before committing:
- 390: header in one row, switcher pills + search icon visible, summary trophies not clipped, tab strip one row scrolling sideways, no text dimmer than white/60, no emoji in header/summary/tabs/footer.
- 768: game cards stacked on Home, header search visible inline.
- 1440: three Home cards in a row with equal heights, content capped at `max-w-6xl`, overview ends with the two-column trend | latest battles row (CR, BS).
- Everywhere: one accent per page (CR blue, BS yellow, CoC green), 12 px card radius, hairline borders, nothing overlapping.
Write the observations (one line per page) for the PR description.

- [ ] **Step 4: Commit**

```bash
git add scripts/screenshots.mjs package.json docs/screenshots/phase1
git commit -m "docs: phase 1 review screenshots and the script that makes them

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Final verification and hand-off

**Files:**
- Modify: none expected (fixes found here go into the file they concern, with a test).

**Interfaces:**
- Consumes: everything above.
- Produces: a branch ready for PR: green gate, budget table, screenshots, PR description text (not pushed by this plan).

- [ ] **Step 1: Clean full gate**

Run: `rm -rf dist test-results && npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green; unit tests 55 passed (5 files); e2e 42 passed / 6 skipped (the env-gated real-player tests), 48 tests in 6 files.

- [ ] **Step 2: Real players, if the owner provides tags**

Run (tags from the environment, never typed into a file): `E2E_CR_TAG=… E2E_BS_TAG=… E2E_COC_TAG=… npm run e2e`
Expected: the six `… a real player renders …` tests pass through the preview's production API proxy.

- [ ] **Step 3: Contract checks**

Run each and confirm the expected output:
- `git diff main --stat -- src/app/routes.ts src/app/services src/app/data/mockStats.ts docs/caddy-tail.caddy index.html` → empty (routes, data layer, CSP, preloads untouched).
- `git diff main -- package.json | grep '^[+-] *"' ` → only `-"tw-animate-css"` and `+"screenshots"`.
- `grep -rnE "#[0-9A-Fa-f]{6}\b" src/app/ui src/app/pages --include=*.tsx` → nothing (no raw hex in the shell; colours come from tokens or `game.accent`).
- `grep -rnP "\p{Extended_Pictographic}" src/app/ui src/app/pages --include=*.tsx` → nothing (the only emoji live in `ui/text.ts` comments and its test data).
- `grep -rnE "text-white/(1|2|3|4|5)[0-9]?\b" src/app/ui src/app/pages` → nothing (contrast floor).
- `for f in src/app/components/BSProfile.tsx; do echo $(grep -c $'\r$' $f) $(wc -l < $f); done` → two equal numbers.

- [ ] **Step 4: Budget summary for the PR**

Run: `npm run build | sed -n '/performance budget/,$p'`
Copy the table into the PR description with the phase-start numbers next to it. Expected order of magnitude (measured while writing this plan): initialJs 123.4, playerPageJs 154.1, entryJs 6.7, css 12.5, fonts 48.3, all within the 5 % phase cap.

- [ ] **Step 5: Write the PR description (do not push)**

Prepare the text: summary of the 9 commits, the budget table, the screenshot observations from Task 8, the Plan decisions that change visible behaviour (D3, D5, D6, D7, D9, D13), and the post-deploy checklist from the spec's Acceptance section: `E2E_BASE_URL=https://supercellstats.com npm run e2e` with the three tags, Lighthouse mobile on `/` and the three `/game/<id>` pages (performance ≥ 90, a11y/best-practices/SEO 100, CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s; re-run once before treating a miss as real). Pushing, opening the PR and deploying follow the owner's usual flow (`superpowers:finishing-a-development-branch`).

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Tokens in `theme.css` as CSS variables exposed via `@theme`, shadcn defaults removed | 2 |
| Surfaces / text / per-game accent via `data-game` / semantic colours | 2 (tokens), 3 (Home cards), 5 (page root) |
| Type: Inter everywhere, Clash for wordmark + h1, 12/14/16/20/28/40, tabular-nums, clamp() big numbers | 2 (`text-title`, `text-display`, `text-stat`), 3, 5 |
| Radius 12 / 999, 4-pt grid, one shadow level, hairline borders | 2 |
| Icons: lucide only, no emoji in chrome | 2 (404), 3 (Home), 5 (`stripEmoji`, Avatar fallbacks), e2e `expectNoEmoji` |
| Motion 150–200 ms, reduced motion, no blur blobs | 2 (`theme.css` media query, `motion-safe:`), 3/5 (glows and blur backgrounds removed), 6 (BSProfile/CRProfile blurred wrappers removed) |
| `AppHeader` (back, search, game switcher), sticky | 5, 7 |
| `SearchBox` (validation message, `/` shortcut, recent searches) | 3, 5 |
| `PlayerSummaryBar` + condensed sticky bar after the hero | 5, 7 |
| `SectionTabs` (tablist, arrows, mobile scroll, state in URL, default first, invalid falls back) | 6 |
| `Card`, `StatTile`, `Row`, `Pill` | 2 (used: Card in 6, StatTile in 6, Row in 5, Pill in 5) |
| `Skeleton`, `EmptyState`, `ErrorState`; retry uses URL tag | 2, 5 |
| `GamePage` = routing + data + shell; per-game modules wired to existing contents | 4, 5, 6 |
| Home: shorter hero, three cards with inline search and accent, recent searches row, footer; feature chips removed | 3 |
| Player page desktop two columns / mobile one column | 6 (overview row, D16) |
| Tab ids per game, battles promoted to its own tab (filters later) | 6 (D7) |
| Every async region: skeleton, empty, error with real reason | 5 (player data), 6 (module chunk `PanelSkeleton`, empty battles/club/achievements) |
| Routes unchanged, `%23TAG`, `?tab` additive | Global Constraints; 5/6 e2e; smoke tests kept |
| CSP unchanged, fonts self-hosted | Global Constraints; 9 Step 3 |
| Performance budget file + check, first task, failing-first | 1 |
| Per-phase growth ≤ 5 % | 1 (`maxPhaseGrowth`, D1) |
| Heavy assets lazy, route-level splitting kept, per-game module only on its route | 4 |
| Data layer not modified | Global Constraints; 9 Step 3 |
| Acceptance: lint/typecheck/test/build green | every task |
| Acceptance: e2e tab URL + reload/back, `/` focuses search, no console errors, no failed requests | 3, 5, 6 (`watch`) |
| Acceptance: screenshots 390/768/1440 of Home + one player page per game, looked at | 8 |
| Acceptance: 44 px targets, keyboard + focus ring, no h-scroll at 320 px | 2–7 e2e (`expectTouchTargets`, `expectNoHorizontalScroll`, keyboard tab test), Visual rules |
| Acceptance: Lighthouse / prod e2e after deploy | 9 Step 5 (post-deploy checklist) |

Placeholder scan: no "TBD"/"TODO"/"similar to Task N"; every code step has the full code or an exact old → new edit. Type consistency checked: `GameModuleProps` (Task 4 → 6), `SearchBoxProps` (3 → 5), `PlayerSummary` (5 → 7), `TabDef` (6), `GAME_MODULES`/`GameId` (4 → 6), test ids `player-skeleton`, `panel-skeleton`, `empty-state`, `error-state`, `player-summary`, `player-summary-compact` match between components and specs.
