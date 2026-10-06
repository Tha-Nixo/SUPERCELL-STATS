import { Link } from 'react-router';
import { History, Trophy, X } from 'lucide-react';
import type { GameTheme } from '../../data/games';
import type { RecentSearch } from '../../services/recentSearches';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Pill } from '../../ui/Pill';
import { Row } from '../../ui/Row';
import { SearchBox } from '../../ui/SearchBox';

interface GameLandingProps {
  game: GameTheme;
  recent: RecentSearch[];
  onRemoveRecent: (tag: string) => void;
}

/** /game/:gameId without a tag: one large search box and this game's recent searches. */
export function GameLanding({ game, recent, onRemoveRecent }: GameLandingProps) {
  return (
    <>
      <section className="pt-6 pb-2 sm:pt-10">
        <h1 className="font-display text-title font-normal text-fg sm:text-display">{game.name}</h1>
        <p className="mt-2 max-w-xl text-base text-fg-muted">
          {game.tagline}. Search a player by tag to see trophies, progress and recent battles.
        </p>
        <SearchBox className="mt-6 max-w-xl" gameId={game.id} label="Player tag" size="lg" shortcut />
      </section>

      <section aria-labelledby="recent-heading" className="mt-8">
        <h2 id="recent-heading" className="mb-3 text-sm font-semibold text-fg">Recent searches</h2>
        {recent.length === 0 ? (
          <EmptyState icon={<History />} title="No recent searches yet">
            Players you look up appear here, so you can reopen them in one tap.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {recent.map((r) => (
              <li key={r.tag} className="flex items-center gap-1 rounded-card border border-line bg-surface-1 pr-1 transition-colors duration-150 hover:border-line-strong">
                <Link to={`/game/${game.id}/player/${r.tag.replace(/^#/, '')}`} className="min-w-0 flex-1 rounded-card px-4">
                  <Row
                    className="min-h-14"
                    label={
                      <>
                        <span className="block truncate font-semibold text-fg">{r.username}</span>
                        <span className="block truncate text-xs text-fg-subtle">{r.clanName ? `${r.tag}, ${r.clanName}` : r.tag}</span>
                      </>
                    }
                    value={
                      r.thLevel !== undefined ? (
                        <Pill tone="accent">TH {r.thLevel}</Pill>
                      ) : r.trophies > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Trophy aria-hidden="true" className="size-4 text-accent" />
                          {r.trophies.toLocaleString('en-US')}
                        </span>
                      ) : null
                    }
                  />
                </Link>
                <Button variant="ghost" aria-label={`Remove ${r.username} from recent searches`} onClick={() => onRemoveRecent(r.tag)} className="w-11 shrink-0 px-0">
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
