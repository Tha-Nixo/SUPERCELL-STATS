import { test, expect, type Page } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { cocLowTownHall } from './support/fixtures';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const coc = (search = '') => `/game/clash-of-clans/player/${FIXTURE_TAG}${search}`;
const panel = (page: Page) => page.getByRole('tabpanel');
const card = (page: Page, title: string) => panel(page).locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });

test.describe('Overview tab', () => {
  test('tiles show war stars, lifetime wins and best trophies, and no invented win rate', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(coc());
    const p = panel(page);
    await expect(p.getByText('War stars', { exact: true })).toBeVisible();
    await expect(p.getByText('1,450', { exact: true })).toBeVisible();
    await expect(p.getByText('8,123', { exact: true })).toBeVisible();
    await expect(p.getByText('2,100', { exact: true })).toBeVisible();
    await expect(p.getByText(/win rate/i)).toHaveCount(0);
    await expectNoEmoji(p);
    expect(problems).toEqual([]);
  });

  test('the summary bar shows the experience level next to the Town Hall', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const summary = page.getByTestId('player-summary');
    await expect(summary.getByText('Level 210')).toBeVisible();
    await expect(summary.getByText('Town Hall 15')).toBeVisible();
  });

  test('trophies card separates current from best, with the league and its badge', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const trophies = card(page, 'Trophies');
    await expect(trophies.getByText('Legend League')).toBeVisible();
    await expect(trophies.locator('img[src*="api-assets.clashofclans.com/leagues"]')).toHaveCount(1);
    for (const [label, value] of [['Home village', '5,012'], ['Best home village', '5,340'], ['Builder base', '3,120'], ['Best builder base', '3,333'], ['Builder Hall', 'Level 10']]) {
      await expect(trophies.getByText(label, { exact: true })).toBeVisible();
      await expect(trophies.getByText(value, { exact: true })).toBeVisible();
    }
  });

  test('clan card shows the role in game words and season donations', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const clan = card(page, 'Clan');
    await expect(clan.getByText('Lantern Watch')).toBeVisible();
    await expect(clan.getByText('Co-leader · Level 18')).toBeVisible();
    await expect(clan.getByText('1,200', { exact: true })).toBeVisible();
    await expect(clan.getByText('900', { exact: true })).toBeVisible();
    await expect(clan.getByText('1,234,567', { exact: true })).toBeVisible();
    await expect(clan.getByText(/this season/).first()).toBeVisible();
  });

  test('a player outside a clan reads "Not in a clan", with no role', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { clan: undefined, role: undefined } } });
    await page.goto(coc());
    const clan = card(page, 'Clan');
    await expect(clan.getByText('Not in a clan')).toBeVisible();
    await expect(clan.getByText(/Member|Co-leader/)).toHaveCount(0);
  });

  test('legend card lists legend trophies, this season and the best season', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc());
    const legend = card(page, 'Legend League');
    await expect(legend.getByText('Legend trophies, all time', { exact: true })).toBeVisible();
    await expect(legend.getByText('2,210', { exact: true })).toBeVisible();
    await expect(legend.getByText('#1,412 · 5,012 trophies')).toBeVisible();
    await expect(legend.getByText('2026-08 · #830 · 5,560 trophies')).toBeVisible();
  });

  test('without a best-trophies figure the tile and the row agree on the current trophies', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { bestTrophies: undefined } } });
    await page.goto(coc());
    const tile = panel(page).getByText('Best trophies', { exact: true }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    await expect(tile).toContainText('5,012');
    const row = card(page, 'Trophies').getByText('Best home village', { exact: true }).locator('xpath=..');
    await expect(row).toContainText('5,012');
  });

  test('a player without legend statistics or league gets no legend card and reads Unranked', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { legendStatistics: undefined, league: undefined } } });
    await page.goto(coc());
    await expect(card(page, 'Legend League')).toHaveCount(0);
    await expect(card(page, 'Trophies').getByText('Unranked')).toBeVisible();
  });
});

