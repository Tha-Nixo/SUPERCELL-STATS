import { describe, it, expect } from 'vitest';
import { stripEmoji } from '../text';

describe('stripEmoji', () => {
  it.each([
    ['7123 PL 🏆', '7123 PL'],
    ['⚜️ Grandmaster', 'Grandmaster'],
    ['1,530 👑 3-Crown wins', '1,530 3-Crown wins'],
    ['League 7', 'League 7'],
    ['👨‍👩‍👧', ''],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(stripEmoji(input)).toBe(expected);
  });
});
