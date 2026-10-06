import { test, expect } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const cr = (search = '') => `/game/clash-royale/player/${FIXTURE_TAG}${search}`;
const panel = (page: import('@playwright/test').Page) => page.getByRole('tabpanel');

test.describe('Tower troops tab', () => {
  test('lists every tower troop and marks the equipped one', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr('?tab=towers'));
    await expect(panel(page).getByTestId('tower-troop')).toHaveCount(3);
    const equipped = panel(page).getByTestId('tower-troop').filter({ hasText: 'Equipped' });
    await expect(equipped).toHaveCount(1);
    await expect(equipped).toContainText('Cannoneer');
    await expect(panel(page).getByText('Common · Level 16 (max)')).toBeVisible();
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('explains a player without tower troops', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-royale': { supportCards: [], currentDeckSupportCards: [] } } });
    await page.goto(cr('?tab=towers'));
    await expect(panel(page).getByTestId('empty-state').getByText('No tower troops to show')).toBeVisible();
  });
});
// Every CR tab that shows game art, with the number of art slots the fixture fills.
const ART_TABS: Array<[string, number]> = [
  ['towers', 3],
  ['deck', 10],
];
for (const [tab, slots] of ART_TABS) {
  test(`${tab}: missing game art falls back in place without errors`, async ({ page }) => {
    const problems = watch(page);
    await mockApi(page, { brokenArt: /./ });
    await page.goto(cr(`?tab=${tab}`));
    await expect(panel(page).getByTestId('game-image-fallback')).toHaveCount(slots);
    await expect(panel(page).locator('img')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}

test.describe('Deck tab', () => {
  test('shows the eight cards, the deck numbers, the tower troop and the favourite card', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr('?tab=deck'));
    await expect(panel(page).getByTestId('deck-card')).toHaveCount(8);
    await expect(panel(page).getByText('Average elixir')).toBeVisible();
    await expect(panel(page).getByText('3.1', { exact: true })).toBeVisible();
    await expect(panel(page).getByTestId('deck-card').filter({ hasText: 'Knight' }).getByText('Evolved')).toBeVisible();
    await expect(panel(page).getByRole('heading', { name: 'Tower troop' })).toBeVisible();
    await expect(panel(page).getByText('Cannoneer')).toBeVisible();
    await expect(panel(page).getByRole('heading', { name: 'Favourite card' })).toBeVisible();
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('explains a player without a current deck', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-royale': { currentDeck: [] } } });
    await page.goto(cr('?tab=deck'));
    await expect(panel(page).getByTestId('empty-state').getByText('No battle deck to show')).toBeVisible();
  });
});
