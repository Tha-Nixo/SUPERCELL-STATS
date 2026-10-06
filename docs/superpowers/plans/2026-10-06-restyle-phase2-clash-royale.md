# SupercellStats Restyle, Phase 2 (Clash Royale) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every Clash Royale player section (overview, cards, deck, battles, tower troops) onto the Phase 1 design system, and turn the Battles tab into a filterable list (mode × win/loss/draw) whose filters live in the URL, closing the CR items Phase 1 deferred.

**Architecture:** The five CR data components in `src/app/components/` are rewritten in place on the `src/app/ui/` primitives (Card, StatTile, Row, Pill, EmptyState) plus two new ones: `GameImage` (third-party art with a fallback chain) and `FilterGroup` (native radio group styled as pills). Filter logic is pure and lives in `src/app/ui/battleFilters.ts` (URL parse/write, mode list, facet counts, filtering), unit tested in Vitest's node environment; `pages/game/BattlesPanel.tsx` wires it to react-router; the shell (`GamePage.tsx`) learns to drop the filter parameters when the tab changes and to keep them in "Copy link". Behaviour is tested with Playwright against `vite preview` with fixtures served by `page.route`.

**Tech Stack:** React 18, react-router 7, Vite 7, Tailwind CSS 4.3 (`@tailwindcss/vite`, `starting:` variant), lucide-react 0.487, TypeScript 5.9 (strict, `noUnusedLocals`), Vitest 5 (node env, no jsdom), Playwright 1.63 (Chromium), Node ≥ 22.18 for `scripts/screenshots.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-06-restyle-design.md` (Phase 2 = "Clash Royale profile restyle + battles tab with filters"). Read it, then the Phase 1 plan's Global Constraints, Visual rules and decisions D1–D20 in `docs/superpowers/plans/2026-10-06-restyle-phase1-foundation.md`; they still apply. Deferred items carried here come from `.superpowers/sdd/2026-10-06-restyle-phase1-foundation/progress.md`.

**How this plan was checked:** every code block below was applied, task by task, to a throw-away copy of `main` at `59b471a` (`git archive`), and after each task `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (budget check) and `npm run e2e` were green; the new e2e specs were also run with `--workers=6 --repeat-each=2` without a flake, and the restyled CR page was loaded once against the live API with a real ranked player (tag from the environment only). Numbers quoted (test counts, budget lines) are the ones that run measured.

## Global Constraints

- Routes are unchanged: `/`, `/game/:gameId`, `/game/:gameId/player/:tag` (bare tag; `%23TAG` keeps working). `?tab=` is additive and so are the new `?mode=` and `?result=`. `src/app/routes.ts` is not edited.
- Production CSP (`docs/caddy-tail.caddy`) is unchanged: no new third-party origin, no inline script, fonts self-hosted. Game art keeps using only the hosts already in `img-src` (`api-assets.clashroyale.com`, `royaleapi.github.io`, `cdn.brawlify.com`, `cdn-old.brawlify.com`, `api-assets.clashofclans.com`). Inline `style=""` stays allowed; never add `<script>`.
- No new runtime dependency over 5 KB gzip. This plan adds **no** dependency.
- Performance budget (spec, "Performance budget"), enforced by `npm run build`: initial JS on `/` ≤ **135 KB**, JS to render a player page ≤ **180 KB**, entry chunk ≤ **8 KB**, CSS ≤ **16 KB**, preloaded fonts ≤ **50 KB** with no extra font file on the critical path; per-phase growth ≤ **5 %** on each line versus the phase start (entry chunk exempt, Phase 1 D1). Phase 2 start and caps are set in Task 1. Anything above must be paid for in the same task.
- Lab Web Vitals on production after deploy: CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s (re-run once before treating a miss as real), Lighthouse performance ≥ 90, accessibility/best practices/SEO 100.
- Visual effects budget: no `filter: blur()` / `backdrop-filter` on large areas, no animated gradients, at most one continuously running animation on screen. Motion is 150–200 ms opacity/transform only and is disabled under `prefers-reduced-motion` (the global rule in `theme.css`).
- Accessibility: WCAG AA; **no text dimmer than white/60** (`text-fg-subtle` is the floor; never `text-white/40`…`/55`); every interactive element ≥ 44 px tall on mobile; all controls keyboard reachable with a visible focus ring; no emoji in UI chrome (lucide icons, imported one by one).
- Components use tokens (`bg-surface-1`, `text-fg-muted`, `border-line`, `bg-accent`, `rounded-card`…), never raw hex, never `bg-white/x`/`bg-black/x`. Cards have radius 12 (`rounded-card`), one accent per page, no all-caps tracked eyebrow labels, no gradients as decoration. The `accent` Pill tone (accent text on its tint) is used **only on `surface-1`** (4.56:1); on `surface-2` or on an accent-tinted area use the new `solid` tone (5.98:1).
- Tailwind scans `.ts`/`.tsx` **including comments**: do not write bare utility-like words (`shadow`, `outline`, `hidden`, `blur`…) in comments; every stray class costs CSS budget.
- Line endings: preserve each file's style. CRLF files touched by this plan: `src/app/components/CRCardsList.tsx`, `src/app/components/CRDeck.tsx`, `src/app/services/supercellService.ts`. Every other touched or new file is LF. A Python/`sed` rewrite in text mode silently converts CRLF to LF: after editing a CRLF file run `perl -pi -e 's/\r?\n/\r\n/' <file>` and check that `grep -c $'\r$' <file>` equals `wc -l < <file>`.
- Data layer untouched except bugs found while restyling: `src/app/services/supercellService.ts` changes only for the bug in Task 7 (listed in Plan decisions D23); `gameApiRouter.ts`, `recentSearches.ts`, `apiKeys.ts`, `src/app/data/mockStats.ts` are not modified.
- Scope: Phase 2 only. Brawl Stars and Clash of Clans components are not restyled; they change only where they share a component with CR (`MatchHistory`, `TrophyTrend`, `OverviewExtras`, `Pill`, `SectionTabs`), see D28.
- Real player tags appear only through `E2E_CR_TAG`, `E2E_BS_TAG`, `E2E_COC_TAG`; never in a committed file (screenshots of live data show the tag: never commit them). Fixtures use the invented tag `#PYLQGRJC`.
- Every commit leaves `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` green, and the site deployable.
- Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Copy: sentence case, plain verbs, no em dash (`—`) in new UI strings, no exclamation marks; empty states say why and what to do.

---

## File Structure

New shared UI (`src/app/ui/`):

| File | Responsibility |
|---|---|
| `GameImage.tsx` | third-party game art (`sources[]` tried in order) with a same-size lucide fallback; never shifts layout |
| `FilterGroup.tsx` | one single-choice filter: `<fieldset>` + native radios rendered as 44 px pills with counts |
| `battleFilters.ts` | pure Battles filter logic: `modeSlug`, `battleModes`, `resultCounts`, `parseBattleFilters`, `withBattleFilters`, `filterBattles`, `BATTLE_FILTER_PARAMS` |
| `__tests__/battleFilters.test.ts` | Vitest for the above |

Modified shared UI: `Pill.tsx` (`solid` tone), `text.ts` (`sentenceCase`), `tabs.ts` (`withTab(…, drop)`, `shareSearch`), `SectionTabs.tsx` (`TabDef.count`).

Clash Royale (`src/app/components/`), each rewritten in place:

| File | Responsibility after this phase |
|---|---|
| `CROverview.tsx` | stat tiles (win rate, battles, three-crown wins, best trophies), clan, deck preview, ranked seasons (only when there is data), collapsible badges, achievements |
| `crFacts.ts` (+ `__tests__/crFacts.test.ts`) | numbers read back from the mapper's display strings, in one tested place |
| `CRCardsList.tsx` (CRLF) | collection with search / rarity / sort, empty result state |
| `CRDeck.tsx` (CRLF) | deck numbers, eight cards, tower troop, favourite card, empty state |
| `CRTowerTroops.tsx` | tower troops grid, equipped one marked, empty state |
| `MatchHistory.tsx` | battle rows (result pill, mode, date, crowns, trophy change), shared with BS overview |
| `TrophyTrend.tsx` | same chart, tokens instead of hex and sub-floor text |

Pages (`src/app/pages/`): `game/BattlesPanel.tsx` (new: Battles tab, filters in the URL), `game/ClashRoyale.tsx`, `game/tabs.tsx` (`TabId<G>`, `tabCounts`), `game/OverviewExtras.tsx`, `game/BrawlStars.tsx` (one prop removed), `GamePage.tsx` (tab counts, filter params on tab change and in Copy link).

Data layer bug fix: `src/app/services/supercellService.ts` (`prettyMode` per game) + its test.

Tests and tooling: `src/styles/__tests__/contrast.test.ts`, `src/app/pages/game/__tests__/tabs.test.ts`, `e2e/{cr-panels,battles,battle-rows}.spec.ts` (new), `e2e/{tabs,watch,overflow,cls}.spec.ts`, `e2e/support/{helpers,mockApi,fixtures}.ts`, `scripts/bundle-budget.json`, `scripts/screenshots.mjs`, `docs/screenshots/phase2/*.png`.

## Plan decisions

Numbered after Phase 1 (D1–D20). Each line: decision · why · cost if wrong.

