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
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toBeVisible();
  const first = await rows.first().innerText();
  expect(first).toContain('Win');
  expect(first).toContain('Ladder');
  expect(first).toContain('+31');
  await expect(rows.first().getByText('Crowns', { exact: false })).toHaveCount(1);
  await expectNoEmoji(latest);
  expect(problems).toEqual([]);
});

test('Brawl Stars latest battles keep the duration next to the date', async ({ page }) => {
  await mockApi(page);
  await page.goto(`/game/brawl-stars/player/${FIXTURE_TAG}`);
  await expect(page.getByTestId('battle-row').first()).toContainText('2m 1s');
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
});
