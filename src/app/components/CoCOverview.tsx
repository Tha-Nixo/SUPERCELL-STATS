import { PlayerStats } from '../data/mockStats';
import { Trophy, Shield, Swords, Star, Coins, ArrowUpCircle, Flame, Crown } from 'lucide-react';
import { StatCard } from './StatCard';

interface CoCOverviewProps {
    playerStats: PlayerStats;
    accent: string;
}

export function CoCOverview({ playerStats, accent }: CoCOverviewProps) {
    const cocData = playerStats.gameVisuals?.coc;
    if (!cocData) return null;

    // We extract all donations from the strings we placed in `supercellService`
    // extraStats[8] is roughly Donations, let's find it reliably:
    const donationsStat = playerStats.extraStats?.find(s => s.label === 'Donations')?.value as string;
    let donationsSent = '0';
    let donationsReceived = '0';
    if (donationsStat) {
        const matches = donationsStat.match(/([\d,]+)\s+sent\s+·\s+([\d,]+)\s+received/i);
        if (matches) {
            donationsSent = matches[1];
            donationsReceived = matches[2];
        }
    }

    return (
        <div className="space-y-6">

            {/* Legend League Banner */}
            {cocData.legendStatistics && cocData.legendStatistics.legendTrophies > 0 && (
                <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/40 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                            <Crown className="w-7 h-7 text-purple-400 drop-shadow-md" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-0.5 mt-[-2px] tracking-tight">Legend League</h3>
                            <div className="flex items-center gap-3 text-sm text-purple-300/80 font-medium">
                                <span>{cocData.legendStatistics.legendTrophies.toLocaleString()} Legend Trophies</span>
                            </div>
                        </div>
                    </div>
                    {cocData.legendStatistics.bestSeason && (
                        <div className="text-left sm:text-right shrink-0 bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <p className="text-xs text-purple-300/60 uppercase tracking-widest font-semibold mb-1">Best Season</p>
                            <div className="flex items-center gap-3">
                                <span className="text-white font-bold">{cocData.legendStatistics.bestSeason.trophies.toLocaleString()} 🏆</span>
                                <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded text-sm">Rank #{cocData.legendStatistics.bestSeason.rank.toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-white/55 text-right mt-1">{cocData.legendStatistics.bestSeason.id}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trophies Card */}
                <div className="p-6 rounded-3xl border border-white/8 bg-white/3 flex flex-col" style={{ borderColor: `${accent}25` }}>
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-lg font-bold text-white">Trophies & Progress</h3>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                            <span className="text-white/60 text-sm">Home Village</span>
                            <div className="text-right">
                                <div className="text-white font-bold">{playerStats.statLabels?.stat4Value || '0 🏆'}</div>
                                <div className="text-white/55 text-[10px]">Best: {playerStats.statLabels?.stat4Sub}</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                            <span className="text-white/60 text-sm">Builder Base</span>
                            <div className="text-right">
                                <div className="text-white font-bold">{cocData.builderBaseTrophies?.toLocaleString() ?? 0} 🏆</div>
                                <div className="text-white/55 text-[10px]">Best: {cocData.bestBuilderBaseTrophies?.toLocaleString() ?? 0}</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">Experience Level</span>
                            <div className="text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{playerStats.level} ✨</div>
                        </div>
                    </div>
                </div>

                {/* Clan Card */}
                <div className="p-6 rounded-3xl border border-white/8 bg-white/3 flex flex-col" style={{ borderColor: `${accent}25` }}>
                    <div className="flex items-center gap-2 mb-5">
                        <Shield className="w-5 h-5" style={{ color: accent }} />
                        <h3 className="text-lg font-bold text-white">Clan Information</h3>
                    </div>

                    <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-black/40 border border-white/5">
                        {cocData.clanBadgeUrl ? (
                            <img src={cocData.clanBadgeUrl} alt="Clan Badge" width={48} height={48} loading="lazy" decoding="async" className="w-12 h-12" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/55 text-xs">None</div>
                        )}
                        <div>
                            <h4 className="text-white font-bold text-lg">{cocData.clanName || 'No Clan'}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{cocData.clanRole}</span>
                                {cocData.clanLevel ? <span className="text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded">Lv {cocData.clanLevel}</span> : null}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm flex items-center gap-2"><ArrowUpCircle className="w-4 h-4 text-green-400" /> Donations Sent</span>
                            <span className="text-white font-bold">{donationsSent}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-white/60 text-sm flex items-center gap-2"><ArrowUpCircle className="w-4 h-4 text-red-400 rotate-180" /> Received</span>
                            <span className="text-white font-bold">{donationsReceived}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-white/60 text-sm flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-500" /> Capital Contributions</span>
                            <span className="text-yellow-400 font-bold font-mono">{cocData.clanCapitalContributions?.toLocaleString() ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Combat Stats Mini Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="War Stars" value={`${cocData.warStars?.toLocaleString() ?? 0} ⭐`} subtitle="Clan War total" icon={<Swords className="w-6 h-6" />} accentColor={accent} />
                <StatCard title="Attack Wins" value={playerStats.statLabels?.stat2Value?.split(' / ')[0] ?? '0'} subtitle="Lifetime" icon={<Flame className="w-6 h-6" />} accentColor="#ef4444" />
                <StatCard title="Defense Wins" value={playerStats.statLabels?.stat2Value?.split(' / ')[1] ?? '0'} subtitle="Lifetime" icon={<Shield className="w-6 h-6" />} accentColor="#3b82f6" />
                <StatCard title="Win Rate" value={`${playerStats.winRate}%`} subtitle="Est. Lifetime Rate" icon={<Star className="w-6 h-6" />} accentColor="#10b981" />
            </div>

        </div>
    );
}
