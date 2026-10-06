import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  Search, ArrowLeft, Trophy, Target, Clock, Award,
  WifiOff, Swords, Shield, Star, Users, Zap, BarChart3, Link2, Check, AlertTriangle
} from 'lucide-react';
import { getGameById } from '../data/games';
import { StatCard } from '../components/StatCard';
import { TrophyTrend } from '../components/TrophyTrend';
import { MatchHistory } from '../components/MatchHistory';
import { BSProfile } from '../components/BSProfile';
import { CoCHeroesDisplay } from '../components/CoCHeroesDisplay';
import { CoCArmyDisplay } from '../components/CoCArmyDisplay';
import { CoCAchievements } from '../components/CoCAchievements';
import { CoCOverview } from '../components/CoCOverview';
import { CRProfile } from '../components/CRProfile';
import { searchPlayer, SearchResult } from '../services/gameApiRouter';
import { normalizeTag } from '../services/supercellService';
import { saveRecentSearch, getRecentSearches, removeRecentSearch, RecentSearch } from '../services/recentSearches';

// Auto icon mapping for extra stat labels
const STAT_ICONS: Array<{ keywords: string[]; icon: React.ReactNode }> = [
  { keywords: ['trophy', 'trophies', 'crown', 'pb'], icon: <Trophy className="w-4 h-4" /> },
  { keywords: ['win', 'victory', 'victories'], icon: <Star className="w-4 h-4" /> },
  { keywords: ['war', 'stars', 'atk', 'attack'], icon: <Swords className="w-4 h-4" /> },
  { keywords: ['defense', 'def', 'unbreakable'], icon: <Shield className="w-4 h-4" /> },
  { keywords: ['brawler', 'hero', 'troops', 'cards'], icon: <Zap className="w-4 h-4" /> },
  { keywords: ['clan', 'club', 'team'], icon: <Users className="w-4 h-4" /> },
  { keywords: ['challenge', 'time', 'account', 'age', 'played'], icon: <Clock className="w-4 h-4" /> },
  { keywords: ['donation', 'star points', 'points'], icon: <Award className="w-4 h-4" /> },
];
function getStatIcon(label: string) {
  const lower = label.toLowerCase();
  for (const { keywords, icon } of STAT_ICONS) {
    if (keywords.some(k => lower.includes(k))) return icon;
  }
  return <BarChart3 className="w-4 h-4" />;
}

// ─── Town Hall hero images (CoC — stored locally under /images/coc/townhall/)
// Only levels with an asset on disk belong here: a missing entry renders the
// numeric badge below instead of a broken image, and never TH16 art for a TH18.
const TH_IMAGES: Record<number, string> = {
  1: '/images/coc/townhall/th_01.webp',
  7: '/images/coc/townhall/th_07.webp',
  8: '/images/coc/townhall/th_08.webp',
  9: '/images/coc/townhall/th_09.webp',
  10: '/images/coc/townhall/th_10.webp',
  11: '/images/coc/townhall/th_11.webp',
  12: '/images/coc/townhall/th_12.webp',
  13: '/images/coc/townhall/th_13.webp',
  14: '/images/coc/townhall/th_14.webp',
  15: '/images/coc/townhall/th_15.webp',
  16: '/images/coc/townhall/th_16.webp',
};

