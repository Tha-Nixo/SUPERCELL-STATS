import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { getBSTierInfo } from '../bsTiers';

describe('getBSTierInfo', () => {
  it.each([
    [0, 'Wood'], [249, 'Wood'], [250, 'Bronze'], [500, 'Silver'], [750, 'Gold'], [1000, 'Prestige 1'], [2500, 'Prestige 2'], [11851, 'Prestige 11'],
  ])('%j trophies -> %j', (trophies, name) => {
    expect(getBSTierInfo(trophies).name).toBe(name);
  });

  it('points every tier at an icon that exists in public/ (a missing one is a 404 on our own site)', () => {
    for (const trophies of [0, 250, 500, 750, 1000, 2000, 3000, 11851]) {
      const { iconPath } = getBSTierInfo(trophies);
      expect(existsSync(new URL(`../../../../public${iconPath}`, import.meta.url)), iconPath).toBe(true);
    }
  });
});
