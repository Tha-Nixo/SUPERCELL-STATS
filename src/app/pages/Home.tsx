import { useState } from 'react';
import { Link } from 'react-router';
import { Trophy } from 'lucide-react';
import { games, getGameById, type GameTheme } from '../data/games';
import { getRecentSearches } from '../services/recentSearches';
import { SearchBox } from '../ui/SearchBox';
import { SiteFooter } from '../ui/SiteFooter';

// Official Supercell Fan Kit art. width/height are the intrinsic asset sizes,
// so the browser reserves the box before the image streams in.
const GAME_ART: Record<string, { src: string; width: number; height: number }> = {
  'clash-royale': { src: '/images/characters/cr_character.webp', width: 512, height: 512 },
  'brawl-stars': { src: '/images/bs/shelly_model.webp', width: 160, height: 322 },
  'clash-of-clans': { src: '/images/characters/coc_character.webp', width: 512, height: 512 },
};

// Game logos: width/height are the h-12 rendered box.
const GAME_LOGOS: Record<string, { src: string; width: number; height: number }> = {
  'clash-royale': { src: '/images/logos/cr_logo.webp', width: 96, height: 48 },
  'brawl-stars': { src: '/images/logos/bs_logo.webp', width: 59, height: 48 },
  'clash-of-clans': { src: '/images/logos/coc_logo.webp', width: 105, height: 48 },
};

function GameCard({ game, first }: { game: GameTheme; first: boolean }) {
  const art = GAME_ART[game.id];
  const logo = GAME_LOGOS[game.id];
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-1 p-5 shadow-card transition-colors duration-150 focus-within:border-line-strong hover:border-line-strong sm:p-6">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
      {art && (
        <img
          src={art.src}
          alt=""
          width={art.width}
          height={art.height}
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute -right-4 -bottom-6 h-44 w-auto opacity-15 select-none"
        />
      )}
      <div className="relative flex items-center gap-4">
        {logo && (
          <div className="flex h-12 w-28 shrink-0 items-center justify-center">
            <img
              src={logo.src}
              alt=""
              width={logo.width}
              height={logo.height}
              decoding="async"
              className="h-12 w-auto object-contain"
            />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-tight font-normal text-fg">
            <Link to={`/game/${game.id}`} className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-accent">
              {game.name}
            </Link>
          </h2>
          <p className="text-sm text-fg-muted">{game.tagline}</p>
        </div>
      </div>
      <SearchBox className="relative mt-auto pt-6" gameId={game.id} label={`${game.name} player tag`} size="lg" shortcut={first} />
    </article>
  );
}

function RecentSearchesRow() {
  const [recent] = useState(() =>
    getRecentSearches()
      .filter((r) => getGameById(r.gameId))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8),
  );
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading" className="mt-12">
      <h2 id="recent-heading" className="text-sm font-semibold text-fg">Recent searches</h2>
      <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {recent.map((r) => (
          <li key={`${r.gameId}-${r.tag}`} data-game={r.gameId} className="shrink-0">
            <Link
              to={`/game/${r.gameId}/player/${r.tag.replace(/^#/, '')}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-surface-1 py-1 pr-4 pl-1.5 text-sm text-fg transition-colors duration-150 hover:border-line-strong"
            >
              <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                {getGameById(r.gameId)!.shortName}
              </span>
              <span className="max-w-48 truncate font-medium">{r.username}</span>
              {r.trophies > 0 && (
                <span className="inline-flex items-center gap-1 text-fg-subtle tabular-nums">
                  <Trophy aria-hidden="true" className="size-3.5" />
                  {r.trophies.toLocaleString()}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="pt-12 pb-8 sm:pt-20 sm:pb-12">
          <h1 className="flex items-center gap-3 font-display text-title font-normal text-fg sm:text-display">
            <img
              src="/images/logos/supercell_logo.webp"
              alt="Supercell"
              width={74}
              height={60}
              decoding="async"
              fetchPriority="high"
              className="h-10 w-auto sm:h-12"
            />
            <span>Stats</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-balance text-fg-muted sm:text-xl">
            Live player stats for Clash Royale, Brawl Stars and Clash of Clans. Search any player by tag.
          </p>
        </section>

        <section aria-label="Games">
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {games.map((game, i) => (
              <li key={game.id} data-game={game.id}>
                <GameCard game={game} first={i === 0} />
              </li>
            ))}
          </ul>
        </section>

        <RecentSearchesRow />
      </main>
      <SiteFooter />
    </div>
  );
}
