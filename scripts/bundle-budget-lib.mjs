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
