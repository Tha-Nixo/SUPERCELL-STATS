import type { BSBattleLogItem, PlayerStats } from '../data/mockStats';
import { prettyMode } from '../services/supercellService';
import type { BattleResult } from '../ui/battleFilters';
import { titleCase } from '../ui/text';
import { parseCount } from './crFacts';
import type { BattleRow } from './MatchHistory';

const RESULTS: Record<string, BattleRow['result']> = { victory: 'win', defeat: 'loss', draw: 'draw' };

/** API battle time ("20261006T095500.000Z") as "Oct 6, 9:55 AM" in the visitor's time zone; '' when unreadable. */
export function battleTime(raw: string): string {
  const text = String(raw ?? '');
  const m = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  const d = new Date(m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : text);
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

/** True when every battle has a Showdown placement: such a list's outcomes are trophy gains or top-half finishes, not victories. */
export function placementBased(rows: readonly BattleRow[]): boolean {
  return rows.length > 0 && rows.every((b) => b.placement !== undefined);
}

/** Result filter labels for a placement-based list (the URL values stay win, loss, draw); undefined for any other list. */
export function bsResultLabels(rows: readonly BattleRow[]): Partial<Record<BattleResult, string>> | undefined {
  return placementBased(rows) ? { win: 'Gains', loss: 'Losses', draw: 'Even' } : undefined;
}

/** Result options to leave out of the filter: Showdown never sends a draw, so Even would sit at 0 for good. Judged on the selected mode, not on the result filter, so picking a result never resizes the card. */
export function bsHiddenResults(rows: readonly BattleRow[]): BattleResult[] {
  return placementBased(rows) && !rows.some((b) => b.result === 'draw') ? ['draw'] : [];
}

/**
 * Sub-line of a win rate tile. Showdown has no victories, so a Showdown-only
 * log says what the rate measures; any other log counts wins and losses.
 * `recent` is the overview (all recent battles), `mode` the Battles tab tile.
 */
export function winRateNote(rows: readonly BattleRow[], scope: 'recent' | 'mode'): string {
  if (placementBased(rows)) return 'Gain or top half';
  const s = battleSummary(rows);
  if (s.wins + s.losses === 0) return scope === 'recent' ? 'No recent wins or losses' : 'No wins or losses yet';
  return `${s.wins} W / ${s.losses} L${scope === 'recent' ? ', recent battles' : ''}`;
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

export interface BSOverviewFacts {
  bestTrophies?: number;
  /** Brawlers that exist in the game, when the catalogue could be fetched. */
  brawlersInGame?: number;
  /** Current Ranked rank and Elo, as the API names them ('Gold II', '2,196 Elo'). */
  ranked?: { rank: string; elo?: string };
  bestRanked?: string;
}

const extra = (stats: PlayerStats, label: string) => stats.extraStats?.find((s) => s.label === label)?.value;

/**
 * Overview figures the mapper hands over only inside display strings
 * ("Best: 42,010", "6/95 brawlers unlocked", "GOLD II · 2,196 Elo"). Everything
 * else the overview shows is read from raw numbers in gameVisuals.bs.
 */
export function bsOverviewFacts(stats: PlayerStats): BSOverviewFacts {
  const unlocked = String(stats.statLabels?.stat3Sub ?? '').split('/');
  const [rank, elo] = String(extra(stats, 'Ranked') ?? '').split(' · ');
  const best = extra(stats, 'Best Ranked (all time)');
  return {
    bestTrophies: parseCount(stats.statLabels?.stat4Sub),
    brawlersInGame: unlocked.length === 2 ? parseCount(unlocked[1]) : undefined,
    ranked: rank ? { rank: titleCase(rank), elo: elo || undefined } : undefined,
    bestRanked: best ? titleCase(String(best)) : undefined,
  };
}
