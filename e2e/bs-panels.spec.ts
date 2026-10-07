import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const bs = (search = '') => `/game/brawl-stars/player/${FIXTURE_TAG}${search}`;
const panel = (page: Page) => page.getByRole('tabpanel');

test.describe('Overview tab', () => {
  test('starts with numbers the summary bar does not show, without emoji or repeated identity', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(bs());
    const p = panel(page);
    await expect(p.getByText('Win rate', { exact: true })).toBeVisible();
    await expect(p.getByText('5 W / 3 L, recent battles')).toBeVisible();
    await expect(p.getByText('21,466', { exact: true })).toBeVisible();
    await expect(p.getByText('42,010', { exact: true })).toBeVisible();
    await expect(p.getByText('of 95 in the game')).toBeVisible();
    await expect(p.getByText('Best trophies')).toBeVisible();
    // The hero already shows name and current trophies; the W/L ratio repeated the win rate.
    await expect(p.getByText('W/L Ratio')).toHaveCount(0);
    await expect(p.getByText('Kitebreaker')).toHaveCount(0);
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('account card keeps prestige, experience, Ranked and Robo Rumble', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs());
    const account = panel(page).locator('section').filter({ has: page.getByRole('heading', { name: 'Account' }) });
    await expect(account.getByText('Total prestige')).toBeVisible();
    await expect(account.getByText('14', { exact: true })).toBeVisible();
    await expect(account.getByText('250,000')).toBeVisible();
    await expect(account.getByText('Gold II · 2,196 Elo')).toBeVisible();
    await expect(account.getByText('Masters III')).toBeVisible();
    await expect(account.getByText('2m 5s')).toBeVisible();
  });

  test('top brawlers are ranked by trophies with plain names, and "All brawlers" opens the tab', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs());
    const top = panel(page).getByTestId('top-brawler');
    await expect(top).toHaveCount(3);
    await expect(top.nth(0)).toContainText('1st');
    await expect(top.nth(0)).toContainText('Shelly');
    await expect(top.nth(0)).toContainText('1,210');
    await expect(top.nth(1)).toContainText('8-Bit');
    await expect(top.nth(2)).toContainText('Colt');
    await panel(page).getByRole('button', { name: 'All brawlers' }).click();
    await expect(page).toHaveURL(bs('?tab=brawlers'));
  });

  test('victories by mode use one colour with numbers and shares', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs());
    const card = panel(page).locator('section').filter({ has: page.getByRole('heading', { name: 'Victories by mode' }) });
    await expect(card.getByRole('listitem')).toHaveCount(3);
    await expect(card.getByRole('listitem').nth(0)).toContainText('18,234 · 85%');
    await expect(card.getByRole('listitem').nth(1)).toContainText('1,022 · 5%');
    await expect(card.getByRole('listitem').nth(2)).toContainText('2,210 · 10%');
  });

  test('a player without decided battles shows a dash, not 0%', async ({ page }) => {
    await mockApi(page, { battlelog: { 'brawl-stars': { items: [] } } });
    await page.goto(bs());
    await expect(panel(page).getByText('No recent wins or losses')).toBeVisible();
  });
});

// Every BS tab that shows game art, with the number of art slots the fixture fills.
const ART_TABS: Array<[string, number]> = [
  ['overview', 3],
];
for (const [tab, slots] of ART_TABS) {
  test(`${tab}: missing game art falls back in place without errors`, async ({ page }) => {
    const problems = watch(page);
    await mockApi(page, { brokenArt: /./ });
    await page.goto(bs(`?tab=${tab}`));
    await expect(panel(page).getByTestId('game-image-fallback')).toHaveCount(slots);
    // Only third-party art falls back; our own tier icons (/images/bs/) still load.
    await expect(panel(page).locator('img[src^="https:"]')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
