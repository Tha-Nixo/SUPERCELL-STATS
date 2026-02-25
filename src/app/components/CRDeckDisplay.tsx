import { CRCardData } from '../data/mockStats';

const RARITY_COLORS: Record<string, string> = {
    'Common': '#95a5a6',
    'Rare': '#2ecc71',
    'Epic': '#9b59b6',
    'Legendary': '#f39c12',
    'Champion': '#e74c3c',
};

interface CRDeckDisplayProps {
    cards: CRCardData[];
    accent: string;
    favoriteCard?: CRCardData;
}

function LevelDots({ level, max }: { level: number; max: number }) {
    return (
        <div className="flex gap-0.5 flex-wrap justify-center mt-1">
            {Array.from({ length: Math.min(max, 15) }, (_, i) => (
                <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: i < level ? '#f39c12' : 'rgba(255,255,255,0.12)' }}
                />
            ))}
        </div>
    );
}

export function CRDeckDisplay({ cards, accent, favoriteCard }: CRDeckDisplayProps) {
    if (!cards.length) return null;

    return (
        <div>
            {/* Current Deck */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Current Deck</h4>
                {favoriteCard && (
                    <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>Favourite:</span>
                        {favoriteCard.iconUrl
                            ? <img src={favoriteCard.iconUrl} alt={favoriteCard.name} className="w-6 h-6 rounded object-contain" />
                            : <span className="text-white/60 font-bold">{favoriteCard.name}</span>
                        }
                    </div>
                )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {cards.map((card) => {
                    const rarityColor = RARITY_COLORS[card.rarity ?? ''] ?? '#95a5a6';
                    return (
                        <div key={card.id} className="group flex flex-col items-center">
                            <div
                                className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
                                style={{ borderColor: `${rarityColor}60`, background: `linear-gradient(180deg, ${rarityColor}15, #0B0F1A)` }}
                            >
                                {card.iconUrl ? (
                                    <img
                                        src={card.iconUrl}
                                        alt={card.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-2xl">🃏</div>
                                )}
                                {/* Level badge */}
                                <div
                                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${card.level >= 16 ? 'text-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.6)]' : 'text-white'}`}
                                    style={{ backgroundColor: `${rarityColor}dd` }}
                                >
                                    {card.level >= 16 ? `MAX` : `Lvl ${card.level}`}
                                </div>
                            </div>
                            <p className="text-white/50 text-[9px] text-center mt-1 leading-tight truncate w-full px-0.5">{card.name}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
