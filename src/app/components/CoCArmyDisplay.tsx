import { useEffect, useMemo, useState } from 'react';
import { CoCTroopData } from '../data/mockStats';
import { resolveCocIcon } from '../data/cocIconIndex';

interface CoCArmyDisplayProps {
    troops?: CoCTroopData[];
    superTroops?: CoCTroopData[];
    builderBaseTroops?: CoCTroopData[];
    spells?: CoCTroopData[];
    siegeMachines?: CoCTroopData[];
    pets?: CoCTroopData[];
    accent: string;
}

// Once a name/category resolves to a real file we keep it, so remounting the grid
// (tab switches, filter changes) never re-walks the candidate list.
const resolvedIconCache = new Map<string, string>();

function buildCandidatePaths(rawName: string, category: string): string[] {
    const formatName = rawName.replace(/ /g, '_');
    const baseName = rawName.replace(/ Spell$/i, '').replace(/ /g, '_');
    const petsName = formatName.replace(/\./g, '');

    const pathsToTry: string[] = [];

    if (category === 'Troops') {
        pathsToTry.push(`/images/coc/troops/Icon_HV_${formatName}.webp`);
        if (rawName === 'Minion') pathsToTry.push(`/images/coc/troops/Icon_HV_Minion.webp`);
        if (rawName === 'Skeleton') pathsToTry.push(`/images/coc/troops/Icon_HV_Skeleton.webp`);
        if (rawName === 'Apprentice Warden') pathsToTry.push(`/images/coc/troops/Icon_HV_Apprentice_Warden.webp`);
        if (rawName === 'Druid') pathsToTry.push(`/images/coc/troops/Druid_HV_01.webp`);
        if (rawName === 'Electro Titan') pathsToTry.push(`/images/coc/troops/Icon_HV_Electro_Titan.webp`);
        if (rawName === 'Root Rider') pathsToTry.push(`/images/coc/troops/Icon_HV_Root_Rider.webp`);
        if (rawName === 'Dragon Rider') pathsToTry.push(`/images/coc/troops/Icon_HV_Dragon_Rider.webp`);
        if (rawName === 'Meteor Golem') pathsToTry.push(
            `/images/coc/troops/Icon_HV_Meteor_Golem.webp`,
            `/images/coc/troops/MeteoriteGolem_withGrassbase_f22_3k.webp`,
            `/images/coc/troops/Icon_HV_Meteorite_Golem.webp`
        );
        if (rawName === 'Furnace') pathsToTry.push(`/images/coc/troops/Icon_HV_Furnace.webp`);
        if (rawName === 'Thrower') pathsToTry.push(`/images/coc/troops/Thrower_05_grass.webp`);
        if (rawName === 'Sneezy') pathsToTry.push(`/images/coc/troops/Icon_HV_Sneaky_Goblin.webp`);
        if (rawName === 'Greedy Raven') pathsToTry.push(`/images/coc/pets/pet_Greedy_Raven_3_grasspng.webp`, `/images/coc/pets/Raven.webp`);
        pathsToTry.push(`/images/coc/clan_capital/Icon_CC_Troop_${formatName}.webp`);
        pathsToTry.push(`/images/coc/builder_base/Icon_BB_${formatName}.webp`);
    } else if (category === 'Super Troops') {
        pathsToTry.push(`/images/coc/troops/Icon_HV_${formatName}.webp`);
        pathsToTry.push(`/images/coc/troops/Icon_HV_Super_${formatName}.webp`);
        if (rawName === 'Rocket Balloon') pathsToTry.push(`/images/coc/troops/Icon_HV_Super_Rocket_Balloon.webp`);
        if (rawName === 'Ice Hound') pathsToTry.push(`/images/coc/troops/Icon_HV_Super_Ice_Hound.webp`, `/images/coc/troops/Icon_HV_Ice_Hound.webp`);
        if (rawName === 'Super Yeti') pathsToTry.push(`/images/coc/troops/icon_super_yeti.webp`);
        if (rawName === 'Inferno Dragon') pathsToTry.push(`/images/coc/troops/Icon_HV_Super_Inferno_Dragon.webp`, `/images/coc/troops/Icon_HV_Inferno_Dragon.webp`, `/images/coc/troops/Icon_HV_Super_Infernodragon.webp`);
        if (rawName === 'Sneaky Goblin') pathsToTry.push(`/images/coc/troops/Icon_HV_Sneaky_Goblin.webp`);
    } else if (category === 'Builder Base') {
        pathsToTry.push(`/images/coc/builder_base/Icon_BB_${formatName}.webp`);
        if (rawName === 'Power P.E.K.K.A') pathsToTry.push(`/images/coc/builder_base/Icon_BB_Power_P.E.K.K.A.webp`);
    } else if (category === 'Spells') {
        if (rawName === 'Lightning Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Lightning_new.webp`, `/images/coc/spells/Icon_HV_Spell_Lightning.webp`, `/images/coc/spells/lightning_spell.webp`);
        pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_${baseName}.webp`);
        pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_${baseName}.webp`);
        pathsToTry.push(`/images/coc/spells/Icon_CC_Spell_${baseName}.webp`);
        pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_${baseName}_new.webp`);
        pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_${baseName}_new.webp`);
        if (rawName === 'Poison Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Poison.webp`);
        if (rawName === 'Earthquake Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Earthquake.webp`);
        if (rawName === 'Haste Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Haste.webp`);
        if (rawName === 'Skeleton Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Skeleton.webp`);
        if (rawName === 'Bat Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Bat.webp`);
        if (rawName === 'Overgrowth Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Overgrowth.webp`);
        if (rawName === 'Healing Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Heal.webp`);
        if (rawName.includes('Ice')) pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Ice_block.webp`);
        if (rawName === 'Invisibility Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Invisibility.webp`);
        if (rawName === 'Recall Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Recall.webp`);
        if (rawName === 'Revive Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Revive.webp`);
        if (rawName === 'Totem Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_totem.webp`);
    } else if (category === 'Siege Machines') {
        pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_${formatName}.webp`);
        if (rawName === 'Wall Wrecker') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Wall_Wrecker.webp`);
        if (rawName === 'Battle Blimp') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Battle_Blimp.webp`);
        if (rawName === 'Stone Slammer') pathsToTry.push(`/images/coc/siege_machines/Siege_Machine_HV_Stone_Slammer_2.webp`, `/images/coc/siege_machines/Icon_HV_Siege_Machine_Stone_Slammer.webp`);
        if (rawName === 'Siege Barracks') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Siege_Barracks.webp`);
        if (rawName === 'Log Launcher') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Log_Launcher.webp`);
        if (rawName === 'Flame Flinger') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Flame_Flinger.webp`);
        if (rawName === 'Battle Drill' || rawName === 'Drill') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Battle_Drill.webp`);
        if (rawName === 'Troop Launcher') pathsToTry.push(`/images/coc/siege_machines/icon_troop_launcher.webp`);
    } else if (category === 'Hero Pets') {
        pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_${petsName}.webp`);
        pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_${formatName}.webp`);
        if (rawName === 'L.A.S.S.I') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_LASSI.webp`);
        if (rawName === 'Mighty Yak') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Mighty_Yak.webp`);
        if (rawName === 'Electro Owl') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Electro_Owl.webp`);
        if (rawName === 'Poison Lizard') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Poison_Lizard.webp`);
        if (rawName === 'Spirit Fox') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Spirit_Fox.webp`);
        if (rawName === 'Angry Jelly') pathsToTry.push(`/images/coc/pets/Hero_Pet_HV_Angry_Jelly_02.webp`, `/images/coc/pets/jelly_2024.webp`);
        if (rawName === 'Raven') pathsToTry.push(`/images/coc/pets/pet_Greedy_Raven_3_grasspng.webp`, `/images/coc/pets/Raven.webp`);
        if (rawName === 'Vampbat') pathsToTry.push(`/images/coc/pets/Vampbat.webp`);
        // Greedy Crow — try multiple name variants
        if (rawName === 'Greedy Crow' || rawName === 'Greedy Raven') {
            pathsToTry.push(
                `/images/coc/pets/Icon_HV_Hero_Pets_Greedy_Crow.webp`,
                `/images/coc/pets/Icon_HV_Hero_Pets_Greedy_Raven.webp`,
                `/images/coc/pets/pet_Greedy_Raven_3_grasspng.webp`,
                `/images/coc/pets/Raven.webp`,
                `/images/coc/pets/Greedy_Crow.webp`
            );
        }
    }

    pathsToTry.push(`/images/coc/troops/${rawName.toLowerCase().replace(/ /g, '_')}.webp`);

    // Resolve against the build-time index instead of letting the browser
    // discover the misses. In production a missing icon is not a 404 — the SPA
    // fallback answers 200 with index.html — so every wrong candidate cost a
    // full request that could only fail at decode time.
    const found = resolveCocIcon(pathsToTry);
    return found ? [found] : [];
}

function TroopIcon({ troop, category, accent }: { troop: CoCTroopData; category: string; accent: string }) {
    const cacheKey = `${category}|${troop.name}`;
    // The rendered <img> walks the candidate list itself, so nothing is fetched
    // until the browser decides the tile is worth loading.
    const paths = useMemo(() => {
        const cached = resolvedIconCache.get(cacheKey);
        if (cached !== undefined) return cached ? [cached] : [];
        return buildCandidatePaths(troop.name, category);
    }, [cacheKey, troop.name, category]);

    const [idx, setIdx] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setIdx(0);
        setLoaded(false);
    }, [paths]);

    const hasError = idx >= paths.length;

    const handleLoad = () => {
        resolvedIconCache.set(cacheKey, paths[idx]);
        setLoaded(true);
    };

    const handleError = () => {
        if (idx + 1 >= paths.length) resolvedIconCache.set(cacheKey, '');
        setIdx(idx + 1);
    };

    return (
        <div
            className="w-full h-full flex items-center justify-center font-black relative overflow-hidden"
            style={{ background: hasError ? `linear-gradient(135deg, ${accent}80, ${accent}40)` : `linear-gradient(135deg, ${accent}30, transparent)` }}
        >
            <div className={`absolute inset-0 flex items-center justify-center text-white font-black text-xl drop-shadow-md transition-opacity duration-300 ${hasError ? 'opacity-100' : 'opacity-0'}`}>
                {troop.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            {!hasError && (
                <img
                    src={paths[idx]}
                    alt={troop.name}
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`w-full h-full object-contain filter drop-shadow-lg scale-125 transition-opacity duration-300 absolute inset-0 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                />
            )}
        </div>
    );
}

function TroopGrid({ items, title, accent }: { items: CoCTroopData[]; title: string; accent: string }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="mb-6 last:mb-0">
            <h5 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-3">
                {title} <span className="text-[10px] ml-2 text-white/55">({items.length})</span>
            </h5>
            <div className="flex flex-wrap gap-2">
                {items.map((t, idx) => {
                    const isMax = t.level === t.maxLevel;
                    return (
                        <div
                            key={`${t.name}-${idx}`}
                            title={`${t.name} (Max: ${t.maxLevel})`}
                            className="group relative flex items-center justify-center w-12 h-12 rounded-lg bg-black/40 border border-white/10 overflow-hidden hover:scale-110 transition-transform"
                        >
                            <TroopIcon troop={t} category={title} accent={accent} />
                            <div
                                className="absolute bottom-0 inset-x-0 h-4 flex items-center justify-center text-[9px] font-bold text-white shadow-md bg-black/60 backdrop-blur-sm"
                                style={isMax ? { color: '#f1c40f' } : {}}
                            >
                                <span className="opacity-70 mr-0.5 font-normal">Lvl</span> {t.level}
                            </div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 border border-white/10 shadow-lg">
                                {t.name} (Max: {t.maxLevel})
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function CoCArmyDisplay({ troops, superTroops, builderBaseTroops, spells, siegeMachines, pets, accent }: CoCArmyDisplayProps) {
    const hasAny = (troops?.length || 0) + (superTroops?.length || 0) + (builderBaseTroops?.length || 0) + (spells?.length || 0) + (siegeMachines?.length || 0) + (pets?.length || 0) > 0;
    if (!hasAny) return null;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
            <h4 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-6">Army Collection</h4>
            <TroopGrid items={troops || []} title="Troops" accent={accent} />
            <TroopGrid items={builderBaseTroops || []} title="Builder Base" accent={accent} />
            <TroopGrid items={superTroops || []} title="Super Troops" accent={accent} />
            <TroopGrid items={spells || []} title="Spells" accent={accent} />
            <TroopGrid items={siegeMachines || []} title="Siege Machines" accent={accent} />
            <TroopGrid items={pets || []} title="Hero Pets" accent={accent} />
        </div>
    );
}
