import { test, expect } from '@playwright/test';
import { FIXTURE_TAG, deferred, mockApi } from './support/mockApi';

// Spec performance budget: production CLS <= 0.05. The footer used to sit at the
// bottom of the short skeleton page and get pushed below the fold on arrival.
const BUDGET = 0.05;
const PAGES = [
  ...['', '?tab=cards', '?tab=deck', '?tab=battles', '?tab=towers'].map((search) => ({ game: 'clash-royale', search })),
  ...['', '?tab=brawlers', '?tab=progression', '?tab=battles', '?tab=battles&mode=solo-showdown&result=loss'].map((search) => ({ game: 'brawl-stars', search })),
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  for (const { game, search } of PAGES) {
    test(`${game}${search} player page shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockApi(page);
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
            if (!entry.hadRecentInput) w.__cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });

      await page.goto(`/game/${game}/player/${FIXTURE_TAG}${search}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await page.waitForTimeout(1500);

      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
    });
  }
}

// Applying a Battles filter must not move the filter card or add layout shift.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  test(`filtering battles shifts nothing at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockApi(page);
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number }[]) w.__cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}?tab=battles`);
    await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
    const panel = page.getByRole('tabpanel');
    const card = panel.locator('section[aria-label="Battle filters"]');
    const firstRow = panel.getByTestId('battle-row').first();
    const cls = () => page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    // Settled = the shift sum has not moved for 300 ms (polled, no fixed wait).
    const settle = async () => {
      let last = -1;
      let since = Date.now();
      await expect
        .poll(async () => {
          const now = await cls();
          if (now !== last) {
            last = now;
            since = Date.now();
          }
          return Date.now() - since >= 300;
        }, { intervals: [50], timeout: 5000 })
        .toBe(true);
    };
    await expect(firstRow).toBeVisible();
    await settle();
    const group = panel.locator('fieldset').first();
    const before = { group: await group.boundingBox(), card: await card.boundingBox(), row: await firstRow.boundingBox() };
    const clsBefore = await cls();
    // The list shrinks from 9 to 3 rows; everything above it, and the first row, must not move.
    await panel.locator('label').filter({ hasText: /^Losses\s*\d+$/ }).click();
    await expect(panel.getByTestId('battle-row')).toHaveCount(3);
    await settle();
    const after = { group: await group.boundingBox(), card: await card.boundingBox(), row: await firstRow.boundingBox() };
    expect(after.group).toEqual(before.group);
    expect(after.card).toEqual(before.card);
    expect(after.row?.y).toBe(before.row?.y);
    expect((await cls()) - clsBefore).toBeLessThanOrEqual(BUDGET);
  });
}

// An empty battle log swaps a tall skeleton for a short empty state: the footer
// must not jump when that happens.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  test(`an empty battle log shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockApi(page, { battlelog: { 'clash-royale': [] } });
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}?tab=battles`);
    await expect(page.getByTestId('empty-state').getByText(/No recent battles/)).toBeVisible();
    await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
    await page.waitForTimeout(1000);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
  });
}

// Same for the Brawl Stars Progression tab of a player without brawlers.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  test(`an empty progression tab shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockApi(page, { patch: { 'brawl-stars': { brawlers: [] } } });
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}?tab=progression`);
    await expect(page.getByTestId('empty-state').getByText('No progression to show')).toBeVisible();
    await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
    await page.waitForTimeout(1000);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
  });
}

// The Brawl Stars Club tab, with a club and with one that failed to load, must keep the footer still.
for (const [label, options, ready] of [
  ['a club', {}, 'LanternWatch'],
  ['an unavailable club', { club: null }, 'Club details are unavailable'],
] as const) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    test(`${label} on the club tab shifts no more than the budget at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockApi(page, options);
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
            if (!entry.hadRecentInput) w.__cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}?tab=club`);
      await expect(page.getByRole('tabpanel').getByText(ready)).toBeVisible();
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await page.waitForTimeout(1000);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThanOrEqual(BUDGET);
    });
  }
}

// A short tab must not leave a blank band before the footer: the footer sits one
// normal margin (64px) below the panel, never a screenful away.
const MAX_GAP = 200;
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const { label, game, search, options } of [
    { label: 'BS progression', game: 'brawl-stars', search: '?tab=progression', options: {} },
    { label: 'BS brawlers', game: 'brawl-stars', search: '?tab=brawlers', options: {} },
    { label: 'BS small club', game: 'brawl-stars', search: '?tab=club', options: {} },
    { label: 'BS empty progression', game: 'brawl-stars', search: '?tab=progression', options: { patch: { 'brawl-stars': { brawlers: [] } } } },
    { label: 'CR empty battles', game: 'clash-royale', search: '?tab=battles', options: { battlelog: { 'clash-royale': [] } } },
  ] as const) {
    test(`${label} keeps the footer close to the content at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockApi(page, options);
      await page.goto(`/game/${game}/player/${FIXTURE_TAG}${search}`);
      await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await page.waitForTimeout(300);
      // Content bottom = lowest leaf element of the panel (a screen-tall wrapper would not count).
      const contentBottom = await page.locator('#player-panel').evaluate((el) =>
        Math.max(...Array.from(el.querySelectorAll('*')).filter((n) => n.childElementCount === 0).map((n) => n.getBoundingClientRect().bottom)) + window.scrollY);
      const footer = await page.getByRole('contentinfo').boundingBox();
      const gap = footer!.y + (await page.evaluate(() => window.scrollY)) - contentBottom;
      // A page shorter than the screen keeps its footer at the screen bottom (sticky footer): that is not a band inside the page.
      const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
      if (scrolls) expect(gap, `gap ${Math.round(gap)}px`).toBeLessThan(MAX_GAP);
      else expect(footer!.y + footer!.height, 'footer at the screen bottom').toBeGreaterThanOrEqual(viewport.height - 1);
    });
  }
}

// While the game module downloads the footer is out of the layout; it appears
// below the panel afterwards instead of being pushed down by it.
test('the footer waits for a loading panel and then shows below it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  const chunk = deferred();
  await page.route(/\/assets\/BrawlStars-[^/]*\.js$/, async (route) => {
    await chunk.promise;
    await route.continue();
  });
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}?tab=progression`);
  await expect(page.getByTestId('panel-skeleton')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  chunk.release();
  await expect(page.getByTestId('panel-skeleton')).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toBeVisible();
});
