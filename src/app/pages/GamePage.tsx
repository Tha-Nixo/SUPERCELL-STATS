import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  Search, ArrowLeft, Trophy, Target, Clock, Award,
  WifiOff, Swords, Shield, Star, Users, Zap, BarChart3
} from 'lucide-react';
import { getGameById } from '../data/games';
import { StatCard } from '../components/StatCard';
import { PerformanceChart } from '../components/PerformanceChart';
import { MatchHistory } from '../components/MatchHistory';
import { BSProfile } from '../components/BSProfile';
import { CoCHeroesDisplay } from '../components/CoCHeroesDisplay';
import { CoCArmyDisplay } from '../components/CoCArmyDisplay';
import { CoCAchievements } from '../components/CoCAchievements';
import { CoCOverview } from '../components/CoCOverview';
import { CRProfile } from '../components/CRProfile';
import { searchPlayer, SearchResult } from '../services/gameApiRouter';
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
const TH_IMAGES: Record<number, string> = {
  1: '/images/coc/townhall/th_01.png',
  7: '/images/coc/townhall/th_07.png',
  8: '/images/coc/townhall/th_08.png',
  9: '/images/coc/townhall/th_09.png',
  10: '/images/coc/townhall/th_10.png',
  11: '/images/coc/townhall/th_11.png',
  12: '/images/coc/townhall/th_12.png',
  13: '/images/coc/townhall/th_13.png',
  14: '/images/coc/townhall/th_14.png',
  15: '/images/coc/townhall/th_15.png',
  16: '/images/coc/townhall/th_16.png',
};

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = gameId ? getGameById(gameId) : null;

  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bsActiveTab, setBsActiveTab] = useState<string>('home');
  const [cocActiveTab, setCocActiveTab] = useState<'overview' | 'army' | 'heroes' | 'achievements'>('overview');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    if (gameId) {
      setRecentSearches(getRecentSearches(gameId));
    }
  }, [gameId]);

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Game Not Found</h1>
          <Link to="/" className="text-blue-400 hover:text-blue-300">Return to Home</Link>
        </div>
      </div>
    );
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setIsLoading(true);
    setResult(null);
    const res = await searchPlayer(gameId!, searchInput.trim());
    setResult(res);
    setIsLoading(false);

    if (res.data) {
      saveRecentSearch(gameId!, searchInput.trim(), res.data);
      setRecentSearches(getRecentSearches(gameId!));
    }
  };

  const handleRecentClick = (tag: string) => {
    setSearchInput(tag);
    // Automatically trigger search
    // We need state to update first, so we'll just run the search
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 0);
  };

  const handleDeleteRecent = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentSearch(gameId!, tag);
    setRecentSearches(getRecentSearches(gameId!));
  };

  const playerStats = result?.data;

  return (
    <div className="min-h-screen bg-[#0B0F1A]">

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
                  className="w-full px-5 py-4 pr-14 bg-black/35 backdrop-blur-lg border-2 border-white/20 rounded-2xl text-white placeholder-white/35 focus:outline-none focus:border-white/50 transition-all"
                />
                <button type="submit" disabled={isLoading}
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

      {/* ─── Error ─── */}
      <AnimatePresence>
        {result?.error && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-6 pt-8">
            <div className="max-w-5xl mx-auto flex items-center gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/30">
              <WifiOff className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <p className="text-red-300 font-semibold">Player not found</p>
                <p className="text-red-300/70 text-sm mt-0.5">{result.error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Live badge ─── */}
      {result?.isReal && playerStats && (
        <div className="px-6 pt-6">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live · Official Supercell API
            </div>
          </div>
        </div>
      )}

      {/* ─── Player Stats ─── */}
      <AnimatePresence>
        {playerStats && (
          <section className="px-6 py-10">
            <div className="max-w-5xl mx-auto space-y-10">

              {/* ── Player header ── */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${game.gradientFrom}, ${game.gradientTo})`, border: `2px solid ${game.accent}40` }}>
                  {gameId === 'clash-of-clans' && playerStats.gameVisuals?.coc ? (
                    <img
                      src={TH_IMAGES[playerStats.gameVisuals.coc.townHallLevel] || 'https://api-assets.clashofclans.com/townhalls/320/cVBEAFzBDVCWgCBqvGiU4hbcuN0UmqgNAB-LafNXFJ9Q.png'}
                      alt={`TH ${playerStats.gameVisuals.coc.townHallLevel}`}
                      className="w-14 h-14 object-contain filter drop-shadow-md"
                    />
                  ) : (
                    typeof playerStats.rankIcon === 'string' && playerStats.rankIcon.startsWith('http') ? (
                      <img
                        src={playerStats.rankIcon}
                        alt="Rank"
                        className="w-12 h-12 object-contain filter drop-shadow-md"
                        onError={(e) => {
                          const target = e.currentTarget;
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
                      <img
                        src={TH_IMAGES[playerStats.gameVisuals.coc.townHallLevel] || 'https://api-assets.clashofclans.com/townhalls/320/cVBEAFzBDVCWgCBqvGiU4hbcuN0UmqgNAB-LafNXFJ9Q.png'}
                        alt={`Town Hall ${playerStats.gameVisuals.coc.townHallLevel}`}
                        className="w-full h-full object-contain filter drop-shadow-lg"
                      />
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

              {/* ── Performance Chart ── */}
              {((gameId !== 'brawl-stars' && gameId !== 'clash-of-clans') || (gameId === 'brawl-stars' && bsActiveTab === 'home')) && playerStats.performanceData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Performance Trend</h3>
                  <PerformanceChart data={playerStats.performanceData} accentColor={game.chartPrimary} secondaryColor={game.chartSecondary} />
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
                      <div
                        key={r.tag}
                        onClick={() => handleRecentClick(r.tag)}
                        className="group relative p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <button
                          onClick={(e) => handleDeleteRecent(r.tag, e)}
                          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/80 flex items-center justify-center text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-bold text-lg truncate pr-6">{r.username}</h4>
                          <span className="text-[10px] text-white/40 font-mono bg-black/40 px-2 py-1 rounded">{r.tag}</span>
                        </div>

                        <div className="flex gap-4">
                          {r.trophies !== undefined && r.trophies > 0 && (
                            <div className="text-sm text-yellow-500 font-semibold">{r.trophies.toLocaleString()} 🏆</div>
                          )}
                          {r.thLevel !== undefined && (
                            <div className="text-sm font-semibold text-blue-400">TH {r.thLevel}</div>
                          )}
                        </div>

                        {r.clanName && (
                          <div className="text-xs text-white/40 mt-3 truncate border-t border-white/10 pt-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {r.clanName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center mt-10">
                  <div className="text-[100px] leading-none mb-6 opacity-10">{game.logo}</div>
                  <h3 className="text-2xl font-bold text-white/40 mb-3">Search for a Player</h3>
                  <p className="text-white/25 max-w-xs mx-auto text-sm">Enter a player tag above to view live stats, heroes, deck, brawlers and battle history.</p>
                  <div className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 text-sm font-mono">
                    <span style={{ color: game.accent }}>#</span>PLAYERTAG
                  </div>
                </motion.div>
              )}
            </div>
          </section>
        )
      }

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/30 text-xs leading-relaxed">
          <p className="mb-2">
            This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: <a href="https://www.supercell.com/fan-content-policy" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors underline">www.supercell.com/fan-content-policy</a>.
          </p>
          <p>
            {game.name} Stats — All game data is provided by the official Supercell Developer API.
          </p>
        </div>
      </footer>
    </div >
  );
}
