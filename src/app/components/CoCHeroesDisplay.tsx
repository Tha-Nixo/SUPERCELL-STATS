import { CoCHeroData, CoCHeroEquipment } from '../data/mockStats';
import { Shield } from 'lucide-react';

// Hero image URLs
const HERO_IMAGE_URLS: Record<string, string> = {
    'Barbarian King': '/images/coc/heroes/Barbarian_King_2_grass.webp',
    'Archer Queen': '/images/coc/heroes/Archer_Queen_1.webp',
    'Grand Warden': '/images/coc/heroes/Grand_Warden_2_grass.webp',
    'Royal Champion': '/images/coc/heroes/Royal_Champion_2_grass.webp',
    'Battle Machine': '/images/coc/heroes/Battle_Machine_2_grass.webp',
    'Battle Copter': '/images/coc/heroes/Battle_Copter_1.webp',
    'Minion Prince': '/images/coc/heroes/Hero_Minion_Prince_02_grass.webp',
    'Dragon Duke': '/images/coc/heroes/DragonDuke_f011_4k.webp',
};

function HeroProgressBar({ level, maxLevel, color }: { level: number; maxLevel: number; color: string }) {
    const pct = maxLevel > 0 ? Math.round((level / maxLevel) * 100) : 0;
    return (
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
            <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

interface CoCHeroesDisplayProps {
    heroes: CoCHeroData[];
    heroEquipment?: CoCHeroEquipment[];
    leagueBadgeUrl?: string;
    clanBadgeUrl?: string;
    leagueName: string;
    accent: string;
}

export function CoCHeroesDisplay({ heroes, heroEquipment = [], leagueBadgeUrl, clanBadgeUrl, leagueName, accent }: CoCHeroesDisplayProps) {
    const villagHeroes = heroes.filter(h => h.shortName !== 'BM' && h.shortName !== 'BC');
    const builderHeroes = heroes.filter(h => h.shortName === 'BM' || h.shortName === 'BC');

    return (
        <div>
            {/* Header row: TH level + League badge */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Heroes</h4>
                <div className="flex items-center gap-3">
                    {leagueBadgeUrl && (
                        <div className="flex items-center gap-1.5">
                            <img src={leagueBadgeUrl} alt={leagueName} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <span className="text-white/60 text-xs">{leagueName}</span>
                        </div>
                    )}
                    {clanBadgeUrl && (
                        <img src={clanBadgeUrl} alt="Clan" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                </div>
            </div>

            {/* Village heroes row */}
            {villagHeroes.length > 0 && (
                <div className="flex flex-wrap justify-center gap-4 mb-4">
                    {villagHeroes.map(hero => {
                        const imgUrl = HERO_IMAGE_URLS[hero.name] ?? '';
                        const pct = hero.maxLevel > 0 ? Math.round((hero.level / hero.maxLevel) * 100) : 0;
                        return (
                            <div
                                key={hero.shortName}
                                className="group relative flex flex-col items-center p-4 rounded-2xl border border-white/8 bg-white/4 transition-all hover:bg-white/7 w-[160px] flex-1 max-w-[200px]"
                                style={{ borderColor: `${hero.color}30` }}
                            >
                                {/* Hero portrait */}
                                <div
                                    className="relative w-20 h-20 rounded-2xl overflow-hidden mb-3 shadow-xl"
                                    style={{ background: `radial-gradient(circle, ${hero.color}30, #0B0F1A)`, border: `2px solid ${hero.color}50` }}
                                >
                                    {imgUrl ? (
                                        <img
                                            src={imgUrl}
                                            alt={hero.name}
                                            width={80}
                                            height={80}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const img = e.target as HTMLImageElement;
                                                img.style.display = 'none';
                                                const fallback = img.nextSibling as HTMLElement;
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`${imgUrl ? 'hidden' : 'flex'} w-full h-full items-center justify-center text-4xl`}
                                    >
                                        {hero.emoji}
                                    </div>
                                    {/* Level badge */}
                                    <div
                                        className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[11px] font-black text-white shadow-md"
                                        style={{ backgroundColor: hero.color }}
                                    >
                                        {hero.level}
                                    </div>
                                </div>

                                <p className="text-white/60 text-[11px] mt-1 mb-0.5 font-medium">Lv {hero.level} / {hero.maxLevel}</p>

                                {/* Progress bar */}
                                <div className="w-full mt-2">
                                    <HeroProgressBar level={hero.level} maxLevel={hero.maxLevel} color={hero.color} />
                                    <p className="text-right text-[9px] text-white/55 mt-0.5">{pct}%</p>
                                </div>

                                {/* Equipped Items */}
                                {hero.equipment && hero.equipment.length > 0 && (
                                    <div className="w-full mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5">
                                        {hero.equipment.map((eq, i) => (
                                            <div key={i} className="flex items-center justify-between bg-black/40 rounded-lg px-2 py-1.5 border border-white/5">
                                                <span className="text-[10px] text-white/70 truncate mr-2">{eq.name}</span>
                                                <span className="text-[10px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded">{eq.level}/{eq.maxLevel}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Builder Base heroes — compact row */}
            {builderHeroes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {builderHeroes.map(bhHero => (
                        <div
                            key={bhHero.name}
                            className="flex items-center gap-4 p-3 rounded-xl border border-white/8 bg-white/4"
                            style={{ borderColor: `${bhHero.color}30` }}
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shrink-0 overflow-hidden relative"
                                style={{ background: `${bhHero.color}20`, border: `1px solid ${bhHero.color}40` }}
                            >
                                {HERO_IMAGE_URLS[bhHero.name] ? (
                                    <img
                                        src={HERO_IMAGE_URLS[bhHero.name]}
                                        alt={bhHero.name}
                                        width={58}
                                        height={58}
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute top-1 w-[120%] h-[120%] object-cover"
                                        style={{ objectPosition: 'top' }}
                                    />
                                ) : (
                                    bhHero.emoji
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/80 text-sm font-semibold truncate">{bhHero.name}</span>
                                    <span className="text-white/50 text-xs shrink-0 ml-2">{bhHero.level} / {bhHero.maxLevel}</span>
                                </div>
                                <HeroProgressBar level={bhHero.level} maxLevel={bhHero.maxLevel} color={bhHero.color} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Equipment Inventory */}
            {heroEquipment.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-widest mb-4">
                        <Shield className="w-4 h-4" style={{ color: accent }} />
                        Equipment Inventory
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {heroEquipment.map((eq, i) => {
                            const isMax = eq.level === eq.maxLevel;
                            const pct = eq.maxLevel > 0 ? (eq.level / eq.maxLevel) * 100 : 0;
                            return (
                                <div key={i} className={`p-3 rounded-xl border ${isMax ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 bg-white/5'} flex flex-col justify-between`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-semibold text-white/80 leading-tight">{eq.name}</span>
                                        {isMax && <span className="text-[10px] text-yellow-500 font-black ml-1 uppercase bg-yellow-500/10 px-1 rounded-sm">Max</span>}
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/55 mb-1 font-mono">
                                            <span>Lv {eq.level}</span>
                                            <span>Max {eq.maxLevel}</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: isMax ? '#eab308' : accent }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
