import { PlayerStats, BSBrawlerData } from '../data/mockStats';
import { brawlerRarityMap } from '../data/brawlerRarities';
import { motion } from 'motion/react';
import { useState, useMemo } from 'react';
import { Trophy, Award, Users, Crosshair, Star, Flame, BarChart2, Shield, Search, ArrowUpDown, ChevronDown, ArrowDown, ArrowUp } from 'lucide-react';
import { BSBrawlerGrid } from '../components/BSBrawlerGrid';

// Helpers
const getWinDistribution = (bs: any) => {
    const v3 = bs.victories3v3 || 0;
    const vS = bs.victoriesSolo || 0;
    const vD = bs.victoriesDuo || 0;
    const total = v3 + vS + vD || 1;
    return {
        v3Pct: Math.round((v3 / total) * 100),
        vSPct: Math.round((vS / total) * 100),
        vDPct: Math.round((vD / total) * 100),
        total
    };
};

export const BSHome = ({ playerStats, accentColor }: { playerStats: PlayerStats, accentColor: string }) => {
    const bs = playerStats.gameVisuals?.bs;
    if (!bs) return null;

    const top3 = bs.topBrawlers.slice(0, 3);
    const winDist = getWinDistribution(bs);

    return (
        <div className="space-y-6">
            {/* Top 3 Brawlers Podium */}
            {top3.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-3xl border border-white/8 bg-white/3"
                    style={{ borderColor: `${accentColor}25` }}>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Trophy className="w-5 h-5" style={{ color: accentColor }} />
                        Top Brawlers
                    </h3>
                    <BSBrawlerGrid
                        brawlers={top3}
                        allBrawlers={bs.allBrawlers}
                        accent={accentColor}
                        variant="podium"
                    />
                </motion.div>
            )}

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Global Stats */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="p-6 rounded-3xl border border-white/8 bg-white/3">
                    <h3 className="text-sm font-semibold text-white/55 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Global Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                            <span className="text-white/50 text-xs mb-1">Prestige Level</span>
                            <span className="text-2xl font-bold text-white">{bs.prestigeLevel?.toLocaleString() ?? 0}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                            <span className="text-white/50 text-xs mb-1">Experience Points</span>
                            <span className="text-2xl font-bold text-white mb-1">{bs.expPoints?.toLocaleString() ?? 0}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                            <span className="text-white/50 text-xs mb-1">Total Victories</span>
                            <span className="text-2xl font-bold text-white">{(winDist.total || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                            <span className="text-white/50 text-xs mb-1">Robo Rumble</span>
                            <span className="text-xl font-bold text-white/90">
                                {bs.bestRoboRumbleTime ? `${Math.floor(bs.bestRoboRumbleTime / 60)}m ${bs.bestRoboRumbleTime % 60}s` : 'N/A'}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Win Distribution */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="p-6 rounded-3xl border border-white/8 bg-white/3 flex flex-col">
                    <h3 className="text-sm font-semibold text-white/55 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Crosshair className="w-4 h-4" /> Victory Distribution
                    </h3>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-white/10 mb-6">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${winDist.v3Pct}%` }} transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-blue-500 relative group" title={`3v3: ${winDist.v3Pct}%`} />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${winDist.vSPct}%` }} transition={{ duration: 1, delay: 0.6 }}
                                className="h-full bg-green-500 relative group" title={`Solo: ${winDist.vSPct}%`} />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${winDist.vDPct}%` }} transition={{ duration: 1, delay: 0.7 }}
                                className="h-full bg-orange-500 relative group" title={`Duo: ${winDist.vDPct}%`} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center mt-auto">
                            <div className="flex flex-col items-center">
                                <span className="w-3 h-3 rounded-full bg-blue-500 mb-2"></span>
                                <span className="text-white font-bold text-lg">{winDist.v3Pct}%</span>
                                <span className="text-white/50 text-xs">3v3</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="w-3 h-3 rounded-full bg-green-500 mb-2"></span>
                                <span className="text-white font-bold text-lg">{winDist.vSPct}%</span>
                                <span className="text-white/50 text-xs">Solo</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="w-3 h-3 rounded-full bg-orange-500 mb-2"></span>
                                <span className="text-white font-bold text-lg">{winDist.vDPct}%</span>
                                <span className="text-white/50 text-xs">Duo</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
};
export const BSBrawlers = ({ playerStats, accentColor }: { playerStats: PlayerStats, accentColor: string }) => {
    const bs = playerStats.gameVisuals?.bs;
    const brawlers = useMemo(() => bs?.allBrawlers ?? [], [bs]);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'trophies' | 'rarity'>('trophies');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // Helper to determine rank icon
    const getRankIcon = (rank: number) => {
        if (rank <= 1) return '/images/bs/icon_trophy_brawler_wood.webp';
        if (rank === 2) return '/images/bs/icon_trophy_brawler_bronze.webp';
        if (rank === 3) return '/images/bs/icon_trophy_brawler_silver.webp';
        if (rank === 4) return '/images/bs/icon_trophy_brawler_gold.webp';
        if (rank === 5) return '/images/bs/icon_trophy_brawler_prestige_1.webp';
        if (rank === 6) return '/images/bs/icon_trophy_brawler_prestige_2.webp';
        return '/images/bs/icon_trophy_brawler_prestige_3.webp';
    };

    // Derived states
    const filteredAndSortedBrawlers = useMemo(() => {
        let result = brawlers;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((b: BSBrawlerData) => b.name.toLowerCase().includes(query));
        }

        result = [...result].sort((a: BSBrawlerData, b: BSBrawlerData) => {
            const modifier = sortOrder === 'desc' ? -1 : 1;
            if (sortBy === 'trophies') {
                return (a.trophies - b.trophies) * modifier;
            } else if (sortBy === 'rarity') {
                const RARITY_WEIGHTS: Record<string, number> = {
                    'Common': 1,
                    'Rare': 2,
                    'Super Rare': 3,
                    'Epic': 4,
                    'Mythic': 5,
                    'Legendary': 6,
                    'Ultra Legendary': 7
                };

                const nameA = a.name.toUpperCase().replace(/ /g, '-');
                const nameB = b.name.toUpperCase().replace(/ /g, '-');
                const rarityA = brawlerRarityMap[nameA] || 'Common';
                const rarityB = brawlerRarityMap[nameB] || 'Common';
                const weightA = RARITY_WEIGHTS[rarityA] || 0;
                const weightB = RARITY_WEIGHTS[rarityB] || 0;

                if (weightA !== weightB) return (weightA - weightB) * modifier;
                if (b.power !== a.power) return (a.power - b.power) * modifier;
                return (a.trophies - b.trophies) * modifier;
            }
            return 0;
        });

        return result;
    }, [brawlers, searchQuery, sortBy, sortOrder]);

    if (!bs) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap">
                    <Users className="w-6 h-6" style={{ color: accentColor }} />
                    Brawlers ({brawlers.length}/{Math.max(brawlers.length, 90)})
                </h3>

                <div className="flex flex-1 flex-col sm:flex-row items-center justify-end gap-3">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search Brawlers..."
                            aria-label="Search brawlers"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:border-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-48">
                            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                            <select
                                value={sortBy}
                                aria-label="Sort brawlers by"
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full appearance-none pl-9 pr-8 py-3 bg-black/60 border border-white/10 rounded-xl text-sm text-white/90 focus:border-white/30 cursor-pointer hover:bg-black/80 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                <option value="trophies">Sort by Trophies</option>
                                <option value="rarity">Sort by Rarity</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>

                        <button
                            type="button"
                            onClick={() => setSortOrder((prev: string) => prev === 'desc' ? 'asc' : 'desc')}
                            className="shrink-0 w-11 h-11 bg-black/60 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-black/80 transition-colors flex items-center justify-center shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            title="Toggle Sort Order"
                            aria-label={sortOrder === 'desc' ? 'Sort order: descending. Switch to ascending' : 'Sort order: ascending. Switch to descending'}
                        >
                            {sortOrder === 'desc' ? (
                                <ArrowDown className="w-4 h-4" />
                            ) : (
                                <ArrowUp className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAndSortedBrawlers.map((b: BSBrawlerData, i: number) => (
                    <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 10) * 0.03 }}
                        className="p-4 rounded-2xl border border-white/10 bg-white/5 relative overflow-hidden group hover:bg-white/10 transition-colors"
                    >
                        {/* Background glow based on rank/power */}
                        <div className="absolute -inset-10 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="flex gap-4 relative z-10 w-full h-full">
                            <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden shadow-lg border-2 border-white/5">
                                <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" width={64} height={64} loading="lazy" decoding="async" />
                                <div className="absolute -bottom-1 -right-1 bg-black/80 rounded-tl-lg px-2 py-0.5 text-xs font-black text-amber-400 border-t border-l border-white/10">
                                    Lv {b.power}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-between overflow-hidden">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-bold text-white uppercase tracking-wider text-sm truncate">{b.name}</h4>
                                    <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/10">
                                        <img src={getRankIcon(b.rank)} alt={`Rank ${b.rank}`} className="w-4 h-4 object-contain drop-shadow-sm" width={16} height={16} loading="lazy" decoding="async" />
                                        <span className="text-white font-bold text-sm tracking-tight">{b.trophies}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs mt-1">
                                    <span className="text-white/55 flex items-center gap-1">
                                        <Star className="w-3 h-3 text-white/30" />
                                        Rank {b.rank}
                                    </span>
                                    {b.currentWinStreak && b.currentWinStreak > 0 ? (
                                        <span className="text-orange-400 font-bold flex items-center gap-1">
                                            <Flame className="w-3 h-3" /> {b.currentWinStreak} Streak
                                        </span>
                                    ) : (
                                        <span className="text-white/55">Best: {b.highestTrophies}</span>
                                    )}
                                </div>

                                {/* Equipment indicators */}
                                <div className="mt-2 text-center">
                                    <div className="text-[10px] text-white/50 uppercase font-bold tracking-widest mb-2">Equipped Config</div>
                                    <div className="flex items-center justify-center gap-2">
                                        {b.gadgetsList?.[0] ? (
                                            <img src={`https://cdn.brawlify.com/gadgets/borderless/${b.gadgetsList[0].id}.png`} alt={`Gadget: ${b.gadgetsList[0].name}`} className="w-8 h-8 object-contain drop-shadow-lg bg-green-900/40 rounded border border-green-500/80 p-0.5" title={b.gadgetsList[0].name} width={32} height={32} loading="lazy" decoding="async" onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/gadgets/${b.gadgetsList![0].id}.png`; } else if (!t.src.includes('icon_gadget.png')) { t.src = '/images/bs/icon_gadget.webp'; } }} />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                                        )}

                                        {b.starPowersList?.[0] ? (
                                            <img src={`https://cdn.brawlify.com/star-powers/borderless/${b.starPowersList[0].id}.png`} alt={`Star Power: ${b.starPowersList[0].name}`} className="w-8 h-8 object-contain drop-shadow-lg bg-yellow-900/40 rounded border border-yellow-500/80 p-0.5" title={b.starPowersList[0].name} width={32} height={32} loading="lazy" decoding="async" onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/star-powers/${b.starPowersList![0].id}.png`; } else if (!t.src.includes('icon_star_power.png')) { t.src = '/images/bs/icon_star_power.webp'; } }} />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                                        )}

                                        {b.gearsList?.[0] ? (
                                            <img src={`https://cdn.brawlify.com/gears/regular/${b.gearsList[0].id}.png`} alt={`Gear: ${b.gearsList[0].name}`} className="w-8 h-8 object-contain drop-shadow-lg bg-purple-900/40 rounded border border-purple-500/80 p-0.5" title={b.gearsList[0].name} width={32} height={32} loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                                        )}

                                        {b.gearsList?.[1] ? (
                                            <img src={`https://cdn.brawlify.com/gears/regular/${b.gearsList[1].id}.png`} alt={`Gear: ${b.gearsList[1].name}`} className="w-8 h-8 object-contain drop-shadow-lg bg-purple-900/40 rounded border border-purple-500/80 p-0.5" title={b.gearsList[1].name} width={32} height={32} loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                                        )}

                                        {(b.hyperCharges && b.hyperCharges.length > 0) || b.buffies?.hyperCharge ? (
                                            <div className="w-8 h-8 rounded bg-pink-900/40 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] border border-pink-400 flex items-center justify-center relative overflow-hidden" title={`Hypercharge Unlocked`}>
                                                <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                                                <img src="/images/bs/hyper.webp" alt="Hypercharge" className="w-full h-full object-contain drop-shadow-md z-10 scale-125" width={32} height={32} loading="lazy" decoding="async" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 w-full text-center">
                                    <div className="text-[10px] text-white/50 uppercase font-bold tracking-widest mb-1.5 pt-3 border-t border-white/10">Owned Equipment</div>
                                    <div className="flex flex-wrap justify-center gap-1.5">
                                        {b.gadgetsList?.length > 0 && b.gadgetsList.map((g: any) => (
                                            <img key={`g-${g.id}`} src={`https://cdn.brawlify.com/gadgets/borderless/${g.id}.png`} alt={`Gadget: ${g.name}`} className="w-5 h-5 object-contain opacity-70 hover:opacity-100 cursor-help" title={`Gadget: ${g.name}`} width={20} height={20} loading="lazy" decoding="async" onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/gadgets/${g.id}.png`; } else if (!t.src.includes('icon_gadget.png')) { t.src = '/images/bs/icon_gadget.webp'; } }} />
                                        ))}
                                        {b.starPowersList?.length > 0 && b.starPowersList.map((sp: any) => (
                                            <img key={`sp-${sp.id}`} src={`https://cdn.brawlify.com/star-powers/borderless/${sp.id}.png`} alt={`Star Power: ${sp.name}`} className="w-5 h-5 object-contain opacity-70 hover:opacity-100 cursor-help" title={`Star Power: ${sp.name}`} width={20} height={20} loading="lazy" decoding="async" onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/star-powers/${sp.id}.png`; } else if (!t.src.includes('icon_star_power.png')) { t.src = '/images/bs/icon_star_power.webp'; } }} />
                                        ))}
                                        {b.gearsList?.length > 0 && b.gearsList.map((gear: any) => (
                                            <img key={`gear-${gear.id}`} src={`https://cdn.brawlify.com/gears/regular/${gear.id}.png`} alt={`Gear: ${gear.name}`} className="w-5 h-5 object-contain opacity-70 hover:opacity-100 cursor-help" title={`Gear: ${gear.name}`} width={20} height={20} loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
export const BSProgression = ({ playerStats, accentColor }: { playerStats: PlayerStats, accentColor: string }) => {
    const bs = playerStats.gameVisuals?.bs;
    if (!bs) return null;

    const brawlers = bs.allBrawlers || [];

    // Distribution map Power 1-11
    const powerCounts = Array.from({ length: 11 }, (_, i) => ({ level: i + 1, count: 0 }));
    brawlers.forEach(b => {
        if (b.power >= 1 && b.power <= 11) powerCounts[b.power - 1].count++;
    });

    const maxCount = Math.max(...powerCounts.map(p => p.count), 1);

    // Gap Analysis
    const totalCurrentTrophies = brawlers.reduce((acc, b) => acc + (b.trophies || 0), 0);
    const totalMaxTrophies = brawlers.reduce((acc, b) => acc + (b.highestTrophies || 0), 0);
    const trophyGap = totalMaxTrophies - totalCurrentTrophies;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 px-2">
                <BarChart2 className="w-6 h-6" style={{ color: accentColor }} />
                Account Progression
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Heatmap/Bar Chart */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-3xl border border-white/8 bg-white/3 flex flex-col justify-between"
                    style={{ borderColor: `${accentColor}25` }}>
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-white/55 uppercase tracking-widest">Power Level Distribution</h4>
                        <p className="text-white/60 text-xs mt-1">Number of brawlers at each level</p>
                    </div>

                    <div className="flex items-end h-40 gap-1.5 w-full mt-auto pt-4 relative border-b border-white/10">
                        {powerCounts.map(p => {
                            const heightPct = (p.count / maxCount) * 100;
                            return (
                                <div key={p.level} className="flex-1 flex flex-col justify-end items-center group">
                                    <div
                                        className="w-full bg-white/20 rounded-t-md transition-all group-hover:bg-white/40 relative"
                                        style={{ height: `${heightPct}%`, backgroundColor: p.level === 11 ? accentColor : undefined }}
                                    >
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-0.5 rounded text-[10px] text-white font-bold pointer-events-none whitespace-nowrap z-10">
                                            {p.count} Brawlers
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/55 mt-1 font-bold">L{p.level}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Gap Analysis */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="p-6 rounded-3xl border border-white/8 bg-white/3 flex flex-col justify-between"
                    style={{ borderColor: `${accentColor}25` }}>
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-white/55 uppercase tracking-widest">Trophy Gap Analysis</h4>
                        <p className="text-white/60 text-xs mt-1">Potential trophies if all brawlers restore to their peak</p>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center mt-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-left">
                                <p className="text-white/55 text-xs">Current Target</p>
                                <p className="text-white font-bold text-xl">{totalCurrentTrophies.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/55 text-xs">Peak Trophies</p>
                                <p className="text-white font-bold text-xl text-yellow-400">{totalMaxTrophies.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(totalCurrentTrophies / totalMaxTrophies) * 100}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-yellow-400 rounded-full"
                            />
                        </div>

                        <div className="text-center">
                            <p className="text-white/70 text-sm">You are missing <span className="text-red-400 font-black tracking-widest text-lg px-2">{trophyGap.toLocaleString()}</span> trophies</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
export const BSClub = ({ playerStats, accentColor }: { playerStats: PlayerStats, accentColor: string }) => {
    const club = playerStats.gameVisuals?.bs?.club;
    if (!club) return null;

    return (
        <div className="space-y-6">
            {/* Club Header */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="p-6 md:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/40 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden"
                style={{ borderColor: `${accentColor}40` }}>

                {/* Background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" style={{ backgroundColor: `${accentColor}20` }} />

                <div className="shrink-0 relative w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl">
                    <img
                        src={`https://cdn.brawlify.com/club-icons/regular/${club.badgeId}.png`}
                        alt="Club Badge"
                        className="w-full h-full object-contain"
                        width={96}
                        height={96}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            if (!img.dataset.tried) {
                                img.dataset.tried = '1';
                                img.src = `https://cdn-old.brawlify.com/club/${club.badgeId}.png`;
                            } else if (img.dataset.tried === '1') {
                                img.dataset.tried = '2';
                                img.src = `https://cdn.brawlify.com/club/${club.badgeId}.png`;
                            } else {
                                img.src = 'https://cdn-old.brawlify.com/club/8.png';
                            }
                        }}
                    />
                </div>

                <div className="flex-1 text-center md:text-left z-10 w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-wide">{club.name}</h2>
                            <p className="text-white/50 text-sm font-mono mt-1">{club.tag}</p>
                        </div>
                        <div className="flex items-center justify-center md:justify-end gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-2xl font-bold text-white">{club.trophies.toLocaleString()}</span>
                        </div>
                    </div>

                    <p className="text-white/70 text-sm leading-relaxed mb-6 max-w-2xl bg-black/20 p-4 rounded-xl border border-white/5 whitespace-pre-wrap text-left">
                        {club.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-white/40" />
                            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">{club.type}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-white/40" />
                            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">Req: {club.requiredTrophies.toLocaleString()}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                            <Users className="w-4 h-4 text-white/40" />
                            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">{club.members.length} / 30 Members</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Members List */}
            <div className="rounded-3xl border border-white/8 bg-white/5 overflow-hidden">
                <div className="bg-black/40 p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5" style={{ color: accentColor }} />
                        Roster
                    </h3>
                </div>

                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {club.members.map((m, i) => (
                        <motion.div
                            key={m.tag}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i, 10) * 0.02 }}
                            className={`p-4 flex items-center justify-between hover:bg-white/5 transition-colors ${m.tag === (playerStats as any).tag ? 'bg-white/10' : ''}`}
                        >
                            <div className="flex items-center gap-4 w-1/2">
                                <span className={`text-sm font-black w-6 text-center ${i < 3 ? 'text-yellow-400' : 'text-white/55'}`}>{i + 1}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-base max-w-[120px] sm:max-w-[200px] truncate" style={{ color: m.nameColor ? `#${m.nameColor.replace('0xff', '')}` : 'white' }}>
                                            {m.name}
                                        </p>
                                        {m.tag === (playerStats as any).tag && (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">You</span>
                                        )}
                                    </div>
                                    <p className="text-white/55 text-[10px] font-mono mt-0.5">{m.role.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
                                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-white font-bold text-sm">{m.trophies.toLocaleString()}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
