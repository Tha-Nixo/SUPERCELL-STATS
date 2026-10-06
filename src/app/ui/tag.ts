/**
 * Player-tag helpers for the search boxes. They mirror normalizeTag and
 * isValidTag in services/supercellService.ts (ui/__tests__/tag.test.ts keeps
 * them in step) so Home, which ships in the entry chunk, does not pull in the
 * whole API service.
 */
const TAG_CHARSET = /^[0289PYLQGRJCUV]+$/;

/** "  #o2pp " -> "02PP": the bare form used in player URLs. */
export function tagSlug(input: string): string {
  return input.trim().toUpperCase().replace(/^#/, '').replace(/O/g, '0');
}

export function isPlausibleTag(input: string): boolean {
  const t = tagSlug(input);
  return t.length >= 3 && t.length <= 14 && TAG_CHARSET.test(t);
}

export const TAG_HINT = 'Player tags use only 0 2 8 9 P Y L Q G R J C U V.';
