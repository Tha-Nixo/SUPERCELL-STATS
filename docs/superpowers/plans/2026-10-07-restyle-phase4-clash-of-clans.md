# SupercellStats Restyle, Phase 4 (Clash of Clans) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every Clash of Clans player section (overview, army, heroes and equipment, achievements) onto the Phase 1–3 design system without losing anything the old panels showed, fix the Clash of Clans numbers the old panels got wrong, make the Home page's Lighthouse performance robust (≥ 90 with margin), and close the restyle against the spec's Acceptance section.

**Architecture:** The four old Clash of Clans components (`CoCOverview` 135 lines, `CoCArmyDisplay` 227, `CoCHeroesDisplay` 206 and CRLF, `CoCAchievements` 108) are rewritten, one tab per task, on the `src/app/ui/` primitives. Every number they print comes from two pure, unit-tested modules: `components/cocFacts.ts` (level progress, clan roles, army sections, hero split, equipment list, achievement filters) and `components/cocArt.ts` (local art lookup, moved out of the army component). The Clash of Clans API mapper (`searchClashOfClans`) is made pure (`mapClashOfClansPlayer`) and fixed where the live payload proved it wrong (experience level, a dropped troop, a misfiled super troop, raw numbers the panels had to parse back). Phase 4 is the last phase: two extra tasks make Home's performance robust (drop the `motion` library, which only the deleted `StatCard` used, and subset the display font) and verify the whole restyle against the spec.

**Tech Stack:** React 18, react-router 7, Vite 7, Tailwind CSS 4 (`@tailwindcss/vite`), lucide-react 0.487, TypeScript 5.9 (strict, `noUnusedLocals`), Vitest 5 (node env, no jsdom), Playwright 1.63 (Chromium), Lighthouse 13.5.0 through `npx` (no dependency), Node ≥ 22.18 for `scripts/screenshots.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-06-restyle-design.md` (Phase 4 = "Clash of Clans profile restyle"; tabs `overview | army | heroes | achievements`; Acceptance and Performance budget apply). Read it, then the Global Constraints and decisions of the three previous plans: `docs/superpowers/plans/2026-10-06-restyle-phase1-foundation.md` (D1–D20), `docs/superpowers/plans/2026-10-06-restyle-phase2-clash-royale.md` (D21–D41), `docs/superpowers/plans/2026-10-07-restyle-phase3-brawl-stars.md` (D42–D56; **D53 is SUPERSEDED**: the footer is held out of the layout by CSS `:has([data-panel-loading])` while a panel loads, no `min-h-dvh` wrappers). Deferred items come from the three SDD ledgers in `.superpowers/sdd/*/progress.md`.

