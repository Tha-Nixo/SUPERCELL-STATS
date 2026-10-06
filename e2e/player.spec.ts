import { test, expect, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { FIXTURE_TAG, deferred, mockApi } from './support/mockApi';

const GAMES = [
  { id: 'clash-royale', player: 'Vela Storm', module: (page: Page) => page.getByRole('button', { name: 'All battles' }) },
  { id: 'brawl-stars', player: 'Kitebreaker', module: (page: Page) => page.getByRole('button', { name: 'All battles' }) },
  { id: 'clash-of-clans', player: 'Harrow Keep', module: (page: Page) => page.getByRole('tabpanel').getByRole('heading').nth(1) },
] as const;

for (const { id, player, module } of GAMES) {
  test(`${id}: a player page renders the shell and its game module`, async ({ page }) => {
    const problems = watch(page);
    const calls = await mockApi(page);
    await page.goto(`/game/${id}/player/${FIXTURE_TAG}`);
    await expect(page.getByRole('heading', { level: 1, name: player })).toBeVisible();
    await expect(page.getByTestId('player-summary').getByText(`#${FIXTURE_TAG}`)).toBeVisible();
    await expect(page.getByText(/trophies/i).first()).toBeVisible();
    await expect(page.locator(`[data-game="${id}"]`).first()).toBeVisible();
    // Content that only the lazily loaded game module renders, with every skeleton gone.
    await expect(module(page)).toBeVisible();
    await expect(page.getByTestId('player-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
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

test('a failed game-module download keeps the header and search and offers a reload', async ({ page }) => {
  await mockApi(page);
  await page.route(/\/assets\/ClashRoyale-.*\.js/, (route) => route.abort());
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  const error = page.getByTestId('error-state');
  await expect(error.getByText('Could not load this section')).toBeVisible();
  await expect(error.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Vela Storm' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Switch game' })).toBeVisible();
  await expect(page.getByLabel('Player tag')).toBeVisible();
  await expect(page.getByText('Something broke on this page')).toHaveCount(0);
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

  test('the search toggle manages focus: input on open, toggle on Escape and after a search', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
    const toggle = page.getByRole('button', { name: 'Search a player' });
    await toggle.click();
    await expect(page.getByLabel('Player tag')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Close search' })).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Player tag')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Search a player' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Search a player' })).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('button', { name: 'Search a player' }).click();
    await page.getByLabel('Player tag').fill('#2PP');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/game/clash-royale/player/2PP');
    await expect(page.getByLabel('Player tag')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Search a player' })).toBeFocused();
  });
});

test('a lone encoded # in the URL is the game landing, not a stuck search', async ({ page }) => {
  await mockApi(page);
  await page.goto('/game/clash-royale/player/%23');
  await expect(page.getByRole('heading', { level: 1, name: 'Clash Royale' })).toBeVisible();
  await expect(page.getByRole('status')).not.toHaveText('Searching…');
  await expect(page.getByTestId('player-skeleton')).toHaveCount(0);
});

test('an unknown game with a player renders the shared 404 page', async ({ page }) => {
  await mockApi(page);
  await page.goto('/game/foo/player/2PP');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const { id, player, module } of GAMES) {
    test(`${id}: no sideways scroll, 44px header and summary controls`, async ({ page }) => {
      await mockApi(page);
      await page.goto(`/game/${id}/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1, name: player })).toBeVisible();
      // Measure the settled page, not the lazy module's loading frame.
      await expect(module(page)).toBeVisible();
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page.locator('header').locator('a, button'));
      await expectTouchTargets(page.getByTestId('player-summary').locator('a, button'));
    });
  }
});
