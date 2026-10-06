import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';
import type { Page } from '@playwright/test';

/** Scroll to the bottom once the game module has replaced its skeleton (before that the page is short). */
async function scrollToBottom(page: Page) {
  await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    test('header and tabs stay on screen and the header condenses the player after the hero', async ({ page }) => {
      await mockApi(page);
      await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Kitebreaker' })).toBeVisible();
      await expect(page.getByTestId('player-summary-compact')).toHaveCount(0);

      await scrollToBottom(page);
      const compact = page.getByTestId('player-summary-compact');
      await expect(compact).toBeVisible();
      await expect(compact).toContainText('Kitebreaker');
      await expect(compact).toContainText('41,234');

      expect((await page.locator('header').boundingBox())!.y).toBe(0);
      const tabs = (await page.getByRole('tablist').boundingBox())!;
      expect(Math.round(tabs.y)).toBe(56);
      await expectNoHorizontalScroll(page);

      if (viewport.width < 640) {
        // On phones the switcher gives its room to the condensed player.
        await expect(page.getByRole('navigation', { name: 'Switch game' })).toBeHidden();
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(compact).toHaveCount(0);
    });

    test('switching tab while scrolled keeps the tab strip in place', async ({ page }) => {
      await mockApi(page);
      await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Vela Storm' })).toBeVisible();
      await scrollToBottom(page);
      await expect(page.getByTestId('player-summary-compact')).toBeVisible();
      await page.getByRole('tab', { name: 'Battles' }).click();
      await expect(page.getByRole('tab', { name: 'Battles' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tab', { name: 'Battles' })).toBeInViewport();
    });
  });
}
