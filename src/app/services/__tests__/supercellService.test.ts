import { describe, it, expect } from 'vitest';
import {
  normalizeTag, isValidTag, toBattleLog, displayCardLevel, bsOutcome,
} from '../supercellService';

describe('tags', () => {
  it('normalizes case, whitespace, leading # and the O/0 typo', () => {
    expect(normalizeTag('  #o2pp ')).toBe('#02PP');
    expect(normalizeTag('2pp')).toBe('#2PP');
  });
  it('accepts valid tags', () => {
    expect(isValidTag('#2PP')).toBe(true);
    expect(isValidTag('PCQRQ0LQ')).toBe(true);
  });
  it('rejects too short, too long, and illegal characters', () => {
    expect(isValidTag('#2P')).toBe(false);
    expect(isValidTag('#' + '2'.repeat(15))).toBe(false);
    expect(isValidTag('#ABC')).toBe(false);
  });
});

describe('toBattleLog', () => {
  it('reads the bare array Clash Royale returns', () => {
    expect(toBattleLog([{}, {}])).toEqual({ battles: [{}, {}], failed: false });
  });
  it('reads the { items } wrapper Brawl Stars returns', () => {
    expect(toBattleLog({ items: [{}] })).toEqual({ battles: [{}], failed: false });
  });
  it('flags unusable payloads instead of pretending there were no battles', () => {
    expect(toBattleLog(null)).toEqual({ battles: [], failed: true });
    expect(toBattleLog({})).toEqual({ battles: [], failed: true });
  });
});

describe('displayCardLevel', () => {
  it('maps rarity-relative levels onto the unified 16 scale', () => {
    expect(displayCardLevel({ level: 14, maxLevel: 14 })).toBe(16);
    expect(displayCardLevel({ level: 8, maxLevel: 8 })).toBe(16);
    expect(displayCardLevel({ level: 1, maxLevel: 14 })).toBe(3);
  });
  it('never exceeds 16 and survives missing fields', () => {
    expect(displayCardLevel({ level: 20, maxLevel: 14 })).toBe(16);
    expect(displayCardLevel({})).toBe(3);
  });
});

describe('bsOutcome', () => {
  it('trusts an explicit result', () => {
    expect(bsOutcome({ battle: { result: 'victory' } })).toBe('win');
    expect(bsOutcome({ battle: { result: 'defeat' } })).toBe('loss');
    expect(bsOutcome({ battle: { result: 'draw' } })).toBe('draw');
  });
  it('falls back to the trophy delta, then to placement (Showdown)', () => {
    expect(bsOutcome({ battle: { trophyChange: 8 } })).toBe('win');
    expect(bsOutcome({ battle: { trophyChange: -5 } })).toBe('loss');
    expect(bsOutcome({ battle: { rank: 2, players: new Array(10).fill({}) } })).toBe('win');
    expect(bsOutcome({ battle: { rank: 8, players: new Array(10).fill({}) } })).toBe('loss');
    expect(bsOutcome({ battle: { rank: 1, teams: [[], []] } })).toBe('win');
    expect(bsOutcome({ battle: { rank: 2, teams: [[], []] } })).toBe('loss');
  });
  it('returns undefined when the outcome cannot be determined', () => {
    expect(bsOutcome({ battle: {} })).toBeUndefined();
    expect(bsOutcome(undefined)).toBeUndefined();
  });
});
