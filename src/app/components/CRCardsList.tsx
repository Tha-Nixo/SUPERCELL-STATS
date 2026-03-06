import { useState } from 'react';
import { CRCardData } from '../data/mockStats';
import { Search, Filter, ArrowUpDown, Battery, Layers, Star } from 'lucide-react';

interface CRCardsListProps {
    cards: CRCardData[];
    accent: string;
}

export function CRCardsList({ cards, accent }: CRCardsListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'level' | 'count' | 'elixir'>('level');
    const [filterRarity, setFilterRarity] = useState<string>('all');

    const rarities = ['all', 'common', 'rare', 'epic', 'legendary', 'champion'];

    const filteredCards = cards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRarity = filterRarity === 'all' || card.rarity?.toLowerCase() === filterRarity.toLowerCase();
        return matchesSearch && matchesRarity;
    });

    const sortedCards = [...filteredCards].sort((a, b) => {
        if (sortBy === 'level') return b.level - a.level;
        if (sortBy === 'count') return b.count - a.count;
        if (sortBy === 'elixir') return (b.elixirCost || 0) - (a.elixirCost || 0);
        return 0;
    });

    // We split possessed vs unpossessed
    const ownedCards = sortedCards.filter(c => c.count > 0 || c.level > 1);
    const unownedCards = sortedCards.filter(c => c.count === 0 && c.level <= 1);

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

    const renderCardGrid = (gridCards: CRCardData[], isOwned: boolean) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {gridCards.map((card) => {
                const pct = card.maxCount > 0 ? Math.min(100, (card.count / card.maxCount) * 100) : 0;
                const isMax = card.level >= 16;
                const hasEvolution = card.evolutionLevel && card.evolutionLevel > 0;

                return (
                    <div
                        key={card.id}
                        className={`relative p-3 rounded-2xl border transition-all ${isOwned
                            ? hasEvolution ? 'bg-purple-900/10 border-purple-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            : 'bg-black/40 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                            }`}
                    >
                        {/* Elite / Star Level Badge */}
                        {isOwned && card.starLevel && card.starLevel > 0 && (
                            <div className="absolute top-2 left-2 flex gap-0.5 z-10">
                                {Array.from({ length: card.starLevel }).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                                ))}
                            </div>
                        )}

                        <div className="flex justify-center mb-3 min-h-[100px] relative">
                            {card.evolutionIconUrl && hasEvolution ? (
                                <img src={card.evolutionIconUrl} alt={card.name} className="h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
                            ) : (
                                <img src={card.iconUrl} alt={card.name} className="h-24 w-auto object-contain drop-shadow-xl" />
                            )}

                            {card.elixirCost !== undefined && (
                                <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-fuchsia-600 border-2 border-[#1a1f2e] flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                    {card.elixirCost}
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            <h4 className="text-sm font-bold text-white mb-1 truncate px-1">{card.name}</h4>

                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold uppercase ${getRarityColor(card.rarity)}`}>{card.rarity}</span>
                                <span className="text-xs font-mono text-white/50">Lv {card.level}</span>
                            </div>

                            {/* Progress bar (only for owned) */}
                            {isOwned && !isMax && (
                                <div className="w-full">
                                    <div className="flex justify-between text-[10px] text-white/40 mb-1 font-mono">
                                        <span>{card.count}</span>
                                        <span>{card.maxCount}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: pct >= 100 ? '#eab308' : accent
                                            }}
                                        />
                                    </div>
                                    {pct >= 100 && <div className="text-[9px] text-yellow-500 font-bold uppercase mt-1">Upgrade Available</div>}
                                </div>
                            )}
                            {isOwned && isMax && (
                                <div className="w-full h-1.5 bg-yellow-500/20 rounded-full mt-4 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 animate-shimmer" />
                                    <span className="text-[10px] text-yellow-500 font-bold absolute uppercase">Maxed</span>
                                </div>
                            )}
                            {!isOwned && (
                                <div className="text-[10px] text-white/30 uppercase font-bold mt-2">Not Unlocked</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search cards..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                    />
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <select
                            value={filterRarity}
                            onChange={(e) => setFilterRarity(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30 capitalize"
                        >
                            {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="relative">
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                        >
                            <option value="level">Sort by Level</option>
                            <option value="count">Sort by Copies</option>
                            <option value="elixir">Sort by Elixir</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Owned Grid */}
            {ownedCards.length > 0 && (
                <div>
                    <h3 className="text-white/60 font-semibold mb-4 flex items-center gap-2">
                        <Layers className="w-5 h-5" style={{ color: accent }} />
                        Card Collection ({ownedCards.length})
                    </h3>
                    {renderCardGrid(ownedCards, true)}
                </div>
            )}

            {/* Unowned Grid */}
            {unownedCards.length > 0 && (
                <div className="pt-6 border-t border-white/10">
                    <h3 className="text-white/40 font-semibold mb-4 flex items-center gap-2">
                        <Battery className="w-5 h-5" />
                        Not Found ({unownedCards.length})
                    </h3>
                    {renderCardGrid(unownedCards, false)}
                </div>
            )}

        </div>
    );
}
