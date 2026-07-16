// Data patches for brawlers the official API returns incomplete or renamed.
// Update here (one place) when Supercell fixes the API or adds new brawlers.

export interface BrawlerAbility {
    id: number;
    name: string;
}

export interface BrawlerPatch {
    /** Applied only when the API returns an empty list for the ability. */
    gadgets?: BrawlerAbility[];
    starPowers?: BrawlerAbility[];
}

/** API name → display name overrides. */
export const BRAWLER_RENAMES: Record<string, string> = {
    GLOWBERT: 'GLOWY',
};

/** Fallback abilities for brawlers whose API payload ships empty lists. */
export const BRAWLER_PATCHES: Record<string, BrawlerPatch> = {
    SIRIUS: {
        gadgets: [
            { id: 23001191, name: 'A Starr Is Born' },
            { id: 23001192, name: 'Master Of Shadows' },
        ],
        starPowers: [
            { id: 23001189, name: 'Dusk Runners' },
            { id: 23001190, name: 'The Darkest Starr' },
        ],
    },
    GLOWY: {
        gadgets: [
            { id: 23001183, name: 'Slippery Savior' },
            { id: 23001184, name: 'More Lumens' },
        ],
        starPowers: [
            { id: 23001181, name: 'Biotic Ecosystem' },
            { id: 23001182, name: 'Parasitism' },
        ],
    },
    PIERCE: {
        gadgets: [
            { id: 23001062, name: 'Bottomless Mags' },
            { id: 23001063, name: 'You Only Brawl Twice' },
        ],
        starPowers: [
            { id: 23001060, name: 'Mission Swimpossible' },
            { id: 23001061, name: 'Slip N Snipe' },
        ],
    },
    GIGI: {
        gadgets: [
            { id: 23001070, name: 'Longer Strings' },
            { id: 23001071, name: 'Disappearing Act' },
        ],
        starPowers: [
            { id: 23001068, name: 'Plie Protection' },
            { id: 23001069, name: 'A Helping Hand' },
        ],
    },
};
