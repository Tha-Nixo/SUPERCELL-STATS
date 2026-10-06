#!/usr/bin/env node
/**
 * Convert every PNG under public/images to WebP, capped at the size it is
 * actually rendered at.
 *
 * The Supercell fan-kit art ships at ~512px and up; the site draws most of it
 * into 48-64px tiles, so the repo was shipping ~16 MB to paint a few hundred
 * kilobytes of pixels. Icons get a 160px cap (2x the largest tile), hero art
 * keeps 640px.
 *
 * Idempotent: a PNG whose .webp already exists and is newer is skipped.
 * Run with --keep-png to convert without deleting the sources.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = path.join(ROOT, 'public', 'images');
const KEEP_PNG = process.argv.includes('--keep-png');

/** Directories whose art is only ever drawn as a small tile. */
const ICON_DIRS = ['coc', 'bs'];
const ICON_MAX = 160;
const HERO_MAX = 640;
const QUALITY = 82;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) yield full;
  }
}

function maxWidthFor(file) {
  const rel = path.relative(IMAGES, file);
  const top = rel.split(path.sep)[0];
  return ICON_DIRS.includes(top) ? ICON_MAX : HERO_MAX;
}

async function newer(a, b) {
  try {
    const [sa, sb] = await Promise.all([stat(a), stat(b)]);
    return sa.mtimeMs > sb.mtimeMs;
  } catch {
    return false;
  }
}

let converted = 0, skipped = 0, before = 0, after = 0;

for await (const png of walk(IMAGES)) {
  const webp = png.replace(/\.png$/i, '.webp');
  const srcSize = (await stat(png)).size;
  before += srcSize;

  if (await newer(webp, png)) {
    after += (await stat(webp)).size;
    skipped++;
    if (!KEEP_PNG) await unlink(png).catch(() => {});
    continue;
  }

  const cap = maxWidthFor(png);
  // Only downscale — never upscale a source that is already small.
  const scale = `scale='min(${cap},iw)':-2:flags=lanczos`;
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', png,
    '-vf', scale,
    '-c:v', 'libwebp', '-quality', String(QUALITY), '-compression_level', '6',
    '-frames:v', '1',
    webp,
  ]);

  after += (await stat(webp)).size;
  converted++;
  if (!KEEP_PNG) await unlink(png);
}

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`images: ${converted} converted, ${skipped} up to date`);
console.log(`size:   ${mb(before)} → ${mb(after)}  (${(100 - (after / before) * 100).toFixed(1)}% smaller)`);
