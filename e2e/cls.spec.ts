import { test, expect } from '@playwright/test';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

// Spec performance budget: production CLS <= 0.05. The footer used to sit at the
// bottom of the short skeleton page and get pushed below the fold on arrival.
const BUDGET = 0.05;
const GAMES = ['clash-royale', 'brawl-stars'];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const game of GAMES) {
    test(`${game} player page shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
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

      await page.goto(`/game/${game}/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await page.waitForTimeout(1500);

      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
    });
  }
}
