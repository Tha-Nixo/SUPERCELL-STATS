import { useState } from 'react';
import { BSBrawlerData } from '../data/mockStats';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { getBSTierInfo } from '../utils/bsTiers';
import { motion } from 'motion/react';

interface BSBrawlerGridProps {
    brawlers: BSBrawlerData[]; // kept as topBrawlers alias
    allBrawlers?: BSBrawlerData[]; // new prop for all brawlers
    accent: string;
    variant?: 'grid' | 'podium' | 'detailed';
}

function PowerLevel({ power, hasOverdrive = false }: { power: number; hasOverdrive?: boolean }) {
    if (power < 1 || power > 11) return null;

    // For level 11 with Hypercharge/Overdrive, use a special icon
    if (power === 11 && hasOverdrive) {
        return (
            <div className="absolute top-1 right-1 z-10">
                <img
                    src="https://cdn.brawlify.com/icon/Hypercharge.png"
                    alt="Hypercharge Power 11"
                    className="w-7 h-7 object-contain drop-shadow-md"
                    title="Power 11 (Hypercharge)"
                    onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        if (img.nextSibling) {
                            (img.nextSibling as HTMLElement).style.display = 'flex';
                        }
                    }}
                />
                <div className="hidden w-5 h-5 rounded items-center justify-center text-[9px] font-black text-white shadow-md border-2 border-[#ff00ff] bg-[#800080]">
                    11
                </div>
            </div>
        );
    }

    return (
        <div className="absolute top-1 right-1 z-10">
            <img
                src={`https://cdn.brawlify.com/power/${power}.png`}
                alt={`Power ${power}`}
                className="w-6 h-6 object-contain drop-shadow-md"
                title={`Power ${power}`}
                onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    if (img.nextSibling) {
                        (img.nextSibling as HTMLElement).style.display = 'flex';
                    }
                }}
            />
            {/* Fallback if Brawlify icon fails to load */}
            <div
                className="hidden w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white shadow-md border border-black/50 bg-[#e74c3c]"
            >
                {power}
            </div>
        </div>
    );
}

function TrophyBar({ trophies, accent }: { trophies: number; accent: string }) {
    const tier = getBSTierInfo(trophies);
    const nextTier = getBSTierInfo(tier.nextThreshold);
    const range = tier.nextThreshold - tier.currentTierMin;
    const progress = Math.max(0, trophies - tier.currentTierMin);
    const pct = Math.min(100, Math.round((progress / range) * 100));

    return (
        <div className="w-full flex flex-col gap-0.5 mt-1.5 relative">
            {/* Next Tier Icon above the end of the bar */}
            <div className="absolute -top-3.5 right-0 flex items-center justify-center">
                <img
                    src={nextTier.iconPath}
                    alt={nextTier.name}
                    className="w-3.5 h-3.5 object-contain drop-shadow-md"
                    title={`Next: ${nextTier.name}`}
                    onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        if (img.nextSibling) {
                            (img.nextSibling as HTMLElement).style.display = 'flex';
                        }
                    }}
                />
                <div className="hidden w-3 h-3 items-center justify-center bg-black/70 rounded border border-white/30 text-[6px] font-black text-white shadow-md">
                    {nextTier.name.substring(0, 1).toUpperCase()}
                </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden border border-white/5 relative">
                <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
            </div>
            <div className="flex justify-between items-center text-[8px] font-mono text-white/40 px-0.5">
                <span>{trophies}</span>
                <span>{tier.nextThreshold}</span>
            </div>
        </div>
    );
}

