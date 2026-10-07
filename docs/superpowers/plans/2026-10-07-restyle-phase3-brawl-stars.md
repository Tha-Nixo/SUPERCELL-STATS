# SupercellStats Restyle, Phase 3 (Brawl Stars) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every Brawl Stars player section (overview, brawlers, progression, battles, club) onto the Phase 1/2 design system and turn the Battles tab into the same filterable, URL-backed list Clash Royale got in Phase 2, with Showdown placements, without losing anything the old panels showed.

**Architecture:** The 691-line CRLF `BSProfile.tsx` (five sections) and the 323-line `BSBrawlerGrid.tsx` (only its podium variant was used) are replaced, one section per task, by focused LF components (`BSOverview`, `BSBrawlers`, `BSProgression`, `BSClub`, `BSBattleSummary`) built on the `src/app/ui/` primitives. Numbers the components need come from two pure, unit-tested modules: `components/bsFacts.ts` (battle rows from the mapper's battle log, battle summary, overview figures read back from mapper strings) and `components/bsBrawlerList.ts` (brawler search/sort, progression). The Battles tab reuses Phase 2's `BattlesPanel`/`FilterGroup`/`battleFilters` unchanged in behaviour; `MatchHistory` rows learn a map and a Showdown placement. One function, `pages/game/battleRows.ts#battleRowsOf`, says which battles a game's Battles tab lists, so the tab, the overview and "Copy link" can never disagree. The data layer (`supercellService.ts`, `mockStats.ts`) is not modified.

**Tech Stack:** React 18, react-router 7, Vite 7, Tailwind CSS 4 (`@tailwindcss/vite`), lucide-react 0.487, TypeScript 5.9 (strict, `noUnusedLocals`), Vitest 5 (node env, no jsdom), Playwright 1.63 (Chromium), Node ≥ 22.18 for `scripts/screenshots.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-06-restyle-design.md` (Phase 3 = "Brawl Stars profile restyle + battles tab with filters"). Read it, then the Global Constraints and decisions of `docs/superpowers/plans/2026-10-06-restyle-phase1-foundation.md` (D1–D20, Visual rules) and `docs/superpowers/plans/2026-10-06-restyle-phase2-clash-royale.md` (D21–D41); they still apply. Deferred items come from `.superpowers/sdd/2026-10-06-restyle-phase1-foundation/progress.md` and `.superpowers/sdd/2026-10-06-restyle-phase2-clash-royale/progress.md`.

**How this plan was checked:** every code block below was applied, task by task, to a throw-away copy of `main` at `1714c86` (`git archive`), and after each task `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (budget check) and `npm run e2e` were green; the new and extended e2e specs were also run with `--workers=6 --repeat-each=2` without a flake. The restyled Brawl Stars page was loaded against the live API through the preview proxy with a public ranked player (tag from the environment only), and the production payload shapes (`/players/{tag}`, `/battlelog`, `/clubs/{tag}`) and the brawlify art URLs were probed by hand; the findings are in the Plan decisions. Numbers quoted (test counts, budget lines, CLS) are the ones that run measured. Lighthouse was not run.

## Global Constraints

- Routes are unchanged: `/`, `/game/:gameId`, `/game/:gameId/player/:tag` (bare tag; `%23TAG` keeps working). `?tab=`, `?mode=`, `?result=` are additive and keep the Phase 2 rules (D25). `src/app/routes.ts` is not edited.
- Production CSP (`docs/caddy-tail.caddy`) is unchanged: no new third-party origin, no inline script, fonts self-hosted. Game art uses only hosts already in `img-src` (`cdn.brawlify.com`, `cdn-old.brawlify.com`, `api-assets.clashroyale.com`, `royaleapi.github.io`, `api-assets.clashofclans.com`). Inline `style=""` stays allowed; never add `<script>`.
- No new runtime dependency over 5 KB gzip. This plan adds **no** dependency.
- Performance budget (spec, "Performance budget"), enforced by `npm run build`: initial JS on `/` ≤ **135 KB**, JS to render a player page ≤ **180 KB**, entry chunk ≤ **8 KB**, CSS ≤ **16 KB**, preloaded fonts ≤ **50 KB** with no extra font file on the critical path; per-phase growth ≤ **5 %** on each line versus the phase start (entry chunk exempt, Phase 1 D1). Phase 3 start and caps are set in Task 1 (D42). Anything above must be paid for in the same task (D42 lists what to cut).
- Lab Web Vitals on production after deploy: CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s (re-run once before treating a miss as real), Lighthouse performance ≥ 90, accessibility/best practices/SEO 100.
- Visual effects budget: no `filter: blur()` / `backdrop-filter` on large areas, no animated gradients, at most one continuously running animation on screen. Motion is 150–200 ms opacity/transform only and is disabled under `prefers-reduced-motion`.
- Accessibility: WCAG AA; **no text dimmer than white/60** (`text-fg-subtle` is the floor); every interactive element ≥ 44 px tall on mobile; all controls keyboard reachable with a visible focus ring; no emoji in UI chrome (lucide icons, imported one by one); information never only on hover.
- Components use tokens (`bg-surface-1`, `text-fg-muted`, `border-line`, `bg-accent`, `rounded-card`…), never raw hex, never `bg-white/x`/`bg-black/x`, no raw palette classes (`bg-blue-500`, `text-yellow-400`…). One accent per page (Brawl Stars `#FFC21A`). Text on a solid accent fill is always `text-accent-contrast` (11.83:1); white on the BS yellow is 1.6:1 and is never allowed. No all-caps tracked labels, no gradients as decoration.
- Tailwind scans `.ts`/`.tsx` **including comments**: do not write bare utility-like words (`shadow`, `outline`, `hidden`, `blur`…) in comments; every stray class costs CSS budget.
- Line endings: preserve each file's style. CRLF files touched by this plan: `src/app/components/BSProfile.tsx` (shrunk by the node commands given in Tasks 3–6, deleted in Task 7), `src/app/components/BSBrawlerGrid.tsx` (deleted in Task 4), `src/app/utils/bsTiers.ts` (one `sed` in Task 5; `sed -i` keeps CRLF). Every other touched or new file is LF. A Python text-mode rewrite silently converts CRLF to LF: after editing a CRLF file check that `grep -c $'\r$' <file>` equals `wc -l < <file>`.
- Data layer untouched: `src/app/services/supercellService.ts`, `gameApiRouter.ts`, `recentSearches.ts`, `apiKeys.ts`, `src/app/data/mockStats.ts`, `src/app/data/brawlerPatches.ts` and `src/app/data/brawlerRarities.ts` are not modified (D43, D45).
- Scope: Phase 3 only. Clash Royale and Clash of Clans components change only where they share a component with Brawl Stars (`MatchHistory`, `OverviewExtras`, `BattlesPanel`, `GameImage`, `GameModuleProps`, `games.ts`), and their screenshots must look identical.
- Real player tags appear only through `E2E_CR_TAG`, `E2E_BS_TAG`, `E2E_COC_TAG`; never in a committed file (screenshots of live data show the tag: never commit them). Fixtures use the invented tag `#PYLQGRJC`.
- Every commit leaves `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` green, and the site deployable. Commits stage files **by path** (never `git add -A` / `git add .`).
- Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Copy: sentence case, plain verbs, no em dash (`—`) in new UI strings, no exclamation marks; empty states say why and what to do.
- Every UI task ends with screenshots that the executor **opens and looks at**, and an explicit "old vs new content" checklist: anything the old panel showed is either still shown or listed as deliberately dropped with its reason (Phase 2 lesson: restyles lose information silently).

---

## File Structure

New Brawl Stars components (`src/app/components/`, all LF):

| File | Responsibility |
|---|---|
| `bsFacts.ts` (+ `__tests__/bsFacts.test.ts`) | pure: `battleTime`, `formatDuration`, `bsBattleRows` (battle log → list rows), `battleSummary`, `bsOverviewFacts` (figures read back from mapper strings, locale-digit safe) |
| `bsBrawlerList.ts` (+ `__tests__/bsBrawlerList.test.ts`) | pure: `BRAWLER_SORTS`, `rarityWeight`, `brawlerList` (search + sort), `progressionFacts` |
| `BSOverview.tsx` | four stat tiles, Account card, Top brawlers (three equal tiles), Victories by mode |
| `BSBattleSummary.tsx` | the four tiles above the Battles filters (the old battle log's summary) |
| `BSBrawlers.tsx` | brawler cards with search, sort, empty states |
| `BSProgression.tsx` | power-level counts, trophies vs best |
| `BSClub.tsx` | club card and members, the viewed player marked |

Deleted: `src/app/components/BSProfile.tsx` (CRLF, shrinks in Tasks 3–6, removed in Task 7), `src/app/components/BSBrawlerGrid.tsx` (CRLF, Task 4).

Shared UI and pages: `ui/text.ts` (`titleCase`, `stripColorTags`, `ordinal`), `ui/GameImage.tsx` (`title`), `components/MatchHistory.tsx` (`BattleRow`: map, placement), `pages/game/battleRows.ts` (new: `battleRowsOf`), `pages/game/BattlesPanel.tsx` (`summary` render prop), `pages/game/OverviewExtras.tsx` (`matches`), `pages/game/BrawlStars.tsx`, `pages/game/tabs.tsx` (Brawlers count), `pages/game/types.ts` (`playerTag`), `pages/GamePage.tsx` (Copy link for any game, `playerTag`), `utils/bsTiers.ts` (icon paths), `data/games.ts` and `styles/fonts.css` (dead fields/classes).

Tests and tooling: `src/styles/__tests__/contrast.test.ts`, `src/app/ui/__tests__/text.test.ts`, `src/app/pages/game/__tests__/tabs.test.ts`, `src/app/utils/__tests__/bsTiers.test.ts` (new), `e2e/{bs-battles,bs-panels}.spec.ts` (new), `e2e/{battle-rows,tabs,overflow,cls}.spec.ts`, `e2e/support/{fixtures,mockApi}.ts`, `playwright.config.ts`, `scripts/bundle-budget.json`, `scripts/screenshots.mjs`, `docs/screenshots/phase3/*.png`.

## Plan decisions

Numbered after Phase 2 (D21–D41). Each line: decision · why · cost if wrong.

- **D42. Phase 3 budget start = the numbers measured on `main` at `1714c86`:** `initialJs 123.64`, `playerPageJs 156.17`, `entryJs 6.92`, `css 11.73`, `fonts 48.26` (same method as D2/D21; `playerPageJs` is the Brawl Stars variant, the heaviest). Caps (×1.05, rounded to 2 decimals, capped by the absolute line): initialJs **129.82**, playerPageJs **163.98**, css **12.32**, fonts **50**, entryJs **8** (exempt). Measured end of phase: **123.43 / 154.12 / 6.71 / 9.02 / 48.26**: every line goes *down* (1,014 lines of BS components and their one-off classes are replaced by ~600 lines on shared primitives; `games.ts` loses unused fields in the entry chunk). If a task pushes a line over its cap, cut in this order: the Ranked/Robo Rumble rows of the Account card; the rarity sort (and with it the 108-line `brawlerRarities` table in the BS chunk); the Battles summary down to Win rate and Net trophies; the Victories by mode card. · Spec rule 2 measures against the previous phase. · None measured.
- **D43. The Brawl Stars Battles tab lists `gameVisuals.bs.battlelog`, every battle the API returns (up to 25), not `recentMatches`.** The mapper already keeps the whole log there with map, Showdown rank and duration; `recentMatches` is sliced to 10 and has neither map nor rank. `bsBattleRows()` turns the log into rows; `battleRowsOf(game, stats)` is the one place that says "CR → `recentMatches` (30, Phase 2 ruling), BS → `bsBattleRows(battlelog)`", used by the BS module (tab and overview latest 5) and by GamePage's Copy link, so a shared link keeps exactly the modes the tab offers. The data layer is untouched; `recentMatches` stays capped at 10 and is simply not read by the BS UI any more. · Same outcome as the CR ruling (filters need the full log) with no data-layer change. · Two arrays of the same battles exist in `PlayerStats`; a later cleanup could drop the BS `recentMatches`.
- **D44. Results:** a row's result comes from the mapper's normalised `battle.result` (`victory`/`defeat`/`draw`); the mapper derived Showdown's from `bsOutcome` (trophy change sign first, then placement in the top half of the entrants). A battle whose outcome could not be read has no result and is listed as **Draw**, as `recentMatches` and the old battle log did; `bsWinStats` leaves both draws and unknowns out of the win rate, so the tiles agree with the mapper. **Verified live:** the sample ranked player's 25 battles are all Solo Showdown (`type: "ranked"`, `rank` 1–10, `trophyChange` ±, no `result`, no `duration`, `players` ×10): ranks 1–3 with positive trophies read Win, ranks 5–10 with negative read Loss, win rate 18/25 = 72 % matches. Placement is shown on the row ("1st", Medal icon, sr-only "Placed 1st"), not offered as a filter: the result filter already splits Showdown by outcome and the mode filter separates Solo/Duo. · Uses the mapper's tested rule, no second definition. · A Showdown "Draw" can only appear for an unreadable battle.
- **D45. The Brawl Stars trophy trend is correct and is not changed.** Unlike Clash Royale (Phase 2: Path of Legend mixed into Trophy Road), the live payload shows `player.trophies` (322,473) equals the sum of the brawler trophies, and each battle's in-battle brawler trophies + `trophyChange` equal the next battle's, so reconstructing the total backwards from `trophyChange` is exact. Battles without a `trophyChange` (friendly, the fixture's Brawl Ball) are already left out by the mapper. · Checked against production, not assumed. · Ranked (Elo) battles were not in the sample; if one ever carries a `trophyChange` that is not brawler trophies the trend would include it (Open concern 1).
- **D46. Battle rows show date and time** ("Oct 6, 9:55 AM", visitor's time zone, `en-US`), map and duration, wrapping between parts, never inside one. The old battle log showed the time; 25 battles usually share one day, so "Oct 6" alone is noise. Playwright (`playwright.config.ts`) and `scripts/screenshots.mjs` pin `timezoneId: 'UTC'`, `locale: 'en-US'` so assertions and screenshots are stable (the Phase 2 `ar-EG` test overrides with `test.use`). · Keeps information, deterministic tests. · CR rows keep their date only (its mapper has no time); one row design, two densities.
- **D47. The old battle log's summary survives as four tiles above the filters** (Win rate, Net trophies, Results W / L / D, Most played), computed over the battles of the **selected mode, all results**. `BattlesPanel` gets an optional `summary(battles)` render prop; CR passes none, so its tab is unchanged. · Scoped to the mode, the tiles answer "how do I do in Solo Showdown"; scoped to the result filter they would read 100 % after picking Wins. · None.
- **D48. `BSProfile.tsx` (691 lines, CRLF, five sections) and `BSBrawlerGrid.tsx` (323 lines, CRLF; its `grid` and `detailed` variants were dead code, only `podium` was used) are replaced by focused LF files, one per section,** instead of being restyled inside the monolith. Each task removes its section from `BSProfile.tsx` with a CRLF-preserving `node -e` command and the file is deleted in Task 7. The spec's "restyled in place rather than rewritten" is honoured in substance: same sections, same data, same module (`BrawlStars.tsx`), like Phase 2's CR rewrites; a single 600-line CRLF file edited by five tasks would serialise every task on one file and invite line-ending accidents. · Reviewable per section. · `git blame` of the old sections stays on the deleted file.
- **D49. Overview content** (old → new): the four mapper tiles become Win rate (with "W / L, recent battles"), Victories (3v3 + solo + duo), Best trophies, Brawlers ("of N in the game"); the "Trophies 41,234" tile (repeats the hero), the W/L ratio tile (repeats the win rate) and the second "Total victories" are dropped. "Global metrics" becomes an Account card (total prestige, experience points, best Robo Rumble, and the Ranked rank/Elo and best Ranked the mapper already produced but no panel showed). The podium (gradients, motion height animation, emoji trophy, measured 0.03–0.038 CLS at 390 px) becomes three equal tiles in an ordered list, 1st outlined in the accent: CLS at 390 px is now 0.0001 (D53). The three-colour "Victory distribution" bar (raw `bg-blue/green/orange-500`) becomes three single-accent bars with numbers and shares (spec: one accent; colour was the only key before). · Data first without repetition. · Less game flavour on the podium.
- **D50. Brawler cards:** names via `titleCase` ("8-Bit", "Mr. P", "El Primo"), no uppercase tracking; "Power 11 · Prestige 1" with the tier icon (`getBSTierInfo`, whose three prestige paths pointed at `.png` files that do not exist: **bug fixed**, own 404s; a unit test now checks every tier icon exists in `public/`); trophies with "Best n"; win streak and hypercharge as pills; owned gadgets, star powers and gears as icons with the item name as `alt` and `title`, "None yet" when empty. The old "Equipped config" row is **dropped on purpose**: the API sends what a brawler owns, not its loadout, so labelling the first gadget/star power/two gears "equipped" was false. The old order toggle (icon-only button) becomes explicit options in one `<select>`: Most trophies, Fewest trophies, Rarest first, Highest power, Name. Rarity comes from the static `brawlerRarities` table and is used only for sorting, never shown (the table lags new brawlers; unknown ones rank last). Art: brawlify `/{gadgets,star-powers}/regular/{id}.png` first, `/borderless/` second (live probe: `borderless` 404s for every id from 23001040 up, `regular` answered 200 for all 20 sampled), gears `/gears/regular/` (one live id, 62000019, 404s: falls back to the lucide icon), hypercharge has no CDN art (lucide `Zap`), the `/power/{n}.png` badge 404s (text "Power 11" instead). The Brawlers tab label shows "6/95" (unlocked / in game, sr-only "6 of 95") through Phase 2's `tabCounts`. · Correct, labelled, linkable to the catalogue. · Owned items need a hover or screen reader to read their names, as before.
- **D51. Club:** badge from `https://cdn.brawlify.com/club-badges/regular/{badgeId}.png` (**bug fixed**: all four old URLs fail on production: `club-icons/regular` 404, `cdn-old…/club` 522, `cdn…/club` 404, and the last-resort `cdn-old…/club/8.png` 522); in-game colour tags stripped from name and description (`stripColorTags`; the live club is literally named `Zero<c9>Win</c>`); the "You" marker works (**bug fixed**: it compared member tags with `playerStats.tag`, which does not exist, so it never showed; `GameModuleProps` gains `playerTag`); facts as rows (club trophies, trophies to join, type in sentence case, "n of 30" members); members in an ordered list by trophies with role in sentence case. Dropped on purpose: member name colours (D6: one accent; arbitrary colours fail contrast) and the 600 px inner scroll box (nested scrolling on phones). · Visible fixes the old panel hid. · None.
- **D52. Progression** prints every power-level count (the old bars showed counts only in a hover tooltip), labels sums honestly ("All brawlers now" / "All brawlers at their best"; the old "Current target" was not a target), uses `max(best, current)` per brawler so a stale API best never shows a negative gap, and adds the two counts the mapper computed but nothing displayed (at power 11, 1,000+ trophies), from the raw brawler list. · Accessible, no parse-back. · None.
- **D53. Every Brawl Stars section renders inside a screen-tall wrapper (`min-h-dvh`) in `BrawlStars.tsx`.** Measured before: the club tab 0.044 at 1440 px, and the club/brawlers/progression empty states 0.14–0.15 at 390 px (the short section replaces the screen-tall `PanelSkeleton` and pulls the footer up). After: ≤ 0.0003 everywhere. Game-local like Phase 2's empty battle log (the shell is not touched, so CR/CoC screenshots do not change). · Fixes a measured CLS failure with one wrapper. · Short BS tabs end with blank space above the footer.
- **D54. Fixtures grow to cover every new branch:** `bsPlayer` gets six brawlers (hypercharge, win streak, all equipment kinds, none, a renamed `GLOWBERT`, names with a digit/dot/space), prestige, Robo Rumble, Ranked lines and a club whose name carries a colour tag; `bsBattlelog` becomes 9 battles (5 W / 3 L / 1 D over Solo Showdown ×3 with placements, Brawl Ball ×2 incl. a friendly without trophies, Gem Grab ×2 incl. a draw, Duo Showdown, Knockout); `bsClub` and a clubs route are added to `mockApi` (`club: null` answers 404); the brawler catalogue answers 95 items. Existing tests that relied on "no club" or on the old 2-battle log are updated in Task 1/2. · Deterministic coverage. · Drift from the live API, mitigated by the env-gated real-player tests and the live check in Task 10.
- **D55. Dead restyle leftovers removed (cheap and safe only):** `games.ts` loses `background`, `surface`, `gradientFrom`, `gradientTo`, `chartSecondary`, `badgeColor`, `inputType`, `logo` (emoji) and `fontClass` (grep: no reader), `fonts.css` loses `.font-cr/.font-bs/.font-coc` (no user since Phase 1). Not touched: `BRAWLER_PATCHES` in `data/brawlerPatches.ts` (unused, but data layer). · Smaller entry chunk, no emoji left in UI config. · None.
- **D56. Text helpers live in `ui/text.ts`:** `titleCase` (keeps roman numerals: "Gold II"), `stripColorTags`, `ordinal`. · One tested place. · None.

---

### Task 1: Phase 3 start: budget, contrast guard, review tooling, Brawl Stars fixtures

**Files:**
- Modify: `scripts/bundle-budget.json`, `src/styles/__tests__/contrast.test.ts`, `scripts/screenshots.mjs`, `playwright.config.ts`, `e2e/support/fixtures.ts`, `e2e/support/mockApi.ts`, `e2e/tabs.spec.ts`

**Interfaces:**
- Consumes: `scripts/check-bundle.mjs` / `bundle-budget-lib.mjs` (Phase 1, unchanged); `mockApi(page, options)` (Phase 2).
- Produces: Phase 3 caps (D42); `npm run screenshots` defaulting to `docs/screenshots/phase3` with pages `home`, `clash-royale`, `clash-royale-battles`, `brawl-stars`, `brawl-stars-brawlers`, `brawl-stars-progression`, `brawl-stars-battles`, `brawl-stars-battles-showdown`, `brawl-stars-club`, `clash-of-clans` (each `-390/-768/-1440.png`, rendered in UTC/en-US); fixtures `bsPlayer`, `bsBattlelog`, `bsClub` (exported from `e2e/support/fixtures.ts`); `MockApiOptions.club?: Record<string, unknown> | null`. Later tasks run `SCREENSHOT_DIR=/tmp/p3-shots/<task> SCREENSHOT_ONLY=<prefix> npm run screenshots`.

- [ ] **Step 1: Measure the phase start**

Run on the untouched branch: `npm run build | sed -n '/performance budget/,$p'`
Expected (D42): `initialJs 123.64`, `playerPageJs 156.17`, `entryJs 6.92`, `css 11.73`, `fonts 48.26`. If main has moved, use the printed numbers in Step 2 and in the PR.

- [ ] **Step 2: Write the phase start into the budget file**

In `scripts/bundle-budget.json` replace the `phase` and `phaseStart` entries (keep everything else, 2-space indent, LF):

```json
  "phase": "restyle phase 3 (brawl stars)",
  "phaseStart": {
    "initialJs": 123.64,
    "playerPageJs": 156.17,
    "entryJs": 6.92,
    "css": 11.73,
    "fonts": 48.26
  },
```

Run: `npm run build | sed -n '/performance budget/,$p'`
Expected: every line `✓`, limits `129.82`, `163.98`, `8`, `12.32`, `50`.

- [ ] **Step 3: Extend the contrast guard to accent text**

The accent is used as text/icon colour on the canvas and both surfaces (StatTile and trophy icons, the "You" tag). In `src/styles/__tests__/contrast.test.ts` insert before `describe('text floor', () => {`:

```ts
describe('accent as text', () => {
  it.each(['clash-royale', 'brawl-stars', 'clash-of-clans'])('%s: accent text and icons are AA on the page and on both surfaces', (game) => {
    const accent = token('accent', `[data-game='${game}']`);
    for (const base of [canvas, surface1, token('surface-2')]) {
      expect(contrast(accent, base)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

Run: `npx vitest run src/styles` → 10 passed. (Measured: BS yellow 11.83 / 11.00 / 9.99, CR blue 5.98 / 5.56 / 5.05, CoC green 10.22 / 9.51 / 8.63; accent-contrast on the BS yellow 11.83.)

Prove it can fail: `sed -i "s/--accent: #FFC21A;/--accent: #6B5A20;/" src/styles/theme.css && npx vitest run src/styles; git checkout src/styles/theme.css` → `brawl-stars: accent text…` FAILS; after the checkout `npx vitest run src/styles` → 10 passed.

- [ ] **Step 4: Screenshot script: every Brawl Stars tab, stable time zone**

In `scripts/screenshots.mjs`:
1. Replace the first paragraph of the header comment with:

```js
 * Review screenshots (restyle spec, "Acceptance"): Home, one player page per
 * game, every Brawl Stars tab and the Clash Royale pages that share its battle
 * components, at 390, 768 and 1440 px, written to docs/screenshots/<phase>/.
 * Pages render in UTC with an en-US locale, so battle times are stable.
```

and the usage line `SCREENSHOT_ONLY=clash-royale npm run screenshots  # only pages…` with `SCREENSHOT_ONLY=brawl-stars npm run screenshots   # only pages whose name starts with it`.
2. `const PHASE = process.env.SCREENSHOT_PHASE ?? 'phase3';`
3. Replace from `const CR = …` up to (not including) `const ONLY = …` with:

```js
const CR = { game: 'clash-royale', env: 'E2E_CR_TAG' };
const BS = { game: 'brawl-stars', env: 'E2E_BS_TAG' };
const ALL_PAGES = [
  { name: 'home', path: () => '/' },
  { name: 'clash-royale', ...CR, search: '' },
  { name: 'clash-royale-battles', ...CR, search: '?tab=battles' },
  { name: 'brawl-stars', ...BS, search: '' },
  { name: 'brawl-stars-brawlers', ...BS, search: '?tab=brawlers' },
  { name: 'brawl-stars-progression', ...BS, search: '?tab=progression' },
  { name: 'brawl-stars-battles', ...BS, search: '?tab=battles' },
  { name: 'brawl-stars-battles-showdown', ...BS, search: '?tab=battles&mode=solo-showdown' },
  { name: 'brawl-stars-club', ...BS, search: '?tab=club' },
  { name: 'clash-of-clans', game: 'clash-of-clans', env: 'E2E_COC_TAG', search: '' },
];
```

4. In the loop, the `newPage` options become `{ viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce', timezoneId: 'UTC', locale: 'en-US' }`.

In `playwright.config.ts` replace the `use` line with:

```ts
  // Battle times render in the browser's time zone: pin it so assertions and screenshots are stable.
  use: { baseURL: base ?? 'http://127.0.0.1:4173', timezoneId: 'UTC', locale: 'en-US' },
```

- [ ] **Step 5: Brawl Stars fixtures (D54)**

In `e2e/support/fixtures.ts` replace everything from `export const bsPlayer = {` up to (not including) `export const cocPlayer` with:

```ts
const brawler = (id: number, name: string, power: number, trophies: number, highestTrophies: number, rank: number, extra: Record<string, unknown> = {}) => ({
  id, name, power, rank, trophies, highestTrophies, prestigeLevel: Math.floor(trophies / 1000), currentWinStreak: 0, maxWinStreak: 0,
  gadgets: [], starPowers: [], gears: [], hyperCharges: [], buffies: { gadget: false, starPower: false, hyperCharge: false }, ...extra,
});

// Six brawlers covering every brawler-card branch: hypercharge, win streak, all three
// kinds of equipment, none at all, a renamed brawler (GLOWBERT -> Glowy) and names
// with a digit, a dot and a space.
export const bsPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Kitebreaker',
  nameColor: '0xffffffff',
  icon: { id: 28000000 },
  trophies: 41234,
  highestTrophies: 42010,
  expLevel: 211,
  expPoints: 250000,
  totalPrestigeLevel: 14,
  '3vs3Victories': 18234,
  soloVictories: 1022,
  duoVictories: 2210,
  bestRoboRumbleTime: 125,
  rankedRankName: 'GOLD II',
  rankedElo: 2196,
  highestAllTimeRankedRankName: 'MASTERS III',
  club: { tag: '#2Y0Y', name: 'Lantern<c4>Watch</c>' },
  brawlers: [
    brawler(16000000, 'SHELLY', 11, 1210, 1250, 5, {
      currentWinStreak: 4,
      maxWinStreak: 12,
      skin: { id: 29000722, name: 'HOOT HOOT SHELLY' },
      gadgets: [{ id: 23000255, name: 'FAST FORWARD' }, { id: 23000288, name: 'CLAY PIGEONS' }],
      starPowers: [{ id: 23000076, name: 'SHELL SHOCK' }, { id: 23000135, name: 'BAND-AID' }],
      gears: [{ id: 62000002, name: 'DAMAGE', level: 3 }, { id: 62000004, name: 'SHIELD', level: 3 }],
      hyperCharges: [{ id: 23000613, name: 'DOUBLE BARREL' }],
      buffies: { gadget: true, starPower: false, hyperCharge: true },
    }),
    brawler(16000027, '8-BIT', 11, 980, 1000, 4, {
      gadgets: [{ id: 23000273, name: 'CHEAT CARTRIDGE' }],
      starPowers: [{ id: 23000123, name: 'BOOSTED BOOSTER' }],
      gears: [{ id: 62000000, name: 'SPEED', level: 3 }, { id: 62000001, name: 'VISION', level: 3 }, { id: 62000003, name: 'HEALTH', level: 3 }],
    }),
    brawler(16000001, 'COLT', 9, 750, 800, 4, {
      gadgets: [{ id: 23000272, name: 'SPEEDLOADER' }],
      starPowers: [{ id: 23000077, name: 'SLICK BOOTS' }],
    }),
    brawler(16000032, 'MR. P', 7, 420, 430, 2),
    brawler(16000010, 'EL PRIMO', 3, 120, 150, 1),
    brawler(16000083, 'GLOWBERT', 1, 0, 0, 1),
  ],
};

const bsBattle = (battleTime: string, mode: string, map: string, battle: Record<string, unknown>) => ({
  battleTime, event: { id: 15000001, mode, map }, battle: { mode, type: 'ranked', ...battle },
});
const soloPlayers = Array.from({ length: 10 }, (_, i) => ({ tag: i === 0 ? `#${FIXTURE_TAG}` : `#2PP${i}`, name: `P${i}`, brawler: { id: 16000000, name: 'SHELLY', power: 11, trophies: 1200 } }));
const duoTeams = Array.from({ length: 5 }, (_, t) => soloPlayers.slice(t * 2, t * 2 + 2));

// Newest first. 9 battles: 5 wins, 3 losses, 1 draw. Gem Grab 2 (a win, a draw),
// Brawl Ball 2 (a loss, a friendly win without trophies), Solo Showdown 3 (placed 1st, 7th, 3rd),
// Duo Showdown 1 (placed 2nd), Knockout 1 (a loss). Showdown reports a placement, never a result.
export const bsBattlelog = {
  items: [
    bsBattle('20261006T095500.000Z', 'gemGrab', 'Hard Rock Mine', { result: 'victory', duration: 121, trophyChange: 8 }),
    bsBattle('20261006T093000.000Z', 'brawlBall', 'Backyard Bowl', { result: 'defeat', duration: 140, trophyChange: -5 }),
    bsBattle('20261006T090000.000Z', 'soloShowdown', 'Acid Lakes', { rank: 1, trophyChange: 12, players: soloPlayers }),
    bsBattle('20261006T083000.000Z', 'soloShowdown', 'Acid Lakes', { rank: 7, trophyChange: -6, players: soloPlayers }),
    bsBattle('20261006T080000.000Z', 'duoShowdown', 'Royal Runway', { rank: 2, trophyChange: 7, teams: duoTeams }),
    bsBattle('20261006T073000.000Z', 'gemGrab', 'Crystal Arcade', { result: 'draw', duration: 150, trophyChange: 0 }),
    bsBattle('20261006T070000.000Z', 'brawlBall', 'Super Beach', { type: 'friendly', result: 'victory', duration: 95 }),
    bsBattle('20261006T063000.000Z', 'knockout', 'Belle\'s Rock', { result: 'defeat', duration: 88, trophyChange: -6 }),
    bsBattle('20261006T060000.000Z', 'soloShowdown', 'Skull Creek', { rank: 3, trophyChange: 2, players: soloPlayers }),
  ],
};

// GET /api/brawl-stars/clubs/{tag}. Club names and descriptions carry in-game colour
// tags (<c4>...</c>), as on production.
export const bsClub = {
  tag: '#2Y0Y',
  name: 'Lantern<c4>Watch</c>',
  description: 'Friendly club, <c2>active</c> daily.\nPush events together.',
  type: 'inviteOnly',
  badgeId: 8000023,
  requiredTrophies: 30000,
  trophies: 161734,
  members: [
    { tag: '#9QRL0', name: 'Ash Vale', nameColor: '0xffff8afb', role: 'president', trophies: 52000, icon: { id: 28000000 } },
    { tag: `#${FIXTURE_TAG}`, name: 'Kitebreaker', nameColor: '0xffffffff', role: 'vicePresident', trophies: 41234, icon: { id: 28000000 } },
    { tag: '#8LQ2', name: 'Moss', nameColor: '0xff1ba5f5', role: 'senior', trophies: 38000, icon: { id: 28000000 } },
    { tag: '#2PPY', name: 'Rin', nameColor: '0xffffffff', role: 'member', trophies: 30500, icon: { id: 28000000 } },
  ],
};

```

In `e2e/support/mockApi.ts`:
1. Import line: `import { bsBattlelog, bsClub, bsPlayer, cocPlayer, crBattlelog, crPlayer } from './fixtures.ts';`
2. Add to `MockApiOptions`, above `hold`:

```ts
  /** Replaces the Brawl Stars club payload; `null` answers 404, as for a club that no longer exists. */
  club?: Record<string, unknown> | null;
```

3. Replace the catalogue comment and its two lines with:

```ts
    if (path.startsWith('/api/brawl-stars/clubs/')) {
      return options.club === null ? json({ reason: 'notFound', message: 'notFound' }, 404) : json(options.club ?? bsClub);
    }
    // Catalogue sizes: 121 cards and 95 brawlers exist in the (fixture) game, so the
    // Cards tab reads "8/121" and the Brawlers tab "6/95".
    if (path === '/api/clash-royale/cards') return json({ items: Array.from({ length: 121 }, (_, id) => ({ id })) });
    if (path === '/api/brawl-stars/brawlers') return json({ items: Array.from({ length: 95 }, (_, id) => ({ id })) });
```

Without the clubs route the app's club request would hit the 404 fallback and `watch()` would count a failed request on every BS page.

In `e2e/tabs.spec.ts`, the test `'the club tab explains a player without a club'` now needs a club-less player; make its first line inside the test:

```ts
  await mockApi(page, { patch: { 'brawl-stars': { club: undefined } } });
```

(later routes win over the `beforeEach` mock).

- [ ] **Step 6: Gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 216 passed (12 files); e2e 120 passed, 6 skipped; budget unchanged from Step 2.

- [ ] **Step 7: "Before" screenshots, and the old content checklist**

Run: `SCREENSHOT_DIR=/tmp/p3-shots/before SCREENSHOT_ONLY=brawl-stars npm run screenshots`
Expected: 18 `wrote …(fixtures)` lines; `ss -ltn | grep 4173` prints nothing afterwards.

Open all six 1440 px files and the 390 px overview. With the rich fixture you see what the old UI shows (this is the "old" column for every later checklist): tiles "Win Rate 63% / 5 of last 8 battles", "W/L Ratio 1.67", "Total Victories 21,466 / 6/95 brawlers unlocked", "Trophies 41,234 / Best: 42,010"; a gradient podium with tofu boxes after "1210"; "GLOBAL METRICS" (prestige 14, XP 250,000, Total victories again, Robo Rumble 2m 5s); a three-colour "VICTORY DISTRIBUTION"; Brawlers "(6/90)" with "EQUIPPED CONFIG" and "OWNED EQUIPMENT" rows; club "Lantern<c4>Watch</c>" with the raw tag, "INVITEONLY", no "You" next to Kitebreaker. Do not commit `/tmp` files.

- [ ] **Step 8: Commit**

```bash
git add scripts/bundle-budget.json scripts/screenshots.mjs playwright.config.ts src/styles/__tests__/contrast.test.ts e2e/support/fixtures.ts e2e/support/mockApi.ts e2e/tabs.spec.ts
git commit -m "chore(restyle): phase 3 budget start, accent text guard, Brawl Stars fixtures and screenshots

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Text helpers and battle rows with map, time and Showdown placement

**Files:**
- Create: `src/app/components/bsFacts.ts`, `src/app/components/__tests__/bsFacts.test.ts`
- Modify: `src/app/ui/text.ts`, `src/app/ui/__tests__/text.test.ts`, `src/app/components/MatchHistory.tsx`, `src/app/pages/game/OverviewExtras.tsx`, `src/app/pages/game/BrawlStars.tsx`, `e2e/battle-rows.spec.ts`

**Interfaces:**
- Consumes: `prettyMode(raw, 'brawl-stars')` (exported by the data layer in Phase 2), `BSBattleLogItem` (mockStats), `Match`, `Pill`, `trophyLabel`/`trophyQualifier` (Phase 2).
- Produces:
  - `ui/text.ts`: `titleCase(text: string): string`, `stripColorTags(text: string): string`, `ordinal(n: number): string`.
  - `components/MatchHistory.tsx`: `export type BattleRow = Match & { map?: string; placement?: number }`; `MatchHistory({ matches: readonly BattleRow[] })`; placement rendered with sr-only "Placed ".
  - `components/bsFacts.ts`: `battleTime(raw: string): string`, `formatDuration(seconds: number): string`, `bsBattleRows(log: readonly BSBattleLogItem[] | undefined): BattleRow[]` (ids `bs-<i>`).
  - `OverviewExtras({ …, matches?: readonly BattleRow[] })` (defaults to `playerStats.recentMatches`).

- [ ] **Step 1: Failing unit tests for the text helpers**

In `src/app/ui/__tests__/text.test.ts` change the import to `import { ordinal, sentenceCase, stripColorTags, stripEmoji, titleCase } from '../text';` and append:

```ts
describe('titleCase', () => {
  it.each([
    ['SHELLY', 'Shelly'],
    ['EL PRIMO', 'El Primo'],
    ['8-BIT', '8-Bit'],
    ['MR. P', 'Mr. P'],
    ['R-T', 'R-T'],
    ['LARRY & LAWRIE', 'Larry & Lawrie'],
    ['GOLD II', 'Gold II'],
    ['MASTERS III', 'Masters III'],
    ['BAND-AID', 'Band-Aid'],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(titleCase(input)).toBe(expected);
  });
});

describe('stripColorTags', () => {
  it.each([
    ['Zero<c9>Win</c>', 'ZeroWin'],
    ['<cff00ff>Neon</c> Club', 'Neon Club'],
    ['Plain club', 'Plain club'],
    ['a < b > c', 'a < b > c'],
  ])('%j -> %j', (input, expected) => {
    expect(stripColorTags(input)).toBe(expected);
  });
});

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [10, '10th'], [11, '11th'], [12, '12th'], [13, '13th'], [21, '21st'], [22, '22nd'], [101, '101st'],
  ])('%j -> %j', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});
```

Run: `npx vitest run src/app/ui/__tests__/text.test.ts` → FAIL (not exported).

- [ ] **Step 2: Implement them**

Append to `src/app/ui/text.ts`:

```ts

const ROMAN = /^(i{1,3}|iv|vi{0,3}|ix|x)$/i;

/**
 * API names in capitals for display: 'EL PRIMO' -> 'El Primo', '8-BIT' -> '8-Bit',
 * 'MR. P' -> 'Mr. P'; roman numerals stay capital ('GOLD II' -> 'Gold II').
 */
export function titleCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (ROMAN.test(word) ? word.toUpperCase() : word.replace(/(^|[-.&/])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())))
    .join(' ');
}

/** Brawl Stars club names and descriptions carry in-game colour tags: 'Zero<c9>Win</c>' -> 'ZeroWin'. */
export function stripColorTags(text: string): string {
  return text.replace(/<\/?c[0-9a-f]*>/gi, '');
}

/** 1 -> '1st', 2 -> '2nd', 11 -> '11th', 23 -> '23rd' (Showdown placements). */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}
```

Run: `npx vitest run src/app/ui/__tests__/text.test.ts` → PASS (41 tests).

- [ ] **Step 3: Failing unit tests for the battle rows**

Create `src/app/components/__tests__/bsFacts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { BSBattleLogItem } from '../../data/mockStats';
import { battleTime, bsBattleRows, formatDuration } from '../bsFacts';

// Times are shown in the visitor's zone; pin one for the assertions.
process.env.TZ = 'UTC';

const item = (battle: BSBattleLogItem['battle'], mode = battle.mode, map = 'Acid Lakes'): BSBattleLogItem => ({
  battleTime: '20261006T212908.000Z',
  event: { id: 15000956, mode, map },
  battle,
});

describe('battleTime', () => {
  it('formats the API timestamp with the time of day', () => {
    expect(battleTime('20261006T212908.000Z')).toMatch(/^Oct 6, 9:29\sPM$/);
  });
  it('is empty for an unreadable time', () => {
    expect(battleTime('soon')).toBe('');
  });
});

describe('formatDuration', () => {
  it.each([[20, '20s'], [60, '1m 0s'], [125, '2m 5s']])('%j -> %j', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe('bsBattleRows', () => {
  it('keeps the map, the Showdown placement and the trophy change', () => {
    // As on production: Solo Showdown has a rank and a trophy change, no result of its own
    // until the mapper adds one from bsOutcome.
    const [row] = bsBattleRows([item({ mode: 'soloShowdown', type: 'ranked', rank: 3, trophyChange: 2, result: 'victory' })]);
    expect(row).toMatchObject({ id: 'bs-0', mode: 'Solo Showdown', result: 'win', score: 2, map: 'Acid Lakes', placement: 3, duration: '' });
  });

  it('reads team results and durations, and has no placement or trophies when the API sends none', () => {
    const rows = bsBattleRows([
      item({ mode: 'gemGrab', type: 'ranked', result: 'defeat', duration: 140, trophyChange: -5 }),
      item({ mode: 'brawlBall', type: 'friendly', result: 'victory', duration: 95 }, 'brawlBall', ''),
    ]);
    expect(rows[0]).toMatchObject({ mode: 'Gem Grab', result: 'loss', score: -5, duration: '2m 20s', placement: undefined });
    expect(rows[1]).toMatchObject({ result: 'win', score: undefined, map: undefined, duration: '1m 35s' });
  });

  it('lists a battle whose outcome could not be read as a draw', () => {
    expect(bsBattleRows([item({ mode: 'bigGame', type: 'ranked' })])[0].result).toBe('draw');
  });

  it('names the mode from the event first and treats a missing log as no battles', () => {
    expect(bsBattleRows([item({ mode: '', type: 'ranked', result: 'draw' }, 'unknown')])[0].mode).toBe('Brawl Hockey');
    expect(bsBattleRows(undefined)).toEqual([]);
  });
});
```

Run: `npx vitest run src/app/components` → FAIL (module not found).

- [ ] **Step 4: `BattleRow` in `MatchHistory` (map, wrapping detail line, placement column)**

In `src/app/components/MatchHistory.tsx`:
1. Imports: `import { Fragment, type ReactNode } from 'react';`, `import { Crown, Medal, Minus, Trophy, X } from 'lucide-react';`, and after the `Pill` import `import { ordinal } from '../ui/text';`.
2. Replace `interface MatchHistoryProps { matches: Match[]; }` with:

```tsx
/** One battle as listed: Brawl Stars rows add the map and, in Showdown, the placement. */
export type BattleRow = Match & {
  map?: string;
  /** Showdown finishing position (1 = first); team modes have none. */
  placement?: number;
};

interface MatchHistoryProps {
  matches: readonly BattleRow[];
}
```

3. Replace the component's doc comment with:

```tsx
/**
 * A list of battles, newest first, one row each: result, mode, map and date,
 * then crowns or Showdown placement and the trophy change when the game
 * reports them. Used by both overviews and both Battles tabs; the caller
 * provides the surrounding Card.
 */
```

4. After the `const qualified = …` line add:

```tsx
  // One placement column too, so trophy changes line up between Showdown and team battles.
  const placementColumn = matches.some((m) => m.placement !== undefined);
```

5. Replace the date paragraph (`<p className="text-xs text-fg-subtle">{match.date}{match.duration && …}</p>`) with:

```tsx
              {/* Each part stays on one line; a narrow row breaks between them, never inside one. */}
              <p className="text-xs text-fg-subtle">
                {[match.map, match.date, match.duration].filter(Boolean).map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && ' · '}
                    <span className="whitespace-nowrap">{part}</span>
                  </Fragment>
                ))}
              </p>
```

(The separator must stay outside the `whitespace-nowrap` span: inside it there is no break opportunity between parts and a 390 px row overflows into the trophy column, which the first draft of this plan did.)

6. After the crowns block (`{match.kills !== undefined && ( … )}`) insert:

```tsx
              {placementColumn && (
                <span className="inline-flex w-12 items-center gap-1 text-fg-muted">
                  {match.placement !== undefined && (
                    <>
                      <Medal aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
                      <span className="sr-only">Placed </span>
                      {ordinal(match.placement)}
                    </>
                  )}
                </span>
              )}
```

- [ ] **Step 5: `bsFacts.ts` with the rows**

Create `src/app/components/bsFacts.ts`:

```ts
import type { BSBattleLogItem } from '../data/mockStats';
import { prettyMode } from '../services/supercellService';
import type { BattleRow } from './MatchHistory';

const RESULTS: Record<string, BattleRow['result']> = { victory: 'win', defeat: 'loss', draw: 'draw' };

/** API battle time ("20261006T095500.000Z") as "Oct 6, 9:55 AM" in the visitor's time zone; '' when unreadable. */
export function battleTime(raw: string): string {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  const d = new Date(m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : raw);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Seconds as "2m 5s", or "20s" under a minute. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}m ${seconds % 60}s` : `${seconds}s`;
}

/**
 * Every Brawl Stars battle the API returned (up to 25), newest first, as list
 * rows. The mapper's battle log already turned a Showdown placement into
 * victory/defeat (bsOutcome); a battle whose outcome could not be read has no
 * result and is listed as a draw, which the win rate leaves out as well.
 */
export function bsBattleRows(log: readonly BSBattleLogItem[] | undefined): BattleRow[] {
  return (log ?? []).map((b, i) => ({
    id: `bs-${i}`,
    mode: prettyMode(b.event.mode || b.battle.mode, 'brawl-stars'),
    result: RESULTS[b.battle.result ?? ''] ?? 'draw',
    score: typeof b.battle.trophyChange === 'number' ? b.battle.trophyChange : undefined,
    date: battleTime(b.battleTime),
    duration: b.battle.duration ? formatDuration(b.battle.duration) : '',
    map: b.event.map || undefined,
    placement: typeof b.battle.rank === 'number' ? b.battle.rank : undefined,
  }));
}
```

Run: `npx vitest run src/app/components` → PASS; also `TZ=Asia/Kolkata npx vitest run src/app/components/__tests__/bsFacts.test.ts` → PASS (the test pins its own zone).

- [ ] **Step 6: The overview's latest battles use the rows**

In `src/app/pages/game/OverviewExtras.tsx`:
- `import { MatchHistory, type BattleRow } from '../../components/MatchHistory';`
- add to the props interface after `onShowBattles`:

```ts
  /** The battles to list; defaults to the mapper's recent matches. */
  matches?: readonly BattleRow[];
```

- signature and first line:

```tsx
export function OverviewExtras({ playerStats, chartColor, onShowBattles, matches = playerStats.recentMatches, trendScope, trendEmptyNote }: OverviewExtrasProps) {
  const latest = latestBattles(matches);
```

In `src/app/pages/game/BrawlStars.tsx` add `import { bsBattleRows } from '../../components/bsFacts';` under the `BSProfile` import and replace the `<OverviewExtras … />` line with:

```tsx
          <OverviewExtras
            playerStats={playerStats}
            matches={bsBattleRows(bs.battlelog)}
            chartColor={game.chartPrimary}
            onShowBattles={() => onTabChange('battles')}
          />
```

- [ ] **Step 7: e2e for the rows (red first)**

In `e2e/battle-rows.spec.ts` replace the test `'Brawl Stars latest battles keep the duration next to the date'` with:

```ts
test('Brawl Stars latest battles show the map, the time, the duration and the Showdown placement', async ({ page }) => {
  const problems = watch(page);
  await mockApi(page);
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
  const rows = page.getByRole('tabpanel').getByTestId('battle-row');
  await expect(rows).toHaveCount(5);
  // Playwright runs in UTC (playwright.config.ts), so the fixture's 09:55Z reads 9:55 AM.
  await expect(rows.first()).toContainText(/Hard Rock Mine · Oct 6, 9:55\sAM · 2m 1s/);
  await expect(rows.first()).toContainText('+8');
  const showdown = rows.nth(2);
  await expect(showdown).toContainText('Solo Showdown');
  await expect(showdown).toContainText('Win');
  await expect(showdown.getByText('Placed 1st')).toHaveCount(1);
  // Team battles have no placement: the column stays, empty, so trophy changes line up.
  await expect(rows.first().getByText(/Placed/)).toHaveCount(0);
  await expectNoEmoji(rows.first().locator('xpath=..'));
  expect(problems).toEqual([]);
});
```

(The emoji check is scoped to the list: the old podium on the same panel still prints a trophy emoji until Task 4.)

Run with Steps 4–6 stashed (`git stash push src/app/components/MatchHistory.tsx src/app/pages/game/OverviewExtras.tsx src/app/pages/game/BrawlStars.tsx`), `npm run build && npx playwright test e2e/battle-rows.spec.ts` → the BS test FAILS (no map, no placement); `git stash pop`, rebuild, run again → 3 passed.

- [ ] **Step 8: Gate, screenshots, look, old vs new**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 250 passed (13 files); e2e 120 passed, 6 skipped; budget about `playerPageJs 156.75`.

Run: `SCREENSHOT_DIR=/tmp/p3-shots/t2 SCREENSHOT_ONLY=brawl-stars npm run screenshots` and open `brawl-stars-390.png` and `-1440.png`. Check the "Latest battles" card: second line "Hard Rock Mine · Oct 6, 9:55 AM · 2m 1s" breaking only at "·" at 390 px and never running under the placement/trophy columns; Showdown rows show a medal and "1st"/"7th"/"2nd"; trophy changes right-aligned in one column.
Old vs new (latest battles card): result ✓, mode ✓, date ✓ (now with time), duration ✓, trophy change ✓; **added** map and placement. The rest of the overview is still the old one (Task 4).

- [ ] **Step 9: Commit**

```bash
git add src/app/ui/text.ts src/app/ui/__tests__/text.test.ts src/app/components/MatchHistory.tsx src/app/components/bsFacts.ts src/app/components/__tests__/bsFacts.test.ts src/app/pages/game/OverviewExtras.tsx src/app/pages/game/BrawlStars.tsx e2e/battle-rows.spec.ts
git commit -m "feat(bs): battle rows with map, time and Showdown placement

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Brawl Stars Battles tab with filters

**Files:**
- Create: `src/app/components/BSBattleSummary.tsx`, `src/app/pages/game/battleRows.ts`, `e2e/bs-battles.spec.ts`
- Modify: `src/app/components/bsFacts.ts`, `src/app/components/__tests__/bsFacts.test.ts`, `src/app/pages/game/BattlesPanel.tsx`, `src/app/pages/GamePage.tsx`, `src/app/pages/game/BrawlStars.tsx` (whole file below), `src/app/components/BSProfile.tsx` (**CRLF**, one section removed by command)

**Interfaces:**
- Consumes: `BattleRow`, `bsBattleRows` (Task 2); `battleModes`, `filterBattles`, `shareableFilters`, `FilterGroup`, `BattlesPanel` (Phase 2); `StatTile`.
- Produces:
  - `bsFacts.ts`: `interface BattleSummary { wins; losses; draws: number; winRate?: number; netTrophies: number; topMode?: { mode: string; count: number } }`, `battleSummary(rows: readonly BattleRow[]): BattleSummary`.
  - `BattlesPanel({ matches: readonly BattleRow[]; summary?: (battles: readonly BattleRow[]) => ReactNode })`.
  - `BSBattleSummary({ battles: readonly BattleRow[] })`.
  - `pages/game/battleRows.ts`: `battleRowsOf(game: GameId, stats: PlayerStats): BattleRow[]`.
  - `BSProfile.tsx` no longer exports `BSBattleLog`.

- [ ] **Step 1: Failing unit test for `battleSummary`**

In `src/app/components/__tests__/bsFacts.test.ts` change the import to `import { battleSummary, battleTime, bsBattleRows, formatDuration } from '../bsFacts';` and append:

```ts

describe('battleSummary', () => {
  const row = (mode: string, result: 'win' | 'loss' | 'draw', score?: number) => ({ id: mode + result, mode, result, score, date: '', duration: '' });
  it('counts results, leaves draws out of the win rate and sums the trophy changes', () => {
    expect(
      battleSummary([row('Solo Showdown', 'win', 12), row('Gem Grab', 'loss', -5), row('Solo Showdown', 'draw', 0), row('Brawl Ball', 'win')]),
    ).toEqual({ wins: 2, losses: 1, draws: 1, winRate: 67, netTrophies: 7, topMode: { mode: 'Solo Showdown', count: 2 } });
  });
  it('has no win rate or top mode without battles, and no win rate with draws only', () => {
    expect(battleSummary([])).toEqual({ wins: 0, losses: 0, draws: 0, winRate: undefined, netTrophies: 0, topMode: undefined });
    expect(battleSummary([row('Gem Grab', 'draw', 0)]).winRate).toBeUndefined();
  });
});
```

Run: `npx vitest run src/app/components` → FAIL.

- [ ] **Step 2: Implement it**

Append to `src/app/components/bsFacts.ts`:

```ts

export interface BattleSummary {
  wins: number;
  losses: number;
  draws: number;
  /** Wins among wins + losses, rounded; undefined when there is neither (draws do not count). */
  winRate?: number;
  /** Sum of the trophy changes the API reported. */
  netTrophies: number;
  /** The mode with the most battles (ties: the most recent first), and how many. */
  topMode?: { mode: string; count: number };
}

/** Headline numbers of a list of battles (the Battles tab's tiles). Same rules as the mapper's bsWinStats. */
export function battleSummary(rows: readonly BattleRow[]): BattleSummary {
  const count = (r: BattleRow['result']) => rows.filter((b) => b.result === r).length;
  const wins = count('win');
  const losses = count('loss');
  const modes = new Map<string, number>();
  for (const b of rows) modes.set(b.mode, (modes.get(b.mode) ?? 0) + 1);
  const top = [...modes.entries()].reduce<[string, number] | undefined>((best, e) => (!best || e[1] > best[1] ? e : best), undefined);
  return {
    wins,
    losses,
    draws: count('draw'),
    winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : undefined,
    netTrophies: rows.reduce((sum, b) => sum + (b.score ?? 0), 0),
    topMode: top && { mode: top[0], count: top[1] },
  };
}
```

Run: `npx vitest run src/app/components` → PASS.

- [ ] **Step 3: One source of battles per game (D43), and the summary slot**

Create `src/app/pages/game/battleRows.ts`:

```ts
import { bsBattleRows } from '../../components/bsFacts';
import type { BattleRow } from '../../components/MatchHistory';
import type { PlayerStats } from '../../data/mockStats';
import type { GameId } from './modules';

/**
 * The battles a game's Battles tab lists and filters. The shell uses the same
 * list to decide which filters a shared link may keep, so both always agree.
 * Clash Royale: the mapper's matches (every battle the API returned, up to 30).
 * Brawl Stars: the mapper's battle log (up to 25), which keeps map and placement.
 */
export function battleRowsOf(game: GameId, stats: PlayerStats): BattleRow[] {
  if (game === 'clash-royale') return stats.recentMatches;
  if (game === 'brawl-stars') return bsBattleRows(stats.gameVisuals?.bs?.battlelog);
  return [];
}
```

In `src/app/pages/game/BattlesPanel.tsx`:
- `import { useEffect, useRef, type ReactNode } from 'react';`
- replace the two lines `import { MatchHistory } …` / `import type { Match } …` with `import { MatchHistory, type BattleRow } from '../../components/MatchHistory';`
- above the component's doc comment add:

```tsx
interface BattlesPanelProps {
  matches: readonly BattleRow[];
  /** Headline tiles above the filters, given the battles of the selected mode (every result). */
  summary?: (battles: readonly BattleRow[]) => ReactNode;
}

```

- signature: `export function BattlesPanel({ matches, summary }: BattlesPanelProps) {`
- first child of the returned `<div ref={root} className="space-y-4">`:

```tsx
      {summary?.(filterBattles(matches, { mode: filters.mode, result: 'all' }))}
```

In `src/app/pages/GamePage.tsx`:
- add `import { battleRowsOf } from './game/battleRows';` before the `GameLanding` import and change the modules import to `import { GAME_MODULES, isGameId, preloadGameModule, type GameId } from './game/modules';`
- in `copyPlayerLink` replace the comment and the `const filters = …` expression with:

```tsx
      // The tab and, on Battles, its valid filters: what the visitor is looking at, nothing else.
      const filters = activeTab === 'battles' && result?.data
        ? shareableFilters(window.location.search, battleModes(battleRowsOf(game.id as GameId, result.data)))
        : {};
```

- [ ] **Step 4: The summary tiles (old battle log summary, D47)**

Create `src/app/components/BSBattleSummary.tsx`:

```tsx
import { Gamepad2, Percent, Swords, Trophy } from 'lucide-react';
import { StatTile } from '../ui/StatTile';
import { battleSummary } from './bsFacts';
import type { BattleRow } from './MatchHistory';

const signed = (n: number) => (n > 0 ? `+${n.toLocaleString('en-US')}` : n.toLocaleString('en-US'));

/** Brawl Stars Battles tab: four tiles over the battles of the selected mode. Every tile always has a sub-line, so the row never changes height. */
export function BSBattleSummary({ battles }: { battles: readonly BattleRow[] }) {
  const s = battleSummary(battles);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Win rate"
        value={s.winRate === undefined ? '–' : `${s.winRate}%`}
        sub={s.wins + s.losses > 0 ? `${s.wins} W / ${s.losses} L` : 'No wins or losses yet'}
        icon={<Percent />}
      />
      <StatTile label="Net trophies" value={signed(s.netTrophies)} sub={`Over ${battles.length} battles`} icon={<Trophy />} />
      <StatTile label="Results" value={`${s.wins} / ${s.losses} / ${s.draws}`} sub="Wins / losses / draws" icon={<Swords />} />
      <StatTile
        label="Most played"
        value={<span className="text-base sm:text-xl">{s.topMode?.mode ?? '–'}</span>}
        sub={s.topMode ? `${s.topMode.count} of ${battles.length} battles` : 'No battles'}
        icon={<Gamepad2 />}
      />
    </div>
  );
}
```

(Sub-lines are short on purpose: StatTile truncates its sub-line, and "Draws stay out of the win rate" was cut off at 390 px in the plan author's run.)

- [ ] **Step 5: Wire the tab; remove the old battle log (CRLF-safe)**

Replace `src/app/pages/game/BrawlStars.tsx` with:

```tsx
import { Award, Percent, Shield, Target, Trophy } from 'lucide-react';
import { BSBattleSummary } from '../../components/BSBattleSummary';
import { BSBrawlers, BSClub, BSHome, BSProgression } from '../../components/BSProfile';
import { bsBattleRows } from '../../components/bsFacts';
import type { PlayerStats } from '../../data/mockStats';
import { EmptyState } from '../../ui/EmptyState';
import { StatTile } from '../../ui/StatTile';
import { stripEmoji } from '../../ui/text';
import { BattlesPanel } from './BattlesPanel';
import { OverviewExtras } from './OverviewExtras';
import type { GameModuleProps } from './types';

/** The four headline numbers the old GamePage showed as StatCards, now StatTiles. */
function headlineStats(stats: PlayerStats) {
  const L = stats.statLabels ?? {};
  const wins = Math.round(stats.totalMatches * stats.winRate / 100);
  const kd = Number.isInteger(stats.kd) ? String(stats.kd) : stats.kd.toFixed(2);
  return [
    { label: L.stat1Title ?? 'Win rate', value: `${stats.winRate}%`, sub: L.stat1Sub ?? `${wins} wins`, icon: <Percent /> },
    { label: L.stat2Title ?? 'K/D ratio', value: L.stat2Value ?? kd, sub: L.stat2Sub ?? 'Average per game', icon: <Target /> },
    { label: L.stat3Title ?? 'Total matches', value: L.stat3Value ?? stats.totalMatches.toLocaleString('en-US'), sub: L.stat3Sub ?? `${stats.hoursPlayed} hours`, icon: <Award /> },
    { label: L.stat4Title ?? 'Trophies', value: L.stat4Value ?? String(stats.hoursPlayed), sub: L.stat4Sub ?? '', icon: <Trophy /> },
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
  const battles = bsBattleRows(bs.battlelog);

  switch (tab) {
    case 'brawlers':
      return <BSBrawlers playerStats={playerStats} accentColor={accent} />;
    case 'progression':
      return <BSProgression playerStats={playerStats} accentColor={accent} />;
    case 'battles':
      return <BattlesPanel matches={battles} summary={(scope) => <BSBattleSummary battles={scope} />} />;
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
          <OverviewExtras
            playerStats={playerStats}
            matches={battles}
            chartColor={game.chartPrimary}
            onShowBattles={() => onTabChange('battles')}
          />
        </div>
      );
  }
}
```

Remove `BSBattleLog` from the CRLF file without touching its line endings:

```bash
node -e "const fs=require('fs');const f='src/app/components/BSProfile.tsx';let s=fs.readFileSync(f,'utf8');const a=s.indexOf('export const BSBattleLog');const b=s.indexOf('export const BSClub');s=s.slice(0,a)+s.slice(b);s=s.replace(' History,','');fs.writeFileSync(f,s)"
echo $(grep -c $'\r$' src/app/components/BSProfile.tsx) $(wc -l < src/app/components/BSProfile.tsx)
```

Expected: `548 548`; `git diff --stat src/app/components/BSProfile.tsx` → `1 insertion(+), 144 deletions(-)`.

- [ ] **Step 6: e2e for the tab**

Create `e2e/bs-battles.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

// Fixture (e2e/support/fixtures.ts): 9 battles, 5 wins / 3 losses / 1 draw; Solo Showdown 3
// (placed 1st +12, 7th -6, 3rd +2), Brawl Ball 2, Gem Grab 2, Duo Showdown 1, Knockout 1.
const url = (search = '') => `/game/brawl-stars/player/${FIXTURE_TAG}${search}`;
const panel = (page: Page) => page.getByRole('tabpanel');
const rows = (page: Page) => panel(page).getByTestId('battle-row');
const result = (page: Page) => page.getByRole('group', { name: 'Result' });
const mode = (page: Page) => page.getByRole('group', { name: 'Mode' });
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('lists every battle with its summary, counts per option and Showdown placements', async ({ page }) => {
  const problems = watch(page);
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  await expect(page.getByText('Showing 9 of 9 recent battles')).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'All 9' })).toBeChecked();
  await expect(result(page).getByRole('radio', { name: 'Wins 5' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Losses 3' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Draws 1' })).toBeVisible();
  const modeNames = await mode(page).getByRole('radio').evaluateAll((els) => els.map((el) => el.closest('label')!.textContent!.replace(/(\D)(\d)/, '$1 $2')));
  expect(modeNames).toEqual(['All modes 9', 'Solo Showdown 3', 'Brawl Ball 2', 'Gem Grab 2', 'Duo Showdown 1', 'Knockout 1']);
  // The old battle log's summary survives as tiles.
  const p = panel(page);
  await expect(p.getByText('63%', { exact: true })).toBeVisible();
  await expect(p.getByText('5 W / 3 L')).toBeVisible();
  await expect(p.getByText('+12', { exact: true }).first()).toBeVisible();
  await expect(p.getByText('5 / 3 / 1')).toBeVisible();
  await expect(p.getByText('3 of 9 battles')).toBeVisible();
  // Placement only on Showdown rows; a friendly battle shows no trophy change.
  await expect(p.getByText(/^Placed /)).toHaveCount(4);
  await expect(rows(page).nth(6)).toContainText('Super Beach');
  await expect(rows(page).nth(6)).not.toContainText(/[+-]\d/);
  await expectNoEmoji(p);
  expect(problems).toEqual([]);
});

test('a Showdown filter keeps placements, rescopes the tiles and survives reload', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await mode(page).getByText('Solo Showdown').click();
  await expect(rows(page)).toHaveCount(3);
  expect(params(page)).toEqual({ tab: 'battles', mode: 'solo-showdown' });
  await expect(result(page).getByRole('radio', { name: 'Wins 2' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Draws 0' })).toBeVisible();
  // Tiles follow the mode: 2 W / 1 L, +12 -6 +2.
  await expect(panel(page).getByText('67%', { exact: true })).toBeVisible();
  await expect(panel(page).getByText('+8', { exact: true })).toBeVisible();

  await result(page).getByText('Losses').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).getByText('Placed 7th')).toHaveCount(1);
  expect(params(page)).toEqual({ tab: 'battles', mode: 'solo-showdown', result: 'loss' });

  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('tab', { name: 'Club' }).click();
  expect(params(page)).toEqual({ tab: 'club' });
  await page.goBack();
  expect(params(page)).toEqual({ tab: 'battles', mode: 'solo-showdown', result: 'loss' });
  await expect(rows(page)).toHaveCount(1);
});

test('no match shows an empty state that resets both filters and keeps focus on the controls', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=knockout&result=win'));
  await expect(rows(page)).toHaveCount(0);
  await page.getByTestId('empty-state').getByRole('button', { name: 'Show all battles' }).click();
  await expect(rows(page)).toHaveCount(9);
  expect(params(page)).toEqual({ tab: 'battles' });
  await expect(result(page).getByRole('radio', { name: /^All/ })).toBeFocused();
});

test('Copy link on Brawl Stars Battles keeps valid filters only', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(url('?ref=x&mode=duo-showdown&result=bogus&tab=battles'));
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(page.url()).origin}${url('?tab=battles&mode=duo-showdown')}`);
});

test('a player without battles gets the empty state, no tiles and no filters', async ({ page }) => {
  await mockApi(page, { battlelog: { 'brawl-stars': { items: [] } } });
  await page.goto(url('?tab=battles'));
  await expect(page.getByTestId('empty-state').getByText('No recent battles')).toBeVisible();
  await expect(result(page)).toHaveCount(0);
  await expect(panel(page).getByText('Win rate')).toHaveCount(0);
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('no sideways scroll and every filter option is 44px tall', async ({ page }) => {
    await page.goto(url('?tab=battles'));
    await expect(rows(page)).toHaveCount(9);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(panel(page).getByRole('group').locator('label'));
    await mode(page).getByText('Duo Showdown').click();
    await expect(rows(page)).toHaveCount(1);
    await expectNoHorizontalScroll(page);
  });
});
```

Run: `npm run build && npx playwright test e2e/bs-battles.spec.ts --repeat-each=3 --workers=6` → 18 passed. (Before Step 5 the same spec fails on the missing `Result` group: the old log had no filters.)

- [ ] **Step 7: Gate, screenshots, look, old vs new**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 252 passed (13 files); e2e 126 passed, 6 skipped; budget about `playerPageJs 157.41`, `css 11.58`.

Run: `SCREENSHOT_DIR=/tmp/p3-shots/t3 SCREENSHOT_ONLY=brawl-stars-battles npm run screenshots` and look at all six PNGs and at `SCREENSHOT_ONLY=clash-royale-battles` (must look like `docs/screenshots/phase2/clash-royale-battles-*.png`: CR passes no summary). Check: four tiles in 2×2 at 390 / one row at 1440 with no truncated sub-line; filter card with "Result" and "Mode" legends, selected pill solid yellow with dark text; the Showdown view lists three rows with "1st", "7th", "3rd" and the tiles read 67 % / +8.
Old vs new (old battle log): title "Recent Battles (Last N)" → status line "Showing n of N recent battles" ✓; tiles recent win rate ✓, net trophies ✓, W/L/D ✓ (as "Results"), top mode ✓ (as "Most played"); per row result ✓, mode ✓, map ✓, trophy change ✓, time ✓, duration ✓ (was "121s", now "2m 1s"); **added** placement, filters, counts; dropped: the uppercase "VICTORY/DEFEAT" words and coloured row backgrounds (replaced by the result pill).

- [ ] **Step 8: Commit**

```bash
git add src/app/components/bsFacts.ts src/app/components/__tests__/bsFacts.test.ts src/app/components/BSBattleSummary.tsx src/app/components/BSProfile.tsx src/app/pages/game/battleRows.ts src/app/pages/game/BattlesPanel.tsx src/app/pages/game/BrawlStars.tsx src/app/pages/GamePage.tsx e2e/bs-battles.spec.ts
git commit -m "feat(bs): battles tab with mode and result filters, Showdown placements and summary tiles

Every battle the API returns (up to 25) from the mapper's battle log; Copy link
keeps valid filters for any game through battleRowsOf.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Overview

**Files:**
- Create: `src/app/components/BSOverview.tsx`, `e2e/bs-panels.spec.ts`
- Modify: `src/app/components/bsFacts.ts`, `src/app/components/__tests__/bsFacts.test.ts`, `src/app/pages/game/BrawlStars.tsx` (whole file below), `src/app/components/BSProfile.tsx` (**CRLF**, by command)
- Delete: `src/app/components/BSBrawlerGrid.tsx` (CRLF)

**Interfaces:**
- Consumes: `battleSummary`, `formatDuration` (Tasks 2–3), `parseCount` from `components/crFacts.ts` (Phase 2, Unicode-digit safe), `titleCase`, `ordinal` (Task 2), `GameImage`, `StatTile`, `Row`, `Card`, `Button`, `TabId` (Phase 2).
- Produces:
  - `bsFacts.ts`: `interface BSOverviewFacts { bestTrophies?: number; brawlersInGame?: number; ranked?: { rank: string; elo?: string }; bestRanked?: string }`, `bsOverviewFacts(stats: PlayerStats): BSOverviewFacts`.
  - `BSOverview({ playerStats, battles: readonly BattleRow[], onOpenBrawlers: () => void })`; top brawlers `data-testid="top-brawler"`; headings "Account", "Top brawlers", "Victories by mode".
  - `BrawlStars.tsx`: `type BSTab = TabId<'brawl-stars'>`, `go(id: BSTab)`.
  - e2e: `e2e/bs-panels.spec.ts` with `bs()`/`panel()` and the `ART_TABS` table Tasks 5 and 7 extend.

- [ ] **Step 1: Failing unit test for the overview figures**

In `src/app/components/__tests__/bsFacts.test.ts` change the imports to `import type { BSBattleLogItem, PlayerStats } from '../../data/mockStats';` and `import { battleSummary, battleTime, bsBattleRows, bsOverviewFacts, formatDuration } from '../bsFacts';`, and append:

```ts

describe('bsOverviewFacts', () => {
  const stats = (statLabels: PlayerStats['statLabels'], extraStats: PlayerStats['extraStats'] = []) => ({ statLabels, extraStats }) as PlayerStats;

  it('reads best trophies, the brawler catalogue and the Ranked lines back from the mapper strings', () => {
    expect(
      bsOverviewFacts(stats({ stat3Sub: '107/109 brawlers unlocked', stat4Sub: 'Best: 322,473' }, [
        { label: 'Ranked', value: 'GOLD II · 2,196 Elo' },
        { label: 'Best Ranked (all time)', value: 'MASTERS III' },
      ])),
    ).toEqual({ bestTrophies: 322473, brawlersInGame: 109, ranked: { rank: 'Gold II', elo: '2,196 Elo' }, bestRanked: 'Masters III' });
  });

  it('reads locale digits (the mapper formats with the browser locale)', () => {
    expect(bsOverviewFacts(stats({ stat4Sub: 'Best: ٤٢٬٠١٠' })).bestTrophies).toBe(42010);
  });

  it('leaves out what the mapper did not send', () => {
    expect(bsOverviewFacts(stats({ stat3Sub: '6 brawlers unlocked' }))).toEqual({
      bestTrophies: undefined, brawlersInGame: undefined, ranked: undefined, bestRanked: undefined,
    });
    expect(bsOverviewFacts(stats({}, [{ label: 'Ranked', value: 'BRONZE I' }])).ranked).toEqual({ rank: 'Bronze I', elo: undefined });
  });
});
```

Run: `npx vitest run src/app/components` → FAIL.

- [ ] **Step 2: Implement it**

In `src/app/components/bsFacts.ts` change the first imports to:

```ts
import type { BSBattleLogItem, PlayerStats } from '../data/mockStats';
import { prettyMode } from '../services/supercellService';
import { titleCase } from '../ui/text';
import { parseCount } from './crFacts';
import type { BattleRow } from './MatchHistory';
```

and append:

```ts

export interface BSOverviewFacts {
  bestTrophies?: number;
  /** Brawlers that exist in the game, when the catalogue could be fetched. */
  brawlersInGame?: number;
  /** Current Ranked rank and Elo, as the API names them ('Gold II', '2,196 Elo'). */
  ranked?: { rank: string; elo?: string };
  bestRanked?: string;
}

const extra = (stats: PlayerStats, label: string) => stats.extraStats?.find((s) => s.label === label)?.value;

/**
 * Overview figures the mapper hands over only inside display strings
 * ("Best: 42,010", "6/95 brawlers unlocked", "GOLD II · 2,196 Elo"). Everything
 * else the overview shows is read from raw numbers in gameVisuals.bs.
 */
export function bsOverviewFacts(stats: PlayerStats): BSOverviewFacts {
  const unlocked = String(stats.statLabels?.stat3Sub ?? '').split('/');
  const [rank, elo] = String(extra(stats, 'Ranked') ?? '').split(' · ');
  const best = extra(stats, 'Best Ranked (all time)');
  return {
    bestTrophies: parseCount(stats.statLabels?.stat4Sub),
    brawlersInGame: unlocked.length === 2 ? parseCount(unlocked[1]) : undefined,
    ranked: rank ? { rank: titleCase(rank), elo: elo || undefined } : undefined,
    bestRanked: best ? titleCase(String(best)) : undefined,
  };
}
```

Run: `npx vitest run src/app/components` → PASS. (The Elo string is shown as the mapper formatted it, never parsed back; only `bestTrophies` and the catalogue size are, through `parseCount`.)

- [ ] **Step 3: `BSOverview`**

Create `src/app/components/BSOverview.tsx`:

```tsx
import { ArrowRight, Percent, Swords, Trophy, UserRound, Users } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { GameImage } from '../ui/GameImage';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { ordinal, titleCase } from '../ui/text';
import { battleSummary, bsOverviewFacts, formatDuration } from './bsFacts';
import type { BattleRow } from './MatchHistory';

interface BSOverviewProps {
  playerStats: PlayerStats;
  /** The same rows the Battles tab lists (win/loss counts under the win rate). */
  battles: readonly BattleRow[];
  /** Opens the Brawlers tab ("All brawlers"). */
  onOpenBrawlers: () => void;
}

const n = (value: number | undefined) => (value === undefined ? '–' : value.toLocaleString('en-US'));

/**
 * Brawl Stars overview. Name, tag, level and trophies are in the summary bar;
 * this starts with the numbers the bar does not show.
 */
export function BSOverview({ playerStats, battles, onOpenBrawlers }: BSOverviewProps) {
  const bs = playerStats.gameVisuals?.bs;
  if (!bs) return null;

  const facts = bsOverviewFacts(playerStats);
  const recent = battleSummary(battles);
  const top = bs.allBrawlers.slice(0, 3);
  const split = [
    { label: '3v3', value: bs.victories3v3 ?? 0 },
    { label: 'Solo Showdown', value: bs.victoriesSolo ?? 0 },
    { label: 'Duo Showdown', value: bs.victoriesDuo ?? 0 },
  ];
  const victories = split.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Win rate"
          value={recent.wins + recent.losses > 0 ? `${playerStats.winRate}%` : '–'}
          sub={recent.wins + recent.losses > 0 ? `${recent.wins} W / ${recent.losses} L, recent battles` : 'No recent wins or losses'}
          icon={<Percent />}
        />
        <StatTile label="Victories" value={n(victories)} sub="3v3, solo and duo" icon={<Swords />} />
        <StatTile label="Best trophies" value={n(facts.bestTrophies)} icon={<Trophy />} />
        <StatTile
          label="Brawlers"
          value={n(bs.allBrawlers.length)}
          sub={facts.brawlersInGame ? `of ${n(facts.brawlersInGame)} in the game` : 'unlocked'}
          icon={<Users />}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Card as="section" title="Account" className="min-w-0">
          <div className="divide-y divide-line">
            <Row label="Total prestige" value={n(bs.prestigeLevel)} />
            <Row label="Experience points" value={n(bs.expPoints)} />
            {facts.ranked && <Row label="Ranked" value={facts.ranked.elo ? `${facts.ranked.rank} · ${facts.ranked.elo}` : facts.ranked.rank} />}
            {facts.bestRanked && <Row label="Best Ranked" value={facts.bestRanked} />}
            {(bs.bestRoboRumbleTime ?? 0) > 0 && <Row label="Best Robo Rumble" value={formatDuration(bs.bestRoboRumbleTime!)} />}
          </div>
        </Card>

        <div className="min-w-0 space-y-4 lg:col-span-2">
          {top.length > 0 && (
            <Card
              as="section"
              title="Top brawlers"
              action={
                <Button variant="ghost" onClick={onOpenBrawlers}>
                  All brawlers
                  <ArrowRight aria-hidden="true" />
                </Button>
              }
            >
              <ol className="grid grid-cols-3 gap-3">
                {top.map((b, i) => (
                  <li
                    key={b.id}
                    data-testid="top-brawler"
                    className={cx('flex min-w-0 flex-col items-center gap-2 rounded-card border p-3 text-center', i === 0 ? 'border-accent' : 'border-line')}
                  >
                    <span className="text-xs font-medium text-fg-subtle">{ordinal(i + 1)}</span>
                    <GameImage sources={[b.imageUrl]} alt="" width={64} height={64} fallback={<UserRound />} className="size-16 rounded-lg object-cover" />
                    <span className="w-full truncate text-sm font-semibold text-fg">{titleCase(b.name)}</span>
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums text-fg-muted">
                      <Trophy aria-hidden="true" className="size-4 shrink-0 text-accent" />
                      {n(b.trophies)}
                      <span className="sr-only"> trophies</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <Card as="section" title="Victories by mode">
            <ul className="space-y-3">
              {split.map((s) => {
                const pct = victories > 0 ? Math.round((s.value / victories) * 100) : 0;
                return (
                  <li key={s.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-fg-muted">{s.label}</span>
                      <span className="tabular-nums text-fg">
                        {n(s.value)} <span className="text-fg-subtle">· {pct}%</span>
                      </span>
                    </div>
                    <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-2">
                      <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Module, typed tab ids; remove `BSHome` and the podium grid**

Replace `src/app/pages/game/BrawlStars.tsx` with:

```tsx
import { Shield } from 'lucide-react';
import { BSBattleSummary } from '../../components/BSBattleSummary';
import { bsBattleRows } from '../../components/bsFacts';
import { BSOverview } from '../../components/BSOverview';
import { BSBrawlers, BSClub, BSProgression } from '../../components/BSProfile';
import { EmptyState } from '../../ui/EmptyState';
import { BattlesPanel } from './BattlesPanel';
import { OverviewExtras } from './OverviewExtras';
import type { TabId } from './tabs';
import type { GameModuleProps } from './types';

type BSTab = TabId<'brawl-stars'>;

/** Brawl Stars sections: overview | brawlers | progression | battles | club. */
export default function BrawlStars({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const bs = playerStats.gameVisuals?.bs;
  if (!bs) {
    return (
      <EmptyState icon={<Shield />} title="No Brawl Stars profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }
  const accent = game.accent;
  const battles = bsBattleRows(bs.battlelog);
  const go = (id: BSTab) => onTabChange(id);

  // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
  switch (tab as BSTab) {
    case 'brawlers':
      return <BSBrawlers playerStats={playerStats} accentColor={accent} />;
    case 'progression':
      return <BSProgression playerStats={playerStats} accentColor={accent} />;
    case 'battles':
      return <BattlesPanel matches={battles} summary={(scope) => <BSBattleSummary battles={scope} />} />;
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
        <div className="space-y-4">
          <BSOverview playerStats={playerStats} battles={battles} onOpenBrawlers={() => go('brawlers')} />
          <OverviewExtras playerStats={playerStats} matches={battles} chartColor={game.chartPrimary} onShowBattles={() => go('battles')} />
        </div>
      );
  }
}
```

Check the type does its job: temporarily change `case 'club':` to `case 'clubs':` → `npm run typecheck` fails ("not comparable"); revert.

Remove the helper and `BSHome` (CRLF-safe), and the dead grid:

```bash
node -e "const fs=require('fs');const f='src/app/components/BSProfile.tsx';let s=fs.readFileSync(f,'utf8');const a=s.indexOf('// Helpers');const b=s.indexOf('export const BSBrawlers');s=s.slice(0,a)+s.slice(b);s=s.replace(\"import { BSBrawlerGrid } from '../components/BSBrawlerGrid';\r\n\",'').replace(' Award,','').replace(' Crosshair,','');fs.writeFileSync(f,s)"
git rm -q src/app/components/BSBrawlerGrid.tsx
echo $(grep -c $'\r$' src/app/components/BSProfile.tsx) $(wc -l < src/app/components/BSProfile.tsx)
npm run typecheck
```

Expected: `435 435`; typecheck clean (`src/app/utils/bsTiers.ts` is now unused until Task 5, which is not an error for an exported module).

- [ ] **Step 5: e2e for the overview and its art**

Create `e2e/bs-panels.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const bs = (search = '') => `/game/brawl-stars/player/${FIXTURE_TAG}${search}`;
const panel = (page: Page) => page.getByRole('tabpanel');

test.describe('Overview tab', () => {
  test('starts with numbers the summary bar does not show, without emoji or repeated identity', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(bs());
    const p = panel(page);
    await expect(p.getByText('Win rate', { exact: true })).toBeVisible();
    await expect(p.getByText('5 W / 3 L, recent battles')).toBeVisible();
    await expect(p.getByText('21,466', { exact: true })).toBeVisible();
    await expect(p.getByText('42,010', { exact: true })).toBeVisible();
    await expect(p.getByText('of 95 in the game')).toBeVisible();
    await expect(p.getByText('Best trophies')).toBeVisible();
    // The hero already shows name and current trophies; the W/L ratio repeated the win rate.
    await expect(p.getByText('W/L Ratio')).toHaveCount(0);
    await expect(p.getByText('Kitebreaker')).toHaveCount(0);
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('account card keeps prestige, experience, Ranked and Robo Rumble', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs());
    const account = panel(page).locator('section').filter({ has: page.getByRole('heading', { name: 'Account' }) });
    await expect(account.getByText('Total prestige')).toBeVisible();
    await expect(account.getByText('14', { exact: true })).toBeVisible();
    await expect(account.getByText('250,000')).toBeVisible();
    await expect(account.getByText('Gold II · 2,196 Elo')).toBeVisible();
    await expect(account.getByText('Masters III')).toBeVisible();
    await expect(account.getByText('2m 5s')).toBeVisible();
  });

  test('top brawlers are ranked by trophies with plain names, and "All brawlers" opens the tab', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs());
    const top = panel(page).getByTestId('top-brawler');
    await expect(top).toHaveCount(3);
    await expect(top.nth(0)).toContainText('1st');
    await expect(top.nth(0)).toContainText('Shelly');
    await expect(top.nth(0)).toContainText('1,210');
    await expect(top.nth(1)).toContainText('8-Bit');
    await expect(top.nth(2)).toContainText('Colt');
    await panel(page).getByRole('button', { name: 'All brawlers' }).click();
    await expect(page).toHaveURL(bs('?tab=brawlers'));
  });

  test('victories by mode use one colour with numbers and shares', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs());
    const card = panel(page).locator('section').filter({ has: page.getByRole('heading', { name: 'Victories by mode' }) });
    await expect(card.getByRole('listitem')).toHaveCount(3);
    await expect(card.getByRole('listitem').nth(0)).toContainText('18,234 · 85%');
    await expect(card.getByRole('listitem').nth(1)).toContainText('1,022 · 5%');
    await expect(card.getByRole('listitem').nth(2)).toContainText('2,210 · 10%');
  });

  test('a player without decided battles shows a dash, not 0%', async ({ page }) => {
    await mockApi(page, { battlelog: { 'brawl-stars': { items: [] } } });
    await page.goto(bs());
    await expect(panel(page).getByText('No recent wins or losses')).toBeVisible();
  });
});