function TownHallMark({ level, className }: { level: number; className: string }) {
  const src = TH_IMAGES[level];
  if (!src) {
    return (
      <span className={`${className} flex items-center justify-center font-extrabold text-white/90 tabular-nums leading-none`}>
        {level}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={`Town Hall ${level}`}
      loading="eager"
      decoding="async"
      className={`${className} object-contain filter drop-shadow-md`}
      onError={(e) => {
        const img = e.currentTarget;
        img.style.display = 'none';
        img.insertAdjacentText('afterend', String(level));
      }}
    />
  );
}

const SITE_TITLE = 'Supercell Stats — Player stats for Clash Royale, Brawl Stars & Clash of Clans';

export default function GamePage() {
  const { gameId, tag: rawUrlTag } = useParams<{ gameId: string; tag?: string }>();
  // A percent-encoded '#' (%23) is decoded by the router into a leading '#'; strip one so we never build '##TAG'.
  const urlTag = rawUrlTag?.replace(/^#/, '');
  const navigate = useNavigate();
  const game = gameId ? getGameById(gameId) : null;

  const [searchInput, setSearchInput] = useState(urlTag ? `#${urlTag}` : '');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bsActiveTab, setBsActiveTab] = useState<string>('home');
  const [cocActiveTab, setCocActiveTab] = useState<'overview' | 'army' | 'heroes' | 'achievements'>('overview');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(
    () => (gameId ? getRecentSearches(gameId) : []),
  );
  const [copied, setCopied] = useState(false);
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
    if (urlTag) {
      setSearchInput(`#${urlTag}`);
    } else {
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

  // Per-page document title
  useEffect(() => {
    if (!game) return;
    const player = result?.data?.username;
    document.title = player && urlTag
      ? `${player} · ${game.name} Stats — Supercell Stats`
      : `${game.name} Stats — Supercell Stats`;
    return () => { document.title = SITE_TITLE; };
  }, [game, result?.data?.username, urlTag]);

  if (!game) {
    return (
      <main className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Game Not Found</h1>
          <Link to="/" className="text-blue-400 hover:text-blue-300">Return to Home</Link>
        </div>
      </main>
    );
  }

  /** Navigating is what triggers the search — one history entry per player. */
  const goToPlayer = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || isLoading) return;
    const slug = normalizeTag(trimmed).slice(1);
    if (slug === urlTag) {
      void performSearch(trimmed);   // same player: re-fetch rather than no-op
      return;
    }
    navigate(`/game/${gameId}/player/${slug}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goToPlayer(searchInput);
  };

  const handleDeleteRecent = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    removeRecentSearch(gameId!, tag);
    setRecentSearches(getRecentSearches(gameId!));
  };

  const copyPlayerLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context or denied) — the URL bar still has it */
    }
  };

  const playerStats = result?.data;

  return (
    <div className="min-h-screen bg-[#0B0F1A]">

      <main>
      {/* ─── Hero / Search header ─── */}
      <section
        className="relative py-24 px-6 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${game.gradientFrom} 0%, ${game.gradientTo} 100%)` }}
      >
        {/* Decorative glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] opacity-25"
            style={{ backgroundColor: game.accent }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] opacity-15"
            style={{ backgroundColor: game.chartSecondary }} />
        </div>

        {/* Back */}
        <div className="absolute top-6 left-6 z-10">
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-black/25 backdrop-blur-lg rounded-xl text-white hover:bg-black/40 transition-all border border-white/10"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </motion.button>
          </Link>
        </div>

        {/* Watermark logo */}
        <div className="absolute inset-0 flex items-center justify-end pr-20 opacity-[0.06] select-none pointer-events-none">
          <div className="text-[380px] leading-none">{game.logo}</div>
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <div className="text-7xl mb-3 drop-shadow-2xl">{game.logo}</div>
            <h1 className={`text-5xl md:text-6xl font-extrabold text-white mb-1 tracking-tight ${game.fontClass}`}>{game.name}</h1>
            {(game as any).tagline && (
              <p className="text-white/45 text-sm mb-8 uppercase tracking-widest">{(game as any).tagline}</p>
            )}

            <form onSubmit={handleSearch} className="w-full max-w-md mx-auto">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter Player Tag (e.g., #ABC123)"
                  aria-label="Player tag"
                  className="w-full px-5 py-4 pr-14 bg-black/35 backdrop-blur-lg border-2 border-white/20 rounded-2xl text-white placeholder-white/35 focus:outline-none focus:border-white/50 transition-all"
                />
                <button type="submit" disabled={isLoading} aria-label="Search player"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl disabled:opacity-50 hover:brightness-110 transition-all"
                  style={{ backgroundColor: game.accent }}>
                  {isLoading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Search className="w-5 h-5 text-white" />}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Bottom fade to dark */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #0B0F1A)' }} />
      </section>

      {/* ─── Screen-reader status for the async search ─── */}
      <p className="sr-only" role="status" aria-live="polite">
        {isLoading
          ? 'Searching…'
          : result?.error
            ? `Search failed: ${result.error}`
            : playerStats
              ? `Showing stats for ${playerStats.username}`
              : ''}
      </p>

      {/* ─── Error ─── */}
      <AnimatePresence>
        {result?.error && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 pt-8">
            <div className="max-w-5xl mx-auto flex items-center gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/30">
              <WifiOff className="w-6 h-6 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-red-300 font-semibold">
                  {result.error.toLowerCase().includes('not found') ? 'Player not found' : 'Search failed'}
                </p>
                <p className="text-red-200/80 text-sm mt-0.5">{result.error}</p>
              </div>
              <button
                type="button"
                onClick={() => void performSearch(searchInput)}
                className="shrink-0 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Partial-data notice ─── */}
      {playerStats?.dataNotice && (
        <div className="px-6 pt-6">
          <div className="max-w-5xl mx-auto flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            <p className="text-amber-100/90 text-sm">{playerStats.dataNotice}</p>
          </div>
        </div>
      )}

      {/* ─── Live / Demo badge ─── */}
      {playerStats && (
        <div className="px-6 pt-6">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">
            {result?.isReal ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live · Official Supercell API
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                Demo data · stats are randomly generated (VITE_DEMO_MODE)
              </div>
            )}
            {urlTag && (
              <button
                type="button"
                onClick={() => void copyPlayerLink()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? 'Link copied' : 'Copy link to this player'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Player Stats ─── */}
      <AnimatePresence>
        {playerStats && (
          <section className="px-6 py-10">
            {/* Refetch keeps the frame: the previous player stays visible, dimmed. */}
            <div
              className={`max-w-5xl mx-auto space-y-10 transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}
              aria-busy={isLoading}
            >

              {/* ── Player header ── */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${game.gradientFrom}, ${game.gradientTo})`, border: `2px solid ${game.accent}40` }}>
                  {gameId === 'clash-of-clans' && playerStats.gameVisuals?.coc ? (
                    <TownHallMark key={urlTag} level={playerStats.gameVisuals.coc.townHallLevel} className="w-14 h-14 text-2xl" />
                  ) : gameId === 'brawl-stars' && playerStats.gameVisuals?.bs?.iconId ? (
                    <img
                      key={urlTag}
                      src={`https://cdn.brawlify.com/profile-icons/regular/${playerStats.gameVisuals.bs.iconId}.png`}
                      alt="Player Icon"
                      className="w-12 h-12 object-contain filter drop-shadow-md"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.dataset.fallback) return;
                        target.dataset.fallback = '1';
                        target.style.display = 'none';
                        target.parentElement?.insertAdjacentHTML('beforeend', '<span class="text-4xl">⭐</span>');
                      }}
                    />
                  ) : gameId === 'clash-royale' && (playerStats.gameVisuals?.cr?.arenaIconUrl || playerStats.gameVisuals?.cr?.arenaId) ? (
                    <img
                      key={urlTag}
                      src={playerStats.gameVisuals.cr?.arenaIconUrl || `https://api-assets.clashroyale.com/arenas/72/${playerStats.gameVisuals.cr?.arenaId}.png`}
                      alt="Arena"
                      className="w-12 h-12 object-contain filter drop-shadow-md"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.tried) {
                          target.dataset.tried = '1';
                          target.src = `https://royaleapi.github.io/cr-api-assets/arenas/${playerStats.gameVisuals!.cr!.arenaId}.png`;
                        } else {
                          target.style.display = 'none';
                          target.parentElement?.insertAdjacentHTML('beforeend', '<span class="text-4xl">👑</span>');
                        }
                      }}
                    />
                  ) : (
                    typeof playerStats.rankIcon === 'string' && playerStats.rankIcon.startsWith('http') ? (
                      <img
                        src={playerStats.rankIcon}
                        alt="Rank"
                        className="w-12 h-12 object-contain filter drop-shadow-md"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.dataset.fallback) return;
                          target.dataset.fallback = '1';
                          target.style.display = 'none';
                          target.parentElement?.insertAdjacentHTML('beforeend', '<span class="text-4xl text-white drop-shadow-md">👑</span>');
                        }}
                      />
                    ) : (
                      playerStats.rankIcon
                    )
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-4xl font-extrabold text-white tracking-tight truncate">{playerStats.username}</h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="px-3 py-1 rounded-lg font-bold text-sm"
                      style={{ backgroundColor: `${game.accent}25`, color: game.accent, border: `1px solid ${game.accent}40` }}>
                      {playerStats.rank}
                    </span>
                    <span className="text-white/40 text-sm">Level {playerStats.level}</span>
                  </div>
                </div>
                {/* CoC: show TH level badge */}
                {gameId === 'clash-of-clans' && playerStats.gameVisuals?.coc && (
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <TownHallMark key={urlTag} level={playerStats.gameVisuals.coc.townHallLevel} className="w-full h-full text-3xl" />
                    </div>
                    <p className="text-white/50 text-[11px] mt-1 font-semibold tracking-wider">TH {playerStats.gameVisuals.coc.townHallLevel}</p>
                  </div>
                )}
              </motion.div>

              {/* ── BRAWL STARS: Main Profile ── */}
              {gameId === 'brawl-stars' && (
                <BSProfile
                  playerStats={playerStats}
                  accentUrl={game.logo || ''}
                  accentColor={playerStats.gameVisuals?.bs?.nameColor ? `#${playerStats.gameVisuals.bs.nameColor.replace('0xff', '')}` : game.accent}
                  bsActiveTab={bsActiveTab}
                  setBsActiveTab={setBsActiveTab}
                />
              )}

              {/* ── Tab Navigation (Clash of Clans) ── */}
              {gameId === 'clash-of-clans' && (
                <div className="flex justify-center mt-6">
                  <div className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 border border-white/10 shadow-xl overflow-x-auto max-w-full no-scrollbar">
                    {['overview', 'army', 'heroes', 'achievements'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setCocActiveTab(tab as any)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap ${cocActiveTab === tab ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                      >
                        {tab === 'heroes' ? 'Heroes & Equip' : tab}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 4 stat cards ── */}
              {((gameId !== 'brawl-stars' && gameId !== 'clash-of-clans' && gameId !== 'clash-royale') || (gameId === 'brawl-stars' && bsActiveTab === 'home')) && (() => {
                const L = playerStats.statLabels ?? {};
                const wins = Math.round(playerStats.totalMatches * playerStats.winRate / 100);
                const kdDisplay = typeof playerStats.kd === 'number'
                  ? (Number.isInteger(playerStats.kd) ? String(playerStats.kd) : playerStats.kd.toFixed(2))
                  : String(playerStats.kd);
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title={L.stat1Title ?? 'Win Rate'} value={`${playerStats.winRate}%`}
                      subtitle={L.stat1Sub ?? `${wins} wins`}
                      icon={<Trophy className="w-6 h-6" />} accentColor={game.accent} />
                    <StatCard title={L.stat2Title ?? 'K/D Ratio'} value={L.stat2Value ?? kdDisplay}
                      subtitle={L.stat2Sub ?? 'Average per game'}
                      icon={<Target className="w-6 h-6" />} accentColor={game.chartPrimary} />
                    <StatCard title={L.stat3Title ?? 'Total Matches'} value={L.stat3Value ?? playerStats.totalMatches.toLocaleString()}
                      subtitle={L.stat3Sub ?? `${playerStats.hoursPlayed} hours`}
                      icon={<Award className="w-6 h-6" />} accentColor={game.chartSecondary} />
                    <StatCard title={L.stat4Title ?? 'Trophies'} value={L.stat4Value ?? playerStats.hoursPlayed}
                      subtitle={L.stat4Sub ?? ''}
                      icon={<Clock className="w-6 h-6" />} accentColor={game.accent} />
                  </motion.div>
                );
              })()}

              {/* ══════════════════════════════════════════════
                   GAME-SPECIFIC VISUAL SECTIONS
              ══════════════════════════════════════════════ */}

              {/* ── CLASH ROYALE: Profile ── */}
              {gameId === 'clash-royale' && playerStats.gameVisuals?.cr && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <CRProfile playerStats={playerStats} accentUrl={game.logo || ''} accentColor={game.accent} />
                </motion.div>
              )}



              {/* ── CLASH OF CLANS: Overview ── */}
              {gameId === 'clash-of-clans' && playerStats.gameVisuals?.coc && cocActiveTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <CoCOverview playerStats={playerStats} accent={game.accent} />
                </motion.div>
              )}

              {/* ── CLASH OF CLANS: Heroes & Equip ── */}
              {gameId === 'clash-of-clans' && playerStats.gameVisuals?.coc && cocActiveTab === 'heroes' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <CoCHeroesDisplay
                    heroes={playerStats.gameVisuals.coc.heroes}
                    heroEquipment={playerStats.gameVisuals.coc.heroEquipment}
                    leagueName={playerStats.gameVisuals.coc.leagueName}
                    leagueBadgeUrl={playerStats.gameVisuals.coc.leagueBadgeUrl}
                    clanBadgeUrl={playerStats.gameVisuals.coc.clanBadgeUrl}
                    accent={game.accent}
                  />
                </motion.div>
              )}
              {/* ── CLASH OF CLANS: Army ── */}
              {gameId === 'clash-of-clans' && playerStats.gameVisuals?.coc && cocActiveTab === 'army' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
                  <CoCArmyDisplay
                    troops={playerStats.gameVisuals.coc.troops}
                    superTroops={playerStats.gameVisuals.coc.superTroops}
                    builderBaseTroops={playerStats.gameVisuals.coc.builderBaseTroops}
                    spells={playerStats.gameVisuals.coc.spells}
                    siegeMachines={playerStats.gameVisuals.coc.siegeMachines}
                    pets={playerStats.gameVisuals.coc.pets}
                    accent={game.accent}
                  />
                </motion.div>
              )}
              {/* ── CLASH OF CLANS: Achievements ── */}
              {gameId === 'clash-of-clans' && playerStats.gameVisuals?.coc && cocActiveTab === 'achievements' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                  <CoCAchievements
                    achievements={playerStats.gameVisuals.coc.achievements ?? []}
                    accent={game.accent}
                  />
                </motion.div>
              )}

              {/* ── Detailed Stats (all games) ── */}
              {((gameId !== 'brawl-stars' && gameId !== 'clash-of-clans' && gameId !== 'clash-royale')) && playerStats.extraStats && playerStats.extraStats.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">All Stats</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {playerStats.extraStats.map((stat, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.04 * i }}
                        className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/8 hover:bg-white/7 hover:border-white/14 transition-all"
                      >
                        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/40"
                          style={{ backgroundColor: `${game.accent}18` }}>
                          {getStatIcon(stat.label)}
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                          <span className="text-white/45 text-[11px] font-medium truncate">{stat.label}</span>
                          <span className="text-white font-semibold text-sm text-right shrink-0 break-words max-w-[55%]">{stat.value}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Trophy trend ── */}
              {((gameId !== 'brawl-stars' && gameId !== 'clash-of-clans') || (gameId === 'brawl-stars' && bsActiveTab === 'home')) && playerStats.performanceData.length > 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <TrophyTrend data={playerStats.performanceData} accentColor={game.chartPrimary} />
                </motion.div>
              )}

              {/* ── Recent Battles ── */}
              {((gameId !== 'brawl-stars' && gameId !== 'clash-of-clans') || (gameId === 'brawl-stars' && bsActiveTab === 'home')) && playerStats.recentMatches.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Recent Battles</h3>
                  <MatchHistory matches={playerStats.recentMatches} accentColor={game.accent} />
                </motion.div>
              )}

            </div>
          </section>
        )}
      </AnimatePresence>

      {/* ─── Empty State & Recent Searches ─── */}
      {
        !playerStats && !isLoading && !result?.error && (
          <section className="px-6 py-16">
            <div className="max-w-4xl mx-auto">
              {recentSearches.length > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-white/50" />
                      Recent Searches
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentSearches.map((r) => (
                      <div key={r.tag} className="group relative">
                        <Link
                          to={`/game/${gameId}/player/${r.tag.replace(/^#/, '')}`}
                          className="block p-4 pr-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <h4 className="text-white font-bold text-lg truncate">{r.username}</h4>
                            <span className="text-[10px] text-white/55 font-mono bg-black/40 px-2 py-1 rounded shrink-0">{r.tag}</span>
                          </div>

                          <div className="flex gap-4">
                            {r.trophies !== undefined && r.trophies > 0 && (
                              <div className="text-sm text-yellow-400 font-semibold tabular-nums">{r.trophies.toLocaleString()} 🏆</div>
                            )}
                            {r.thLevel !== undefined && (
                              <div className="text-sm font-semibold text-blue-300">TH {r.thLevel}</div>
                            )}
                          </div>

                          {r.clanName && (
                            <div className="text-xs text-white/55 mt-3 truncate border-t border-white/10 pt-2 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {r.clanName}
                            </div>
                          )}
                        </Link>
                        {/* Always visible: a hover-only control is unreachable on touch. */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecent(r.tag, e)}
                          aria-label={`Remove ${r.username} from recent searches`}
                          className="absolute top-2 right-2 w-11 h-11 rounded-full hover:bg-red-500/80 flex items-center justify-center text-white/50 hover:text-white text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center mt-10">
                  <div className="text-[100px] leading-none mb-6 opacity-10">{game.logo}</div>
                  <h2 className="text-2xl font-bold text-white/60 mb-3">Search for a Player</h2>
                  <p className="text-white/60 max-w-xs mx-auto text-sm">Enter a player tag above to view live stats, heroes, deck, brawlers and battle history.</p>
                  <div className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-mono">
                    <span style={{ color: game.accent }}>#</span>PLAYERTAG
                  </div>
                </motion.div>
              )}
            </div>
          </section>
        )
      }

      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/60 text-xs leading-relaxed">
          <p className="mb-2">
            This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: <a href="https://www.supercell.com/fan-content-policy" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors underline">www.supercell.com/fan-content-policy</a>.
          </p>
          <p>
            {game.name} Stats — All game data is provided by the official Supercell Developer API.
          </p>
        </div>
      </footer>
    </div >
  );
}
