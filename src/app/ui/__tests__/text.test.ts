import { describe, it, expect } from 'vitest';
import { stripEmoji } from '../text';

describe('stripEmoji', () => {
  it.each([
    ['7123 PL 🏆', '7123 PL'],
    ['⚜️ Grandmaster', 'Grandmaster'],
    ['1,530 👑 3-Crown wins', '1,530 3-Crown wins'],
    ['League 7', 'League 7'],
    ['👨‍👩‍👧', ''],
    ['Team 🇮🇹 Italia', 'Team Italia'],
    ['Rank 1\u{FE0F}\u{20E3} club', 'Rank club'],
    ['Nice 👍🏽 one', 'Nice one'],
    ['Home \u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F} flag', 'Home flag'],
    ['Room 12 #3', 'Room 12 #3'],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(stripEmoji(input)).toBe(expected);
  });
});
