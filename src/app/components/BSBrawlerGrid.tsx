import { useState } from 'react';
import { BSBrawlerData } from '../data/mockStats';
import { ChevronDown, ChevronUp } from 'lucide-react';

const POWER_COLORS = ['', '#aaa', '#aaa', '#2ecc71', '#2ecc71', '#3498db', '#3498db', '#9b59b6', '#9b59b6', '#e67e22', '#e67e22', '#e74c3c'];

interface BSBrawlerGridProps {
    brawlers: BSBrawlerData[]; // kept as topBrawlers alias
    allBrawlers?: BSBrawlerData[]; // new prop for all brawlers
    accent: string;
}

function PowerLevel({ power }: { power: number }) {
    const color = POWER_COLORS[power] ?? '#e74c3c';
    return (
        <div
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-md border border-black/30 z-10"
            style={{ backgroundColor: color }}
        >
            {power}
        </div>
    );
}

function TrophyBar({ trophies, highest, accent }: { trophies: number; highest: number; accent: string }) {
    const pct = highest > 0 ? Math.round((trophies / highest) * 100) : 100;
    return (
        <div className="w-full h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
        </div>
    );
}

export function BSBrawlerGrid({ brawlers, allBrawlers, accent }: BSBrawlerGridProps) {
    const [showAll, setShowAll] = useState(false);

    if (!brawlers.length) return null;

    const displayBrawlers = showAll && allBrawlers ? allBrawlers : brawlers;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest">
                    {showAll ? 'All Brawlers' : 'Top Brawlers'}
                </h4>
                {allBrawlers && allBrawlers.length > brawlers.length && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
                    >
                        {showAll ? (
                            <>Show Less <ChevronUp className="w-3 h-3" /></>
                        ) : (
                            <>Show All ({allBrawlers.length}) <ChevronDown className="w-3 h-3" /></>
                        )}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
                {displayBrawlers.map((b) => {
                    return (
                        <div
                            key={b.id}
                            className="group flex flex-col items-center"
                        >
                            <div
                                className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-black/40 transition-all duration-200 group-hover:scale-105 group-hover:border-white/25 group-hover:shadow-lg"
                            >
                                {b.imageUrl ? (
                                    <img
                                        src={b.imageUrl}
                                        alt={b.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            img.style.display = 'none';
                                            if (img.nextSibling) (img.nextSibling as HTMLElement).style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div className="hidden w-full h-full items-center justify-center text-3xl">⭐</div>
                                <PowerLevel power={b.power} />
                                {/* Rank badge bottom-left */}
                                <div className="absolute bottom-1 left-1 leading-none drop-shadow-md z-10">
                                    {b.rank > 0 && (
                                        <>
                                            <img
                                                src={`https://cdn.brawlify.com/rank/${b.rank}.png`}
                                                alt={`Rank ${b.rank}`}
                                                className="w-5 h-5 drop-shadow-md"
                                                onError={(e) => {
                                                    const img = e.target as HTMLImageElement;
                                                    img.style.display = 'none';
                                                    if (img.nextSibling) (img.nextSibling as HTMLElement).style.display = 'inline-block';
                                                }}
                                            />
                                            <span className="hidden px-1.5 py-0.5 bg-black/60 rounded border border-white/20 text-[9px] font-black text-white shadow-md">
                                                R{b.rank}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="text-white/70 text-[9px] font-semibold text-center mt-1 leading-tight truncate w-full">
                                {b.name.charAt(0) + b.name.slice(1).toLowerCase()}
                            </p>
                            <p className="text-white/50 text-[9px] text-center">🏆 {b.trophies.toLocaleString()}</p>
                            <TrophyBar trophies={b.trophies} highest={b.highestTrophies} accent={accent} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