test.describe('Army tab', () => {
  const section = (page: Page, title: string) => card(page, title);

  test('sections come home village first, with names and levels printed', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const titles = panel(page).getByRole('heading', { level: 3 });
    await expect(titles).toHaveText(['Troops', 'Super troops', 'Spells', 'Siege machines', 'Pets', 'Builder base troops']);
    const troops = section(page, 'Troops');
    await expect(troops.getByTestId('coc-item')).toHaveCount(5);
    await expect(troops.getByTestId('coc-item').filter({ hasText: 'Barbarian' }).first()).toContainText('11 / 12');
    await expect(troops.getByTestId('coc-item').filter({ hasText: 'Archer' })).toContainText('Max');
    await expect(troops.getByText('Meteor Golem')).toBeVisible();
    await expect(troops.getByText('1 of 5 at max level')).toBeVisible();
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('levels are worded for screen readers', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const barbarian = section(page, 'Troops').getByTestId('coc-item').first();
    await expect(barbarian.locator('.sr-only').first()).toHaveText('Level 11 of 12');
    await expect(barbarian.locator('[aria-hidden="true"]').filter({ hasText: '11 / 12' })).toHaveCount(1);
  });

  test('an item with no max level prints just its level', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { troops: [
      { name: 'Zorb Rider', level: 5, village: 'home' },
      { name: 'Zero Max', level: 3, maxLevel: 0, village: 'home' },
      { name: 'Barbarian', level: 11, maxLevel: 12, village: 'home' },
    ], spells: [{ name: 'Mystery Spell', level: 2, village: 'home' }] } } });
    await page.goto(coc('?tab=army'));
    const items = section(page, 'Troops').getByTestId('coc-item');
    await expect(items.filter({ hasText: 'Zorb Rider' })).toHaveText('Zorb Rider5Level 5');
    await expect(items.filter({ hasText: 'Zorb Rider' }).locator('.sr-only')).toHaveText('Level 5');
    await expect(items.filter({ hasText: 'Zero Max' }).locator('.sr-only')).toHaveText('Level 3');
    await expect(items.filter({ hasText: 'Barbarian' }).locator('.sr-only')).toHaveText('Level 11 of 12');
    await expect(section(page, 'Spells').getByTestId('coc-item').locator('.sr-only')).toHaveText('Level 2');
    await expect(panel(page).getByText(/\/ (0|undefined)?$/)).toHaveCount(0);
  });

  test('super troops show no level, and the boosted one says so', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const sup = section(page, 'Super troops');
    await expect(sup.getByTestId('coc-item')).toHaveCount(3);
    await expect(sup.getByText('Super Yeti')).toBeVisible();
    await expect(sup.getByTestId('coc-item').filter({ hasText: 'Sneaky Goblin' })).toContainText('Boosted now');
    await expect(sup.getByText(/\d+ \/ \d+/)).toHaveCount(0);
    await expect(sup.getByText('1 boosted now')).toBeVisible();
  });

  test('items without local art keep their box with an icon, never a broken image', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=army'));
    const wagon = section(page, 'Troops').getByTestId('coc-item').filter({ hasText: 'Sky Wagon' });
    await expect(wagon.getByTestId('game-image-fallback')).toHaveCount(1);
    await expect(section(page, 'Troops').getByTestId('coc-item').filter({ hasText: 'Barbarian' }).first().locator('img')).toHaveAttribute('src', /\/images\/coc\/troops\//);
  });

  test('padded items read "Not unlocked" and an all-locked section collapses', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': cocLowTownHall } });
    await page.goto(coc('?tab=army'));
    await expect(section(page, 'Siege machines').getByText('None unlocked yet')).toBeVisible();
    await expect(section(page, 'Siege machines').getByTestId('coc-item')).toHaveCount(0);
    await expect(section(page, 'Super troops')).toHaveCount(0);
  });

  test('a player with no army at all gets an empty state', async ({ page }) => {
    await mockApi(page);
    await page.route('**/api/clash-of-clans/players/**', (route) => route.fulfill({ json: { name: 'Harrow Keep', tag: `#${FIXTURE_TAG}` } }));
    await page.goto(coc('?tab=army'));
    await expect(page.getByTestId('empty-state').getByText('No army in this answer')).toBeVisible();
  });
});

test.describe('Heroes tab', () => {
  test('hero cards are named, with level, share and what each hero wears', async ({ page }) => {
    const problems = watch(page);
    await mockApi(page);
    await page.goto(coc('?tab=heroes'));
    const heroes = card(page, 'Heroes').getByTestId('hero-card');
    // Three heroes in the payload, three the mapper adds as not unlocked.
    await expect(heroes).toHaveCount(6);
    const king = heroes.filter({ has: page.getByRole('heading', { name: 'Barbarian King' }) });
    await expect(king).toContainText('85 / 95');
    await expect(king).toContainText('89%');
    await expect(king).toContainText('Barbarian Puppet');
    await expect(king).toContainText('Rage Vial');
    await expect(heroes.filter({ hasText: 'Archer Queen' })).toContainText('Max');
    await expect(heroes.filter({ hasText: 'Royal Champion' })).toContainText('Not unlocked');
    await expect(heroes.filter({ hasText: 'Royal Champion' })).not.toContainText('Equipped');
    await expectNoEmoji(panel(page));
    expect(problems).toEqual([]);
  });

  test('builder base heroes have their own card', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=heroes'));
    const builder = card(page, 'Builder base heroes');
    await expect(builder.getByRole('heading', { name: 'Battle Machine' })).toBeVisible();
    await expect(builder).toContainText('30 / 35');
  });

  test('the equipment list marks equipped pieces and lists them first', async ({ page }) => {
    await mockApi(page);
    await page.goto(coc('?tab=heroes'));
    const equipment = card(page, 'Equipment');
    await expect(equipment.getByText('8 owned · 5 equipped')).toBeVisible();
    const items = equipment.getByTestId('coc-item');
    await expect(items).toHaveCount(8);
    for (let i = 0; i < 5; i++) await expect(items.nth(i)).toContainText('Equipped');
    await expect(items.nth(5)).toContainText('Giant Arrow');
    await expect(items.nth(5)).not.toContainText('Equipped');
  });

  test('a hero without equipment says so, and a player without equipment gets no equipment card', async ({ page }) => {
    await mockApi(page, { patch: { 'clash-of-clans': { heroes: [{ name: 'Barbarian King', level: 20, maxLevel: 40, village: 'home' }], heroEquipment: [] } } });
    await page.goto(coc('?tab=heroes'));
    await expect(card(page, 'Heroes').getByTestId('hero-card').first()).toContainText('Nothing equipped');
    await expect(card(page, 'Equipment')).toHaveCount(0);
  });
});
