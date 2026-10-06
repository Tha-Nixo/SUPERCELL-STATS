import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Search, X } from 'lucide-react';
import { games, type GameTheme } from '../data/games';
import { buttonClasses } from './Button';
import { cx } from './cx';
import { SearchBox, type SearchBoxProps } from './SearchBox';

interface AppHeaderProps {
  game: GameTheme;
  /** Replaces the game name in the bar (the condensed player once the hero scrolled away). */
  title?: ReactNode;
  /** Hide the game switcher on phones (it gives its room to `title`). */
  compactNav?: boolean;
  /** Header search, on player pages. The game landing has its own large box instead. */
  search?: Pick<SearchBoxProps, 'label' | 'initialValue' | 'busy' | 'onSubmitTag'>;
}

/**
 * Sticky top bar, one constant height on every width: back to all games,
 * title, game switcher, search. On phones the search is a toggle that opens
 * a row under the bar (only on request, so nothing below it moves by itself).
 */
export function AppHeader({ game, title, compactNav = false, search }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Set by the toggle only: the "/" shortcut moves focus on its own.
  const focusOnOpen = useRef(false);

  useEffect(() => {
    if (!searchOpen || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    panelRef.current?.querySelector('input')?.focus();
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    // Hidden on wide screens, where the input keeps focus instead.
    toggleRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1 px-2 sm:gap-3 sm:px-6">
        <Link to="/" aria-label="All games" className={buttonClasses('ghost', 'w-11 shrink-0 px-0 sm:w-auto sm:px-3')}>
          <ArrowLeft aria-hidden="true" />
          <span className="hidden sm:inline">Games</span>
        </Link>

        <div className="min-w-0 flex-1">
          {title ?? <span className="hidden truncate font-display text-base text-fg sm:block">{game.name}</span>}
        </div>

        <nav aria-label="Switch game" className={cx('shrink-0 items-center gap-1', compactNav ? 'hidden sm:flex' : 'flex')}>
          {games.map((g) => {
            const current = g.id === game.id;
            return (
              <Link
                key={g.id}
                to={`/game/${g.id}`}
                data-game={g.id}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-3 text-xs font-semibold transition-colors duration-150',
                  current ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <span aria-hidden="true" className="lg:hidden">{g.shortName}</span>
                <span className="sr-only lg:not-sr-only">{g.name}</span>
              </Link>
            );
          })}
        </nav>

        {search && (
          <>
            <div
              ref={panelRef}
              id="header-search"
              onKeyDown={(e) => {
                if (e.key !== 'Escape' || !searchOpen) return;
                e.stopPropagation();
                closeSearch();
              }}
              className={cx(
                'md:block md:w-72 lg:w-80',
                searchOpen ? 'absolute inset-x-0 top-full border-b border-line bg-canvas px-4 py-3 md:static md:border-0 md:p-0' : 'hidden',
              )}
            >
              <SearchBox
                {...search}
                gameId={game.id}
                shortcut
                onBeforeFocus={() => setSearchOpen(true)}
                onSubmitTag={(slug) => {
                  closeSearch();
                  search.onSubmitTag?.(slug);
                }}
              />
            </div>
            <button
              ref={toggleRef}
              type="button"
              aria-label={searchOpen ? 'Close search' : 'Search a player'}
              aria-expanded={searchOpen}
              aria-controls="header-search"
              onClick={() => {
                focusOnOpen.current = !searchOpen;
                setSearchOpen(!searchOpen);
              }}
              className={buttonClasses('ghost', 'w-11 shrink-0 px-0 md:hidden')}
            >
              {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