- **D21. Phase 2 budget start = the numbers measured on `main` at `59b471a`:** `initialJs 123.64`, `playerPageJs 155.07`, `entryJs 6.92`, `css 12.54`, `fonts 48.26` (same method as Phase 1 D2). Phase caps (×1.05, capped by the absolute line): initialJs **129.82**, playerPageJs **162.82**, css **13.17**, fonts **50** (absolute wins), entryJs **8** (exempt). Measured end of phase: 123.64 / 155.86 / 6.91 / 11.68 / 48.26, all inside; CSS goes *down* because the CR components lose their one-off arbitrary classes. · Spec rule 2 says "versus the previous phase"; Phase 1 ended at these numbers. · If the owner wanted the Phase 1 start kept, the caps would only be looser; nothing breaks.
- **D22. `playerPageJs` is the maximum over the three game modules; Brawl Stars (155.86) stays the heaviest.** The CR variant ends at 151.20 (start 151.03): the CR chunk barely grows because the rewritten components are shorter than the old ones. What grows is the shared `GamePage` chunk (+0.6 KB: `battleFilters`, `tabCounts`, `shareSearch`). If a task pushes a line over its cap, cut in this order: the `sentenceCase` calls (show raw rarity), the ranked-seasons card, the badges grid (keep the count only). · Keeps CR inside its growth without touching BS. · None measured.
- **D23. Data-layer bug fixed: `prettyMode` mapped the battle type `unknown` to "Brawl Hockey" for both games.** It is a Brawl Stars alias; a Clash Royale battle reported as `unknown` would appear as "Brawl Hockey", and would now become a "Brawl Hockey" option in the CR mode filter. `prettyMode(raw, game)` gets a per-game alias table (CR `unknown` → "Special event") and is exported for its unit test. · Spec allows data-layer changes for bugs found while restyling. · Whether CR really sends `unknown` today is not proven by the live sample (30 battles, all `pathOfLegend`); the fix is harmless either way.
- **D24. Filters are native radio groups (`<fieldset>` + `<legend>` + `<input type="radio" class="peer sr-only">` inside a pill `<label>`), not toggle buttons with `aria-pressed`.** Each group is single choice ("All / Wins / Losses / Draws"), which is exactly radio semantics; the browser gives Tab-into-checked-option and arrow-key selection for free, screen readers announce "radio, 2 of 4, checked", no custom keyboard code. `aria-pressed` toggles imply independent on/off states and would need roving tabindex by hand. · Arrow keys select immediately (each step updates the URL with `replace`, no history spam).
- **D25. URL contract:** `?mode=<slug>&result=<win|loss|draw>`, both optional, written only when not "all"; matched case-insensitively; an unknown/empty value (or a mode this player has no battle in) falls back to "all" **without rewriting the URL** (Phase 1 D8 rule for `?tab`). Filter changes `navigate(…, { replace: true })`, so Back leaves the tab instead of undoing filters. Interaction with `?tab=`/`withTab`: `GamePage.selectTab` now (a) does nothing when the requested tab is already selected (clicking Battles keeps its filters) and (b) calls `withTab(search, id, default, BATTLE_FILTER_PARAMS)`, which drops `mode`/`result` whenever the tab changes; other parameters and the hash are kept. Back after leaving Battles restores the filtered URL. "Copy link" uses `shareSearch()`: the tab first, then `mode`/`result` if present, nothing else. Filters on a non-Battles tab (hand-written URL) are ignored and not rewritten. · Cheap (pure functions + 4 lines in GamePage), linkable, reload-safe. · Back cannot step through filter changes.
- **D26. Facet counts:** result counts are computed within the selected mode, mode counts within the selected result; an option with 0 stays listed and selectable (it leads to the empty state). · Counts answer "what will I get if I click this"; options never appear/disappear while filtering, so the filter card never changes size (no layout shift). · None.
- **D27. The mode group is shown only when the player's recent battles have at least 2 modes;** the result group is always shown when there are battles; with no battles the tab shows the "No recent battles" empty state and no filters. · The live sample player has 30/30 Path of Legend battles: a one-option mode filter is noise. · None.
- **D28. `MatchHistory` and `TrophyTrend` are restyled here although Brawl Stars' overview also uses them (via `OverviewExtras`).** They are on the CR overview and battles tab; restyling them once fixes the Loss pill contrast (4.18:1 → 5.47:1 with `Pill tone="loss"` on surface-1) and the sub-floor text (`white/40`, `/45`, `/50`) for both games. The `motion` entrance animation (300 ms + stagger, replayed on every filter change) is removed; `accentColor`/`accent` props that only fed it are removed from `MatchHistory` and `OverviewExtras`. Duration (BS) moves next to the date. · One battle-row design across games. · BS overview looks slightly different before Phase 3; BS screenshots are regenerated in Task 10.
- **D29. Game art goes through `GameImage`:** sources tried in order (`onError` → next), then a lucide icon in a box of the same intrinsic size (`aspect-ratio`), so nothing shifts. The old `insertAdjacentHTML('…🛡️…')`/`🏅` fallbacks go. The e2e `watch()` now tolerates the browser's "Failed to load resource: 404" console line **only** for images on the game-art hosts (`ART_HOSTS`), matched by URL like the existing document-404 rule; a 404 on our own `/images/…` still fails. `mockApi({ brokenArt: /./ })` proves every CR tab falls back without a counted error. · Chromium always logs image 404s; CDNs miss new art; the app has a fallback for every slot. · A real missing *own* image is still caught.
- **D30. Rarity is plain text ("Rare · Level 14"), not a colour.** · Spec: one accent per page, tokens only; five rarity colours would need five tokens or raw palette classes. · Less game flavour; can be added later as tokens if the owner asks.
- **D31. Overview fixes:** the duplicate identity card under the hero (name, rank, level, trophies, arena) is removed (the summary bar already shows name, tag, league, level, trophies); its unique facts move to stat tiles (best trophies with the arena name as sub-line). The "Ranked seasons" card renders only when a season row exists (the mapper always creates `pathOfLegend`/`leagueStatistics` objects, which is why it rendered empty); no EmptyState for it (absence of ranked play is not an error). The clan box keys on `clanTag` (the mapper writes "No Clan · Member" for clanless players, which the old box showed as a clan name). · Spec "data first" without repetition. · None.
- **D32. The badges panel opens with a real CSS transition:** `transition duration-200 ease-out-quick starting:opacity-0 starting:-translate-y-1` (Tailwind's `starting:` = `@starting-style`), replacing the inert `animate-in fade-in slide-in-from-top-2 duration-200` left by Phase 1 D3. Reduced motion is honoured by the global `theme.css` rule. · Opacity/transform only, 200 ms, no keyframes, no JS. · Browsers without `@starting-style` (Firefox < 129, Safari < 17.5) show the panel instantly, which is acceptable.
- **D33. `crFacts()` reads wins/losses, three-crown wins, best trophies, donations, war day wins and the clan back from the mapper's display strings** (`"4,210 wins · 3,388 losses"`, `"1,530 <crown emoji>"`, `"Best: 9,301"`) with a separator-agnostic `parseCount` (digits only). · The data layer is frozen; the old JSX split those strings inline and printed the emoji. · If the mapper's wording changes, `crFacts.test.ts` and the overview e2e fail loudly.
- **D34. Tab ids become a type: `GAME_TABS` is `as const satisfies Record<GameId, readonly TabDef[]>` and `TabId<G>` is exported.** `ClashRoyale.tsx` switches on `tab as TabId<'clash-royale'>` and navigates through `go(id: CRTab)`, so `'tower'` (the Phase 1 shim) or any misspelling is a type error. `GameModuleProps.tab` stays `string` (validated by `parseTab` in the shell; the module casts once). · The deferred item asked "if cheap": it is 3 lines. · None.
- **D35. The Cards tab shows `8/121` after its label** (subtle, `tabular-nums`, part of the accessible name "Cards 8/121"), from the mapper's `Cards Found` extra stat via `tabCounts()`; without the card catalogue it shows the found count alone. No parentheses: the count is visually separated by colour and weight. · Regains the Phase 1 deferred "(x/y)" count in the new style. · Reviewers may prefer parentheses: one-character change in `SectionTabs`.
- **D36. `Pill` gets a `solid` tone (`bg-accent text-accent-contrast`, 5.98:1)** used for "Equipped" on tower troops; the selected filter pill uses the same pair. A unit test (`contrast.test.ts`) pins every semantic pill pair and the accent pairs to ≥ 4.5:1 by reading `theme.css`. · Phase 1 deferred minor: accent tone is 4.13:1 on surface-2. · None.
- **D37. Fixtures grow, `mockApi` grows options:** CR player gets tower troops, an evolved Knight, a favourite card, clan badge, donations, seasons, badges and achievements; the CR battle log becomes 9 battles over 4 modes with all three results; the CR card catalogue answers 121 items; `mockApi` gains `brokenArt`, `patch` (merge fields into a player fixture) and `battlelog` (replace a battle log); the art placeholder PNG becomes opaque slate so review screenshots show where images sit. Existing assertions that depended on the old fixture (4 latest battles) are updated in the task that changes it. · Deterministic coverage of every new branch. · Fixture drift from the live API, mitigated by the env-gated real-player tests and the live check in Task 11.
- **D38. Every CR tab has an empty state:** towers ("No tower troops to show"), deck ("No battle deck to show"), cards ("No cards to show" / "No cards match" with a reset button), battles ("No recent battles" / "No battles match these filters" with "Show all battles"). The tower troops tab used to render nothing at all for a player without troops. · Spec "States". · None.
- **D39. `scripts/screenshots.mjs` shoots every CR tab plus a filtered Battles view, takes `SCREENSHOT_ONLY=<name prefix>` and `SCREENSHOT_DIR=<dir>`, and defaults to `docs/screenshots/phase2`.** Live-data screenshots go to a directory outside the repo (they show the real tag). · Reviewers judge every restyled tab; per-task looks are cheap. · None.
- **D40. Superseded by the controller ruling: every battle the API returns (up to 30) reaches the Battles tab; the overview lists the latest 5.** The mapper no longer slices to 10 for Clash Royale; the Battles tab says "Showing n of N recent battles" with N the real count. · Filters need the full log to be useful. · None.
- **D41. Filter pills change only their border on hover** (`hover:border-line-strong`), never their text colour. · A hover text colour would beat `peer-checked:text-accent-contrast` and put white text on the blue fill (3.3:1). · None.

---

### Task 1: Phase 2 start: budget, contrast guard, review tooling

**Files:**
- Modify: `scripts/bundle-budget.json` (`phase`, `phaseStart`)
- Create: `src/styles/__tests__/contrast.test.ts`
- Modify: `scripts/screenshots.mjs`

**Interfaces:**
- Consumes: `scripts/check-bundle.mjs` and `scripts/bundle-budget-lib.mjs` (Phase 1, unchanged): caps are `min(budgets[line], phaseStart[line] × (1 + maxPhaseGrowth))` unless the line is in `phaseGrowthExempt`.
- Produces: Phase 2 caps (D21) enforced by every later `npm run build`; `npm run screenshots` with `SCREENSHOT_ONLY`, `SCREENSHOT_DIR`, default output `docs/screenshots/phase2/`, page names `clash-royale`, `clash-royale-cards`, `clash-royale-deck`, `clash-royale-battles`, `clash-royale-battles-losses`, `clash-royale-towers`, `home`, `brawl-stars`, `clash-of-clans` (each `-390/-768/-1440.png`). Later tasks run `SCREENSHOT_DIR=/tmp/p2-shots SCREENSHOT_ONLY=<prefix> npm run screenshots` to look at their tab.

- [ ] **Step 1: Measure the phase start**

Run on the untouched branch (main = `59b471a` + this plan): `npm run build | sed -n '/performance budget/,$p'`
Expected (the D21 numbers): `initialJs 123.64`, `playerPageJs 155.07`, `entryJs 6.92`, `css 12.54`, `fonts 48.26`. If main has moved and the numbers differ, use the printed numbers in Step 2 and in the PR description.

- [ ] **Step 2: Write the phase start into the budget file**

In `scripts/bundle-budget.json` replace the `phase` and `phaseStart` entries (keep everything else, 2-space indent, LF, trailing newline):

```json
  "phase": "restyle phase 2 (clash royale)",
  "phaseStart": {
    "initialJs": 123.64,
    "playerPageJs": 155.07,
    "entryJs": 6.92,
    "css": 12.54,
    "fonts": 48.26
  },
```

Run: `npm run build | sed -n '/performance budget/,$p'`
Expected: every line `✓`, limits `129.82`, `162.82`, `8`, `13.17`, `50`.

- [ ] **Step 3: Write the contrast guard (it passes on today's tokens; it exists to fail on a future token change)**

Create `src/styles/__tests__/contrast.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// WCAG AA guard for the token pairs the restyled panels rely on. Values are
// read from theme.css, so changing a token re-checks every pair below.
const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

type RGBA = [number, number, number, number];

function token(name: string, scope = ':root'): RGBA {
  const block = css.match(new RegExp(`${scope.replace(/[[\]']/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`no ${scope} block in theme.css`);
  const value = block[1].match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
  if (!value) throw new Error(`--${name} not declared in ${scope}`);
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as RGBA;
  const rgba = value.match(/^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/);
  if (rgba) return rgba.slice(1).map(Number) as RGBA;
  throw new Error(`--${name}: cannot parse "${value}"`);
}

/** Paint `top` over an opaque `bottom`. */
function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [0, 1, 2].map((i) => Math.round(top[i] * a + bottom[i] * (1 - a))).concat(1) as RGBA;
}

function luminance([r, g, b]: RGBA): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg: RGBA, bg: RGBA): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const surface1 = token('surface-1');
const canvas = token('bg');

describe('semantic pills (text on its tinted fill)', () => {
  it.each([
    ['win', 'win-soft'],
    ['loss', 'loss-soft'],
    ['draw', 'draw-soft'],
  ])('%s on %s is AA on the page and on surface-1', (text, fill) => {
    for (const base of [canvas, surface1]) {
      const bg = over(token(fill), base);
      expect(contrast(token(text), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('accent', () => {
  it.each(['clash-royale', 'brawl-stars', 'clash-of-clans'])('%s: accent pill on surface-1 and accent-contrast on a solid accent are AA', (game) => {
    const scope = `[data-game='${game}']`;
    const accent = token('accent', scope);
    expect(contrast(accent, over(token('accent-soft', scope), surface1))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('accent-contrast'), accent)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('text floor', () => {
  it('fg-subtle (white/60) is AA on every surface', () => {
    for (const base of [canvas, surface1, token('surface-2')]) {
      expect(contrast(over(token('text-subtle'), base), base)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

- [ ] **Step 4: Prove the guard can fail, then restore**

Run: `sed -i 's/--loss-soft: rgba(248, 113, 113, 0.12)/--loss-soft: rgba(248, 113, 113, 0.40)/' src/styles/theme.css && npx vitest run src/styles; git checkout src/styles/theme.css`
Expected: `loss on loss-soft is AA on the page and on surface-1` FAILS, then `git checkout` restores the file. Run `npx vitest run src/styles` again: 7 passed.

- [ ] **Step 5: Extend the screenshot script**

In `scripts/screenshots.mjs`:

Replace the header comment's first paragraph and usage block with:

```js
/**
 * Review screenshots (restyle spec, "Acceptance"): Home, one player page per
 * game and every Clash Royale tab at 390, 768 and 1440 px, written to
 * docs/screenshots/<phase>/.
 *
 *   npm run build && npm run screenshots              # fixtures, local preview
 *   SCREENSHOT_ONLY=clash-royale npm run screenshots  # only pages whose name starts with it
 *   E2E_CR_TAG=... E2E_BS_TAG=... E2E_COC_TAG=... npm run screenshots
 *                                                     # real players via the preview's API proxy
 *   BASE_URL=https://supercellstats.com npm run screenshots   # production
 *   SCREENSHOT_DIR=/some/tmp/dir ...                  # write elsewhere (live-data shots show the
 *                                                     # real tag: never commit them)
 *
 * Player pages use the e2e fixtures (e2e/support/) unless the game's E2E_*_TAG
 * is set. Real tags are read from the environment only, never written to disk.
 */
```

Replace the `PHASE`/`OUT` lines and the `PAGES` array with:

```js
const PHASE = process.env.SCREENSHOT_PHASE ?? 'phase2';
const OUT = process.env.SCREENSHOT_DIR ? path.resolve(process.env.SCREENSHOT_DIR) : path.join(ROOT, 'docs/screenshots', PHASE);
const WIDTHS = [390, 768, 1440];
const PORT = 4173;

const CR = { game: 'clash-royale', env: 'E2E_CR_TAG' };
const ALL_PAGES = [
  { name: 'home', path: () => '/' },
  { name: 'clash-royale', ...CR, search: '' },
  { name: 'clash-royale-cards', ...CR, search: '?tab=cards' },
  { name: 'clash-royale-deck', ...CR, search: '?tab=deck' },
  { name: 'clash-royale-battles', ...CR, search: '?tab=battles' },
  { name: 'clash-royale-battles-losses', ...CR, search: '?tab=battles&result=loss' },
  { name: 'clash-royale-towers', ...CR, search: '?tab=towers' },
  { name: 'brawl-stars', game: 'brawl-stars', env: 'E2E_BS_TAG', search: '' },
  { name: 'clash-of-clans', game: 'clash-of-clans', env: 'E2E_COC_TAG', search: '' },
];
const ONLY = process.env.SCREENSHOT_ONLY;
const PAGES = ONLY ? ALL_PAGES.filter((p) => p.name.startsWith(ONLY)) : ALL_PAGES;
if (PAGES.length === 0) throw new Error(`SCREENSHOT_ONLY=${ONLY} matches no page`);
```

(`WIDTHS` and `PORT` are the existing lines; keep one copy.) In the loop replace the `url`/`goto`/`waitFor` lines with:

```js
      const url = entry.game ? `/game/${entry.game}/player/${encodeURIComponent(realTag ?? FIXTURE_TAG)}${entry.search}` : entry.path();
      await page.goto(base + url, { waitUntil: 'networkidle' });
      if (entry.game) {
        await page.getByTestId('player-summary').waitFor({ timeout: 15000 });
        await page.getByTestId('panel-skeleton').waitFor({ state: 'detached', timeout: 15000 });
      }
```

- [ ] **Step 6: Run the script once and look at the "before" state**

Run: `npm run build && SCREENSHOT_DIR=/tmp/p2-shots/before SCREENSHOT_ONLY=clash-royale npm run screenshots`
Expected: 18 `wrote /tmp/p2-shots/before/…png (fixtures)` lines, nothing listening on 4173 afterwards (`ss -ltn | grep 4173` prints nothing). Open `clash-royale-1440.png` and `clash-royale-towers-390.png`: you should see the problems this phase fixes (duplicate name card under the hero, an empty "Ranked seasons" card, a tofu box after "1,530", an empty Tower troops tab). Do not commit `/tmp` files.

- [ ] **Step 7: Full gate and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: green; unit 149 passed (9 files); e2e 59 passed, 6 skipped.

```bash
git add scripts/bundle-budget.json scripts/screenshots.mjs src/styles/__tests__/contrast.test.ts
git commit -m "chore(restyle): phase 2 budget start, token contrast guard, CR review screenshots

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Game art fallback and the Tower troops tab

**Files:**
- Create: `src/app/ui/GameImage.tsx`, `e2e/cr-panels.spec.ts`
- Modify: `src/app/ui/Pill.tsx`, `src/app/ui/text.ts`, `src/app/ui/__tests__/text.test.ts`, `src/app/components/CRTowerTroops.tsx` (whole file), `src/app/pages/game/ClashRoyale.tsx:28`, `e2e/support/helpers.ts`, `e2e/support/mockApi.ts`, `e2e/support/fixtures.ts`, `e2e/watch.spec.ts`

**Interfaces:**
- Consumes: `Card`, `EmptyState`, `cx` from `src/app/ui/` (Phase 1).
- Produces:
  - `GameImage({ sources: ReadonlyArray<string | undefined>; alt: string; width: number; height: number; fallback: ReactNode; className?: string; loading?: 'lazy' | 'eager' })`; the fallback element has `data-testid="game-image-fallback"`.
  - `PillTone` gains `'solid'`.
  - `sentenceCase(text: string): string` in `src/app/ui/text.ts`.
  - `CRTowerTroops({ playerStats })` (the `accent` prop is gone); rows have `data-testid="tower-troop"`.
  - e2e: `ART_HOSTS` exported from `e2e/support/mockApi.ts`; `MockApiOptions.brokenArt?: RegExp`, `MockApiOptions.patch?: Partial<Record<'clash-royale' | 'brawl-stars' | 'clash-of-clans', Record<string, unknown>>>`; `watch()` tolerates 404s on `ART_HOSTS` images; `e2e/cr-panels.spec.ts` with the `cr()`/`panel()` helpers and the `ART_TABS` table that Tasks 3–5 extend.

- [ ] **Step 1: Failing unit test for `sentenceCase`**

In `src/app/ui/__tests__/text.test.ts` change the import to `import { sentenceCase, stripEmoji } from '../text';` and append:

```ts
describe('sentenceCase', () => {
  it.each([
    ['legendary', 'Legendary'],
    ['coLeader', 'Co leader'],
    ['ELDER', 'Elder'],
    ['tower_princess', 'Tower princess'],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(sentenceCase(input)).toBe(expected);
  });
});
```

Run: `npx vitest run src/app/ui/__tests__/text.test.ts`
Expected: FAIL (`sentenceCase` is not exported).

- [ ] **Step 2: Implement `sentenceCase`**

Append to `src/app/ui/text.ts`:

```ts

/** API enum-ish words for display: 'legendary' -> 'Legendary', 'coLeader' -> 'Co leader'. */
export function sentenceCase(text: string): string {
  const words = text.trim().replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
```

Run: `npx vitest run src/app/ui/__tests__/text.test.ts` → PASS.

- [ ] **Step 3: `solid` Pill tone**

In `src/app/ui/Pill.tsx`:

```ts
export type PillTone = 'neutral' | 'accent' | 'solid' | 'win' | 'loss' | 'draw';

const TONES: Record<PillTone, string> = {
  neutral: 'bg-surface-2 text-fg-muted',
  // accent text on its tint is AA on surface-1 only (4.56:1); on surface-2 use 'solid'.
  accent: 'bg-accent-soft text-accent',
  solid: 'bg-accent text-accent-contrast',
  win: 'bg-win-soft text-win',
  loss: 'bg-loss-soft text-loss',
  draw: 'bg-draw-soft text-draw',
};
```

- [ ] **Step 4: `GameImage`**

Create `src/app/ui/GameImage.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { cx } from './cx';

interface GameImageProps {
  /** Tried in order; empty entries are skipped. The next one loads when one fails. */
  sources: ReadonlyArray<string | undefined>;
  /** Describes the image; '' for a decorative one (its name is printed next to it). */
  alt: string;
  /** Intrinsic size: reserves the box before the image arrives, and sizes the fallback. */
  width: number;
  height: number;
  /** Shown in the same box when every source failed or there is none (a lucide icon). */
  fallback: ReactNode;
  className?: string;
  /** 'eager' only for art that is visible on first paint. */
  loading?: 'lazy' | 'eager';
}

/**
 * Third-party game art (card, badge, arena, clan badge) with a fallback chain.
 * The CDNs can 404 for new content or be blocked; the box keeps its size
 * either way, so nothing shifts when an image fails.
 */
export function GameImage({ sources, alt, width, height, fallback, className, loading = 'lazy' }: GameImageProps) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const src = sources.find((s): s is string => Boolean(s) && !failed.includes(s as string));

  if (!src) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        data-testid="game-image-fallback"
        style={{ aspectRatio: `${width} / ${height}` }}
        className={cx('inline-flex items-center justify-center rounded-lg bg-surface-2 text-fg-subtle [&_svg]:size-6', className)}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      onError={() => setFailed((list) => [...list, src])}
      className={className}
    />
  );
}
```

- [ ] **Step 5: Test support: art hosts, broken art, player patches, art-404 tolerance**

In `e2e/support/mockApi.ts`:
1. Add to `MockApiOptions`:

```ts
  /** Game-art URLs matching this answer 404, as a CDN does for content it does not have yet. */
  brokenArt?: RegExp;
  /** Fields merged over a game's player fixture (e.g. `{ 'clash-royale': { supportCards: [] } }`). */
  patch?: Partial<Record<'clash-royale' | 'brawl-stars' | 'clash-of-clans', Record<string, unknown>>>;
```

2. Replace the `PIXEL` comment/constant and `ART_HOSTS` with:

```ts
// 1x1 opaque slate PNG: game art CDNs are answered locally so tests never depend
// on them, and review screenshots still show where each image sits.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mOwcisAAAGuAPF1kfDaAAAAAElFTkSuQmCC', 'base64');
/** Third-party hosts of game art (all listed in the production CSP img-src). */
export const ART_HOSTS = /^https:\/\/(cdn\.brawlify\.com|cdn-old\.brawlify\.com|api-assets\.clashroyale\.com|api-assets\.clashofclans\.com|royaleapi\.github\.io)\//;
```

3. Replace the art route with:

```ts
  await page.route(ART_HOSTS, (route) =>
    options.brokenArt?.test(route.request().url())
      ? route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' })
      : route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
```

4. Replace the three player returns with:

```ts
      if (path.startsWith('/api/clash-royale/')) return json({ ...crPlayer, ...options.patch?.['clash-royale'] });
      if (path.startsWith('/api/brawl-stars/')) return json({ ...bsPlayer, ...options.patch?.['brawl-stars'] });
      return json({ ...cocPlayer, ...options.patch?.['clash-of-clans'] });
```

In `e2e/support/helpers.ts`:
1. Add `import { ART_HOSTS } from './mockApi.ts';` under the Playwright import.
2. Append to the `watch` doc comment:

```ts
 * A 404 on third-party game art (ART_HOSTS) is tolerated too: CDNs miss new
 * content and every art slot has a fallback; a 404 on our own images fails.
```

3. Replace `const isDocument404 = …` with:

```ts
  const missingArt = new Set<string>();
  const isTolerated404 = (url: string) => (opts.documentNotFound === true && notFoundDocs.has(url)) || missingArt.has(url);
```

and use `isTolerated404(m.location().url)` in the console handler.
4. Replace the `page.on('response', …)` handler's 404 part with:

```ts
  // The console message can arrive before the response event: drop it then.
  const forget404 = (url: string) => {
    for (const p of pending404.filter((x) => x.url === url)) {
      const i = problems.indexOf(p.msg);
      if (i >= 0) problems.splice(i, 1);
    }
  };
  page.on('response', (r) => {
    if (r.status() === 404 && r.request().isNavigationRequest() && r.frame() === page.mainFrame()) {
      notFoundDocs.add(r.url());
      if (opts.documentNotFound) forget404(r.url());
    }
    if (r.status() === 404 && r.request().resourceType() === 'image' && ART_HOSTS.test(r.url())) {
      missingArt.add(r.url());
      forget404(r.url());
    }
    if (r.status() >= 500) problems.push(`http ${r.status()}: ${r.url()}`);
  });
```

Append to `e2e/watch.spec.ts`:

```ts
test('watch tolerates a 404 on third-party game art, never on our own images', async ({ page }) => {
  await page.route('https://api-assets.clashroyale.com/**', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }));
  await page.route('http://watch.test/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/own.png')) return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>x</title><img src="https://api-assets.clashroyale.com/cards/300/1.png" alt=""><img src="/own.png" alt="">',
    });
  });
  const problems = watch(page);
  await page.goto('http://watch.test/page');
  await page.waitForLoadState('load');
  await expect.poll(() => problems.length).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/404/);
});
```

- [ ] **Step 6: Tower troops fixture**

In `e2e/support/fixtures.ts`, above `export const crPlayer`, add:

```ts
const towerTroop = (id: number, name: string, rarity: string, level: number) => ({
  id, name, rarity, level, maxLevel: 16, iconUrls: { medium: `https://api-assets.clashroyale.com/cards/300/${id}.png` },
});
const towerTroops = [towerTroop(159000000, 'Tower Princess', 'common', 16), towerTroop(159000001, 'Cannoneer', 'epic', 11), towerTroop(159000002, 'Dagger Duchess', 'legendary', 8)];
```

and add to `crPlayer` after `currentDeck: deck,`:

```ts
  supportCards: towerTroops,
  currentDeckSupportCards: [towerTroops[1]],
```

- [ ] **Step 7: Failing e2e**

Create `e2e/cr-panels.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const cr = (search = '') => `/game/clash-royale/player/${FIXTURE_TAG}${search}`;
const panel = (page: import('@playwright/test').Page) => page.getByRole('tabpanel');

test.describe('Tower troops tab', () => {
  test('lists every tower troop and marks the equipped one', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr('?tab=towers'));
    await expect(panel(page).getByTestId('tower-troop')).toHaveCount(3);
    const equipped = panel(page).getByTestId('tower-troop').filter({ hasText: 'Equipped' });
    await expect(equipped).toHaveCount(1);
    await expect(equipped).toContainText('Cannoneer');
    await expect(panel(page).getByText('Common · Level 16 (max)')).toBeVisible();
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('explains a player without tower troops', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-royale': { supportCards: [], currentDeckSupportCards: [] } } });
    await page.goto(cr('?tab=towers'));
    await expect(panel(page).getByTestId('empty-state').getByText('No tower troops to show')).toBeVisible();
  });
});
// Every CR tab that shows game art, with the number of art slots the fixture fills.
const ART_TABS: Array<[string, number]> = [
  ['towers', 3],
];
for (const [tab, slots] of ART_TABS) {
  test(`${tab}: missing game art falls back in place without errors`, async ({ page }) => {
    const problems = watch(page);
    await mockApi(page, { brokenArt: /./ });
    await page.goto(cr(`?tab=${tab}`));
    await expect(panel(page).getByTestId('game-image-fallback')).toHaveCount(slots);
    await expect(panel(page).locator('img')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
```

Run: `npm run build && npx playwright test e2e/cr-panels.spec.ts e2e/watch.spec.ts`
Expected: the three cr-panels tests FAIL (old component: no `tower-troop`, nothing rendered for an empty list, raw `<img>` instead of a fallback); both watch tests PASS.

- [ ] **Step 8: Rewrite `CRTowerTroops`**

Replace `src/app/components/CRTowerTroops.tsx` (LF):

```tsx
import { Flame } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { sentenceCase } from '../ui/text';

interface CRTowerTroopsProps {
  playerStats: PlayerStats;
}

/** Clash Royale "Tower troops" tab: every unlocked tower troop, the equipped one marked. */
export function CRTowerTroops({ playerStats }: CRTowerTroopsProps) {
  const cr = playerStats.gameVisuals?.cr;
  const troops = cr?.supportCards ?? [];
  if (troops.length === 0) {
    return (
      <EmptyState icon={<Flame />} title="No tower troops to show">
        Tower troops unlock as the player climbs. They appear here once the API lists them for this player.
      </EmptyState>
    );
  }
  const equippedId = cr?.currentDeckSupportCards?.[0]?.id;

  return (
    <Card as="section" title={`Tower troops (${troops.length})`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {troops.map((troop) => {
          const equipped = troop.id === equippedId;
          return (
            <li
              key={troop.id}
              data-testid="tower-troop"
              className={cx('flex min-w-0 flex-col items-center gap-3 rounded-card border p-4 text-center', equipped ? 'border-accent' : 'border-line')}
            >
              <GameImage sources={[troop.iconUrl]} alt="" width={93} height={112} fallback={<Flame />} className="h-28 w-auto object-contain" />
              <div className="w-full min-w-0">
                <h4 className="truncate text-sm font-semibold text-fg">{troop.name}</h4>
                <p className="mt-1 text-xs text-fg-subtle">
                  {sentenceCase(troop.rarity)} · Level {troop.level}
                  {troop.level >= troop.maxLevel && ' (max)'}
                </p>
              </div>
              {equipped && <Pill tone="solid">Equipped</Pill>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
```

In `src/app/pages/game/ClashRoyale.tsx` replace `return <CRTowerTroops playerStats={playerStats} accent={game.accent} />;` with `return <CRTowerTroops playerStats={playerStats} />;`.

- [ ] **Step 9: Prove the 404 tolerance is what makes the art test pass**

Temporarily delete `|| missingArt.has(url)` and the `forget404(r.url());` line inside the image branch of `helpers.ts`, run `npm run build && npx playwright test e2e/cr-panels.spec.ts -g "missing game art"`: FAIL with `console: Failed to load resource: … 404`. Restore both (`git diff e2e/support/helpers.ts` shows only the intended changes). Run again: PASS.

- [ ] **Step 10: Gate, screenshots, look**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 154 passed; e2e 63 passed, 6 skipped; budget about `playerPageJs 155.14`, `css 12.38`.

Run: `SCREENSHOT_DIR=/tmp/p2-shots/t2 SCREENSHOT_ONLY=clash-royale-towers npm run screenshots` and open the three PNGs. Check: one card "Tower troops (3)", tiles with 12 px radius and hairline border, the equipped tile outlined in the accent with a solid "Equipped" pill, "Common · Level 16 (max)" in the subtle grey, two columns at 390 and five at 1440, no horizontal scroll, no emoji.

- [ ] **Step 11: Commit**

```bash
git add src/app/ui/GameImage.tsx src/app/ui/Pill.tsx src/app/ui/text.ts src/app/ui/__tests__/text.test.ts src/app/components/CRTowerTroops.tsx src/app/pages/game/ClashRoyale.tsx e2e/support e2e/watch.spec.ts e2e/cr-panels.spec.ts
git commit -m "feat(cr): tower troops on the design system, game art with fallbacks

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Deck tab

**Files:**
- Modify: `src/app/components/CRDeck.tsx` (whole file, **CRLF**), `src/app/pages/game/ClashRoyale.tsx:26`, `e2e/support/fixtures.ts`, `e2e/cr-panels.spec.ts`

**Interfaces:**
- Consumes: `GameImage`, `Pill` (`solid`/`accent`/neutral with `icon`), `sentenceCase` (Task 2); `StatTile`, `Card`, `EmptyState` (Phase 1).
- Produces: `CRDeck({ playerStats })` (no `accent` prop); deck tiles `data-testid="deck-card"`; headings "Current deck", "Tower troop", "Favourite card".

- [ ] **Step 1: Fixture: an evolved card and a favourite card**

In `e2e/support/fixtures.ts` replace the Knight line of `deck` with:

```ts
  { ...card(26000000, 'Knight', 'common', 14, 16, 3), evolutionLevel: 1, starLevel: 2, iconUrls: { medium: 'https://api-assets.clashroyale.com/cards/300/26000000.png', evolutionMedium: 'https://api-assets.clashroyale.com/cardevolutions/300/26000000.png' } },
```

and add to `crPlayer` after `currentDeckSupportCards`:

```ts
  currentFavouriteCard: { id: 26000021, name: 'Hog Rider', rarity: 'rare', maxLevel: 14, elixirCost: 4, iconUrls: { medium: 'https://api-assets.clashroyale.com/cards/300/26000021.png' } },
```

- [ ] **Step 2: Failing e2e**

In `e2e/cr-panels.spec.ts` add `['deck', 10],` to `ART_TABS` (8 cards + tower troop + favourite card) and append:

```ts
test.describe('Deck tab', () => {
  test('shows the eight cards, the deck numbers, the tower troop and the favourite card', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr('?tab=deck'));
    await expect(panel(page).getByTestId('deck-card')).toHaveCount(8);
    await expect(panel(page).getByText('Average elixir')).toBeVisible();
    await expect(panel(page).getByText('3.1', { exact: true })).toBeVisible();
    await expect(panel(page).getByTestId('deck-card').filter({ hasText: 'Knight' }).getByText('Evolved')).toBeVisible();
    await expect(panel(page).getByRole('heading', { name: 'Tower troop' })).toBeVisible();
    await expect(panel(page).getByText('Cannoneer')).toBeVisible();
    await expect(panel(page).getByRole('heading', { name: 'Favourite card' })).toBeVisible();
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('explains a player without a current deck', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-royale': { currentDeck: [] } } });
    await page.goto(cr('?tab=deck'));
    await expect(panel(page).getByTestId('empty-state').getByText('No battle deck to show')).toBeVisible();
  });
});
```

Run: `npm run build && npx playwright test e2e/cr-panels.spec.ts -g "Deck tab|deck:"`
Expected: FAIL (no `deck-card`, old component returns `null` for an empty deck).

- [ ] **Step 3: Rewrite `CRDeck` (CRLF)**

Replace `src/app/components/CRDeck.tsx` with the content below, then restore CRLF and check:

```tsx
import { Droplet, Flame, Heart, Layers, Sparkles, Star } from 'lucide-react';
import type { CRCardData, PlayerStats } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { StatTile } from '../ui/StatTile';
import { sentenceCase } from '../ui/text';

interface CRDeckProps {
    playerStats: PlayerStats;
}

const isEvolved = (card: CRCardData) => (card.evolutionLevel ?? 0) > 0;

/** Clash Royale "Deck" tab: the current battle deck, its numbers, tower troop and favourite card. */
export function CRDeck({ playerStats }: CRDeckProps) {
    const cr = playerStats.gameVisuals?.cr;
    const deck = cr?.currentDeck ?? [];
    if (deck.length === 0) {
        return (
            <EmptyState icon={<Layers />} title="No battle deck to show">
                The API sent no current deck for this player. It appears here after their next battle.
            </EmptyState>
        );
    }

    const avgElixir = deck.reduce((sum, c) => sum + (c.elixirCost ?? 0), 0) / deck.length;
    const evolutions = deck.filter(isEvolved).length;
    const maxed = deck.filter((c) => c.level >= c.maxLevel).length;
    const towerTroop = cr?.currentDeckSupportCards?.[0];
    const favorite = cr?.favoriteCard;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatTile label="Average elixir" value={avgElixir.toFixed(1)} icon={<Droplet />} />
                <StatTile label="Evolutions" value={evolutions} icon={<Sparkles />} />
                <StatTile label="Cards at max level" value={`${maxed} of ${deck.length}`} icon={<Star />} />
            </div>

            <Card as="section" title="Current deck">
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {deck.map((card) => (
                        <li key={card.id} data-testid="deck-card" className="flex min-w-0 flex-col items-center gap-3 rounded-card border border-line p-4 text-center">
                            <GameImage
                                sources={isEvolved(card) ? [card.evolutionIconUrl, card.iconUrl] : [card.iconUrl]}
                                alt=""
                                width={93}
                                height={112}
                                fallback={<Layers />}
                                className="h-28 w-auto object-contain"
                            />
                            <div className="w-full min-w-0">
                                <h4 className="truncate text-sm font-semibold text-fg">{card.name}</h4>
                                <p className="mt-1 text-xs text-fg-subtle">
                                    {card.rarity ? `${sentenceCase(card.rarity)} · ` : ''}Level {card.level}
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {card.elixirCost !== undefined && (
                                    <Pill icon={<Droplet />}>
                                        <span className="sr-only">Elixir </span>
                                        {card.elixirCost}
                                    </Pill>
                                )}
                                {isEvolved(card) && <Pill tone="accent">Evolved</Pill>}
                                {(card.starLevel ?? 0) > 0 && <Pill icon={<Star />}>Star {card.starLevel}</Pill>}
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>

            {(towerTroop || favorite) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {towerTroop && (
                        <Card as="section" title="Tower troop">
                            <div className="flex items-center gap-4">
                                <GameImage sources={[towerTroop.iconUrl]} alt="" width={64} height={77} fallback={<Flame />} className="h-20 w-auto shrink-0 object-contain" />
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-fg">{towerTroop.name}</p>
                                    <p className="mt-1 text-sm text-fg-subtle">{sentenceCase(towerTroop.rarity)} · Level {towerTroop.level}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                    {favorite && (
                        <Card as="section" title="Favourite card">
                            <div className="flex items-center gap-4">
                                <GameImage sources={[favorite.iconUrl]} alt="" width={64} height={77} fallback={<Heart />} className="h-20 w-auto shrink-0 object-contain" />
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-fg">{favorite.name}</p>
                                    {favorite.rarity && <p className="mt-1 text-sm text-fg-subtle">{sentenceCase(favorite.rarity)}</p>}
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
```

Run: `perl -pi -e 's/\r?\n/\r\n/' src/app/components/CRDeck.tsx && echo $(grep -c $'\r$' src/app/components/CRDeck.tsx) $(wc -l < src/app/components/CRDeck.tsx)`
Expected: two equal numbers (103 103).

In `src/app/pages/game/ClashRoyale.tsx` replace `return <CRDeck playerStats={playerStats} accent={game.accent} />;` with `return <CRDeck playerStats={playerStats} />;`.

- [ ] **Step 4: Gate, screenshots, look**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: e2e 66 passed, 6 skipped; budget about `css 12.18`.

Run: `SCREENSHOT_DIR=/tmp/p2-shots/t3 SCREENSHOT_ONLY=clash-royale-deck npm run screenshots` and look. Check: three stat tiles ("Average elixir 3.1", "Evolutions 1", "Cards at max level 0 of 8"), eight tiles (2 columns at 390, 4 at ≥ 768) with name, "Rarity · Level n", an elixir pill with a droplet, "Evolved" and "Star 2" pills on Knight, then Tower troop and Favourite card side by side from 768 px. No fuchsia/purple/yellow leftovers, no shimmer bars, no "★".

- [ ] **Step 5: Commit**

```bash
git add src/app/components/CRDeck.tsx src/app/pages/game/ClashRoyale.tsx e2e/support/fixtures.ts e2e/cr-panels.spec.ts
git commit -m "feat(cr): deck tab on the design system with an empty state

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cards tab, its count in the tab strip, typed tab ids

**Files:**
- Modify: `src/app/components/CRCardsList.tsx` (whole file, **CRLF**), `src/app/pages/game/tabs.tsx`, `src/app/ui/SectionTabs.tsx`, `src/app/pages/GamePage.tsx`, `src/app/pages/game/ClashRoyale.tsx`, `e2e/support/mockApi.ts`, `e2e/cr-panels.spec.ts`
- Create: `src/app/pages/game/__tests__/tabs.test.ts`

**Interfaces:**
- Consumes: `GameImage`, `Pill`, `sentenceCase` (Task 2); `Button`, `Card`, `EmptyState` (Phase 1); `PlayerStats.extraStats` entry `{ label: 'Cards Found', value: '8 / 121' | '8' }` written by the mapper.
- Produces:
  - `export type TabId<G extends GameId> = (typeof GAME_TABS)[G][number]['id']` and `tabCounts(game: GameId, stats: PlayerStats): Partial<Record<string, string>>` in `pages/game/tabs.tsx`.
  - `TabDef.count?: string` rendered after the label by `SectionTabs`.
  - `CRCardsList({ cards })` (no `accent`); tiles `data-testid="collection-card"`; controls labelled "Search cards", "Filter cards by rarity", "Sort cards"; headings "Collection (n)" / "Not found yet (n)".
  - `ClashRoyale.tsx` local `type CRTab = TabId<'clash-royale'>`, switch on `tab as CRTab`.

- [ ] **Step 1: Failing unit test for `tabCounts` and the public ids**

Create `src/app/pages/game/__tests__/tabs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { PlayerStats } from '../../../data/mockStats';
import { GAME_TABS, tabCounts } from '../tabs';

const stats = (extraStats: PlayerStats['extraStats']) => ({ extraStats }) as PlayerStats;

describe('GAME_TABS', () => {
  it('keeps the public ids of the spec', () => {
    expect(GAME_TABS['clash-royale'].map((t) => t.id)).toEqual(['overview', 'cards', 'deck', 'battles', 'towers']);
  });
});

describe('tabCounts', () => {
  it('shows found / in game on the Clash Royale Cards tab', () => {
    expect(tabCounts('clash-royale', stats([{ label: 'Cards Found', value: '12 / 123' }]))).toEqual({ cards: '12/123' });
  });
  it('shows the found count alone when the catalogue was unavailable', () => {
    expect(tabCounts('clash-royale', stats([{ label: 'Cards Found', value: '12' }]))).toEqual({ cards: '12' });
  });
  it('shows nothing when the figure is missing, and nothing for other games', () => {
    expect(tabCounts('clash-royale', stats(undefined))).toEqual({});
    expect(tabCounts('brawl-stars', stats([{ label: 'Cards Found', value: '12 / 123' }]))).toEqual({});
  });
});
```

Run: `npx vitest run src/app/pages/game/__tests__/tabs.test.ts` → FAIL (`tabCounts` not exported).

- [ ] **Step 2: Typed ids and counts**

In `src/app/pages/game/tabs.tsx`: add `import type { PlayerStats } from '../../data/mockStats';`, change the declaration to `export const GAME_TABS = {` and its closing `};` to `} as const satisfies Record<GameId, readonly TabDef[]>;`, then append:

```tsx

/** The section ids of one game, as a union ('overview' | 'cards' | ...). */
export type TabId<G extends GameId> = (typeof GAME_TABS)[G][number]['id'];

/**
 * Small counts shown next to a tab label, computed from the loaded player.
 * Clash Royale Cards: "found / in game" from the API mapper ("12 / 123", or
 * just "12" when the card catalogue could not be fetched).
 */
export function tabCounts(game: GameId, stats: PlayerStats): Partial<Record<string, string>> {
  if (game !== 'clash-royale') return {};
  const found = stats.extraStats?.find((s) => s.label === 'Cards Found')?.value;
  return found === undefined || found === '' ? {} : { cards: String(found).replace(/\s+/g, '') };
}
```

Run: `npx vitest run src/app/pages/game/__tests__/tabs.test.ts` → PASS (4 tests).

- [ ] **Step 3: Show the count in the tab strip**

In `src/app/ui/SectionTabs.tsx` add to `TabDef`:

```ts
  /** Short figure after the label ("12/123"); part of the tab's accessible name. */
  count?: string;
```

and after `{tab.label}` inside the button:

```tsx
            {tab.count && <span className="text-xs font-normal tabular-nums text-fg-subtle">{tab.count}</span>}
```

In `src/app/pages/GamePage.tsx`:
- `import { SectionTabs, type TabDef } from '../ui/SectionTabs';`
- `import { GAME_TABS, tabCounts } from './game/tabs';`
- `const tabs: readonly TabDef[] = GAME_TABS[game.id as keyof typeof GAME_TABS];` (the annotation keeps `.map`/`.find` working on the `as const` union)
- after `const summary = …` add:

```tsx
  const counts = playerStats ? tabCounts(game.id as keyof typeof GAME_TABS, playerStats) : {};
  const labelledTabs = tabs.map((t) => (counts[t.id] ? { ...t, count: counts[t.id] } : t));
```

- pass `tabs={labelledTabs}` to `<SectionTabs>` (everything else keeps using `tabs`).

- [ ] **Step 4: Type the CR module's tab switch**

In `src/app/pages/game/ClashRoyale.tsx` add after the imports:

```tsx
import type { TabId } from './tabs';

type CRTab = TabId<'clash-royale'>;
```

(keep `import type { GameModuleProps } from './types';` last), replace `switch (tab) {` with:

```tsx
  // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
  switch (tab as CRTab) {
```

and `return <CRCardsList cards={cr.cards} accent={game.accent} />;` with `return <CRCardsList cards={cr.cards} />;`.
Check the type does its job: temporarily change `case 'cards':` to `case 'card':` → `npm run typecheck` fails with "not comparable"; revert.

- [ ] **Step 5: Fixture catalogue and failing e2e**

In `e2e/support/mockApi.ts` replace the catalogue line with:

```ts
    // Catalogue sizes: 121 cards exist in the (fixture) game, so the Cards tab reads "8/121".
    if (path === '/api/clash-royale/cards') return json({ items: Array.from({ length: 121 }, (_, id) => ({ id })) });
    if (path === '/api/brawl-stars/brawlers') return json({ items: [] });
```

In `e2e/cr-panels.spec.ts` add `['cards', 8],` to `ART_TABS` and append:

```ts
test.describe('Cards tab', () => {
  test('the tab shows found / in game, and search, rarity filter and the empty result work', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr('?tab=cards'));
    await expect(page.getByRole('tab', { name: 'Cards 8/121' })).toHaveAttribute('aria-selected', 'true');
    const cards = panel(page).getByTestId('collection-card');
    await expect(cards).toHaveCount(8);
    await expect(panel(page).getByRole('heading', { name: 'Collection (8)' })).toBeVisible();

    await panel(page).getByLabel('Search cards').fill('hog');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('Hog Rider');

    await panel(page).getByLabel('Search cards').fill('');
    await panel(page).getByLabel('Filter cards by rarity').selectOption('epic');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('Skeleton Army');

    await panel(page).getByLabel('Search cards').fill('zzz');
    await expect(panel(page).getByTestId('empty-state').getByText('No cards match')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Clear search and filter' }).click();
    await expect(cards).toHaveCount(8);
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });
});
```

Run: `npm run build && npx playwright test e2e/cr-panels.spec.ts -g "Cards tab|cards:"` → both FAIL on `collection-card` / the fallback count (old markup); the tab-name assertion already passes after Step 3.

- [ ] **Step 6: Rewrite `CRCardsList` (CRLF)**

Replace `src/app/components/CRCardsList.tsx`:

```tsx
import { useState } from 'react';
import { ArrowUpDown, Droplet, Layers, ListFilter, Search, SearchX } from 'lucide-react';
import type { CRCardData } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { sentenceCase } from '../ui/text';

interface CRCardsListProps {
    cards: CRCardData[];
}

type SortKey = 'level' | 'count' | 'elixir';
const SORTS: ReadonlyArray<[SortKey, string]> = [['level', 'Level'], ['count', 'Copies'], ['elixir', 'Elixir']];
const RARITIES = ['all', 'common', 'rare', 'epic', 'legendary', 'champion'] as const;

const isOwned = (c: CRCardData) => c.count > 0 || c.level > 1;
const FIELD = 'min-h-11 w-full rounded-card border border-line-input bg-canvas text-sm text-fg';

/** Clash Royale "Cards" tab: the whole collection with search, rarity filter and sort. */
export function CRCardsList({ cards }: CRCardsListProps) {
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('level');
    const [rarity, setRarity] = useState<string>('all');

    if (cards.length === 0) {
        return (
            <EmptyState icon={<Layers />} title="No cards to show">
                The API sent no card collection for this player.
            </EmptyState>
        );
    }

    const q = query.trim().toLowerCase();
    const shown = cards
        .filter((c) => c.name.toLowerCase().includes(q) && (rarity === 'all' || c.rarity?.toLowerCase() === rarity))
        .sort((a, b) =>
            sortBy === 'level' ? b.level - a.level : sortBy === 'count' ? b.count - a.count : (b.elixirCost ?? 0) - (a.elixirCost ?? 0),
        );
    const owned = shown.filter(isOwned);
    const missing = shown.filter((c) => !isOwned(c));

    return (
        <div className="space-y-4">
            <Card className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <label className="relative block">
                    <span className="sr-only">Search cards</span>
                    <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards" className={`${FIELD} pr-3 pl-9`} />
                </label>
                <label className="relative block">
                    <span className="sr-only">Filter cards by rarity</span>
                    <ListFilter aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
                    <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={`${FIELD} pr-3 pl-9`}>
                        {RARITIES.map((r) => <option key={r} value={r}>{r === 'all' ? 'All rarities' : sentenceCase(r)}</option>)}
                    </select>
                </label>
                <label className="relative block">
                    <span className="sr-only">Sort cards</span>
                    <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className={`${FIELD} pr-3 pl-9`}>
                        {SORTS.map(([key, label]) => <option key={key} value={key}>Sort by {label.toLowerCase()}</option>)}
                    </select>
                </label>
            </Card>

            {shown.length === 0 && (
                <EmptyState
                    icon={<SearchX />}
                    title="No cards match"
                    action={<Button onClick={() => { setQuery(''); setRarity('all'); }}>Clear search and filter</Button>}
                >
                    Try another name or rarity.
                </EmptyState>
            )}
            {owned.length > 0 && <CardGrid title={`Collection (${owned.length})`} cards={owned} owned />}
            {missing.length > 0 && <CardGrid title={`Not found yet (${missing.length})`} cards={missing} owned={false} />}
        </div>
    );
}

function CardGrid({ title, cards, owned }: { title: string; cards: CRCardData[]; owned: boolean }) {
    return (
        <Card as="section" title={title}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {cards.map((card) => {
                    const evolved = (card.evolutionLevel ?? 0) > 0;
                    const maxed = card.level >= card.maxLevel;
                    const pct = card.maxCount > 0 ? Math.min(100, (card.count / card.maxCount) * 100) : 0;
                    return (
                        <li key={card.id} data-testid="collection-card" className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-line p-3 text-center">
                            <GameImage
                                sources={evolved ? [card.evolutionIconUrl, card.iconUrl] : [card.iconUrl]}
                                alt=""
                                width={80}
                                height={96}
                                fallback={<Layers />}
                                className={owned ? 'h-24 w-auto object-contain' : 'h-24 w-auto object-contain opacity-60 grayscale'}
                            />
                            <div className="w-full min-w-0">
                                <h4 className="truncate text-sm font-semibold text-fg">{card.name}</h4>
                                <p className="mt-0.5 text-xs text-fg-subtle">
                                    {card.rarity ? `${sentenceCase(card.rarity)} · ` : ''}Level {card.level}
                                </p>
                            </div>
                            {card.elixirCost !== undefined && (
                                <Pill icon={<Droplet />}>
                                    <span className="sr-only">Elixir </span>
                                    {card.elixirCost}
                                </Pill>
                            )}
                            {owned && !maxed && (
                                <div className="w-full">
                                    <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-2">
                                        <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="mt-1 text-xs tabular-nums text-fg-subtle">
                                        {pct >= 100 ? 'Ready to upgrade' : `${card.count.toLocaleString('en-US')} / ${card.maxCount.toLocaleString('en-US')} copies`}
                                    </p>
                                </div>
                            )}
                            {owned && maxed && <p className="text-xs font-medium text-fg-muted">Max level</p>}
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
```

Run: `perl -pi -e 's/\r?\n/\r\n/' src/app/components/CRCardsList.tsx && echo $(grep -c $'\r$' src/app/components/CRCardsList.tsx) $(wc -l < src/app/components/CRCardsList.tsx)` → two equal numbers (131 131).

Note: the real API lists only owned cards, so "Not found yet" rarely shows; the branch is kept because the old component had it and it costs nothing.

- [ ] **Step 7: Gate, screenshots, look**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 158 passed (10 files); e2e 68 passed, 6 skipped; budget about `playerPageJs 155.23`, `css 11.93`.

Run: `SCREENSHOT_DIR=/tmp/p2-shots/t4 SCREENSHOT_ONLY=clash-royale-cards npm run screenshots` and look. Check: tab reads "Cards 8/121" with the count dimmer than the label; controls stacked at 390 and in one row at ≥ 768, 44 px tall, visible input outline; tiles with progress bar in the accent and "120 / 180 copies"; no uppercase labels; no horizontal scroll.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/CRCardsList.tsx src/app/pages/game/tabs.tsx src/app/pages/game/__tests__/tabs.test.ts src/app/ui/SectionTabs.tsx src/app/pages/GamePage.tsx src/app/pages/game/ClashRoyale.tsx e2e/support/mockApi.ts e2e/cr-panels.spec.ts
git commit -m "feat(cr): cards tab on the design system, found/total count in the tab, typed tab ids

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Overview

**Files:**
- Create: `src/app/components/crFacts.ts`, `src/app/components/__tests__/crFacts.test.ts`
- Modify: `src/app/components/CROverview.tsx` (whole file, LF), `src/app/pages/game/ClashRoyale.tsx`, `e2e/support/fixtures.ts`, `e2e/cr-panels.spec.ts`

**Interfaces:**
- Consumes: `GameImage`, `sentenceCase` (Task 2); `StatTile`, `Row`, `Card`, `Button`, `cx` (Phase 1); `CRTab` (Task 4).
- Produces:
  - `parseCount(text: string | number | undefined): number | undefined`, `crFacts(stats: PlayerStats): CRFacts` with `CRFacts = { wins?, losses?, threeCrownWins?, bestTrophies?, donations?, warDayWins?: number; clan?: { name: string; tag: string; role: string } }`.
  - `CROverview({ playerStats, onOpenDeck: () => void })` (no `accent`, no `onTabChange`); badges list `data-testid="badge-list"`; headings "Clan", "Battle deck", "Ranked seasons", "Achievements"; badges toggle is a `<button aria-expanded aria-controls>` named "Badges (n)".
  - The `'tower' → 'towers'` shim in `ClashRoyale.tsx` is gone.

- [ ] **Step 1: Failing unit test for `crFacts`**

Create `src/app/components/__tests__/crFacts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { PlayerStats } from '../../data/mockStats';
import { crFacts, parseCount } from '../crFacts';

describe('parseCount', () => {
  it.each([
    ['4,210 wins', 4210],
    ['4.210 wins', 4210],
    ['4 210', 4210],
    ['Best: 9,301', 9301],
    ['1,530 \u{1F451}', 1530],
    [12, 12],
    ['', undefined],
    [undefined, undefined],
  ])('%j -> %j', (input, expected) => {
    expect(parseCount(input as string | number | undefined)).toBe(expected);
  });
});

const base = {
  statLabels: { stat1Sub: '4,210 wins · 3,388 losses', stat4Sub: 'Best: 9,301' },
  extraStats: [
    { label: '3-Crown Wins', value: '1,530 \u{1F451}' },
    { label: 'War Day Wins', value: 12 },
    { label: 'Total Donations', value: '2,048' },
    { label: 'Clan', value: 'Lantern Watch · coLeader' },
  ],
  gameVisuals: { cr: { clanTag: '#2Y0Y' } },
} as unknown as PlayerStats;

describe('crFacts', () => {
  it('reads the numbers back from the mapper strings', () => {
    expect(crFacts(base)).toEqual({
      wins: 4210,
      losses: 3388,
      threeCrownWins: 1530,
      bestTrophies: 9301,
      donations: 2048,
      warDayWins: 12,
      clan: { name: 'Lantern Watch', tag: '#2Y0Y', role: 'coLeader' },
    });
  });

  it('has no clan when the player has no clan tag (the mapper still writes "No Clan · Member")', () => {
    const solo = { ...base, extraStats: [{ label: 'Clan', value: 'No Clan · Member' }], gameVisuals: { cr: {} } } as unknown as PlayerStats;
    expect(crFacts(solo).clan).toBeUndefined();
  });

  it('leaves missing figures undefined instead of zero', () => {
    expect(crFacts({} as PlayerStats)).toEqual({
      wins: undefined, losses: undefined, threeCrownWins: undefined, bestTrophies: undefined,
      donations: undefined, warDayWins: undefined, clan: undefined,
    });
  });
});
```

Run: `npx vitest run src/app/components` → FAIL (module not found).

- [ ] **Step 2: Implement `crFacts`**

Create `src/app/components/crFacts.ts`:

```ts
import type { PlayerStats } from '../data/mockStats';

/**
 * Numbers the Clash Royale overview needs that the API mapper only hands over
 * inside display strings ("4,210 wins · 3,388 losses", a crown emoji after a count). The data
 * layer is frozen for the restyle, so they are read back here, in one tested
 * place, instead of being split ad hoc inside JSX.
 */
export interface CRFacts {
  wins?: number;
  losses?: number;
  threeCrownWins?: number;
  bestTrophies?: number;
  donations?: number;
  warDayWins?: number;
  /** Present only when the player is in a clan. */
  clan?: { name: string; tag: string; role: string };
}

/** Digits of a formatted integer, whatever the locale's separators ("4.210", "4,210", "4 210"). */
export function parseCount(text: string | number | undefined): number | undefined {
  if (typeof text === 'number') return Number.isFinite(text) ? text : undefined;
  const digits = text?.replace(/\D/g, '');
  return digits ? Number(digits) : undefined;
}

const extra = (stats: PlayerStats, label: string) => stats.extraStats?.find((s) => s.label === label)?.value;

export function crFacts(stats: PlayerStats): CRFacts {
  const [wins, losses] = (stats.statLabels?.stat1Sub ?? '').split(' · ');
  const clanTag = stats.gameVisuals?.cr?.clanTag;
  const [clanName, role] = String(extra(stats, 'Clan') ?? '').split(' · ');
  return {
    wins: parseCount(wins),
    losses: parseCount(losses),
    threeCrownWins: parseCount(extra(stats, '3-Crown Wins')),
    bestTrophies: parseCount(stats.statLabels?.stat4Sub),
    donations: parseCount(extra(stats, 'Total Donations')),
    warDayWins: parseCount(extra(stats, 'War Day Wins')),
    clan: clanTag && clanName ? { name: clanName, tag: clanTag, role: role ?? '' } : undefined,
  };
}
```

Run: `npx vitest run src/app/components` → PASS (11 tests).

- [ ] **Step 3: Overview fixture data**

In `e2e/support/fixtures.ts`, in `crPlayer` delete the line `clan: { tag: '#2Y0Y', name: 'Lantern Watch' },` and add before `currentFavouriteCard`:

```ts
  clan: { tag: '#2Y0Y', name: 'Lantern Watch', badgeUrl: 'https://api-assets.clashroyale.com/badges/200/16000000.png' },
  totalDonations: 2048,
  warDayWins: 12,
  leagueStatistics: { currentSeason: { trophies: 9123 }, bestSeason: { id: '2026-08', trophies: 9288 } },
  currentPathOfLegendSeasonResult: { leagueNumber: 7, trophies: 1968, rank: 1520 },
  bestPathOfLegendSeasonResult: { leagueNumber: 10, trophies: 3371, rank: 37 },
  legacyTrophyRoadHighScore: 8063,
  badges: [
    { name: 'Classic12Wins', level: 3, maxLevel: 8, progress: 30, target: 50, iconUrls: { large: 'https://api-assets.clashroyale.com/badges/1.png' } },
    { name: 'YearsPlayed', level: 9, maxLevel: 10, progress: 3400, target: 3650, iconUrls: { large: 'https://api-assets.clashroyale.com/badges/2.png' } },
  ],
  achievements: [
    { name: 'Team Player', stars: 3, value: 1, target: 1, info: 'Join a clan' },
    { name: 'Gatherer', stars: 2, value: 1800, target: 3000, info: 'Collect 3000 cards' },
  ],
```

(The hero's league pill now reads "League 7": the mapper prefers the Path of Legend league. No existing test asserts the old "Legendary Arena" pill.)

- [ ] **Step 4: Failing e2e**

In `e2e/cr-panels.spec.ts` add `['overview', 9],` to `ART_TABS` (8 deck-preview cards + clan badge; badges are collapsed) and append:

```ts
test.describe('Overview tab', () => {
  test('starts with numbers the summary bar does not show, without repeating the player name', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr());
    const p = panel(page);
    await expect(p.getByText('Three-crown wins')).toBeVisible();
    await expect(p.getByText('1,530', { exact: true })).toBeVisible();
    await expect(p.getByText('Best trophies')).toBeVisible();
    await expect(p.getByText('9,301', { exact: true })).toBeVisible();
    // The hero already shows the name: the panel must not repeat it.
    await expect(p.getByText('Vela Storm')).toHaveCount(0);
    await expect(p.getByRole('heading', { name: 'Clan' })).toBeVisible();
    await expect(p.getByText('Elder', { exact: true })).toBeVisible();
    await expect(p.getByRole('heading', { name: 'Ranked seasons' })).toBeVisible();
    await expect(p.getByText('#1,520')).toBeVisible();
    await expect(p.getByText('Best season (2026-08)')).toBeVisible();
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('"View deck" opens the Deck tab', async ({ page }) => {
    await mockApi(page);
    await page.goto(cr());
    await panel(page).getByRole('button', { name: 'View deck' }).click();
    await expect(page).toHaveURL(cr('?tab=deck'));
  });

  test('hides the ranked seasons card when the player has no season data', async ({ page }) => {
    await mockApi(page, {
      patch: { 'clash-royale': { leagueStatistics: undefined, currentPathOfLegendSeasonResult: undefined, bestPathOfLegendSeasonResult: undefined, legacyTrophyRoadHighScore: 0 } },
    });
    await page.goto(cr());
    await expect(panel(page).getByRole('heading', { name: 'Clan' })).toBeVisible();
    await expect(panel(page).getByRole('heading', { name: 'Ranked seasons' })).toHaveCount(0);
  });

  test('a player without a clan says so instead of showing "No Clan" as a clan name', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-royale': { clan: undefined } } });
    await page.goto(cr());
    await expect(panel(page).getByText('Not in a clan right now.')).toBeVisible();
    await expect(panel(page).getByText('No Clan')).toHaveCount(0);
  });

  test('badges expand with a button that reports its state', async ({ page }) => {
    await mockApi(page);
    await page.goto(cr());
    const toggle = panel(page).getByRole('button', { name: /Badges/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(panel(page).getByTestId('badge-list')).toHaveCount(0);
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel(page).getByTestId('badge-list').getByRole('listitem')).toHaveCount(2);
  });
});
```

Run: `npm run build && npx playwright test e2e/cr-panels.spec.ts -g "Overview|overview:"` → FAIL (name repeated, "View deck" missing, empty "Ranked seasons" card for the patched player, "No Clan" shown, no `badge-list`).

- [ ] **Step 5: Rewrite `CROverview`**

Replace `src/app/components/CROverview.tsx` (LF):

```tsx
import { useId, useState } from 'react';
import { ArrowRight, Award, ChevronDown, Crown, Layers, Percent, Shield, Star, Swords, Trophy } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { GameImage } from '../ui/GameImage';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { sentenceCase } from '../ui/text';
import { crFacts } from './crFacts';

interface CROverviewProps {
    playerStats: PlayerStats;
    /** Opens the Deck tab (the deck preview's "View deck"). */
    onOpenDeck: () => void;
}

const n = (value: number | undefined) => (value === undefined ? '–' : value.toLocaleString('en-US'));

/**
 * Clash Royale overview. Name, tag, league, level and trophies are already in
 * the page's summary bar, so this starts with the numbers the bar does not show.
 */
export function CROverview({ playerStats, onOpenDeck }: CROverviewProps) {
    const cr = playerStats.gameVisuals?.cr;
    const badgesId = useId();
    const [badgesOpen, setBadgesOpen] = useState(false);
    if (!cr) return null;

    const facts = crFacts(playerStats);
    const deck = cr.currentDeck?.slice(0, 8) ?? [];
    const pol = cr.pathOfLegend;
    const league = cr.leagueStatistics;
    const legacyBest = cr.legacyTrophyRoadHighScore ?? 0;
    const hasPol = Boolean(pol?.currentSeason || pol?.bestSeason);
    const hasLeague = Boolean(league?.currentSeason || league?.bestSeason) || legacyBest > 0;
    const achievements = (cr.achievements ?? []).filter((a) => a.value > 0);
    const badges = cr.badges ?? [];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                    label="Win rate"
                    value={`${playerStats.winRate}%`}
                    sub={facts.wins !== undefined ? `${n(facts.wins)} W / ${n(facts.losses)} L` : undefined}
                    icon={<Percent />}
                />
                <StatTile label="Battles" value={n(playerStats.totalMatches)} icon={<Swords />} />
                <StatTile label="Three-crown wins" value={n(facts.threeCrownWins)} icon={<Crown />} />
                <StatTile label="Best trophies" value={n(facts.bestTrophies)} sub={cr.arenaName} icon={<Trophy />} />
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                <div className="min-w-0 space-y-4">
                    <Card as="section" title="Clan">
                        {facts.clan ? (
                            <>
                                <div className="mb-2 flex items-center gap-3">
                                    <GameImage sources={[cr.clanBadgeUrl]} alt="" width={40} height={40} fallback={<Shield />} className="size-10 shrink-0 object-contain" />
                                    <div className="min-w-0">
                                        <p dir="auto" className="truncate font-semibold text-fg">{facts.clan.name}</p>
                                        <p className="text-xs text-fg-subtle">{facts.clan.tag}</p>
                                    </div>
                                </div>
                                <div className="divide-y divide-line">
                                    <Row label="Role" value={sentenceCase(facts.clan.role)} />
                                    <Row label="Donations" value={n(facts.donations)} />
                                    <Row label="War day wins" value={n(facts.warDayWins)} />
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-fg-muted">Not in a clan right now.</p>
                        )}
                    </Card>

                    {deck.length > 0 && (
                        <Card
                            as="section"
                            title="Battle deck"
                            action={
                                <Button variant="ghost" onClick={onOpenDeck}>
                                    View deck
                                    <ArrowRight aria-hidden="true" />
                                </Button>
                            }
                        >
                            <ul className="grid grid-cols-4 gap-2">
                                {deck.map((card) => (
                                    <li key={card.id} className="flex justify-center rounded-lg bg-surface-2 p-1">
                                        <GameImage sources={[card.iconUrl]} alt={card.name} width={60} height={72} fallback={<Layers />} className="h-16 w-auto object-contain" />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>

                <div className="min-w-0 space-y-4 lg:col-span-2">
                    {(hasPol || hasLeague) && (
                        <Card as="section" title="Ranked seasons">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                {hasPol && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-fg-muted">Path of Legend</h4>
                                        <div className="divide-y divide-line">
                                            {pol?.currentSeason && <Row label="This season" value={pol.currentSeason.rank ? `#${n(pol.currentSeason.rank)}` : 'Unranked'} />}
                                            {pol?.bestSeason?.rank !== undefined && <Row label="Best season" value={`#${n(pol.bestSeason.rank)}`} />}
                                        </div>
                                    </div>
                                )}
                                {hasLeague && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-fg-muted">Trophy Road</h4>
                                        <div className="divide-y divide-line">
                                            {league?.currentSeason && <Row label="This season" value={n(league.currentSeason.trophies)} />}
                                            {league?.bestSeason && (
                                                <Row label={league.bestSeason.id ? `Best season (${league.bestSeason.id})` : 'Best season'} value={n(league.bestSeason.trophies)} />
                                            )}
                                            {legacyBest > 0 && <Row label="Legacy best" value={n(legacyBest)} />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {badges.length > 0 && (
                        <Card as="section" padding="none">
                            <h3>
                                <button
                                    type="button"
                                    aria-expanded={badgesOpen}
                                    aria-controls={badgesId}
                                    onClick={() => setBadgesOpen((open) => !open)}
                                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-card px-4 py-3 text-left text-sm font-semibold text-fg hover:bg-surface-2 sm:px-5"
                                >
                                    <span>
                                        Badges <span className="font-normal text-fg-subtle tabular-nums">({badges.length})</span>
                                    </span>
                                    <ChevronDown aria-hidden="true" className={cx('size-4 text-fg-muted transition-transform duration-200', badgesOpen && 'rotate-180')} />
                                </button>
                            </h3>
                            {badgesOpen && (
                                <ul
                                    id={badgesId}
                                    data-testid="badge-list"
                                    className="grid grid-cols-3 gap-3 px-4 pb-4 transition duration-200 ease-out-quick starting:-translate-y-1 starting:opacity-0 sm:grid-cols-5 sm:px-5 sm:pb-5 lg:grid-cols-6"
                                >
                                    {badges.map((badge, i) => (
                                        <li key={`${badge.name}-${i}`} className="flex min-w-0 flex-col items-center gap-1 text-center">
                                            <GameImage sources={[badge.iconUrl]} alt="" width={48} height={48} fallback={<Award />} className="size-12 object-contain" />
                                            <span className="w-full truncate text-xs text-fg-muted">{badge.name}</span>
                                            {badge.level > 0 && (
                                                <span className="text-xs text-fg-subtle tabular-nums">
                                                    Level {badge.level}{badge.maxLevel ? ` of ${badge.maxLevel}` : ''}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    )}

                    {achievements.length > 0 && (
                        <Card as="section" title="Achievements">
                            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {achievements.map((a) => {
                                    const pct = a.target ? Math.min(100, (a.value / a.target) * 100) : 100;
                                    return (
                                        <li key={a.name} className="rounded-card border border-line p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-sm font-semibold text-fg">{a.name}</span>
                                                <span className="flex shrink-0 gap-0.5" role="img" aria-label={`${a.stars} of 3 stars`}>
                                                    {[0, 1, 2].map((i) => (
                                                        <Star key={i} aria-hidden="true" className={cx('size-3.5', i < a.stars ? 'fill-accent text-accent' : 'text-fg-subtle')} />
                                                    ))}
                                                </span>
                                            </div>
                                            {a.info && <p className="mt-1 text-xs text-fg-subtle">{a.info}</p>}
                                            <div className="mt-3 flex items-center gap-3">
                                                <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-2">
                                                    <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs whitespace-nowrap text-fg-subtle tabular-nums">
                                                    {n(a.value)} / {n(a.target)}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
```

In `src/app/pages/game/ClashRoyale.tsx`, delete the comment line `{/* CROverview's "view deck" link still says 'deck'; older code said 'tower' for towers. */}` and the old `<CROverview … onTabChange={(id) => onTabChange(id === 'tower' ? 'towers' : id)} />`, add `const go = (id: CRTab) => onTabChange(id);` right above `switch (tab as CRTab) {`, and render:

```tsx
          <CROverview playerStats={playerStats} onOpenDeck={() => go('deck')} />
```

Also change `onShowBattles={() => onTabChange('battles')}` to `onShowBattles={() => go('battles')}` and the overview wrapper `space-y-8` to `space-y-4` (one rhythm with the cards inside).

- [ ] **Step 6: Gate, screenshots, look**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 169 passed (11 files); e2e 74 passed, 6 skipped; budget about `css 11.74`.

Run: `SCREENSHOT_DIR=/tmp/p2-shots/t5 SCREENSHOT_ONLY=clash-royale npm run screenshots` and look at `clash-royale-{390,1440}.png`. Check: no second name card under the hero; four tiles (2×2 at 390, one row at 1440) with "55%", "7,598", "1,530", "9,301 / Legendary Arena"; clan rows "Elder 2,048 12"; deck preview 4×2 with "View deck →" as a ghost button; "Ranked seasons" with Path of Legend and Trophy Road side by side from 640 px; "Badges (2)" collapsed with a chevron; achievements with accent stars; no tofu box, no uppercase eyebrow, nothing below white/60. Then open the badges in a real browser (`npm run preview`, click "Badges"): the list fades/slides in over 200 ms; with DevTools "Emulate prefers-reduced-motion: reduce" it appears instantly.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/crFacts.ts src/app/components/__tests__/crFacts.test.ts src/app/components/CROverview.tsx src/app/pages/game/ClashRoyale.tsx e2e/support/fixtures.ts e2e/cr-panels.spec.ts
git commit -m "feat(cr): overview on the design system without the duplicate identity card

Removes the 'tower' tab-id shim, the empty ranked-seasons card, emoji
glyphs and the inert animate-in classes (CSS transition with
@starting-style instead).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Battle rows and the trophy trend (shared with Brawl Stars)

**Files:**
- Modify: `src/app/components/MatchHistory.tsx` (whole file), `src/app/components/TrophyTrend.tsx`, `src/app/pages/game/OverviewExtras.tsx`, `src/app/pages/game/BrawlStars.tsx:62`, `src/app/pages/game/ClashRoyale.tsx`
- Create: `e2e/battle-rows.spec.ts`

**Interfaces:**
- Consumes: `Pill` tones `win`/`loss`/`draw` (contrast pinned by Task 1's test), `Card`.
- Produces: `MatchHistory({ matches: Match[] })` (no `accentColor`), an `<ol>` whose rows have `data-testid="battle-row"`; `OverviewExtras({ playerStats, chartColor, onShowBattles })` (no `accent`); CR Battles tab wrapped in `<Card title="Recent battles">` until Task 8 replaces it.

- [ ] **Step 1: Failing e2e**

Create `e2e/battle-rows.spec.ts` (the fixture has 4 CR battles at this point; Task 8 raises it to 5 in the overview):

```ts
import { test, expect } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

test('Clash Royale latest battles: result, mode, crowns and trophy change per row', async ({ page }) => {
  const problems = watch(page);
  await mockApi(page);
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  // On the overview the only battle rows are the "Latest battles" card.
  const latest = page.getByRole('tabpanel');
  const rows = latest.getByTestId('battle-row');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toBeVisible();
  const first = await rows.first().innerText();
  expect(first).toContain('Win');
  expect(first).toContain('Ladder');
  expect(first).toContain('+31');
  await expect(rows.first().getByText('Crowns', { exact: false })).toHaveCount(1);
  await expectNoEmoji(latest);
  expect(problems).toEqual([]);
});

test('Brawl Stars latest battles keep the duration next to the date', async ({ page }) => {
  await mockApi(page);
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
  await expect(page.getByTestId('battle-row').first()).toContainText('2m 1s');
});
```

Run: `npm run build && npx playwright test e2e/battle-rows.spec.ts` → FAIL (no `battle-row`).

- [ ] **Step 2: Rewrite `MatchHistory`**

Replace `src/app/components/MatchHistory.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Crown, Minus, Trophy, X } from 'lucide-react';
import type { Match } from '../data/mockStats';
import { cx } from '../ui/cx';
import { Pill, type PillTone } from '../ui/Pill';

interface MatchHistoryProps {
  matches: Match[];
}

const RESULT: Record<Match['result'], { label: string; tone: PillTone; icon: ReactNode }> = {
  win: { label: 'Win', tone: 'win', icon: <Trophy /> },
  loss: { label: 'Loss', tone: 'loss', icon: <X /> },
  draw: { label: 'Draw', tone: 'draw', icon: <Minus /> },
};

/**
 * A list of battles, newest first, one row each: result, mode and date, then
 * crowns and trophy change when the game reports them. Used by the
 * Clash Royale and Brawl Stars overviews and by the Clash Royale Battles tab;
 * the caller provides the surrounding Card.
 */
export function MatchHistory({ matches }: MatchHistoryProps) {
  // One trophy column for the whole list, so crowns line up when some battles moved no trophies.
  const trophyColumn = matches.some((m) => m.score !== undefined);
  return (
    <ol className="divide-y divide-line">
      {matches.map((match) => {
        const result = RESULT[match.result];
        return (
          <li key={match.id} data-testid="battle-row" className="flex min-h-14 items-center gap-3 py-3">
            <Pill tone={result.tone} icon={result.icon} className="w-20 shrink-0 justify-center">
              {result.label}
            </Pill>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{match.mode}</p>
              <p className="text-xs text-fg-subtle">
                {match.date}
                {match.duration && ` · ${match.duration}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4 text-sm tabular-nums">
              {match.kills !== undefined && (
                <span className="inline-flex items-center gap-1 text-fg-muted">
                  <Crown aria-hidden="true" className="size-4 text-fg-subtle" />
                  <span className="sr-only">Crowns </span>
                  {match.kills}–{match.deaths ?? 0}
                </span>
              )}
              {trophyColumn && (
                <span
                  className={cx(
                    'inline-flex w-12 items-center justify-end gap-1 font-semibold',
                    (match.score ?? 0) > 0 ? 'text-win' : (match.score ?? 0) < 0 ? 'text-loss' : 'text-fg-muted',
                  )}
                >
                  {match.score !== undefined && (
                    <>
                      <span className="sr-only">Trophies </span>
                      {match.score > 0 ? `+${match.score}` : match.score}
                    </>
                  )}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

Update the callers:
- `src/app/pages/game/OverviewExtras.tsx`: remove `accent: string;` from the props interface and from the destructuring; `<MatchHistory matches={latest} />`.
- `src/app/pages/game/BrawlStars.tsx:62` and `ClashRoyale.tsx`: drop `accent={accent}` / `accent={game.accent}` from `<OverviewExtras …>`.
- `ClashRoyale.tsx`, `case 'battles'`: wrap the list and import `Card` from `../../ui/Card`:

```tsx
      return playerStats.recentMatches.length > 0 ? (
        <Card as="section" title="Recent battles">
          <MatchHistory matches={playerStats.recentMatches} />
        </Card>
      ) : (
```

Also update the module's doc comment to `/** Clash Royale sections: overview | cards | deck | battles | towers. */`.

- [ ] **Step 3: `TrophyTrend` on tokens**

In `src/app/components/TrophyTrend.tsx` make exactly these replacements (old → new):

| Old | New |
|---|---|
| `const SURFACE = '#111827';` | `// Ring around the markers: the card surface, so they read as cut out of the line.` + newline + `const SURFACE = 'var(--surface-1)';` |
| `className="bg-[#111827] rounded-2xl p-6 border border-white/5"` | `className="rounded-card border border-line bg-surface-1 p-4 shadow-card sm:p-5"` |
| `<h3 className="text-base font-bold text-white">` | `<h3 className="text-sm font-semibold text-fg">` |
| `<span className="text-sm text-white/60 tabular-nums">` | `<span className="text-sm text-fg-muted tabular-nums">` |
| `<p className="text-xs text-white/50 mb-4">` | `<p className="mb-4 text-xs text-fg-subtle">` |
| `className="relative w-full outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-white/50"` | `className="relative w-full rounded-lg"` (the global focus ring applies) |
| `stroke="rgba(255,255,255,0.07)"` | `stroke="var(--border)"` |
| `className="fill-white/45 tabular-nums"` | `className="fill-fg-subtle tabular-nums"` |
| `className="fill-white/40"` | `className="fill-fg-subtle"` |
| `stroke="rgba(255,255,255,0.25)"` | `stroke="var(--border-strong)"` |
| `className="fill-white font-semibold tabular-nums"` | `className="fill-fg font-semibold tabular-nums"` |
| tooltip `className="pointer-events-none absolute -translate-x-1/2 z-10 px-3 py-2 rounded-xl bg-[#1F2937] border border-white/10 shadow-xl whitespace-nowrap"` | `className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line-strong bg-surface-2 px-3 py-2 shadow-card"` |
| `<span className="text-white font-bold text-sm tabular-nums">` | `<span className="text-sm font-semibold text-fg tabular-nums">` |
| `<span className="text-xs tabular-nums text-white/70">` | `<span className="text-xs tabular-nums text-fg-muted">` |
| `<div className="text-[11px] text-white/55 mt-0.5">` | `<div className="mt-0.5 text-xs text-fg-subtle">` |
| `<details className="mt-4 group">` | `<details className="mt-4">` |
| `<summary className="cursor-pointer text-xs text-white/60 hover:text-white/85 transition-colors select-none">` | `<summary className="cursor-pointer py-3 text-sm text-fg-muted transition-colors duration-150 select-none hover:text-fg">` (44 px target; no `flex`, which would hide the disclosure triangle) |
| `<div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-white/8">` | `<div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-line">` |
| `<thead className="sticky top-0 bg-[#1F2937]">` | `<thead className="sticky top-0 bg-surface-2">` |
| `<tr className="text-white/60 text-xs">` | `<tr className="text-xs text-fg-subtle">` |
| `<tr key={i} className="border-t border-white/5">` | `<tr key={i} className="border-t border-line">` |
| two `<td className="px-3 py-1.5 text-white/70">` | `<td className="px-3 py-1.5 text-fg-muted">` |
| `{d.mode ?? '—'}` | `{d.mode ?? '–'}` |
| `<td className="px-3 py-1.5 text-right text-white/70 tabular-nums">` | `<td className="px-3 py-1.5 text-right text-fg-muted tabular-nums">` |
| `<td className="px-3 py-1.5 text-right text-white tabular-nums">` | `<td className="px-3 py-1.5 text-right text-fg tabular-nums">` |

Check: `grep -nE "white|#[0-9A-Fa-f]{6}|\[#" src/app/components/TrophyTrend.tsx src/app/components/MatchHistory.tsx` prints nothing except the `whitespace-nowrap` class.

- [ ] **Step 4: Gate, screenshots, look**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: e2e 76 passed, 6 skipped; budget about `playerPageJs 155.18`, `css 11.57`.

Run: `SCREENSHOT_DIR=/tmp/p2-shots/t6 SCREENSHOT_ONLY=clash-royale npm run screenshots && SCREENSHOT_DIR=/tmp/p2-shots/t6 SCREENSHOT_ONLY=brawl npm run screenshots` and look at the CR overview, CR battles and BS overview. Check: each row = result pill (Win green, Loss red, Draw grey, all readable), mode with the date under it, crowns "3–1" with a crown icon, trophy change right-aligned in win/loss colour; at 390 nothing wraps or clips; the trend card matches the other cards (12 px radius, hairline, no darker panel), axis labels readable; the BS rows show "Oct 6 · 2m 1s".

- [ ] **Step 5: Commit**

```bash
git add src/app/components/MatchHistory.tsx src/app/components/TrophyTrend.tsx src/app/pages/game/OverviewExtras.tsx src/app/pages/game/BrawlStars.tsx src/app/pages/game/ClashRoyale.tsx e2e/battle-rows.spec.ts
git commit -m "feat(restyle): battle rows and trophy trend on tokens (AA loss pill, no sub-floor text)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Battle filter logic, the URL contract, and the mode-name bug

**Files:**
- Create: `src/app/ui/battleFilters.ts`, `src/app/ui/__tests__/battleFilters.test.ts`
- Modify: `src/app/ui/tabs.ts`, `src/app/ui/__tests__/tabs.test.ts`, `src/app/pages/GamePage.tsx`, `src/app/services/supercellService.ts` (**CRLF**, lines 42–58 and the four `prettyMode` calls), `src/app/services/__tests__/supercellService.test.ts`, `e2e/tabs.spec.ts`

**Interfaces:**
- Consumes: `parseTab` (Phase 1), `Match` (`mode: string`, `result: 'win' | 'loss' | 'draw'`).
- Produces (all exported from `src/app/ui/battleFilters.ts`):
  - `type BattleResult = 'win' | 'loss' | 'draw'`, `type ResultFilter = 'all' | BattleResult`, `RESULT_FILTERS: readonly ResultFilter[]`
  - `BATTLE_FILTER_PARAMS = ['mode', 'result'] as const`
  - `interface BattleLike { mode: string; result: BattleResult }`, `interface BattleFilters { mode: string; result: ResultFilter }`, `NO_FILTERS: BattleFilters`, `interface ModeOption { slug: string; label: string; count: number }`
  - `modeSlug(mode: string): string`, `battleModes(battles: readonly BattleLike[], result?: ResultFilter): ModeOption[]`, `resultCounts(battles: readonly BattleLike[], mode: string): Record<ResultFilter, number>`, `parseBattleFilters(search: string, modes: readonly ModeOption[]): BattleFilters`, `withBattleFilters(search: string, filters: BattleFilters): string`, `filterBattles<T extends BattleLike>(battles: readonly T[], filters: BattleFilters): T[]`
  - `src/app/ui/tabs.ts`: `withTab(search, id, defaultId, drop: readonly string[] = [])`, `shareSearch(search: string, id: string, defaultId: string, keep: readonly string[]): string`
  - `src/app/services/supercellService.ts`: `export function prettyMode(raw: string | undefined, game: 'clash-royale' | 'brawl-stars'): string`

- [ ] **Step 1: Failing unit tests for the filter logic**

Create `src/app/ui/__tests__/battleFilters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  battleModes, filterBattles, modeSlug, NO_FILTERS, parseBattleFilters, resultCounts, withBattleFilters,
  type BattleLike,
} from '../battleFilters';

const battles: BattleLike[] = [
  { mode: 'Ladder', result: 'win' },
  { mode: 'Path of Legend', result: 'loss' },
  { mode: 'Ladder', result: 'loss' },
  { mode: 'Ladder', result: 'draw' },
  { mode: 'Path of Legend', result: 'win' },
  { mode: 'River Race', result: 'win' },
];

describe('modeSlug', () => {
  it.each([
    ['Ladder', 'ladder'],
    ['Path of Legend', 'path-of-legend'],
    ['2v2 Challenge!', '2v2-challenge'],
    ['Méga Draft', 'mega-draft'],
    ['All', 'all-mode'],
    ['***', 'other'],
  ])('%j -> %j', (mode, slug) => {
    expect(modeSlug(mode)).toBe(slug);
  });
});

describe('battleModes', () => {
  it('lists each mode once, most played first, ties by name', () => {
    expect(battleModes(battles)).toEqual([
      { slug: 'ladder', label: 'Ladder', count: 3 },
      { slug: 'path-of-legend', label: 'Path of Legend', count: 2 },
      { slug: 'river-race', label: 'River Race', count: 1 },
    ]);
  });
  it('counts within the result filter but keeps every mode (no moving controls)', () => {
    expect(battleModes(battles, 'loss')).toEqual([
      { slug: 'ladder', label: 'Ladder', count: 1 },
      { slug: 'path-of-legend', label: 'Path of Legend', count: 1 },
      { slug: 'river-race', label: 'River Race', count: 0 },
    ]);
  });
  it('is empty for no battles', () => {
    expect(battleModes([])).toEqual([]);
  });
});

describe('resultCounts', () => {
  it('counts every result, or only the selected mode', () => {
    expect(resultCounts(battles, 'all')).toEqual({ all: 6, win: 3, loss: 2, draw: 1 });
    expect(resultCounts(battles, 'ladder')).toEqual({ all: 3, win: 1, loss: 1, draw: 1 });
  });
});

describe('parseBattleFilters', () => {
  const modes = battleModes(battles);
  it('reads known values, case-insensitively', () => {
    expect(parseBattleFilters('?tab=battles&mode=Path-Of-Legend&result=LOSS', modes)).toEqual({ mode: 'path-of-legend', result: 'loss' });
  });
  it('falls back to all for missing, empty or unknown values', () => {
    expect(parseBattleFilters('', modes)).toEqual(NO_FILTERS);
    expect(parseBattleFilters('?mode=&result=', modes)).toEqual(NO_FILTERS);
    expect(parseBattleFilters('?mode=brawl-ball&result=victory', modes)).toEqual(NO_FILTERS);
  });
  it('drops a mode this player has no battle in (an old shared link)', () => {
    expect(parseBattleFilters('?mode=ladder', battleModes([{ mode: 'River Race', result: 'win' }]))).toEqual(NO_FILTERS);
  });
});

describe('withBattleFilters', () => {
  it('writes non-default filters after the existing parameters', () => {
    expect(withBattleFilters('?tab=battles', { mode: 'ladder', result: 'win' })).toBe('?tab=battles&mode=ladder&result=win');
  });
  it('removes defaults and keeps the rest', () => {
    expect(withBattleFilters('?tab=battles&mode=ladder&result=win', { mode: 'all', result: 'win' })).toBe('?tab=battles&result=win');
    expect(withBattleFilters('?mode=ladder', NO_FILTERS)).toBe('');
  });
  it('round-trips through parseBattleFilters', () => {
    const modes = battleModes(battles);
    const filters = { mode: 'river-race', result: 'draw' } as const;
    expect(parseBattleFilters(withBattleFilters('?tab=battles', filters), modes)).toEqual(filters);
  });
});

describe('filterBattles', () => {
  it('applies both filters', () => {
    expect(filterBattles(battles, { mode: 'ladder', result: 'loss' })).toEqual([{ mode: 'Ladder', result: 'loss' }]);
    expect(filterBattles(battles, { mode: 'all', result: 'win' })).toHaveLength(3);
    expect(filterBattles(battles, NO_FILTERS)).toEqual(battles);
    expect(filterBattles(battles, { mode: 'river-race', result: 'loss' })).toEqual([]);
  });
});
```

Run: `npx vitest run src/app/ui/__tests__/battleFilters.test.ts` → FAIL (module not found).

- [ ] **Step 2: Implement `battleFilters.ts`**

Create `src/app/ui/battleFilters.ts`:

```ts
/**
 * Battles tab filters (mode, result), kept in the URL next to ?tab=battles:
 * `?tab=battles&mode=ladder&result=loss`. Pure functions, no React.
 *
 * Rules: "all" is written as no parameter; an unknown mode or result falls
 * back to "all" without rewriting the URL (same rule as ?tab=); the shell
 * drops both parameters whenever the tab changes (BATTLE_FILTER_PARAMS).
 */

export type BattleResult = 'win' | 'loss' | 'draw';
export type ResultFilter = 'all' | BattleResult;
export const RESULT_FILTERS: readonly ResultFilter[] = ['all', 'win', 'loss', 'draw'];

/** URL parameters owned by the Battles tab. */
export const BATTLE_FILTER_PARAMS = ['mode', 'result'] as const;

/** The two fields the filters read; the app's `Match` has both. */
export interface BattleLike {
  mode: string;
  result: BattleResult;
}

export interface BattleFilters {
  /** A mode slug from `battleModes`, or 'all'. */
  mode: string;
  result: ResultFilter;
}

export const NO_FILTERS: BattleFilters = { mode: 'all', result: 'all' };

export interface ModeOption {
  slug: string;
  label: string;
  /** Battles of this mode that also match the current result filter. */
  count: number;
}

/** URL-safe id of a mode label: 'Path of Legend' -> 'path-of-legend'. Never 'all'. */
export function modeSlug(mode: string): string {
  const slug = mode
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return 'other';
  return slug === 'all' ? 'all-mode' : slug;
}

/**
 * The modes present in `battles`, most played first (ties by label), each
 * counted among the battles that match `result`. A mode with no battle for
 * that result stays listed with count 0, so the controls never move.
 */
export function battleModes(battles: readonly BattleLike[], result: ResultFilter = 'all'): ModeOption[] {
  const seen = new Map<string, { label: string; total: number; count: number }>();
  for (const b of battles) {
    const slug = modeSlug(b.mode);
    const entry = seen.get(slug) ?? { label: b.mode, total: 0, count: 0 };
    entry.total += 1;
    if (result === 'all' || b.result === result) entry.count += 1;
    seen.set(slug, entry);
  }
  return [...seen.entries()]
    .sort(([, a], [, b]) => b.total - a.total || a.label.localeCompare(b.label))
    .map(([slug, { label, count }]) => ({ slug, label, count }));
}

/** How many battles of the selected mode ended in each result ('all' = every result). */
export function resultCounts(battles: readonly BattleLike[], mode: string): Record<ResultFilter, number> {
  const counts: Record<ResultFilter, number> = { all: 0, win: 0, loss: 0, draw: 0 };
  for (const b of battles) {
    if (mode !== 'all' && modeSlug(b.mode) !== mode) continue;
    counts.all += 1;
    counts[b.result] += 1;
  }
  return counts;
}

/** The filters named in `search`; anything missing or unknown is 'all'. */
export function parseBattleFilters(search: string, modes: readonly ModeOption[]): BattleFilters {
  const params = new URLSearchParams(search);
  const mode = params.get('mode')?.trim().toLowerCase() ?? '';
  const result = params.get('result')?.trim().toLowerCase() ?? '';
  return {
    mode: modes.some((m) => m.slug === mode) ? mode : 'all',
    result: (RESULT_FILTERS as readonly string[]).includes(result) ? (result as ResultFilter) : 'all',
  };
}

/** `search` with the filters written in (defaults removed); other parameters kept. Returns '' or '?…'. */
export function withBattleFilters(search: string, filters: BattleFilters): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of [['mode', filters.mode], ['result', filters.result]] as const) {
    if (value === 'all') params.delete(key);
    else params.set(key, value);
  }
  const next = params.toString();
  return next ? `?${next}` : '';
}

export function filterBattles<T extends BattleLike>(battles: readonly T[], filters: BattleFilters): T[] {
  return battles.filter(
    (b) => (filters.mode === 'all' || modeSlug(b.mode) === filters.mode) && (filters.result === 'all' || b.result === filters.result),
  );
}
```

Run: `npx vitest run src/app/ui/__tests__/battleFilters.test.ts` → PASS (17 tests). (The `\p{M}` strip is what turns "Méga" into "mega"; without it the slug is "me-ga".)

- [ ] **Step 3: Failing unit tests for `withTab(…, drop)` and `shareSearch`**

In `src/app/ui/__tests__/tabs.test.ts` change the import to `import { parseTab, shareSearch, withTab } from '../tabs';` and append:

```ts
describe('withTab with parameters to drop', () => {
  it('drops the leaving tab\'s parameters and keeps the rest', () => {
    expect(withTab('?tab=battles&mode=ladder&result=loss&ref=share', 'deck', 'overview', ['mode', 'result'])).toBe('?tab=deck&ref=share');
    expect(withTab('?tab=battles&result=loss', 'overview', 'overview', ['mode', 'result'])).toBe('');
  });
});

describe('shareSearch', () => {
  const KEEP = ['mode', 'result'];
  it('writes the tab first, then the kept parameters, nothing else', () => {
    expect(shareSearch('?result=loss&ref=x&mode=ladder&tab=battles', 'battles', 'overview', KEEP)).toBe('?tab=battles&mode=ladder&result=loss');
  });
  it('is canonical for the default tab without kept parameters', () => {
    expect(shareSearch('?ref=x', 'overview', 'overview', KEEP)).toBe('');
    expect(shareSearch('', 'deck', 'overview', KEEP)).toBe('?tab=deck');
  });
});
```

Run: `npx vitest run src/app/ui/__tests__/tabs.test.ts` → FAIL.

- [ ] **Step 4: Implement them**

In `src/app/ui/tabs.ts` replace the `withTab` doc comment and signature with:

```ts
/**
 * `search` with `?tab=` set to `id`; the default tab is written as no
 * parameter at all, so the plain player URL stays canonical. Other
 * parameters are kept, except those in `drop` (parameters that belong to
 * the tab being left, like the Battles filters). Returns '' or a string
 * starting with '?'.
 */
export function withTab(search: string, id: string, defaultId: string, drop: readonly string[] = []): string {
  const params = new URLSearchParams(search);
  for (const key of drop) params.delete(key);
```

(the rest of the body is unchanged) and append:

```ts
/**
 * Query string of a shareable link: the tab first, then only the `keep`
 * parameters present in `search` (in `keep` order). Anything else in the
 * address bar is left out. Returns '' or a string starting with '?'.
 */
export function shareSearch(search: string, id: string, defaultId: string, keep: readonly string[]): string {
  const current = new URLSearchParams(search);
  const params = new URLSearchParams(withTab('', id, defaultId));
  for (const key of keep) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
  const next = params.toString();
  return next ? `?${next}` : '';
}
```

Run: `npx vitest run src/app/ui` → PASS.

- [ ] **Step 5: Wire the contract into the shell (D25)**

In `src/app/pages/GamePage.tsx`:
- imports: `import { BATTLE_FILTER_PARAMS } from '../ui/battleFilters';` and `import { parseTab, shareSearch, withTab } from '../ui/tabs';`
- replace the `activeTab`/`selectTab` block with:

```tsx
  const tabIds = tabs.map((t) => t.id);
  const activeTab = parseTab(location.search, tabIds, defaultTab);
  // Clicks push a history entry (back returns to the previous section); arrow keys replace it.
  // Reads window.location, not the rendered `location`: two quick key presses
  // can arrive before the first URL change has re-rendered this component.
  // Selecting the tab already shown does nothing (its Battles filters stay);
  // moving to another tab drops the filters, which belong to the Battles tab.
  const selectTab = (id: string, via: 'pointer' | 'keyboard' = 'pointer') => {
    const { pathname, search, hash } = window.location;
    if (parseTab(search, tabIds, defaultTab) === id) return;
    navigate(pathname + withTab(search, id, defaultTab, BATTLE_FILTER_PARAMS) + hash, { replace: via === 'keyboard' });
  };
```

- in `copyPlayerLink` replace the `const url = …` line with:

```tsx
      // The tab and, on Battles, its filters: what the visitor is looking at, nothing else.
      const query = shareSearch(window.location.search, activeTab, defaultTab, BATTLE_FILTER_PARAMS);
      const url = `${window.location.origin}/game/${gameId}/player/${tagSlug(urlTag ?? '')}${query}`;
```

Append to `e2e/tabs.spec.ts`:

```ts
test('leaving the Battles tab drops its filters; clicking Battles again keeps them', async ({ page }) => {
  await page.goto(player('clash-royale', '?tab=battles&result=loss&ref=share'));
  await page.getByRole('tab', { name: 'Battles' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles&result=loss&ref=share'));
  await page.getByRole('tab', { name: 'Deck' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=deck&ref=share'));
  await page.goBack();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles&result=loss&ref=share'));
});

test('Copy link on Battles keeps the filters and nothing else', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(player('clash-royale', '?ref=x&result=loss&tab=battles'));
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`${new URL(page.url()).origin}${player('clash-royale', '?tab=battles&result=loss')}`);
});
```

Run: `npm run build && npx playwright test e2e/tabs.spec.ts e2e/player.spec.ts` → all PASS (the existing "Copy link puts the canonical player URL" test still gets `?tab=deck`).

- [ ] **Step 6: Failing test for the `prettyMode` bug (D23)**

In `src/app/services/__tests__/supercellService.test.ts` add `prettyMode` to the import list and append:

```ts
describe('prettyMode', () => {
  it('names the API battle types', () => {
    expect(prettyMode('PvP', 'clash-royale')).toBe('Ladder');
    expect(prettyMode('pathOfLegend', 'clash-royale')).toBe('Path of Legend');
    expect(prettyMode('clanMate', 'clash-royale')).toBe('Clan Mate');
    expect(prettyMode('gemGrab', 'brawl-stars')).toBe('Gem Grab');
    expect(prettyMode(undefined, 'brawl-stars')).toBe('Battle');
  });
  it('reads "unknown" per game: Brawl Hockey is a Brawl Stars mode only', () => {
    expect(prettyMode('unknown', 'brawl-stars')).toBe('Brawl Hockey');
    expect(prettyMode('unknown', 'clash-royale')).toBe('Special event');
  });
});
```

Run: `npx vitest run src/app/services` → FAIL (`prettyMode` not exported).

- [ ] **Step 7: Fix it (CRLF file)**

Edit `src/app/services/supercellService.ts` with an editor that keeps CRLF (the Edit tool does; a Python text-mode rewrite does not). Delete `    unknown: 'Brawl Hockey',` from `MODE_ALIASES`, then replace `function prettyMode(raw: string | undefined): string {` … `if (MODE_ALIASES[raw]) return MODE_ALIASES[raw];` with:

```ts
// "unknown" means a different thing in each game: Brawl Stars sends it for
// Brawl Hockey, Clash Royale for event modes without a type name. Sharing one alias
// labelled any Clash Royale battle of type "unknown" as "Brawl Hockey".
const GAME_MODE_ALIASES: Record<'clash-royale' | 'brawl-stars', Record<string, string>> = {
    'clash-royale': { unknown: 'Special event' },
    'brawl-stars': { unknown: 'Brawl Hockey' },
};

export function prettyMode(raw: string | undefined, game: 'clash-royale' | 'brawl-stars'): string {
    if (!raw) return 'Battle';
    const alias = GAME_MODE_ALIASES[game][raw] ?? MODE_ALIASES[raw];
    if (alias) return alias;
```

(the two spacing lines after it are unchanged) and pass the game at the four call sites: `prettyMode(b.type, 'clash-royale')` twice in `searchClashRoyale` (recent matches and trophy trend), `prettyMode(b.event?.mode ?? b.battle?.mode, 'brawl-stars')` twice in `searchBrawlStars`.

Run: `echo $(grep -c $'\r$' src/app/services/supercellService.ts) $(wc -l < src/app/services/supercellService.ts)` → two equal numbers (926 926); `git diff --stat src/app/services/supercellService.ts` → about 15 insertions, 7 deletions (a whole-file diff means the line endings were lost: run `perl -pi -e 's/\r?\n/\r\n/'` on it).
Run: `npx vitest run src/app/services` → PASS.

- [ ] **Step 8: Gate and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 191 passed (12 files); e2e 78 passed, 6 skipped; budget about `playerPageJs 155.30`. No visible change yet (the Battles tab does not read the filters until Task 8), so no screenshots.

```bash
git add src/app/ui/battleFilters.ts src/app/ui/__tests__/battleFilters.test.ts src/app/ui/tabs.ts src/app/ui/__tests__/tabs.test.ts src/app/pages/GamePage.tsx src/app/services/supercellService.ts src/app/services/__tests__/supercellService.test.ts e2e/tabs.spec.ts
git commit -m "feat(battles): filter logic and URL contract; fix 'unknown' CR battles named Brawl Hockey

?mode=&result= are dropped when the tab changes and kept by Copy link.
prettyMode now takes the game: 'unknown' is Brawl Hockey only in Brawl Stars.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Battles tab with filters

**Files:**
- Create: `src/app/ui/FilterGroup.tsx`, `src/app/pages/game/BattlesPanel.tsx`, `e2e/battles.spec.ts`
- Modify: `src/app/pages/game/ClashRoyale.tsx` (final form below), `e2e/support/fixtures.ts`, `e2e/support/mockApi.ts`, `e2e/battle-rows.spec.ts`

**Interfaces:**
- Consumes: everything in `battleFilters.ts` (Task 7), `MatchHistory` (Task 6), `Button`, `Card`, `EmptyState`; `useLocation`/`useNavigate` from `react-router` (the module renders inside the router).
- Produces:
  - `FilterGroup({ legend: string; options: readonly FilterOption[]; value: string; onChange: (value: string) => void })`, `FilterOption = { value: string; label: string; count: number }`; renders `role="group"` named by its legend, radios named "<label> <count>".
  - `BattlesPanel({ matches: Match[] })`; filter card is `<section aria-label="Battle filters">`; status line "Showing n of m recent battles" (`aria-live="polite"`, no `role=status`, so `getByRole('status')` in older tests stays unique).
  - e2e: `MockApiOptions.battlelog?: Partial<Record<'clash-royale' | 'brawl-stars', unknown>>`; `crBattlelog` = 9 battles (5 W / 3 L / 1 D; Ladder 4, Path of Legend 3, River Race 1, Special event 1).

- [ ] **Step 1: Fixture: varied battles, battle-log override**

In `e2e/support/fixtures.ts` change the `crBattle` helper's first two lines to:

```ts
const crBattle = (minutesAgo: number, my: number, opp: number, trophyChange?: number, type = 'PvP') => ({
  type,
```

and replace `export const crBattlelog = …` with:

```ts
// Newest first. 9 battles: 5 wins, 3 losses, 1 draw; Ladder 4, Path of Legend 3,
// River Race 1 (a win), Special event 1 (type "unknown", a loss).
export const crBattlelog = [
  crBattle(5, 3, 1, 31),
  crBattle(30, 0, 1, -28),
  crBattle(60, 1, 1, 0),
  crBattle(90, 2, 0, 30),
  crBattle(120, 1, 0, undefined, 'pathOfLegend'),
  crBattle(150, 0, 2, undefined, 'pathOfLegend'),
  crBattle(180, 2, 1, undefined, 'riverRacePvP'),
  crBattle(210, 0, 3, undefined, 'unknown'),
  crBattle(240, 3, 0, undefined, 'pathOfLegend'),
];
```

In `e2e/support/mockApi.ts` add to `MockApiOptions`:

```ts
  /** Replaces a game's battlelog fixture (the raw API payload). */
  battlelog?: Partial<Record<'clash-royale' | 'brawl-stars', unknown>>;
```

and replace the battlelog `return` with:

```ts
      if (path.startsWith('/api/clash-royale/')) return json(options.battlelog?.['clash-royale'] ?? crBattlelog);
      return json(options.battlelog?.['brawl-stars'] ?? bsBattlelog);
```

In `e2e/battle-rows.spec.ts` change `toHaveCount(4)` to `toHaveCount(5)` (the overview shows the latest 5 of now 9 battles).

- [ ] **Step 2: Failing e2e**

Create `e2e/battles.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { crBattlelog } from './support/fixtures';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

// Fixture: 9 battles, 5 wins / 3 losses / 1 draw; Ladder 4, Path of Legend 3, River Race 1, Special event 1.
const url = (search = '') => `/game/clash-royale/player/${FIXTURE_TAG}${search}`;
const rows = (page: Page) => page.getByRole('tabpanel').getByTestId('battle-row');
const result = (page: Page) => page.getByRole('group', { name: 'Result' });
const mode = (page: Page) => page.getByRole('group', { name: 'Mode' });
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('every option shows its count, and the list starts unfiltered', async ({ page }) => {
  const problems = watch(page);
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  await expect(result(page).getByRole('radio', { name: 'All 9' })).toBeChecked();
  await expect(result(page).getByRole('radio', { name: 'Wins 5' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Losses 3' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Draws 1' })).toBeVisible();
  // Most played first; the accessible name is "<label> <count>".
  const modeNames = await mode(page).getByRole('radio').evaluateAll((els) => els.map((el) => el.closest('label')!.textContent!.replace(/(\D)(\d)/, '$1 $2')));
  expect(modeNames).toEqual(['All modes 9', 'Ladder 4', 'Path of Legend 3', 'River Race 1', 'Special event 1']);
  await expect(page.getByText('Showing 9 of 9 recent battles')).toBeVisible();
  await expectNoEmoji(page.getByRole('tabpanel'));
  expect(problems).toEqual([]);
});

test('a result filter updates the URL and the list, survives a reload and Back after another tab', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await result(page).getByText('Losses').click();
  await expect(rows(page)).toHaveCount(3);
  for (const row of await rows(page).all()) await expect(row).toContainText('Loss');
  expect(params(page)).toEqual({ tab: 'battles', result: 'loss' });
  // Counts of the other group follow the selected result.
  await expect(mode(page).getByRole('radio', { name: /Ladder\s*1/ })).toBeVisible();

  await page.reload();
  await expect(result(page).getByRole('radio', { name: /Losses/ })).toBeChecked();
  await expect(rows(page)).toHaveCount(3);

  await page.getByRole('tab', { name: 'Deck' }).click();
  expect(params(page)).toEqual({ tab: 'deck' });
  await page.goBack();
  expect(params(page)).toEqual({ tab: 'battles', result: 'loss' });
  await expect(rows(page)).toHaveCount(3);
});

test('filter changes replace the history entry instead of adding one', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  const length = await page.evaluate(() => history.length);
  await result(page).getByText('Wins').click();
  await mode(page).getByText('Ladder').click();
  await expect(rows(page)).toHaveCount(2);
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test('mode and result combine; no match shows an empty state that resets both', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=river-race&result=draw'));
  await expect(rows(page)).toHaveCount(0);
  const empty = page.getByTestId('empty-state');
  await expect(empty.getByText('No battles match these filters')).toBeVisible();
  await empty.getByRole('button', { name: 'Show all battles' }).click();
  await expect(rows(page)).toHaveCount(9);
  expect(params(page)).toEqual({ tab: 'battles' });
});

test('"Special event" is how a Clash Royale battle of type unknown is named', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=special-event'));
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Special event');
  await expect(page.getByText('Brawl Hockey')).toHaveCount(0);
});

test('unknown or empty filter values fall back to all without rewriting the URL', async ({ page }) => {
  const problems = watch(page);
  await page.goto(url('?tab=battles&mode=brawl-ball&result=victory'));
  await expect(rows(page)).toHaveCount(9);
  await expect(result(page).getByRole('radio', { name: /^All/ })).toBeChecked();
  await expect(mode(page).getByRole('radio', { name: /All modes/ })).toBeChecked();
  expect(params(page)).toEqual({ tab: 'battles', mode: 'brawl-ball', result: 'victory' });
  expect(problems).toEqual([]);
});

test('filters are a keyboard radio group: Tab enters on the checked option, arrows select', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  await result(page).getByRole('radio', { name: /^All/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(result(page).getByRole('radio', { name: /Wins/ })).toBeFocused();
  await expect(result(page).getByRole('radio', { name: /Wins/ })).toBeChecked();
  await expect(rows(page)).toHaveCount(5);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(rows(page)).toHaveCount(1);
  expect(params(page)).toEqual({ tab: 'battles', result: 'draw' });
  await page.keyboard.press('Tab');
  await expect(mode(page).getByRole('radio', { name: /All modes/ })).toBeFocused();
});

test('the focused filter shows a visible focus ring', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await result(page).getByRole('radio', { name: /^All/ }).focus();
  await page.keyboard.press('ArrowRight');
  const outline = await result(page).locator('label').nth(1).locator('span').first().evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(parseFloat(outline)).toBeGreaterThanOrEqual(2);
});

test('a player whose battles are all one mode gets no mode filter', async ({ page }) => {
  await mockApi(page, { battlelog: { 'clash-royale': crBattlelog.slice(0, 4) } });
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(4);
  await expect(result(page)).toBeVisible();
  await expect(mode(page)).toHaveCount(0);
});

test('a player without battles gets the empty state, not empty filters', async ({ page }) => {
  await mockApi(page, { battlelog: { 'clash-royale': [] } });
  await page.goto(url('?tab=battles'));
  await expect(page.getByTestId('empty-state').getByText('No recent battles')).toBeVisible();
  await expect(result(page)).toHaveCount(0);
});

test('filtering never moves the filters or the top of the list', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  const filters = page.getByRole('region', { name: 'Battle filters' });
  const before = { filters: await filters.boundingBox(), list: await rows(page).first().boundingBox() };
  for (const option of ['Losses', 'Draws', 'Wins']) {
    await result(page).getByText(option).click();
    await expect(result(page).getByRole('radio', { name: new RegExp(option) })).toBeChecked();
    expect(await filters.boundingBox()).toEqual(before.filters);
    expect((await rows(page).first().boundingBox())!.y).toBe(before.list!.y);
  }
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('no sideways scroll and every filter option is 44px tall', async ({ page }) => {
    await page.goto(url('?tab=battles'));
    await expect(rows(page)).toHaveCount(9);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page.getByRole('tabpanel').getByRole('group').locator('label'));
    await mode(page).getByText('Path of Legend').click();
    await expect(rows(page)).toHaveCount(3);
    await expectNoHorizontalScroll(page);
  });
});
```

Run: `npm run build && npx playwright test e2e/battles.spec.ts` → FAIL (no filter groups). The two "Special event"/fallback tests may already pass on the row count; that is fine.

- [ ] **Step 3: `FilterGroup`**

Create `src/app/ui/FilterGroup.tsx`:

```tsx
import { useId } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterGroupProps {
  /** Visible name of the group ("Result"); also its accessible name. */
  legend: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Single-choice filter as a native radio group styled as pills: Tab enters
 * the group on the checked option, arrow keys move and select (browser
 * behaviour), each option says how many battles it would show. Wraps on
 * narrow screens; selecting never changes the group's size.
 */
export function FilterGroup({ legend, options, value, onChange }: FilterGroupProps) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-medium text-fg-subtle">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-line bg-surface-1 px-4 text-sm font-medium text-fg-muted transition-colors duration-150 select-none peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-contrast peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg hover:border-line-strong">
              {option.label}
              <span className="tabular-nums">{option.count}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

Notes: the selected pill is `bg-accent` + `text-accent-contrast` (5.98:1); unselected `text-fg-muted` on surface-1 (9.1:1); the count inherits the label colour (never dimmed with opacity, which would drop below white/60); hover changes only the border (D41); the focus ring is drawn on the pill (`peer-focus-visible:`), the input itself is `sr-only` but focusable.

- [ ] **Step 4: `BattlesPanel`**

Create `src/app/pages/game/BattlesPanel.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router';
import { SearchX, Swords } from 'lucide-react';
import { MatchHistory } from '../../components/MatchHistory';
import type { Match } from '../../data/mockStats';
import {
  battleModes, filterBattles, NO_FILTERS, parseBattleFilters, resultCounts, withBattleFilters,
  type BattleFilters, type ResultFilter,
} from '../../ui/battleFilters';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { FilterGroup } from '../../ui/FilterGroup';

const RESULT_LABELS: Record<ResultFilter, string> = { all: 'All', win: 'Wins', loss: 'Losses', draw: 'Draws' };

/**
 * Battles tab: the recent battles with mode and result filters kept in the
 * URL (?mode=&result=, see ui/battleFilters.ts). Filter changes replace the
 * history entry, so Back still leaves the tab instead of undoing filters.
 */
export function BattlesPanel({ matches }: { matches: Match[] }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (matches.length === 0) {
    return (
      <EmptyState icon={<Swords />} title="No recent battles">
        Battles from the last few days appear here once this player has played.
      </EmptyState>
    );
  }

  const allModes = battleModes(matches);
  const filters = parseBattleFilters(location.search, allModes);
  const modes = battleModes(matches, filters.result);
  const results = resultCounts(matches, filters.mode);
  const shown = filterBattles(matches, filters);

  // Reads window.location: a second arrow key can arrive before this re-renders.
  const apply = (change: Partial<BattleFilters>) => {
    const { pathname, search, hash } = window.location;
    const next = { ...parseBattleFilters(search, allModes), ...change };
    navigate(pathname + withBattleFilters(search, next) + hash, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Card as="section" aria-label="Battle filters" className="grid grid-cols-1 gap-4">
        <FilterGroup
          legend="Result"
          value={filters.result}
          onChange={(result) => apply({ result: result as ResultFilter })}
          options={(Object.keys(RESULT_LABELS) as ResultFilter[]).map((r) => ({ value: r, label: RESULT_LABELS[r], count: results[r] }))}
        />
        {allModes.length > 1 && (
          <FilterGroup
            legend="Mode"
            value={filters.mode}
            onChange={(mode) => apply({ mode })}
            options={[
              { value: 'all', label: 'All modes', count: modes.reduce((sum, m) => sum + m.count, 0) },
              ...modes.map((m) => ({ value: m.slug, label: m.label, count: m.count })),
            ]}
          />
        )}
      </Card>

      <p aria-live="polite" className="text-sm text-fg-muted">
        Showing {shown.length} of {matches.length} recent battles
      </p>

      {shown.length > 0 ? (
        <Card as="section" title="Recent battles">
          <MatchHistory matches={shown} />
        </Card>
      ) : (
        <EmptyState
          icon={<SearchX />}
          title="No battles match these filters"
          action={<Button onClick={() => apply(NO_FILTERS)}>Show all battles</Button>}
        >
          None of the last {matches.length} battles fits this mode and result.
        </EmptyState>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Use it in the CR module**

`src/app/pages/game/ClashRoyale.tsx` final content:

```tsx
import { Swords } from 'lucide-react';
import { CRCardsList } from '../../components/CRCardsList';
import { CRDeck } from '../../components/CRDeck';
import { CROverview } from '../../components/CROverview';
import { CRTowerTroops } from '../../components/CRTowerTroops';
import { EmptyState } from '../../ui/EmptyState';
import { BattlesPanel } from './BattlesPanel';
import { OverviewExtras } from './OverviewExtras';
import type { TabId } from './tabs';
import type { GameModuleProps } from './types';

type CRTab = TabId<'clash-royale'>;

/** Clash Royale sections: overview | cards | deck | battles | towers. */
export default function ClashRoyale({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const cr = playerStats.gameVisuals?.cr;
  if (!cr) {
    return (
      <EmptyState icon={<Swords />} title="No Clash Royale profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }

  // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
  const go = (id: CRTab) => onTabChange(id);
  switch (tab as CRTab) {
    case 'cards':
      return <CRCardsList cards={cr.cards} />;
    case 'deck':
      return <CRDeck playerStats={playerStats} />;
    case 'towers':
      return <CRTowerTroops playerStats={playerStats} />;
    case 'battles':
      return <BattlesPanel matches={playerStats.recentMatches} />;
    default:
      return (
        <div className="space-y-4">
          <CROverview playerStats={playerStats} onOpenDeck={() => go('deck')} />
          <OverviewExtras playerStats={playerStats} chartColor={game.chartPrimary} onShowBattles={() => go('battles')} />
        </div>
      );
  }
}
```

- [ ] **Step 6: Run the battles e2e three times**

Run: `npx playwright test e2e/battles.spec.ts --repeat-each=3 --workers=6`
Expected: 36 passed, no flake.

- [ ] **Step 7: Gate, screenshots, look**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: e2e 90 passed, 6 skipped; budget about `playerPageJs 155.83`, `css 11.68` (growth from the start: +0.76 KB JS, −0.86 KB CSS).

Run: `SCREENSHOT_DIR=/tmp/p2-shots/t8 SCREENSHOT_ONLY=clash-royale-battles npm run screenshots` and look at all six PNGs. Check: "Result" and "Mode" legends in subtle text; pills 44 px, counts next to labels, selected pill solid blue with dark text; at 390 the pills wrap onto two lines without scrolling sideways; "Showing 3 of 9 recent battles" on the losses view; rows only "Loss"; crowns column aligned on every row (the trophy column is reserved for the whole list); "River Race 0" still listed when Losses is selected.

- [ ] **Step 8: Commit**

```bash
git add src/app/ui/FilterGroup.tsx src/app/pages/game/BattlesPanel.tsx src/app/pages/game/ClashRoyale.tsx e2e/battles.spec.ts e2e/battle-rows.spec.ts e2e/support/fixtures.ts e2e/support/mockApi.ts
git commit -m "feat(cr): battles tab with mode and result filters in the URL

Native radio groups with counts, empty state with reset, filter changes
replace history, no layout shift while filtering.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Layout-stability sweep over every Clash Royale tab

**Files:**
- Modify: `e2e/overflow.spec.ts`, `e2e/cls.spec.ts`

**Interfaces:**
- Consumes: CR tab ids, the badges toggle (Task 5), the filter pills (Task 8).
- Produces: per-frame overflow recorder and CLS ≤ 0.05 checks for overview, cards, deck, battles (plain and filtered) and towers; one interaction test (open badges, switch filters) recorded frame by frame at 320 px.

- [ ] **Step 1: Extend the per-frame overflow recorder**

Replace `e2e/overflow.spec.ts` with:

```ts
import { test, expect } from '@playwright/test';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

/**
 * Records, frame by frame from navigation start, how far the page is wider
 * than the viewport. A settled-page check misses a one-frame overflow.
 */
test.use({ viewport: { width: 320, height: 640 } });

// Every Clash Royale tab (phase 2 restyle) plus the other games' landing tab.
const PAGES = [
  ...['', '?tab=cards', '?tab=deck', '?tab=battles', '?tab=battles&result=loss&mode=ladder', '?tab=towers'].map((search) => ({ game: 'clash-royale', search })),
  { game: 'brawl-stars', search: '' },
];

for (const { game, search } of PAGES) {
  test(`${game}${search}: no frame of the load overflows a 320px screen`, async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      const w = window as unknown as { __maxOverflow: number };
      w.__maxOverflow = 0;
      const sample = () => {
        const root = document.documentElement;
        if (root) w.__maxOverflow = Math.max(w.__maxOverflow, root.scrollWidth - root.clientWidth);
      };
      const loop = () => {
        sample();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      // Also sample synchronously after every DOM change, before the next paint.
      new MutationObserver(sample).observe(document, { childList: true, subtree: true, attributes: true });
    });
    await page.goto(`/game/${game}/player/${FIXTURE_TAG}${search}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as unknown as { __maxOverflow: number }).__maxOverflow)).toBe(0);
  });
}

test('opening the badges and switching battle filters never overflows a 320px screen', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __maxOverflow: number };
    w.__maxOverflow = 0;
    const sample = () => {
      const root = document.documentElement;
      if (root) w.__maxOverflow = Math.max(w.__maxOverflow, root.scrollWidth - root.clientWidth);
    };
    const loop = () => {
      sample();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    new MutationObserver(sample).observe(document, { childList: true, subtree: true, attributes: true });
  });
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  await page.getByRole('button', { name: /Badges/ }).click();
  await expect(page.getByTestId('badge-list')).toBeVisible();
  await page.getByRole('tab', { name: 'Battles' }).click();
  for (const option of ['Losses', 'Draws', 'Path of Legend', 'All modes', 'All']) {
    await page.getByRole('tabpanel').locator('label').filter({ hasText: new RegExp(`^${option}\\s*\\d+$`) }).click();
  }
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { __maxOverflow: number }).__maxOverflow)).toBe(0);
});
```

- [ ] **Step 2: Extend the CLS check**

In `e2e/cls.spec.ts` replace `const GAMES = ['clash-royale', 'brawl-stars'];` and the loop header with:

```ts
const PAGES = [
  ...['', '?tab=cards', '?tab=deck', '?tab=battles', '?tab=towers'].map((search) => ({ game: 'clash-royale', search })),
  { game: 'brawl-stars', search: '' },
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const { game, search } of PAGES) {
    test(`${game}${search} player page shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
```

and the `goto` with ``await page.goto(`/game/${game}/player/${FIXTURE_TAG}${search}`);``.

- [ ] **Step 3: Prove the recorder still catches a one-frame overflow**

Temporarily change `useLayoutEffect` to `useEffect` in `src/app/components/TrophyTrend.tsx`, in the import and in the call (the Phase 1 D11 bug), `npm run build && npx playwright test e2e/overflow.spec.ts -g "clash-royale: " --repeat-each=3` → 3 FAIL (max overflow > 0). Revert (`git checkout src/app/components/TrophyTrend.tsx`), rebuild, PASS.

- [ ] **Step 4: Gate, stress, commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: e2e 104 passed, 6 skipped. Then `npx playwright test e2e/overflow.spec.ts e2e/cls.spec.ts e2e/battles.spec.ts e2e/cr-panels.spec.ts --repeat-each=2 --workers=6` → 92 passed.

```bash
git add e2e/overflow.spec.ts e2e/cls.spec.ts
git commit -m "test(cr): per-frame overflow and CLS checks on every Clash Royale tab

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Review screenshots

**Files:**
- Create: `docs/screenshots/phase2/{home,clash-royale,clash-royale-cards,clash-royale-deck,clash-royale-battles,clash-royale-battles-losses,clash-royale-towers,brawl-stars,clash-of-clans}-{390,768,1440}.png` (27 files)

**Interfaces:**
- Consumes: `npm run screenshots` (Task 1).
- Produces: the PNGs reviewers must look at, and one line of observations per page for the PR description.

- [ ] **Step 1: Produce them**

Run: `npm run build && npm run screenshots`
Expected: 27 `wrote docs/screenshots/phase2/…png (fixtures)` lines (Home without the suffix); nothing left on port 4173.

- [ ] **Step 2: Look at every screenshot (all 27) and fix before committing**

Check on every CR page: one accent (CR blue), 12 px cards, hairline borders, no emoji or tofu boxes, no uppercase tracked labels, nothing dimmer than white/60, no clipped numbers at 390, stat tiles 2×2 at 390, two columns on the overview at 1440 (left: clan + deck preview; right: seasons, badges, achievements), trend | latest battles row below. Battles: filter card above the list, selected pill solid. BS: the latest-battles rows now match CR (D28), nothing else changed. CoC and Home: identical to `docs/screenshots/phase1/` apart from the opaque art placeholder (D37). Write one line per page for the PR.

- [ ] **Step 3: Look at live data once (not committed)**

Run with the tag from the environment only: `E2E_CR_TAG=<tag> SCREENSHOT_DIR=/tmp/p2-shots/live SCREENSHOT_ONLY=clash-royale npm run screenshots`
Check on real data: card/badge art loads from `api-assets.clashroyale.com`; the hero falls back to the Swords icon when the arena art 404s; 153 badges open without overflow; Battles shows only the Result group when every battle is Path of Legend (D27). Delete `/tmp/p2-shots/live` afterwards.

- [ ] **Step 4: Commit**

```bash
git add docs/screenshots/phase2
git commit -m "docs: phase 2 review screenshots

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Final verification and hand-off

**Files:**
- Modify: none expected (a fix found here goes into the file it concerns, with a test, in its own commit).

**Interfaces:**
- Consumes: everything above.
- Produces: a branch ready for PR: green gate, budget table, screenshots, PR text, post-deploy checklist.

- [ ] **Step 1: Clean full gate**

Run: `rm -rf dist test-results && npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 191 passed (12 files); e2e 104 passed, 6 skipped (110 tests in 12 files).

- [ ] **Step 2: Real players**

Run (tags from the environment, never typed into a file): `E2E_CR_TAG=… E2E_BS_TAG=… E2E_COC_TAG=… npm run e2e`
Expected: the six `… a real player renders …` tests pass through the preview's API proxy (a real CR player whose card or arena art 404s must not fail them: D29).

- [ ] **Step 3: Contract checks**

Run each and confirm:
- `git diff main --stat -- src/app/routes.ts src/app/data/mockStats.ts src/app/services/gameApiRouter.ts src/app/services/recentSearches.ts src/app/services/apiKeys.ts docs/caddy-tail.caddy index.html package.json package-lock.json` → empty.
- `git diff main --stat -- src/app/services/supercellService.ts` → only the D23 fix (about +15 −7); `grep -c $'\r$'` equals `wc -l` for it, `CRCardsList.tsx` and `CRDeck.tsx`.
- `grep -rnP "\p{Extended_Pictographic}|★|→" src/app/components/CR*.tsx src/app/components/crFacts.ts src/app/components/MatchHistory.tsx src/app/components/TrophyTrend.tsx src/app/pages src/app/ui --include=*.tsx --include=*.ts | grep -v __tests__ | grep -v 'ui/text.ts'` → nothing.
- `grep -rnE "#[0-9A-Fa-f]{6}\b|text-white|bg-white|bg-black|\[#" src/app/components/CR*.tsx src/app/components/MatchHistory.tsx src/app/components/TrophyTrend.tsx src/app/ui src/app/pages` → nothing.
- `grep -rnE "uppercase|tracking-wid|animate-in|animate-shimmer|insertAdjacentHTML" src/app/components/CR*.tsx src/app/components/MatchHistory.tsx` → nothing.
- `grep -n "'tower'" src/app/pages/game/ClashRoyale.tsx` → nothing.

- [ ] **Step 4: Budget summary for the PR**

Run: `npm run build | sed -n '/performance budget/,$p'`
Expected about: initialJs 123.64 / 129.82, playerPageJs 155.86 / 162.82, entryJs 6.91 / 8, css 11.68 / 13.17, fonts 48.26 / 50. Copy it into the PR with the D21 phase-start numbers next to it.

- [ ] **Step 5: Write the PR description (pushing and deploying follow the owner's flow, superpowers:finishing-a-development-branch)**

Include: the 10 commits; the budget table; the screenshot observations from Task 10; the visible-behaviour decisions (D24–D28, D30, D31, D35, D40); the bug list (D23 `prettyMode`; empty Tower troops tab; empty Ranked seasons card; "No Clan" shown as a clan name; Loss pill 4.18:1); and the post-deploy checklist from the spec: `E2E_BASE_URL=https://supercellstats.com npm run e2e` with the three tags; Lighthouse mobile on `/` and the three `/game/<id>` pages plus one CR player URL with `?tab=battles` (performance ≥ 90, accessibility / best practices / SEO 100, CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s; re-run once before treating a miss as real); on production, open a CR player's Battles tab, pick a filter, reload, go to Deck and back, use Copy link.

---

## Spec coverage (self-review)

| Spec requirement (Phase 2 and every-phase acceptance) | Task |
|---|---|
| Clash Royale profile restyle on tokens/primitives (radius 12, one accent, hairline, no gradients, type scale, tabular numbers) | 2 (towers), 3 (deck), 4 (cards), 5 (overview), 6 (rows, trend) |
| Battles promoted to its own tab **with filters (mode, win/loss/draw)** | 7 (logic, URL), 8 (UI) |
| Tabs-in-URL contract kept: `?tab` additive, invalid falls back, reload/back | 7 (`withTab` drop, `selectTab` no-op on same tab; e2e in `tabs.spec.ts`), 8 (`battles.spec.ts` reload/back) |
| Icons: lucide only, no emoji in UI chrome | 2–6 (emoji glyphs and `insertAdjacentHTML` fallbacks removed), `expectNoEmoji` in `cr-panels`/`battles` specs, 11 Step 3 |
| Every async region: skeleton, empty, error | 2, 3, 4, 8 (empty states, D38); skeleton/error unchanged from Phase 1 |
| Motion 150–200 ms, opacity/transform, reduced motion | 5 (badges `starting:` transition, D32), 6 (motion stagger removed) |
| WCAG AA, nothing below white/60 | 1 (`contrast.test.ts`), 6 (Loss pill, trend text), 8 (filter pills, D41), 11 Step 3 |
| ≥ 44 px targets on mobile, keyboard, visible focus | 8 (`expectTouchTargets`, keyboard radio test, focus ring test), 4 (44 px controls), 6 (summary `py-3`) |
| No clipped text / horizontal scroll at 320 px | 2–8 screenshot checks; 8 and 9 (`expectNoHorizontalScroll`, per-frame recorder on every CR tab) |
| CLS ≤ 0.05; no layout shift when filtering | 9 (`cls.spec.ts` per CR tab), 8 ("filtering never moves the filters or the top of the list"), 2 (`GameImage` same-size fallback) |
| Heavy assets lazy, explicit width/height | 2 (`GameImage` `loading="lazy"`, `width`/`height` on every art slot) |
| Performance budget enforced; phase start; ≤ 5 % per phase; what to cut | 1 (D21), every task's gate, D22, 11 Step 4 |
| No new runtime dependency > 5 KB | Global Constraints; 11 Step 3 (`package.json` unchanged) |
| Routes, CSP unchanged | Global Constraints; 11 Step 3 |
| Data layer untouched except bugs | Global Constraints; 7 (D23 only); 11 Step 3 |
| Lint/typecheck/test/build/e2e green per commit; CI | every task's gate |
| E2E: no console errors, no failed non-image requests | `watch()` in every new spec; 2 (art-404 rule, D29) |
| Screenshots 390/768/1440 committed and looked at | 1 (tooling), each UI task's look step, 10 |
| Production verification after deploy (e2e with real tags, Lighthouse) | 11 Steps 2 and 5 |
| Phase 1 deferred: `tower`→`towers` shim | 5 (removed), 4 (typed ids make it a type error, D34) |
| Phase 1 deferred: inert `animate-in` classes | 5 (D32) |
| Phase 1 deferred: Cards tab `(x/y)` count | 4 (D35) |
| Phase 1 deferred: duplicate name card, empty Ranked seasons card | 5 (D31) |
| Phase 1 deferred: emoji as UI glyphs in CR components | 2–6 |
| Phase 1 deferred: Loss pill contrast 4.18:1 | 6 (5.47:1), 1 (guard) |
| Phase 1 deferred: accent Pill never on surface-2 | 2 (`solid` tone, D36), Global Constraints |
| Phase 1 deferred: CR art that 404s falls back without counted console errors | 2 (D29) |
| Phase 1 deferred: tab ids as a union | 4 (D34) |

Placeholder scan: no "TBD", "TODO", "similar to Task N" or prose-only code steps; every code step shows the full file or an exact old → new edit. Type consistency checked: `GameImage` props (2 → 3, 4, 5), `PillTone 'solid'` (2), `sentenceCase` (2 → 3, 4, 5), `TabId`/`CRTab` (4 → 5, 8), `tabCounts` (4), `crFacts`/`CRFacts` (5), `MatchHistory({ matches })` (6 → 8), `BattleFilters`/`ResultFilter`/`ModeOption`/`BATTLE_FILTER_PARAMS` (7 → 8), `withTab(…, drop)`/`shareSearch` (7), `prettyMode(raw, game)` (7), `FilterGroup` props (8), test ids `tower-troop`, `deck-card`, `collection-card`, `badge-list`, `battle-row`, `game-image-fallback`, `empty-state` match between components and specs; `MockApiOptions` grows `brokenArt`/`patch` (2) and `battlelog` (8).

## Open concerns (for the owner, not blocking)

1. **Battles tab shows up to 30 battles** (all the CR API returns, D40 superseded); the filters, counts and tests work unchanged at that size.
2. **Suspected trophy-trend bug, not fixed:** the CR trend adds every battle's `trophyChange` to the Trophy Road count, including Path of Legend battles. On the live sample player (Trophy Road 14,000, 30 Path of Legend wins at +30) the chart shows a climb from 13,160 to 14,000 that probably never happened. Fixing it means filtering the trend to Trophy Road battles in `searchClashRoyale`; it needs confirmation of what `trophyChange` means for Path of Legend before touching the data layer.
3. Whether Clash Royale still sends battle type `unknown` is unproven (D23); the fix is harmless either way.
4. Lighthouse was not run while writing this plan; it is part of Task 11's post-deploy checklist.
