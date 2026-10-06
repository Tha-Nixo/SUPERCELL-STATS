# Supercell Stats

Player statistics website for Supercell games — search any player by tag and get live stats from the official Supercell developer APIs.

**Supported games:** Clash Royale · Brawl Stars · Clash of Clans

## Features

- 🔍 Player search by tag (with validation and `O→0` normalization)
- 📊 Full profile views: trophies, win rates, battle history
- 👑 Clash Royale: current deck, card collection with levels/progress, badges, achievements, Path of Legend
- ⭐ Brawl Stars: brawler grid (power, gadgets, star powers, gears, hypercharges), club info, battle log
- 🏰 Clash of Clans: heroes & equipment, army (troops/spells/sieges/pets), achievements, legend statistics
- 🔗 Every player has a URL (`/game/<game>/player/<tag>`) — shareable, bookmarkable, back-button safe
- 📈 Trophy trend rebuilt from the battle log, with crosshair tooltip and a table view
- 🕐 Recent searches saved locally, per game
- 🟡 Clear "Demo data" badge when running without API keys

## Tech stack

React 18 · TypeScript · Vite 7 · Tailwind CSS 4 · React Router 7 · Motion

Charts are hand-rolled SVG: the one trend chart on the site did not justify the
528 KB that Recharts and its d3 dependencies were adding to every page load.

## Getting started

```bash
git clone https://github.com/Tha-Nixo/SUPERCELL-STATS.git
cd SUPERCELL-STATS
npm install
cp .env.example .env   # then fill in your API keys
npm run dev
```

Get your API keys from the Supercell developer portals (keys are bound to your public IP):

- https://developer.clashroyale.com
- https://developer.brawlstars.com
- https://developer.clashofclans.com

Without keys the site still runs and shows clearly-labeled demo data.

For a step-by-step guide in Italian, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

## How API calls work (important)

The browser cannot call the Supercell APIs directly: CORS blocks it, and the keys
are bound to a single IP. So `/api/<game>/*` is always a proxy — what changes is
who holds the key.

| | Proxy | Key lives |
|---|---|---|
| **Development** | Vite dev server → RoyaleAPI relay | `.env`, sent from the browser (`VITE_*`, so it *is* in the dev bundle — never deploy this way) |
| **Production** | Caddy → RoyaleAPI relay | server-side only; the client sends no `Authorization` header at all |

`npm run preview` serves the production build, which by design carries no key, so
its `/api` requests are proxied to the deployed origin. That makes a release
testable against real data before it goes out.

See [DEPLOY.md](./DEPLOY.md) for the production topology and
[docs/SERVER-HARDENING.md](./docs/SERVER-HARDENING.md) for key handling, rate
limiting and response headers on the server.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with API proxy on http://localhost:5173 |
| `npm run build` | Type-check, build to `dist/`, emit per-route HTML shells, then run the bundle checks |
| `npm run preview` | Serve the production build locally, proxying `/api` to the deployed origin |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run images` | Re-run the WebP pipeline over `public/images` (needs `ffmpeg`) |

`npm run build` fails the build if an API token or an unoptimised PNG ends up in
`dist/`, and prints the largest JS chunks so a chunking regression shows up in the
build log.

### Assets

Game art is stored as WebP, capped at the size it is actually drawn at (160px for
tiles, 640px for hero art) — 15.5 MB of source PNGs compile to 1.1 MB. Add new PNGs
to `public/images`, then:

```bash
npm run images                    # convert and replace
node scripts/gen-icon-index.mjs   # refresh the Clash of Clans icon index
```

## Legal

This material is unofficial and is not endorsed by Supercell. For more information see [Supercell's Fan Content Policy](https://www.supercell.com/fan-content-policy).
