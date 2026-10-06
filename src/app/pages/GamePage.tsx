import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Check, Info, Link2 } from 'lucide-react';
import { getGameById } from '../data/games';
import { searchPlayer, type SearchResult } from '../services/gameApiRouter';
import { normalizeTag } from '../services/supercellService';
import { getRecentSearches, removeRecentSearch, saveRecentSearch, type RecentSearch } from '../services/recentSearches';
import { AppHeader } from '../ui/AppHeader';
import { BATTLE_FILTER_PARAMS } from '../ui/battleFilters';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { ErrorState } from '../ui/ErrorState';
import { Pill } from '../ui/Pill';
import { PlayerSummaryBar, PlayerSummaryCompact } from '../ui/PlayerSummaryBar';
import { PanelSkeleton, PlayerPageSkeleton } from '../ui/Skeleton';
import { SectionTabs, type TabDef } from '../ui/SectionTabs';
import { SiteFooter } from '../ui/SiteFooter';
import { parseTab, shareSearch, withTab } from '../ui/tabs';
import { tagSlug } from '../ui/tag';
import { GameLanding } from './game/GameLanding';
import { GAME_MODULES, isGameId, preloadGameModule } from './game/modules';
import { ModuleBoundary } from './game/ModuleBoundary';
import { buildSummary } from './game/summary';
import { GAME_TABS, tabCounts } from './game/tabs';
import NotFound from './NotFound';

const SITE_TITLE = 'Supercell Stats — Player stats for Clash Royale, Brawl Stars & Clash of Clans';

