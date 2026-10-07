import type { BSBattleLogItem } from '../data/mockStats';
import { prettyMode } from '../services/supercellService';
import type { BattleRow } from './MatchHistory';

const RESULTS: Record<string, BattleRow['result']> = { victory: 'win', defeat: 'loss', draw: 'draw' };

/** API battle time ("20261006T095500.000Z") as "Oct 6, 9:55 AM" in the visitor's time zone; '' when unreadable. */
export function battleTime(raw: string): string {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  const d = new Date(m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : raw);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Seconds as "2m 5s", or "20s" under a minute. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}m ${seconds % 60}s` : `${seconds}s`;
}

/**
 * Every Brawl Stars battle the API returned (up to 25), newest first, as list
 * rows. The mapper's battle log already turned a Showdown placement into
 * victory/defeat (bsOutcome); a battle whose outcome could not be read has no
 * result and is listed as a draw, which the win rate leaves out as well.
 */
export function bsBattleRows(log: readonly BSBattleLogItem[] | undefined): BattleRow[] {
  return (log ?? []).map((b, i) => ({
    id: `bs-${i}`,
    mode: prettyMode(b.event.mode || b.battle.mode, 'brawl-stars'),
    result: RESULTS[b.battle.result ?? ''] ?? 'draw',
    score: typeof b.battle.trophyChange === 'number' ? b.battle.trophyChange : undefined,
    date: battleTime(b.battleTime),
    duration: b.battle.duration ? formatDuration(b.battle.duration) : '',
    map: b.event.map || undefined,
    placement: typeof b.battle.rank === 'number' ? b.battle.rank : undefined,
  }));
}

export interface BattleSummary {
  wins: number;
  losses: number;
  draws: number;
  /** Wins among wins + losses, rounded; undefined when there is neither (draws do not count). */
  winRate?: number;
  /** Sum of the trophy changes the API reported. */
  netTrophies: number;
  /** The mode with the most battles (ties: the most recent first), and how many. */
  topMode?: { mode: string; count: number };
}

/** Headline numbers of a list of battles (the Battles tab's tiles). Same rules as the mapper's bsWinStats. */
export function battleSummary(rows: readonly BattleRow[]): BattleSummary {
  const count = (r: BattleRow['result']) => rows.filter((b) => b.result === r).length;
  const wins = count('win');
  const losses = count('loss');
  const modes = new Map<string, number>();
  for (const b of rows) modes.set(b.mode, (modes.get(b.mode) ?? 0) + 1);
  const top = [...modes.entries()].reduce<[string, number] | undefined>((best, e) => (!best || e[1] > best[1] ? e : best), undefined);
  return {
    wins,
    losses,
    draws: count('draw'),
    winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : undefined,
    netTrophies: rows.reduce((sum, b) => sum + (b.score ?? 0), 0),
    topMode: top && { mode: top[0], count: top[1] },
  };
}
