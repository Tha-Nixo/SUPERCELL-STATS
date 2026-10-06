#!/usr/bin/env node
/**
 * Post-build safety net. Fails the build rather than shipping a bad dist/.
 *
 *  1. No API token in the bundle. A key that reaches the browser is a key
 *     anyone can lift and spend against the owner's quota.
 *  2. No stray PNG. public/images is a WebP pipeline now; a PNG creeping back
 *     in is how 16 MB of art returned last time.
 *  3. Report the entry-chunk weight, so a regression in chunking is visible in
 *     the build log instead of in someone's data plan.
 *  4. Enforce the performance budget in scripts/bundle-budget.json (restyle
 *     spec, "Performance budget"): gzip size of the JS reachable from
 *     dist/index.html, of the JS needed to render a player page, of the entry
 *     chunk and of the CSS, plus the preloaded fonts. Any line over its limit
 *     fails the build and prints the delta.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closure, closureOf, evaluate, gzipBytes, preloadedFonts, toKB } from './bundle-budget-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const JWT = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;
const failures = [];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const chunks = [];
for await (const file of walk(DIST)) {
  const rel = path.relative(DIST, file);
  const ext = path.extname(file).toLowerCase();

  if (['.js', '.css', '.html', '.json', '.webmanifest', '.txt'].includes(ext)) {
    const text = await readFile(file, 'utf8');
    if (JWT.test(text)) failures.push(`API token found in ${rel}`);
  }

  if (ext === '.png' && rel.startsWith('images')) {
    failures.push(`unoptimised PNG shipped: ${rel}`);
  }

  if (ext === '.js') chunks.push({ rel, size: (await stat(file)).size });
}

chunks.sort((a, b) => b.size - a.size);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log('largest JS chunks:');
for (const c of chunks.slice(0, 5)) console.log(`  ${kb(c.size).padStart(8)}  ${c.rel}`);

const entry = chunks.find((c) => /assets\/index-[^/]+\.js$/.test(c.rel));
if (entry) console.log(`entry chunk: ${kb(entry.size)}`);

// ── performance budget ──────────────────────────────────────────────────────
const budget = JSON.parse(await readFile(path.join(ROOT, 'scripts/bundle-budget.json'), 'utf8'));
let manifest = null;
try {
  manifest = JSON.parse(await readFile(path.join(DIST, '.vite/manifest.json'), 'utf8'));
} catch {
  failures.push('dist/.vite/manifest.json missing: build.manifest must stay enabled in vite.config.ts');
}

if (manifest) {
  const gzipOf = async (files) => {
    let total = 0;
    for (const file of files) total += gzipBytes(await readFile(path.join(DIST, file)));
    return toKB(total);
  };
  const measured = {};
  // Each line is measured on its own: one stale reference must not hide the others.
  const measure = async (line, fn) => {
    try {
      measured[line] = await fn();
    } catch (e) {
      failures.push(e.message);
    }
  };
  await measure('initialJs', () => gzipOf(closure(manifest, 'index.html')));
  await measure('entryJs', () => gzipOf([manifest['index.html'].file]));
  // A player page needs the initial JS, the route chunk(s) and the heaviest
  // per-game module (each game page loads only its own).
  await measure('playerPageJs', async () => {
    const routeRefs = ['index.html', ...budget.playerPageEntries];
    const variants = budget.gameModules.length ? budget.gameModules.map((mod) => [...routeRefs, mod]) : [routeRefs];
    let max = 0;
    for (const refs of variants) max = Math.max(max, await gzipOf(closureOf(manifest, refs)));
    return max;
  });
  await measure('css', () => gzipOf(new Set(Object.values(manifest).flatMap((chunk) => chunk.css ?? []))));

  const html = await readFile(path.join(DIST, 'index.html'), 'utf8');
  let fontBytes = 0;
  for (const href of preloadedFonts(html)) {
    if (!budget.allowedPreloadFonts.includes(href)) failures.push(`unexpected font on the critical path: ${href}`);
    fontBytes += (await stat(path.join(DIST, href))).size;
  }
  measured.fonts = toKB(fontBytes);

  console.log('\nperformance budget (kB, gzip; fonts raw):');
  for (const row of evaluate(measured, budget)) {
    const delta = Number.isNaN(row.delta) ? '' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(2)}`;
    console.log(`  ${row.ok ? '✓' : '✗'} ${row.line.padEnd(13)} ${String(row.value).padStart(7)} / ${String(row.limit).padStart(7)}  ${delta}`);
    if (!row.ok) failures.push(`${row.line} ${row.reason}: ${row.value} kB > ${row.limit} kB (${delta} kB)`);
  }
}

if (failures.length) {
  console.error('\nbuild check FAILED:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('build check passed');