**How this plan was checked:** every code block of Tasks 1–9 was applied, task by task, to a throw-away copy of `main` at `562db29` (`git archive` + a copy of `node_modules`), and after each task `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (budget check) and the task's e2e specs were run; the full `npm run e2e` was green after Tasks 2, 7 and 9 (unit tests 303 passed; e2e 267 passed, 7 skipped env-gated real-player tests at the end), and the Task 8 sweep passed with `--workers=6 --repeat-each=2` (300 passed). Every red step was seen red after a fresh build. The live Clash of Clans payload was read through the production proxy (`/api/clash-of-clans/players/%23<tag>` with the public ranked player of the owner's brief; no committed file contains the tag, tests read `E2E_COC_TAG`), the env-gated real-player test passed against it, and live screenshots of every tab were looked at at 390 and 1440 px; the findings are in the Plan decisions. Lighthouse numbers are from the method in Task 9 (5 runs on the built preview; 3 on production for the baseline). Tasks 10–11 are procedural: the 21 review screenshots were generated in the copy (not committed there). Numbers quoted are the ones these runs measured.

## Global Constraints

- Routes are unchanged: `/`, `/game/:gameId`, `/game/:gameId/player/:tag` (bare tag; `%23TAG` keeps working). `?tab=` keeps the Phase 1 rules; the Clash of Clans tab ids `overview | army | heroes | achievements` are public and never renamed. `src/app/routes.ts` is not edited.
- Production CSP (`docs/caddy-tail.caddy`) is unchanged: no new third-party origin, no inline script, fonts self-hosted. Clash of Clans art uses only `'self'` (`/images/coc/**`) and `https://api-assets.clashofclans.com` (league and clan badges), both already in `img-src`. Inline `style=""` stays allowed; never add `<script>`.
- No new runtime dependency. This plan **removes** one (`motion`, Task 9) and adds none; the font subsetting in Task 9 runs a tool in a temporary directory, it is not installed in the repo.
- Performance budget (spec, "Performance budget"), enforced by `npm run build`: initial JS on `/` ≤ **135 KB**, JS to render a player page ≤ **180 KB**, entry chunk ≤ **8 KB**, CSS ≤ **16 KB**, preloaded fonts ≤ **50 KB** with no extra font file on the critical path; per-phase growth ≤ **5 %** on each line versus the phase start (entry chunk exempt, D1). Phase 4 start and caps are set in Task 1 (D57).
- Lab Web Vitals on production after deploy: CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s (re-run once before treating a miss as real), Lighthouse performance ≥ 90, accessibility/best practices/SEO 100, on `/` and the three `/game/<id>` pages.
- Visual effects budget: no `filter: blur()` / `backdrop-filter` on large areas, no animated gradients, at most one continuously running animation on screen. Motion is 150–200 ms opacity/transform only and is disabled under `prefers-reduced-motion`.
- Accessibility: WCAG AA; **no text dimmer than white/60** (`text-fg-subtle` is the floor); every interactive element ≥ 44 px tall on mobile; all controls keyboard reachable with a visible focus ring; no emoji in UI chrome (lucide icons, imported one by one); information never only on hover or only in `title`; icon-only marks carry sr-only text; bars are decorative (`aria-hidden`) and the number they show is always printed next to them.
- Components use tokens (`bg-surface-1`, `text-fg-muted`, `border-line`, `bg-accent`, `rounded-card`…), never raw hex, never `bg-white/x`/`bg-black/x`, no raw palette classes (`text-purple-400`, `bg-yellow-500/10`…), no per-hero colours. One accent per page (Clash of Clans `#5BD65B`: 10.22:1 on the page, 9.51:1 on `surface-1`, 8.63:1 on `surface-2`). Text on a solid accent fill is `text-accent-contrast`. Radii: `rounded-card` (12 px) for surfaces and tiles, `rounded-lg` for art boxes, `rounded-pill` for pills and bars, nothing else. No all-caps tracked labels, no gradients as decoration.
- Tailwind scans `.ts`/`.tsx` **including comments**: do not write bare utility-like words (`shadow`, `outline`, `hidden`, `blur`…) in comments; every stray class costs CSS budget.
- Line endings: preserve each file's style. CRLF files touched by this plan: `src/app/services/supercellService.ts` (edited only by the `node` script in Task 2, which keeps CRLF) and `src/app/components/CoCHeroesDisplay.tsx` (deleted in Task 6, replaced by the LF `CoCHeroes.tsx`). Every other touched or new file is LF (`file <path>` says so; checked on `562db29`). After editing a CRLF file check that `grep -c $'\r$' <file>` equals `wc -l < <file>`.
- Data layer: only the Clash of Clans mapper in `src/app/services/supercellService.ts` and the Clash of Clans types in `src/app/data/mockStats.ts` change, in Task 2, for the bugs listed in D58 (the spec allows "bugs found while restyling"). `gameApiRouter.ts`, `recentSearches.ts`, `apiKeys.ts` and the Clash Royale / Brawl Stars mappers are not modified.
- Scope: Phase 4 plus the two closing tasks. Clash Royale and Brawl Stars components are not edited; their screenshots must look identical except for the display font file (Task 9, same glyphs).
- Real player tags appear only through `E2E_CR_TAG`, `E2E_BS_TAG`, `E2E_COC_TAG`; never in a committed test, fixture or screenshot (screenshots of live data show the tag: never commit them). Fixtures use the invented tag `#PYLQGRJC`.
- Every commit leaves `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` green, and the site deployable. Commits stage files **by path** (never `git add -A` / `git add .`). An e2e run that is meant to fail first (red) runs `npm run build` before `npx playwright test` (the preview serves `dist/`: a stale build gives a false red or a false green).
- Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Copy: sentence case, plain verbs, no em dash (`—`) in new UI strings, no exclamation marks in our strings (API text such as "Completed!" is data); empty states say why and what to do. Game words as the game says them: "Town Hall", "Builder Hall", "Builder base", "Clan capital", "Elder", "Co-leader".
- Every UI task ends with screenshots that the executor **opens and looks at** (390, 768 and 1440 px), and an explicit OLD-vs-NEW content checklist: every datum, control and tooltip the old component showed is either still shown or listed as deliberately dropped with its reason.

---

## File Structure

New Clash of Clans modules (`src/app/components/`, all LF):

| File | Responsibility |
|---|---|
| `cocFacts.ts` (+ `__tests__/cocFacts.test.ts`) | pure: `CoCVisuals` type, `levelFacts`, `roleLabel`, `ARMY_SECTIONS`, `sectionFacts`, `splitHeroes`, `equipmentList`, `isAchievementDone`, `showStars`, `groupDigits`, `ACHIEVEMENT_VILLAGES`, `ACHIEVEMENT_STATUSES`, `achievementView` |
| `cocArt.ts` (+ `__tests__/cocArt.test.ts`) | pure: `cocItemArt(name, category)` (the old candidate walk, resolved against the generated `data/cocIconIndex.ts`), `heroArt(name)` |
| `CoCItem.tsx` | `LevelText` (printed level, "Max", sr-only wording) and `LevelItem` (one troop/spell/pet/equipment tile) |
| `CoCOverview.tsx` (rewritten) | four stat tiles, Trophies card (league badge), Clan card, Legend League card |
| `CoCArmyDisplay.tsx` (rewritten) | six sections in home-village-first order, names and levels printed |
| `CoCHeroes.tsx` (new, replaces CRLF `CoCHeroesDisplay.tsx`) | hero cards with name, level, equipped items; builder base heroes; equipment inventory |
| `CoCAchievements.tsx` (rewritten) | summary tiles, village/status filter groups, achievement tiles with stars |

Shared UI: `src/app/ui/ProgressBar.tsx` (new, decorative bar). Pages: `pages/game/ClashOfClans.tsx` (typed tab ids, new props), `pages/game/summary.tsx` (Town Hall fallback mark).

Data layer (Task 2 only): `src/app/services/supercellService.ts` (`mapClashOfClansPlayer`, CRLF), `src/app/data/mockStats.ts` (Clash of Clans types), `src/app/services/__tests__/cocMapper.test.ts` (new).

Deleted: `src/app/components/StatCard.tsx` (Task 4, its only user was the old overview), `src/app/components/CoCHeroesDisplay.tsx` (Task 6).

Home performance (Task 9): `src/main.tsx`, `vite.config.ts`, `package.json` + `package-lock.json` (`motion` removed), `src/styles/fonts.css`, `public/fonts/Clash-latin.woff2` (new).

Tests and tooling: `e2e/support/fixtures.ts`, `e2e/coc-panels.spec.ts` (new), `e2e/{player,cls,overflow}.spec.ts`, `scripts/bundle-budget.json`, `scripts/screenshots.mjs`, `docs/screenshots/phase4/*.png`, `README.md`, `DEPLOY.md` (Task 11 check).

## Plan decisions

Numbered after Phase 3 (D42–D56). Each line: decision · why · cost if wrong.

- **D57. Phase 4 budget start = the numbers measured on `main` at `562db29`:** `initialJs 123.46`, `playerPageJs 154.98`, `entryJs 6.73`, `css 9.18`, `fonts 48.26` (same method as D2/D21/D42). Caps as `check-bundle.mjs` prints them (×1.05, capped by the absolute line): initialJs **129.63**, playerPageJs **162.73**, css **9.64**, fonts **50**, entryJs **8** (exempt). The CSS cap is the tight one (+0.46 KB): the restyle deletes more one-off classes (`bg-purple-500/10`, `shadow-[0_0_15px_…]`, per-hero inline gradients) than it adds; if a task still crosses it, cut in this order: the Achievements summary tiles, the Legend League card's builder-base row, the `sm:` padding steps on item tiles. Measured in the throwaway after each task: CSS 9.19 → 8.69 (T4) → 8.28 (T5) → 7.85 (T6) → 7.37 (T7) → 7.41 (T9); initialJs 123.46 → **83.79 at Task 4** (D66) → 83.33 (T9); playerPageJs 155.06 → 115.82 (T7) → 115.33 (T9). **If `npm run build` prints different start numbers on your machine, check for a stray `node_modules/node_modules` symlink first** (Open concern 4): with it the copy measured 124.00 / 155.52 and the built app crashed with two React copies. · Spec rule 2 measures against the previous phase. · None.
- **D58. Clash of Clans mapper bugs fixed in the data layer (Task 2), proven on the live payload:** (1) `PlayerStats.level` was the **Town Hall level** (the hero said "Level 18" next to "Town Hall 18"; the live player is experience level in the hundreds): it becomes `expLevel`; (2) **Meteor Golem** (a home-village troop, live 3/3) was filtered out by `isExtraBaseTroop` and shown nowhere: kept; (3) **Super Yeti** was excluded from super troops and listed as a regular troop at "1/8": it is a super troop; (4) the API's `superTroopIsActive` was dropped: kept as `active`; (5) the panels re-parsed mapper strings (`"1,200 sent · 900 received"`, `"8,123 / 2,100"`, `statLabels.stat4Value`) with `[\d,]+`, which breaks under non-Latin digit locales because the mapper formats with `toLocaleString()`: the raw numbers (`expLevel`, `bestTrophies`, `donations`, `donationsReceived`, `lifetimeAttackWins`, `lifetimeDefenseWins`, `clanTag`) are added to `gameVisuals.coc` and nothing parses strings any more. The mapping is extracted into the pure, exported `mapClashOfClansPlayer(player)` so it is unit tested; `searchClashOfClans` keeps fetching. `winRate`, `kd`, `statLabels`, `extraStats` and the heroes' `emoji`/`color` keep their values (no reader after this phase; removing them is a data-layer cleanup, not a restyle). · Every number the restyled tabs print traces to one API field. · A future reader of `stats.level` for Clash of Clans now gets the experience level (the only reader is the summary bar, which wanted that).
- **D59. Overview content (old → new).** The four tiles become War stars, Attack wins (lifetime, from the Conqueror achievement), Defense wins (lifetime, Unbreakable) and Best trophies. The old **"Win Rate · Est. Lifetime Rate"** tile is **dropped**: it was attack wins ÷ (attack wins + defense wins), two unrelated counters (a defense win is not a lost attack), 95 % for the live player. The old "Home Village" row showed the **best** trophies (6,459) labelled as current with "Best: Legend League" under it, and "Experience Level" showed the Town Hall level: the Trophies card now lists Home village (current), Best home village, Builder base, Best builder base and Builder Hall, under the league name with its badge (the badge was only on the old Heroes tab). The Clan card keeps badge, name, role, clan level, donations and capital contributions; donations are labelled "this season" (the API counters reset each season), the role is the game's word (`admin` → Elder, `coLeader` → Co-leader; the old card printed `ADMIN`/`COLEADER`), and a player without a clan reads "Not in a clan" instead of "No Clan · MEMBER". The Legend League banner (purple, glow) becomes a card with Legend trophies, This season (rank and trophies: the live payload has `currentSeason.rank`, which no panel showed), Best season and Best builder base season when present (live: `bestBuilderBaseSeason` exists, `bestSeason` does not). · Data first, no fabricated number. · Less "game flavour" than the purple banner.
- **D60. Army: names and levels are printed, not hover-only.** The old 48 px icon tiles showed the name and max level only in a hover tooltip and `title`, the level in 9 px text and "max" as a yellow colour only. Each item is now a tile with the art (local, `GameImage`, `alt=""` because the name is printed), the name, "11 / 12" (sr-only "Level 11 of 12"), "Max" in words, and a decorative bar. Sections are reordered home village first: Troops, Super troops, Spells, Siege machines, Pets, Builder base troops (old: Builder base second). Each section's header says "n of m at max level". Super troops show **no level**: the API reports level 1 for every super troop of a maxed Town Hall 18 player (`1/9`, `1/12`), which is not the troop's strength; they show "Boosted now" when `active`. Level-0 entries are items the mapper pads in (missing siege machines and pets, with a guessed max): they read "Not unlocked" without a max or bar, and a section where nothing is unlocked collapses to one line "None unlocked yet". · Information visible on touch screens and to screen readers. · Taller page (measured in Task 8: see D64).
- **D61. Heroes: the hero's name is shown.** The old cards showed portrait, level and bar but **no name** (only the image `alt`). New cards: portrait (local art), name as a heading, "85 / 95 · 89 %" (the old card printed both), bar, and the equipped items with their levels ("Nothing equipped" when empty). Locked heroes (padded with level 0 by the mapper) read "Not unlocked". Builder base heroes (Battle Machine, Battle Copter) get their own section. The equipment inventory lists every piece with level, "Max" and an **Equipped** pill (the API's `heroEquipment` does not say which hero owns a piece; "equipped" comes from the heroes' `equipment` lists), equipped pieces first. The old header (league badge + name, clan badge) is **moved**: league badge to the Overview's Trophies card, clan badge already in the Clan card. Per-hero colours and the yellow "MAX" styling go (D6: one accent). No equipment art exists locally or on an allowed host, so equipment tiles are text only (no empty boxes). · Every datum kept, one accent. · None.
- **D62. Achievements: one rule for "completed", stars shown, filters as pill groups.** The old filter counted an achievement as completed when `stars === 3 || completionInfo === 'Completed!'`, but the card also accepted `value >= target`, so "Dragon Slayer" (1 star, 5/1) showed "Completed" yet vanished under the Completed filter. `isAchievementDone` uses the card's rule everywhere. Stars (0–3) are shown as icons with sr-only "2 of 3 stars" (the old card showed none), except for completed achievements without stars ("Keep Your Account Safe!"). The two `<select>`s become two `FilterGroup` radio-pill groups (Phase 2's component) with counts, so the result size is visible before choosing; filters stay local state (not in the URL: the spec only puts the tab in the URL). Long numbers in API text are grouped ("Total Gold looted: 2,000,000,000"; the API sends ASCII digits, so `groupDigits` never parses a localised number). Below `sm` a completed achievement's description is sr-only (its completion line already says what it counts), which keeps the tab short on phones. Two summary tiles: Completed ("5 of 8 achievements" on the fixture; the live Town Hall 18 player has completed all 54) and Stars earned. An empty filter result shows an empty state with "Reset filters", which gives focus back to the first village option. Duplicate names are **not** merged: the live "Keep Your Account Safe!" appears twice with different descriptions (two achievements). · Consistent counts, keyboard-friendly. · None.
- **D63. Typed tab ids and the CoC page module.** `ClashOfClans.tsx` switches on `TabId<'clash-of-clans'>` like Brawl Stars, the components take data (no `accent` prop: colour comes from tokens), and `e2e/player.spec.ts`'s brittle "second heading in the panel" locator for Clash of Clans becomes the "War stars" tile (Phase 1 deferred item). · A misspelt id is a type error. · None.
- **D64. Long pages on phones.** Measured at 390 px with the live Town Hall 18 player (97 army items, 8 heroes, 42 equipment pieces, 54 achievements) in the throwaway: Overview **1,669 px**, Army **5,486 px**, Heroes **4,051 px**, Achievements **5,304 px** (the Brawl Stars Brawlers tab measured 10,821 px after its compact rows). Army and equipment use two-column tiles below `sm` (half the height of one-column rows) and completed achievements hide their description visually on phones (D62); nothing is collapsed behind a disclosure, because every item is information and sections are already headed and counted. · Data stays one scroll away. · If the owner finds Army too long on phones, the next step is a "Not at max level" filter (Open concern 2).
- **D65. Town Hall art fallback.** Local Town Hall art stops at 16; the live player is Town Hall 18. The summary avatar's fallback becomes a two-line "TH / 18" mark instead of a bare "18" (the "Town Hall 18" pill next to it keeps the accessible wording). No new art is fetched (no allowed host serves it). · Honest and readable. · Two Town Hall levels without art until someone adds files.
- **D66. Home performance, measured, not guessed.** Before (built preview at `562db29`, Lighthouse 13.5.0 mobile, 5 runs): performance **93** (93–94), LCP **2,943 ms** median, FCP **2,018 ms**, TBT 36 ms, CLS 0; production (3 runs): **90**, LCP 3,239 ms, FCP 2,316 ms. LCP element: the decorative `cr_character.webp` on the first game card. Findings in the throwaway: (a) art as a pseudo-element background: **worse** (LCP 3,016 ms, the span is still the candidate); (b) art fading in from opacity 0: the paragraph becomes the LCP element but LCP stays ~2.95 s (lantern counts the requests already in flight); neither ships, the art markup is not changed. (c) **The `motion` chunk was on Home only because `main.tsx` imports `MotionConfig` and `vite.config.ts` forces every `motion` module into one chunk; its only real user was `StatCard`.** Deleting `StatCard` in Task 4 therefore shrinks initialJs 123.46 → **83.79 KB** by itself: after Tasks 4–8 Home measures **96** (LCP 2,649 ms, FCP 1,709 ms). (d) Task 9 removes the leftover (`MotionConfig`, the dependency, the chunk rule: 83.79 → 83.33 KB) and subsets the display font `Clash_Regular.otf` (48.3 KB, requested at "VeryHigh" priority by Home's h1 and game names) to a Latin WOFF2 (17.2 KB), the OTF kept as a fallback face for other characters (it is not requested on any page with Latin text): Home **97** (all 5 runs), LCP **2,489 ms**, FCP **1,555 ms**, TBT 38 ms, CLS 0, a11y/BP/SEO 100; the three game landings **98** each. Production adds ~300 ms of network (D66 before: preview 93 vs production 90), so production Home should land around 94–95. · Biggest win for the least change; it also shrinks every player page. · `MotionConfig reducedMotion="user"` goes with the library; no component uses `motion` any more, CSS motion keeps `motion-safe:`.
- **D66 (amended): the font subset was NOT done.** `Clash_Regular.otf` is Supercell's proprietary file: it is not modified or derived, and nothing under `public/fonts` changes (Task 9 Step 3 and the `Clash-latin.woff2` steps are cancelled). Only `motion` was removed; Home local median is 96 before and after. The Lighthouse figures above that mention the subset (97, LCP 2,489 ms) were not shipped.
- **D67. Closing checklist.** Task 11 verifies the spec's Acceptance section for the whole restyle (all three games), not only Phase 4: screenshots for all three games at 390/768/1440 committed under `docs/screenshots/phase4/`, Lighthouse on `/` and the three `/game/<id>` pages before and after deploy, production e2e with the three public tags from the environment, budget numbers against the spec table, CSP unchanged, no console errors, and README/DEPLOY statements about the old UI corrected. · The spec's acceptance is per phase and for the result. · None.

---
### Task 1: Phase 4 start: budget, review tooling, Clash of Clans fixtures

**Files:**
- Modify: `scripts/bundle-budget.json`, `scripts/screenshots.mjs`, `e2e/support/fixtures.ts`

**Interfaces:**
- Consumes: `scripts/check-bundle.mjs` / `bundle-budget-lib.mjs` (Phase 1, unchanged); `mockApi(page, { patch })` (Phase 2: fields merged over a game's player fixture; a field set to `undefined` disappears from the JSON answer).
- Produces: Phase 4 caps (D57); `npm run screenshots` defaulting to `docs/screenshots/phase4` with pages `home`, `clash-royale`, `brawl-stars`, `clash-of-clans`, `clash-of-clans-army`, `clash-of-clans-heroes`, `clash-of-clans-achievements` (each `-390/-768/-1440.png`). Later tasks run `SCREENSHOT_DIR=/tmp/p4-shots/<task> SCREENSHOT_ONLY=<prefix> npm run screenshots`. Fixture `cocPlayer` (exported from `e2e/support/fixtures.ts`) with the shape below, and `cocLowTownHall` (a patch object for `mockApi`'s `patch['clash-of-clans']`).

- [ ] **Step 1: Measure the phase start**

Run on the untouched branch: `npm run build | sed -n '/performance budget/,$p'`
Expected (D57): `initialJs 123.46`, `playerPageJs 154.98`, `entryJs 6.73`, `css 9.18`, `fonts 48.26`. If they differ, run `ls -la node_modules/node_modules` first: a symlink there (left by an earlier session) must be removed (`rm node_modules/node_modules`) and the build re-run. If main has really moved, use the printed numbers in Step 2 and in the PR.

- [ ] **Step 2: Write the phase start into the budget file**

In `scripts/bundle-budget.json` replace the `phase` and `phaseStart` entries (keep everything else, 2-space indent, LF):

```json
  "phase": "restyle phase 4 (clash of clans)",
  "phaseStart": {
    "initialJs": 123.46,
    "playerPageJs": 154.98,
    "entryJs": 6.73,
    "css": 9.18,
    "fonts": 48.26
  },
```

Run: `npm run build | sed -n '/performance budget/,$p'`
Expected: every line `✓`, limits `129.63`, `162.73`, `8`, `9.64`, `50`.

- [ ] **Step 3: Screenshot script: every Clash of Clans tab and one page per other game**

In `scripts/screenshots.mjs`:
1. Replace the first paragraph of the header comment with:

```js
 * Review screenshots (restyle spec, "Acceptance"): Home, one player page per
 * game and every Clash of Clans tab, at 390, 768 and 1440 px, written to
 * docs/screenshots/<phase>/. Pages render in UTC with an en-US locale, so
 * battle times are stable.
```

and the usage line `SCREENSHOT_ONLY=brawl-stars npm run screenshots   # only pages whose name starts with it` with `SCREENSHOT_ONLY=clash-of-clans npm run screenshots   # only pages whose name starts with it`.
2. `const PHASE = process.env.SCREENSHOT_PHASE ?? 'phase4';`
3. Replace from `const CR = …` up to (not including) `const ONLY = …` with:

```js
const COC = { game: 'clash-of-clans', env: 'E2E_COC_TAG' };
const ALL_PAGES = [
  { name: 'home', path: () => '/' },
  { name: 'clash-royale', game: 'clash-royale', env: 'E2E_CR_TAG', search: '' },
  { name: 'brawl-stars', game: 'brawl-stars', env: 'E2E_BS_TAG', search: '' },
  { name: 'clash-of-clans', ...COC, search: '' },
  { name: 'clash-of-clans-army', ...COC, search: '?tab=army' },
  { name: 'clash-of-clans-heroes', ...COC, search: '?tab=heroes' },
  { name: 'clash-of-clans-achievements', ...COC, search: '?tab=achievements' },
];
```

- [ ] **Step 4: Clash of Clans fixtures covering every branch**

In `e2e/support/fixtures.ts` replace everything from `export const cocPlayer = {` to the end of the file with:

```ts
const cocItem = (name: string, level: number, maxLevel: number, village = 'home', extra: Record<string, unknown> = {}) => ({ name, level, maxLevel, village, ...extra });
const cocAchievement = (name: string, stars: number, value: number, target: number, info: string, completionInfo: string | null, village = 'home') => ({ name, stars, value, target, info, completionInfo, village });

// GET /api/clash-of-clans/players/{tag}, shaped like the live payload. Covers: a maxed
// hero and a hero below max, heroes with two, one and no equipment, three home heroes
// missing (the mapper adds them at level 0 = not unlocked), a builder base hero,
// equipment owned but not equipped, every troop kind (a maxed troop, Meteor Golem,
// Super Yeti and a boosted super troop, siege machines, pets, a builder base troop),
// art that does not exist locally (Sky Wagon, Angry Spell) and achievements done,
// in progress, done by value, without stars, in all three villages.
export const cocPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Harrow Keep',
  townHallLevel: 15,
  builderHallLevel: 10,
  expLevel: 210,
  trophies: 5012,
  bestTrophies: 5340,
  warStars: 1450,
  attackWins: 88,
  defenseWins: 4,
  builderBaseTrophies: 3120,
  bestBuilderBaseTrophies: 3333,
  donations: 1200,
  donationsReceived: 900,
  clanCapitalContributions: 1234567,
  role: 'coLeader',
  league: { id: 29000022, name: 'Legend League', iconUrls: { medium: 'https://api-assets.clashofclans.com/leagues/288/legend.png' } },
  clan: { tag: '#2Y0Y', name: 'Lantern Watch', clanLevel: 18, badgeUrls: { medium: 'https://api-assets.clashofclans.com/badges/200/lantern.png' } },
  legendStatistics: {
    legendTrophies: 2210,
    currentSeason: { rank: 1412, trophies: 5012 },
    bestSeason: { id: '2026-08', rank: 830, trophies: 5560 },
  },
  heroes: [
    cocItem('Barbarian King', 85, 95, 'home', { equipment: [cocItem('Barbarian Puppet', 18, 18), cocItem('Rage Vial', 15, 18)] }),
    cocItem('Archer Queen', 95, 95, 'home', { equipment: [cocItem('Archer Puppet', 18, 18), cocItem('Invisibility Vial', 18, 18)] }),
    cocItem('Grand Warden', 60, 70, 'home', { equipment: [cocItem('Eternal Tome', 12, 18)] }),
    cocItem('Battle Machine', 30, 35, 'builderBase'),
  ],
  heroEquipment: [
    cocItem('Barbarian Puppet', 18, 18),
    cocItem('Rage Vial', 15, 18),
    cocItem('Archer Puppet', 18, 18),
    cocItem('Invisibility Vial', 18, 18),
    cocItem('Eternal Tome', 12, 18),
    cocItem('Giant Arrow', 9, 18),
    cocItem('Earthquake Boots', 1, 18),
    cocItem('Healer Puppet', 18, 18),
  ],
  troops: [
    cocItem('Barbarian', 11, 12),
    cocItem('Archer', 12, 12),
    cocItem('Giant', 10, 12),
    cocItem('Meteor Golem', 1, 3),
    cocItem('Sky Wagon', 1, 4),
    cocItem('Super Barbarian', 1, 5),
    cocItem('Sneaky Goblin', 1, 3, 'home', { superTroopIsActive: true }),
    cocItem('Super Yeti', 1, 4),
    cocItem('Wall Wrecker', 4, 5),
    cocItem('Battle Blimp', 4, 4),
    cocItem('L.A.S.S.I', 10, 10),
    cocItem('Mighty Yak', 7, 10),
    cocItem('Raged Barbarian', 18, 20, 'builderBase'),
  ],
  spells: [cocItem('Lightning Spell', 10, 11), cocItem('Healing Spell', 9, 10), cocItem('Angry Spell', 2, 4)],
  achievements: [
    cocAchievement('Conqueror', 3, 8123, 5000, 'Win 5000 multiplayer battles', 'Total multiplayer battles won: 8123'),
    cocAchievement('Unbreakable', 2, 2100, 5000, 'Successfully defend against 5000 attacks', null),
    cocAchievement('Sweet Victory!', 3, 5340, 1250, 'Achieve a total of 1250 trophies in Multiplayer battles', 'Trophy record: 5340'),
    cocAchievement('Gold Grab', 2, 41000000, 100000000, 'Steal 100000000 gold', null),
    cocAchievement('Dragon Slayer', 1, 5, 1, 'Slay the Giant Dragon', null),
    cocAchievement('Keep Your Account Safe!', 0, 0, 1, 'Connect your account to Supercell ID for safe keeping.', 'Completed!'),
    cocAchievement('Master Engineering', 3, 10, 8, 'Upgrade a Builder Hall to level 8', 'Current Builder Hall level: 10', 'builderBase'),
    cocAchievement('Most Valuable Clanmate', 1, 1234567, 2000000, 'Contribute 2000000 Capital Gold', null, 'clanCapital'),
  ],
};

// A small Town Hall 9 account, merged over cocPlayer with mockApi's patch: one hero,
// no equipment, no siege machine or pet unlocked, no league, no legend statistics.
export const cocLowTownHall = {
  townHallLevel: 9,
  builderHallLevel: 0,
  league: undefined,
  legendStatistics: undefined,
  heroes: [cocItem('Barbarian King', 20, 40)],
  heroEquipment: [],
  troops: [cocItem('Barbarian', 6, 12), cocItem('Archer', 6, 12)],
  spells: [cocItem('Lightning Spell', 5, 11)],
};
```

Expected numbers (later tasks assert them): 8 achievements, 5 completed (Conqueror, Sweet Victory!, Dragon Slayer by value, Keep Your Account Safe!, Master Engineering), 3 in progress; villages home 6, builder base 1, clan capital 1; stars earned 15.

Run: `npm run typecheck && npm run build && npx playwright test e2e/player.spec.ts e2e/tabs.spec.ts e2e/home.spec.ts`
Expected: PASS (the old components still render the richer fixture: player.spec's Clash of Clans locator is the second heading in the panel, still present).

- [ ] **Step 5: Commit**

```bash
git add scripts/bundle-budget.json scripts/screenshots.mjs e2e/support/fixtures.ts
git commit -m "chore(coc): phase 4 budget start, screenshot pages and Clash of Clans fixtures

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Clash of Clans mapper: pure, tested, and correct (data layer)

**Files:**
- Modify: `src/app/services/supercellService.ts` (CRLF, edited only with the node script below), `src/app/data/mockStats.ts`, `src/app/pages/game/summary.tsx`
- Test: `src/app/services/__tests__/cocMapper.test.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function mapClashOfClansPlayer(player: any): PlayerStats` in `supercellService.ts`. `GameVisuals['coc']` gains optional `expLevel?: number; bestTrophies?: number; donations?: number; donationsReceived?: number; lifetimeAttackWins?: number; lifetimeDefenseWins?: number; clanTag?: string`. `CoCTroopData` gains `active?: boolean` (super troops: boosted now). `CoCLegendStatistics.currentSeason` gains `rank?: number`; new optional `bestBuilderBaseSeason?: { id: string; rank: number; trophies: number }`. `PlayerStats.level` for Clash of Clans is the experience level.

- [ ] **Step 1: Write the failing test**

Create `src/app/services/__tests__/cocMapper.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapClashOfClansPlayer } from '../supercellService';

// Shaped like the live /players/{tag} payload (fields trimmed); invented tag.
const item = (name: string, level: number, maxLevel: number, village = 'home', extra: Record<string, unknown> = {}) => ({ name, level, maxLevel, village, ...extra });
const live = {
  tag: '#PYLQGRJC',
  name: 'Harrow Keep',
  townHallLevel: 18,
  expLevel: 300,
  trophies: 5000,
  bestTrophies: 6500,
  warStars: 8000,
  builderHallLevel: 10,
  donations: 200,
  donationsReceived: 120,
  role: 'coLeader',
  clan: { tag: '#2PP0LQ', name: 'Lantern Watch', clanLevel: 37, badgeUrls: { medium: 'https://api-assets.clashofclans.com/badges/200/x.png' } },
  legendStatistics: { legendTrophies: 4200, currentSeason: { rank: 150, trophies: 5000 }, bestBuilderBaseSeason: { id: '2023-09', rank: 3200, trophies: 5500 } },
  heroes: [item('Barbarian King', 110, 110)],
  troops: [
    item('Barbarian', 13, 13),
    item('Meteor Golem', 3, 3),
    item('Super Yeti', 1, 8),
    item('Super Bowler', 1, 10, 'home', { superTroopIsActive: true }),
    item('Super Archer', 1, 10),
    item('Wall Wrecker', 6, 6),
    item('L.A.S.S.I', 15, 15),
    item('Raged Barbarian', 20, 20, 'builderBase'),
  ],
  spells: [item('Lightning Spell', 13, 13)],
  achievements: [
    { name: 'Conqueror', stars: 3, value: 35000, target: 5000, info: 'Win 5000 multiplayer battles', completionInfo: 'Total multiplayer battles won: 35000', village: 'home' },
    { name: 'Unbreakable', stars: 3, value: 1800, target: 500, info: 'Successfully defend against 500 attacks', completionInfo: 'Total defenses won: 1800', village: 'home' },
  ],
};

describe('mapClashOfClansPlayer', () => {
  const coc = () => mapClashOfClansPlayer(live).gameVisuals!.coc!;

  it('uses the experience level as the player level, not the Town Hall', () => {
    const stats = mapClashOfClansPlayer(live);
    expect(stats.level).toBe(300);
    expect(coc().expLevel).toBe(300);
    expect(coc().townHallLevel).toBe(18);
  });

  it('exposes the raw numbers the panels print, so nothing parses formatted strings', () => {
    expect(coc()).toMatchObject({
      bestTrophies: 6500,
      donations: 200,
      donationsReceived: 120,
      lifetimeAttackWins: 35000,
      lifetimeDefenseWins: 1800,
      clanTag: '#2PP0LQ',
      warStars: 8000,
    });
  });

  it('keeps Meteor Golem with the troops and files Super Yeti as a super troop', () => {
    expect(coc().troops!.map((t) => t.name)).toEqual(['Barbarian', 'Meteor Golem']);
    expect(coc().superTroops!.map((t) => t.name)).toEqual(['Super Yeti', 'Super Bowler', 'Super Archer']);
  });

  it('keeps which super troop is boosted right now', () => {
    expect(coc().superTroops!.find((t) => t.name === 'Super Bowler')?.active).toBe(true);
    expect(coc().superTroops!.find((t) => t.name === 'Super Archer')?.active).toBe(false);
  });

  it('passes the legend statistics through, current season rank included', () => {
    expect(coc().legendStatistics?.currentSeason).toEqual({ rank: 150, trophies: 5000 });
    expect(coc().legendStatistics?.bestBuilderBaseSeason).toEqual({ id: '2023-09', rank: 3200, trophies: 5500 });
  });

  it('has no clan tag for a player outside a clan', () => {
    const stats = mapClashOfClansPlayer({ ...live, clan: undefined, role: undefined });
    expect(stats.gameVisuals!.coc!.clanTag).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/app/services/__tests__/cocMapper.test.ts`
Expected: FAIL (`mapClashOfClansPlayer` is not exported).

- [ ] **Step 3: Extend the Clash of Clans types**

In `src/app/data/mockStats.ts` (LF):

1. Replace the `CoCTroopData` interface with:

```ts
export interface CoCTroopData {
  name: string;
  level: number;
  maxLevel: number;
  iconUrl?: string;
  /** Super troops only: boosted right now (the API's superTroopIsActive). */
  active?: boolean;
}
```

2. Replace the `CoCLegendStatistics` interface with:

```ts
export interface CoCLegendStatistics {
  legendTrophies: number;
  bestSeason?: {
    id: string;
    rank: number;
    trophies: number;
  };
  currentSeason?: {
    trophies: number;
    rank?: number;
  };
  bestBuilderBaseSeason?: {
    id: string;
    rank: number;
    trophies: number;
  };
}
```

3. In `GameVisuals.coc`, after `warStars?: number;` insert:

```ts
    /** Raw API numbers, so panels never parse the formatted strings in statLabels/extraStats. */
    expLevel?: number;
    bestTrophies?: number;
    /** Troops donated / received this season (the API resets them every season). */
    donations?: number;
    donationsReceived?: number;
    /** Lifetime counters from the Conqueror and Unbreakable achievements. */
    lifetimeAttackWins?: number;
    lifetimeDefenseWins?: number;
    /** Present only when the player is in a clan. */
    clanTag?: string;
