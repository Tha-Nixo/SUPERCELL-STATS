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

// Every Clash Royale, Brawl Stars and Clash of Clans tab, filtered Battles views included.
const PAGES = [
  ...['', '?tab=cards', '?tab=deck', '?tab=battles', '?tab=battles&result=loss&mode=ladder', '?tab=towers'].map((search) => ({ game: 'clash-royale', search })),
  ...['', '?tab=brawlers', '?tab=progression', '?tab=battles', '?tab=battles&mode=solo-showdown&result=loss', '?tab=club'].map((search) => ({ game: 'brawl-stars', search })),
  ...['', '?tab=army', '?tab=heroes', '?tab=achievements'].map((search) => ({ game: 'clash-of-clans', search })),
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
  'clash-of-clans': ['Army', 'Heroes and equipment', 'Achievements', 'Overview'],
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

test('a battle whose map name is one 80-character word never overflows a 320px screen', async ({ page }) => {
  const map = 'M'.repeat(80);
  const log = {
    items: [
      { battleTime: '20261006T095500.000Z', event: { id: 1, mode: 'gemGrab', map }, battle: { mode: 'gemGrab', type: 'ranked', result: 'victory', duration: 121, trophyChange: 8 } },
    ],
  };
  await mockApi(page, { battlelog: { 'brawl-stars': log } });
  await recordOverflow(page);
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}?tab=battles`);
  await expect(page.getByTestId('battle-row')).toHaveCount(1);
  await page.waitForTimeout(500);
  expect(await maxOverflow(page)).toBe(0);
});

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
