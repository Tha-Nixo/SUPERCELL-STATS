/**
 * The selected section of a player page lives in the URL (?tab=<id>), so it
 * can be linked, survives a reload and comes back with the back button.
 */

/** The tab named by `?tab=` in `search`, or `fallback` when it is missing or unknown. */
export function parseTab(search: string, validIds: readonly string[], fallback: string): string {
  const raw = new URLSearchParams(search).get('tab');
  const id = raw?.trim().toLowerCase();
  return id && validIds.includes(id) ? id : fallback;
}

/**
 * `search` with `?tab=` set to `id`; the default tab is written as no
 * parameter at all, so the plain player URL stays canonical. Other
 * parameters are kept. Returns '' or a string starting with '?'.
 */
export function withTab(search: string, id: string, defaultId: string): string {
  const params = new URLSearchParams(search);
  if (id === defaultId) params.delete('tab');
  else params.set('tab', id);
  const next = params.toString();
  return next ? `?${next}` : '';
}
