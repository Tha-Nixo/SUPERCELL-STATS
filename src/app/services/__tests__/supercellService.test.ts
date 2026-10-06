import { describe, it, expect } from 'vitest';
import {
  normalizeTag, isValidTag, toBattleLog, displayCardLevel, bsOutcome, bsWinStats, crTrophyRoadBattles,
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

describe('bsWinStats', () => {
  const b = (result: string) => ({ battle: { result } });
  it('excludes draws from the denominator and from losses (5W 3L 2D -> 62.5%)', () => {
    const log = [
      ...Array(5).fill(b('victory')), ...Array(3).fill(b('defeat')), ...Array(2).fill(b('draw')),
    ];
    const s = bsWinStats(log);
    expect(s.battleWins).toBe(5);
    expect(s.battleLosses).toBe(3);
    expect(s.winRate).toBe(63); // 62.5 rounded; a draw-as-loss bug would give 50
  });
  it('returns 0 for an all-draw or empty log', () => {
    expect(bsWinStats([b('draw')]).winRate).toBe(0);
    expect(bsWinStats([])).toEqual({ battleWins: 0, battleLosses: 0, winRate: 0 });
  });
});

describe('crTrophyRoadBattles', () => {
  // Shaped like the live battle log: Path of Legend battles carry a trophyChange of their own
  // that is not part of the Trophy Road count (player.trophies).
  const pol = { type: 'pathOfLegend', gameMode: { name: 'Ranked1v1_NewArena' }, team: [{ crowns: 1, trophyChange: 30 }] };
  const ladder = { type: 'PvP', gameMode: { name: 'Ladder' }, team: [{ crowns: 2, trophyChange: 29 }] };
  const noChange = { type: 'challenge', team: [{ crowns: 1 }] };

  it('drops Path of Legend battles', () => {
    expect(crTrophyRoadBattles([pol, pol])).toEqual([]);
  });
  it('keeps ladder battles that moved trophies and drops the rest, in order', () => {
    const loss = { type: 'PvP', team: [{ crowns: 0, trophyChange: -27 }] };
    expect(crTrophyRoadBattles([pol, ladder, noChange, loss])).toEqual([ladder, loss]);
  });
  it('copes with malformed entries', () => {
    expect(crTrophyRoadBattles([{}, { team: [] }, null as never])).toEqual([]);
  });
});
