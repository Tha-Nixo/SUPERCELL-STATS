import { test, expect, type Page } from '@playwright/test';

// Any of these during a page visit is a bug: uncaught exception, console error
// (this includes CSP violations), or a failed network request.
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  // Third-party game-asset images (arena/card art) can legitimately 404 for new
  // content; the app has onError fallbacks for them, so they are not app bugs.
  // Every other failed request (scripts, styles, fetch/XHR, documents) still counts.
  page.on('requestfailed', (r) => {
    if (r.resourceType() === 'image') return;
    problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`);
  });
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
  await expect(page.getByText(/^invalid tag/i)).toBeVisible();
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
    await page.goto(`/game/${game}/player/${encodeURIComponent(tag!.replace(/^#/, ''))}`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/trophies/i).first()).toBeVisible({ timeout: 15000 });
    expect(problems).toEqual([]);
  });
}
