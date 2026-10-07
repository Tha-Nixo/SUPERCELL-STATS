import { test, expect } from '@playwright/test';
import { expectNoEmoji, watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

test('Clash Royale latest battles: result, mode, crowns and trophy change per row', async ({ page }) => {
  const problems = watch(page);
  await mockApi(page);
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  // On the overview the only battle rows are the "Latest battles" card.
  const latest = page.getByRole('tabpanel');
  const rows = latest.getByTestId('battle-row');
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toBeVisible();
  const first = await rows.first().innerText();
  expect(first).toContain('Win');
  expect(first).toContain('Ladder');
  expect(first).toContain('+31');
  await expect(rows.first().getByText('Crowns', { exact: false })).toHaveCount(1);
  await expect(latest.getByText(/over \d+ Trophy Road battles/)).toBeVisible();
  await expect(latest.getByText('Trophy Road battles only, oldest on the left.')).toBeVisible();
  await expect(latest.getByRole('img', { name: /trend across the last \d+ Trophy Road battles/ })).toBeVisible();
  await expectNoEmoji(latest);
  expect(problems).toEqual([]);
});

test('Brawl Stars latest battles show the map, the time, the duration and the Showdown placement', async ({ page }) => {
  const problems = watch(page);
  await mockApi(page);
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
  const rows = page.getByRole('tabpanel').getByTestId('battle-row');
  await expect(rows).toHaveCount(5);
  // Playwright runs in UTC (playwright.config.ts), so the fixture's 09:55Z reads 9:55 AM.
  await expect(rows.first()).toContainText(/Hard Rock Mine · Oct 6, 9:55\sAM · 2m 1s/);
  await expect(rows.first()).toContainText('+8');
  const showdown = rows.nth(2);
  await expect(showdown).toContainText('Solo Showdown');
  await expect(showdown).toContainText('Win');
  await expect(showdown.getByText('Placed 1st')).toHaveCount(1);
  // Team battles have no placement: the column stays, empty, so trophy changes line up.
  await expect(rows.first().getByText(/Placed/)).toHaveCount(0);
  await expectNoEmoji(rows.first().locator('xpath=..'));
  expect(problems).toEqual([]);
});

test('Clash Royale trophy trend ignores Path of Legend battles (a separate counter)', async ({ page }) => {
  await mockApi(page);
  // Later routes win: a log with Path of Legend battles only.
  await page.route('**/api/clash-royale/players/*/battlelog', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        [0, 1, 2].map((i) => ({
          type: 'pathOfLegend',
          battleTime: `20261006T09${i}000.000Z`,
          gameMode: { id: 72000450, name: 'Ranked1v1_NewArena' },
          team: [{ tag: `#${FIXTURE_TAG}`, name: 'Vela Storm', crowns: 1, trophyChange: 30 }],
          opponent: [{ tag: '#2Y0Y', name: 'Opponent', crowns: 0 }],
        })),
      ),
    }),
  );
  await page.goto(`/game/clash-royale/player/${FIXTURE_TAG}`);
  await expect(page.getByTestId('battle-row')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'No trophy trend yet' })).toBeVisible();
  await expect(page.getByText("Path of Legend battles don't change your Trophy Road count.")).toBeVisible();
});
