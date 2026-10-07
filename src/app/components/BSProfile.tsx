import { PlayerStats } from '../data/mockStats';
import { motion } from 'motion/react';
import { Trophy, Users, Shield } from 'lucide-react';

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
