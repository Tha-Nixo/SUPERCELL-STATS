import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll, expectTouchTargets, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const TABS = {
  'clash-royale': ['overview', 'cards', 'deck', 'battles', 'towers'],
  'brawl-stars': ['overview', 'brawlers', 'progression', 'battles', 'club'],
  'clash-of-clans': ['overview', 'army', 'heroes', 'achievements'],
} as const;

const player = (game: string, search = '') => `/game/${game}/player/${FIXTURE_TAG}${search}`;
const selected = (page: import('@playwright/test').Page) => page.getByRole('tab', { selected: true });

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

for (const [game, ids] of Object.entries(TABS)) {
  test(`${game}: every tab id opens from the URL and renders without errors`, async ({ page }) => {
    const problems = watch(page);
    for (const id of ids) {
      await page.goto(player(game, `?tab=${id}`));
      await expect(selected(page)).toHaveAttribute('id', `player-tab-${id}`);
      await expect(page.getByRole('tabpanel')).toBeVisible();
    }
    expect(problems).toEqual([]);
  });
}

test('selecting a tab updates the URL, survives a reload and comes back with Back', async ({ page }) => {
  await page.goto(player('clash-royale'));
  await expect(selected(page)).toHaveText('Overview');

  await page.getByRole('tab', { name: 'Battles' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles'));
  await expect(selected(page)).toHaveText('Battles');

  await page.reload();
  await expect(selected(page)).toHaveText('Battles');

  await page.getByRole('tab', { name: 'Deck' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=deck'));
  await page.goBack();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles'));
  await expect(selected(page)).toHaveText('Battles');

  await page.getByRole('tab', { name: 'Overview' }).click();
  await expect(page).toHaveURL(player('clash-royale'));
});

test('an unknown ?tab falls back to the first tab', async ({ page }) => {
  const problems = watch(page);
  await page.goto(player('brawl-stars', '?tab=definitely-not-a-tab'));
  await expect(selected(page)).toHaveText('Overview');
  await expect(page.getByRole('heading', { level: 1, name: 'Kitebreaker' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('arrow keys move between tabs without adding history entries', async ({ page }) => {
  await page.goto(player('clash-of-clans'));
  await expect(page.getByRole('heading', { level: 1, name: 'Harrow Keep' })).toBeVisible();
  await page.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Army' })).toBeFocused();
  await expect(page).toHaveURL(player('clash-of-clans', '?tab=army'));
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Achievements' })).toBeFocused();
  await expect(page).toHaveURL(player('clash-of-clans', '?tab=achievements'));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeFocused();
  await expect(page).toHaveURL(player('clash-of-clans'));
  const length = await page.evaluate(() => history.length);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test('"All battles" in the overview opens the Battles tab', async ({ page }) => {
  await page.goto(player('clash-royale'));
  await page.getByRole('button', { name: 'All battles' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles'));
});

test('the club tab explains a player without a club', async ({ page }) => {
  await mockApi(page, { patch: { 'brawl-stars': { club: undefined } } });
  await page.goto(player('brawl-stars', '?tab=club'));
  await expect(page.getByTestId('empty-state').getByText('Not in a club')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('tabs scroll sideways inside their strip, the page does not, and every tab is 44px tall', async ({ page }) => {
    await page.goto(player('brawl-stars'));
    const list = page.getByRole('tablist');
    const { scrollWidth, clientWidth } = await list.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page.getByRole('tab'));

    await page.getByRole('tab', { name: 'Club' }).click();
    await expect(page).toHaveURL(player('brawl-stars', '?tab=club'));
    const box = await page.getByRole('tab', { name: 'Club' }).boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await expectNoHorizontalScroll(page);
  });
});

for (const width of [390, 1440]) {
  test(`focus ring of the first, a middle and the last tab stays inside the strip at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(player('clash-royale'));
    const list = page.getByRole('tablist');
    await expect(selected(page)).toHaveText('Overview');
    await selected(page).focus();
    const probe = () =>
      page.evaluate(() => {
        const tab = document.activeElement as HTMLElement;
        const cs = getComputedStyle(tab);
        const width = parseFloat(cs.outlineWidth);
        const reach = width + parseFloat(cs.outlineOffset);
        const t = tab.getBoundingClientRect();
        const s = tab.parentElement!.getBoundingClientRect();
        const el = tab.parentElement!;
        const inner = { l: s.left + el.clientLeft, r: s.left + el.clientLeft + el.clientWidth, t: s.top + el.clientTop, b: s.top + el.clientTop + el.clientHeight };
        return {
          role: tab.getAttribute('role'),
          width,
          reach,
          top: t.top - reach - inner.t,
          bottom: inner.b - (t.bottom + reach),
          left: t.left - reach - inner.l,
          right: inner.r - (t.right + reach),
        };
      });
    const steps = ['Home', 'ArrowRight', 'ArrowRight', 'End'];
    for (const key of steps) {
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
      const r = await probe();
      expect(r.role).toBe('tab');
      expect(r.width).toBeGreaterThan(0);
      for (const side of ['top', 'bottom', 'left', 'right'] as const) {
        expect(r[side], `${key}: ${side}`).toBeGreaterThanOrEqual(-0.5);
      }
      if (process.env.SHOTS) await list.screenshot({ path: `${process.env.SHOTS}/tabs-${width}-${key}-${Date.now()}.png` });
    }
  });
}

test('changing tab keeps the URL hash', async ({ page }) => {
  await page.goto(player('clash-royale', '?tab=battles#x'));
  await page.getByRole('tab', { name: 'Deck' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=deck#x'));
});

test('leaving the Battles tab drops its filters; clicking Battles again keeps them', async ({ page }) => {
  await page.goto(player('clash-royale', '?tab=battles&result=loss&ref=share'));
  await page.getByRole('tab', { name: 'Battles' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles&result=loss&ref=share'));
  await page.getByRole('tab', { name: 'Deck' }).click();
  await expect(page).toHaveURL(player('clash-royale', '?tab=deck&ref=share'));
  await page.goBack();
  await expect(page).toHaveURL(player('clash-royale', '?tab=battles&result=loss&ref=share'));
});

test('Copy link on Battles keeps the filters and nothing else', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(player('clash-royale', '?ref=x&result=loss&tab=battles'));
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`${new URL(page.url()).origin}${player('clash-royale', '?tab=battles&result=loss')}`);
});

test('Copy link on another tab leaves out stray or invalid filters', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const origin = () => new URL(page.url()).origin;
  const copy = async () => {
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
    return page.evaluate(() => navigator.clipboard.readText());
  };
  await page.goto(player('clash-royale', '?tab=deck&mode=ladder&result=loss'));
  expect(await copy()).toBe(`${origin()}${player('clash-royale', '?tab=deck')}`);
  await page.goto(player('clash-royale', '?tab=battles&mode=brawl-ball&result=victory'));
  expect(await copy()).toBe(`${origin()}${player('clash-royale', '?tab=battles')}`);
});
