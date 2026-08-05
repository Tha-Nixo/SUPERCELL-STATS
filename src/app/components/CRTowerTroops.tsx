import { PlayerStats } from '../data/mockStats';
import { Flame, Star } from 'lucide-react';

interface CRTowerTroopsProps {
    playerStats: PlayerStats;
    accent: string;
}

export function CRTowerTroops({ playerStats, accent }: CRTowerTroopsProps) {
    const cr = playerStats.gameVisuals?.cr;
    if (!cr || !cr.supportCards || cr.supportCards.length === 0) return null;

    const supportCards = cr.supportCards;
    const activeTroopId = cr.currentDeckSupportCards?.[0]?.id;

    const getRarityColor = (rarity?: string) => {
        switch (rarity?.toLowerCase()) {
            case 'common': return 'text-slate-300';
            case 'rare': return 'text-orange-400';
            case 'epic': return 'text-purple-400';
            case 'legendary': return 'text-sky-400';
            case 'champion': return 'text-yellow-400';
            default: return 'text-white/50';
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-white/5 bg-black/20">
                <h3 className="text-white/60 font-semibold mb-6 flex items-center gap-2">
                    <Flame className="w-5 h-5" style={{ color: accent }} />
                    Tower Princess & Support Cards
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {supportCards.map((troop) => {
                        const isActive = troop.id === activeTroopId;
                        const isMax = troop.level === troop.maxLevel;

                        return (
                            <div key={troop.id} className={`relative p-xl flex flex-col items-center justify-between p-4 rounded-2xl border transition-all ${isActive ? 'bg-orange-900/20 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}>
                                {isActive && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-lg z-20 flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-white" /> Equipped
                                    </div>
                                )}

                                <div className="flex justify-center mb-4 min-h-[140px] relative w-full items-end pb-2">
                                    <img src={troop.iconUrl} alt={troop.name} width={93} height={112} loading="lazy" decoding="async" className="h-28 w-auto object-contain drop-shadow-2xl hover:scale-110 transition-transform origin-bottom" />
                                </div>

                                <div className="text-center w-full">
                                    <h4 className={`text-sm font-bold mb-1 truncate ${isActive ? 'text-orange-300' : 'text-white'}`}>{troop.name}</h4>

                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className={`text-[10px] font-bold uppercase ${getRarityColor(troop.rarity)}`}>{troop.rarity}</span>
                                        <span className="text-xs font-mono text-white/50 font-bold">Lv {troop.level}</span>
                                    </div>

                                    {isMax && (
                                        <div className="w-full h-1.5 bg-yellow-500/20 rounded-full mt-2 flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 animate-shimmer" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
