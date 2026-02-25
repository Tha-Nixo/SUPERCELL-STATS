import { CoCHeroData } from '../data/mockStats';

// Hero image URLs
const HERO_IMAGE_URLS: Record<string, string> = {
    'Barbarian King': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC8xTXljUG5nUzZyWkcySndXbVVZUC5wbmcifQ:supercell:lo30eJacosJhqFSlJ9jUUXwm-M3aDPEJ2StgNdoD4aU?width=400',
    'Archer Queen': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9qTkdGRXVYRkVQRGNZbzZuVmRuZS5wbmcifQ:supercell:PlJVanSyK5-YIqzA2cZ8wdKANt2UruSXP2O1xr6nbgo?width=400',
    'Grand Warden': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9SWndZYk5YbkV6QlJSYXo2VkUyVy5wbmcifQ:supercell:S7JkNYch5l1Pwv_DMeyLj_HqR-Ovl0QjhY65MUmG6zg?width=400',
    'Royal Champion': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9IRmZhWFZ4UjRIeEhiYkhTZE15VC5wbmcifQ:supercell:QPBmmHT0nW6bwiWZ-Yrke3-MSMM5sAJfYzeG_lVKWm0?width=400',
    'Battle Machine': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9rOWpvb2ZYS0ZHUXozQko2cnNSWS5wbmcifQ:supercell:NuCmWDFViu85lsFNJhzRkxx--T6CLnQBtIwUXcZytwk?width=400',
    'Minion Prince': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC8xQkRyV3BranZzSG1MZG81QWdIWS5wbmcifQ:supercell:CDtGTVyA97Z9QN298JeaJJze-gBxE7ldbU7ZNXoThUY?width=400',
};

interface CoCArcanaBarProps {
    label: string;
    level: number;
    maxLevel: number;
    color: string;
}

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
    townHallLevel: number;
    builderHallLevel: number;
    leagueBadgeUrl?: string;
    clanBadgeUrl?: string;
    leagueName: string;
    accentColor: string;
}

export function CoCHeroesDisplay({ heroes, townHallLevel, builderHallLevel, leagueBadgeUrl, clanBadgeUrl, leagueName, accentColor }: CoCHeroesDisplayProps) {
    const villagHeroes = heroes.filter(h => h.shortName !== 'BM');
    const bhHero = heroes.find(h => h.shortName === 'BM');

    return (
        <div>
            {/* Header row: TH level + League badge */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Heroes</h4>
                <div className="flex items-center gap-3">
                    {leagueBadgeUrl && (
                        <div className="flex items-center gap-1.5">
                            <img src={leagueBadgeUrl} alt={leagueName} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <span className="text-white/60 text-xs">{leagueName}</span>
                        </div>
                    )}
                    {clanBadgeUrl && (
                        <img src={clanBadgeUrl} alt="Clan" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                                className="group relative flex flex-col items-center p-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/7 transition-all hover:border-white/20 w-[140px] flex-1 max-w-[170px]"
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
                                    <p className="text-right text-[9px] text-white/30 mt-0.5">{pct}%</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Builder Base hero — compact row */}
            {bhHero && (
                <div
                    className="flex items-center gap-4 p-3 rounded-xl border border-white/8 bg-white/4"
                    style={{ borderColor: `${bhHero.color}30` }}
                >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden relative"
                        style={{ background: `${bhHero.color}20`, border: `1px solid ${bhHero.color}40` }}
                    >
                        {HERO_IMAGE_URLS[bhHero.name] ? (
                            <img
                                src={HERO_IMAGE_URLS[bhHero.name]}
                                alt={bhHero.name}
                                className="absolute top-1 w-[120%] h-[120%] object-cover"
                                style={{ objectPosition: 'top' }}
                            />
                        ) : (
                            bhHero.emoji
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="text-white/70 text-xs font-semibold">Battle Machine</span>
                            <span className="text-white/50 text-xs">{bhHero.level} / {bhHero.maxLevel}</span>
                        </div>
                        <HeroProgressBar level={bhHero.level} maxLevel={bhHero.maxLevel} color={bhHero.color} />
                    </div>
                    {builderHallLevel > 0 && (
                        <div className="text-white/40 text-xs shrink-0 text-right">
                            BH {builderHallLevel}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
