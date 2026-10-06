#!/usr/bin/env node
/**
 * Emit a per-route HTML shell so each game page has its own <head>.
 *
 * The app is a single-page build: every URL served the identical index.html,
 * so search engines saw four copies of one page and a link pasted in Discord
 * or WhatsApp always unfurled the same generic card. Crawlers and unfurlers do
 * not run JavaScript, so a client-side head manager cannot fix this — the
 * markup has to differ before it is served.
 *
 * Produces dist/game/<id>/index.html for each game. Serving them needs Caddy's
 * try_files to check {path}/index.html before falling back to /index.html:
 *
 *     try_files {path} {path}/index.html /index.html
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ORIGIN = 'https://supercellstats.com';

const ROUTES = [
  {
    path: 'game/clash-royale',
    title: 'Clash Royale Stats — search any player by tag',
    description:
      'Live Clash Royale player stats: trophies, current deck, card levels, badges, Path of Legend and battle history, straight from the official Supercell API.',
  },
  {
    path: 'game/brawl-stars',
    title: 'Brawl Stars Stats — search any player by tag',
    description:
      'Live Brawl Stars player stats: trophies, every brawler with power, gadgets, star powers, gears and hypercharges, club info and battle log.',
  },
  {
    path: 'game/clash-of-clans',
    title: 'Clash of Clans Stats — search any player by tag',
    description:
      'Live Clash of Clans player stats: Town Hall, heroes and equipment, full army, achievements, war stars and legend league statistics.',
  },
];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replace the content of a meta tag matched by attribute, or leave the doc untouched. */
function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, 'i');
  return html.replace(re, `$1${escape(value)}$2`);
}

const base = await readFile(path.join(DIST, 'index.html'), 'utf8');

for (const route of ROUTES) {
  const url = `${ORIGIN}/${route.path}`;
  let html = base
    .replace(/<title>[^<]*<\/title>/i, `<title>${escape(route.title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/i, `$1${url}$2`);

  html = setMeta(html, 'name', 'description', route.description);
  html = setMeta(html, 'property', 'og:title', route.title);
  html = setMeta(html, 'property', 'og:description', route.description);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'name', 'twitter:title', route.title);
  html = setMeta(html, 'name', 'twitter:description', route.description);

  const dir = path.join(DIST, route.path);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), html);
  console.log(`shell: /${route.path}/index.html`);
}