export function BSBrawlerGrid({ brawlers, allBrawlers, accent, variant = 'grid' }: BSBrawlerGridProps) {
    const [showAll, setShowAll] = useState(false);

    if (!brawlers.length) return null;

    if (variant === 'podium') {
        const podiumBrawlers = (allBrawlers ?? brawlers).slice(0, 3);
        // order: 2nd, 1st, 3rd => indices: 1, 0, 2
        const order = [1, 0, 2];
        const podiumHeights = [{ height: '144px' }, { height: '192px' }, { height: '112px' }]; // explicitly staggering
        const bgColors = ['bg-gradient-to-t from-gray-500 to-gray-300', 'bg-gradient-to-t from-yellow-600 to-yellow-300', 'bg-gradient-to-t from-amber-700 to-orange-400']; // Silver, Gold, Bronze
        const textColors = ['text-gray-900', 'text-yellow-950', 'text-amber-950'];

        return (
            <div className="flex justify-center items-end gap-2 sm:gap-6 mt-8 h-[340px] pb-4 px-2">
                {order.map((idx, i) => {
                    const b = podiumBrawlers[idx];
                    if (!b) return null;
                    const tierInfo = getBSTierInfo(b.trophies);
                    return (
                        <div key={b.id} className="flex flex-col items-center justify-end w-24 sm:w-32">
                            {/* Brawler Portrait */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.15 }}
                                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 mb-3 z-10 shadow-2xl flex-shrink-0 bg-black/50"
                                style={{ borderColor: accent }}
                            >
                                {b.imageUrl && <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" />}
                                <PowerLevel power={b.power} hasOverdrive={b.power === 11} />
                                <div className="absolute top-0 left-0 bg-black/80 rounded-br-xl px-1.5 py-1 text-[10px] sm:text-xs font-black text-white shadow-lg border-b border-r border-white/20">
                                    {tierInfo.name.substring(0, 3).toUpperCase()}
                                </div>
                            </motion.div>
                            {/* Podium Step */}
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: podiumHeights[i].height }}
                                transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 100 }}
                                style={podiumHeights[i]}
                                className={`w-full ${bgColors[i]} rounded-t-xl flex flex-col items-center pt-3 sm:pt-4 shadow-[0_0_30px_rgba(255,255,255,0.1)] relative overflow-hidden`}
                            >
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

                                <span className={`font-black text-3xl sm:text-5xl ${textColors[i]} drop-shadow-md leading-none`}>{idx + 1}</span>
                                <span className={`font-extrabold text-[10px] sm:text-xs ${textColors[i]} uppercase truncate w-full text-center px-1 mt-1 drop-shadow-sm`}>{b.name}</span>
                                <div className={`mt-auto mb-3 px-3 py-1 rounded-full bg-black/20 font-black text-xs sm:text-sm ${textColors[i]} shadow-inner`}>{b.trophies} 🏆</div>
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const displayBrawlers = showAll && allBrawlers ? allBrawlers : brawlers;

    if (variant === 'detailed') {
        const listToDisplay = allBrawlers ?? brawlers;
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {listToDisplay.map(b => {
                    const hasHypercharge = b.power === 11;
                    const tierInfo = getBSTierInfo(b.trophies);

                    return (
                        <div key={b.id} className="bg-black/40 rounded-3xl p-5 border border-white/10 flex flex-col gap-4 hover:border-white/20 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] relative overflow-hidden group">
                            {/* Decorative glow */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors pointer-events-none" />

                            {/* Header */}
                            <div className="flex gap-4 items-center">
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/20 flex-shrink-0 bg-black/60 shadow-inner">
                                    {b.imageUrl && <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" />}
                                    <PowerLevel power={b.power} hasOverdrive={hasHypercharge} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-lg sm:text-xl text-white uppercase truncate tracking-widest">{b.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="bg-white/10 p-1 rounded-lg border border-white/10">
                                            <img src={tierInfo.iconPath} alt={tierInfo.name} className="w-5 h-5 object-contain drop-shadow" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-mono text-sm font-bold leading-tight">{b.trophies} <span className="text-white/40 text-xs">/ {tierInfo.nextThreshold}</span></span>
                                            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest leading-none">{tierInfo.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <TrophyBar trophies={b.trophies} accent={accent} />

                            {/* Equipped (Active) */}
                            <div className="bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-white/5 shadow-inner mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Equipped</span>
                                    <span className="text-[10px] text-white/50 font-medium">Last active setup</span>
                                </div>
                                <div className="flex gap-1.5 sm:gap-2">
                                    {hasHypercharge && (
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-purple-900/30 rounded-xl border-2 border-purple-500/60 drop-shadow-lg" title="Hypercharge">
                                            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 fill-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                        </div>
                                    )}
                                    {b.starPowersList?.[0] && (
                                        <div className="relative">
                                            <img src={`https://cdn.brawlify.com/star-powers/borderless/${b.starPowersList[0].id}.png`} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-lg bg-yellow-900/30 rounded-xl border-2 border-yellow-500/60 p-1" title={b.starPowersList[0].name} onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/star-powers/${b.starPowersList![0].id}.png`; } else { t.parentElement!.style.display = 'none'; } }} />
                                        </div>
                                    )}
                                    {b.gadgetsList?.[0] && (
                                        <div className="relative">
                                            <img src={`https://cdn.brawlify.com/gadgets/borderless/${b.gadgetsList[0].id}.png`} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-lg bg-green-900/30 rounded-xl border-2 border-green-500/60 p-1" title={b.gadgetsList[0].name} onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/gadgets/${b.gadgetsList![0].id}.png`; } else { t.parentElement!.style.display = 'none'; } }} />
                                        </div>
                                    )}
                                    {b.gearsList?.[0] && (
                                        <div className="relative">
                                            <img src={`https://cdn.brawlify.com/gears/borderless/${b.gearsList[0].id}.png`} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-lg bg-blue-900/30 rounded-xl border-2 border-blue-500/60 p-1" title={b.gearsList[0].name} onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/gears/${b.gearsList![0].id}.png`; } else { t.parentElement!.style.display = 'none'; } }} />
                                        </div>
                                    )}
                                    {!hasHypercharge && !b.starPowersList?.[0] && !b.gadgetsList?.[0] && !b.gearsList?.[0] && (
                                        <span className="text-white/20 text-xs italic py-2">No items</span>
                                    )}
                                </div>
                            </div>

                            {/* Collection */}
                            <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-3 border border-white/5 shadow-inner">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Collection</span>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {hasHypercharge && (
                                        <div className="w-6 h-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-help bg-purple-900/30 rounded border border-purple-500/50" title="Hypercharge Unlocked">
                                            <Zap className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                                        </div>
                                    )}
                                    {b.starPowersList?.map(sp => (
                                        <img key={sp.id} src={`https://cdn.brawlify.com/star-powers/borderless/${sp.id}.png`} className="w-7 h-7 object-contain opacity-70 hover:opacity-100 transition-opacity drop-shadow cursor-help" title={`Star Power: ${sp.name}`} onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/star-powers/${sp.id}.png`; } else { t.style.display = 'none'; } }} />
                                    ))}
                                    {b.gadgetsList?.map(g => (
                                        <img key={g.id} src={`https://cdn.brawlify.com/gadgets/borderless/${g.id}.png`} className="w-7 h-7 object-contain opacity-70 hover:opacity-100 transition-opacity drop-shadow cursor-help" title={`Gadget: ${g.name}`} onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/gadgets/${g.id}.png`; } else { t.style.display = 'none'; } }} />
                                    ))}
                                    {b.gearsList?.map(g => (
                                        <img key={g.id} src={`https://cdn.brawlify.com/gears/borderless/${g.id}.png`} className="w-7 h-7 object-contain opacity-70 hover:opacity-100 transition-opacity drop-shadow cursor-help" title={`Gear: ${g.name}`} onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('borderless')) { t.src = `https://cdn.brawlify.com/gears/${g.id}.png`; } else { t.style.display = 'none'; } }} />
                                    ))}
                                    {!hasHypercharge && !b.starPowersList?.length && !b.gadgetsList?.length && !b.gearsList?.length && (
                                        <span className="text-white/20 text-[10px] italic">Empty Collection</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Default 'grid' view
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
                        <div key={b.id} className="group flex flex-col items-center">
                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-black/40 transition-all duration-200 group-hover:scale-105 group-hover:border-white/25 group-hover:shadow-lg">
                                {b.imageUrl ? (
                                    <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        img.style.display = 'none';
                                        if (img.nextSibling) (img.nextSibling as HTMLElement).style.display = 'flex';
                                    }} />
                                ) : null}
                                <div className="hidden w-full h-full items-center justify-center text-3xl">⭐</div>
                                <PowerLevel power={b.power} hasOverdrive={b.power === 11} />
                                <div className="absolute top-1 left-1 leading-none drop-shadow-md z-10 flex items-center justify-center">
                                    <img src={getBSTierInfo(b.trophies).iconPath} alt={getBSTierInfo(b.trophies).name} className="w-7 h-7 object-contain drop-shadow-lg scale-110" title={getBSTierInfo(b.trophies).name} onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        img.style.display = 'none';
                                        if (img.nextSibling) (img.nextSibling as HTMLElement).style.display = 'flex';
                                    }} />
                                    <div className="hidden w-6 h-6 items-center justify-center bg-black/70 rounded border border-white/30 text-[8px] font-black text-white shadow-md">
                                        {getBSTierInfo(b.trophies).name.substring(0, 3).toUpperCase()}
                                    </div>
                                </div>
                            </div>
                            <p className="text-white/80 text-[10px] font-bold text-center mt-2 leading-tight truncate w-full uppercase tracking-wide">
                                {b.name}
                            </p>
                            <TrophyBar trophies={b.trophies} accent={accent} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
