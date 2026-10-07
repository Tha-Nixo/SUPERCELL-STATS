import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, watch } from './support/helpers';
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

test.describe('Brawlers tab', () => {
  const cards = (page: Page) => panel(page).getByTestId('brawler-card');

  test('the tab shows unlocked / in game; each card keeps power, tier, trophies, streak, hypercharge and equipment', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(bs('?tab=brawlers'));
    await expect(page.getByRole('tab', { name: 'Brawlers 6 of 95' })).toHaveAttribute('aria-selected', 'true');
    await expect(cards(page)).toHaveCount(6);
    await expect(page.getByText('Showing 6 of 6 brawlers')).toBeVisible();
    const shelly = cards(page).first();
    await expect(shelly.getByRole('heading', { name: 'Shelly' })).toBeVisible();
    await expect(shelly).toContainText('Power 11 · Rank 5 · Prestige 1');
    await expect(shelly).toContainText('1,210');
    await expect(shelly).toContainText('Best 1,250');
    await expect(shelly).toContainText('Win streak 4');
    await expect(shelly).toContainText('Hypercharge');
    // Equipment names are text, not only icon titles: they survive art that fails and reach touch users.
    await expect(shelly.getByText('Fast Forward', { exact: true })).toBeVisible();
    await expect(shelly.getByText('Band-Aid', { exact: true })).toBeVisible();
    await expect(shelly.getByText('Shield', { exact: true })).toBeVisible();
    await expect(shelly.getByText('Gadgets 2')).toBeVisible();
    await expect(shelly.getByText('Star powers 2')).toBeVisible();
    await expect(shelly.getByText('Gears 2')).toBeVisible();
    // GLOWBERT is renamed by the data layer; El Primo owns nothing yet.
    await expect(cards(page).filter({ hasText: 'Glowy' })).toHaveCount(1);
    await expect(cards(page).filter({ hasText: 'El Primo' }).getByText('None yet')).toHaveCount(3);
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('search narrows the list; no match offers a reset that returns focus to the search box', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs('?tab=brawlers'));
    const search = panel(page).getByLabel('Search brawlers');
    await search.fill('el');
    await expect(cards(page)).toHaveCount(2);
    await search.fill('zzz');
    await expect(panel(page).getByTestId('empty-state').getByText('No brawlers match')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Clear search' }).click();
    await expect(cards(page)).toHaveCount(6);
    await expect(search).toBeFocused();
  });

  test('sort by name and by rarity', async ({ page }) => {
    await mockApi(page);
    await page.goto(bs('?tab=brawlers'));
    const sort = panel(page).getByLabel('Sort brawlers');
    await sort.selectOption({ label: 'Name' });
    await expect(cards(page).first().getByRole('heading')).toHaveText('8-Bit');
    await sort.selectOption({ label: 'Rarest first' });
    await expect(cards(page).first().getByRole('heading')).toHaveText('Mr. P');
    await sort.selectOption({ label: 'Fewest trophies' });
    await expect(cards(page).first().getByRole('heading')).toHaveText('Glowy');
  });

  test('below sm each brawler is a compact row with counts, and the names stay readable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await mockApi(page);
    await page.goto(bs('?tab=brawlers'));
    const shelly = cards(page).first();
    await expect(shelly.getByText('Gadgets 2')).toBeHidden();
    await expect(shelly.getByText('2 gadgets')).toBeAttached();
    await expect(shelly.getByText('3 gears')).toHaveCount(0);
    await expect(cards(page).nth(1).getByText('3 gears')).toBeAttached();
    await expect(shelly.getByText('4 win streak')).toBeAttached();
    await expect(shelly.getByText('Best 1,250').first()).toBeAttached();
    await expect(shelly).toContainText('Power 11 · Rank 5 · Prestige 1');
    for (let i = 0; i < 6; i++) expect((await cards(page).nth(i).boundingBox())?.height).toBeLessThan(95);
    await expectNoHorizontalScroll(page);
  });

  test('a player without brawlers gets an empty state', async ({ page }) => {
    await mockApi(page, { patch: { 'brawl-stars': { brawlers: [] } } });
    await page.goto(bs('?tab=brawlers'));
    await expect(panel(page).getByTestId('empty-state').getByText('No brawlers to show')).toBeVisible();
  });
});


// Every BS tab that shows game art, with the number of art slots the fixture fills.
const ART_TABS: Array<[string, number]> = [
  ['overview', 3],
  ['brawlers', 19], // 6 portraits, 4 gadgets, 4 star powers, 5 gears
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
