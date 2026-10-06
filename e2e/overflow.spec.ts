import { test, expect } from '@playwright/test';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

/**
 * Records, frame by frame from navigation start, how far the page is wider
 * than the viewport. A settled-page check misses a one-frame overflow.
 */
test.use({ viewport: { width: 320, height: 640 } });

for (const game of ['clash-royale', 'brawl-stars'] as const) {
  test(`${game}: no frame of the load overflows a 320px screen`, async ({ page }) => {
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
    await page.goto(`/game/${game}/player/${FIXTURE_TAG}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as unknown as { __maxOverflow: number }).__maxOverflow)).toBe(0);
  });
}
