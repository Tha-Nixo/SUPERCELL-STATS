/**
 * Battles tab filters (mode, result), kept in the URL next to ?tab=battles:
 * `?tab=battles&mode=ladder&result=loss`. Pure functions, no React.
 *
 * Rules: "all" is written as no parameter; an unknown mode or result falls
 * back to "all" without rewriting the URL (same rule as ?tab=); the shell
 * drops both parameters whenever the tab changes (BATTLE_FILTER_PARAMS).
 */

export type BattleResult = 'win' | 'loss' | 'draw';
export type ResultFilter = 'all' | BattleResult;
export const RESULT_FILTERS: readonly ResultFilter[] = ['all', 'win', 'loss', 'draw'];

/** URL parameters owned by the Battles tab. */
export const BATTLE_FILTER_PARAMS = ['mode', 'result'] as const;

/** The two fields the filters read; the app's `Match` has both. */
export interface BattleLike {
  mode: string;
  result: BattleResult;
}

export interface BattleFilters {
  /** A mode slug from `battleModes`, or 'all'. */
  mode: string;
  result: ResultFilter;
}

export const NO_FILTERS: BattleFilters = { mode: 'all', result: 'all' };

export interface ModeOption {
  slug: string;
  label: string;
  /** Battles of this mode that also match the current result filter. */
  count: number;
}

/**
 * Which counter a battle's trophy change belongs to. Path of Legend trophies
 * are a separate counter from the Trophy Road total shown in the header.
 */
export function trophyLabel(mode: string): string {
  return mode === 'Path of Legend' ? 'Path of Legend trophies' : 'Trophies';
}

/** Short visible tag for a counter that is not the Trophy Road total; null when the plain number is the Trophy Road one. */
export function trophyQualifier(mode: string): string | null {
  return mode === 'Path of Legend' ? 'PoL' : null;
}

/**
 * Why a Showdown row (one with a placement) is green or red. The outcome is the
 * game's trophy verdict (trophy sign first, then the top half of the entrants),
 * not a victory, so rows say that instead of "Win"/"Loss". Undefined without a placement.
 */
export function placementVerdict(b: { result: BattleResult; score?: number; placement?: number }): string | undefined {
  if (b.placement === undefined || b.result === 'draw') return b.placement === undefined ? undefined : 'Draw';
  if (b.score) return b.score > 0 ? 'Trophy gain' : 'Trophy loss';
  return b.result === 'win' ? 'Top half' : 'Bottom half';
}

/** URL-safe id of a mode label: 'Path of Legend' -> 'path-of-legend'. Never 'all'. */
export function modeSlug(mode: string): string {
  const slug = mode
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return 'other';
  return slug === 'all' ? 'all-mode' : slug;
}

/**
 * The modes present in `battles`, most played first (ties by label), each
 * counted among the battles that match `result`. A mode with no battle for
 * that result stays listed with count 0, so the controls never move.
 */
export function battleModes(battles: readonly BattleLike[], result: ResultFilter = 'all'): ModeOption[] {
  const seen = new Map<string, { label: string; total: number; count: number }>();
  for (const b of battles) {
    const slug = modeSlug(b.mode);
    const entry = seen.get(slug) ?? { label: b.mode, total: 0, count: 0 };
    entry.total += 1;
    if (result === 'all' || b.result === result) entry.count += 1;
    seen.set(slug, entry);
  }
  return [...seen.entries()]
    .sort(([, a], [, b]) => b.total - a.total || a.label.localeCompare(b.label))
    .map(([slug, { label, count }]) => ({ slug, label, count }));
}

/** How many battles of the selected mode ended in each result ('all' = every result). */
export function resultCounts(battles: readonly BattleLike[], mode: string): Record<ResultFilter, number> {
  const counts: Record<ResultFilter, number> = { all: 0, win: 0, loss: 0, draw: 0 };
  for (const b of battles) {
    if (mode !== 'all' && modeSlug(b.mode) !== mode) continue;
    counts.all += 1;
    counts[b.result] += 1;
  }
  return counts;
}

/** The filters named in `search`; anything missing or unknown is 'all'. */
export function parseBattleFilters(search: string, modes: readonly ModeOption[]): BattleFilters {
  const params = new URLSearchParams(search);
  const mode = params.get('mode')?.trim().toLowerCase() ?? '';
  const result = params.get('result')?.trim().toLowerCase() ?? '';
  return {
    mode: modes.some((m) => m.slug === mode) ? mode : 'all',
    result: (RESULT_FILTERS as readonly string[]).includes(result) ? (result as ResultFilter) : 'all',
  };
}

/** `search` with the filters written in (defaults removed); other parameters kept. Returns '' or '?…'. */
export function withBattleFilters(search: string, filters: BattleFilters): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of [['mode', filters.mode], ['result', filters.result]] as const) {
    if (value === 'all') params.delete(key);
    else params.set(key, value);
  }
  const next = params.toString();
  return next ? `?${next}` : '';
}

/** The filters of `search` worth putting in a shared link: valid for these modes and not 'all'. */
export function shareableFilters(search: string, modes: readonly ModeOption[]): Record<string, string> {
  const { mode, result } = parseBattleFilters(search, modes);
  const out: Record<string, string> = {};
  if (mode !== 'all') out.mode = mode;
  if (result !== 'all') out.result = result;
  return out;
}

export function filterBattles<T extends BattleLike>(battles: readonly T[], filters: BattleFilters): T[] {
  return battles.filter(
    (b) => (filters.mode === 'all' || modeSlug(b.mode) === filters.mode) && (filters.result === 'all' || b.result === filters.result),
  );
}

/** How many battles the overview lists; the Battles tab shows all of them. */
export const LATEST_BATTLES = 5;

export function latestBattles<T>(battles: readonly T[]): T[] {
  return battles.slice(0, LATEST_BATTLES);
}
