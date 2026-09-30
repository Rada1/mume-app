/**
 * @file zoneAlignment.ts
 * @description Zone alignment lookup for map-driven atmosphere effects.
 */

// --- Type Section ---

export type ZoneAlignment = 'good' | 'semi-good' | 'neutral' | 'semi-evil' | 'evil';

export interface EmberColorProfile {
    hue: number;
    saturation: number;
    lightness: number;
    glowLightness: number;
}

// --- Data Section ---

const ZONE_ALIGNMENT_BY_NAME: Record<string, ZoneAlignment> = {
    'Bree': 'good',
    'Dol Guldur': 'evil',
    'Dunland': 'neutral',
    'Emyn-nu-Fuin': 'semi-evil',
    'Eregion': 'neutral',
    'Fangorn': 'semi-good',
    'Fornost': 'good',
    'Goblin-town': 'evil',
    'Isengard': 'neutral',
    'Lorien': 'good',
    'Moria': 'evil',
    'Ost-in-Edhil': 'neutral',
    'Rivendell': 'good',
    'Rohan': 'semi-good',
    'Southern Mirkwood': 'semi-evil',
    'Tharbad': 'neutral',
    'Valinor': 'good',
    'Weathertop': 'neutral',
    'the Ancient Broken Road': 'neutral',
    'the Barrow-downs': 'neutral',
    'the Blue Mountains': 'good',
    'the Central Anduin Vale': 'neutral',
    'the Ettenmoors': 'semi-good',
    'the Gladden Fields': 'semi-good',
    'the Grey Havens': 'good',
    'the Lhun Valley': 'semi-good',
    'Lorien Surroundings': 'semi-good',
    'the Lorien Surroundings': 'semi-good',
    'the Midgewaters': 'semi-good',
    'the Misty Mountains': 'semi-evil',
    'the Northern Anduin Vale': 'neutral',
    'the Old East Road': 'neutral',
    'the Old Forest': 'semi-good',
    'the Old Forest Road': 'semi-evil',
    'the Redhorn Pass': 'semi-evil',
    'the Road to Fornost': 'semi-good',
    'the Road to Grey Havens': 'semi-good',
    'the Road to Tharbad': 'semi-good',
    'the Shire': 'good',
    'the Tower Hills': 'semi-good',
    'the Troll Warrens': 'evil',
    'the Trollshaws': 'semi-evil'
};

export const EMBER_COLOR_BY_ALIGNMENT: Record<ZoneAlignment, EmberColorProfile> = {
    good: { hue: 153, saturation: 48, lightness: 58, glowLightness: 40 },         // Rivendell green
    'semi-good': { hue: 210, saturation: 44, lightness: 60, glowLightness: 42 }, // Bree blue
    neutral: { hue: 309, saturation: 18, lightness: 66, glowLightness: 46 },      // Valinor mauve
    'semi-evil': { hue: 275, saturation: 42, lightness: 64, glowLightness: 46 },  // Troll Warrens purple
    evil: { hue: 357, saturation: 71, lightness: 56, glowLightness: 36 }          // Moria red
};

// --- Logic Section ---

const normalizeZoneName = (zone: string | null | undefined): string => (
    (zone || '').trim().replace(/\s+/g, ' ').toLowerCase()
);

const NORMALIZED_ZONE_ALIGNMENT = new Map(
    Object.entries(ZONE_ALIGNMENT_BY_NAME).map(([zone, alignment]) => [normalizeZoneName(zone), alignment])
);

export const getZoneAlignment = (zone: string | null | undefined): ZoneAlignment => (
    NORMALIZED_ZONE_ALIGNMENT.get(normalizeZoneName(zone)) ?? 'neutral'
);

export const getZoneEmberColor = (zone: string | null | undefined): EmberColorProfile => (
    EMBER_COLOR_BY_ALIGNMENT[getZoneAlignment(zone)]
);
