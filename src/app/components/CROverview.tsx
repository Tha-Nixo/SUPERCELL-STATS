import { PlayerStats } from '../data/mockStats';
import { Trophy, Star, Crown, Users, TrendingUp } from 'lucide-react';

interface CROverviewProps {
    playerStats: PlayerStats;
    accent: string;
}

export function CROverview({ playerStats, accent }: CROverviewProps) {
    const cr = playerStats.gameVisuals?.cr;
    if (!cr) return null;

    return (
        <div className="space-y-6">

            {/* 1. Header Profilo */}
            <div className="flex flex-col md:flex-row gap-6 p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-white">{playerStats.username}</h2>
                        <span className="text-xs font-mono text-white/50 bg-black/40 px-2 py-1 rounded-md">{playerStats.rank}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-white/80">Lvl {playerStats.level}</span>
                            {cr.expPoints !== undefined && cr.expPoints > 0 && (
                                <span className="text-white/40text-[10px]">({cr.expPoints.toLocaleString()} XP)</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-white/80">{playerStats.hoursPlayed}</span>
                            <span className="text-white/40text-[10px]">Best: {playerStats.statLabels?.stat4Sub?.replace('Best: ', '')}</span>
                        </div>
                        {cr.arenaName && (
                            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                                {cr.arenaId && <img src={`https://royaleapi.github.io/cr-api-assets/arenas/${cr.arenaId}.png`} className="w-6 h-6 object-contain drop-shadow" alt="Arena" />}
                                <span className="text-white/80 font-semibold">{cr.arenaName}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonna 1: Quick Stats & Clan */}
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                        <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span className="text-white/60">Win/Loss</span>
                                <span className="text-white font-mono">{playerStats.statLabels?.stat1Sub?.split(' · ')[0]} / {playerStats.statLabels?.stat1Sub?.split(' · ')[1]}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span className="text-white/60">3-Crown Wins</span>
                                <span className="text-white font-mono font-bold">{playerStats.statLabels?.stat3Sub?.split(' ')[0]} 👑</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/60">Total Battles</span>
                                <span className="text-white font-mono">{playerStats.totalMatches.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Clan Box */}
                    <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                        <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Clan</h3>
                        {playerStats.extraStats?.find(s => s.label === 'Clan')?.value ? (
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    {cr.clanBadgeUrl ? (
                                        <img src={cr.clanBadgeUrl} className="w-10 h-10 object-contain" alt="Badge" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-white/10" />
                                    )}
                                    <div>
                                        <h4 className="text-white font-bold">{playerStats.extraStats?.find(s => s.label === 'Clan')?.value.toString().split(' · ')[0]}</h4>
                                        <div className="text-xs font-mono text-white/40">{cr.clanTag}</div>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm pt-2 border-t border-white/5">
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Role</span>
                                        <span className="text-white font-semibold uppercase text-xs" style={{ color: accent }}>
                                            {playerStats.extraStats?.find(s => s.label === 'Clan')?.value.toString().split(' · ')[1]}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Donations</span>
                                        <span className="text-white">{playerStats.extraStats?.find(s => s.label === 'Total Donations')?.value}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">War Day Wins</span>
                                        <span className="text-white">{playerStats.extraStats?.find(s => s.label === 'War Day Wins')?.value}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-white/30 text-sm">Not currently in a Clan</div>
                        )}
                    </div>
                </div>

                {/* Colonna 2 & 3: Competitive & Badges */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    {/* Seasons & Path of Legend */}
                    {(cr.leagueStatistics || cr.pathOfLegend || cr.legacyTrophyRoadHighScore) && (
                        <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Ranked Seasons
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Path of Legend Block */}
                                {cr.pathOfLegend && (cr.pathOfLegend.currentSeason || cr.pathOfLegend.bestSeason) && (
                                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                        <div className="flex items-center gap-2 mb-3 text-purple-400 font-semibold">
                                            <Crown className="w-4 h-4" />
                                            Path of Legend
                                        </div>
                                        <div className="space-y-2">
                                            {cr.pathOfLegend.currentSeason && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/60">Current Rank</span>
                                                    <span className="text-white font-bold">{cr.pathOfLegend.currentSeason.rank ?? 'Unranked'}</span>
                                                </div>
                                            )}
                                            {cr.pathOfLegend.bestSeason && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/60">Best Rank</span>
                                                    <span className="text-purple-400 font-bold">#{cr.pathOfLegend.bestSeason.rank}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* League Statistics Block */}
                                {cr.leagueStatistics && (cr.leagueStatistics.currentSeason || cr.leagueStatistics.bestSeason) && (
                                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                        <div className="flex items-center gap-2 mb-3 text-blue-400 font-semibold">
                                            <Trophy className="w-4 h-4" />
                                            Trophy Road
                                        </div>
                                        <div className="space-y-2">
                                            {cr.leagueStatistics.currentSeason && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/60">Current</span>
                                                    <span className="text-white font-bold">{cr.leagueStatistics.currentSeason.trophies} 🏆</span>
                                                </div>
                                            )}
                                            {cr.leagueStatistics.bestSeason && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/60">Best ({cr.leagueStatistics.bestSeason.id})</span>
                                                    <span className="text-blue-400 font-bold">{cr.leagueStatistics.bestSeason.trophies} 🏆</span>
                                                </div>
                                            )}
                                            {cr.legacyTrophyRoadHighScore !== undefined && cr.legacyTrophyRoadHighScore > 0 && (
                                                <div className="flex justify-between text-sm border-t border-blue-500/10 mt-2 pt-2">
                                                    <span className="text-white/40">Legacy High</span>
                                                    <span className="text-white/60 font-mono">{cr.legacyTrophyRoadHighScore}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Badges Grid */}
                    {cr.badges && cr.badges.length > 0 && (
                        <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Badges</h3>
                            <div className="flex flex-wrap gap-3">
                                {cr.badges.map((b, i) => (
                                    <div key={i} className="group relative w-16 h-16 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-help">
                                        <img src={b.iconUrl} alt={b.name} className="w-12 h-12 object-contain drop-shadow-lg group-hover:scale-110 transition-transform" />

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 bg-gray-900 border border-white/10 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none drop-shadow-xl min-w-[120px] text-center">
                                            <div className="font-bold mb-1">{b.name}</div>
                                            {b.level > 0 && (
                                                <div className="text-white/60 mb-1">Level {b.level}{b.maxLevel ? ` / ${b.maxLevel}` : ''}</div>
                                            )}
                                            {b.target > 0 && (
                                                <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (b.progress / b.target) * 100)}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Achievements List */}
                    {cr.achievements && cr.achievements.length > 0 && (
                        <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Achievements</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {cr.achievements.filter(a => a.value > 0).map((a, i) => {
                                    const percent = a.target ? Math.min(100, (a.value / a.target) * 100) : 100;
                                    const isComplete = a.value >= a.target;
                                    return (
                                        <div key={i} className="p-3 bg-black/30 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-semibold text-white/90">{a.name}</span>
                                                <div className="flex gap-0.5">
                                                    {Array.from({ length: 3 }).map((_, si) => (
                                                        <Star key={si} className={`w-3 h-3 ${si < a.stars ? 'text-yellow-500 fill-yellow-500' : 'text-white/10'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-white/50 mb-3">{a.info}</p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
                                                </div>
                                                <span className="text-[10px] font-mono text-white/40 whitespace-nowrap">
                                                    {a.value.toLocaleString()} / {a.target.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
