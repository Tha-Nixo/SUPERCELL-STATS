import { describe, it, expect } from 'vitest';
import type { BSBattleLogItem, PlayerStats } from '../../data/mockStats';
import { battleSummary, battleTime, bsBattleRows, bsOverviewFacts, bsHiddenResults, bsResultLabels, formatDuration, placementBased, winRateNote } from '../bsFacts';

// Times are shown in the visitor's zone; pin one for the assertions.
process.env.TZ = 'UTC';

const item = (battle: BSBattleLogItem['battle'], mode = battle.mode, map = 'Acid Lakes'): BSBattleLogItem => ({
  battleTime: '20261006T212908.000Z',
  event: { id: 15000956, mode, map },
  battle,
});

describe('battleTime', () => {
  it('formats the API timestamp with the time of day', () => {
    expect(battleTime('20261006T212908.000Z')).toMatch(/^Oct 6, 9:29\sPM$/);
  });
  it('is empty for an unreadable time', () => {
    expect(battleTime('soon')).toBe('');
  });
  it('never throws on a battle without a usable time', () => {
    for (const raw of [undefined, null, 20261006, 'soon', '']) expect(battleTime(raw as unknown as string)).toBe('');
  });
});

describe('formatDuration', () => {
  it.each([[20, '20s'], [60, '1m 0s'], [125, '2m 5s']])('%j -> %j', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe('bsBattleRows', () => {
  it('keeps the map, the Showdown placement and the trophy change', () => {
    // As on production: Solo Showdown has a rank and a trophy change, no result of its own
    // until the mapper adds one from bsOutcome.
    const [row] = bsBattleRows([item({ mode: 'soloShowdown', type: 'ranked', rank: 3, trophyChange: 2, result: 'victory' })]);
    expect(row).toMatchObject({ id: 'bs-0', mode: 'Solo Showdown', result: 'win', score: 2, map: 'Acid Lakes', placement: 3, duration: '' });
  });

  it('reads team results and durations, and has no placement or trophies when the API sends none', () => {
    const rows = bsBattleRows([
      item({ mode: 'gemGrab', type: 'ranked', result: 'defeat', duration: 140, trophyChange: -5 }),
      item({ mode: 'brawlBall', type: 'friendly', result: 'victory', duration: 95 }, 'brawlBall', ''),
    ]);
    expect(rows[0]).toMatchObject({ mode: 'Gem Grab', result: 'loss', score: -5, duration: '2m 20s', placement: undefined });
    expect(rows[1]).toMatchObject({ result: 'win', score: undefined, map: undefined, duration: '1m 35s' });
  });

  it('lists a battle whose outcome could not be read as a draw', () => {
    expect(bsBattleRows([item({ mode: 'bigGame', type: 'ranked' })])[0].result).toBe('draw');
  });

  it('names the mode from the event first and treats a missing log as no battles', () => {
    expect(bsBattleRows([item({ mode: '', type: 'ranked', result: 'draw' }, 'unknown')])[0].mode).toBe('Brawl Hockey');
    expect(bsBattleRows(undefined)).toEqual([]);
  });
});

describe('battleSummary', () => {
  const row = (mode: string, result: 'win' | 'loss' | 'draw', score?: number) => ({ id: mode + result, mode, result, score, date: '', duration: '' });
  it('counts results, leaves draws out of the win rate and sums the trophy changes', () => {
    expect(
      battleSummary([row('Solo Showdown', 'win', 12), row('Gem Grab', 'loss', -5), row('Solo Showdown', 'draw', 0), row('Brawl Ball', 'win')]),
    ).toEqual({ wins: 2, losses: 1, draws: 1, winRate: 67, netTrophies: 7, topMode: { mode: 'Solo Showdown', count: 2 } });
  });
  it('has no win rate or top mode without battles, and no win rate with draws only', () => {
    expect(battleSummary([])).toEqual({ wins: 0, losses: 0, draws: 0, winRate: undefined, netTrophies: 0, topMode: undefined });
    expect(battleSummary([row('Gem Grab', 'draw', 0)]).winRate).toBeUndefined();
  });
});

describe('placement-based battles', () => {
  const row = (placement?: number) => ({ id: 'x', mode: 'Solo Showdown', result: 'win' as const, date: '', duration: '', placement });
  it('are logs where every battle has a placement', () => {
    expect(placementBased([row(1), row(7)])).toBe(true);
    expect(placementBased([row(1), row()])).toBe(false);
    expect(placementBased([])).toBe(false);
  });
  it('rename the result filters to what the outcome measures, keeping the others', () => {
    expect(bsResultLabels([row(4)])).toEqual({ win: 'Gains', loss: 'Losses', draw: 'Even' });
    expect(bsResultLabels([row(4), row()])).toBeUndefined();
  });
  it('drop the Even option only when the whole list is placements and none is a draw', () => {
    expect(bsHiddenResults([row(4), row(8)])).toEqual(['draw']);
    expect(bsHiddenResults([{ ...row(4), result: 'draw' as const }, row(8)])).toEqual([]);
    expect(bsHiddenResults([row(4), row()])).toEqual([]);
    expect(bsHiddenResults([])).toEqual([]);
  });
  it('say gain or top half for a Showdown-only log and W / L for any other', () => {
    const win = { ...row(), result: 'win' as const };
    const loss = { ...row(), result: 'loss' as const };
    expect(winRateNote([row(1), row(9)], 'recent')).toBe('Gain or top half');
    expect(winRateNote([win, win, loss], 'recent')).toBe('2 W / 1 L, recent battles');
    expect(winRateNote([win, loss, row(3)], 'mode')).toBe('2 W / 1 L');
    expect(winRateNote([], 'recent')).toBe('No recent wins or losses');
    expect(winRateNote([], 'mode')).toBe('No wins or losses yet');
  });
});

describe('bsOverviewFacts', () => {
  const stats = (statLabels: PlayerStats['statLabels'], extraStats: PlayerStats['extraStats'] = []) => ({ statLabels, extraStats }) as PlayerStats;

  it('reads best trophies, the brawler catalogue and the Ranked lines back from the mapper strings', () => {
    expect(
      bsOverviewFacts(stats({ stat3Sub: '107/109 brawlers unlocked', stat4Sub: 'Best: 322,473' }, [
        { label: 'Ranked', value: 'GOLD II · 2,196 Elo' },
        { label: 'Best Ranked (all time)', value: 'MASTERS III' },
      ])),
    ).toEqual({ bestTrophies: 322473, brawlersInGame: 109, ranked: { rank: 'Gold II', elo: '2,196 Elo' }, bestRanked: 'Masters III' });
  });

  it('reads locale digits (the mapper formats with the browser locale)', () => {
    expect(bsOverviewFacts(stats({ stat4Sub: 'Best: ٤٢٬٠١٠' })).bestTrophies).toBe(42010);
  });

  it('leaves out what the mapper did not send', () => {
    expect(bsOverviewFacts(stats({ stat3Sub: '6 brawlers unlocked' }))).toEqual({
      bestTrophies: undefined, brawlersInGame: undefined, ranked: undefined, bestRanked: undefined,
    });
    expect(bsOverviewFacts(stats({}, [{ label: 'Ranked', value: 'BRONZE I' }])).ranked).toEqual({ rank: 'Bronze I', elo: undefined });
  });
});