```

- [ ] **Step 4: Make the mapper pure and fix it (CRLF-preserving)**

`supercellService.ts` is CRLF: apply the edits with this script (it fails loudly if a target string is missing), from the repo root:

```bash
node - <<'EOF'
const fs = require('fs');
const file = 'src/app/services/supercellService.ts';
let s = fs.readFileSync(file, 'utf8');
const swap = (from, to) => {
  const a = from.replace(/\n/g, '\r\n');
  if (!s.includes(a)) throw new Error('not found: ' + from.slice(0, 70));
  s = s.replace(a, to.replace(/\n/g, '\r\n'));
};
swap(`async function searchClashOfClans(tag: string): Promise<PlayerStats> {
    const key = apiKeys.get('clashOfClans');
    const encodedTag = encodeURIComponent(normalizeTag(tag));

    const player = await fetchSupercell<any>(\`/api/clash-of-clans/players/\${encodedTag}\`, key);
`, `async function searchClashOfClans(tag: string): Promise<PlayerStats> {
    const key = apiKeys.get('clashOfClans');
    const encodedTag = encodeURIComponent(normalizeTag(tag));
    return mapClashOfClansPlayer(await fetchSupercell<any>(\`/api/clash-of-clans/players/\${encodedTag}\`, key));
}

/** The raw /players/{tag} payload as PlayerStats. Pure, so it is unit tested without a network. */
export function mapClashOfClansPlayer(player: any): PlayerStats {
`);
swap(`    const isSuperName = (n: string) => n !== 'Super Yeti' && (n.includes('Super ') || n.includes('Sneaky ') || n.includes('Rocket ') || n === 'Ice Hound' || n === 'Inferno Dragon');
    const isExtraBaseTroop = (n: string) => ['Skeleton', 'Meteor Golem'].includes(n);`,
`    const isSuperName = (n: string) => n.includes('Super ') || n.includes('Sneaky ') || n.includes('Rocket ') || n === 'Ice Hound' || n === 'Inferno Dragon';
    const isExtraBaseTroop = (n: string) => n === 'Skeleton';`);
swap(`        .filter(t => t.village === 'home' && isSuperName(t.name))
        .map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));`,
`        .filter(t => t.village === 'home' && isSuperName(t.name))
        .map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel, active: t.superTroopIsActive === true }));`);
swap(`        hoursPlayed: donations,
        level: thLevel,`, `        hoursPlayed: donations,
        level: player.expLevel ?? 0,`);
swap(`                warStars,
                leagueName,`, `                warStars,
                expLevel: player.expLevel ?? 0,
                bestTrophies,
                donations,
                donationsReceived,
                lifetimeAttackWins,
                lifetimeDefenseWins,
                clanTag: player.clan?.tag,
                leagueName,`);
fs.writeFileSync(file, s);
EOF
test "$(grep -c $'\r$' src/app/services/supercellService.ts)" = "$(wc -l < src/app/services/supercellService.ts)" && echo CRLF-ok
```

Expected: `CRLF-ok`.

- [ ] **Step 5: Town Hall fallback mark (D65)**

In `src/app/pages/game/summary.tsx` replace the Clash of Clans `avatar:` line

```tsx
      avatar: { sources: TH_IMAGES[th] ? [TH_IMAGES[th]] : [], alt: `Town Hall ${th}`, fallback: th },
```

with

```tsx
      // No local art above Town Hall 16: a two-line "TH / 18" mark instead of a bare number.
      avatar: {
        sources: TH_IMAGES[th] ? [TH_IMAGES[th]] : [],
        alt: `Town Hall ${th}`,
        fallback: (
          <span className="flex flex-col items-center leading-none">
            <span className="text-xs font-medium text-fg-subtle">TH</span>
            {th}
          </span>
        ),
      },
```

- [ ] **Step 6: Run the tests and the gates**

Run: `npx vitest run src/app/services && npm run lint && npm run typecheck && npm run build && npx playwright test e2e/player.spec.ts e2e/tabs.spec.ts`
Expected: the six new tests PASS, all gates green.

Look at the Town Hall fallback with the live Town Hall 18 player (no local art above 16): `npm run build && E2E_COC_TAG=<tag> SCREENSHOT_DIR=/tmp/p4-shots/t2 SCREENSHOT_ONLY=clash-of-clans npm run screenshots` (the preview proxies `/api` to production), open `/tmp/p4-shots/t2/clash-of-clans-390.png`: the avatar reads "TH" over "18", and the pills read "Level 325" (experience level) and "Town Hall 18". The old overview still renders below (it is restyled in Task 4). Do not commit those images.

- [ ] **Step 7: Commit**

```bash
git add src/app/services/supercellService.ts src/app/data/mockStats.ts src/app/pages/game/summary.tsx src/app/services/__tests__/cocMapper.test.ts
git commit -m "fix(coc): pure mapper with raw numbers, experience level, Meteor Golem and Super Yeti

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Pure Clash of Clans facts and art lookup

**Files:**
- Create: `src/app/components/cocFacts.ts`, `src/app/components/cocArt.ts`
- Test: `src/app/components/__tests__/cocFacts.test.ts`, `src/app/components/__tests__/cocArt.test.ts`

**Interfaces:**
- Consumes: `CoCAchievement`, `CoCHeroData`, `CoCHeroEquipment`, `CoCTroopData`, `GameVisuals` from `data/mockStats.ts` (Task 2 shapes); `resolveCocIcon(candidates: string[]): string | undefined` from `data/cocIconIndex.ts` (generated, unchanged); `sentenceCase` from `ui/text.ts`.
- Produces (`cocFacts.ts`):
  - `type CoCVisuals = NonNullable<GameVisuals['coc']>`
  - `interface Leveled { level: number; maxLevel: number }`
  - `levelFacts(item: Leveled): { locked: boolean; maxed: boolean; pct: number }`
  - `roleLabel(role: string | undefined): string | undefined`
  - `type CocArtCategory = 'Troops' | 'Super Troops' | 'Spells' | 'Siege Machines' | 'Hero Pets' | 'Builder Base'`
  - `type ArmyKind = 'troops' | 'superTroops' | 'spells' | 'siegeMachines' | 'pets' | 'builderBaseTroops'`
  - `ARMY_SECTIONS: ReadonlyArray<{ kind: ArmyKind; title: string; category: CocArtCategory }>`
  - `sectionFacts(items: readonly CoCTroopData[]): { total: number; unlocked: number; maxed: number; boosted: number }`
  - `splitHeroes(heroes: readonly CoCHeroData[]): { home: CoCHeroData[]; builder: CoCHeroData[] }`
  - `interface EquipmentEntry extends CoCHeroEquipment { equipped: boolean }` and `equipmentList(heroes: readonly CoCHeroData[], owned: readonly CoCHeroEquipment[]): EquipmentEntry[]`
  - `isAchievementDone(a: CoCAchievement): boolean`, `showStars(a: CoCAchievement): boolean`, `groupDigits(text: string): string`
  - `type AchievementVillage = 'all' | 'home' | 'builderBase' | 'clanCapital'`, `type AchievementStatus = 'all' | 'done' | 'open'`, `ACHIEVEMENT_VILLAGES: ReadonlyArray<readonly [AchievementVillage, string]>`, `ACHIEVEMENT_STATUSES: ReadonlyArray<readonly [AchievementStatus, string]>`
  - `achievementView(list: readonly CoCAchievement[], village: AchievementVillage, status: AchievementStatus): { shown: CoCAchievement[]; villageCounts: Record<AchievementVillage, number>; statusCounts: Record<AchievementStatus, number>; done: number; stars: number }`
- Produces (`cocArt.ts`): `cocItemArt(name: string, category: CocArtCategory): string | undefined`, `heroArt(name: string): string | undefined`, `KNOWN_MISSING_ART: readonly string[]`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/components/__tests__/cocFacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { CoCAchievement, CoCHeroData } from '../../data/mockStats';
import {
  ACHIEVEMENT_VILLAGES, ARMY_SECTIONS, achievementView, equipmentList, groupDigits, isAchievementDone, levelFacts, roleLabel,
  sectionFacts, showStars, splitHeroes,
} from '../cocFacts';

const ach = (name: string, stars: number, value: number, target: number, completionInfo: string | null = null, village = 'home'): CoCAchievement =>
  ({ name, stars, value, target, info: '', completionInfo, village });
const hero = (name: string, shortName: string, level: number, equipment: Array<{ name: string; level: number; maxLevel: number }> = []): CoCHeroData =>
  ({ name, shortName, level, maxLevel: 95, emoji: '', color: '', equipment: equipment.map((e) => ({ ...e, village: 'home' })) });

describe('levelFacts', () => {
  it('reads level 0 as not unlocked, with no progress', () => {
    expect(levelFacts({ level: 0, maxLevel: 10 })).toEqual({ locked: true, maxed: false, pct: 0 });
  });
  it('marks max level and rounds the share', () => {
    expect(levelFacts({ level: 12, maxLevel: 12 })).toEqual({ locked: false, maxed: true, pct: 100 });
    expect(levelFacts({ level: 85, maxLevel: 95 })).toEqual({ locked: false, maxed: false, pct: 89 });
  });
  it('survives a missing or zero max', () => {
    expect(levelFacts({ level: 3, maxLevel: 0 })).toEqual({ locked: false, maxed: false, pct: 0 });
  });
});

describe('roleLabel', () => {
  it('uses the words the game uses', () => {
    expect(roleLabel('leader')).toBe('Leader');
    expect(roleLabel('coLeader')).toBe('Co-leader');
    expect(roleLabel('admin')).toBe('Elder');
    expect(roleLabel('member')).toBe('Member');
  });
  it('falls back to sentence case for an unknown role and to nothing for none', () => {
    expect(roleLabel('newRole')).toBe('New role');
    expect(roleLabel(undefined)).toBeUndefined();
  });
});

describe('army sections', () => {
  it('lists the home village first and the builder base last', () => {
    expect(ARMY_SECTIONS.map((s) => s.title)).toEqual(['Troops', 'Super troops', 'Spells', 'Siege machines', 'Pets', 'Builder base troops']);
  });
  it('counts unlocked, maxed and boosted items', () => {
    const items = [
      { name: 'A', level: 12, maxLevel: 12 },
      { name: 'B', level: 3, maxLevel: 12 },
      { name: 'C', level: 0, maxLevel: 10 },
      { name: 'D', level: 1, maxLevel: 5, active: true },
    ];
    expect(sectionFacts(items)).toEqual({ total: 4, unlocked: 3, maxed: 1, boosted: 1 });
  });
});

describe('heroes and equipment', () => {
  it('splits builder base heroes from home village heroes', () => {
    const { home, builder } = splitHeroes([hero('Barbarian King', 'BK', 85), hero('Battle Machine', 'BM', 30), hero('Battle Copter', 'BC', 20)]);
    expect(home.map((h) => h.shortName)).toEqual(['BK']);
    expect(builder.map((h) => h.shortName)).toEqual(['BM', 'BC']);
  });
  it('marks equipped pieces and lists them first, keeping the API order otherwise', () => {
    const heroes = [hero('Barbarian King', 'BK', 85, [{ name: 'Rage Vial', level: 15, maxLevel: 18 }])];
    const owned = [
      { name: 'Giant Arrow', level: 9, maxLevel: 18, village: 'home' },
      { name: 'Rage Vial', level: 15, maxLevel: 18, village: 'home' },
      { name: 'Healer Puppet', level: 18, maxLevel: 18, village: 'home' },
    ];
    expect(equipmentList(heroes, owned).map((e) => [e.name, e.equipped])).toEqual([
      ['Rage Vial', true],
      ['Giant Arrow', false],
      ['Healer Puppet', false],
    ]);
  });
});

describe('achievements', () => {
  it('counts an achievement as done by stars, by the API text or by value, everywhere', () => {
    expect(isAchievementDone(ach('Conqueror', 3, 8123, 5000))).toBe(true);
    expect(isAchievementDone(ach('Keep Your Account Safe!', 0, 0, 1, 'Completed!'))).toBe(true);
    expect(isAchievementDone(ach('Dragon Slayer', 1, 5, 1))).toBe(true);
    expect(isAchievementDone(ach('Gold Grab', 2, 41000000, 100000000))).toBe(false);
  });
  it('hides stars only for completed achievements that have none', () => {
    expect(showStars(ach('Keep Your Account Safe!', 0, 0, 1, 'Completed!'))).toBe(false);
    expect(showStars(ach('Gold Grab', 0, 10, 100))).toBe(true);
    expect(showStars(ach('Dragon Slayer', 1, 5, 1))).toBe(true);
  });
  it('groups long ASCII numbers in API text and leaves short ones alone', () => {
    expect(groupDigits('Total Gold looted: 2000000000')).toBe('Total Gold looted: 2,000,000,000');
    expect(groupDigits('Upgrade a Builder Hall to level 8')).toBe('Upgrade a Builder Hall to level 8');
    expect(groupDigits('Win 5000 multiplayer battles')).toBe('Win 5,000 multiplayer battles');
  });
  it('filters by village and status, with counts for each option of the other filter', () => {
    const list = [
      ach('A', 3, 10, 5),
      ach('B', 1, 1, 5),
      ach('C', 3, 10, 8, null, 'builderBase'),
      ach('D', 0, 0, 1, null, 'clanCapital'),
    ];
    const all = achievementView(list, 'all', 'all');
    expect(all.shown).toHaveLength(4);
    expect(all.villageCounts).toEqual({ all: 4, home: 2, builderBase: 1, clanCapital: 1 });
    expect(all.statusCounts).toEqual({ all: 4, done: 2, open: 2 });
    expect(all.done).toBe(2);
    expect(all.stars).toBe(7);

    const homeOpen = achievementView(list, 'home', 'open');
    expect(homeOpen.shown.map((a) => a.name)).toEqual(['B']);
    // Village counts follow the chosen status, status counts follow the chosen village.
    expect(homeOpen.villageCounts).toEqual({ all: 2, home: 1, builderBase: 0, clanCapital: 1 });
    expect(homeOpen.statusCounts).toEqual({ all: 2, done: 1, open: 1 });
  });
  it('offers the three villages the API uses', () => {
    expect(ACHIEVEMENT_VILLAGES.map(([id]) => id)).toEqual(['all', 'home', 'builderBase', 'clanCapital']);
  });
});
```

Create `src/app/components/__tests__/cocArt.test.ts`:

```ts
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { KNOWN_MISSING_ART, cocItemArt, heroArt } from '../cocArt';
import type { CocArtCategory } from '../cocFacts';

const PUBLIC = path.resolve(__dirname, '../../../../public');

// Every name in the live Town Hall 18 payload (2026-10-07), by the section the mapper files it in.
const LIVE: Record<CocArtCategory, string[]> = {
  Troops: ['Barbarian', 'Archer', 'Goblin', 'Giant', 'Wall Breaker', 'Balloon', 'Wizard', 'Healer', 'Dragon', 'P.E.K.K.A', 'Minion', 'Hog Rider', 'Valkyrie', 'Golem', 'Witch', 'Lava Hound', 'Bowler', 'Baby Dragon', 'Miner', 'Yeti', 'Ice Golem', 'Electro Dragon', 'Dragon Rider', 'Headhunter', 'Electro Titan', 'Apprentice Warden', 'Ruin Witch', 'Root Rider', 'Druid', 'Thrower', 'Furnace', 'Meteor Golem', 'Sky Wagon'],
  'Super Troops': ['Super Barbarian', 'Super Archer', 'Super Wall Breaker', 'Super Giant', 'Sneaky Goblin', 'Super Miner', 'Rocket Balloon', 'Inferno Dragon', 'Super Valkyrie', 'Super Witch', 'Ice Hound', 'Super Bowler', 'Super Dragon', 'Super Wizard', 'Super Minion', 'Super Hog Rider', 'Super Yeti'],
  Spells: ['Lightning Spell', 'Healing Spell', 'Rage Spell', 'Jump Spell', 'Freeze Spell', 'Poison Spell', 'Earthquake Spell', 'Haste Spell', 'Clone Spell', 'Skeleton Spell', 'Bat Spell', 'Invisibility Spell', 'Recall Spell', 'Overgrowth Spell', 'Revive Spell', 'Ice Block Spell', 'Totem Spell', 'Angry Spell'],
  'Siege Machines': ['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill', 'Troop Launcher'],
  'Hero Pets': ['L.A.S.S.I', 'Mighty Yak', 'Electro Owl', 'Unicorn', 'Phoenix', 'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly', 'Sneezy', 'Greedy Raven'],
  'Builder Base': ['Raged Barbarian', 'Sneaky Archer', 'Beta Minion', 'Boxer Giant', 'Bomber', 'Power P.E.K.K.A', 'Cannon Cart', 'Drop Ship', 'Baby Dragon', 'Night Witch', 'Hog Glider', 'Electrofire Wizard'],
};

