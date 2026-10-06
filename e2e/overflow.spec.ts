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

// Switching tabs after load must not overflow in the frame after the switch, at any width.
for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`switching every Clash Royale tab never overflows at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
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
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const name of [/^Cards/, 'Deck', 'Battles', 'Tower troops', 'Overview']) {
      await page.getByRole('tab', { name }).click();
      await page.waitForTimeout(300);
    }
    expect(await page.evaluate(() => (window as unknown as { __maxOverflow: number }).__maxOverflow)).toBe(0);
  });
}