// Every BS tab that shows game art, with the number of art slots the fixture fills.
const ART_TABS: Array<[string, number]> = [
  ['overview', 3],
];
for (const [tab, slots] of ART_TABS) {
  test(`${tab}: missing game art falls back in place without errors`, async ({ page }) => {
    const problems = watch(page);
    await mockApi(page, { brokenArt: /./ });
    await page.goto(bs(`?tab=${tab}`));
    await expect(panel(page).getByTestId('game-image-fallback')).toHaveCount(slots);
    // Only third-party art falls back; our own tier icons (/images/bs/) still load.
    await expect(panel(page).locator('img[src^="https:"]')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
```

Run: `npm run build && npx playwright test e2e/bs-panels.spec.ts` → 6 passed. (Against the Task 3 overview the first test fails on "W/L Ratio" and the emoji check.)

- [ ] **Step 6: Gate, screenshots, look, old vs new**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 255 passed (13 files); e2e 132 passed, 6 skipped; budget about `playerPageJs 155.31`, `css 10.30`.

Run: `SCREENSHOT_DIR=/tmp/p3-shots/t4 SCREENSHOT_ONLY=brawl-stars npm run screenshots` and open `brawl-stars-{390,1440}.png`. Check: tiles 2×2 at 390, one row at 1440 ("63% / 5 W / 3 L, recent battles", "21,466", "42,010", "6 / of 95 in the game"); Account card left at 1440 with five rows; three equal "Top brawlers" tiles, 1st outlined in yellow, trophy icons (no tofu boxes); three yellow bars with "18,234 · 85%"; nothing uppercase, nothing below white/60, no gradient, no blue/green/orange.
Old vs new (overview): Win rate ✓ (sub now W / L), W/L ratio ✗ (dropped: repeats win rate, D49), Total victories ✓, brawlers unlocked ✓ (own tile), Trophies tile ✗ (hero shows it), Best trophies ✓ (was a sub-line), podium top 3 with place, name, trophies ✓, Prestige ✓, XP ✓, duplicate Total victories ✗, Robo Rumble ✓ (hidden when 0, was "N/A"), victory distribution 3v3/solo/duo % ✓ (+ absolute numbers), trend ✓, latest 5 ✓; **added** Ranked, Best Ranked.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/bsFacts.ts src/app/components/__tests__/bsFacts.test.ts src/app/components/BSOverview.tsx src/app/components/BSProfile.tsx src/app/components/BSBrawlerGrid.tsx src/app/pages/game/BrawlStars.tsx e2e/bs-panels.spec.ts
git commit -m "feat(bs): overview on the design system, podium and victory bar without gradients or emoji

Adds the Ranked lines the mapper already produced; typed BS tab ids.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Brawlers tab

**Files:**
- Create: `src/app/components/bsBrawlerList.ts`, `src/app/components/__tests__/bsBrawlerList.test.ts`, `src/app/components/BSBrawlers.tsx`, `src/app/utils/__tests__/bsTiers.test.ts`
- Modify: `src/app/utils/bsTiers.ts` (**CRLF**, `sed`), `src/app/ui/GameImage.tsx`, `src/app/pages/game/tabs.tsx`, `src/app/pages/game/__tests__/tabs.test.ts`, `src/app/pages/game/BrawlStars.tsx`, `src/app/components/BSProfile.tsx` (**CRLF**, by command), `e2e/bs-panels.spec.ts`

**Interfaces:**
- Consumes: `brawlerRarityMap` (data, read-only), `getBSTierInfo` (utils), `titleCase` (Task 2), `bsOverviewFacts` (Task 4), `GameImage`, `Pill`, `Button`, `Card`, `EmptyState`.
- Produces:
  - `bsBrawlerList.ts`: `type BrawlerSort = 'trophies' | 'trophies-asc' | 'rarity' | 'power' | 'name'`, `BRAWLER_SORTS: ReadonlyArray<[BrawlerSort, string]>`, `rarityWeight(name: string): number`, `brawlerList(brawlers: readonly BSBrawlerData[], query: string, sort: BrawlerSort): BSBrawlerData[]`.
  - `BSBrawlers({ brawlers: readonly BSBrawlerData[] })`; cards `data-testid="brawler-card"` with an `h3` name; controls labelled "Search brawlers", "Sort brawlers".
  - `GameImage` prop `title?: string`.
  - `tabCounts('brawl-stars', stats)` → `{ brawlers: '6/95' }`.

- [ ] **Step 1: Failing tests: sort/search, tier icons, tab count**

Create `src/app/components/__tests__/bsBrawlerList.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { BSBrawlerData } from '../../data/mockStats';
import { brawlerList, rarityWeight } from '../bsBrawlerList';

const b = (name: string, trophies: number, power = 11) => ({ id: trophies, name, trophies, power }) as BSBrawlerData;
const list = [b('SHELLY', 1210), b('8-BIT', 980), b('COLT', 750, 9), b('MR. P', 420, 7), b('EL PRIMO', 120, 3), b('GLOWY', 0, 1), b('NEWBIE', 50, 2)];
const names = (l: BSBrawlerData[]) => l.map((x) => x.name);

describe('rarityWeight', () => {
  it('reads the static table, spaces as dashes, and ranks unknown brawlers last', () => {
    expect(rarityWeight('SHELLY')).toBe(1);
    expect(rarityWeight('EL PRIMO')).toBe(2);
    expect(rarityWeight('GLOWY')).toBe(5);
    expect(rarityWeight('NEWBIE')).toBe(0);
  });
});

describe('brawlerList', () => {
  it('sorts by trophies both ways, by rarity, power and name', () => {
    expect(names(brawlerList(list, '', 'trophies'))).toEqual(['SHELLY', '8-BIT', 'COLT', 'MR. P', 'EL PRIMO', 'NEWBIE', 'GLOWY']);
    expect(names(brawlerList(list, '', 'trophies-asc'))).toEqual(['GLOWY', 'NEWBIE', 'EL PRIMO', 'MR. P', 'COLT', '8-BIT', 'SHELLY']);
    expect(names(brawlerList(list, '', 'rarity'))).toEqual(['MR. P', 'GLOWY', '8-BIT', 'COLT', 'EL PRIMO', 'SHELLY', 'NEWBIE']);
    expect(names(brawlerList(list, '', 'power'))).toEqual(['SHELLY', '8-BIT', 'COLT', 'MR. P', 'EL PRIMO', 'NEWBIE', 'GLOWY']);
    expect(names(brawlerList(list, '', 'name'))).toEqual(['8-BIT', 'COLT', 'EL PRIMO', 'GLOWY', 'MR. P', 'NEWBIE', 'SHELLY']);
  });
  it('filters by name in any case and never mutates the input', () => {
    const copy = [...list];
    expect(names(brawlerList(list, '  el ', 'trophies'))).toEqual(['SHELLY', 'EL PRIMO']);
    expect(brawlerList(list, 'zzz', 'trophies')).toEqual([]);
    expect(list).toEqual(copy);
  });
});
```

Create `src/app/utils/__tests__/bsTiers.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { getBSTierInfo } from '../bsTiers';

describe('getBSTierInfo', () => {
  it.each([
    [0, 'Wood'], [249, 'Wood'], [250, 'Bronze'], [500, 'Silver'], [750, 'Gold'], [1000, 'Prestige 1'], [2500, 'Prestige 2'], [11851, 'Prestige 11'],
  ])('%j trophies -> %j', (trophies, name) => {
    expect(getBSTierInfo(trophies).name).toBe(name);
  });

  it('points every tier at an icon that exists in public/ (a missing one is a 404 on our own site)', () => {
    for (const trophies of [0, 250, 500, 750, 1000, 2000, 3000, 11851]) {
      const { iconPath } = getBSTierInfo(trophies);
      expect(existsSync(new URL(`../../../../public${iconPath}`, import.meta.url)), iconPath).toBe(true);
    }
  });
});
```

In `src/app/pages/game/__tests__/tabs.test.ts`: in `'keeps the public ids of the spec'` add

```ts
    expect(GAME_TABS['brawl-stars'].map((t) => t.id)).toEqual(['overview', 'brawlers', 'progression', 'battles', 'club']);
```

and inside `describe('tabCounts', …)` after the "nothing for other games" test add:

```ts
  it('shows unlocked / in game on the Brawl Stars Brawlers tab, or unlocked alone', () => {
    const bs = (count: number, stat3Sub: string) =>
      ({ statLabels: { stat3Sub }, gameVisuals: { bs: { allBrawlers: Array.from({ length: count }) } } }) as unknown as PlayerStats;
    expect(tabCounts('brawl-stars', bs(107, '107/109 brawlers unlocked'))).toEqual({ brawlers: '107/109' });
    expect(tabCounts('brawl-stars', bs(6, '6 brawlers unlocked'))).toEqual({ brawlers: '6' });
    expect(tabCounts('brawl-stars', bs(0, '0 brawlers unlocked'))).toEqual({});
  });
```

Run: `npx vitest run src/app/components src/app/utils src/app/pages` → FAIL: `bsBrawlerList` missing, `…prestige_1.png: expected false to be true`, the BS tab count `{}`.

- [ ] **Step 2: Fix the tier icon paths (bug, D50)**

Run: `sed -i 's/icon_trophy_brawler_prestige_\([123]\)\.png/icon_trophy_brawler_prestige_\1.webp/' src/app/utils/bsTiers.ts && echo $(grep -c $'\r$' src/app/utils/bsTiers.ts) $(wc -l < src/app/utils/bsTiers.ts)` → `38 38`; `grep -c '\.png' src/app/utils/bsTiers.ts` → `0`. `npx vitest run src/app/utils` → 9 passed.

- [ ] **Step 3: `bsBrawlerList.ts`**

Create `src/app/components/bsBrawlerList.ts`:

```ts
import { brawlerRarityMap } from '../data/brawlerRarities';
import type { BSBrawlerData } from '../data/mockStats';

export type BrawlerSort = 'trophies' | 'trophies-asc' | 'rarity' | 'power' | 'name';

/** Sort options of the Brawlers tab, in menu order. */
export const BRAWLER_SORTS: ReadonlyArray<[BrawlerSort, string]> = [
  ['trophies', 'Most trophies'],
  ['trophies-asc', 'Fewest trophies'],
  ['rarity', 'Rarest first'],
  ['power', 'Highest power'],
  ['name', 'Name'],
];

const RARITY_WEIGHT: Record<string, number> = {
  Common: 1, Rare: 2, 'Super Rare': 3, Epic: 4, Mythic: 5, Legendary: 6, 'Ultra Legendary': 7,
};

/**
 * Rarity rank from the static table in data/brawlerRarities.ts (the API does
 * not send rarity). A brawler newer than the table ranks as 0, after Common.
 */
export function rarityWeight(name: string): number {
  return RARITY_WEIGHT[brawlerRarityMap[name.toUpperCase().replace(/ /g, '-')] ?? ''] ?? 0;
}

/** The brawlers whose name contains `query` (any case), in `sort` order; ties by trophies, then name. */
export function brawlerList(brawlers: readonly BSBrawlerData[], query: string, sort: BrawlerSort): BSBrawlerData[] {
  const q = query.trim().toLowerCase();
  const byTrophies = (a: BSBrawlerData, b: BSBrawlerData) => b.trophies - a.trophies || a.name.localeCompare(b.name);
  const compare: Record<BrawlerSort, (a: BSBrawlerData, b: BSBrawlerData) => number> = {
    trophies: byTrophies,
    'trophies-asc': (a, b) => a.trophies - b.trophies || a.name.localeCompare(b.name),
    rarity: (a, b) => rarityWeight(b.name) - rarityWeight(a.name) || byTrophies(a, b),
    power: (a, b) => b.power - a.power || byTrophies(a, b),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return brawlers.filter((b) => b.name.toLowerCase().includes(q)).sort(compare[sort]);
}
```

(It lives apart from `bsFacts.ts` on purpose: `bsFacts` is imported by the shell (`battleRows.ts`, `tabs.tsx`), so the rarity table would otherwise ship in the shared GamePage chunk for every game.)

- [ ] **Step 4: Tab count, `GameImage` title**

In `src/app/pages/game/tabs.tsx` add `import { bsOverviewFacts } from '../../components/bsFacts';` above the `PlayerStats` import and replace the `tabCounts` doc comment and function with:

```tsx
/**
 * Small counts shown next to a tab label, computed from the loaded player.
 * Clash Royale Cards: "found / in game" from the API mapper ("12 / 123", or
 * just "12" when the card catalogue could not be fetched). Brawl Stars
 * Brawlers: "unlocked / in game" the same way.
 */
export function tabCounts(game: GameId, stats: PlayerStats): Partial<Record<string, string>> {
  if (game === 'brawl-stars') {
    const unlocked = stats.gameVisuals?.bs?.allBrawlers.length;
    if (!unlocked) return {};
    const inGame = bsOverviewFacts(stats).brawlersInGame;
    return { brawlers: inGame ? `${unlocked}/${inGame}` : String(unlocked) };
  }
  if (game !== 'clash-royale') return {};
  const found = stats.extraStats?.find((s) => s.label === 'Cards Found')?.value;
  return found === undefined || found === '' ? {} : { cards: String(found).replace(/\s+/g, '') };
}
```

In `src/app/ui/GameImage.tsx`: add to the props interface after `loading`

```ts
  /** Hover text (an item's name next to an icon that has no visible label). */
  title?: string;
```

destructure `title` in the signature (`…, loading = 'lazy', title }`), add `title={title}` to the fallback `<span>` (after `data-testid`) and to the `<img>` (before `onError`).

Run: `npx vitest run` → all PASS (268).

- [ ] **Step 5: `BSBrawlers`**

Create `src/app/components/BSBrawlers.tsx`:

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpDown, Cog, Flame, Search, SearchX, Star, Trophy, UserRound, Users, Wrench, Zap } from 'lucide-react';
import type { BSBrawlerData, BSEquipment } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { titleCase } from '../ui/text';
import { getBSTierInfo } from '../utils/bsTiers';
import { BRAWLER_SORTS, brawlerList, type BrawlerSort } from './bsBrawlerList';

const FIELD = 'min-h-11 w-full rounded-card border border-line-input bg-canvas text-sm text-fg';
const n = (value: number) => value.toLocaleString('en-US');
// brawlify serves "regular" art for every item; "borderless" misses newer ones.
const art = (kind: 'gadgets' | 'star-powers', id: number) => [`https://cdn.brawlify.com/${kind}/regular/${id}.png`, `https://cdn.brawlify.com/${kind}/borderless/${id}.png`];

/** Brawl Stars "Brawlers" tab: every unlocked brawler with search and sort. */
export function BSBrawlers({ brawlers }: { brawlers: readonly BSBrawlerData[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<BrawlerSort>('trophies');
  const searchRef = useRef<HTMLInputElement>(null);
  const refocus = useRef(false);

  // "Clear search" disappears with the empty state: give focus back to the search box.
  useEffect(() => {
    if (refocus.current) {
      refocus.current = false;
      searchRef.current?.focus();
    }
  });

  if (brawlers.length === 0) {
    return (
      <EmptyState icon={<Users />} title="No brawlers to show">
        The API sent no brawlers for this player.
      </EmptyState>
    );
  }

  const shown = brawlerList(brawlers, query, sort);

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Search brawlers</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brawlers" className={`${FIELD} pr-3 pl-9`} />
        </label>
        <label className="relative block">
          <span className="sr-only">Sort brawlers</span>
          <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <select value={sort} onChange={(e) => setSort(e.target.value as BrawlerSort)} className={`${FIELD} pr-3 pl-9`}>
            {BRAWLER_SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </Card>

      <p aria-live="polite" className="text-sm text-fg-muted">
        Showing {shown.length} of {brawlers.length} brawlers
      </p>

      {shown.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No brawlers match"
          action={<Button onClick={() => { refocus.current = true; setQuery(''); }}>Clear search</Button>}
        >
          No unlocked brawler has “{query.trim()}” in its name.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((b) => <BrawlerCard key={b.id} brawler={b} />)}
        </ul>
      )}
    </div>
  );
}

function BrawlerCard({ brawler: b }: { brawler: BSBrawlerData }) {
  const tier = getBSTierInfo(b.trophies);
  const hyper = b.hyperCharges?.[0];
  return (
    <li data-testid="brawler-card" className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface-1 p-4">
      <div className="flex items-start gap-3">
        <GameImage sources={[b.imageUrl]} alt="" width={64} height={64} fallback={<UserRound />} className="size-16 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-fg">{titleCase(b.name)}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
            <img src={tier.iconPath} alt="" width={16} height={16} loading="lazy" decoding="async" className="size-4 object-contain" />
            Power {b.power} · {tier.name}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="inline-flex items-center gap-1 text-base font-semibold tabular-nums text-fg">
            <Trophy aria-hidden="true" className="size-4 text-accent" />
            {n(b.trophies)}
            <span className="sr-only"> trophies</span>
          </p>
          <p className="text-xs tabular-nums text-fg-subtle">Best {n(b.highestTrophies)}</p>
        </div>
      </div>

      {((b.currentWinStreak ?? 0) > 0 || hyper) && (
        <div className="flex flex-wrap gap-1.5">
          {(b.currentWinStreak ?? 0) > 0 && <Pill tone="accent" icon={<Flame />}>Win streak {b.currentWinStreak}</Pill>}
          {hyper && (
            <Pill icon={<Zap />}>
              Hypercharge<span className="sr-only">: {titleCase(hyper.name)}</span>
            </Pill>
          )}
        </div>
      )}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-line pt-3 text-xs">
        <Items label="Gadgets" items={b.gadgetsList} icon={<Wrench />} sources={(id) => art('gadgets', id)} />
        <Items label="Star powers" items={b.starPowersList} icon={<Star />} sources={(id) => art('star-powers', id)} />
        <Items label="Gears" items={b.gearsList} icon={<Cog />} sources={(id) => [`https://cdn.brawlify.com/gears/regular/${id}.png`]} />
      </dl>
    </li>
  );
}

function Items({ label, items, icon, sources }: { label: string; items: readonly BSEquipment[]; icon: ReactNode; sources: (id: number) => string[] }) {
  return (
    <>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="flex min-h-7 flex-wrap items-center gap-1.5">
        {items.length === 0 ? (
          <span className="text-fg-subtle">None yet</span>
        ) : (
          items.map((item) => (
            <GameImage
              key={item.id}
              sources={sources(item.id)}
              alt={titleCase(item.name)}
              title={titleCase(item.name)}
              width={28}
              height={28}
              fallback={icon}
              className="size-7 object-contain [&_svg]:size-4"
            />
          ))
        )}
      </dd>
    </>
  );
}
```

Wire it and remove the old section (CRLF-safe):

```bash
node -e "const fs=require('fs');const f='src/app/components/BSProfile.tsx';let s=fs.readFileSync(f,'utf8');const b=s.indexOf('export const BSProgression');const a=s.indexOf('export const BSBrawlers');s=s.slice(0,a)+s.slice(b);const head=[\"import { PlayerStats } from '../data/mockStats';\",\"import { motion } from 'motion/react';\",\"import { Trophy, Users, BarChart2, Shield } from 'lucide-react';\",'',''].join('\r\n');fs.writeFileSync(f,head+s.slice(s.indexOf('export const BSProgression')))"
echo $(grep -c $'\r$' src/app/components/BSProfile.tsx) $(wc -l < src/app/components/BSProfile.tsx)
```

Expected: `214 214` (the header is rewritten because `BSBrawlers` used most of the old imports).

In `src/app/pages/game/BrawlStars.tsx`: replace `import { BSBrawlers, BSClub, BSProgression } from '../../components/BSProfile';` with

```tsx
import { BSBrawlers } from '../../components/BSBrawlers';
import { BSClub, BSProgression } from '../../components/BSProfile';
```

and `return <BSBrawlers playerStats={playerStats} accentColor={accent} />;` with `return <BSBrawlers brawlers={bs.allBrawlers} />;`.

Run: `npm run typecheck` → clean.

- [ ] **Step 6: e2e**

In `e2e/bs-panels.spec.ts` insert before the `// Every BS tab that shows game art` comment:

```ts
test.describe('Brawlers tab', () => {
  const cards = (page: Page) => panel(page).getByTestId('brawler-card');

  test('the tab shows unlocked / in game; each card keeps power, tier, trophies, streak, hypercharge and equipment', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(bs('?tab=brawlers'));
    await expect(page.getByRole('tab', { name: 'Brawlers 6 of 95' })).toHaveAttribute('aria-selected', 'true');
    await expect(cards(page)).toHaveCount(6);
    await expect(page.getByText('Showing 6 of 6 brawlers')).toBeVisible();
    const shelly = cards(page).first();
    await expect(shelly.getByRole('heading', { name: 'Shelly' })).toBeVisible();
    await expect(shelly).toContainText('Power 11 · Prestige 1');
    await expect(shelly).toContainText('1,210');
    await expect(shelly).toContainText('Best 1,250');
    await expect(shelly).toContainText('Win streak 4');
    await expect(shelly).toContainText('Hypercharge');
    await expect(shelly.getByRole('img', { name: 'Fast Forward' })).toBeVisible();
    await expect(shelly.getByRole('img', { name: 'Band-Aid' })).toBeVisible();
    await expect(shelly.getByRole('img', { name: 'Shield' })).toBeVisible();
    // GLOWBERT is renamed by the data layer; El Primo owns nothing yet.
    await expect(cards(page).filter({ hasText: 'Glowy' })).toHaveCount(1);
    await expect(cards(page).filter({ hasText: 'El Primo' }).getByText('None yet')).toHaveCount(3);
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('search narrows the list; no match offers a reset that returns focus to the search box', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs('?tab=brawlers'));
    const search = panel(page).getByLabel('Search brawlers');
    await search.fill('el');
    await expect(cards(page)).toHaveCount(2);
    await search.fill('zzz');
    await expect(panel(page).getByTestId('empty-state').getByText('No brawlers match')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Clear search' }).click();
    await expect(cards(page)).toHaveCount(6);
    await expect(search).toBeFocused();
  });

  test('sort by name and by rarity', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs('?tab=brawlers'));
    const sort = panel(page).getByLabel('Sort brawlers');
    await sort.selectOption({ label: 'Name' });
    await expect(cards(page).first().getByRole('heading')).toHaveText('8-Bit');
    await sort.selectOption({ label: 'Rarest first' });
    await expect(cards(page).first().getByRole('heading')).toHaveText('Mr. P');
    await sort.selectOption({ label: 'Fewest trophies' });
    await expect(cards(page).first().getByRole('heading')).toHaveText('Glowy');
  });

  test('a player without brawlers gets an empty state', async ({ page }) => {
    await mockApi(page, { patch: { 'brawl-stars': { brawlers: [] } } });
    await page.goto(bs('?tab=brawlers'));
    await expect(panel(page).getByTestId('empty-state').getByText('No brawlers to show')).toBeVisible();
  });
});

```

and add to `ART_TABS`: `['brawlers', 19], // 6 portraits, 4 gadgets, 4 star powers, 5 gears`.

(SectionTabs renders the count visibly as "6/95" and to screen readers as "6 of 95", so the tab's accessible name is "Brawlers 6 of 95".)

Run: `npm run build && npx playwright test e2e/bs-panels.spec.ts e2e/tabs.spec.ts` → all pass.

- [ ] **Step 7: Gate, screenshots, look, old vs new**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 268 passed (15 files); e2e 137 passed, 6 skipped; budget about `playerPageJs 155.22`.

Run: `SCREENSHOT_DIR=/tmp/p3-shots/t5 SCREENSHOT_ONLY=brawl-stars-brawlers npm run screenshots` and look. Check: tab "Brawlers 6/95" with the count dimmer; search + sort in one row at ≥ 640 px, stacked at 390, both 44 px with a visible outline; one card per row at 390, three at 1440; names "8-Bit", "Mr. P", "El Primo", "Glowy"; tier icon next to "Power 11 · Prestige 1"; yellow "Win streak 4" pill (dark text is not used: accent text on its tint, 8.25:1); equipment icons in rows labelled Gadgets / Star powers / Gears; no uppercase, no gradients, no hover-only glow.
Old vs new (brawler card): portrait ✓, power ✓ ("Power 11" instead of "Lv 11"), name ✓, trophies ✓, rank icon ✓ (tier icon + tier name instead of "Rank 7"), win streak ✓, best trophies ✓ (now always, not only without a streak), hypercharge ✓, owned gadgets/star powers/gears with names ✓; "Equipped config" ✗ (dropped: not equipped data, D50); header "Brawlers (6/90)" with the hard-coded 90 → tab count "6/95" from the catalogue ✓; search ✓; sort trophies/rarity + order toggle → five explicit sorts ✓.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/bsBrawlerList.ts src/app/components/__tests__/bsBrawlerList.test.ts src/app/components/BSBrawlers.tsx src/app/components/BSProfile.tsx src/app/utils/bsTiers.ts src/app/utils/__tests__/bsTiers.test.ts src/app/ui/GameImage.tsx src/app/pages/game/tabs.tsx src/app/pages/game/__tests__/tabs.test.ts src/app/pages/game/BrawlStars.tsx e2e/bs-panels.spec.ts
git commit -m "feat(bs): brawlers tab with search, sort and owned equipment; fix prestige tier icons

The prestige tier icons pointed at .png files that do not exist. The
'Equipped config' row is gone: the API sends owned items, not loadouts.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Progression tab

**Files:**
- Create: `src/app/components/BSProgression.tsx`
- Modify: `src/app/components/bsBrawlerList.ts`, `src/app/components/__tests__/bsBrawlerList.test.ts`, `src/app/pages/game/BrawlStars.tsx`, `src/app/components/BSProfile.tsx` (**CRLF**, by command), `e2e/bs-panels.spec.ts`

**Interfaces:**
- Consumes: `BSBrawlerData`, `StatTile`, `Card`, `Row`, `EmptyState`.
- Produces: `interface ProgressionFacts { powerCounts: number[]; trophies: number; peakTrophies: number; maxed: number; over1000: number }`, `progressionFacts(brawlers: readonly BSBrawlerData[]): ProgressionFacts`; `BSProgression({ brawlers: readonly BSBrawlerData[] })` with rows `data-testid="power-level"`.

- [ ] **Step 1: Failing unit test**

In `src/app/components/__tests__/bsBrawlerList.test.ts` change the import to `import { brawlerList, progressionFacts, rarityWeight } from '../bsBrawlerList';` and append:

```ts

describe('progressionFacts', () => {
  it('counts power levels, sums trophies and peaks, and counts maxed and 1000+ brawlers', () => {
    const brawlers = [
      { ...b('SHELLY', 1210), highestTrophies: 1250 },
      { ...b('COLT', 750, 9), highestTrophies: 800 },
      { ...b('EL PRIMO', 120, 3), highestTrophies: 100 },
    ] as BSBrawlerData[];
    expect(progressionFacts(brawlers)).toEqual({
      powerCounts: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      trophies: 2080,
      // A best below the current count (stale API value) counts as the current one.
      peakTrophies: 2170,
      maxed: 1,
      over1000: 1,
    });
  });
});
```

Run: `npx vitest run src/app/components/__tests__/bsBrawlerList.test.ts` → FAIL.

- [ ] **Step 2: Implement it**

Append to `src/app/components/bsBrawlerList.ts`:

```ts

export interface ProgressionFacts {
  /** Brawlers at each power level, index 0 = power 1 ... index 10 = power 11. */
  powerCounts: number[];
  /** Sum of every brawler's trophies now, and of each one's best. */
  trophies: number;
  peakTrophies: number;
  maxed: number;
  over1000: number;
}

/** Account progression from the raw brawler list (no display strings involved). */
export function progressionFacts(brawlers: readonly BSBrawlerData[]): ProgressionFacts {
  const powerCounts = Array.from({ length: 11 }, () => 0);
  for (const b of brawlers) if (b.power >= 1 && b.power <= 11) powerCounts[b.power - 1] += 1;
  return {
    powerCounts,
    trophies: brawlers.reduce((sum, b) => sum + b.trophies, 0),
    peakTrophies: brawlers.reduce((sum, b) => sum + Math.max(b.highestTrophies, b.trophies), 0),
    maxed: brawlers.filter((b) => b.power === 11).length,
    over1000: brawlers.filter((b) => b.trophies >= 1000).length,
  };
}
```

Run → PASS.

- [ ] **Step 3: `BSProgression`, wiring, old section removed**

Create `src/app/components/BSProgression.tsx`:

```tsx
import { BarChart2, Users, Zap } from 'lucide-react';
import type { BSBrawlerData } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { progressionFacts } from './bsBrawlerList';

const n = (value: number) => value.toLocaleString('en-US');

/**
 * Brawl Stars "Progression" tab: how many brawlers sit at each power level and
 * how far the brawlers' trophies are from their best. Every count is printed,
 * not only shown on hover.
 */
export function BSProgression({ brawlers }: { brawlers: readonly BSBrawlerData[] }) {
  if (brawlers.length === 0) {
    return (
      <EmptyState icon={<BarChart2 />} title="No progression to show">
        Progression appears once the API lists this player's brawlers.
      </EmptyState>
    );
  }

  const facts = progressionFacts(brawlers);
  const most = Math.max(...facts.powerCounts, 1);
  const gap = Math.max(facts.peakTrophies - facts.trophies, 0);
  const pct = facts.peakTrophies > 0 ? Math.min(100, (facts.trophies / facts.peakTrophies) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="At power 11" value={n(facts.maxed)} sub={`of ${n(brawlers.length)} brawlers`} icon={<Zap />} />
        <StatTile label="1,000+ trophies" value={n(facts.over1000)} sub={`of ${n(brawlers.length)} brawlers`} icon={<Users />} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card as="section" title="Power levels" className="min-w-0">
          <ol className="space-y-2">
            {facts.powerCounts.map((count, i) => (
              <li key={i} data-testid="power-level" className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                <span className="text-fg-muted">Power {i + 1}</span>
                <span aria-hidden="true" className="h-2 overflow-hidden rounded-pill bg-surface-2">
                  <span className="block h-full rounded-pill bg-accent" style={{ width: `${(count / most) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums text-fg">
                  {count}
                  <span className="sr-only"> brawlers</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card as="section" title="Trophies and best" className="min-w-0">
          <div className="divide-y divide-line">
            <Row label="All brawlers now" value={n(facts.trophies)} />
            <Row label="All brawlers at their best" value={n(facts.peakTrophies)} />
          </div>
          <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-2">
            <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm text-fg-muted">
            {gap > 0 ? `${n(gap)} trophies below their combined best.` : 'Every brawler is at its best.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
```

(Two tiles, not three: a third tile sat alone on its own row at 390 px in the plan author's run; the gap is already the card's sentence.)

```bash
node -e "const fs=require('fs');const f='src/app/components/BSProfile.tsx';let s=fs.readFileSync(f,'utf8');const a=s.indexOf('export const BSProgression');const b=s.indexOf('export const BSClub');s=s.slice(0,a)+s.slice(b);s=s.replace('Trophy, Users, BarChart2, Shield','Trophy, Users, Shield');fs.writeFileSync(f,s)"
echo $(grep -c $'\r$' src/app/components/BSProfile.tsx) $(wc -l < src/app/components/BSProfile.tsx)
```

Expected: `119 119`.

In `src/app/pages/game/BrawlStars.tsx`: `import { BSClub, BSProgression } from '../../components/BSProfile';` becomes

```tsx
import { BSClub } from '../../components/BSProfile';
import { BSProgression } from '../../components/BSProgression';
```

and `return <BSProgression playerStats={playerStats} accentColor={accent} />;` becomes `return <BSProgression brawlers={bs.allBrawlers} />;`.

- [ ] **Step 4: e2e**

In `e2e/bs-panels.spec.ts` insert before `// Every BS tab that shows game art`:

```ts
test.describe('Progression tab', () => {
  test('prints every power level count and the trophies below the best, no hover needed', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(bs('?tab=progression'));
    const levels = panel(page).getByTestId('power-level');
    await expect(levels).toHaveCount(11);
    await expect(levels.nth(10)).toHaveText(/Power 11\s*2/);
    await expect(levels.nth(0)).toHaveText(/Power 1\s*1/);
    await expect(levels.nth(1)).toHaveText(/Power 2\s*0/);
    // Fixture: 3,480 now, 3,630 at best.
    await expect(panel(page).getByText('3,480', { exact: true })).toBeVisible();
    await expect(panel(page).getByText('3,630', { exact: true })).toBeVisible();
    await expect(panel(page).getByText('150 trophies below their combined best.')).toBeVisible();
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('a player without brawlers gets an empty state', async ({ page }) => {
    await mockApi(page, { patch: { 'brawl-stars': { brawlers: [] } } });
    await page.goto(bs('?tab=progression'));
    await expect(panel(page).getByTestId('empty-state').getByText('No progression to show')).toBeVisible();
  });
});

```

Run: `npm run build && npx playwright test e2e/bs-panels.spec.ts` → 13 passed.

- [ ] **Step 5: Gate, screenshots, look, old vs new**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 269 passed (15 files); e2e 139 passed, 6 skipped; budget about `playerPageJs 155.04`.

Run: `SCREENSHOT_DIR=/tmp/p3-shots/t6 SCREENSHOT_ONLY=brawl-stars-progression npm run screenshots` and look. Check: two tiles side by side at every width; eleven rows "Power n ▬ count", bars in yellow, counts right-aligned; the trophies card with two rows, a bar and "150 trophies below their combined best."; no hover needed for any number.
Old vs new: power distribution L1–L11 ✓ (counts now printed, were hover-only), P11 highlighted in accent ✓ (all bars accent now; the count says which is largest), current total ✓ ("Current target" relabelled), peak total ✓, progress bar ✓, "You are missing N trophies" ✓ (as a sentence, not red tracked digits); **added** at power 11 and 1,000+ counts.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/bsBrawlerList.ts src/app/components/__tests__/bsBrawlerList.test.ts src/app/components/BSProgression.tsx src/app/components/BSProfile.tsx src/app/pages/game/BrawlStars.tsx e2e/bs-panels.spec.ts
git commit -m "feat(bs): progression tab with printed power-level counts and trophies vs best

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Club tab

**Files:**
- Create: `src/app/components/BSClub.tsx`
- Modify: `src/app/pages/game/types.ts`, `src/app/pages/GamePage.tsx`, `src/app/pages/game/BrawlStars.tsx`, `e2e/bs-panels.spec.ts`
- Delete: `src/app/components/BSProfile.tsx` (CRLF)

**Interfaces:**
- Consumes: `BSClubInfo` (mockStats), `stripColorTags`, `sentenceCase`, `GameImage`, `Row`, `Card`; `summary.tag` from `buildSummary` (Phase 1).
- Produces: `GameModuleProps.playerTag: string` (`'#PYLQGRJC'`, passed by GamePage to every game module); `BSClub({ club: BSClubInfo; playerTag: string })` with members `data-testid="club-member"`.

- [ ] **Step 1: e2e first**

In `e2e/bs-panels.spec.ts` insert before `// Every BS tab that shows game art`:

```ts
test.describe('Club tab', () => {
  test('shows the club without colour tags, its facts and the members by trophies with the player marked', async ({ page }) => {
    const problems = watch(page);
    const calls = await mockApi(page);
    await page.goto(bs('?tab=club'));
    const p = panel(page);
    await expect(p.getByRole('heading', { name: 'LanternWatch' })).toBeVisible();
    await expect(p.getByText('<c')).toHaveCount(0);
    await expect(p.getByText(/Friendly club, active daily\.\s+Push events together\./)).toBeVisible();
    await expect(p.getByText('161,734')).toBeVisible();
    await expect(p.getByText('30,000', { exact: true })).toBeVisible();
    await expect(p.getByText('Invite only')).toBeVisible();
    await expect(p.getByText('4 of 30')).toBeVisible();
    const members = p.getByTestId('club-member');
    await expect(members).toHaveCount(4);
    await expect(members.nth(0)).toContainText('Ash Vale');
    await expect(members.nth(0)).toContainText('President');
    await expect(members.nth(1)).toContainText('Vice president');
    await expect(members.nth(1).getByText('You', { exact: true })).toBeVisible();
    await expect(p.getByText('You', { exact: true })).toHaveCount(1);
    expect(calls).toContain('/api/brawl-stars/clubs/#2Y0Y');
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('a club that cannot be loaded says so', async ({ page }) => {
    await mockApi(page, { club: null });
    await page.goto(bs('?tab=club'));
    await expect(panel(page).getByTestId('empty-state').getByText('Club details are unavailable')).toBeVisible();
  });
});

```

and add `['club', 1],` to `ART_TABS`.

Run: `npm run build && npx playwright test e2e/bs-panels.spec.ts -g "Club tab|club:"` → FAIL (raw "Lantern<c4>Watch</c>", no "You", badge `<img>` instead of the fallback for broken art, no `club-member`).

- [ ] **Step 2: `playerTag` for the modules**

In `src/app/pages/game/types.ts` add above `onTabChange`:

```ts
  /** The player's tag as shown in the hero ('#PYLQGRJC'). */
  playerTag: string;
```

In `src/app/pages/GamePage.tsx` the module render becomes:

```tsx
                      <GameModule game={game} playerStats={playerStats} playerTag={summary.tag} tab={activeTab} onTabChange={(id) => selectTab(id)} />
```

(`summary` is non-null there: the block renders only under `playerStats && summary &&`.)

- [ ] **Step 3: `BSClub`, wiring, `BSProfile.tsx` deleted**

Create `src/app/components/BSClub.tsx`:

```tsx
import { Shield, Trophy } from 'lucide-react';
import type { BSClubInfo } from '../data/mockStats';
import { Card } from '../ui/Card';
import { GameImage } from '../ui/GameImage';
import { Row } from '../ui/Row';
import { sentenceCase, stripColorTags } from '../ui/text';

interface BSClubProps {
  club: BSClubInfo;
  /** The viewed player's tag ('#PYLQGRJC'), to mark them in the member list. */
  playerTag: string;
}

const n = (value: number) => value.toLocaleString('en-US');
const MAX_MEMBERS = 30;

/** Brawl Stars "Club" tab: the club's card and its members by trophies. */
export function BSClub({ club, playerTag }: BSClubProps) {
  const description = stripColorTags(club.description).trim();
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <Card as="section" aria-label="Club" className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <GameImage
            sources={[`https://cdn.brawlify.com/club-badges/regular/${club.badgeId}.png`]}
            alt=""
            width={56}
            height={56}
            fallback={<Shield />}
            className="size-14 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h3 dir="auto" className="truncate text-xl font-semibold text-fg">{stripColorTags(club.name)}</h3>
            <p className="text-xs text-fg-subtle">{club.tag}</p>
          </div>
        </div>
        {description && <p dir="auto" className="mb-2 text-sm whitespace-pre-line text-pretty text-fg-muted">{description}</p>}
        <div className="divide-y divide-line">
          <Row label="Club trophies" value={n(club.trophies)} />
          <Row label="Trophies to join" value={n(club.requiredTrophies)} />
          <Row label="Type" value={sentenceCase(club.type || 'unknown')} />
          <Row label="Members" value={`${club.members.length} of ${MAX_MEMBERS}`} />
        </div>
      </Card>

      <Card as="section" title={`Members (${club.members.length})`} className="min-w-0 lg:col-span-2">
        <ol className="divide-y divide-line">
          {club.members.map((m, i) => {
            const you = m.tag.toUpperCase() === playerTag.toUpperCase();
            return (
              <li key={m.tag} data-testid="club-member" className="flex min-h-14 items-center gap-3 py-2">
                <span className="w-6 shrink-0 text-right text-sm tabular-nums text-fg-subtle">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2">
                    <span dir="auto" className="truncate text-sm font-medium text-fg">{m.name}</span>
                    {/* Inline tag, not a Pill: a 28px pill would make this row taller than the others. */}
                    {you && <span className="shrink-0 rounded-pill bg-accent-soft px-2 text-xs font-medium text-accent">You</span>}
                  </p>
                  <p className="text-xs text-fg-subtle">{sentenceCase(m.role)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-fg">
                  <Trophy aria-hidden="true" className="size-4 text-accent" />
                  {n(m.trophies)}
                  <span className="sr-only"> trophies</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
```

Run: `git rm -q src/app/components/BSProfile.tsx`.

In `src/app/pages/game/BrawlStars.tsx`:
- `import { BSClub } from '../../components/BSProfile';` → `import { BSClub } from '../../components/BSClub';`
- signature: `export default function BrawlStars({ game, playerStats, playerTag, tab, onTabChange }: GameModuleProps) {`
- delete `const accent = game.accent;`
- `<BSClub playerStats={playerStats} accentColor={accent} />` → `<BSClub club={bs.club} playerTag={playerTag} />`

Run: `npm run typecheck` → clean; `grep -rn "motion/react" src/app/components/BS* src/app/pages/game/BrawlStars.tsx` → nothing.

- [ ] **Step 4: Gate, screenshots, look, old vs new**

Run: `npm run build && npx playwright test e2e/bs-panels.spec.ts e2e/tabs.spec.ts e2e/player.spec.ts` → all pass; then `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 269 passed (15 files); e2e 142 passed, 6 skipped; budget about `playerPageJs 154.31`.

Run: `SCREENSHOT_DIR=/tmp/p3-shots/t7 SCREENSHOT_ONLY=brawl-stars-club npm run screenshots` and look. Check: club card left (1/3) and members right (2/3) at 1440, stacked at 390; "LanternWatch" with no tag markup; description on two lines; rows "Club trophies 161,734 / Trophies to join 30,000 / Type Invite only / Members 4 of 30"; members numbered 1–4, roles "President / Vice president / Senior / Member", a small yellow "You" next to Kitebreaker, every member row the same height; no glow, no gradient, no uppercase.
Old vs new: badge ✓ (working URL now), name ✓ (tags stripped), tag ✓, club trophies ✓, description ✓ ("No description provided." when empty ✗: empty means nothing to say), type ✓, required trophies ✓, members n/30 ✓, roster position/name/role/trophies ✓, "You" ✓ (now actually shown); member name colours ✗ and the inner scroll box ✗ (D51).

- [ ] **Step 5: Commit**

```bash
git add src/app/components/BSClub.tsx src/app/components/BSProfile.tsx src/app/pages/game/types.ts src/app/pages/GamePage.tsx src/app/pages/game/BrawlStars.tsx e2e/bs-panels.spec.ts
git commit -m "feat(bs): club tab on the design system; fix badge URL, colour tags and the You marker

All four old badge URLs fail on production; club names carry <cN> tags; the
You marker compared against a tag PlayerStats never had.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Layout-stability sweep over every Brawl Stars tab

**Files:**
- Modify: `e2e/overflow.spec.ts` (whole file), `e2e/cls.spec.ts`, `src/app/pages/game/BrawlStars.tsx` (whole file below)

**Interfaces:**
- Consumes: BS tab ids, `brawler-card`, `top-brawler`, filter labels (Tasks 3–7).
- Produces: per-frame overflow recorder for every CR and BS tab (filtered views included) and while switching tabs at 320/390/1440; CLS ≤ 0.05 for every BS tab and every BS empty state at 1440/390/320; BS overview CLS < 0.02 at 390 (the Phase 1 podium deferral).

- [ ] **Step 1: Overflow recorder for every BS tab**

Replace `e2e/overflow.spec.ts` with:

```ts
import { test, expect, type Page } from '@playwright/test';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

/**
 * Records, frame by frame from navigation start, how far the page is wider
 * than the viewport. A settled-page check misses a one-frame overflow.
 */
test.use({ viewport: { width: 320, height: 640 } });

async function recordOverflow(page: Page) {
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
}
const maxOverflow = (page: Page) => page.evaluate(() => (window as unknown as { __maxOverflow: number }).__maxOverflow);

// Every Clash Royale and Brawl Stars tab (phases 2 and 3), filtered Battles views included.
const PAGES = [
  ...['', '?tab=cards', '?tab=deck', '?tab=battles', '?tab=battles&result=loss&mode=ladder', '?tab=towers'].map((search) => ({ game: 'clash-royale', search })),
  ...['', '?tab=brawlers', '?tab=progression', '?tab=battles', '?tab=battles&mode=solo-showdown&result=loss', '?tab=club'].map((search) => ({ game: 'brawl-stars', search })),
];

for (const { game, search } of PAGES) {
  test(`${game}${search}: no frame of the load overflows a 320px screen`, async ({ page }) => {
    await mockApi(page);
    await recordOverflow(page);
    await page.goto(`/game/${game}/player/${FIXTURE_TAG}${search}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(await maxOverflow(page)).toBe(0);
  });
}

test('opening the badges and switching battle filters never overflows a 320px screen', async ({ page }) => {
  await mockApi(page);
  await recordOverflow(page);
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  await page.getByRole('button', { name: /Badges/ }).click();
  await expect(page.getByTestId('badge-list')).toBeVisible();
  await page.getByRole('tab', { name: 'Battles' }).click();
  for (const option of ['Losses', 'Draws', 'Path of Legend', 'All modes', 'All']) {
    await page.getByRole('tabpanel').locator('label').filter({ hasText: new RegExp(`^${option}\\s*\\d+$`) }).click();
  }
  await page.waitForTimeout(500);
  expect(await maxOverflow(page)).toBe(0);
});

test('searching and sorting brawlers and filtering Brawl Stars battles never overflows a 320px screen', async ({ page }) => {
  await mockApi(page);
  await recordOverflow(page);
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}?tab=brawlers`);
  const panel = page.getByRole('tabpanel');
  await panel.getByLabel('Search brawlers').fill('zzz');
  await panel.getByRole('button', { name: 'Clear search' }).click();
  await panel.getByLabel('Sort brawlers').selectOption({ label: 'Name' });
  await page.getByRole('tab', { name: 'Battles' }).click();
  for (const option of ['Solo Showdown', 'Losses', 'Duo Showdown', 'All modes', 'All']) {
    await panel.locator('label').filter({ hasText: new RegExp(`^${option}\\s*\\d+$`) }).click();
  }
  await page.waitForTimeout(500);
  expect(await maxOverflow(page)).toBe(0);
});

// Switching tabs after load must not overflow in the frame after the switch, at any width.
const TAB_NAMES = {
  'clash-royale': [/^Cards/, 'Deck', 'Battles', 'Tower troops', 'Overview'],
  'brawl-stars': [/^Brawlers/, 'Progression', 'Battles', 'Club', 'Overview'],
} as const;
for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  for (const [game, names] of Object.entries(TAB_NAMES)) {
    test(`switching every ${game} tab never overflows at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockApi(page);
      await recordOverflow(page);
      await page.goto(`/game/${game}/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      for (const name of names) {
        await page.getByRole('tab', { name }).click();
        await page.waitForTimeout(300);
      }
      expect(await maxOverflow(page)).toBe(0);
    });
  }
}
```

(The CR tests are unchanged in behaviour; the recorder moved into `recordOverflow`.)

- [ ] **Step 2: CLS for every BS tab, every BS empty state, and the podium deferral**

In `e2e/cls.spec.ts` replace the `{ game: 'brawl-stars', search: '' },` entry of `PAGES` with:

```ts
  ...['', '?tab=brawlers', '?tab=progression', '?tab=battles', '?tab=club'].map((search) => ({ game: 'brawl-stars', search })),
```

and append to the file:

```ts

// Short Brawl Stars sections replace the screen-tall skeleton: the footer must not jump
// (measured 0.14-0.15 at 390px before the module kept every section screen-tall).
const SHORT_BS: Array<[string, string, Parameters<typeof mockApi>[1]]> = [
  ['no club', '?tab=club', { patch: { 'brawl-stars': { club: undefined } } }],
  ['club unavailable', '?tab=club', { club: null }],
  ['no brawlers', '?tab=brawlers', { patch: { 'brawl-stars': { brawlers: [] } } }],
  ['no brawlers (progression)', '?tab=progression', { patch: { 'brawl-stars': { brawlers: [] } } }],
  ['no battles', '?tab=battles', { battlelog: { 'brawl-stars': { items: [] } } }],
];
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  for (const [name, search, options] of SHORT_BS) {
    test(`brawl-stars ${name} shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
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
      await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}${search}`);
      await expect(page.getByTestId('empty-state')).toBeVisible();
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await page.waitForTimeout(1000);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
    });
  }
}

// Phase 1 left the Brawl Stars podium shifting ~0.03 at 390px; the restyled overview must stay under 0.02.
test('brawl-stars overview shifts less than 0.02 at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
  await expect(page.getByTestId('top-brawler')).toHaveCount(3);
  await page.waitForTimeout(1500);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThan(0.02);
});
```

Run: `npm run build && npx playwright test e2e/cls.spec.ts -g "brawl-stars" --workers=6`
Expected: the "no club", "club unavailable", "no brawlers…" tests FAIL at 390/320 px (0.14–0.15); everything else passes.

- [ ] **Step 3: Keep every BS section screen-tall (D53)**

Replace `src/app/pages/game/BrawlStars.tsx` with its final form:

```tsx
import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { BSBattleSummary } from '../../components/BSBattleSummary';
import { bsBattleRows } from '../../components/bsFacts';
import { BSBrawlers } from '../../components/BSBrawlers';
import { BSClub } from '../../components/BSClub';
import { BSOverview } from '../../components/BSOverview';
import { BSProgression } from '../../components/BSProgression';
import { EmptyState } from '../../ui/EmptyState';
import { BattlesPanel } from './BattlesPanel';
import { OverviewExtras } from './OverviewExtras';
import type { TabId } from './tabs';
import type { GameModuleProps } from './types';

type BSTab = TabId<'brawl-stars'>;

/** Brawl Stars sections: overview | brawlers | progression | battles | club. */
export default function BrawlStars({ game, playerStats, playerTag, tab, onTabChange }: GameModuleProps) {
  const bs = playerStats.gameVisuals?.bs;
  if (!bs) {
    return (
      <EmptyState icon={<Shield />} title="No Brawl Stars profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }
  const battles = bsBattleRows(bs.battlelog);
  const go = (id: BSTab) => onTabChange(id);

  const section = (): ReactNode => {
    // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
    switch (tab as BSTab) {
      case 'brawlers':
        return <BSBrawlers brawlers={bs.allBrawlers} />;
      case 'progression':
        return <BSProgression brawlers={bs.allBrawlers} />;
      case 'battles':
        return <BattlesPanel matches={battles} summary={(scope) => <BSBattleSummary battles={scope} />} />;
      case 'club':
        return bs.club ? (
          <BSClub club={bs.club} playerTag={playerTag} />
        ) : (
          <EmptyState icon={<Shield />} title={bs.clubTag ? 'Club details are unavailable' : 'Not in a club'}>
            {bs.clubTag
              ? 'The club could not be loaded right now. Reload the page to try again.'
              : 'This player has not joined a club yet.'}
          </EmptyState>
        );
      default:
        return (
          <div className="space-y-4">
            <BSOverview playerStats={playerStats} battles={battles} onOpenBrawlers={() => go('brawlers')} />
            <OverviewExtras playerStats={playerStats} matches={battles} chartColor={game.chartPrimary} onShowBattles={() => go('battles')} />
          </div>
        );
    }
  };

  // Screen-tall like PanelSkeleton: a short section (club, an empty state) would
  // otherwise pull the footer up into view when it replaces the skeleton.
  return <div className="min-h-dvh">{section()}</div>;
}
```

Run: `npm run build && npx playwright test e2e/overflow.spec.ts e2e/cls.spec.ts --workers=6` → 62 passed. (Measured after: every BS page and empty state ≤ 0.0003 at 1440/390/320; the BS overview at 390 is 0.0001, down from Phase 1's 0.03–0.038.)

- [ ] **Step 4: Prove the recorder still catches a one-frame overflow**

Temporarily change `useLayoutEffect` to `useEffect` in `src/app/components/TrophyTrend.tsx` (import and call), `npm run build && npx playwright test e2e/overflow.spec.ts -g "brawl-stars: " --repeat-each=3` → FAIL (max overflow > 0). `git checkout src/app/components/TrophyTrend.tsx`, rebuild, PASS.

- [ ] **Step 5: Gate, stress, commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 269 passed; e2e 175 passed, 6 skipped. Then `npx playwright test e2e/bs-battles.spec.ts e2e/bs-panels.spec.ts e2e/overflow.spec.ts e2e/cls.spec.ts --repeat-each=2 --workers=6` → 168 passed.

```bash
git add e2e/overflow.spec.ts e2e/cls.spec.ts src/app/pages/game/BrawlStars.tsx
git commit -m "test(bs): per-frame overflow and CLS on every Brawl Stars tab; screen-tall sections

Short sections pulled the footer into view when they replaced the skeleton
(0.14-0.15 at 390px); the overview's old podium shift is gone (0.0001).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Remove dead restyle leftovers

**Files:**
- Modify: `src/app/data/games.ts` (whole file, LF, UTF-8 → plain ASCII), `src/styles/fonts.css`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GameTheme = { id; name; shortName; tagline; accent; chartPrimary }`.

- [ ] **Step 1: Prove the fields are unused**

Run: `for f in background surface gradientFrom gradientTo chartSecondary badgeColor inputType logo fontClass; do echo "$f $(grep -rn "\.$f\b" src e2e scripts --include=*.ts --include=*.tsx --include=*.mjs | grep -v data/games.ts | wc -l)"; done; grep -rn "font-cr\|font-bs\|font-coc" src index.html | grep -v fonts.css`
Expected: every count `0`, no font-class user. If any count is not 0, keep that field and note it in the PR.

- [ ] **Step 2: Rewrite `games.ts`**

Replace `src/app/data/games.ts`:

```ts
export interface GameTheme {
  id: string;
  name: string;
  /** Two or three letters for tight spots (header switcher, recent-search chips). */
  shortName: string;
  tagline: string;
  /** Same hex as the game's --accent in theme.css (data/__tests__/games.test.ts checks it). */
  accent: string;
  /** Line colour of the trophy trend (an SVG attribute, so a hex rather than a class). */
  chartPrimary: string;
}

export const games: GameTheme[] = [
  {
    id: 'clash-royale',
    name: 'Clash Royale',
    shortName: 'CR',
    tagline: 'Real-time card battle arena',
    accent: '#4C8DFF',
    chartPrimary: '#4C8DFF',
  },
  {
    id: 'brawl-stars',
    name: 'Brawl Stars',
    shortName: 'BS',
    tagline: 'Fast-paced multiplayer brawls',
    accent: '#FFC21A',
    chartPrimary: '#FFC21A',
  },
  {
    id: 'clash-of-clans',
    name: 'Clash of Clans',
    shortName: 'CoC',
    tagline: 'Build, raid, conquer',
    accent: '#5BD65B',
    chartPrimary: '#5BD65B',
  },
];

export const getGameById = (id: string): GameTheme | undefined =>
  games.find(game => game.id === id);
```

In `src/styles/fonts.css` delete the rule `.font-cr,\n.font-bs,\n.font-coc {\n  font-family: 'Clash', 'Inter', sans-serif;\n}` and the blank line after it.

- [ ] **Step 3: Gate and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
Expected: unit 269 passed; e2e 175 passed, 6 skipped; budget about `initialJs 123.43`, `entryJs 6.71`, `css 9.02` (the entry chunk carries `games.ts`).

Run: `SCREENSHOT_DIR=/tmp/p3-shots/t9 SCREENSHOT_ONLY=home npm run screenshots` and compare with `docs/screenshots/phase2/home-*.png`: identical (the Clash wordmark comes from the `font-display` utility, not from the removed classes).

```bash
git add src/app/data/games.ts src/styles/fonts.css
git commit -m "chore(restyle): drop unused game theme fields and per-game font classes

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Review screenshots

**Files:**
- Create: `docs/screenshots/phase3/{home,clash-royale,clash-royale-battles,brawl-stars,brawl-stars-brawlers,brawl-stars-progression,brawl-stars-battles,brawl-stars-battles-showdown,brawl-stars-club,clash-of-clans}-{390,768,1440}.png` (30 files, about 3.5 MB)

**Interfaces:**
- Consumes: `npm run screenshots` (Task 1).
- Produces: the PNGs reviewers must look at, one line of observations per page for the PR.

- [ ] **Step 1: Produce them**

Run: `npm run build && npm run screenshots`
Expected: 30 `wrote docs/screenshots/phase3/…png` lines; nothing left on port 4173.

- [ ] **Step 2: Look at every screenshot (all 30) and fix before committing**

On every BS page: one accent (yellow), 12 px cards, hairline borders, no emoji or tofu boxes, no uppercase tracked labels, nothing dimmer than white/60, no gradient or glow, no clipped number or sub-line at 390, solid yellow controls with dark text. `clash-royale`, `clash-royale-battles`, `clash-of-clans`, `home`: identical to `docs/screenshots/phase2/` (shared components changed only for BS). Write one line per page for the PR.

- [ ] **Step 3: Look at live data once (not committed)**

Run with the tag from the environment only: `E2E_BS_TAG=<tag> SCREENSHOT_DIR=/tmp/p3-shots/live SCREENSHOT_ONLY=brawl-stars npm run screenshots`
Check on real data (the plan author's run, for comparison): portraits and the club badge load; "Brawlers 107/108"; Win rate 72 % "18 W / 7 L"; Best Robo Rumble "20s"; 25 Solo Showdown rows with placements, so the Battles tab shows only the Result group (D27); the club name without `<c9>` markup and "You" on the first member; ~107 brawler cards load lazily without overflow; trend "+147 over 25 battles" ending at the hero's trophy count. Member names with emoji may render as tofu boxes in headless Chromium (data, not chrome). Delete `/tmp/p3-shots/live` afterwards.

- [ ] **Step 4: Commit**

```bash
git add docs/screenshots/phase3
git commit -m "docs: phase 3 review screenshots

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
Expected: unit 269 passed (15 files); e2e 175 passed, 6 skipped.

- [ ] **Step 2: Real players**

Run (tags from the environment, never typed into a file): `E2E_CR_TAG=… E2E_BS_TAG=… E2E_COC_TAG=… npm run e2e`
Expected: the six `… a real player renders …` tests pass through the preview's API proxy (an art 404 on brawlify must not fail them: `ART_HOSTS` covers `cdn.brawlify.com` and `cdn-old.brawlify.com`).

- [ ] **Step 3: Contract checks**

Run each and confirm:
- `git diff main --stat -- src/app/routes.ts src/app/services src/app/data/mockStats.ts src/app/data/brawlerPatches.ts src/app/data/brawlerRarities.ts docs/caddy-tail.caddy index.html package.json package-lock.json` → empty (no data-layer change at all).
- `git diff main --stat` lists `src/app/components/BSProfile.tsx` and `BSBrawlerGrid.tsx` as deleted; `echo $(grep -c $'\r$' src/app/utils/bsTiers.ts) $(wc -l < src/app/utils/bsTiers.ts)` → two equal numbers.
- `grep -rnP "\p{Extended_Pictographic}|★|→" src/app/components/BS*.tsx src/app/components/bs*.ts src/app/components/MatchHistory.tsx src/app/pages/game src/app/data/games.ts` → nothing.
- `grep -rnE "#[0-9A-Fa-f]{6}\b|text-white|bg-white|bg-black|\[#|bg-(blue|green|orange|yellow|purple|pink|red)-|text-(yellow|orange|red|green|purple)-" src/app/components/BS*.tsx src/app/components/MatchHistory.tsx src/app/pages/game/BrawlStars.tsx` → nothing.
- `grep -rnE "uppercase|tracking-wid|animate-|insertAdjacentHTML|onError=|motion" src/app/components/BS*.tsx` → nothing.
- `grep -rn "bg-accent\b" src/app/components src/app/ui src/app/pages | grep -v "text-accent-contrast\|rounded-pill bg-accent\" style\|h-full rounded-pill bg-accent\|block h-full"` → nothing (every solid accent fill carries `text-accent-contrast`; bars carry no text).

- [ ] **Step 4: Budget summary for the PR**

Run: `npm run build | sed -n '/performance budget/,$p'`
Expected about: initialJs 123.43 / 129.82, playerPageJs 154.12 / 163.98, entryJs 6.71 / 8, css 9.02 / 12.32, fonts 48.26 / 50. Copy it into the PR with the D42 phase-start numbers next to it.

- [ ] **Step 5: PR description and post-deploy checks (pushing and deploying follow the owner's flow, superpowers:finishing-a-development-branch)**

Include: the commits; the budget table; the screenshot observations from Task 10; the visible-behaviour decisions (D43, D44, D46, D47, D49–D53); the bug list (prestige tier icons 404; club badge URLs all failing; colour tags shown raw; "You" never shown; "Equipped config" mislabelled owned items; CLS 0.14–0.15 for short BS sections at 390 px and the podium's 0.03); the data checks done against production (D44, D45); and the post-deploy checklist from the spec: `E2E_BASE_URL=https://supercellstats.com npm run e2e` with the three tags; Lighthouse mobile on `/`, `/game/brawl-stars` and one BS player URL (plus `/game/clash-royale` and `/game/clash-of-clans` for the every-phase rule): performance ≥ 90, accessibility / best practices / SEO 100, CLS ≤ 0.05, TBT ≤ 150 ms, LCP ≤ 3.0 s (re-run once before treating a miss as real); on production open a BS player's Battles tab, pick Solo Showdown and Losses, reload, go to Club and back, use Copy link; open the Club tab and check the badge loads.

---

## Spec coverage (self-review)

| Spec requirement (Phase 3 and every-phase acceptance) | Task |
|---|---|
| Brawl Stars profile restyle on tokens/primitives (radius 12, one accent, hairline, no gradients, type scale, tabular numbers) | 4 (overview), 5 (brawlers), 6 (progression), 7 (club), 2–3 (rows, tiles) |
| Battles promoted to its own tab **with filters (mode, win/loss/draw)**, Showdown included | 3 (D43, D44, D47), 2 (placement on rows) |
| Tabs-in-URL contract kept: `?tab` additive, invalid falls back, reload/back, filters dropped on tab change, Copy link | 3 (`bs-battles.spec.ts` reload/back/Copy link; `battleRowsOf` for any game), 4 (typed `BSTab`), 1 (`tabs.spec` club) |
| Icons: lucide only, no emoji in UI chrome | 4 (podium emoji, D49), 5 (no tofu fallbacks), 9 (`games.ts` emoji logos); `expectNoEmoji` in every BS spec; 11 Step 3 |
| Every async region: skeleton, empty, error | 3 (no battles / no match), 5 (no brawlers / no match), 6 (no brawlers), 7 (no club / club unavailable); skeleton/error unchanged |
| Motion 150–200 ms, opacity/transform, reduced motion | 4–7 (all `motion` entrances, height springs and the `animate-pulse` hypercharge glow removed) |
| WCAG AA, nothing below white/60, contrast numbers | 1 (`contrast.test.ts` accent-as-text, D42 numbers), 4–7 (tokens only), 11 Step 3 |
| ≥ 44 px targets on mobile, keyboard, visible focus, focus management, sr-only text | 3 (`expectTouchTargets`, focus after reset), 5 (44 px search/sort, focus after "Clear search"), 2/4/5/7 (sr-only "Placed", "trophies", hypercharge name) |
| No clipped text / horizontal scroll at 320 px | 2 (detail line wraps between parts), 3 (320 spec), 8 (per-frame recorder on every BS tab and interaction) |
| CLS ≤ 0.05; no shift when filtering; podium deferral ≤ 0.02 | 8 (D53; every tab and empty state; overview < 0.02 at 390), 3 (tiles always have a sub-line), `GameImage` same-size fallbacks |
| Heavy assets lazy, explicit width/height | 4, 5, 7 (`GameImage` lazy with width/height; tier icon 16×16) |
| Performance budget enforced; phase start; ≤ 5 % per phase; what to cut | 1 (D42), every task's gate, 11 Step 4 |
| No new runtime dependency > 5 KB | Global Constraints; 11 Step 3 (`package.json` unchanged) |
| Routes, CSP unchanged; art only from allowed hosts | Global Constraints; 5 and 7 (brawlify URLs probed live); 11 Step 3 |
| Data layer untouched except bugs | none needed (D43, D45); 11 Step 3 |
| Lint/typecheck/test/build/e2e green per commit; CI | every task's gate |
| E2E: no console errors, no failed non-image requests; art 404s only on `ART_HOSTS` | `watch()` in every new test; ART_TABS fallback tests (overview, brawlers, club); 1 (clubs route) |
| Screenshots 390/768/1440 committed and looked at | 1 (tooling, before shots), each UI task's look step, 10 |
| Production verification after deploy (e2e with real tags, Lighthouse) | 11 Steps 2 and 5 |
| Phase 1/2 deferred: yellow accent with `accent-contrast` and as text | 1 (contrast guard), Global Constraints |
| Phase 1/2 deferred: uppercase tracked headings, emoji glyphs (podium, tiles), 'Draw' dim text | 3 (Draw pill tone), 4, 5, 7 |
| Phase 1/2 deferred: BS victory bar multi-colour | 4 (D49) |
| Phase 1/2 deferred: Brawlers grid/list (search, sort) | 5 (D50) |
| Phase 1/2 deferred: Progression tab, Club tab (empty state for no club) | 6, 7, 8 (screen-tall empty states) |
| Phase 1/2 deferred: Battle Log → Battles tab with filters incl. Showdown placement | 3 |
| Phase 1/2 deferred: podium 'Top Brawlers', 390 px shift ~0.03 | 4, 8 (0.0001, test < 0.02) |
| Phase 1/2 deferred: dead code (`games.ts` fields, `.font-*` css) | 9 (D55) |
| Phase 1/2 deferred: typed tab ids for BS | 4 (`BSTab`), 5 (`GAME_TABS` BS ids test) |
| Phase 2 lessons: information lost in restyles | old vs new checklist in Tasks 2–7 |
| Phase 2 lessons: live-data checks of trend/win rate | D44, D45 (production payload), 10 Step 3 |
| Phase 2 lessons: non-Latin digits | 4 (`bsOverviewFacts` via `parseCount`, Arabic-Indic test); raw numbers used everywhere else |
| Phase 2 lessons: art 404s / blocked CDNs | D50, D51 (probed), `GameImage` chains, ART_TABS tests |
| Phase 2 lessons: CRLF preservation, staged-by-path commits | Global Constraints; node/sed commands with line-count checks in Tasks 3–6; every commit lists paths |

Placeholder scan: no "TBD", "TODO", "similar to Task N" or prose-only code steps; every code step shows the full file or an exact old → new edit, and every CRLF edit is a command with its expected line count. Type consistency checked: `BattleRow` (2 → 3, 4, `battleRowsOf`), `bsBattleRows`/`formatDuration`/`battleTime` (2 → 3, 4), `battleSummary`/`BattleSummary` (3 → 4), `bsOverviewFacts` (4 → 5 `tabCounts`), `BattlesPanel` `summary` (3), `BSTab`/`go` (4 → 8), `BrawlerSort`/`BRAWLER_SORTS`/`brawlerList`/`rarityWeight` (5), `progressionFacts` (6), `GameModuleProps.playerTag` (7 → 8), `GameImage.title` (5), `titleCase`/`stripColorTags`/`ordinal` (2 → 4, 5, 7); test ids `battle-row`, `top-brawler`, `brawler-card`, `power-level`, `club-member`, `game-image-fallback`, `empty-state`, `panel-skeleton` match between components and specs; `MockApiOptions` grows `club` (1).

## Open concerns (for the owner, not blocking)

1. **Ranked (Elo) battles were not in the live sample** (25/25 Solo Showdown, `type: "ranked"` = trophy battles). If a `soloRanked`/`teamRanked` battle carries a `trophyChange` that is not brawler trophies, the BS trend and "Net trophies" would include it. Check once with a player who plays Ranked; the fix would be a filter in the data layer (`buildTrophyTrend` input) and in `bsBattleRows` score, like CR's `crTrophyRoadBattles`.
2. **Brawler rarity comes from a static table** (`data/brawlerRarities.ts`) that already misses new brawlers (e.g. the live player's 107th); they sort last under "Rarest first". Keeping the table current is a data task outside this restyle.
3. **The Brawlers tab is long on phones** (~110 px per brawler card, ~12,000 px for 107 brawlers). Search and sort make it usable; a denser list mode could come later if the owner wants it.
4. `BRAWLER_PATCHES` in `data/brawlerPatches.ts` is exported but unused (data layer, left alone).
5. Lighthouse was not run while writing this plan; it is part of Task 11's post-deploy checklist.
