import { useState } from 'react';
import { CoCAchievement } from '../data/mockStats';
import { Award, CheckCircle2, Circle } from 'lucide-react';

interface CoCAchievementsProps {
    achievements: CoCAchievement[];
    accent: string;
}

export function CoCAchievements({ achievements, accent }: CoCAchievementsProps) {
    const [villageFilter, setVillageFilter] = useState<'all' | 'home' | 'builderBase' | 'clanCapital'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

    const filtered = achievements.filter(a => {
        if (villageFilter !== 'all' && a.village !== villageFilter) return false;
        const isComplete = a.stars === 3 || a.completionInfo === 'Completed!';
        if (statusFilter === 'completed' && !isComplete) return false;
        if (statusFilter === 'incomplete' && isComplete) return false;
        return true;
    });

    return (
        <div className="p-6 rounded-3xl border border-white/8 bg-white/3" style={{ borderColor: `${accent}25` }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Award className="w-5 h-5" style={{ color: accent }} />
                        Achievements
                    </h3>
                    <p className="text-white/70 text-sm mt-1">Tracked progress across villages</p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        aria-label="Filter achievements by village"
                        className="min-h-11 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white/80 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        value={villageFilter}
                        onChange={e => setVillageFilter(e.target.value as any)}
                    >
                        <option value="all">All Villages</option>
                        <option value="home">Home Village</option>
                        <option value="builderBase">Builder Base</option>
                        <option value="clanCapital">Clan Capital</option>
                    </select>

                    <select
                        aria-label="Filter achievements by completion status"
                        className="min-h-11 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white/80 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="incomplete">In Progress</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((a, i) => {
                    const isComplete = a.stars === 3 || a.completionInfo === 'Completed!' || (a.target > 0 && a.value >= a.target);
                    const safeTarget = Math.max(a.target, 1);
                    const progressPct = isComplete ? 100 : a.target > 0 ? Math.min(100, (a.value / safeTarget) * 100) : 0;

                    return (
                        <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h4 className="font-semibold text-white/90 text-sm">{a.name}</h4>
                                    {isComplete ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-white/20 shrink-0" />
                                    )}
                                </div>
                                <p className="text-white/70 text-[11px] leading-relaxed mb-3">{a.info}</p>
                            </div>

                            <div>
                                {a.target > 0 && !isComplete ? (
                                    <>
                                        <div className="flex justify-between text-[10px] text-white/55 mb-1 font-mono">
                                            <span>{a.value.toLocaleString()}</span>
                                            <span>{a.target.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: accent }} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-[11px] font-medium text-green-400/80 bg-green-400/10 px-2 py-1 rounded inline-block">
                                        {a.completionInfo || 'Completed'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-white/70 text-sm">
                    No achievements match the selected filters.
                </div>
            )}
        </div>
    );
}
