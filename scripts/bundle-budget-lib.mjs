/**
 * Pure helpers behind the performance budget in scripts/check-bundle.mjs.
 * Kept free of file-system access so Vitest can exercise them directly.
 */
import { gzipSync } from 'node:zlib';

/** Bytes to kB (1000 bytes, the unit Vite prints and the spec's table uses), 2 decimals. */
export const toKB = (bytes) => Math.round(bytes / 10) / 100;

/** gzip size of a buffer at the highest level, as a CDN would serve it. */
export const gzipBytes = (buf) => gzipSync(buf, { level: 9 }).length;

/**
 * Manifest key for a budget reference: an exact key ("index.html"), a source
 * path, or the name of a lazily loaded chunk ("GamePage"). Vite keys a chunk
 * by its source path only while no other chunk imports it, so names are the
 * stable way to refer to route chunks.
 */
export function resolveKey(manifest, ref) {
  if (manifest[ref]) return ref;
  const matches = Object.entries(manifest)
    .filter(([, chunk]) => chunk.src === ref || (chunk.isDynamicEntry && chunk.name === ref))
    .map(([key]) => key);
  if (matches.length !== 1) {
    throw new Error(`"${ref}" matches ${matches.length} chunks in the Vite manifest; update scripts/bundle-budget.json`);
  }
  return matches[0];
}

/**
 * Every chunk file statically reachable from a budget reference in a Vite
 * manifest, the referenced chunk's own file included. Dynamic imports are not followed: they are not
 * needed to render the route that owns `key`.
 */
export function closure(manifest, ref) {
  const key = resolveKey(manifest, ref);
  const files = new Set();
  const seen = new Set();
  const stack = [key];
  while (stack.length) {
    const k = stack.pop();
    if (seen.has(k)) continue;
    seen.add(k);
    const chunk = manifest[k];
    if (!chunk) throw new Error(`manifest entry "${k}" is imported but missing`);
    files.add(chunk.file);
    for (const dep of chunk.imports ?? []) stack.push(dep);
  }
  return files;
}

/** Union of the closures of several budget references. */
export function closureOf(manifest, refs) {
  const all = new Set();
  for (const ref of refs) for (const file of closure(manifest, ref)) all.add(file);
  return all;
}

/** href of every <link rel="preload" as="font"> in an HTML document, in document order. */
export function preloadedFonts(html) {
  const out = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel=["']?preload\b/i.test(tag) || !/\bas=["']?font\b/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i);
    if (href) out.push(href[1]);
  }
  return out;
}

/**
 * Compare measured sizes (kB) with the budget file. One row per budget line.
 * The limit of a line is the lower of its absolute budget and, unless the line
 * is exempt, phaseStart × (1 + maxPhaseGrowth).
 */
export function evaluate(measured, budget) {
  return Object.entries(budget.budgets).map(([line, absolute]) => {
    const value = measured[line];
    const start = budget.phaseStart?.[line];
    const exempt = (budget.phaseGrowthExempt ?? []).includes(line);
    const phaseCap = typeof start === 'number' && !exempt
      ? Math.round(start * (1 + budget.maxPhaseGrowth) * 100) / 100
      : Infinity;
    const limit = Math.min(absolute, phaseCap);
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return { line, value: NaN, limit, delta: NaN, ok: false, reason: 'not measured' };
    }
    const ok = value <= limit;
    const reason = ok ? '' : value > absolute ? 'over budget' : 'over the per-phase growth cap';
    return { line, value, limit, delta: Math.round((value - limit) * 100) / 100, ok, reason };
  });
}

/**
 * Compare the fonts preloaded by index.html with the allow-list. An empty
 * preload set always fails: it means the link regex stopped matching (or the
 * preload was removed) and "fonts" would otherwise measure 0 and pass.
 */
export function compareFontSets(found, allowed) {
  const missing = allowed.filter((f) => !found.includes(f));
  const extra = found.filter((f) => !allowed.includes(f));
  return { ok: found.length > 0 && missing.length === 0 && extra.length === 0, missing, extra };
}

/** A measured set of files must not be empty: zero files is "not measured", not "0 kB". */
export function nonEmptyFiles(files, label) {
  if (files.size === 0) throw new Error(`no ${label} measured`);
  return files;
}

/** Largest value of `measure` over the variants; no variants is an error, not 0. */
export async function maxOfVariants(variants, measure) {
  if (!variants.length) throw new Error('no variants to measure');
  let max = -Infinity;
  for (const v of variants) max = Math.max(max, await measure(v));
  return max;
}

const KNOWN_KEYS = ['$comment', 'phase', 'budgets', 'maxPhaseGrowth', 'phaseGrowthExempt', 'phaseStart', 'playerPageEntries', 'gameModules', 'allowedPreloadFonts'];
const BUDGET_LINES = ['initialJs', 'playerPageJs', 'entryJs', 'css', 'fonts'];
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

/**
 * Shape check of scripts/bundle-budget.json. Returns a list of readable
 * problems (empty = valid). Every budget line needs a numeric limit and a
 * numeric phaseStart unless it is listed in phaseGrowthExempt.
 */
export function validateConfig(cfg) {
  const errors = [];
  if (!isObj(cfg)) return ['budget config must be a JSON object'];
  for (const key of Object.keys(cfg)) if (!KNOWN_KEYS.includes(key)) errors.push(`unknown key "${key}"`);

  const exempt = Array.isArray(cfg.phaseGrowthExempt) ? cfg.phaseGrowthExempt : [];
  if (cfg.phaseGrowthExempt !== undefined && !Array.isArray(cfg.phaseGrowthExempt)) errors.push('phaseGrowthExempt must be an array');
  if (!isNum(cfg.maxPhaseGrowth)) errors.push('maxPhaseGrowth must be a number');

  if (!isObj(cfg.budgets)) {
    errors.push('budgets must be an object');
  } else {
    for (const line of Object.keys(cfg.budgets)) if (!BUDGET_LINES.includes(line)) errors.push(`unknown budget line "${line}"`);
    for (const line of BUDGET_LINES) if (!(line in cfg.budgets)) errors.push(`budgets.${line} is missing`);
    for (const [line, limit] of Object.entries(cfg.budgets)) if (!isNum(limit)) errors.push(`budgets.${line} must be a number`);
    for (const line of exempt) if (!(line in cfg.budgets)) errors.push(`phaseGrowthExempt names "${line}", which has no budget`);
    if (!isObj(cfg.phaseStart)) {
      errors.push('phaseStart must be an object');
    } else {
      for (const line of Object.keys(cfg.budgets)) {
        if (!exempt.includes(line) && !isNum(cfg.phaseStart[line])) errors.push(`phaseStart.${line} must be a number (or list "${line}" in phaseGrowthExempt)`);
      }
    }
  }

  if (!Array.isArray(cfg.playerPageEntries) || cfg.playerPageEntries.length === 0) errors.push('playerPageEntries must be a non-empty array');
  if (!Array.isArray(cfg.gameModules)) errors.push('gameModules must be an array (may be empty)');
  if (!Array.isArray(cfg.allowedPreloadFonts) || cfg.allowedPreloadFonts.length === 0) errors.push('allowedPreloadFonts must be a non-empty array');
  return errors;
}
