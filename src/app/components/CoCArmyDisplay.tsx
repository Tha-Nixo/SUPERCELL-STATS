import { useState, useEffect } from 'react';
import { CoCTroopData } from '../data/mockStats';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CoCArmyDisplayProps {
    troops?: CoCTroopData[];
    superTroops?: CoCTroopData[];
    builderBaseTroops?: CoCTroopData[];
    spells?: CoCTroopData[];
    siegeMachines?: CoCTroopData[];
    pets?: CoCTroopData[];
    accent: string;
}

function TroopIcon({ troop, category, accent }: { troop: CoCTroopData; category: string; accent: string }) {
    const [hasError, setHasError] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [imgSrc, setImgSrc] = useState<string>('');

    useEffect(() => {
        const formatName = troop.name.replace(/ /g, '_');
        const baseName = troop.name.replace(/ Spell$/i, '').replace(/ /g, '_');
        const petsName = formatName.replace(/\./g, '');

        const pathsToTry: string[] = [];
        const rawName = troop.name;

        if (category === 'Troops') {
            pathsToTry.push(`/images/coc/troops/Icon_HV_${formatName}.png`);
            // Some specific troop fallbacks
            if (rawName === 'Minion') pathsToTry.push(`/images/coc/troops/Icon_HV_Minion.png`);
            if (rawName === 'Skeleton') pathsToTry.push(`/images/coc/troops/Icon_HV_Skeleton.png`);
            if (rawName === 'Apprentice Warden') pathsToTry.push(`/images/coc/troops/Icon_HV_Apprentice_Warden.png`);
            if (rawName === 'Druid') pathsToTry.push(`/images/coc/troops/Druid_HV_01.png`);

            // Fixes for newer/strangely named troops
            if (rawName === 'Electro Titan') pathsToTry.push(`/images/coc/troops/Icon_HV_Electro_Titan.png`);
            if (rawName === 'Root Rider') pathsToTry.push(`/images/coc/troops/Icon_HV_Root_Rider.png`);
            if (rawName === 'Dragon Rider') pathsToTry.push(`/images/coc/troops/Icon_HV_Dragon_Rider.png`);
            if (rawName === 'Meteor Golem') pathsToTry.push(`/images/coc/troops/MeteoriteGolem_withGrassbase_f22_3k.png`);
            if (rawName === 'Furnace') pathsToTry.push(`/images/coc/troops/Icon_HV_Furnace.png`);
            if (rawName === 'Thrower') pathsToTry.push(`/images/coc/troops/Thrower_05_grass.png`);

            // Temporary Event Troops
            if (rawName === 'Sneezy') pathsToTry.push(`/images/coc/troops/Icon_HV_Sneaky_Goblin.png`); // Best guess fallback
            if (rawName === 'Greedy Raven') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Electro_Owl.png`); // Best guess fallback

            pathsToTry.push(`/images/coc/clan_capital/Icon_CC_Troop_${formatName}.png`);
            pathsToTry.push(`/images/coc/builder_base/Icon_BB_${formatName}.png`);
        } else if (category === 'Super Troops') {
            pathsToTry.push(`/images/coc/troops/Icon_HV_${formatName}.png`);
            pathsToTry.push(`/images/coc/troops/Icon_HV_Super_${formatName}.png`);

            if (rawName === 'Rocket Balloon') pathsToTry.push(`/images/coc/troops/Icon_HV_Super_Rocket_Balloon.png`);
            if (rawName === 'Ice Hound') pathsToTry.push(`/images/coc/troops/Icon_HV_Super_Ice_Hound.png`, `/images/coc/troops/Icon_HV_Ice_Hound.png`);
            if (rawName === 'Super Yeti') pathsToTry.push(`/images/coc/troops/icon_super_yeti.png`);
            if (rawName === 'Inferno Dragon') pathsToTry.push(`/images/coc/troops/Icon_HV_Super_Inferno_Dragon.png`, `/images/coc/troops/Icon_HV_Inferno_Dragon.png`);
            if (rawName === 'Inferno Dragon') pathsToTry.push(`/images/coc/troops/Icon_HV_Super_Infernodragon.png`);
            if (rawName === 'Sneaky Goblin') pathsToTry.push(`/images/coc/troops/Icon_HV_Sneaky_Goblin.png`);
        } else if (category === 'Builder Base') {
            pathsToTry.push(`/images/coc/builder_base/Icon_BB_${formatName}.png`);
            // Check for names with dots e.g. Power P.E.K.K.A
            if (rawName === 'Power P.E.K.K.A') pathsToTry.push(`/images/coc/builder_base/Icon_BB_Power_P.E.K.K.A.png`);
        } else if (category === 'Spells') {
            if (rawName === 'Lightning Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Lightning_new.png`, `/images/coc/spells/Icon_HV_Spell_Lightning.png`, `/images/coc/spells/lightning_spell.png`);
            pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_${baseName}.png`);
            pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_${baseName}.png`);
            pathsToTry.push(`/images/coc/spells/Icon_CC_Spell_${baseName}.png`);
            pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_${baseName}_new.png`);
            pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_${baseName}_new.png`);

            // Specific overrides for dark spells that often fail
            if (rawName === 'Poison Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Poison.png`);
            if (rawName === 'Earthquake Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Earthquake.png`);
            if (rawName === 'Haste Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Haste.png`);
            if (rawName === 'Skeleton Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Skeleton.png`);
            if (rawName === 'Bat Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Bat.png`);
            if (rawName === 'Overgrowth Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Overgrowth.png`);

            // Custom spelling fallbacks
            if (rawName === 'Healing Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Heal.png`);
            if (rawName.includes('Ice')) pathsToTry.push(`/images/coc/spells/Icon_HV_Dark_Spell_Ice_block.png`);
            if (rawName === 'Invisibility Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Invisibility.png`);
            if (rawName === 'Recall Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Recall.png`);
            if (rawName === 'Revive Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_Revive.png`);
            if (rawName === 'Totem Spell') pathsToTry.push(`/images/coc/spells/Icon_HV_Spell_totem.png`);
        } else if (category === 'Siege Machines') {
            pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_${formatName}.png`);
            if (rawName === 'Wall Wrecker') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Wall_Wrecker.png`);
            if (rawName === 'Battle Blimp') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Battle_Blimp.png`);
            if (rawName === 'Stone Slammer') pathsToTry.push(`/images/coc/siege_machines/Siege_Machine_HV_Stone_Slammer_2.png`, `/images/coc/siege_machines/Icon_HV_Siege_Machine_Stone_Slammer.png`);
            if (rawName === 'Siege Barracks') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Siege_Barracks.png`);
            if (rawName === 'Log Launcher') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Log_Launcher.png`);
            if (rawName === 'Flame Flinger') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Flame_Flinger.png`);
            if (rawName === 'Battle Drill' || rawName === 'Drill') pathsToTry.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_Battle_Drill.png`);
            if (rawName === 'Troop Launcher') pathsToTry.push(`/images/coc/siege_machines/icon_troop_launcher.png`);
        } else if (category === 'Hero Pets') {
            pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_${petsName}.png`);
            pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_${formatName}.png`);
            if (rawName === 'L.A.S.S.I') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_LASSI.png`);
            if (rawName === 'Mighty Yak') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Mighty_Yak.png`);
            if (rawName === 'Electro Owl') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Electro_Owl.png`);
            if (rawName === 'Poison Lizard') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Poison_Lizard.png`);
            if (rawName === 'Spirit Fox') pathsToTry.push(`/images/coc/pets/Icon_HV_Hero_Pets_Spirit_Fox.png`);
            if (rawName === 'Angry Jelly') pathsToTry.push(`/images/coc/pets/Hero_Pet_HV_Angry_Jelly_02.png`);
            if (rawName === 'Angry Jelly') pathsToTry.push(`/images/coc/pets/jelly_2024.png`); // Fallback if user eventually adds it
            if (rawName === 'Raven') pathsToTry.push(`/images/coc/pets/pet_Greedy_Raven_3_grasspng.png`, `/images/coc/pets/Raven.png`);
            if (rawName === 'Vampbat') pathsToTry.push(`/images/coc/pets/Vampbat.png`);
        }

        pathsToTry.push(`/images/coc/troops/${troop.name.toLowerCase().replace(/ /g, '_')}.png`);

        let currentIdx = 0;
        let isMounted = true;

        const tryNextImage = () => {
            if (currentIdx >= pathsToTry.length) {
                if (isMounted) {
                    setHasError(true);
                    setLoaded(true);
                }
                return;
            }
            const img = new Image();
            img.src = pathsToTry[currentIdx];
            img.onload = () => {
                if (isMounted) {
                    setImgSrc(pathsToTry[currentIdx]);
                    setLoaded(true);
                }
            };
            img.onerror = () => {
                currentIdx++;
                tryNextImage();
            };
        };

        setLoaded(false);
        setHasError(false);
        tryNextImage();

        return () => { isMounted = false; };
    }, [troop.name, category]);

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
            {imgSrc && (
                <img
                    src={imgSrc}
                    alt={troop.name}
                    className={`w-full h-full object-contain filter drop-shadow-lg scale-125 transition-opacity duration-300 absolute inset-0 ${(loaded && !hasError) ? 'opacity-100' : 'opacity-0'}`}
                />
            )}
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
                            <TroopIcon troop={t} category={title} accent={accent} />

                            {/* Level Badge */}
                            <div
                                className="absolute bottom-0 inset-x-0 h-4 flex items-center justify-center text-[9px] font-bold text-white shadow-md bg-black/60 backdrop-blur-sm"
                                style={isMax ? { color: '#f1c40f' } : {}}
                            >
                                <span className="opacity-70 mr-0.5 font-normal">Lvl</span> {t.level}
                            </div>

                            {/* Tooltip */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 disabled pointer-events-none z-10 border border-white/10 shadow-lg">
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
    const [showAll, setShowAll] = useState(false);

    const hasAny = (troops?.length || 0) + (superTroops?.length || 0) + (builderBaseTroops?.length || 0) + (spells?.length || 0) + (siegeMachines?.length || 0) + (pets?.length || 0) > 0;
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
                    <TroopGrid items={builderBaseTroops || []} title="Builder Base" accent={accent} />
                    <TroopGrid items={superTroops || []} title="Super Troops" accent={accent} />
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
