/**
 * @file zoneColors.ts
 * @description Zone color mapping and deterministic color generator for room name highlight banners.
 */

// --- Constants Section ---

export const KNOWN_ZONE_COLORS: Record<string, string> = {
    // High Good / Sacred Elven & Divine
    'valinor': '#d97706', // Sacred starlight gold
    'rivendell': '#0284c7', // Moonlit twilight sapphire (High Elves)
    'lorien': '#65a30d', // Luminous golden mallorn lime-leaf (Galadriel)
    'the lorien surroundings': '#4d7c0f',
    'grey havens': '#06b6d4', // Coastal twilight silver-cyan (Elven ships)
    'the grey havens': '#06b6d4',
    'ost-in-edhil': '#059669', // Ancient city of the Elven smiths
    'eregion': '#059669', // Holly lands
    'tower hills': '#0284c7', // White Towers looking to the Sea
    'the tower hills': '#0284c7',
    'lhun valley': '#0284c7', // River Lhûn azure
    'the lhun valley': '#0284c7',

    // Pure Good / Pastoral Hobbits
    'shire': '#16a34a', // Verdant clover emerald & rolling green hills
    'the shire': '#16a34a',

    // Mortal Civilized / Neutral to Good
    'bree': '#d97706', // Warm tavern candlelight amber & hearthfire
    'rohan': '#ca8a04', // Windblown golden horse-plains
    'blue mountains': '#2563eb', // Dwarven mountain lapis & granite cobalt
    'the blue mountains': '#2563eb',
    'tharbad': '#78350f', // Ruined river mud & weathered timber
    'dunland': '#854d0e', // Rugged highland clan bronze & heather
    'ancient broken road': '#64748b', // Cracked highway stone
    'the ancient broken road': '#64748b',

    // Wilderness & Ancient Neutral
    'fangorn': '#15803d', // Ancient deepwood Ent-moss
    'old forest': '#166534', // Primeval deep wildwood & dark root
    'the old forest': '#166534',
    'misty mountains': '#38bdf8', // Frosty glacial mountain peaks
    'the misty mountains': '#38bdf8',
    'midgewaters': '#3f6212', // Swarm-fen marsh reed
    'the midgewaters': '#3f6212',
    'gladden fields': '#4d7c0f', // Iris reed fen
    'the gladden fields': '#4d7c0f',

    // Evil / Trolls / Gore & Savage Blood
    'troll warrens': '#dc2626', // Gore red / savage carnage & blood
    'the troll warrens': '#dc2626',
    'trollshaws': '#991b1b', // Stone-troll highland rust & dried blood
    'the trollshaws': '#991b1b',
    'ettenmoors': '#9f1239', // Savage troll moorland maroon & bruised blood
    'the ettenmoors': '#9f1239',
    'redhorn pass': '#e11d48', // Blood-chilling blizzard pass
    'the redhorn pass': '#e11d48',

    // Evil / Orcs / Dark Sorcery / Shadow
    'goblin-town': '#a16207', // Toxic sulfur-soot ochre & subterranean bile
    'dol guldur': '#7e22ce', // Sorcerous dark necromancer purple
    'moria': '#c2410c', // Abyssal molten cinder & shadow ember (Balrog)
    'isengard': '#ea580c', // Smoldering forge iron & Uruk-hai furnaces
    'mirkwood': '#065f46', // Venomous arachnid dark jade / spider shadow
    'southern mirkwood': '#044332',
    'emyn-nu-fuin': '#044332',
    'mordor': '#b91c1c', // Land of Shadow / volcanic ash & magma
    'angmar': '#0284c7', // Witch-king chilling wraith-frost

    // Haunted / Undead / Cursed
    'barrow-downs': '#0d9488', // Cold tomb-mist & spectral barrow teal
    'the barrow-downs': '#0d9488',
    'fornost': '#2563eb', // Spectral ruined kingdom cobalt
    'weathertop': '#c2410c' // Charred ancient stone & Nazgûl attack
};

export const DEFAULT_ZONE_COLOR = '#475569';

// --- Logic Section ---

/**
 * Converts HSL values to a hex color string.
 */
const hslToHex = (h: number, s: number, l: number): string => {
    const lNorm = l / 100;
    const a = (s * Math.min(lNorm, 1 - lNorm)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Generates a deterministic, mature atmospheric color hex from any string.
 * Uses 50% saturation and 42% lightness for deep, rich Middle-earth tones.
 */
export const hashStringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return hslToHex(hue, 50, 42);
};

/**
 * Resolves the display color for a given zone name.
 * Checks known zone dictionary first; falls back to deterministic hash.
 */
export const getZoneColor = (zone: string | null | undefined): string => {
    if (!zone) return DEFAULT_ZONE_COLOR;
    const clean = zone.replace(/[()]/g, '').trim().toLowerCase();
    if (!clean) return DEFAULT_ZONE_COLOR;

    if (KNOWN_ZONE_COLORS[clean]) {
        return KNOWN_ZONE_COLORS[clean];
    }

    const withoutThe = clean.startsWith('the ') ? clean.slice(4).trim() : clean;
    if (KNOWN_ZONE_COLORS[withoutThe]) {
        return KNOWN_ZONE_COLORS[withoutThe];
    }

    return hashStringToColor(clean);
};

/**
 * Converts a hex color string into HSL components.
 */
export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

/**
 * Resolves a high-contrast text color tuned for legibility while matching the zone hue.
 * In dark mode, lifts lightness to ~68% so text is crisp on #1a1612 backgrounds.
 * Falls back to default gold wiki-link color when no zone is provided.
 */
export const getZoneTextColor = (zone: string | null | undefined, isLightMode = false): string => {
    if (!zone) return isLightMode ? '#8b6b10' : '#c9a84c';
    const clean = zone.replace(/[()]/g, '').trim();
    if (!clean) return isLightMode ? '#8b6b10' : '#c9a84c';

    const baseHex = getZoneColor(zone);
    const { h, s, l } = hexToHsl(baseHex);

    if (isLightMode) {
        const targetL = Math.min(l, 32);
        const targetS = Math.min(Math.max(s, 50), 90);
        return hslToHex(h, targetS, targetL);
    }

    const targetL = Math.max(l, 68);
    const targetS = s < 30 ? s : Math.min(Math.max(s, 55), 80);
    return hslToHex(h, targetS, targetL);
};
