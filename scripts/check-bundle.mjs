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
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

if (failures.length) {
  console.error('\nbuild check FAILED:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('build check passed');
