import type { PlayerStats } from '../data/mockStats';

/**
 * Numbers the Clash Royale overview needs that the API mapper only hands over
 * inside display strings ("4,210 wins · 3,388 losses", a crown emoji after a count). The data
 * layer is frozen for the restyle, so they are read back here, in one tested
 * place, instead of being split ad hoc inside JSX.
 */
export interface CRFacts {
  wins?: number;
  losses?: number;
  threeCrownWins?: number;
  bestTrophies?: number;
  donations?: number;
  warDayWins?: number;
  /** Present only when the player is in a clan. */
  clan?: { name: string; tag: string; role: string };
}

/** Digits of a formatted integer, whatever the locale's separators ("4.210", "4,210", "4 210"). */
export function parseCount(text: string | number | undefined): number | undefined {
  if (typeof text === 'number') return Number.isFinite(text) ? text : undefined;
  const digits = text?.replace(/\D/g, '');
  return digits ? Number(digits) : undefined;
}

const extra = (stats: PlayerStats, label: string) => stats.extraStats?.find((s) => s.label === label)?.value;

export function crFacts(stats: PlayerStats): CRFacts {
  const [wins, losses] = (stats.statLabels?.stat1Sub ?? '').split(' · ');
  const clanTag = stats.gameVisuals?.cr?.clanTag;
  const [clanName, role] = String(extra(stats, 'Clan') ?? '').split(' · ');
  return {
    wins: parseCount(wins),
    losses: parseCount(losses),
    threeCrownWins: parseCount(extra(stats, '3-Crown Wins')),
    bestTrophies: parseCount(stats.statLabels?.stat4Sub),
    donations: parseCount(extra(stats, 'Total Donations')),
    warDayWins: parseCount(extra(stats, 'War Day Wins')),
    clan: clanTag && clanName ? { name: clanName, tag: clanTag, role: role ?? '' } : undefined,
  };
}