describe('cocItemArt', () => {
  it('finds local art for every live item except the known gaps', () => {
    const missing: string[] = [];
    for (const [category, names] of Object.entries(LIVE) as Array<[CocArtCategory, string[]]>) {
      for (const name of names) {
        const art = cocItemArt(name, category);
        if (!art) missing.push(name);
        else expect(existsSync(path.join(PUBLIC, art)), art).toBe(true);
      }
    }
    expect(missing).toEqual([...KNOWN_MISSING_ART]);
  });
  it('returns nothing for a name it does not know, so the tile shows its icon', () => {
    expect(cocItemArt('Totally New Troop', 'Troops')).toBeUndefined();
  });
});

describe('heroArt', () => {
  it('has art on disk for all eight heroes', () => {
    for (const name of ['Barbarian King', 'Archer Queen', 'Grand Warden', 'Royal Champion', 'Minion Prince', 'Dragon Duke', 'Battle Machine', 'Battle Copter']) {
      const art = heroArt(name);
      expect(art, name).toBeDefined();
      expect(existsSync(path.join(PUBLIC, art!)), art).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/app/components/__tests__/cocFacts.test.ts src/app/components/__tests__/cocArt.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `cocFacts.ts`**

Create `src/app/components/cocFacts.ts`:

```ts
import type { CoCAchievement, CoCHeroData, CoCHeroEquipment, CoCTroopData, GameVisuals } from '../data/mockStats';
import { sentenceCase } from '../ui/text';

/** Everything the Clash of Clans mapper puts in gameVisuals.coc. */
export type CoCVisuals = NonNullable<GameVisuals['coc']>;

/** A hero, troop, spell, pet or piece of equipment. */
export interface Leveled {
  level: number;
  maxLevel: number;
}

/**
 * Level progress. Level 0 means not unlocked: the mapper adds missing heroes,
 * pets and siege machines with level 0 and a guessed max, so no max is shown for them.
 */
export function levelFacts(item: Leveled): { locked: boolean; maxed: boolean; pct: number } {
  const locked = item.level <= 0;
  const maxed = !locked && item.maxLevel > 0 && item.level >= item.maxLevel;
  const pct = locked || item.maxLevel <= 0 ? 0 : Math.min(100, Math.round((item.level / item.maxLevel) * 100));
  return { locked, maxed, pct };
}

const ROLES: Record<string, string> = { leader: 'Leader', coLeader: 'Co-leader', admin: 'Elder', member: 'Member' };

/** The API's clan role id in the game's words ('admin' is an Elder in the game). */
export function roleLabel(role: string | undefined): string | undefined {
  if (!role) return undefined;
  return ROLES[role] ?? sentenceCase(role);
}

/** Folder families of the local art (cocArt.ts). */
export type CocArtCategory = 'Troops' | 'Super Troops' | 'Spells' | 'Siege Machines' | 'Hero Pets' | 'Builder Base';
export type ArmyKind = 'troops' | 'superTroops' | 'spells' | 'siegeMachines' | 'pets' | 'builderBaseTroops';

/** Army tab sections, home village first. */
export const ARMY_SECTIONS: ReadonlyArray<{ kind: ArmyKind; title: string; category: CocArtCategory }> = [
  { kind: 'troops', title: 'Troops', category: 'Troops' },
  { kind: 'superTroops', title: 'Super troops', category: 'Super Troops' },
  { kind: 'spells', title: 'Spells', category: 'Spells' },
  { kind: 'siegeMachines', title: 'Siege machines', category: 'Siege Machines' },
  { kind: 'pets', title: 'Pets', category: 'Hero Pets' },
  { kind: 'builderBaseTroops', title: 'Builder base troops', category: 'Builder Base' },
];

export function sectionFacts(items: readonly CoCTroopData[]): { total: number; unlocked: number; maxed: number; boosted: number } {
  let unlocked = 0;
  let maxed = 0;
  let boosted = 0;
  for (const item of items) {
    const f = levelFacts(item);
    if (!f.locked) unlocked++;
    if (f.maxed) maxed++;
    if (item.active) boosted++;
  }
  return { total: items.length, unlocked, maxed, boosted };
}

const BUILDER_HEROES = new Set(['BM', 'BC']);

/** Home village heroes and builder base heroes (Battle Machine, Battle Copter), each in API order. */
export function splitHeroes(heroes: readonly CoCHeroData[]): { home: CoCHeroData[]; builder: CoCHeroData[] } {
  return {
    home: heroes.filter((h) => !BUILDER_HEROES.has(h.shortName)),
    builder: heroes.filter((h) => BUILDER_HEROES.has(h.shortName)),
  };
}

export interface EquipmentEntry extends CoCHeroEquipment {
  /** Worn by a hero right now (the owned list itself does not say). */
  equipped: boolean;
}

/** Owned equipment, equipped pieces first, API order otherwise. */
export function equipmentList(heroes: readonly CoCHeroData[], owned: readonly CoCHeroEquipment[]): EquipmentEntry[] {
  const worn = new Set(heroes.flatMap((h) => (h.equipment ?? []).map((e) => e.name)));
  const list = owned.map((e) => ({ ...e, equipped: worn.has(e.name) }));
  return [...list.filter((e) => e.equipped), ...list.filter((e) => !e.equipped)];
}

/** One rule for the tile and the filter: three stars, the API's "Completed!", or the target reached. */
export function isAchievementDone(a: CoCAchievement): boolean {
  return a.stars >= 3 || a.completionInfo === 'Completed!' || (a.target > 0 && a.value >= a.target);
}

/** Completed achievements without stars (account safety) show no star row. */
export function showStars(a: CoCAchievement): boolean {
  return a.stars > 0 || !isAchievementDone(a);
}

/** '2000000000' -> '2,000,000,000' inside API text. The API sends ASCII digits; four or more get separators. */
export function groupDigits(text: string): string {
  return text.replace(/\d{4,}/g, (digits) => Number(digits).toLocaleString('en-US'));
}

export type AchievementVillage = 'all' | 'home' | 'builderBase' | 'clanCapital';
export type AchievementStatus = 'all' | 'done' | 'open';

export const ACHIEVEMENT_VILLAGES: ReadonlyArray<readonly [AchievementVillage, string]> = [
  ['all', 'All'],
  ['home', 'Home village'],
  ['builderBase', 'Builder base'],
  ['clanCapital', 'Clan capital'],
];
export const ACHIEVEMENT_STATUSES: ReadonlyArray<readonly [AchievementStatus, string]> = [
  ['all', 'All'],
  ['done', 'Completed'],
  ['open', 'In progress'],
];

const inVillage = (a: CoCAchievement, v: AchievementVillage) => v === 'all' || a.village === v;
const inStatus = (a: CoCAchievement, s: AchievementStatus) => s === 'all' || (s === 'done') === isAchievementDone(a);

/**
 * The achievements a filter pair shows, plus the count each option would show
 * with the other filter kept, the completed count and the stars earned (whole list).
 */
export function achievementView(list: readonly CoCAchievement[], village: AchievementVillage, status: AchievementStatus) {
  const villageCounts = Object.fromEntries(
    ACHIEVEMENT_VILLAGES.map(([v]) => [v, list.filter((a) => inVillage(a, v) && inStatus(a, status)).length]),
  ) as Record<AchievementVillage, number>;
  const statusCounts = Object.fromEntries(
    ACHIEVEMENT_STATUSES.map(([s]) => [s, list.filter((a) => inVillage(a, village) && inStatus(a, s)).length]),
  ) as Record<AchievementStatus, number>;
  return {
    shown: list.filter((a) => inVillage(a, village) && inStatus(a, status)),
    villageCounts,
    statusCounts,
    done: list.filter(isAchievementDone).length,
    stars: list.reduce((sum, a) => sum + a.stars, 0),
  };
}
```

- [ ] **Step 4: Write `cocArt.ts` (the old candidate walk, moved and typed)**

Create `src/app/components/cocArt.ts`:

```ts
import { resolveCocIcon } from '../data/cocIconIndex';
import type { CocArtCategory } from './cocFacts';

/** Live items with no local art (2026-10-07): their tiles show the section icon. Update when art is added. */
export const KNOWN_MISSING_ART = ['Ruin Witch', 'Sky Wagon', 'Angry Spell'] as const;

/**
 * Local art for an army item, or undefined. Candidate file names follow the
 * wiki exports in public/images/coc; they are resolved against the build-time
 * index, so a wrong guess never costs a request (production answers a missing
 * file with the SPA shell and a 200).
 */
export function cocItemArt(rawName: string, category: CocArtCategory): string | undefined {
  const formatName = rawName.replace(/ /g, '_');
  const baseName = rawName.replace(/ Spell$/i, '').replace(/ /g, '_');
  const petsName = formatName.replace(/\./g, '');
  const paths: string[] = [];

  if (category === 'Troops') {
    paths.push(`/images/coc/troops/Icon_HV_${formatName}.webp`);
    if (rawName === 'Druid') paths.push('/images/coc/troops/Druid_HV_01.webp');
    if (rawName === 'Meteor Golem') paths.push('/images/coc/troops/MeteoriteGolem_withGrassbase_f22_3k.webp', '/images/coc/troops/Icon_HV_Meteorite_Golem.webp');
    if (rawName === 'Thrower') paths.push('/images/coc/troops/Thrower_05_grass.webp');
    paths.push(`/images/coc/clan_capital/Icon_CC_Troop_${formatName}.webp`);
  } else if (category === 'Super Troops') {
    paths.push(`/images/coc/troops/Icon_HV_${formatName}.webp`, `/images/coc/troops/Icon_HV_Super_${formatName}.webp`);
    if (rawName === 'Ice Hound') paths.push('/images/coc/troops/Icon_HV_Ice_Hound.webp');
    if (rawName === 'Super Yeti') paths.push('/images/coc/troops/icon_super_yeti.webp');
    if (rawName === 'Inferno Dragon') paths.push('/images/coc/troops/Icon_HV_Inferno_Dragon.webp', '/images/coc/troops/Icon_HV_Super_Infernodragon.webp');
  } else if (category === 'Builder Base') {
    paths.push(`/images/coc/builder_base/Icon_BB_${formatName}.webp`);
  } else if (category === 'Spells') {
    if (rawName === 'Lightning Spell') paths.push('/images/coc/spells/Icon_HV_Spell_Lightning_new.webp', '/images/coc/spells/lightning_spell.webp');
    if (rawName === 'Healing Spell') paths.push('/images/coc/spells/Icon_HV_Spell_Heal.webp');
    if (rawName === 'Ice Block Spell') paths.push('/images/coc/spells/Icon_HV_Dark_Spell_Ice_block.webp');
    if (rawName === 'Totem Spell') paths.push('/images/coc/spells/Icon_HV_Spell_totem.webp');
    paths.push(
      `/images/coc/spells/Icon_HV_Spell_${baseName}.webp`,
      `/images/coc/spells/Icon_HV_Dark_Spell_${baseName}.webp`,
      `/images/coc/spells/Icon_CC_Spell_${baseName}.webp`,
      `/images/coc/spells/Icon_HV_Spell_${baseName}_new.webp`,
      `/images/coc/spells/Icon_HV_Dark_Spell_${baseName}_new.webp`,
    );
  } else if (category === 'Siege Machines') {
    paths.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_${formatName}.webp`);
    if (rawName === 'Stone Slammer') paths.push('/images/coc/siege_machines/Siege_Machine_HV_Stone_Slammer_2.webp');
    if (rawName === 'Troop Launcher') paths.push('/images/coc/siege_machines/icon_troop_launcher.webp');
  } else if (category === 'Hero Pets') {
    paths.push(`/images/coc/pets/Icon_HV_Hero_Pets_${petsName}.webp`, `/images/coc/pets/Icon_HV_Hero_Pets_${formatName}.webp`);
    if (rawName === 'Angry Jelly') paths.push('/images/coc/pets/Hero_Pet_HV_Angry_Jelly_02.webp', '/images/coc/pets/jelly_2024.webp');
    if (rawName === 'Greedy Raven') paths.push('/images/coc/pets/pet_Greedy_Raven_3_grasspng.webp', '/images/coc/pets/Raven.webp');
  }
  paths.push(`/images/coc/troops/${rawName.toLowerCase().replace(/ /g, '_')}.webp`);
  return resolveCocIcon(paths);
}

const HERO_ART: Record<string, string> = {
  'Barbarian King': '/images/coc/heroes/Barbarian_King_2_grass.webp',
  'Archer Queen': '/images/coc/heroes/Archer_Queen_1.webp',
  'Grand Warden': '/images/coc/heroes/Grand_Warden_2_grass.webp',
  'Royal Champion': '/images/coc/heroes/Royal_Champion_2_grass.webp',
  'Battle Machine': '/images/coc/heroes/Battle_Machine_2_grass.webp',
  'Battle Copter': '/images/coc/heroes/Battle_Copter_1.webp',
  'Minion Prince': '/images/coc/heroes/Hero_Minion_Prince_02_grass.webp',
  'Dragon Duke': '/images/coc/heroes/DragonDuke_f011_4k.webp',
};

/** Local hero portrait, or undefined for a hero added after this table. */
export function heroArt(name: string): string | undefined {
  return HERO_ART[name];
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/app/components/__tests__/cocFacts.test.ts src/app/components/__tests__/cocArt.test.ts`
Expected: PASS. If `cocArt` reports a different `missing` list, a candidate rule was lost in the move: compare with `buildCandidatePaths` in `CoCArmyDisplay.tsx` (still on disk until Task 5) and add the rule that resolved the name, never extend `KNOWN_MISSING_ART` for a file that exists.

Run: `npm run lint && npm run typecheck && npm test`
Expected: green (the new modules are not imported by the app yet; nothing in `dist/` changes).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/cocFacts.ts src/app/components/cocArt.ts src/app/components/__tests__/cocFacts.test.ts src/app/components/__tests__/cocArt.test.ts
git commit -m "feat(coc): pure facts (levels, roles, army, equipment, achievements) and art lookup

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Overview

**Files:**
- Modify: `src/app/components/CoCOverview.tsx` (rewrite, LF), `src/app/pages/game/ClashOfClans.tsx`, `e2e/player.spec.ts`
- Delete: `src/app/components/StatCard.tsx`
- Test: `e2e/coc-panels.spec.ts` (new)

**Interfaces:**
- Consumes: `CoCVisuals`, `roleLabel` (Task 3); Task 2 fields `bestTrophies`, `donations`, `donationsReceived`, `lifetimeAttackWins`, `lifetimeDefenseWins`, `clanTag`, `legendStatistics.currentSeason.rank`, `legendStatistics.bestBuilderBaseSeason`; `Card`, `Row`, `StatTile`, `GameImage` (`ui/`).
- Produces: `CoCOverview({ playerStats }: { playerStats: PlayerStats })`; `ClashOfClans.tsx` switching on `TabId<'clash-of-clans'>` (type alias `CoCTab`); `e2e/coc-panels.spec.ts` with helpers `coc(search?: string)` and `panel(page)` that Tasks 5–8 extend.

- [ ] **Step 1: Read the old component and write the OLD-vs-NEW checklist**

Open `src/app/components/CoCOverview.tsx` (135 lines) and confirm this list is complete before writing code; put the final list in the task report:

| Old (where) | New |
|---|---|
| Legend banner: "Legend League", legend trophies, Best season trophies + 🏆 + "Rank #n" + season id (purple, glow, emoji) | Legend League card: Legend trophies, This season (`#rank · trophies`, new: `currentSeason`), Best season (`id: #rank · trophies`), Best builder base season (new, live field); no emoji, tokens only |
| Trophies card "Home Village" = `stat4Value` (**best** trophies with 🏆) and "Best: {league}" | Home village = current trophies; Best home village = `bestTrophies` (D59 bug fix) |
| "Builder Base" trophies + 🏆 and Best | Builder base, Best builder base (rows) |
| "Experience Level" = `playerStats.level` (**Town Hall**) + ✨ | dropped here: the summary bar's "Level n" pill now shows the real experience level (Task 2) |
| (not shown) | Builder Hall level row (mapper had it; only the old `extraStats` string showed it) |
| Clan card: badge (`alt="Clan Badge"`), name or "No Clan", role uppercase tracked, "Lv n" | badge (`alt=""`, name printed next to it), name, "Co-leader · Level 18", or "Not in a clan" |
| Donations Sent / Received (parsed back from a string with `[\d,]+`) + coloured arrows | Troops donated / received this season, raw numbers (D58) |
| Capital Contributions (yellow mono) | Capital gold contributed |
| War Stars tile (⭐, "Clan War total") | War stars tile, sub "Clan war total" |
| Attack Wins / Defense Wins tiles (string split of `stat2Value`), "Lifetime" | same tiles from raw numbers, sub "Lifetime" |
| Win Rate tile "Est. Lifetime Rate" | **dropped** (D59: fabricated from two unrelated counters) |
| (old Heroes tab header) league badge + league name | Trophies card header: league badge + "League" + name |

- [ ] **Step 2: Write the failing e2e test**

Create `e2e/coc-panels.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const coc = (search = '') => `/game/clash-of-clans/player/${FIXTURE_TAG}${search}`;
const panel = (page: Page) => page.getByRole('tabpanel');
const card = (page: Page, title: string) => panel(page).locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });

test.describe('Overview tab', () => {
  test('tiles show war stars, lifetime wins and best trophies, and no invented win rate', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(coc());
    const p = panel(page);
    await expect(p.getByText('War stars', { exact: true })).toBeVisible();
    await expect(p.getByText('1,450', { exact: true })).toBeVisible();
    await expect(p.getByText('8,123', { exact: true })).toBeVisible();
    await expect(p.getByText('2,100', { exact: true })).toBeVisible();
    await expect(p.getByText(/win rate/i)).toHaveCount(0);
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('the summary bar shows the experience level next to the Town Hall', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const summary = page.getByTestId('player-summary');
    await expect(summary.getByText('Level 210')).toBeVisible();
    await expect(summary.getByText('Town Hall 15')).toBeVisible();
  });

  test('trophies card separates current from best, with the league and its badge', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const trophies = card(page, 'Trophies');
    await expect(trophies.getByText('Legend League')).toBeVisible();
    await expect(trophies.locator('img[src*="api-assets.clashofclans.com/leagues"]')).toHaveCount(1);
    for (const [label, value] of [['Home village', '5,012'], ['Best home village', '5,340'], ['Builder base', '3,120'], ['Best builder base', '3,333'], ['Builder Hall', 'Level 10']]) {
      await expect(trophies.getByText(label, { exact: true })).toBeVisible();
      await expect(trophies.getByText(value, { exact: true })).toBeVisible();
    }
  });

  test('clan card shows the role in game words and season donations', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const clan = card(page, 'Clan');
    await expect(clan.getByText('Lantern Watch')).toBeVisible();
    await expect(clan.getByText('Co-leader · Level 18')).toBeVisible();
    await expect(clan.getByText('1,200', { exact: true })).toBeVisible();
    await expect(clan.getByText('900', { exact: true })).toBeVisible();
    await expect(clan.getByText('1,234,567', { exact: true })).toBeVisible();
    await expect(clan.getByText(/this season/).first()).toBeVisible();
  });

  test('a player outside a clan reads "Not in a clan", with no role', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { clan: undefined, role: undefined } } });
    await page.goto(coc());
    const clan = card(page, 'Clan');
    await expect(clan.getByText('Not in a clan')).toBeVisible();
    await expect(clan.getByText(/Member|Co-leader/)).toHaveCount(0);
  });

  test('legend card lists legend trophies, this season and the best season', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const legend = card(page, 'Legend League');
    await expect(legend.getByText('2,210', { exact: true })).toBeVisible();
    await expect(legend.getByText('#1,412 · 5,012 trophies')).toBeVisible();
    await expect(legend.getByText('2026-08 · #830 · 5,560 trophies')).toBeVisible();
  });

  test('a player without legend statistics or league gets no legend card and a league icon', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { legendStatistics: undefined, league: undefined } } });
    await page.goto(coc());
    await expect(card(page, 'Legend League')).toHaveCount(0);
    await expect(card(page, 'Trophies').getByText('Unranked')).toBeVisible();
  });
});
```

Run: `npm run build && npx playwright test e2e/coc-panels.spec.ts`
Expected: 6 of 7 FAIL (no "War stars" text, old "Win Rate" tile present, no "Trophies" heading); "no legend card" can pass on the old markup, which has no `section` around its banner.

- [ ] **Step 3: Write the new overview**

Replace `src/app/components/CoCOverview.tsx` with:

```tsx
import { Crown, Shield, Star, Swords, Trophy } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Card } from '../ui/Card';
import { GameImage } from '../ui/GameImage';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { roleLabel } from './cocFacts';

const n = (value: number | undefined) => (value ?? 0).toLocaleString('en-US');

/** Clash of Clans "Overview" tab: headline numbers, trophies, clan and Legend League. */
export function CoCOverview({ playerStats }: { playerStats: PlayerStats }) {
  const coc = playerStats.gameVisuals?.coc;
  if (!coc) return null;
  const legend = coc.legendStatistics;
  const role = roleLabel(coc.clanRole);
  const season = (s: { rank?: number; trophies: number }) => `${s.rank ? `#${n(s.rank)} · ` : ''}${n(s.trophies)} trophies`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="War stars" value={n(coc.warStars)} sub="Clan war total" icon={<Star />} />
        <StatTile label="Attack wins" value={n(coc.lifetimeAttackWins)} sub="Lifetime" icon={<Swords />} />
        <StatTile label="Defense wins" value={n(coc.lifetimeDefenseWins)} sub="Lifetime" icon={<Shield />} />
        <StatTile label="Best trophies" value={n(coc.bestTrophies ?? playerStats.trophies)} sub="Home village" icon={<Trophy />} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card as="section" title="Trophies" className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <GameImage sources={[coc.leagueBadgeUrl]} alt="" width={40} height={40} fallback={<Trophy />} className="size-10 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-xs text-fg-subtle">League</p>
              <p className="text-sm font-semibold text-fg break-words">{coc.leagueName}</p>
            </div>
          </div>
          <div className="divide-y divide-line">
            <Row label="Home village" value={n(playerStats.trophies)} />
            <Row label="Best home village" value={n(coc.bestTrophies)} />
            <Row label="Builder base" value={n(coc.builderBaseTrophies)} />
            <Row label="Best builder base" value={n(coc.bestBuilderBaseTrophies)} />
            <Row label="Builder Hall" value={coc.builderHallLevel > 0 ? `Level ${coc.builderHallLevel}` : 'Not built'} />
          </div>
        </Card>

        <Card as="section" title="Clan" className="min-w-0">
          {coc.clanTag ? (
            <div className="mb-1 flex items-center gap-3">
              <GameImage sources={[coc.clanBadgeUrl]} alt="" width={48} height={48} fallback={<Shield />} className="size-12 shrink-0 object-contain" />
              <div className="min-w-0">
                <p dir="auto" className="text-base font-semibold text-fg break-words">{coc.clanName}</p>
                <p className="text-sm text-fg-muted">
                  {[role, coc.clanLevel ? `Level ${coc.clanLevel}` : undefined].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ) : (
            <p className="mb-1 flex min-h-11 items-center text-sm text-fg-muted">Not in a clan</p>
          )}
          <div className="divide-y divide-line">
            <Row label="Troops donated this season" value={n(coc.donations)} />
            <Row label="Troops received this season" value={n(coc.donationsReceived)} />
            <Row label="Capital gold contributed" value={n(coc.clanCapitalContributions)} />
          </div>
        </Card>

        {legend && legend.legendTrophies > 0 && (
          <Card as="section" title="Legend League" action={<Crown aria-hidden="true" className="size-4 text-accent" />} className="min-w-0 lg:col-span-2">
            <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0">
              <Row label="Legend trophies" value={n(legend.legendTrophies)} />
              {legend.currentSeason && <Row label="This season" value={season(legend.currentSeason)} />}
              {legend.bestSeason && <Row label="Best season" value={`${legend.bestSeason.id} · ${season(legend.bestSeason)}`} />}
              {legend.bestBuilderBaseSeason && (
                <Row label="Best builder base season" value={`${legend.bestBuilderBaseSeason.id} · ${season(legend.bestBuilderBaseSeason)}`} />
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire it, type the tab ids, delete `StatCard`**

Replace `src/app/pages/game/ClashOfClans.tsx` with:

```tsx
import { Award } from 'lucide-react';
import { CoCAchievements } from '../../components/CoCAchievements';
import { CoCArmyDisplay } from '../../components/CoCArmyDisplay';
import { CoCHeroesDisplay } from '../../components/CoCHeroesDisplay';
import { CoCOverview } from '../../components/CoCOverview';
import { EmptyState } from '../../ui/EmptyState';
import type { TabId } from './tabs';
import type { GameModuleProps } from './types';

type CoCTab = TabId<'clash-of-clans'>;

/** Clash of Clans sections: overview | army | heroes | achievements. */
export default function ClashOfClans({ game, playerStats, tab }: GameModuleProps) {
  const coc = playerStats.gameVisuals?.coc;
  if (!coc) {
    return (
      <EmptyState icon={<Award />} title="No Clash of Clans profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }

  // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
  switch (tab as CoCTab) {
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
      return <CoCOverview playerStats={playerStats} />;
  }
}
```

(Tasks 5–7 replace the army, heroes and achievements branches; `game` goes away with the last `accent` prop in Task 7.)

Run: `git rm src/app/components/StatCard.tsx` (its only importer was the old overview: `grep -rn StatCard src` must print nothing).

In `e2e/player.spec.ts` replace the Clash of Clans entry of `GAMES` (D63) with:

```ts
  { id: 'clash-of-clans', player: 'Harrow Keep', module: (page: Page) => page.getByRole('tabpanel').getByText('War stars', { exact: true }) },
```

- [ ] **Step 5: Run the tests**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npx playwright test e2e/coc-panels.spec.ts e2e/player.spec.ts e2e/tabs.spec.ts`
Expected: PASS (7 overview tests, player and tabs specs).

Run: `npm run e2e`
Expected: green. The budget block now prints `initialJs 83.79` and `playerPageJs` ≈ 115.7: deleting `StatCard` took the `motion` chunk off every page (D66); the remaining `MotionConfig` goes in Task 9.

- [ ] **Step 6: Screenshots: look at them**

Run: `npm run build && SCREENSHOT_DIR=/tmp/p4-shots/t4 SCREENSHOT_ONLY=clash-of-clans npm run screenshots`
Open `/tmp/p4-shots/t4/clash-of-clans-390.png`, `-768.png` and `-1440.png` and check: four tiles in two rows on phones and one row at 1440, no clipped number at 390; Trophies and Clan cards side by side at 1440, stacked below; league badge and clan badge in the reserved boxes (fixtures answer art with a slate pixel); Legend card spans both columns at 1440; one accent colour, no purple, no emoji, no uppercase labels. Then with the live player: `E2E_COC_TAG=<tag> SCREENSHOT_DIR=/tmp/p4-shots/t4-live SCREENSHOT_ONLY=clash-of-clans npm run screenshots` and check the real league badge and clan badge load (api-assets.clashofclans.com), the numbers match the live payload (`curl -s https://supercellstats.com/api/clash-of-clans/players/%23<tag>`: `trophies`, `bestTrophies`, `warStars`, `donations`, achievements Conqueror/Unbreakable `value`), and This season shows the live rank. Do not commit live screenshots.

Tick the OLD-vs-NEW checklist of Step 1 against what you see.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/CoCOverview.tsx src/app/pages/game/ClashOfClans.tsx e2e/coc-panels.spec.ts e2e/player.spec.ts
git add -u src/app/components/StatCard.tsx
git commit -m "feat(coc): restyled overview with honest trophies, clan and legend cards

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Army tab

**Files:**
- Create: `src/app/ui/ProgressBar.tsx`, `src/app/components/CoCItem.tsx`
- Modify: `src/app/components/CoCArmyDisplay.tsx` (rewrite, LF), `src/app/pages/game/ClashOfClans.tsx`, `e2e/coc-panels.spec.ts`

**Interfaces:**
- Consumes: `ARMY_SECTIONS`, `sectionFacts`, `levelFacts`, `Leveled`, `CoCVisuals`, `ArmyKind` (Task 3); `cocItemArt` (Task 3); `Card`, `GameImage`, `Pill`, `EmptyState`, `cx` (`ui/`).
- Produces:
  - `ProgressBar({ pct, className }: { pct: number; className?: string })` in `ui/ProgressBar.tsx` (decorative, `aria-hidden`, clamps 0–100).
  - `LevelText({ item, percent }: { item: Leveled; percent?: boolean })` and `LevelItem({ name, item, art, extra }: { name: string; item?: Leveled; art?: ReactNode; extra?: ReactNode })` in `components/CoCItem.tsx`; every `LevelItem` is an `<li data-testid="coc-item">`.
  - `CoCArmyDisplay({ coc }: { coc: CoCVisuals })`.

- [ ] **Step 1: Read the old component and write the OLD-vs-NEW checklist**

Open `src/app/components/CoCArmyDisplay.tsx` (227 lines):

| Old | New |
|---|---|
| "Army Collection" uppercase tracked heading | no extra heading: the tab is the title; each section is a card |
| Section titles uppercase tracked + "(n)" count | sentence-case card titles + "n of m at max level" (super troops: "n boosted now") |
| Order: Troops, Builder Base, Super Troops, Spells, Siege Machines, Hero Pets | Troops, Super troops, Spells, Siege machines, Pets, Builder base troops (D60) |
| 48 px icon tile, name only in hover tooltip and `title`, "(Max: n)" only on hover | tile with art, **printed name**, "11 / 12" (sr-only "Level 11 of 12"), decorative bar |
| level "Lvl n" in 9 px, max shown by yellow colour only | "Max" printed in words |
| initials on a gradient when art is missing | the section's lucide icon in the same box (`GameImage` fallback) |
| `TroopIcon` candidate walk + `resolvedIconCache` + `onError` chain | `cocItemArt` (Task 3) resolved at build-time index; `GameImage` handles a failed load |
| `hover:scale-110`, `backdrop-blur-sm` level strip | removed (no blur, no hover-only motion) |
| super troops shown with "Lvl 1" | no level (D60), "Boosted now" pill when active |
| padded level-0 siege machines/pets shown as "Lvl 0" | "Not unlocked", no max; a section with nothing unlocked collapses to "None unlocked yet" |
| returns `null` when there is no army at all | empty state "No army in this answer" |

- [ ] **Step 2: Write the failing e2e tests**

Append to `e2e/coc-panels.spec.ts` (and add `cocLowTownHall` to its imports: `import { cocLowTownHall } from './support/fixtures';`):

```ts
test.describe('Army tab', () => {
  const section = (page: Page, title: string) => card(page, title);

  test('sections come home village first, with names and levels printed', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const titles = panel(page).getByRole('heading', { level: 3 });
    await expect(titles).toHaveText(['Troops', 'Super troops', 'Spells', 'Siege machines', 'Pets', 'Builder base troops']);
    const troops = section(page, 'Troops');
    await expect(troops.getByTestId('coc-item')).toHaveCount(5);
    await expect(troops.getByTestId('coc-item').filter({ hasText: 'Barbarian' }).first()).toContainText('11 / 12');
    await expect(troops.getByTestId('coc-item').filter({ hasText: 'Archer' })).toContainText('Max');
    await expect(troops.getByText('Meteor Golem')).toBeVisible();
    await expect(troops.getByText('1 of 5 at max level')).toBeVisible();
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('levels are worded for screen readers', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const barbarian = section(page, 'Troops').getByTestId('coc-item').first();
    await expect(barbarian.locator('.sr-only').first()).toHaveText('Level 11 of 12');
    await expect(barbarian.locator('[aria-hidden="true"]').filter({ hasText: '11 / 12' })).toHaveCount(1);
  });

  test('super troops show no level, and the boosted one says so', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const sup = section(page, 'Super troops');
    await expect(sup.getByTestId('coc-item')).toHaveCount(3);
    await expect(sup.getByText('Super Yeti')).toBeVisible();
    await expect(sup.getByTestId('coc-item').filter({ hasText: 'Sneaky Goblin' })).toContainText('Boosted now');
    await expect(sup.getByText(/\d+ \/ \d+/)).toHaveCount(0);
    await expect(sup.getByText('1 boosted now')).toBeVisible();
  });

  test('items without local art keep their box with an icon, never a broken image', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const wagon = section(page, 'Troops').getByTestId('coc-item').filter({ hasText: 'Sky Wagon' });
    await expect(wagon.getByTestId('game-image-fallback')).toHaveCount(1);
    await expect(section(page, 'Troops').getByTestId('coc-item').filter({ hasText: 'Barbarian' }).first().locator('img')).toHaveAttribute('src', /\/images\/coc\/troops\//);
  });

  test('padded items read "Not unlocked" and an all-locked section collapses', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': cocLowTownHall } });
    await page.goto(coc('?tab=army'));
    await expect(section(page, 'Siege machines').getByText('None unlocked yet')).toBeVisible();
    await expect(section(page, 'Siege machines').getByTestId('coc-item')).toHaveCount(0);
    await expect(section(page, 'Super troops')).toHaveCount(0);
  });

  test('a player with no army at all gets an empty state', async ({ page }) => {
    await mockApi(page);
    await page.route('**/api/clash-of-clans/players/**', (route) => route.fulfill({ json: { name: 'Harrow Keep', tag: `#${FIXTURE_TAG}` } }));
    await page.goto(coc('?tab=army'));
    await expect(page.getByTestId('empty-state').getByText('No army in this answer')).toBeVisible();
  });
});
```

Note: the last test answers a payload with no troops at all; the mapper still pads 8 siege machines and 12 pets at level 0, so "no army" means nothing unlocked anywhere: `CoCArmyDisplay` shows the empty state when no section has an unlocked item.

Run: `npm run build && npx playwright test e2e/coc-panels.spec.ts -g "Army tab"`
Expected: FAIL (old headings are uppercase "TROOPS" with counts, no `coc-item`).

- [ ] **Step 3: Decorative bar**

Create `src/app/ui/ProgressBar.tsx`:

```tsx
import { cx } from './cx';

/** A thin progress bar. Decorative: the number it shows is always printed next to it. */
export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <span aria-hidden="true" className={cx('block h-1.5 overflow-hidden rounded-pill bg-surface-2', className)}>
      <span className="block h-full rounded-pill bg-accent" style={{ width: `${width}%` }} />
    </span>
  );
}
```

- [ ] **Step 4: Level text and item tile**

Create `src/app/components/CoCItem.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ProgressBar } from '../ui/ProgressBar';
import { levelFacts, type Leveled } from './cocFacts';

