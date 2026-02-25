import { useState, useMemo } from 'react';
import { CRCardData } from '../data/mockStats';
import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

interface CRCardCollectionProps {
    cards: CRCardData[];
    accent: string;
}

const RARITY_COLORS: Record<string, string> = {
    Common: '#bdc3c7',
    Rare: '#f39c12',
    Epic: '#9b59b6',
    Legendary: '#00cec9',
    Champion: '#f1c40f',
};

const RARITY_ORDER: Record<string, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    champion: 5,
};

function CardItem({ card, accent }: { card: CRCardData; accent: string }) {
    const isMax = card.level >= 16; // Now only 16 is maxed visually
    const hideProgress = isMax || card.maxCount <= 1;
    const progressPct = isMax ? 100 : Math.min(100, Math.round((card.count / Math.max(card.maxCount, 1)) * 100));
    const rarityColor = RARITY_COLORS[card.rarity || 'Common'] || '#bdc3c7';

    return (
        <div className="group flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden mb-1 transition-transform group-hover:scale-105 group-hover:z-10 bg-black/40 border border-white/10"
                style={{
                    boxShadow: `0 8px 24px -8px ${rarityColor}40`,
                    borderColor: `${rarityColor}50`
                }}>
                {card.iconUrl ? (
                    <img
                        src={card.iconUrl}
                        alt={card.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs text-center p-2">
                        {card.name}
                    </div>
                )}
                {/* Level Badge */}
                <div
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded flex items-center justify-center text-[10px] font-black text-white shadow-md border border-black/30 bg-black/60 backdrop-blur-sm"
                >
                    <span className="text-[8px] mr-0.5 text-white/70">Lvl</span> {card.level}
                </div>
            </div>

            <p className="text-white/80 text-[10px] font-semibold text-center mt-1 leading-tight truncate w-full px-1">
                {card.name}
            </p>

            {/* Progress Bar */}
            <div className="w-10 h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden relative border border-black/20">
                {isMax ? (
                    <div className="absolute inset-0 bg-yellow-400" />
                ) : (
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
                )}
            </div>
            <p className="text-[8px] text-white/40 mt-0.5">
                {card.level >= 16 ? `MAX` : `${card.count}/${card.maxCount}`}
            </p>
        </div>
    );
}

export function CRCardCollection({ cards, accent }: CRCardCollectionProps) {
    const [showAll, setShowAll] = useState(false);
    const [sortBy, setSortBy] = useState<'level' | 'rarity'>('level');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const sortedCards = useMemo(() => {
        if (!cards) return [];
        return [...cards].sort((a, b) => {
            const modifier = sortOrder === 'desc' ? 1 : -1;
            if (sortBy === 'level') {
                return (b.level - a.level || (RARITY_ORDER[(b.rarity || 'common').toLowerCase()] || 0) - (RARITY_ORDER[(a.rarity || 'common').toLowerCase()] || 0)) * modifier;
            } else {
                return ((RARITY_ORDER[(b.rarity || 'common').toLowerCase()] || 0) - (RARITY_ORDER[(a.rarity || 'common').toLowerCase()] || 0) || b.level - a.level) * modifier;
            }
        });
    }, [cards, sortBy, sortOrder]);

    if (!cards || cards.length === 0) return null;

    // Show top 16 by default, or all if toggled
    const displayCards = showAll ? sortedCards : sortedCards.slice(0, 16);

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest">
                        Card Collection
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-mono">
                        {cards.length} Cards
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setSortBy('level')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${sortBy === 'level' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                        >
                            Level
                        </button>
                        <button
                            onClick={() => setSortBy('rarity')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${sortBy === 'rarity' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                        >
                            Rarity
                        </button>
                    </div>
                    {/* Sort Order Toggle */}
                    <button
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="px-2 py-1 bg-black/40 rounded-lg border border-white/10 text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
                    >
                        {sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </button>
                    {cards.length > 16 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
                        >
                            {showAll ? (
                                <>Show Less <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>Show All <ChevronDown className="w-3 h-3" /></>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {displayCards.map((card, idx) => (
                    <CardItem key={`${card.id}-${idx}`} card={card} accent={accent} />
                ))}
            </div>
        </div>
    );
}
