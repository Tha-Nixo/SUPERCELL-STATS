import { test, expect } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';

test('the page background comes from the --bg token', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  const colors = await page.evaluate(() => ({
    body: getComputedStyle(document.body).backgroundColor,
    token: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase(),
  }));
  expect(colors).toEqual({ body: 'rgb(11, 15, 26)', token: '#0b0f1a' });
});

test('the 404 page uses the shared empty state, no emoji, 44px action', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expectNoEmoji(page.locator('main'));
  await expectTouchTargets(page.getByRole('link', { name: 'Back to all games' }));
  await expectNoHorizontalScroll(page);
  await page.getByRole('link', { name: 'Back to all games' }).click();
  await expect(page).toHaveURL('/');
  expect(problems).toEqual([]);
});
