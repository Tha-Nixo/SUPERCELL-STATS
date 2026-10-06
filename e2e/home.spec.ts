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

test('a tag with valid characters but the wrong length gets a length message', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('Brawl Stars player tag');
  await input.fill('#2P');
  await input.press('Enter');
  await expect(page.getByText('Player tags are 3 to 14 characters.')).toBeVisible();
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
  const first = row.getByRole('link').first();
  await expect(first).toHaveAttribute('href', '/game/brawl-stars/player/PYLQGRJC');
  await expect(first).toHaveAttribute('aria-label', 'Brawl Stars: Kitebreaker, 41,234 trophies');
  await expect(first).toHaveAttribute('title', 'Kitebreaker');
});

test('corrupt recent-search storage does not break the home page', async ({ page }) => {
  const problems = watch(page);
  const key = 'supercell_recent_searches';
  for (const raw of ['null', '{}', '"x"', 'not json {', '[null,{"gameId":"brawl-stars","username":"x","trophies":1,"timestamp":1}]']) {
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [key, raw]);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const name of ['Clash Royale', 'Brawl Stars', 'Clash of Clans']) {
      await expect(page.getByRole('link', { name })).toBeVisible();
    }
    await expect(page.getByRole('region', { name: 'Recent searches' })).toHaveCount(0);
  }
  expect(problems).toEqual([]);
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('nothing scrolls sideways and every control is 44px tall', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page.locator('main').locator('a, button, input'));
  });
});