/** "11 / 12", "12 / 12 Max" or "Not unlocked"; screen readers hear "Level 11 of 12". */
export function LevelText({ item, percent = false }: { item: Leveled; percent?: boolean }) {
  const f = levelFacts(item);
  if (f.locked) return <span className="text-xs text-fg-subtle">Not unlocked</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 text-xs tabular-nums text-fg-muted">
      <span aria-hidden="true">
        {item.level} / {item.maxLevel}
      </span>
      <span className="sr-only">
        Level {item.level} of {item.maxLevel}
      </span>
      {percent && !f.maxed && <span className="text-fg-subtle">· {f.pct}%</span>}
      {f.maxed && <span className="font-semibold text-accent">Max</span>}
    </span>
  );
}

interface LevelItemProps {
  name: string;
  /** Omitted for things without a meaningful level (super troops). */
  item?: Leveled;
  /** A GameImage, already sized. */
  art?: ReactNode;
  /** Pills next to the level ("Boosted now", "Equipped"). */
  extra?: ReactNode;
}

/** One troop, spell, pet or piece of equipment: art, printed name and level, a bar. */
export function LevelItem({ name, item, art, extra }: LevelItemProps) {
  const f = item ? levelFacts(item) : undefined;
  return (
    <li data-testid="coc-item" className="flex min-w-0 items-center gap-3 rounded-card border border-line bg-surface-1 p-2.5 sm:p-3">
      {art}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium text-fg break-words">{name}</p>
        {(item || extra) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {item && <LevelText item={item} />}
            {extra}
          </div>
        )}
        {f && !f.locked && <ProgressBar pct={f.pct} className="mt-1.5" />}
      </div>
    </li>
  );
}
```

- [ ] **Step 5: The army tab**

Replace `src/app/components/CoCArmyDisplay.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { FlaskConical, Hammer, PawPrint, Rocket, Sparkles, Swords } from 'lucide-react';
import type { CoCTroopData } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { cocItemArt } from './cocArt';
import { ARMY_SECTIONS, sectionFacts, type ArmyKind, type CoCVisuals } from './cocFacts';
import { LevelItem } from './CoCItem';

