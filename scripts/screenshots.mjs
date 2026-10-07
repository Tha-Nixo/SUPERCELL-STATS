#!/usr/bin/env node
/**
 * Review screenshots (restyle spec, "Acceptance"): Home, one player page per
 * game and every Clash of Clans tab, at 390, 768 and 1440 px, written to
 * docs/screenshots/<phase>/. Pages render in UTC with an en-US locale, so
 * battle times are stable.
 *
 *   npm run build && npm run screenshots              # fixtures, local preview
 *   SCREENSHOT_ONLY=clash-of-clans npm run screenshots   # only pages whose name starts with it
 *   E2E_CR_TAG=... E2E_BS_TAG=... E2E_COC_TAG=... npm run screenshots
 *                                                     # real players via the preview's API proxy
 *   BASE_URL=https://supercellstats.com npm run screenshots   # production
 *   SCREENSHOT_DIR=/some/tmp/dir ...                  # write elsewhere (live-data shots show the
 *                                                     # real tag: never commit them)
 *
 * Player pages use the e2e fixtures (e2e/support/) unless the game's E2E_*_TAG
 * is set. Real tags are read from the environment only, never written to disk.
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { FIXTURE_TAG, mockApi } from '../e2e/support/mockApi.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.env.SCREENSHOT_PHASE ?? 'phase4';
const OUT = process.env.SCREENSHOT_DIR ? path.resolve(process.env.SCREENSHOT_DIR) : path.join(ROOT, 'docs/screenshots', PHASE);
const WIDTHS = [390, 768, 1440];
const PORT = 4173;

const COC = { game: 'clash-of-clans', env: 'E2E_COC_TAG' };
const ALL_PAGES = [
  { name: 'home', path: () => '/' },
  { name: 'clash-royale', game: 'clash-royale', env: 'E2E_CR_TAG', search: '' },
  { name: 'brawl-stars', game: 'brawl-stars', env: 'E2E_BS_TAG', search: '' },
  { name: 'clash-of-clans', ...COC, search: '' },
  { name: 'clash-of-clans-army', ...COC, search: '?tab=army' },
  { name: 'clash-of-clans-heroes', ...COC, search: '?tab=heroes' },
  { name: 'clash-of-clans-achievements', ...COC, search: '?tab=achievements' },
];
const ONLY = process.env.SCREENSHOT_ONLY;
const PAGES = ONLY ? ALL_PAGES.filter((p) => p.name.startsWith(ONLY)) : ALL_PAGES;
if (PAGES.length === 0) throw new Error(`SCREENSHOT_ONLY=${ONLY} matches no page`);

/** `vite preview` on the built dist/, run with node directly so kill() really stops it. */
async function startPreview() {
  const vite = path.join(ROOT, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`vite preview exited with ${child.exitCode} (is port ${PORT} busy?)`);
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) return child;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill();
  throw new Error('vite preview did not start within 30s');
}

const base = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const preview = process.env.BASE_URL ? null : await startPreview();
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

try {
  for (const entry of PAGES) {
    const realTag = entry.env ? process.env[entry.env]?.replace(/^#/, '') : undefined;
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce', timezoneId: 'UTC', locale: 'en-US' });
      if (entry.game && !realTag) await mockApi(page);
      const url = entry.game ? `/game/${entry.game}/player/${encodeURIComponent(realTag ?? FIXTURE_TAG)}${entry.search}` : entry.path();
      await page.goto(base + url, { waitUntil: 'networkidle' });
      if (entry.game) {
        await page.getByTestId('player-summary').waitFor({ timeout: 15000 });
        await page.getByTestId('panel-skeleton').waitFor({ state: 'detached', timeout: 15000 });
      }
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(OUT, `${entry.name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`wrote ${path.relative(ROOT, file)}${entry.game ? (realTag ? ' (live data)' : ' (fixtures)') : ''}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  preview?.kill();
}
