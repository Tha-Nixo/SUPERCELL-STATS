import { useState } from 'react';
import { CoCTroopData } from '../data/mockStats';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CoCArmyDisplayProps {
    troops?: CoCTroopData[];
    spells?: CoCTroopData[];
    siegeMachines?: CoCTroopData[];
    pets?: CoCTroopData[];
    accent: string;
}

function TroopIcon({ troop, accent }: { troop: CoCTroopData; accent: string }) {
    const [hasError, setHasError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    return (
        <div
            className="w-full h-full flex items-center justify-center font-black relative overflow-hidden"
            style={{
                background: hasError ? `linear-gradient(135deg, ${accent}80, ${accent}40)` : `linear-gradient(135deg, ${accent}30, transparent)`
            }}
        >
            {/* Fallback Initials */}
            <div className={`absolute inset-0 flex items-center justify-center w-full h-full text-white font-black text-xl drop-shadow-md transition-opacity duration-300 ${hasError ? 'opacity-100' : 'opacity-0'}`}>
                {troop.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>

            {/* Actually attempt image load */}
            <img
                src={`/assets/troops/Icon_HV_${troop.name.replace(/ /g, '')}.png`}
                alt={troop.name}
                className={`w-full h-full object-contain filter drop-shadow-lg scale-125 transition-opacity duration-300 absolute inset-0 ${(loaded && !hasError) ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={() => {
                    setHasError(true);
                    setLoaded(true); // stop waiting
                }}
            />
        </div>
    );
}

function TroopGrid({ items, title, accent }: { items: CoCTroopData[]; title: string; accent: string }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="mb-6 last:mb-0">
            <h5 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                {title} <span className="text-[10px] ml-2 text-white/30">({items.length})</span>
            </h5>
            <div className="flex flex-wrap gap-2">
                {items.map((t, idx) => {
                    const isMax = t.level === t.maxLevel;
                    return (
                        <div key={`${t.name}-${idx}`} className="group relative flex items-center justify-center w-12 h-12 rounded-lg bg-black/40 border border-white/10 overflow-hidden hover:scale-110 transition-transform">
                            {/* Robust Fallback avatar component */}
                            <TroopIcon troop={t} accent={accent} />

                            {/* Level Badge */}
                            <div
                                className="absolute bottom-0 inset-x-0 h-4 flex items-center justify-center text-[9px] font-bold text-white shadow-md bg-black/60 backdrop-blur-sm"
                                style={isMax ? { color: '#f1c40f' } : {}}
                            >
                                <span className="opacity-70 mr-0.5 font-normal">Lvl</span> {t.level}
                            </div>

                            {/* Tooltip */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10 shadow-lg">
                                {t.name} (Max: {t.maxLevel})
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function CoCArmyDisplay({ troops, spells, siegeMachines, pets, accent }: CoCArmyDisplayProps) {
    const [showAll, setShowAll] = useState(false);

    const hasAny = (troops?.length || 0) + (spells?.length || 0) + (siegeMachines?.length || 0) + (pets?.length || 0) > 0;
    if (!hasAny) return null;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest">
                        Army Collection
                    </h4>
                </div>
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                    {showAll ? (
                        <>Hide Details <ChevronUp className="w-3 h-3" /></>
                    ) : (
                        <>Show All <ChevronDown className="w-3 h-3" /></>
                    )}
                </button>
            </div>

            {showAll ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <TroopGrid items={troops || []} title="Troops" accent={accent} />
                    <TroopGrid items={spells || []} title="Spells" accent={accent} />
                    <TroopGrid items={siegeMachines || []} title="Siege Machines" accent={accent} />
                    <TroopGrid items={pets || []} title="Hero Pets" accent={accent} />
                </div>
            ) : (
                <div className="flex items-center gap-4 text-sm text-white/40">
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-white/70">{troops?.length || 0}</span> Troops
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-white/70">{spells?.length || 0}</span> Spells
                    </div>
                    {((siegeMachines?.length || 0) > 0 || (pets?.length || 0) > 0) && (
                        <>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-white/70">{(siegeMachines?.length || 0) + (pets?.length || 0)}</span> Support
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
