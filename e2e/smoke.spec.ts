import { test, expect } from '@playwright/test';
import { watch } from './support/helpers';

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

test('a percent-encoded # in the player URL is treated like the bare tag', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/game/clash-royale/player/%23ABC', { waitUntil: 'networkidle' });
  await expect(page.getByText(/^invalid tag/i)).toBeVisible();
  await expect(page.getByLabel('Player tag')).toHaveValue('#ABC');
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

  test(`${game}: a real player renders from a percent-encoded # URL`, async ({ page }) => {
    test.skip(!tag, `set E2E_${game === 'clash-royale' ? 'CR' : game === 'brawl-stars' ? 'BS' : 'COC'}_TAG`);
    const problems = watch(page);
    const bare = tag!.replace(/^#/, '');
    await page.goto(`/game/${game}/player/%23${encodeURIComponent(bare)}`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/trophies/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Player tag')).toHaveValue(`#${bare.toUpperCase()}`);
    expect(problems).toEqual([]);
  });
}
