import { describe, it, expect } from 'vitest';
import { ordinal, sentenceCase, stripColorTags, stripEmoji, titleCase } from '../text';

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

describe('sentenceCase', () => {
  it.each([
    ['legendary', 'Legendary'],
    ['coLeader', 'Co leader'],
    ['ELDER', 'Elder'],
    ['tower_princess', 'Tower princess'],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(sentenceCase(input)).toBe(expected);
  });
});

describe('titleCase', () => {
  it.each([
    ['SHELLY', 'Shelly'],
    ['EL PRIMO', 'El Primo'],
    ['8-BIT', '8-Bit'],
    ['MR. P', 'Mr. P'],
    ['R-T', 'R-T'],
    ['LARRY & LAWRIE', 'Larry & Lawrie'],
    ['GOLD II', 'Gold II'],
    ['MASTERS III', 'Masters III'],
    ['BAND-AID', 'Band-Aid'],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(titleCase(input)).toBe(expected);
  });
});

describe('stripColorTags', () => {
  it.each([
    ['Zero<c9>Win</c>', 'ZeroWin'],
    ['<cff00ff>Neon</c> Club', 'Neon Club'],
    ['Plain club', 'Plain club'],
    ['a < b > c', 'a < b > c'],
    ['<c9>Win', 'Win'],
    ['<c9></c>', ''],
    ['<c9>A<c4>B</c></c>', 'AB'],
    ['<C9>Up</C>', 'Up'],
  ])('%j -> %j', (input, expected) => {
    expect(stripColorTags(input)).toBe(expected);
  });
});

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [10, '10th'], [11, '11th'], [12, '12th'], [13, '13th'], [21, '21st'], [22, '22nd'], [101, '101st'],
  ])('%j -> %j', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});
