import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

// Fixture (e2e/support/fixtures.ts): 9 battles, 5 wins / 3 losses / 1 draw; Solo Showdown 3
// (placed 1st +12, 7th -6, 3rd +2), Brawl Ball 2, Gem Grab 2, Duo Showdown 1, Knockout 1.
const url = (search = '') => `/game/brawl-stars/player/${FIXTURE_TAG}${search}`;
const panel = (page: Page) => page.getByRole('tabpanel');
const rows = (page: Page) => panel(page).getByTestId('battle-row');
const result = (page: Page) => page.getByRole('group', { name: 'Result' });
const mode = (page: Page) => page.getByRole('group', { name: 'Mode' });
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('lists every battle with its summary, counts per option and Showdown placements', async ({ page }) => {
  const problems = watch(page);
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  await expect(page.getByText('Showing 9 of 9 recent battles')).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'All 9' })).toBeChecked();
  await expect(result(page).getByRole('radio', { name: 'Wins 5' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Losses 3' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Draws 1' })).toBeVisible();
  const modeNames = await mode(page).getByRole('radio').evaluateAll((els) => els.map((el) => el.closest('label')!.textContent!.replace(/(\D)(\d)/, '$1 $2')));
  expect(modeNames).toEqual(['All modes 9', 'Solo Showdown 3', 'Brawl Ball 2', 'Gem Grab 2', 'Duo Showdown 1', 'Knockout 1']);
  // The old battle log's summary survives as tiles.
  const p = panel(page);
  await expect(p.getByText('63%', { exact: true })).toBeVisible();
  await expect(p.getByText('5 W / 3 L')).toBeVisible();
  await expect(p.getByText('+12', { exact: true }).first()).toBeVisible();
  await expect(p.getByText('5 / 3 / 1')).toBeVisible();
  await expect(p.getByText('3 of 9 battles')).toBeVisible();
  // Placement only on Showdown rows; a friendly battle shows no trophy change.
  await expect(p.getByText(/Trophy gain|Trophy loss|Top half|Bottom half/)).toHaveCount(4);
  await expect(rows(page).nth(2)).toContainText('1st');
  await expect(rows(page).nth(2)).not.toContainText(/\bWin\b/);
  await expect(p.getByText('Gain or top half')).toHaveCount(0);
  await expect(rows(page).nth(6)).toContainText('Super Beach');
  await expect(rows(page).nth(6)).not.toContainText(/[+-]\d/);
  await expectNoEmoji(p);
  expect(problems).toEqual([]);
});

test('a Showdown filter keeps placements, rescopes the tiles and survives reload', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await mode(page).getByText('Solo Showdown').click();
  await expect(rows(page)).toHaveCount(3);
  expect(params(page)).toEqual({ tab: 'battles', mode: 'solo-showdown' });
  // Placement-based logs: honest labels, same values.
  await expect(result(page).getByRole('radio', { name: 'Gains 2' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Even 0' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: /^Wins/ })).toHaveCount(0);
  await expect(result(page).locator('input[value="win"]')).toHaveCount(1);
  // Tiles follow the mode: 2 W / 1 L, +12 -6 +2.
  await expect(panel(page).getByText('67%', { exact: true })).toBeVisible();
  await expect(panel(page).getByText('Gain or top half')).toBeVisible();
  await expect(panel(page).getByText('+8', { exact: true })).toBeVisible();

  await result(page).getByText('Losses').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('7th');
  await expect(rows(page)).toContainText('Trophy loss');
  expect(params(page)).toEqual({ tab: 'battles', mode: 'solo-showdown', result: 'loss' });

  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('tab', { name: 'Club' }).click();
  expect(params(page)).toEqual({ tab: 'club' });
  await page.goBack();
  expect(params(page)).toEqual({ tab: 'battles', mode: 'solo-showdown', result: 'loss' });
  await expect(rows(page)).toHaveCount(1);
});

test('no match shows an empty state that resets both filters and keeps focus on the controls', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=knockout&result=win'));
  await expect(rows(page)).toHaveCount(0);
  await page.getByTestId('empty-state').getByRole('button', { name: 'Show all battles' }).click();
  await expect(rows(page)).toHaveCount(9);
  expect(params(page)).toEqual({ tab: 'battles' });
  await expect(result(page).getByRole('radio', { name: /^All/ })).toBeFocused();
});

test('Copy link on Brawl Stars Battles keeps valid filters only', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(url('?ref=x&mode=duo-showdown&result=bogus&tab=battles'));
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(page.url()).origin}${url('?tab=battles&mode=duo-showdown')}`);
});

test('a player without battles gets the empty state, no tiles and no filters', async ({ page }) => {
  await mockApi(page, { battlelog: { 'brawl-stars': { items: [] } } });
  await page.goto(url('?tab=battles'));
  await expect(page.getByTestId('empty-state').getByText('No recent battles')).toBeVisible();
  await expect(result(page)).toHaveCount(0);
  await expect(panel(page).getByText('Win rate')).toHaveCount(0);
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('no sideways scroll and every filter option is 44px tall', async ({ page }) => {
    await page.goto(url('?tab=battles'));
    await expect(rows(page)).toHaveCount(9);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(panel(page).getByRole('group').locator('label'));
    await mode(page).getByText('Duo Showdown').click();
    await expect(rows(page)).toHaveCount(1);
    await expectNoHorizontalScroll(page);
  });
});
