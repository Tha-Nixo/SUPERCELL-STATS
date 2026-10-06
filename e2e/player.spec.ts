import { test, expect } from '@playwright/test';
import { watch } from './support/helpers';
import { FIXTURE_TAG, mockApi } from './support/mockApi';

const GAMES = [
  { id: 'clash-royale', player: 'Vela Storm' },
  { id: 'brawl-stars', player: 'Kitebreaker' },
  { id: 'clash-of-clans', player: 'Harrow Keep' },
] as const;

for (const { id, player } of GAMES) {
  test(`${id}: a player page renders its game module`, async ({ page }) => {
    const problems = watch(page);
    const calls = await mockApi(page);
    await page.goto(`/game/${id}/player/${FIXTURE_TAG}`);
    await expect(page.getByRole('heading', { name: player }).first()).toBeVisible();
    await expect(page.getByText(/trophies/i).first()).toBeVisible();
    expect(calls).toContain(`/api/${id}/players/#${FIXTURE_TAG}`);
    expect(problems).toEqual([]);
  });
}