const ICONS: Record<ArmyKind, ReactNode> = {
  troops: <Swords />,
  superTroops: <Sparkles />,
  spells: <FlaskConical />,
  siegeMachines: <Rocket />,
  pets: <PawPrint />,
  builderBaseTroops: <Hammer />,
};

/** Clash of Clans "Army" tab: every troop, spell, siege machine and pet with its level. */
export function CoCArmyDisplay({ coc }: { coc: CoCVisuals }) {
  const sections = ARMY_SECTIONS.map((s) => ({ ...s, items: (coc[s.kind] ?? []) as CoCTroopData[] })).filter((s) => s.items.length > 0);
  if (!sections.some((s) => sectionFacts(s.items).unlocked > 0)) {
    return (
      <EmptyState icon={<Swords />} title="No army in this answer">
        The API listed no unlocked troop, spell, siege machine or pet for this player.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map(({ kind, title, category, items }) => {
        const facts = sectionFacts(items);
        const superTroops = kind === 'superTroops';
        const summary = superTroops
          ? facts.boosted > 0 ? `${facts.boosted} boosted now` : undefined
          : `${facts.maxed} of ${facts.total} at max level`;
        return (
          <Card
            as="section"
            key={kind}
            title={title}
            action={summary && <span className="text-xs text-fg-subtle tabular-nums">{summary}</span>}
            className="min-w-0"
          >
            {facts.unlocked === 0 ? (
              <p className="text-sm text-fg-subtle">None unlocked yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {items.map((t, i) => (
                  <LevelItem
                    key={`${t.name}-${i}`}
                    name={t.name}
                    item={superTroops ? undefined : t}
                    art={
                      <GameImage
                        sources={[cocItemArt(t.name, category)]}
                        alt=""
                        width={40}
                        height={40}
                        fallback={ICONS[kind]}
                        className="size-9 shrink-0 object-contain sm:size-10 [&_svg]:size-5"
                      />
                    }
                    extra={superTroops && t.active ? <Pill tone="accent">Boosted now</Pill> : undefined}
                  />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

Super troops of a player who unlocked none (all level 0 is not possible: the API lists super troops only once unlocked) are omitted with their section like any empty section.

In `src/app/pages/game/ClashOfClans.tsx` replace the whole `case 'army':` branch with:

```tsx
    case 'army':
      return <CoCArmyDisplay coc={coc} />;
```

- [ ] **Step 6: Run the tests**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npx playwright test e2e/coc-panels.spec.ts`
Expected: PASS (overview and the 6 army tests). Then `npm run e2e`: green.

- [ ] **Step 7: Screenshots and the live player: look at them**

Run: `SCREENSHOT_DIR=/tmp/p4-shots/t5 SCREENSHOT_ONLY=clash-of-clans-army npm run screenshots`
Open the three images: two columns at 390, three at 768, four at 1440; names wrap inside their tile, never overflow; "Max" in the accent colour; the Sky Wagon and Angry Spell tiles show the section icon in a 40 px box; locked rows say "Not unlocked" without a bar.

Live player: `E2E_COC_TAG=<tag> SCREENSHOT_DIR=/tmp/p4-shots/t5-live SCREENSHOT_ONLY=clash-of-clans-army npm run screenshots`, open `clash-of-clans-army-390.png` and `-1440.png`: 97 items, Meteor Golem in Troops, Super Yeti in Super troops, "2 boosted now" (Super Wall Breaker, Super Bowler on 2026-10-07), every item but Ruin Witch, Sky Wagon and Angry Spell with art. Write the page height at 390 into the task report (`file /tmp/p4-shots/t5-live/clash-of-clans-army-390.png` prints the size; D64 measured 5,486 px, limit 6,000). Do not commit live screenshots.

Tick the OLD-vs-NEW checklist of Step 1 against what you see.

- [ ] **Step 8: Commit**

```bash
git add src/app/ui/ProgressBar.tsx src/app/components/CoCItem.tsx src/app/components/CoCArmyDisplay.tsx src/app/pages/game/ClashOfClans.tsx e2e/coc-panels.spec.ts
git commit -m "feat(coc): army tab with printed names and levels, home village first

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Heroes and equipment tab

**Files:**
- Create: `src/app/components/CoCHeroes.tsx` (LF)
- Delete: `src/app/components/CoCHeroesDisplay.tsx` (CRLF)
- Modify: `src/app/pages/game/ClashOfClans.tsx`, `e2e/coc-panels.spec.ts`

**Interfaces:**
- Consumes: `splitHeroes`, `equipmentList`, `levelFacts` (Task 3); `heroArt` (Task 3); `LevelText`, `LevelItem` (Task 5); `ProgressBar` (Task 5); `Card`, `GameImage`, `Pill`, `EmptyState` (`ui/`).
- Produces: `CoCHeroes({ heroes, equipment }: { heroes: readonly CoCHeroData[]; equipment: readonly CoCHeroEquipment[] })`; hero cards are `<li data-testid="hero-card">` with the hero name as an `h3`.

- [ ] **Step 1: Read the old component and write the OLD-vs-NEW checklist**

Open `src/app/components/CoCHeroesDisplay.tsx` (206 lines, CRLF):

| Old | New |
|---|---|
| "Heroes" uppercase heading; league badge + league name + clan badge in the header | card title "Heroes"; league badge and name moved to the Overview Trophies card (Task 4), clan badge is in the Clan card (D61) |
| hero portrait with per-hero gradient/border colours; emoji when the image fails | portrait in a `rounded-lg` box (`GameImage`, lucide `Crown` fallback), no per-hero colour |
| **no hero name** (only `alt`) | name as `h3` |
| level badge on the portrait, "Lv n / max", bar in the hero colour, "n%" in 9 px | "85 / 95 · 89%" (`LevelText percent`), accent bar, "Max" in words |
| equipped items: name + "level/max" chips | "Equipped" list with each item's `LevelText`; "Nothing equipped" when a home hero has none |
| locked heroes (padded level 0) shown as "Lv 0 / 95", 0 % | "Not unlocked", no bar, no equipment block |
| builder base heroes: compact row with name, "level / max", bar | own card "Builder base heroes", same hero card |
| "Equipment Inventory" uppercase with a shield icon; tiles with name, "MAX" yellow badge, "Lv n" / "Max n", bar (yellow when max) | card "Equipment" with "n owned · m equipped"; tiles with name, `LevelText` ("Max" in words), accent bar, **Equipped** pill (new: which owned pieces are worn), equipped first |
| `hover:bg-white/7` on hero cards | none (cards are not interactive) |

- [ ] **Step 2: Write the failing e2e tests**

Append to `e2e/coc-panels.spec.ts`:

```ts
test.describe('Heroes tab', () => {
  test('hero cards are named, with level, share and what each hero wears', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(coc('?tab=heroes'));
    const heroes = card(page, 'Heroes').getByTestId('hero-card');
    // Three heroes in the payload, three the mapper adds as not unlocked.
    await expect(heroes).toHaveCount(6);
    const king = heroes.filter({ has: page.getByRole('heading', { name: 'Barbarian King' }) });
    await expect(king).toContainText('85 / 95');
    await expect(king).toContainText('89%');
    await expect(king).toContainText('Barbarian Puppet');
    await expect(king).toContainText('Rage Vial');
    await expect(heroes.filter({ hasText: 'Archer Queen' })).toContainText('Max');
    await expect(heroes.filter({ hasText: 'Royal Champion' })).toContainText('Not unlocked');
    await expect(heroes.filter({ hasText: 'Royal Champion' })).not.toContainText('Equipped');
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('builder base heroes have their own card', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=heroes'));
    const builder = card(page, 'Builder base heroes');
    await expect(builder.getByRole('heading', { name: 'Battle Machine' })).toBeVisible();
    await expect(builder).toContainText('30 / 35');
  });

  test('the equipment list marks equipped pieces and lists them first', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=heroes'));
    const equipment = card(page, 'Equipment');
    await expect(equipment.getByText('8 owned · 5 equipped')).toBeVisible();
    const items = equipment.getByTestId('coc-item');
    await expect(items).toHaveCount(8);
    for (let i = 0; i < 5; i++) await expect(items.nth(i)).toContainText('Equipped');
    await expect(items.nth(5)).toContainText('Giant Arrow');
    await expect(items.nth(5)).not.toContainText('Equipped');
  });

  test('a hero without equipment says so, and a player without equipment gets no equipment card', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { heroes: [{ name: 'Barbarian King', level: 20, maxLevel: 40, village: 'home' }], heroEquipment: [] } } });
    await page.goto(coc('?tab=heroes'));
    await expect(card(page, 'Heroes').getByTestId('hero-card').first()).toContainText('Nothing equipped');
    await expect(card(page, 'Equipment')).toHaveCount(0);
  });
});
```

Run: `npm run build && npx playwright test e2e/coc-panels.spec.ts -g "Heroes tab"`
Expected: FAIL (no `hero-card`, no hero names).

- [ ] **Step 3: The heroes tab**

Create `src/app/components/CoCHeroes.tsx`:

```tsx
import { Crown, Shield } from 'lucide-react';
import type { CoCHeroData, CoCHeroEquipment } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { ProgressBar } from '../ui/ProgressBar';
import { heroArt } from './cocArt';
import { equipmentList, levelFacts, splitHeroes } from './cocFacts';
import { LevelItem, LevelText } from './CoCItem';

interface CoCHeroesProps {
  heroes: readonly CoCHeroData[];
  equipment: readonly CoCHeroEquipment[];
}

/** Clash of Clans "Heroes and equipment" tab. */
export function CoCHeroes({ heroes, equipment }: CoCHeroesProps) {
  if (heroes.length === 0 && equipment.length === 0) {
    return (
      <EmptyState icon={<Crown />} title="No heroes in this answer">
        The API listed no hero or equipment for this player.
      </EmptyState>
    );
  }
  const { home, builder } = splitHeroes(heroes);
  const pieces = equipmentList(heroes, equipment);
  const equipped = pieces.filter((e) => e.equipped).length;

  return (
    <div className="space-y-4">
      {home.length > 0 && (
        <Card as="section" title="Heroes" className="min-w-0">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {home.map((hero) => <HeroCard key={hero.name} hero={hero} showEquipment />)}
          </ul>
        </Card>
      )}
      {builder.length > 0 && (
        <Card as="section" title="Builder base heroes" className="min-w-0">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {builder.map((hero) => <HeroCard key={hero.name} hero={hero} showEquipment={false} />)}
          </ul>
        </Card>
      )}
      {pieces.length > 0 && (
        <Card
          as="section"
          title="Equipment"
          action={<span className="text-xs text-fg-subtle tabular-nums">{pieces.length} owned · {equipped} equipped</span>}
          className="min-w-0"
        >
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {pieces.map((piece, i) => (
              <LevelItem
                key={`${piece.name}-${i}`}
                name={piece.name}
                item={piece}
                extra={piece.equipped ? <Pill tone="accent">Equipped</Pill> : undefined}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function HeroCard({ hero, showEquipment }: { hero: CoCHeroData; showEquipment: boolean }) {
  const f = levelFacts(hero);
  const worn = hero.equipment ?? [];
  return (
    <li data-testid="hero-card" className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface-1 p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <GameImage
          sources={[heroArt(hero.name)]}
          alt=""
          width={64}
          height={64}
          fallback={<Crown />}
          className="size-14 shrink-0 rounded-lg bg-surface-2 object-cover sm:size-16"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-fg break-words">{hero.name}</h3>
          <LevelText item={hero} percent />
          {!f.locked && <ProgressBar pct={f.pct} className="mt-2" />}
        </div>
      </div>
      {showEquipment && !f.locked && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-fg-subtle">Equipped</p>
          {worn.length === 0 ? (
            <p className="mt-1 text-sm text-fg-subtle">Nothing equipped</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {worn.map((e, i) => (
                <li key={`${e.name}-${i}`} className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 text-fg-muted break-words">
                    <Shield aria-hidden="true" className="mr-1.5 inline size-3.5 align-[-2px] text-fg-subtle" />
                    {e.name}
                  </span>
                  <span className="shrink-0">
                    <LevelText item={e} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
```

In `src/app/pages/game/ClashOfClans.tsx` replace the import `import { CoCHeroesDisplay } from '../../components/CoCHeroesDisplay';` with `import { CoCHeroes } from '../../components/CoCHeroes';` and the whole `case 'heroes':` branch with:

```tsx
    case 'heroes':
      return <CoCHeroes heroes={coc.heroes} equipment={coc.heroEquipment ?? []} />;
```

Run: `git rm src/app/components/CoCHeroesDisplay.tsx` (`grep -rn CoCHeroesDisplay src e2e` must print nothing).

- [ ] **Step 4: Run the tests**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npx playwright test e2e/coc-panels.spec.ts`
Expected: PASS. Then `npm run e2e`: green.

- [ ] **Step 5: Screenshots and the live player: look at them**

Run: `SCREENSHOT_DIR=/tmp/p4-shots/t6 SCREENSHOT_ONLY=clash-of-clans-heroes npm run screenshots` and open the three images: one hero card per row at 390, two at 768, three at 1440; names never truncated; equipped lines align level to the right without overflow at 390; locked heroes are short cards; Equipment tiles two per row at 390.

Live player: `E2E_COC_TAG=<tag> SCREENSHOT_DIR=/tmp/p4-shots/t6-live SCREENSHOT_ONLY=clash-of-clans-heroes npm run screenshots`: 6 home heroes all "Max" with two pieces each, Battle Machine and Battle Copter in the builder card, "42 owned · 12 equipped", all 8 portraits load. Record the page height at 390 in the report. Do not commit live screenshots.

Tick the OLD-vs-NEW checklist of Step 1 against what you see.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/CoCHeroes.tsx src/app/pages/game/ClashOfClans.tsx e2e/coc-panels.spec.ts
git add -u src/app/components/CoCHeroesDisplay.tsx
git commit -m "feat(coc): heroes tab with named heroes, what they wear and the equipment list

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Achievements tab

**Files:**
- Modify: `src/app/components/CoCAchievements.tsx` (rewrite, LF), `src/app/pages/game/ClashOfClans.tsx`, `e2e/coc-panels.spec.ts`

**Interfaces:**
- Consumes: `achievementView`, `isAchievementDone`, `showStars`, `groupDigits`, `ACHIEVEMENT_VILLAGES`, `ACHIEVEMENT_STATUSES`, `AchievementVillage`, `AchievementStatus` (Task 3); `ProgressBar` (Task 5); `FilterGroup` (Phase 2), `Card`, `StatTile`, `EmptyState`, `Button`, `cx` (`ui/`).
- Produces: `CoCAchievements({ achievements }: { achievements: readonly CoCAchievement[] })`; tiles are `<li data-testid="achievement">`; filters are `section[aria-label="Achievement filters"]`.

- [ ] **Step 1: Read the old component and write the OLD-vs-NEW checklist**

Open `src/app/components/CoCAchievements.tsx` (108 lines):

| Old | New |
|---|---|
| heading "Achievements" + "Tracked progress across villages" | two summary tiles: Completed "n" ("of m achievements"), Stars earned |
| village `<select>` (All Villages / Home Village / Builder Base / Clan Capital) | `FilterGroup` "Village": All, Home village, Builder base, Clan capital, each with its count |
| status `<select>` (All Status / Completed / In Progress) | `FilterGroup` "Status": All, Completed, In progress, with counts |
| filter "completed" = 3 stars or "Completed!"; card "completed" also by value | one rule, `isAchievementDone` (D62) |
| name, check / empty circle icon | name (`h3`), stars 0–3 with sr-only "n of 3 stars" (new), check icon + sr-only "Completed:" on done |
| description (`info`) | description, grouped digits; below `sm` sr-only for completed ones (D62) |
| progress: value and target in mono 10 px + bar | "41,000,000 / 100,000,000" (sr-only "of") + bar |
| completion chip (`completionInfo` or "Completed", green) | completion line with the check icon, grouped digits ("Total Gold looted: 2,000,000,000") |
| "No achievements match the selected filters." text | empty state "No achievements match" with "Reset filters" (focus returns to the first village option) |
| (no count of shown items) | "Showing n of m achievements" (polite live region) |

- [ ] **Step 2: Write the failing e2e tests**

Append to `e2e/coc-panels.spec.ts` (add `expectTouchTargets` to the helpers import):

```ts
test.describe('Achievements tab', () => {
  const filters = (page: Page) => panel(page).locator('section[aria-label="Achievement filters"]');
  const option = (page: Page, name: string) => filters(page).locator('label').filter({ hasText: new RegExp(`^${name}\\s*\\d+$`) });

  test('summary, counts and one completion rule', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(coc('?tab=achievements'));
    const p = panel(page);
    await expect(p.getByText('Showing 8 of 8 achievements')).toBeVisible();
    await expect(p.getByText('of 8 achievements', { exact: true })).toBeVisible();
    await expect(option(page, 'Completed')).toContainText('5');
    await expect(option(page, 'In progress')).toContainText('3');
    // Dragon Slayer is done by value: it is listed under Completed (it vanished there before).
    await option(page, 'Completed').click();
    await expect(p.getByTestId('achievement').filter({ hasText: 'Dragon Slayer' })).toHaveCount(1);
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('tiles show stars in words, grouped numbers and progress', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=achievements'));
    const tiles = panel(page).getByTestId('achievement');
    const gold = tiles.filter({ hasText: 'Gold Grab' });
    await expect(gold).toContainText('2 of 3 stars');
    await expect(gold).toContainText('41,000,000');
    await expect(gold).toContainText('100,000,000');
    await expect(gold).toContainText('Steal 100,000,000 gold');
    const conqueror = tiles.filter({ hasText: 'Conqueror' });
    await expect(conqueror).toContainText('Total multiplayer battles won: 8,123');
    await expect(conqueror).toContainText('Completed');
    // A completed achievement without stars shows no star row.
    await expect(tiles.filter({ hasText: 'Keep Your Account Safe!' })).not.toContainText('of 3 stars');
  });

  test('filters combine, and an empty result offers a reset that returns focus', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=achievements'));
    const p = panel(page);
    await option(page, 'Builder base').click();
    await expect(p.getByTestId('achievement')).toHaveCount(1);
    await option(page, 'In progress').click();
    await expect(p.getByTestId('empty-state').getByText('No achievements match')).toBeVisible();
    await p.getByRole('button', { name: 'Reset filters' }).click();
    await expect(p.getByTestId('achievement')).toHaveCount(8);
    await expect(filters(page).getByRole('radio').first()).toBeFocused();
  });

  test('filter options are at least 44px tall on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page);
    await page.goto(coc('?tab=achievements'));
    await expect(option(page, 'Home village')).toBeVisible();
    await expectTouchTargets(filters(page).locator('label > span'));
  });

  test('below sm a completed achievement keeps its description for screen readers only', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page);
    await page.goto(coc('?tab=achievements'));
    const conqueror = panel(page).getByTestId('achievement').filter({ hasText: 'Conqueror' });
    await expect(conqueror.getByText('Win 5,000 multiplayer battles')).toHaveClass(/max-sm:sr-only/);
    await expect(panel(page).getByTestId('achievement').filter({ hasText: 'Gold Grab' }).getByText('Steal 100,000,000 gold')).toBeVisible();
  });
});
```

Run: `npm run build && npx playwright test e2e/coc-panels.spec.ts -g "Achievements tab"`
Expected: FAIL (selects, no `achievement` test ids).

- [ ] **Step 3: The achievements tab**

Replace `src/app/components/CoCAchievements.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, SearchX, Star } from 'lucide-react';
import type { CoCAchievement } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { FilterGroup } from '../ui/FilterGroup';
import { ProgressBar } from '../ui/ProgressBar';
import { StatTile } from '../ui/StatTile';
import {
  ACHIEVEMENT_STATUSES, ACHIEVEMENT_VILLAGES, achievementView, groupDigits, isAchievementDone, showStars,
  type AchievementStatus, type AchievementVillage,
} from './cocFacts';

const n = (value: number) => value.toLocaleString('en-US');

/** Clash of Clans "Achievements" tab: progress per achievement, filterable by village and status. */
export function CoCAchievements({ achievements }: { achievements: readonly CoCAchievement[] }) {
  const [village, setVillage] = useState<AchievementVillage>('all');
  const [status, setStatus] = useState<AchievementStatus>('all');
  const filtersRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  // "Reset filters" disappears with the empty state: give focus to the first village option.
  useEffect(() => {
    if (refocus.current) {
      refocus.current = false;
      filtersRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
    }
  });

  const view = achievementView(achievements, village, status);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Completed" value={n(view.done)} sub={`of ${n(achievements.length)} achievements`} icon={<Award />} />
        <StatTile label="Stars earned" value={n(view.stars)} sub="All villages" icon={<Star />} />
      </div>

      <Card as="section" aria-label="Achievement filters" className="grid gap-4 sm:grid-cols-2">
        <div ref={filtersRef} className="min-w-0">
          <FilterGroup
            legend="Village"
            options={ACHIEVEMENT_VILLAGES.map(([value, label]) => ({ value, label, count: view.villageCounts[value] }))}
            value={village}
            onChange={(v) => setVillage(v as AchievementVillage)}
          />
        </div>
        <FilterGroup
          legend="Status"
          options={ACHIEVEMENT_STATUSES.map(([value, label]) => ({ value, label, count: view.statusCounts[value] }))}
          value={status}
          onChange={(s) => setStatus(s as AchievementStatus)}
        />
      </Card>

      <p aria-live="polite" className="text-sm text-fg-muted">
        Showing {view.shown.length} of {achievements.length} achievements
      </p>

      {view.shown.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No achievements match"
          action={<Button onClick={() => { refocus.current = true; setVillage('all'); setStatus('all'); }}>Reset filters</Button>}
        >
          No achievement fits both filters. Pick another village or status.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {view.shown.map((a, i) => <AchievementTile key={`${a.name}-${a.village}-${i}`} achievement={a} />)}
        </ul>
      )}
    </div>
  );
}

function AchievementTile({ achievement: a }: { achievement: CoCAchievement }) {
  const done = isAchievementDone(a);
  const pct = a.target > 0 ? (a.value / a.target) * 100 : 0;
  return (
    <li data-testid="achievement" className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface-1 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-semibold text-fg break-words">{a.name}</h3>
        {showStars(a) && <Stars count={a.stars} />}
      </div>
      {a.info && <p className={cx('text-xs text-fg-muted', done && 'max-sm:sr-only')}>{groupDigits(a.info)}</p>}
      {done ? (
        <p className="flex min-w-0 items-start gap-1.5 text-xs text-fg-muted">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-accent" />
          <span className="min-w-0 break-words">
            {a.completionInfo && a.completionInfo !== 'Completed!' ? (
              <>
                <span className="sr-only">Completed: </span>
                {groupDigits(a.completionInfo)}
              </>
            ) : (
              'Completed'
            )}
          </span>
        </p>
      ) : (
        <div>
          <p className="flex justify-between gap-3 text-xs tabular-nums text-fg-muted">
            <span>
              {n(a.value)}
              <span className="sr-only"> of {n(a.target)}</span>
            </span>
            <span aria-hidden="true">{n(a.target)}</span>
          </p>
          <ProgressBar pct={pct} className="mt-1" />
        </div>
      )}
    </li>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 pt-0.5">
      {[0, 1, 2].map((i) => (
        <Star key={i} aria-hidden="true" className={cx('size-3.5', i < count ? 'fill-current text-accent' : 'text-fg-subtle')} />
      ))}
      <span className="sr-only">{count} of 3 stars</span>
    </span>
  );
}
```

`Card` does not forward refs, so the village group's wrapper `div` carries the ref used to give focus back after a reset.

In `src/app/pages/game/ClashOfClans.tsx`:
1. Replace the `case 'achievements':` branch's `<CoCAchievements achievements={coc.achievements} accent={game.accent} />` with `<CoCAchievements achievements={coc.achievements} />`.
2. The module no longer reads `game`: change the signature to `export default function ClashOfClans({ playerStats, tab }: GameModuleProps) {`.

- [ ] **Step 4: Run the tests**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npx playwright test e2e/coc-panels.spec.ts`
Expected: PASS. Then `npm run e2e`: green.

- [ ] **Step 5: Screenshots and the live player: look at them**

Run: `SCREENSHOT_DIR=/tmp/p4-shots/t7 SCREENSHOT_ONLY=clash-of-clans-achievements npm run screenshots`; open the three images: filter pills wrap without overflow at 390, the selected pill in solid accent with dark text, stars aligned top-right of each tile, one column at 390, two at 768, three at 1440.

Live player: `E2E_COC_TAG=<tag> SCREENSHOT_DIR=/tmp/p4-shots/t7-live SCREENSHOT_ONLY=clash-of-clans-achievements npm run screenshots`: 54 achievements (the two "Keep Your Account Safe!" with their two descriptions), the completed count matches `isAchievementDone` over the live list (`curl` the payload and count by hand: 3 stars, "Completed!", or value ≥ target), long numbers grouped. Record the page height at 390. Do not commit live screenshots.

Tick the OLD-vs-NEW checklist of Step 1 against what you see.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/CoCAchievements.tsx src/app/pages/game/ClashOfClans.tsx e2e/coc-panels.spec.ts
git commit -m "feat(coc): achievements tab with stars, one completion rule and pill filters

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Layout-stability sweep over every Clash of Clans tab, and the live player

**Files:**
- Modify: `e2e/cls.spec.ts`, `e2e/overflow.spec.ts`, `e2e/coc-panels.spec.ts`

**Interfaces:**
- Consumes: the four restyled tabs (Tasks 4–7); `cocLowTownHall` (Task 1); the CLS observer and `MAX_GAP` footer check already in `cls.spec.ts`; `recordOverflow`/`maxOverflow` in `overflow.spec.ts`.
- Produces: Clash of Clans rows in the CLS matrix (1440/390/320), the footer-gap check, the 320 px overflow matrix and the tab-switch overflow loop; an env-gated real-player test that walks every tab.

- [ ] **Step 1: Extend the CLS matrix**

In `e2e/cls.spec.ts`, add to the `PAGES` array (after the Brawl Stars line):

```ts
  ...['', '?tab=army', '?tab=heroes', '?tab=achievements'].map((search) => ({ game: 'clash-of-clans', search })),
```

Append at the end of the file:

```ts
// Short Clash of Clans states: no achievements, a player outside a clan, a small account.
const SHORT_COC: Array<[string, string, Parameters<typeof mockApi>[1], string]> = [
  ['no achievements', '?tab=achievements', { patch: { 'clash-of-clans': { achievements: [] } } }, 'No achievements in this answer'],
  ['no clan', '', { patch: { 'clash-of-clans': { clan: undefined, role: undefined } } }, 'Not in a clan'],
  ['a small account army', '?tab=army', { patch: { 'clash-of-clans': cocLowTownHall } }, 'None unlocked yet'],
  ['a small account heroes', '?tab=heroes', { patch: { 'clash-of-clans': cocLowTownHall } }, 'Nothing equipped'],
];
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  for (const [name, search, options, ready] of SHORT_COC) {
    test(`clash-of-clans ${name} shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockApi(page, options);
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
            if (!entry.hadRecentInput) w.__cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(`/game/clash-of-clans/player/${FIXTURE_TAG}${search}`);
      await expect(page.getByRole('tabpanel').getByText(ready).first()).toBeVisible();
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await page.waitForTimeout(1000);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
    });
  }
}
```

and add `import { cocLowTownHall } from './support/fixtures';` to the imports.

In the footer-gap loop (`const MAX_GAP = 200;`), add to its list:

```ts
    { label: 'CoC achievements', game: 'clash-of-clans', search: '?tab=achievements', options: {} },
    { label: 'CoC no achievements', game: 'clash-of-clans', search: '?tab=achievements', options: { patch: { 'clash-of-clans': { achievements: [] } } } },
    { label: 'CoC small army', game: 'clash-of-clans', search: '?tab=army', options: { patch: { 'clash-of-clans': cocLowTownHall } } },
```

- [ ] **Step 2: Extend the overflow matrix**

In `e2e/overflow.spec.ts`:
1. Add to `PAGES`: `...['', '?tab=army', '?tab=heroes', '?tab=achievements'].map((search) => ({ game: 'clash-of-clans', search })),` and update its comment to `// Every Clash Royale, Brawl Stars and Clash of Clans tab, filtered Battles views included.`
2. Add to `TAB_NAMES`: `'clash-of-clans': ['Army', 'Heroes and equipment', 'Achievements', 'Overview'],`
3. Append:

```ts
test('filtering achievements and a long name never overflow a 320px screen', async ({ page }) => {
  const longName = 'W'.repeat(60);
  await mockApi(page, {
    patch: {
      'clash-of-clans': {
        clan: { tag: '#2Y0Y', name: longName, clanLevel: 18 },
        troops: [{ name: longName, level: 1, maxLevel: 2, village: 'home' }],
      },
    },
  });
  await recordOverflow(page);
  await page.goto(`/game/clash-of-clans/player/${FIXTURE_TAG}`);
  await expect(page.getByRole('tabpanel').getByText(longName)).toBeVisible();
  await page.getByRole('tab', { name: 'Army' }).click();
  await expect(page.getByRole('tabpanel').getByText(longName)).toBeVisible();
  await page.getByRole('tab', { name: 'Achievements' }).click();
  const panel = page.getByRole('tabpanel');
  for (const option of ['Builder base', 'In progress', 'Clan capital', 'Completed', 'All']) {
    await panel.locator('label').filter({ hasText: new RegExp(`^${option}\\s*\\d+$`) }).first().click();
  }
  await page.waitForTimeout(500);
  expect(await maxOverflow(page)).toBe(0);
});
```

- [ ] **Step 3: Run the sweep**

Run: `npm run build && npx playwright test e2e/cls.spec.ts e2e/overflow.spec.ts --workers=6`
Expected: PASS. A CLS failure on a Clash of Clans page means a skeleton→content swap moved something: check first that the art boxes keep their size (`GameImage` `width`/`height` and the `size-*` classes), then the footer (`:has([data-panel-loading])` in `SiteFooter`). Do not add `min-h-dvh` wrappers (D53 superseded).

Run the new and extended specs twice in parallel to catch flakes: `npx playwright test e2e/cls.spec.ts e2e/overflow.spec.ts e2e/coc-panels.spec.ts --workers=6 --repeat-each=2`
Expected: PASS.

- [ ] **Step 4: Real player through the preview proxy**

Append to `e2e/coc-panels.spec.ts`:

```ts
// The live API through the preview's /api proxy (vite.config.ts). Tag from the environment only.
const realTag = process.env.E2E_COC_TAG?.replace(/^#/, '');
test('a real Clash of Clans player renders every tab without errors', async ({ page }) => {
  test.skip(!realTag, 'set E2E_COC_TAG');
  test.setTimeout(60000);
  const problems = watch(page);
  await page.goto(`/game/clash-of-clans/player/${encodeURIComponent(realTag!)}`, { waitUntil: 'networkidle' });
  await expect(panel(page).getByText('War stars', { exact: true })).toBeVisible({ timeout: 15000 });
  await expectNoEmoji(panel(page));
  await page.getByRole('tab', { name: 'Army' }).click();
  await expect(panel(page).getByTestId('coc-item').first()).toBeVisible();
  await expectNoEmoji(panel(page));
  await page.getByRole('tab', { name: 'Heroes and equipment' }).click();
  await expect(panel(page).getByTestId('hero-card').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Achievements' }).click();
  await expect(panel(page).getByText(/^Showing \d+ of \d+ achievements$/)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});
```

Run: `npm run build && E2E_COC_TAG=<tag> npx playwright test e2e/coc-panels.spec.ts -g "real Clash"` (tag of the public ranked player from the owner's brief, typed in the shell, never committed)
Expected: PASS: no console error, no failed request, every art 404 (if any) on an allowed art host only.

- [ ] **Step 5: Look at the live numbers once more**

With the live payload open (`curl -s 'https://supercellstats.com/api/clash-of-clans/players/%23<tag>' | python3 -m json.tool | less`), compare against the live screenshots of Tasks 4–7: trophies, best trophies, war stars, donations, capital contributions, legend trophies and season rank, Conqueror/Unbreakable values, the counts of troops/spells/siege/pets/builder base troops per section, 42 equipment pieces and which 12 are equipped, 54 achievements and the completed count. Any number that does not trace to one field is a bug: fix it in this task (component or `cocFacts.ts`), with a unit test.

- [ ] **Step 6: Page heights on phones (D64)**

Run: `E2E_COC_TAG=<tag> SCREENSHOT_DIR=/tmp/p4-shots/t8-live SCREENSHOT_ONLY=clash-of-clans npm run screenshots` and print the heights:

```bash
for f in /tmp/p4-shots/t8-live/clash-of-clans*-390.png; do python3 -c "import struct,sys;d=open(sys.argv[1],'rb').read(24);print(sys.argv[1].split('/')[-1], struct.unpack('>II', d[16:24])[1])" "$f"; done
```

Record the four heights in the task report. Expected (D64, measured 2026-10-07: 1,669 / 4,051 / 5,486 / 5,304): Overview under 2,500 px, Heroes under 4,500 px, Army under 6,000 px, Achievements under 6,000 px (the live player's lists grow with the game). If a tab is above, shorten the tile (`p-2`, art `size-8`) rather than adding columns, re-measure and record what you changed.

- [ ] **Step 7: Commit**

```bash
git add e2e/cls.spec.ts e2e/overflow.spec.ts e2e/coc-panels.spec.ts
git commit -m "test(coc): CLS, overflow and real-player checks over every Clash of Clans tab

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Home performance: drop `motion`, subset the display font

**Files:**
- Modify: `src/main.tsx`, `vite.config.ts`, `package.json`, `package-lock.json`, `src/styles/fonts.css`
- Create: `public/fonts/Clash-latin.woff2`

**Interfaces:**
- Consumes: Task 4 deleted `StatCard.tsx`, the only component importing `motion/react` (`grep -rn "motion/react" src` must list only `src/main.tsx`).
- Produces: no `motion` in the bundle or in `package.json`; `@font-face` `Clash` served from `/fonts/Clash-latin.woff2` (Latin) with the OTF as fallback face; the Lighthouse numbers of D66 in the task report.

- [ ] **Step 1: Measure before (5 runs, built preview)**

Lighthouse method (same as the 2026-10-06 audit): Lighthouse 13.5.0, default mobile profile (simulated throttling), Playwright's Chromium. Save as `/tmp/lh/run.sh`:

```bash
#!/bin/bash
# usage: run.sh URL OUT_PREFIX RUNS
export CHROME_PATH=$(ls -d $HOME/.cache/ms-playwright/chromium-*/chrome-linux64/chrome | tail -1)
for i in $(seq 1 "$3"); do
  npx -y lighthouse@13.5.0 "$1" --quiet --only-categories=performance,accessibility,best-practices,seo \
    --chrome-flags="--headless=new --no-sandbox" --output=json --output-path="$2-$i.json" >/dev/null 2>&1
  python3 -I -c "
import json,sys;d=json.load(open(sys.argv[1]));a=d['audits']
el=a['lcp-breakdown-insight']['details']['items'][-1].get('selector','?')
print(sys.argv[1].split('/')[-1],{k:round(v['score']*100) for k,v in d['categories'].items()},'FCP',int(a['first-contentful-paint']['numericValue']),'LCP',int(a['largest-contentful-paint']['numericValue']),'TBT',int(a['total-blocking-time']['numericValue']),'CLS',round(a['cumulative-layout-shift']['numericValue'],4),'LCP el',el)
" "$2-$i.json"
done
```

Run: `mkdir -p /tmp/lh && chmod +x /tmp/lh/run.sh && npm run build && (npx vite preview --host 127.0.0.1 --port 4180 --strictPort &) && sleep 3 && /tmp/lh/run.sh http://127.0.0.1:4180/ /tmp/lh/home-before 5`
Expected (D66, after Tasks 1–8): performance 96, LCP ~2,650 ms, FCP ~1,710 ms, LCP element `img.pointer-events-none` (the first card's art). (On `562db29`, before Task 4 deleted `StatCard`, the same method gave 93, LCP 2,943 ms, FCP 2,018 ms.) Keep the five lines for the report. If the build crashes in the browser with "Cannot read properties of null (reading 'useState')", a stray `node_modules/node_modules` symlink is loading a second React (Open concern 4).

- [ ] **Step 2: Drop what is left of `motion`**

Replace `src/main.tsx` with:

```tsx
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
import "./styles/index.css";

// No animation library: the remaining motion is CSS (motion-safe:), which honours prefers-reduced-motion.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

In `vite.config.ts` delete the line `if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';` (and nothing else in `manualChunks`).

Run: `npm uninstall motion` (updates `package.json` and `package-lock.json`; no other dependency changes: check with `git diff --stat package.json package-lock.json` and `git diff package.json` showing only the `motion` line removed).

Run: `grep -rn "motion/react\|from 'motion'\|MotionConfig" src e2e scripts` → no output.

Run: `npm run build | sed -n '/performance budget/,$p'`
Expected: `initialJs` 83.79 → **83.33**, `playerPageJs` 115.82 → **115.33**, `entryJs` 6.73 → 6.69; all `✓`. `ls dist/assets | grep -c motion` → `0`.

- [ ] **Step 3: Subset the display font to Latin WOFF2**

`/fonts/Clash_Regular.otf` (48.3 KB, OpenType CFF) is requested at "VeryHigh" priority on every page for the h1 and game names. Make a Latin subset in a temporary directory (the tool is not added to the repo):

```bash
mkdir -p /tmp/fontsub && cd /tmp/fontsub && npm init -y >/dev/null && npm i subset-font@2 >/dev/null
cat > sub.mjs <<'EOF'
import subsetFont from 'subset-font';
import { readFile, writeFile } from 'node:fs/promises';
let text = '';
for (let c = 0x20; c <= 0x7e; c++) text += String.fromCodePoint(c);
for (let c = 0xa0; c <= 0xff; c++) text += String.fromCodePoint(c);
text += '–—‘’“”…€';
const out = await subsetFont(await readFile(process.argv[2]), text, { targetFormat: 'woff2' });
await writeFile(process.argv[3], out);
console.log(out.length, 'bytes');
EOF
node sub.mjs /home/nixo/SUPERCELL-STATS/public/fonts/Clash_Regular.otf /home/nixo/SUPERCELL-STATS/public/fonts/Clash-latin.woff2
cd /home/nixo/SUPERCELL-STATS
```

Expected: `17152 bytes` (± a few hundred with another `subset-font` patch version).

In `src/styles/fonts.css` replace the Clash block

```css
/* Supercell-style display font, self-hosted (public/fonts/). */
@font-face {
  font-family: 'Clash';
  src: url('/fonts/Clash_Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

with

```css
/* Supercell-style display font, self-hosted (public/fonts/). Clash-latin.woff2 is
   Clash_Regular.otf subset to Basic Latin, Latin-1 and common punctuation with the
   subset-font npm package (17 KB instead of 48 KB); the full OTF stays as the face
   for any other character, so it downloads only when a page needs one. The rule
   defined last is matched first. */
@font-face {
  font-family: 'Clash';
  src: url('/fonts/Clash_Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Clash';
  src: url('/fonts/Clash-latin.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0020-007E, U+00A0-00FF, U+2013-2014, U+2018-2019, U+201C-201D, U+2026, U+20AC;
}
```

- [ ] **Step 4: Check nothing else moved**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: green. The fonts budget line is unchanged (it counts preloaded fonts only; Clash is not preloaded).

Check the network on Home: `npx playwright test e2e/home.spec.ts` passes, and by hand in the preview (DevTools, or a one-off Playwright script) `/fonts/Clash-latin.woff2` is requested and `/fonts/Clash_Regular.otf` is **not**, on `/` and on a Clash of Clans player page with an ASCII name.

Screenshots: `SCREENSHOT_DIR=/tmp/p4-shots/t9 SCREENSHOT_ONLY=home npm run screenshots`, open the three images next to `docs/screenshots/phase3/home-*.png`: the h1 "Stats" and the three game names look identical (same glyphs, checked in the throwaway at 390).

- [ ] **Step 5: Measure after (5 runs) and on the player pages**

Run: `npm run build && /tmp/lh/run.sh http://127.0.0.1:4180/ /tmp/lh/home-after 5`
Expected (D66): performance 97, LCP ~2,490 ms, FCP ~1,555 ms, TBT < 150 ms, CLS 0, accessibility/best practices/SEO 100. Then one run on each game landing: `for g in clash-royale brawl-stars clash-of-clans; do /tmp/lh/run.sh http://127.0.0.1:4180/game/$g /tmp/lh/$g 1; done`: measured 98 each, a11y/BP/SEO 100.

If the font change does not lower FCP by at least 100 ms or CLS/accessibility regress, do not commit it: revert `fonts.css` and the woff2, keep the `motion` removal, and report the numbers.

Write the before/after table (5 runs each: score, FCP, LCP, TBT, CLS, LCP element) into the task report and the PR.

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx vite.config.ts package.json package-lock.json src/styles/fonts.css public/fonts/Clash-latin.woff2
git commit -m "perf(home): drop motion from the entry and subset the display font

Initial JS on / 83.8 -> 83.3 KB gzip (StatCard's removal already took the
motion chunk off Home); Lighthouse mobile on the built preview 96 -> 97
(LCP 2.65 -> 2.49 s, FCP 1.71 -> 1.56 s), CLS 0, a11y 100.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Review screenshots

**Files:**
- Create: `docs/screenshots/phase4/*.png` (21 files: 7 pages × 3 widths, fixtures)

**Interfaces:**
- Consumes: `npm run screenshots` page list of Task 1; everything above.
- Produces: the committed review screenshots the PR links to.

- [ ] **Step 1: Generate**

Run: `npm run build && npm run screenshots`
Expected: 21 lines `wrote docs/screenshots/phase4/<page>-<width>.png (fixtures)`.

- [ ] **Step 2: Look at every image**

Open each of the 21 PNGs, including the six `-768.png` files, and check:
- Home: three cards, art faint behind each card, h1 "Stats" in the display font.
- Clash Royale and Brawl Stars overviews: identical to `docs/screenshots/phase3/clash-royale-*.png` and `brawl-stars-*.png` except the player-page h1 font file (no visible change expected).
- Clash of Clans: one accent green throughout, no purple/yellow/red leftovers, no emoji, no uppercase tracked labels, no clipped text, no horizontal scroll at 390, tiles aligned on a grid, radii consistent (cards 12 px, pills round), art boxes never empty without an icon.
- 768 px: the two-column breakpoints (`sm:`) look intentional (Army three columns, Heroes two, Achievements two).

Write one line per page in the task report ("looked at, fine" or the defect). Fix any defect in the component that owns it (with its test) before committing the images.

- [ ] **Step 3: Commit**

```bash
git add docs/screenshots/phase4
git commit -m "docs: phase 4 review screenshots

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Restyle complete: final verification and hand-off

**Files:**
- Modify (only if Step 4 finds a stale statement): `README.md`, `DEPLOY.md`

**Interfaces:**
- Consumes: everything above; the spec's Acceptance section.
- Produces: the PR description (hand-off text) with the budget table, Lighthouse tables, screenshot links, the OLD-vs-NEW checklists and the post-deploy results.

- [ ] **Step 1: Gates from a clean install**

Run: `rm -rf node_modules dist && npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: all green. Record the test counts and the budget block.

- [ ] **Step 2: Budget against the spec table**

From the `npm run build` output fill this table in the PR:

| Line | Spec baseline (2026-10-06) | Spec budget | Phase 4 start | Now |
|---|---|---|---|---|
| Initial JS on `/` | 122.6 | 135 | 123.46 | (printed, ≈ 83.3) |
| JS to render a player page | 163.2 | 180 | 154.98 | (printed) |
| Entry chunk | 4.5 | 8 | 6.73 | (printed) |
| CSS | 12.7 | 16 | 9.18 | (printed) |
| Fonts (preloaded) | 48 | 50 | 48.26 | (printed) |

Every "Now" must be ≤ its phase cap (D57) and the spec budget.

- [ ] **Step 3: Spec Acceptance, item by item (all three games)**

- Tabs in the URL, reload and back: `npx playwright test e2e/tabs.spec.ts` green (covers all three games).
- `/` focuses search: `npx playwright test e2e/home.spec.ts` green.
- No console errors, no failed non-image requests: `watch()` assertions in `player`, `cr-panels`, `bs-panels`, `coc-panels` specs green.
- Screenshots 390/768/1440 for Home and one player page per game: `docs/screenshots/phase4/` (Task 10).
- 44 px touch targets and keyboard focus: `e2e/ui.spec.ts`, `e2e/sticky.spec.ts`, Task 7's filter test green.
- No clipped text or horizontal scroll at 320 px: `e2e/overflow.spec.ts` green (now all three games).
- CSP unchanged: `git diff main -- docs/caddy-tail.caddy` prints nothing; `grep -rn "https://" src --include=*.tsx --include=*.ts | grep -v "api-assets.clashofclans.com\|api-assets.clashroyale.com\|cdn.brawlify.com\|cdn-old.brawlify.com\|royaleapi.github.io\|supercellstats.com"` lists no new image or script host.
- No emoji in UI chrome: `expectNoEmoji` in the three panel specs.

- [ ] **Step 4: README and DEPLOY say what the site does now**

Run: `grep -n -i "tab\|overview\|army\|heroes\|achievement\|battle\|deck\|brawler\|club\|motion\|framer\|animation\|font" README.md DEPLOY.md`
For every hit, check it against the restyled site: Clash Royale tabs `overview | cards | deck | battles | towers`, Brawl Stars `overview | brawlers | progression | battles | club`, Clash of Clans `overview | army | heroes | achievements`, battles with filters linkable through `?tab=battles&mode=&result=`, no `motion` dependency. Known hit (2026-10-07): README.md line 21 lists `Motion` in the stack, which Task 9 removed: drop it from that line. Fix any other sentence that describes the old UI (e.g. a feature list that names a removed control) in place, keeping the files' style; do not add new sections. Commit:

```bash
git add README.md DEPLOY.md
git commit -m "docs: README and DEPLOY describe the restyled site

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand-off text (PR description)**

Write the PR description with: a summary of the 10–11 commits; the budget table (Step 2); the Home Lighthouse before/after table (Task 9); the three Clash of Clans live-data findings that changed numbers on screen (D58: experience level, Meteor Golem, Super Yeti; D59: best trophies shown as current, invented win rate, Town Hall shown as experience level); links to `docs/screenshots/phase4/*.png` with the instruction "reviewers: open every image, 768 included"; the OLD-vs-NEW checklists of Tasks 4–7; the Plan decisions that change visible behaviour (D59–D62, D65, D66); and the post-deploy checklist of Step 6. End it with the attribution line from the session's instructions. Pushing, opening the PR, CI, review, merge and deploy follow the owner's flow (`superpowers:finishing-a-development-branch`).

- [ ] **Step 6: After deploy: production verification (restyle complete)**

- E2E against production with the three public tags from the environment: `E2E_BASE_URL=https://supercellstats.com E2E_CR_TAG=<cr> E2E_BS_TAG=<bs> E2E_COC_TAG=<coc> npx playwright test` → green (fixture-only specs route the API locally; the real-player tests hit production).
- Lighthouse on production, 3 runs each: `/tmp/lh/run.sh https://supercellstats.com/ /tmp/lh/prod-home 3` and the same for `/game/clash-royale`, `/game/brawl-stars`, `/game/clash-of-clans`. Targets: performance ≥ 90 (median), accessibility/best practices/SEO 100, CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s (re-run once before treating a miss as real). Before this phase production Home measured 90 / LCP 3.24 s (D66).
- `curl -sI https://supercellstats.com/ | grep -i content-security-policy` equals the line in `docs/caddy-tail.caddy`.
- Open the live Clash of Clans player at 390 px on production and look at all four tabs.
- Report the numbers in the PR (comment) and mark the restyle complete in the SDD ledger.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Phase 4: Clash of Clans profile restyle, tabs `overview \| army \| heroes \| achievements` (ids stable, in the URL) | 4, 5, 6, 7 (ids untouched; typed in 4) |
| Design system: tokens, one accent (`#5BD65B`), type scale, `tabular-nums`, radii 12/999, lucide icons, no emoji | 4–7 (Global Constraints), checked in 10 |
| Shared components: `Card`, `StatTile`, `Row`, `Pill`, `Skeleton`, `EmptyState` used, no ad-hoc class strings | 4–7 (+ `ProgressBar`, `LevelItem` built on them) |
| Data components restyled in their game's phase | 4–7 (`CoCHeroesDisplay` replaced by `CoCHeroes`, D61) |
| States: skeleton, empty and error with the real reason | 5 (no army), 6 (no heroes), 7 (no match), 4 (no clan, no legend), shell error state unchanged |
| Data layer not modified except for bugs found while restyling | 2 (D58, each bug proven on the live payload) |
| Contracts: routes, CSP, no API key in `dist/` | Global Constraints; 11 Step 3 |
| Performance budget, ≤ 5 % per phase, enforced by the build | 1 (D57), every task's `npm run build`, 11 Step 2 |
| No new dependency over 5 KB | none added; `motion` removed (9) |
| Lab Web Vitals: CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s, performance ≥ 90 | 8 (CLS matrix), 9 (Home), 11 Step 6 (production, `/` and three `/game/<id>`) |
| Heavy assets lazy, explicit width/height | 5–6 (`GameImage` lazy with width/height), 9 |
| Visual effects budget (no blur/backdrop, no animated gradients) | 5 (old `backdrop-blur-sm` and gradients removed), 4 (glow removed) |
| Acceptance: lint, typecheck, test, build, CI green | every task; 11 Step 1 |
| Acceptance: e2e locally and on production with the three public tags | 8 Step 4 (CoC live), 11 Step 6 |
| Acceptance: tab URL/reload/back, `/` focuses search, no console errors, no failed non-image requests | existing `tabs`/`home`/`player` specs, `watch()` in `coc-panels` (4–8) |
| Acceptance: screenshots 390/768/1440, reviewers look at them | 4–7 (per task), 10 (committed), 11 Step 5 |
| Acceptance: Lighthouse a11y/BP/SEO 100, performance ≥ 90 on `/` and `/game/<id>` | 9 Step 5, 11 Step 6 |
| Acceptance: AA contrast, 44 px targets, keyboard and focus ring | Global Constraints; 7 (filter targets, focus after reset); existing `ui`/`sticky` specs |
| Acceptance: no clipped text or horizontal scroll at 320 px | 8 (overflow matrix incl. long names) |
| Lessons: OLD-vs-NEW checklist per restyle task | 4, 5, 6, 7 Step 1 |
| Lessons: live-data check, fabricated/mixed counters | 2, 4 Step 6, 5–7 live screenshots, 8 Step 5 |
| Lessons: non-Latin digit locales | 2 (raw numbers, no parse-back), 3 (`groupDigits` reads ASCII API text only) |
| Lessons: art that 404s or is blocked | 3 (`cocArt` test against `public/`), 5/6 (`GameImage` fallbacks), 8 Step 4 (`watch` tolerates only art-host 404s) |
| Lessons: CLS on skeleton→content and empty states | 8 |
| Lessons: sr-only text for icon-only marks, names not only in `title` | 5 (names printed, sr level wording), 6 (hero names), 7 (stars, completed) |
| Lessons: CRLF preservation, staged by path, e2e red after a fresh build | Global Constraints; 2 Step 4; every commit step |
| Deferred: tofu glyphs/emoji in CoC components | 4–7 (`expectNoEmoji` on every tab) |
| Deferred: uppercase tracked labels, saturated mixed colours, mixed radii | 4–7, checked in 10 |
| Deferred: `TownHallMark` | 2 Step 5 (D65) |
| Deferred: inert `animate-in` classes | none left in CoC components (the old ones had none); `grep -rn "animate-in" src` must print nothing in 11 |
| Deferred: typed tab ids for CoC | 4 (D63) |
| Deferred: dead code made dead by the restyle | 4 (`StatCard`), 6 (`CoCHeroesDisplay`), 9 (`motion`) |
| Deferred: long pages on phones | 5–7 (two-column tiles below `sm`), 8 Step 6 (measured, D64) |
| Deferred: level bars need visible numbers | 5 (`LevelText`), 6, 7 |
| Deferred: brittle CoC locator in `player.spec.ts` | 4 Step 4 |
| Last phase: Home Lighthouse robust | 9 (D66) |
| Last phase: "restyle complete" checklist, README/DEPLOY, hand-off | 11 |

## Open concerns (for the owner, not blocking)

1. **Super troop levels.** The API reports level 1 for every super troop of a maxed Town Hall 18 player, so the Army tab shows super troops without a level (D60). If Supercell starts sending real super troop levels, add `item={t}` back for that section.
2. **Army and Achievements stay long on phones** (D64, measured in Task 8). A "Not at max level" filter for Army and an "In progress first" sort for Achievements are the next steps if the owner wants shorter pages; both are new behaviour and out of this plan.
3. **Missing local art:** Ruin Witch, Sky Wagon, Angry Spell (live), and Town Hall 17–18. Tiles show the section icon; `KNOWN_MISSING_ART` in `cocArt.ts` makes the unit test fail the day art is added without updating it, or a new live name without art appears in the test list.
4. **A stray symlink `node_modules/node_modules → /home/nixo/SUPERCELL-STATS/node_modules` exists in the working copy** (created 2026-10-07 06:07, probably by an earlier session). In the repo it points to itself and is harmless; a copy of `node_modules` made with `cp -a` keeps the absolute link and loads a second React (blank page, "reading 'useState'"). `npm ci` in Task 11 removes it; until then, delete it before copying `node_modules`.
5. **Equipment owner.** The API's `heroEquipment` list does not say which hero a piece belongs to; the Equipment card shows which pieces are worn, not whose they are. A static name→hero table would add that, but it needs updating for every new piece.
6. **Unused mapper fields** (`winRate`, `kd`, `statLabels`, `extraStats`, hero `emoji`/`color`, `rankIcon '🏰'`) stay in `PlayerStats` for Clash of Clans; nothing renders them after this phase. Removing them is a data-layer cleanup for a later PR.
