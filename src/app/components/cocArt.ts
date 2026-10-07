import { resolveCocIcon } from '../data/cocIconIndex';
import type { CocArtCategory } from './cocFacts';

/** Live items with no local art (2026-10-07): their tiles show the section icon. Update when art is added. */
export const KNOWN_MISSING_ART = ['Ruin Witch', 'Sky Wagon', 'Angry Spell'] as const;

/**
 * Local art for an army item, or undefined. Candidate file names follow the
 * wiki exports in public/images/coc; they are resolved against the build-time
 * index, so a wrong guess never costs a request (production answers a missing
 * file with the SPA shell and a 200).
 */
export function cocItemArt(rawName: string, category: CocArtCategory): string | undefined {
  const formatName = rawName.replace(/ /g, '_');
  const baseName = rawName.replace(/ Spell$/i, '').replace(/ /g, '_');
  const petsName = formatName.replace(/\./g, '');
  const paths: string[] = [];

  if (category === 'Troops') {
    paths.push(`/images/coc/troops/Icon_HV_${formatName}.webp`);
    if (rawName === 'Druid') paths.push('/images/coc/troops/Druid_HV_01.webp');
    if (rawName === 'Meteor Golem') paths.push('/images/coc/troops/MeteoriteGolem_withGrassbase_f22_3k.webp', '/images/coc/troops/Icon_HV_Meteorite_Golem.webp');
    if (rawName === 'Thrower') paths.push('/images/coc/troops/Thrower_05_grass.webp');
    paths.push(`/images/coc/clan_capital/Icon_CC_Troop_${formatName}.webp`);
  } else if (category === 'Super Troops') {
    paths.push(`/images/coc/troops/Icon_HV_${formatName}.webp`, `/images/coc/troops/Icon_HV_Super_${formatName}.webp`);
    if (rawName === 'Ice Hound') paths.push('/images/coc/troops/Icon_HV_Ice_Hound.webp');
    if (rawName === 'Super Yeti') paths.push('/images/coc/troops/icon_super_yeti.webp');
    if (rawName === 'Inferno Dragon') paths.push('/images/coc/troops/Icon_HV_Inferno_Dragon.webp', '/images/coc/troops/Icon_HV_Super_Infernodragon.webp');
  } else if (category === 'Builder Base') {
    paths.push(`/images/coc/builder_base/Icon_BB_${formatName}.webp`);
  } else if (category === 'Spells') {
    if (rawName === 'Lightning Spell') paths.push('/images/coc/spells/Icon_HV_Spell_Lightning_new.webp', '/images/coc/spells/lightning_spell.webp');
    if (rawName === 'Healing Spell') paths.push('/images/coc/spells/Icon_HV_Spell_Heal.webp');
    if (rawName === 'Ice Block Spell') paths.push('/images/coc/spells/Icon_HV_Dark_Spell_Ice_block.webp');
    if (rawName === 'Totem Spell') paths.push('/images/coc/spells/Icon_HV_Spell_totem.webp');
    paths.push(
      `/images/coc/spells/Icon_HV_Spell_${baseName}.webp`,
      `/images/coc/spells/Icon_HV_Dark_Spell_${baseName}.webp`,
      `/images/coc/spells/Icon_CC_Spell_${baseName}.webp`,
      `/images/coc/spells/Icon_HV_Spell_${baseName}_new.webp`,
      `/images/coc/spells/Icon_HV_Dark_Spell_${baseName}_new.webp`,
    );
  } else if (category === 'Siege Machines') {
    paths.push(`/images/coc/siege_machines/Icon_HV_Siege_Machine_${formatName}.webp`);
    if (rawName === 'Stone Slammer') paths.push('/images/coc/siege_machines/Siege_Machine_HV_Stone_Slammer_2.webp');
    if (rawName === 'Troop Launcher') paths.push('/images/coc/siege_machines/icon_troop_launcher.webp');
  } else if (category === 'Hero Pets') {
    paths.push(`/images/coc/pets/Icon_HV_Hero_Pets_${petsName}.webp`, `/images/coc/pets/Icon_HV_Hero_Pets_${formatName}.webp`);
    if (rawName === 'Angry Jelly') paths.push('/images/coc/pets/Hero_Pet_HV_Angry_Jelly_02.webp', '/images/coc/pets/jelly_2024.webp');
    if (rawName === 'Greedy Raven') paths.push('/images/coc/pets/pet_Greedy_Raven_3_grasspng.webp', '/images/coc/pets/Raven.webp');
  }
  paths.push(`/images/coc/troops/${rawName.toLowerCase().replace(/ /g, '_')}.webp`);
  return resolveCocIcon(paths);
}

const HERO_ART: Record<string, string> = {
  'Barbarian King': '/images/coc/heroes/Barbarian_King_2_grass.webp',
  'Archer Queen': '/images/coc/heroes/Archer_Queen_1.webp',
  'Grand Warden': '/images/coc/heroes/Grand_Warden_2_grass.webp',
  'Royal Champion': '/images/coc/heroes/Royal_Champion_2_grass.webp',
  'Battle Machine': '/images/coc/heroes/Battle_Machine_2_grass.webp',
  'Battle Copter': '/images/coc/heroes/Battle_Copter_1.webp',
  'Minion Prince': '/images/coc/heroes/Hero_Minion_Prince_02_grass.webp',
  'Dragon Duke': '/images/coc/heroes/DragonDuke_f011_4k.webp',
};

/** Local hero portrait, or undefined for a hero added after this table. */
export function heroArt(name: string): string | undefined {
  return HERO_ART[name];
}
