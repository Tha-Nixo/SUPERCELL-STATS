# Supercell Stats

Player statistics website for Supercell games — search any player by tag and get live stats from the official Supercell developer APIs.

**Supported games:** Clash Royale · Brawl Stars · Clash of Clans

## Features

- 🔍 Player search by tag (with validation and `O→0` normalization)
- 📊 Full profile views: trophies, win rates, battle history
- 👑 Clash Royale: current deck, card collection with levels/progress, badges, achievements, Path of Legend
- ⭐ Brawl Stars: brawler grid (power, gadgets, star powers, gears, hypercharges), club info, battle log
- 🏰 Clash of Clans: heroes & equipment, army (troops/spells/sieges/pets), achievements, legend statistics
- 🕐 Recent searches saved locally
- 🟡 Clear "Demo data" badge when running without API keys

## Tech stack

React 18 · TypeScript · Vite 7 · Tailwind CSS 4 · React Router 7 · Motion · Recharts

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

The browser cannot call the Supercell APIs directly (CORS + IP-bound keys). In development, the Vite dev server proxies `/api/<game>/*` to the real APIs and injects nothing — the key travels from the client. This works locally but:

- ⚠️ keys prefixed with `VITE_` end up in the JS bundle (see issue [#2](https://github.com/Tha-Nixo/SUPERCELL-STATS/issues/2))
- ⚠️ a production build has no proxy at all (see issue [#3](https://github.com/Tha-Nixo/SUPERCELL-STATS/issues/3))

**A small backend proxy is required for any real deployment.** Until then, treat this project as local-only.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with API proxy on http://localhost:5173 |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build locally (no API proxy) |

## Legal

This material is unofficial and is not endorsed by Supercell. For more information see [Supercell's Fan Content Policy](https://www.supercell.com/fan-content-policy).
