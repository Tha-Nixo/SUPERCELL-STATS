import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { crBattlelog } from './support/fixtures';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

// Fixture: 9 battles, 5 wins / 3 losses / 1 draw; Ladder 4, Path of Legend 3, River Race 1, Special event 1.
const url = (search = '') => `/game/clash-royale/player/${FIXTURE_TAG}${search}`;
const rows = (page: Page) => page.getByRole('tabpanel').getByTestId('battle-row');
const result = (page: Page) => page.getByRole('group', { name: 'Result' });
const mode = (page: Page) => page.getByRole('group', { name: 'Mode' });
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('every option shows its count, and the list starts unfiltered', async ({ page }) => {
  const problems = watch(page);
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  await expect(result(page).getByRole('radio', { name: 'All 9' })).toBeChecked();
  await expect(result(page).getByRole('radio', { name: 'Wins 5' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Losses 3' })).toBeVisible();
  await expect(result(page).getByRole('radio', { name: 'Draws 1' })).toBeVisible();
  // Most played first; the accessible name is "<label> <count>".
  const modeNames = await mode(page).getByRole('radio').evaluateAll((els) => els.map((el) => el.closest('label')!.textContent!.replace(/(\D)(\d)/, '$1 $2')));
  expect(modeNames).toEqual(['All modes 9', 'Ladder 4', 'Path of Legend 3', 'River Race 1', 'Special event 1']);
  await expect(page.getByText('Showing 9 of 9 recent battles')).toBeVisible();
  await expectNoEmoji(page.getByRole('tabpanel'));
  expect(problems).toEqual([]);
});

test('a result filter updates the URL and the list, survives a reload and Back after another tab', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await result(page).getByText('Losses').click();
  await expect(rows(page)).toHaveCount(3);
  for (const row of await rows(page).all()) await expect(row).toContainText('Loss');
  expect(params(page)).toEqual({ tab: 'battles', result: 'loss' });
  // Counts of the other group follow the selected result.
  await expect(mode(page).getByRole('radio', { name: /Ladder\s*1/ })).toBeVisible();

  await page.reload();
  await expect(result(page).getByRole('radio', { name: /Losses/ })).toBeChecked();
  await expect(rows(page)).toHaveCount(3);

  await page.getByRole('tab', { name: 'Deck' }).click();
  expect(params(page)).toEqual({ tab: 'deck' });
  await page.goBack();
  expect(params(page)).toEqual({ tab: 'battles', result: 'loss' });
  await expect(rows(page)).toHaveCount(3);
});

test('filter changes replace the history entry instead of adding one', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  const length = await page.evaluate(() => history.length);
  await result(page).getByText('Wins').click();
  await mode(page).getByText('Ladder').click();
  await expect(rows(page)).toHaveCount(2);
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test('mode and result combine; no match shows an empty state that resets both', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=river-race&result=draw'));
  await expect(rows(page)).toHaveCount(0);
  const empty = page.getByTestId('empty-state');
  await expect(empty.getByText('No battles match these filters')).toBeVisible();
  await empty.getByRole('button', { name: 'Show all battles' }).click();
  await expect(rows(page)).toHaveCount(9);
  expect(params(page)).toEqual({ tab: 'battles' });
});

test('after "Show all battles" by keyboard, focus lands on the selected Result option, not <body>', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=river-race&result=draw'));
  const button = page.getByTestId('empty-state').getByRole('button', { name: 'Show all battles' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(rows(page)).toHaveCount(9);
  await expect(result(page).getByRole('radio', { name: 'All 9' })).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('INPUT');
});

test('a Path of Legend trophy change carries a visible PoL qualifier and the full name for screen readers', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=path-of-legend'));
  const withChange = rows(page).filter({ hasText: '+29' });
  await expect(withChange).toHaveCount(1);
  await expect(withChange.getByText('PoL', { exact: true })).toBeVisible();
  await expect(withChange.locator('.sr-only', { hasText: 'Path of Legend trophies' })).toHaveCount(1);
  // Ladder rows keep the plain counter and no qualifier.
  await page.goto(url('?tab=battles&mode=ladder'));
  await expect(page.getByText('PoL', { exact: true })).toHaveCount(0);
  await expect(rows(page).first().locator('.sr-only', { hasText: /^Trophies / })).toHaveCount(1);
});

test('"Special event" is how a Clash Royale battle of type unknown is named', async ({ page }) => {
  await page.goto(url('?tab=battles&mode=special-event'));
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Special event');
  await expect(page.getByText('Brawl Hockey')).toHaveCount(0);
});

test('unknown or empty filter values fall back to all without rewriting the URL', async ({ page }) => {
  const problems = watch(page);
  await page.goto(url('?tab=battles&mode=brawl-ball&result=victory'));
  await expect(rows(page)).toHaveCount(9);
  await expect(result(page).getByRole('radio', { name: /^All/ })).toBeChecked();
  await expect(mode(page).getByRole('radio', { name: /All modes/ })).toBeChecked();
  expect(params(page)).toEqual({ tab: 'battles', mode: 'brawl-ball', result: 'victory' });
  expect(problems).toEqual([]);
});

test('filters are a keyboard radio group: Tab enters on the checked option, arrows select', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  await result(page).getByRole('radio', { name: /^All/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(result(page).getByRole('radio', { name: /Wins/ })).toBeFocused();
  await expect(result(page).getByRole('radio', { name: /Wins/ })).toBeChecked();
  await expect(rows(page)).toHaveCount(5);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(rows(page)).toHaveCount(1);
  expect(params(page)).toEqual({ tab: 'battles', result: 'draw' });
  await page.keyboard.press('Tab');
  await expect(mode(page).getByRole('radio', { name: /All modes/ })).toBeFocused();
});

test('the focused filter shows a visible focus ring', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await result(page).getByRole('radio', { name: /^All/ }).focus();
  await page.keyboard.press('ArrowRight');
  const outline = await result(page).locator('label').nth(1).locator('span').first().evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(parseFloat(outline)).toBeGreaterThanOrEqual(2);
});

test('a player whose battles are all one mode gets no mode filter', async ({ page }) => {
  await mockApi(page, { battlelog: { 'clash-royale': crBattlelog.slice(0, 4) } });
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(4);
  await expect(result(page)).toBeVisible();
  await expect(mode(page)).toHaveCount(0);
});

test('a player without battles gets the empty state, not empty filters', async ({ page }) => {
  await mockApi(page, { battlelog: { 'clash-royale': [] } });
  await page.goto(url('?tab=battles'));
  await expect(page.getByTestId('empty-state').getByText('No recent battles')).toBeVisible();
  await expect(result(page)).toHaveCount(0);
});

test('filtering never moves the filters or the top of the list', async ({ page }) => {
  await page.goto(url('?tab=battles'));
  await expect(rows(page)).toHaveCount(9);
  const filters = page.getByRole('region', { name: 'Battle filters' });
  const before = { filters: await filters.boundingBox(), list: await rows(page).first().boundingBox() };
  for (const option of ['Losses', 'Draws', 'Wins']) {
    await result(page).getByText(option).click();
    await expect(result(page).getByRole('radio', { name: new RegExp(option) })).toBeChecked();
    expect(await filters.boundingBox()).toEqual(before.filters);
    expect((await rows(page).first().boundingBox())!.y).toBe(before.list!.y);
  }
});

test.describe('on a 320px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('no sideways scroll and every filter option is 44px tall', async ({ page }) => {
    await page.goto(url('?tab=battles'));
    await expect(rows(page)).toHaveCount(9);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page.getByRole('tabpanel').getByRole('group').locator('label'));
    await mode(page).getByText('Path of Legend').click();
    await expect(rows(page)).toHaveCount(3);
    await expectNoHorizontalScroll(page);
  });
});
