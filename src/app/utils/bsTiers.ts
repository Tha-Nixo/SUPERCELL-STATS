export interface BSTierInfo {
    name: string;
    iconPath: string;
    nextThreshold: number;
    currentTierMin: number;
}

export function getBSTierInfo(trophies: number): BSTierInfo {
    if (trophies < 250) {
        return { name: 'Wood', iconPath: '/images/bs/icon_trophy_brawler_wood.png', currentTierMin: 0, nextThreshold: 250 };
    }
    if (trophies < 500) {
        return { name: 'Bronze', iconPath: '/images/bs/icon_trophy_brawler_bronze.png', currentTierMin: 250, nextThreshold: 500 };
    }
    if (trophies < 750) {
        return { name: 'Silver', iconPath: '/images/bs/icon_trophy_brawler_silver.png', currentTierMin: 500, nextThreshold: 750 };
    }
    if (trophies < 1000) {
        return { name: 'Gold', iconPath: '/images/bs/icon_trophy_brawler_gold.png', currentTierMin: 750, nextThreshold: 1000 };
    }

    // Prestige 1, 2, 3+
    const prestigeLevel = Math.floor(trophies / 1000); // 1 for 1000-1999, 2 for 2000-2999...

    let iconName = 'icon_trophy_brawler_prestige_1.png';
    if (prestigeLevel === 2) iconName = 'icon_trophy_brawler_prestige_2.png';
    if (prestigeLevel >= 3) iconName = 'icon_trophy_brawler_prestige_3.png';

    const currentTierMin = prestigeLevel * 1000;
    const nextThreshold = currentTierMin + 1000;

    return {
        name: `Prestige ${prestigeLevel}`,
        iconPath: `/images/bs/${iconName}`,
        currentTierMin,
        nextThreshold,
    };
}
