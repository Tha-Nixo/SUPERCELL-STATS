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
  ['cards', 8],
  ['towers', 3],
  ['deck', 10],
  ['overview', 9],
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

test.describe('Cards tab', () => {
  test('the tab shows found / in game, and search, rarity filter and the empty result work', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr('?tab=cards'));
    await expect(page.getByRole('tab', { name: 'Cards 8/121' })).toHaveAttribute('aria-selected', 'true');
    const cards = panel(page).getByTestId('collection-card');
    await expect(cards).toHaveCount(8);
    await expect(panel(page).getByRole('heading', { name: 'Collection (8)' })).toBeVisible();

    await panel(page).getByLabel('Search cards').fill('hog');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('Hog Rider');

    await panel(page).getByLabel('Search cards').fill('');
    await panel(page).getByLabel('Filter cards by rarity').selectOption('epic');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('Skeleton Army');

    await panel(page).getByLabel('Search cards').fill('zzz');
    await expect(panel(page).getByTestId('empty-state').getByText('No cards match')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Clear search and filter' }).click();
    await expect(cards).toHaveCount(8);
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });
});

test.describe('Overview tab', () => {
  test('starts with numbers the summary bar does not show, without repeating the player name', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(cr());
    const p = panel(page);
    await expect(p.getByText('Three-crown wins')).toBeVisible();
    await expect(p.getByText('1,530', { exact: true })).toBeVisible();
    await expect(p.getByText('Best trophies')).toBeVisible();
    await expect(p.getByText('9,301', { exact: true })).toBeVisible();
    // The hero already shows the name: the panel must not repeat it.
    await expect(p.getByText('Vela Storm')).toHaveCount(0);
    await expect(p.getByRole('heading', { name: 'Clan' })).toBeVisible();
    await expect(p.getByText('Elder', { exact: true })).toBeVisible();
    await expect(p.getByRole('heading', { name: 'Ranked seasons' })).toBeVisible();
    await expect(p.getByText('#1,520')).toBeVisible();
    await expect(p.getByText('Best season (2026-08)')).toBeVisible();
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('"View deck" opens the Deck tab', async ({ page }) => {
    await mockApi(page);
    await page.goto(cr());
    await panel(page).getByRole('button', { name: 'View deck' }).click();
    await expect(page).toHaveURL(cr('?tab=deck'));
  });

  test('hides the ranked seasons card when the player has no season data', async ({ page }) => {
    await mockApi(page, {
      patch: { 'clash-royale': { leagueStatistics: undefined, currentPathOfLegendSeasonResult: undefined, bestPathOfLegendSeasonResult: undefined, legacyTrophyRoadHighScore: 0 } },
    });
    await page.goto(cr());
    await expect(panel(page).getByRole('heading', { name: 'Clan' })).toBeVisible();
    await expect(panel(page).getByRole('heading', { name: 'Ranked seasons' })).toHaveCount(0);
  });

  test('a player without a clan says so instead of showing "No Clan" as a clan name', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-royale': { clan: undefined } } });
    await page.goto(cr());
    await expect(panel(page).getByText('Not in a clan right now.')).toBeVisible();
    await expect(panel(page).getByText('No Clan')).toHaveCount(0);
  });

  test('badges expand with a button that reports its state', async ({ page }) => {
    await mockApi(page);
    await page.goto(cr());
    const toggle = panel(page).getByRole('button', { name: /Badges/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(panel(page).getByTestId('badge-list')).toHaveCount(0);
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel(page).getByTestId('badge-list').getByRole('listitem')).toHaveCount(2);
  });
});
