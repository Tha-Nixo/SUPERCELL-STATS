import { describe, it, expect } from 'vitest';
import { leagueLabel } from '../summary';

describe('leagueLabel', () => {
  it.each([
    ['41,234 🏆', undefined],
    ['322259 🏆', undefined],
    ['Legendary Arena', 'Legendary Arena'],
    ['⚜️ Grandmaster', 'Grandmaster'],
    ['', undefined],
    [undefined, undefined],
  ])('%j -> %j', (rank, expected) => {
    expect(leagueLabel(rank)).toBe(expected);
  });
});
