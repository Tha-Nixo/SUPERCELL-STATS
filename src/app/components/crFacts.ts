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

const DECIMAL_DIGIT = /^\p{Nd}$/u;

/** Value 0-9 of a Unicode decimal digit: its distance from the start of its run of ten. */
function digitValue(char: string): number {
  let run = 0;
  for (let cp = (char.codePointAt(0) ?? 0) - 1; cp >= 0 && DECIMAL_DIGIT.test(String.fromCodePoint(cp)); cp--) run++;
  return run % 10;
}

/**
 * Digits of a formatted integer. The data layer formats with the browser
 * locale, so besides any separator ("4.210", "4,210", "4 210", narrow no-break
 * space, Arabic thousands mark) the digits themselves may be Arabic-Indic,
 * Persian, Devanagari or fullwidth.
 */
export function parseCount(text: string | number | undefined): number | undefined {
  if (typeof text === 'number') return Number.isFinite(text) ? text : undefined;
  const digits = Array.from(text ?? '', (char) => (DECIMAL_DIGIT.test(char) ? digitValue(char) : '')).join('');
  return digits ? Number(digits) : undefined;
}

const extra = (stats: PlayerStats, label: string) => stats.extraStats?.find((s) => s.label === label)?.value;

export function crFacts(stats: PlayerStats): CRFacts {
  const [wins, losses] = (stats.statLabels?.stat1Sub ?? '').split(' · ');
  const clanTag = stats.gameVisuals?.cr?.clanTag;
  const clanLine = String(extra(stats, 'Clan') ?? '');
  const cut = clanLine.lastIndexOf(' · ');
  const clanName = cut < 0 ? clanLine : clanLine.slice(0, cut);
  const role = cut < 0 ? '' : clanLine.slice(cut + 3);
  return {
    wins: parseCount(wins),
    losses: parseCount(losses),
    threeCrownWins: parseCount(extra(stats, '3-Crown Wins')),
    bestTrophies: parseCount(stats.statLabels?.stat4Sub),
    donations: parseCount(extra(stats, 'Total Donations')),
    warDayWins: parseCount(extra(stats, 'War Day Wins')),
    clan: clanTag && clanName ? { name: clanName, tag: clanTag, role } : undefined,
  };
}
