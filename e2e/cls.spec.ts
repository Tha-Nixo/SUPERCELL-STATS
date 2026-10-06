import { test, expect } from '@playwright/test';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

// Spec performance budget: production CLS <= 0.05. The footer used to sit at the
// bottom of the short skeleton page and get pushed below the fold on arrival.
const BUDGET = 0.05;
const PAGES = [
  ...['', '?tab=cards', '?tab=deck', '?tab=battles', '?tab=towers'].map((search) => ({ game: 'clash-royale', search })),
  { game: 'brawl-stars', search: '' },
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const { game, search } of PAGES) {
    test(`${game}${search} player page shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
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

      await page.goto(`/game/${game}/player/${FIXTURE_TAG}${search}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await page.waitForTimeout(1500);

      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
    });
  }
}

// Applying a Battles filter must not move the filter card or add layout shift.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  test(`filtering battles shifts nothing at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockApi(page);
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number }[]) w.__cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}?tab=battles`);
    await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
    await page.waitForTimeout(800);
    const group = page.getByRole('tabpanel').locator('fieldset').first();
    const before = await group.boundingBox();
    const clsBefore = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    await page.getByRole('tabpanel').locator('label').filter({ hasText: /^Losses\s*\d+$/ }).click();
    await page.waitForTimeout(500);
    const after = await group.boundingBox();
    expect(after).toEqual(before);
    const clsAfter = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(clsAfter - clsBefore).toBeLessThanOrEqual(BUDGET);
  });
}
