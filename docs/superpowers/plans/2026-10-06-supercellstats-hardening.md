# SupercellStats — Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring supercellstats.com to a state where it runs the latest code, current dependencies, zero known vulnerabilities, zero console/runtime errors, correct HTTP semantics (real 404s, security headers) and is protected against regressions by tests and CI.

**Architecture:** Static React 18 + Vite 7 SPA served by Caddy from `~/apps/supercellstats/dist`. `/api/<game>/*` is reverse-proxied by Caddy to RoyaleAPI's fixed-IP relays with the Supercell key injected server-side (see `DEPLOY.md`). Work happens on branch `fix/data-perf-a11y` (one unpushed commit `3e06ce1`, 39 files), is merged by the **owner** via PR, then deployed with `scripts/deploy.sh`. Caddy changes are applied by a root script with automatic rollback.

**Tech Stack:** React 18.3, react-router 7, Vite 7, Tailwind 4, TypeScript 5.9, Vitest (new), Playwright (new), ESLint (new), Caddy 2.11, GitHub Actions.

**Spec:** this document (no separate spec). Findings it is based on, measured 2026-10-06:
- Live site serves an OLD build: `~/apps/supercellstats` is at `2f1893f`, local `dist/` differs from deployed `dist/`.
- `main` = `0cee37a` (PR #16 and #17 are merged). `fix/data-perf-a11y` has 1 commit ahead (`3e06ce1`), never pushed, no PR.
- `npm audit`: 6 vulnerabilities (4 high, 2 moderate); `react-router` is direct and has a fix available.
- `npm outdated`: patch bumps available (vite 7.3.7, react-router 7.18.4, tailwind 4.3.3, motion 12.43.0, @types/node 25.9.9). Majors exist (React 19, Vite 8, TS 7, motion 14, lucide 1.x, react-router 8) — NOT in scope, see Task 2.
- Live `GET /nope` → **200** (soft-404). Caddy `try_files {path} /index.html` does not check `{path}/index.html`, so the prerendered `dist/game/<id>/index.html` shells (own `<head>` per game) are never served.
- Live responses carry no `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`.
- No unit tests, no lint, no e2e. CI only runs typecheck + build.
- External origins used by the app: `cdn.brawlify.com`, `cdn-old.brawlify.com`, `api-assets.clashroyale.com`, `royaleapi.github.io`, `fonts.googleapis.com`, `fonts.gstatic.com`.

## Global Constraints

- Nothing in this plan pushes to `main`, merges a PR, or force-pushes. PR merge is done by the owner (repo rule, see memory note `supercell-stats`).
- No API key/JWT may ever appear in the repo, in `dist/`, or in command output pasted anywhere. `scripts/check-bundle.mjs` must keep passing. When reading `/etc/caddy/Caddyfile`, mask `Bearer` values (`sed -E 's/Bearer [A-Za-z0-9._-]+/Bearer ***/'`).
- Node 22 (CI) — local Node must run `npm ci` cleanly.
- Every task ends with `npm run typecheck && npm run build` green.
- Commits are small, one concern each; commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Caddy edits: always backup, `caddy validate` before reload, automatic rollback, post-reload curl checks (same pattern as `~/crowdsec/09-techtool-apt-caddy.sh`). They need `sudo`, so the owner runs the script.

## File Structure

| File | Responsibility |
|---|---|
| `src/app/services/supercellService.ts` | modify: `export` three pure helpers so they are testable |
| `src/app/services/__tests__/supercellService.test.ts` | create: unit tests for tag handling, battle log shape, card level, Brawl Stars outcome |
| `vite.config.ts` | modify: add `test` block (Vitest) |
| `e2e/smoke.spec.ts`, `playwright.config.ts` | create: browser smoke test that fails on any console/page/network error |
| `eslint.config.js` | create: flat config, TS + react-hooks |
| `package.json` | modify: scripts `test`, `lint`, `e2e`; devDependencies |
| `.github/workflows/ci.yml` | modify: add lint + test steps |
| `.github/dependabot.yml` | create: weekly npm updates |
| `deploy/Caddy-supercellstats.md` + `~/crowdsec/10-supercellstats-caddy.sh` | create: documented target vhost + root apply script |
| `DEPLOY.md` | modify: document headers, 404 behaviour, rollback |

---

### Task 1: Publish the pending work as a PR (no merge)

**Files:** none modified.

**Interfaces:** Produces: an open PR from `fix/data-perf-a11y` into `main`; later tasks add commits to this branch.

- [ ] **Step 1: Confirm the branch is clean and builds**

Run: `cd ~/SUPERCELL-STATS && git status -sb && npm run typecheck && npm run build`
Expected: `## fix/data-perf-a11y` with no modified files, typecheck silent, `build check passed`.

- [ ] **Step 2: Push the branch**

Run: `git push -u origin fix/data-perf-a11y`
Expected: new remote branch created.

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base main --head fix/data-perf-a11y \
  --title "Correct the stats, halve the payload, give players a URL" \
  --body "Data-layer fixes verified against live payloads (CR battle log array, BS Showdown outcome, card level cap 16, no more hardcoded denominators), smaller bundle, shareable /game/:id/player/:tag URLs. See commit 3e06ce1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
Expected: PR URL printed. CI starts.

- [ ] **Step 4: Wait for CI**

Run: `gh pr checks --watch`
Expected: `build` passes. If it fails, read the log (`gh run view --log-failed`) and fix on the branch before continuing.

---

### Task 2: Dependency updates (patch/minor) and vulnerability fix

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:** Produces: `npm audit` clean; same major versions as today.

Policy: apply every in-range update and every audit fix that does not cross a major. Majors are listed for the owner to decide; this plan does **not** upgrade them (React 19, Vite 8, TypeScript 7, motion 14, lucide-react 1.x, react-router 8 each carry breaking changes and need their own PR).

- [ ] **Step 1: Apply in-range updates**

Run: `cd ~/SUPERCELL-STATS && npm update 2>&1 | tail -5 && npm outdated | awk 'NR==1 || $2!=$4'`
Expected: remaining rows are only the major bumps (React 19, Vite 8, TS 7, motion 14, lucide 1.x, react-router 8, @types/*).

- [ ] **Step 2: Fix audit findings**

Run: `npm audit fix 2>&1 | tail -5 && npm audit`
Expected: `found 0 vulnerabilities`. If anything remains that needs `--force` (major), stop and report it instead of forcing.

- [ ] **Step 3: Verify nothing regressed**

Run: `npm run typecheck && npm run build`
Expected: green; chunk sizes within ~5% of before (entry chunk ~12 KB, `react` ~227 KB).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): apply in-range updates and fix npm audit findings

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Unit tests for the data layer (the bugs already fixed once)

**Files:**
- Modify: `src/app/services/supercellService.ts` (add `export` to `toBattleLog`, `displayCardLevel`, `bsOutcome`)
- Modify: `vite.config.ts` (add `test` block), `package.json` (script `test`, dev dep `vitest`)
- Create: `src/app/services/__tests__/supercellService.test.ts`

**Interfaces:**
- Consumes: `normalizeTag(tag: string): string`, `isValidTag(tag: string): boolean` (already exported); `toBattleLog(raw: any): { battles: any[]; failed: boolean }`, `displayCardLevel(c: any): number`, `bsOutcome(b: any): 'win' | 'loss' | 'draw' | undefined` (to be exported).
- Produces: `npm run test`.

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest`
Expected: added to devDependencies.

- [ ] **Step 2: Write the failing tests**

```ts
// src/app/services/__tests__/supercellService.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeTag, isValidTag, toBattleLog, displayCardLevel, bsOutcome,
} from '../supercellService';

describe('tags', () => {
  it('normalizes case, whitespace, leading # and the O/0 typo', () => {
    expect(normalizeTag('  #o2pp ')).toBe('#02PP');
    expect(normalizeTag('2pp')).toBe('#2PP');
  });
  it('accepts valid tags', () => {
    expect(isValidTag('#2PP')).toBe(true);
    expect(isValidTag('PCQRQ0LQ')).toBe(true);
  });
  it('rejects too short, too long, and illegal characters', () => {
    expect(isValidTag('#2P')).toBe(false);
    expect(isValidTag('#' + '2'.repeat(15))).toBe(false);
    expect(isValidTag('#ABC')).toBe(false);
  });
});

describe('toBattleLog', () => {
  it('reads the bare array Clash Royale returns', () => {
    expect(toBattleLog([{}, {}])).toEqual({ battles: [{}, {}], failed: false });
  });
  it('reads the { items } wrapper Brawl Stars returns', () => {
    expect(toBattleLog({ items: [{}] })).toEqual({ battles: [{}], failed: false });
  });
  it('flags unusable payloads instead of pretending there were no battles', () => {
    expect(toBattleLog(null)).toEqual({ battles: [], failed: true });
    expect(toBattleLog({})).toEqual({ battles: [], failed: true });
  });
});

describe('displayCardLevel', () => {
  it('maps rarity-relative levels onto the unified 16 scale', () => {
    expect(displayCardLevel({ level: 14, maxLevel: 14 })).toBe(16);
    expect(displayCardLevel({ level: 8, maxLevel: 8 })).toBe(16);
    expect(displayCardLevel({ level: 1, maxLevel: 14 })).toBe(3);
  });
  it('never exceeds 16 and survives missing fields', () => {
    expect(displayCardLevel({ level: 20, maxLevel: 14 })).toBe(16);
    expect(displayCardLevel({})).toBe(3);
  });
});

describe('bsOutcome', () => {
  it('trusts an explicit result', () => {
    expect(bsOutcome({ battle: { result: 'victory' } })).toBe('win');
    expect(bsOutcome({ battle: { result: 'defeat' } })).toBe('loss');
    expect(bsOutcome({ battle: { result: 'draw' } })).toBe('draw');
  });
  it('falls back to the trophy delta, then to placement (Showdown)', () => {
    expect(bsOutcome({ battle: { trophyChange: 8 } })).toBe('win');
    expect(bsOutcome({ battle: { trophyChange: -5 } })).toBe('loss');
    expect(bsOutcome({ battle: { rank: 2, players: new Array(10).fill({}) } })).toBe('win');
    expect(bsOutcome({ battle: { rank: 8, players: new Array(10).fill({}) } })).toBe('loss');
    expect(bsOutcome({ battle: { rank: 1, teams: [[], []] } })).toBe('win');
    expect(bsOutcome({ battle: { rank: 2, teams: [[], []] } })).toBe('loss');
  });
  it('returns undefined when the outcome cannot be determined', () => {
    expect(bsOutcome({ battle: {} })).toBeUndefined();
    expect(bsOutcome(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run`
Expected: FAIL — `toBattleLog` / `displayCardLevel` / `bsOutcome` are not exported (import resolves to `undefined`).

- [ ] **Step 4: Export the helpers and configure Vitest**

In `src/app/services/supercellService.ts` change three declarations:
`function toBattleLog` → `export function toBattleLog`, `function displayCardLevel` → `export function displayCardLevel`, `function bsOutcome` → `export function bsOutcome`.

In `vite.config.ts` add the `test` key to the object passed to `defineConfig` (and change the first import to `import { defineConfig } from 'vitest/config';`):

```ts
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
```

In `package.json` scripts add `"test": "vitest run"`.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test && npm run typecheck`
Expected: all tests PASS. If a test fails because the implementation disagrees with the expectation, read the implementation first: fix the test only if the expectation was wrong, fix the code only if the code is wrong.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/services vite.config.ts package.json package-lock.json
git commit -m "test: cover tag handling, battle log shape, card level and BS outcome

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Lint

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json`

**Interfaces:** Produces: `npm run lint` exits 0 on the whole tree.

- [ ] **Step 1: Install**

Run: `npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals`

- [ ] **Step 2: Config**

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'scripts', 'e2e'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The API payloads are untyped JSON; `any` is confined to the service layer.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
```

Add script `"lint": "eslint ."`.

- [ ] **Step 3: Run and fix**

Run: `npm run lint`
Expected: either clean or a list of findings. Fix every `error` (real bugs first: `react-hooks/exhaustive-deps` and `rules-of-hooks` findings in `GamePage.tsx`/`Home.tsx` can be genuine stale-closure bugs — read each one, do not blanket-disable). A rule may be turned off only with a one-line comment explaining why.

- [ ] **Step 4: Verify and commit**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all green.

```bash
git add -A eslint.config.js package.json package-lock.json src
git commit -m "chore: add ESLint (typescript-eslint + react-hooks) and fix findings

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Browser smoke test that fails on any runtime error

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `npm run preview` (serves `dist/`, proxies `/api` to the deployed origin — see `vite.config.ts` `preview.proxy`).
- Produces: `npm run e2e`; honours `E2E_BASE_URL` (to run the same suite against production) and optional `E2E_CR_TAG`, `E2E_BS_TAG`, `E2E_COC_TAG` (real player tags, never committed).

- [ ] **Step 1: Install**

Run: `npm i -D @playwright/test && npx playwright install --with-deps chromium`
Expected: Chromium downloaded. (Needs `sudo` for `--with-deps` system libraries; if not available, run `npx playwright install chromium` and note it.)

- [ ] **Step 2: Config**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

const base = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  use: { baseURL: base ?? 'http://127.0.0.1:4173' },
  webServer: base
    ? undefined
    : { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
```

- [ ] **Step 3: Write the tests**

```ts
// e2e/smoke.spec.ts
import { test, expect, type Page } from '@playwright/test';

// Any of these during a page visit is a bug: uncaught exception, console error
// (this includes CSP violations), or a failed network request.
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 500) problems.push(`http ${r.status()}: ${r.url()}`);
  });
  return problems;
}

for (const path of ['/', '/game/clash-royale', '/game/brawl-stars', '/game/clash-of-clans']) {
  test(`${path} loads with no runtime errors`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('h1').first()).toBeVisible();
    expect(problems).toEqual([]);
  });
}

test('an invalid tag shows a friendly error, not a crash', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/game/clash-royale/player/ABC', { waitUntil: 'networkidle' });
  await expect(page.getByText(/invalid tag/i)).toBeVisible();
  expect(problems).toEqual([]);
});

test('an unknown URL renders the not-found page', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  await expect(page.getByText(/not found|404/i).first()).toBeVisible();
});

const real: Array<[string, string | undefined]> = [
  ['clash-royale', process.env.E2E_CR_TAG],
  ['brawl-stars', process.env.E2E_BS_TAG],
  ['clash-of-clans', process.env.E2E_COC_TAG],
];
for (const [game, tag] of real) {
  test(`${game}: a real player renders`, async ({ page }) => {
    test.skip(!tag, `set E2E_${game === 'clash-royale' ? 'CR' : game === 'brawl-stars' ? 'BS' : 'COC'}_TAG`);
    const problems = watch(page);
    await page.goto(`/game/${game}/player/${encodeURIComponent('#' + tag!.replace(/^#/, ''))}`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/trophies/i).first()).toBeVisible({ timeout: 15000 });
    expect(problems).toEqual([]);
  });
}
```

Add script `"e2e": "playwright test"`. Add `test-results/` and `playwright-report/` to `.gitignore`.

- [ ] **Step 4: Run**

Run: `npm run build && npm run e2e`
Expected: PASS for the 4 page loads, the invalid tag and the unknown-URL tests; real-player tests SKIPPED unless tags are exported. Any failure is a real finding: reproduce with `npx playwright test --headed --debug` (or read the `problems` array in the output), fix the app, re-run. Do not weaken an assertion to get green.

- [ ] **Step 5: Run with real tags**

Ask the owner for one valid tag per game (they are public player tags, not secrets), then:
`E2E_CR_TAG=<tag> E2E_BS_TAG=<tag> E2E_COC_TAG=<tag> npm run e2e`
Expected: all green, no skips. This is the check that the live API path (proxy → Supercell) and the parsing of real payloads work end-to-end.

- [ ] **Step 6: Commit**

```bash
git add -A playwright.config.ts e2e package.json package-lock.json .gitignore
git commit -m "test(e2e): Playwright smoke test failing on any console/page/network error

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: CI runs everything + automatic dependency PRs

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

- [ ] **Step 1: CI steps**

In `ci.yml`, after `Typecheck` add:

```yaml
      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm test
```

After `Build` add:

```yaml
      - name: Install browser
        run: npx playwright install --with-deps chromium

      - name: E2E smoke
        run: npm run e2e
```
(The e2e job uses `vite preview`, whose `/api` proxy points at the live site, so real-player tests stay skipped in CI — no tags or keys are needed there.)

- [ ] **Step 2: Dependabot**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: monthly }
```

- [ ] **Step 3: Verify**

Run: `git add -A .github && git commit -m "ci: run lint, unit tests and e2e; add dependabot

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" && git push && gh pr checks --watch`
Expected: all CI steps green on the PR.

---

### Task 7: Production HTTP behaviour (headers, real 404, prerendered shells)

**Files:**
- Create: `~/crowdsec/10-supercellstats-caddy.sh` (root apply script, lives next to the other server scripts, not in the repo)
- Modify: `DEPLOY.md` (document the behaviour)

**Interfaces:**
- Consumes: the existing `supercellstats.com { … }` block in `/etc/caddy/Caddyfile` — its three `handle_path /api/...` blocks (which contain the injected Authorization headers) must stay byte-for-byte untouched.
- Produces: unknown paths → real HTTP 404 serving the SPA shell (so the React `NotFound` still renders); `/game/<id>` served from its prerendered shell; security headers; long-cache for hashed assets.

Target final shape of the last part of the block (only the parts below the `/api` handlers change):

```caddyfile
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options DENY
		-Server
		Strict-Transport-Security "max-age=31536000"
		Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()"
		Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://cdn.brawlify.com https://cdn-old.brawlify.com https://api-assets.clashroyale.com https://royaleapi.github.io; connect-src 'self'; manifest-src 'self'; worker-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
	}

	handle /assets/* {
		header Cache-Control "public, max-age=31536000, immutable"
		file_server { root /home/nixo/apps/supercellstats/dist }
	}

	@spa path / /game/clash-royale /game/brawl-stars /game/clash-of-clans
	handle @spa {
		header Cache-Control "public, max-age=0, s-maxage=300, must-revalidate"
		root * /home/nixo/apps/supercellstats/dist
		try_files {path} {path}/index.html /index.html
		file_server
	}

	handle /game/*/player/* {
		header Cache-Control "public, max-age=0, must-revalidate"
		root * /home/nixo/apps/supercellstats/dist
		rewrite * /index.html
		file_server
	}

	handle {
		root * /home/nixo/apps/supercellstats/dist
		try_files {path}
		file_server
	}

	handle_errors {
		root * /home/nixo/apps/supercellstats/dist
		rewrite * /index.html
		file_server { status {err.status_code} }
	}
```

The CSP above is derived from the origin list measured in the header of this plan; `script-src 'self'` (no `unsafe-inline`) is valid only if `dist/index.html` has no inline script — Step 1 verifies that before anything is applied.

- [ ] **Step 1: Verify the CSP assumptions against the real build**

Run:
```bash
cd ~/SUPERCELL-STATS && npm run build >/dev/null
grep -c '<script>' dist/index.html dist/game/*/index.html          # expect 0 each: no inline scripts
grep -rhoE 'https?://[a-zA-Z0-9./_-]+' dist --include=*.html --include=*.css --include=*.js | sed -E 's#(https?://[^/]+).*#\1#' | sort -u
```
Expected: `0` inline scripts; the origin list contains nothing beyond the six in the CSP (plus `supercellstats.com`, `www.supercell.com` which are links, not fetches). If an inline script exists or an origin is missing, update the CSP in this plan and the script before applying.

- [ ] **Step 2: Write the apply script**

```bash
#!/usr/bin/env bash
# supercellstats.com: security headers, immutable asset cache, real 404, prerendered shells.
# Touches only the lines after the last handle_path /api/... block. Rollback on error.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Esegui con sudo"; exit 1; }
CF=/etc/caddy/Caddyfile; BAK=$CF.bak-presupercell-$(date +%Y%m%d-%H%M%S)
cp -a $CF $BAK
python3 - <<'PY'
import re
p='/etc/caddy/Caddyfile'; s=open(p).read()
m=re.search(r'\nsupercellstats\.com \{\n(?:(?:\t[^\n]*|)\n)*?\}\n', s)
assert m, "blocco supercellstats.com non trovato"
blk=m.group(0)
assert blk.count('handle_path /api/')==3, "attesi 3 handler /api"
# keep everything up to and including the 3rd /api handler, replace the rest
idx=[x.start() for x in re.finditer(r'\thandle_path /api/', blk)]
tail_start=blk.index('\n\thandle {\n', idx[-1])
head=blk[:tail_start+1]
new_tail=open('/home/nixo/SUPERCELL-STATS/docs/caddy-tail.caddy').read()
open(p+'.new','w').write(s[:m.start()]+head+new_tail+'}\n'+s[m.end():])
PY
chown root:root $CF.new; chmod 644 $CF.new
rollback(){ echo ROLLBACK; cp -a $BAK $CF; rm -f $CF.new; systemctl restart caddy; exit 1; }
sudo -u caddy env $(cat /etc/caddy/crowdsec.env) caddy validate --config $CF.new --adapter caddyfile 2>&1 | grep -q 'Valid configuration' || rollback
mv $CF.new $CF; systemctl reload caddy || rollback; sleep 3
R=(-sk --resolve supercellstats.com:443:127.0.0.1); c(){ curl "${R[@]}" -o /dev/null -w '%{http_code}' "$@"; }
[ "$(c https://supercellstats.com/)" = 200 ]                       || { echo "/ != 200"; rollback; }
[ "$(c https://supercellstats.com/game/clash-royale)" = 200 ]      || { echo "game != 200"; rollback; }
[ "$(c https://supercellstats.com/game/clash-royale/player/%232PP)" = 200 ] || { echo "player route != 200"; rollback; }
[ "$(c https://supercellstats.com/nope)" = 404 ]                   || { echo "unknown != 404"; rollback; }
curl "${R[@]}" -I https://supercellstats.com/ | grep -qi '^content-security-policy' || { echo "CSP assente"; rollback; }
[ "$(c https://supercellstats.com/api/brawl-stars/players/%232PP)" = 200 ] || { echo "API proxy rotto"; rollback; }
echo "OK. backup: $BAK"
```
(Before running it, save the "target final shape" Caddy snippet above — from `header {` to the closing `handle_errors` — as `docs/caddy-tail.caddy` in the repo, so the script and the documentation cannot drift apart. The script re-attaches the `}` that closes the vhost.)

- [ ] **Step 3: Dry-run the text transformation without root**

Run: `python3 - <<'PY'` with the same regex logic, reading `/etc/caddy/Caddyfile` (world-readable) and printing, for the new block, the line count and `new.count('{')==new.count('}')`; confirm the three `handle_path /api/` blocks are unchanged by comparing them with the original (mask `Bearer` values before printing anything).
Expected: balanced braces, three API handlers identical, exactly one `supercellstats.com` block.

- [ ] **Step 4: Owner applies it**

Owner runs: `sudo bash ~/crowdsec/10-supercellstats-caddy.sh`
Expected: `OK. backup: …`. On any failed check the script rolls back by itself and says which check failed.

- [ ] **Step 5: Run the e2e suite against production**

Run: `E2E_BASE_URL=https://supercellstats.com npm run e2e`
Expected: green. This is the CSP verification: a blocked image/font/script shows up as a `console:` problem and fails the test. If it fails, add the missing origin to `docs/caddy-tail.caddy`, re-run the apply script.

- [ ] **Step 6: Document and commit**

Add to `DEPLOY.md` a "HTTP behaviour" section: which routes are served, that unknown URLs return 404 with the SPA shell, the CSP origin list and where to add a new CDN, and the rollback command (`sudo cp /etc/caddy/Caddyfile.bak-presupercell-* /etc/caddy/Caddyfile && sudo systemctl reload caddy`).

```bash
git add DEPLOY.md docs/caddy-tail.caddy
git commit -m "docs: production HTTP behaviour, CSP origins, rollback

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Quality audit (Lighthouse) with a numeric target

**Files:** whatever the findings require.

- [ ] **Step 1: Measure**

Run (against production after Task 7, mobile profile default):
```bash
for p in / /game/clash-royale /game/brawl-stars /game/clash-of-clans; do
  npx lighthouse "https://supercellstats.com$p" --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,best-practices,seo --output=json --quiet \
    | python3 -c "import json,sys;d=json.load(sys.stdin)['categories'];print('$p',{k:round(v['score']*100) for k,v in d.items()})"
done
```
Expected: a score per category per page.

- [ ] **Step 2: Fix until the target is met**

Target: Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95, Performance ≥ 90 on every page. For each failing audit, take the audit id and the offending elements from the full JSON report (`--output-path`), fix in `src/`, `index.html` or `public/`, rebuild, re-measure. Typical suspects given what exists: missing `mobile-web-app-capable` meta (Chrome warns about the deprecated `apple-mobile-web-app-capable`; add `<meta name="mobile-web-app-capable" content="yes">` next to it), image dimensions/`alt`, colour contrast on the stat cards, tap-target size. One commit per fixed concern. If a target cannot be met without a disproportionate change, record the exact score and reason in the PR description instead of silently lowering the bar.

- [ ] **Step 3: Re-run the full local gate and push**

Run: `npm run lint && npm run typecheck && npm run test && npm run build && npm run e2e && git push`
Expected: all green; CI green on the PR.

---

### Task 9: Merge (owner) and deploy

**Files:** none.

- [ ] **Step 1: Owner reviews and merges the PR on GitHub.** (Not done by the agent — see Global Constraints.)

- [ ] **Step 2: Deploy from `main`**

Run: `cd ~/apps/supercellstats && ./scripts/deploy.sh origin/main`
Expected: it fetches, `npm ci`, builds into a scratch dir, swaps `dist`, keeps `dist.previous`, writes `dist/VERSION`. If it refuses because the working tree is dirty, stop and show `git status --short`; do not discard anything without asking.

- [ ] **Step 3: Verify production**

Run:
```bash
cat ~/apps/supercellstats/dist/VERSION
E2E_BASE_URL=https://supercellstats.com E2E_CR_TAG=<tag> E2E_BS_TAG=<tag> E2E_COC_TAG=<tag> npm run e2e
for p in / /game/clash-royale /nope; do curl -s -o /dev/null -w "$p %{http_code}\n" https://supercellstats.com$p; done
```
Expected: VERSION equals the merge commit, e2e all green with no skips, `/ 200`, `/game/clash-royale 200`, `/nope 404`.

- [ ] **Step 4: Rollback if anything is wrong**

Run: `cd ~/apps/supercellstats && ./scripts/deploy.sh --rollback`
Expected: `rolled back to <previous version>`. Then fix on a branch; never patch `dist/` by hand.

---

### Task 10: Keep it correct afterwards

**Files:** none in the repo.

- [ ] **Step 1:** Add an Uptime Kuma monitor (`uptime-kuma` container on this server) for `https://supercellstats.com/` (keyword = `Supercell`) and for `https://supercellstats.com/api/brawl-stars/players/%232PP` (HTTP 200) — the second one is the early warning if RoyaleAPI changes its fixed IP or a key expires.
- [ ] **Step 2:** Update the memory note `supercell-stats` (PR #17 merged, deploy state, new gates) and mention the e2e command with tags.
- [ ] **Step 3:** Majors decision, one PR each, in this order of risk: `motion` 14 and `lucide-react` 1.x (UI libraries, visual check), `react-router` 8, `vite` 8 + `@vitejs/plugin-react` 6, React 19 (+ `@types/react*`), TypeScript 7. Each: bump, `npm run lint && npm run typecheck && npm run test && npm run build && npm run e2e`, fix, PR.

---

## Self-Review

- **Spec coverage:** "latest updates" → Tasks 1, 2, 9 (code on prod, deps current, majors queued in Task 10); "completely functional" → Tasks 3, 5 (real-player e2e through the live proxy), 7 (API proxy kept and checked); "without the slightest error" → Task 5 `watch()` fails on any console/page/network error incl. CSP violations, Task 4 lint, Task 8 numeric targets; protection against regressions → Tasks 4–6.
- **Placeholder scan:** real tags are intentionally supplied at run time (`<tag>`), by design, never committed. Task 8 Step 2 names concrete suspects and acceptance numbers, but the exact fixes depend on measured output, which cannot be known before measuring.
- **Type/name consistency:** exported helper names and signatures in Task 3 match `supercellService.ts` as read on 2026-10-06 (`toBattleLog`, `displayCardLevel`, `bsOutcome`, `normalizeTag`, `isValidTag`); script names (`test`, `lint`, `e2e`) are used identically in Tasks 3–9; `docs/caddy-tail.caddy` is created in Task 7 Step 2 before the script reads it.