/** Routing, data loading and the page shell. Everything game-specific lives in ./game/. */
export default function GamePage() {
  const { gameId, tag: rawUrlTag } = useParams<{ gameId: string; tag?: string }>();
  // A percent-encoded '#' (%23) is decoded by the router into a leading '#'; strip one so we never build '##TAG'.
  const urlTag = rawUrlTag?.replace(/^#/, '');
  const navigate = useNavigate();
  const location = useLocation();
  const game = gameId && isGameId(gameId) ? getGameById(gameId) : undefined;

  const [result, setResult] = useState<SearchResult | null>(null);
  // A player URL starts loading on the first render: no empty frame before the skeleton.
  const [isLoading, setIsLoading] = useState(() => Boolean(urlTag));
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => (gameId ? getRecentSearches(gameId) : []));
  const [copied, setCopied] = useState(false);
  // The hero has scrolled under the header: the header shows the condensed player instead.
  const [condensed, setCondensed] = useState(false);
  const copiedTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  const heroRef = useRef<HTMLDivElement>(null);
  // Only the most recent search may write its result (a slow older one must not overwrite it).
  const requestId = useRef(0);

  // Adjust state during render when the route changes (instead of syncing in an effect).
  const [prevGameId, setPrevGameId] = useState(gameId);
  if (prevGameId !== gameId) {
    setPrevGameId(gameId);
    setRecentSearches(gameId ? getRecentSearches(gameId) : []);
  }
  const [prevUrlTag, setPrevUrlTag] = useState(urlTag);
  if (prevUrlTag !== urlTag) {
    setPrevUrlTag(urlTag);
    if (!urlTag) {
      setResult(null);
      setIsLoading(false);
    }
  }

  const performSearch = useCallback(async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || !gameId) return;
    const myRequest = ++requestId.current;
    setIsLoading(true);
    // The previous result stays on screen (dimmed) while the next one loads:
    // blanking it makes every search look like the page broke.
    const res = await searchPlayer(gameId, trimmed);
    if (myRequest !== requestId.current) return;
    setResult(res);
    setIsLoading(false);

    if (res.data) {
      saveRecentSearch(gameId, normalizeTag(trimmed), res.data);
      setRecentSearches(getRecentSearches(gameId));
    }
  }, [gameId]);

  // The URL is the source of truth for which player is shown.
  useEffect(() => {
    if (!urlTag) {
      requestId.current++;   // invalidate any in-flight search
      return;
    }
    // Fetch-on-URL-change: performSearch sets the loading flag before awaiting; no cheaper derivation exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void performSearch(`#${urlTag}`);
  }, [urlTag, performSearch]);

  // Start downloading the game's module while the player request is still in flight.
  useEffect(() => {
    if (urlTag && gameId && isGameId(gameId)) preloadGameModule(gameId);
  }, [urlTag, gameId]);

  // Watch the hero rather than listening to scroll events (no work per scrolled pixel).
  const hasPlayer = Boolean(urlTag && result?.data);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hasPlayer || !hero) {
      setCondensed(false);
      return;
    }
    const headerHeight = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3.5; // --header-h
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [hasPlayer]);

  // Per-page document title
  useEffect(() => {
    if (!game) return;
    const player = result?.data?.username;
    document.title = player && urlTag
      ? `${player} · ${game.name} Stats — Supercell Stats`
      : `${game.name} Stats — Supercell Stats`;
    return () => { document.title = SITE_TITLE; };
  }, [game, result?.data?.username, urlTag]);

  if (!game) return <NotFound />;

  /** Navigating is what triggers the search: one history entry per player. */
  const goToPlayer = (slug: string) => {
    if (isLoading) return;
    if (slug === urlTag) {
      void performSearch(`#${slug}`);   // same player: re-fetch rather than no-op
      return;
    }
    navigate(`/game/${game.id}/player/${slug}`);
  };

  // Retry always means "the player in the address bar", whatever is typed in the search box.
  const retry = () => {
    if (urlTag) void performSearch(`#${urlTag}`);
  };

  const tabs: readonly TabDef[] = GAME_TABS[game.id as keyof typeof GAME_TABS];
  const defaultTab = tabs[0].id;
  const tabIds = tabs.map((t) => t.id);
  const activeTab = parseTab(location.search, tabIds, defaultTab);
  // Clicks push a history entry (back returns to the previous section); arrow keys replace it.
  // Reads window.location, not the rendered `location`: two quick key presses
  // can arrive before the first URL change has re-rendered this component.
  // Selecting the tab already shown does nothing (its Battles filters stay);
  // moving to another tab drops the filters, which belong to the Battles tab.
  const selectTab = (id: string, via: 'pointer' | 'keyboard' = 'pointer') => {
    const { pathname, search, hash } = window.location;
    if (parseTab(search, tabIds, defaultTab) === id) return;
    navigate(pathname + withTab(search, id, defaultTab, BATTLE_FILTER_PARAMS) + hash, { replace: via === 'keyboard' });
  };

  const removeRecent = (tag: string) => {
    removeRecentSearch(game.id, tag);
    setRecentSearches(getRecentSearches(game.id));
  };

  const copyPlayerLink = async () => {
    try {
      // The tab and, on Battles, its filters: what the visitor is looking at, nothing else.
      const query = shareSearch(window.location.search, activeTab, defaultTab, BATTLE_FILTER_PARAMS);
      const url = `${window.location.origin}/game/${gameId}/player/${tagSlug(urlTag ?? '')}${query}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context or denied): the URL bar still has it */
    }
  };

  const playerStats = urlTag ? result?.data ?? null : null;
  const error = urlTag && !isLoading ? result?.error ?? null : null;
  const GameModule = GAME_MODULES[game.id as keyof typeof GAME_MODULES];
  const summary = playerStats && urlTag ? buildSummary(game, playerStats, urlTag) : null;
  const counts = playerStats ? tabCounts(game.id as keyof typeof GAME_TABS, playerStats) : {};
  const labelledTabs = tabs.map((t) => (counts[t.id] ? { ...t, count: counts[t.id] } : t));

  return (
    <div data-game={game.id} className="flex min-h-dvh flex-col">
      <AppHeader
        game={game}
        title={condensed && summary ? <PlayerSummaryCompact summary={summary} /> : undefined}
        compactNav={condensed && Boolean(summary)}
        search={urlTag ? { label: 'Player tag', initialValue: `#${urlTag}`, busy: isLoading, onSubmitTag: goToPlayer } : undefined}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {/* Screen-reader status for the async search */}
        <p className="sr-only" role="status" aria-live="polite">
          {isLoading
            ? 'Searching…'
            : error
              ? `Search failed: ${error}`
              : playerStats
                ? `Showing stats for ${playerStats.username}`
                : ''}
        </p>

        {!urlTag && <GameLanding game={game} recent={recentSearches} onRemoveRecent={removeRecent} />}

        {urlTag && !playerStats && (
          <h1 className="sr-only">{`${game.name} player #${urlTag}`}</h1>
        )}

        {urlTag && (
          <div className="pt-6 sm:pt-8">
            {error && (
              <ErrorState
                title={error.toLowerCase().includes('not found') ? 'Player not found' : 'Search failed'}
                message={error}
                onRetry={retry}
                retrying={isLoading}
              />
            )}

            {isLoading && !playerStats && <PlayerPageSkeleton />}

            {playerStats && summary && (
              // Refetch keeps the frame: the previous player stays visible, dimmed.
              <div aria-busy={isLoading} className={cx('transition-opacity duration-200', isLoading && 'opacity-50')}>
                <div ref={heroRef}>
                  <PlayerSummaryBar
                    summary={summary}
                    meta={
                      <>
                        {result?.isReal
                          ? <Pill tone="win">Live from the official Supercell API</Pill>
                          : <Pill>Demo data: stats are randomly generated (VITE_DEMO_MODE)</Pill>}
                        <Button variant="ghost" onClick={() => void copyPlayerLink()}>
                          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                          {copied ? 'Link copied' : 'Copy link'}
                        </Button>
                      </>
                    }
                  />
                </div>

                {playerStats.dataNotice && (
                  <div className="mt-4 flex items-start gap-3 rounded-card border border-line bg-surface-1 p-4 text-sm text-fg-muted">
                    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                    <p>{playerStats.dataNotice}</p>
                  </div>
                )}

                <div className="sticky top-(--header-h) z-20 mt-6 border-b border-line bg-canvas">
                  <SectionTabs
                    tabs={labelledTabs}
                    active={activeTab}
                    onSelect={selectTab}
                    label={`${game.name} player sections`}
                    idPrefix="player"
                  />
                </div>

                <section
                  id="player-panel"
                  role="tabpanel"
                  aria-labelledby={`player-tab-${activeTab}`}
                  tabIndex={0}
                  className="pt-6 focus-visible:outline-offset-4"
                >
                  <h2 className="sr-only">{tabs.find((t) => t.id === activeTab)?.label}</h2>
                  <ModuleBoundary key={`${game.id}:${urlTag}`}>
                    <Suspense fallback={<PanelSkeleton />}>
                      <GameModule game={game} playerStats={playerStats} tab={activeTab} onTabChange={(id) => selectTab(id)} />
                    </Suspense>
                  </ModuleBoundary>
                </section>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Held back while the short skeleton shows: otherwise it sits at the screen bottom and is pushed away on arrival. */}
      {!(isLoading && !playerStats) && (
        <SiteFooter note={`${game.name} stats. All game data comes from the official Supercell developer API.`} />
      )}
    </div>
  );
}
