import { PlayerStats } from '../data/mockStats';
import { Target, Zap, Shield, Flame, Droplets, Heart } from 'lucide-react';

interface CRDeckProps {
    playerStats: PlayerStats;
    accent: string;
}

export function CRDeck({ playerStats, accent }: CRDeckProps) {
    const cr = playerStats.gameVisuals?.cr;
    if (!cr || !cr.currentDeck || cr.currentDeck.length === 0) return null;

    const currentDeck = cr.currentDeck;
    const favoriteCard = cr.favoriteCard;
    const supportCard = cr.currentDeckSupportCards?.[0]; // Usually just one Tower Troop equipped

    // Calculate Average Elixir
    const totalElixir = currentDeck.reduce((sum, card) => sum + (card.elixirCost || 0), 0);
    const avgElixir = totalElixir / currentDeck.length;

    // Count Evolutions & Maxed Cards
    const evoCount = currentDeck.filter(c => c.evolutionLevel && c.evolutionLevel > 0).length;
    const maxedCount = currentDeck.filter(c => c.level >= c.maxLevel).length;

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

            {/* Deck Stats Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                        <div className="text-white/70 text-xs font-bold uppercase mb-1">Avg. Elixir Cost</div>
                        <div className="text-2xl font-mono text-fuchsia-400 font-bold">{avgElixir.toFixed(1)}</div>
                    </div>
                    <Droplets className="w-8 h-8 text-fuchsia-500/20" />
                </div>
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                        <div className="text-white/70 text-xs font-bold uppercase mb-1">Evolutions Active</div>
                        <div className="text-2xl font-mono text-purple-400 font-bold">{evoCount}</div>
                    </div>
                    <Zap className="w-8 h-8 text-purple-500/20" />
                </div>
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                        <div className="text-white/70 text-xs font-bold uppercase mb-1">Maxed Cards</div>
                        <div className="text-2xl font-mono text-yellow-400 font-bold">{maxedCount} / 8</div>
                    </div>
                    <Target className="w-8 h-8 text-yellow-500/20" />
                </div>
            </div>

            {/* Current Deck Grid */}
            <div className="p-6 rounded-3xl border border-white/5 bg-black/20">
                <h3 className="text-white/60 font-semibold mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5" style={{ color: accent }} />
                    Current Battle Deck
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {currentDeck.map((card) => {
                        const isMax = card.level >= card.maxLevel;
                        const hasEvolution = card.evolutionLevel && card.evolutionLevel > 0;

                        return (
                            <div key={card.id} className={`relative p-4 rounded-2xl border transition-all ${hasEvolution ? 'bg-purple-900/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-white/5 border-white/10'
                                }`}>
                                {/* Elixir Badge */}
                                {card.elixirCost !== undefined && (
                                    <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-fuchsia-600 border-2 border-[#1a1f2e] flex items-center justify-center text-xs font-bold text-white shadow-lg z-10">
                                        {card.elixirCost}
                                    </div>
                                )}

                                {/* Star Level Badge */}
                                {card.starLevel && card.starLevel > 0 && (
                                    <div className="absolute top-3 right-3 flex gap-0.5 z-10">
                                        <div className="text-yellow-400 font-bold text-xs drop-shadow-md">{card.starLevel} ★</div>
                                    </div>
                                )}

                                <div className="flex justify-center mb-4 mt-2 min-h-[120px] relative">
                                    {card.evolutionIconUrl && hasEvolution ? (
                                        <img src={card.evolutionIconUrl} alt={card.name} width={93} height={112} loading="lazy" decoding="async" className="h-28 w-auto object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                                    ) : (
                                        <img src={card.iconUrl} alt={card.name} width={93} height={112} loading="lazy" decoding="async" className="h-28 w-auto object-contain drop-shadow-2xl" />
                                    )}
                                </div>

                                <div className="text-center">
                                    <h4 className={`text-sm font-bold mb-1 truncate ${hasEvolution ? 'text-purple-300' : 'text-white'}`}>{card.name}</h4>

                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className={`text-[10px] font-bold uppercase ${getRarityColor(card.rarity)}`}>{card.rarity}</span>
                                        <span className="text-xs font-mono text-white/50">Lvl {card.level}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tower Troop */}
                {supportCard && (
                    <div className="p-6 rounded-3xl border border-white/5 bg-blue-900/10 flex items-center gap-6">
                        <img src={supportCard.iconUrl} alt={supportCard.name} width={96} height={96} loading="lazy" decoding="async" className="w-24 h-24 object-contain drop-shadow-xl" />
                        <div>
                            <h4 className="text-white/70 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                <Flame className="w-3 h-3 text-orange-400" />
                                Active Tower Troop
                            </h4>
                            <div className="text-xl font-bold text-white mb-1">{supportCard.name}</div>
                            <div className="flex gap-2 text-sm">
                                <span className={getRarityColor(supportCard.rarity)}>{supportCard.rarity}</span>
                                <span className="text-white/50">&bull; Lv {supportCard.level}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Favorite Card */}
                {favoriteCard && (
                    <div className="p-6 rounded-3xl border border-white/5 bg-red-900/10 flex items-center gap-6">
                        <img src={favoriteCard.iconUrl} alt={favoriteCard.name} width={80} height={96} loading="lazy" decoding="async" className="w-20 h-auto object-contain drop-shadow-xl" />
                        <div>
                            <h4 className="text-white/70 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                <Heart className="w-3 h-3 text-red-400" />
                                Favorite Card
                            </h4>
                            <div className="text-xl font-bold text-white mb-1">{favoriteCard.name}</div>
                            <span className={`text-sm ${getRarityColor(favoriteCard.rarity)}`}>{favoriteCard.rarity}</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
