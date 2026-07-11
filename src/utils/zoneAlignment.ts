/**
 * @file zoneAlignment.ts
 * @description Zone alignment lookup for map-driven atmosphere effects.
 */

// --- Type Section ---

export type ZoneAlignment = 'super-good' | 'good' | 'neutral' | 'evil' | 'super-evil';

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
    'Emyn-nu-Fuin': 'evil',
    'Eregion': 'neutral',
    'Fangorn': 'good',
    'Fornost': 'neutral',
    'Goblin-town': 'evil',
    'Isengard': 'neutral',
    'Lorien': 'super-good',
    'Moria': 'evil',
    'Ost-in-Edhil': 'neutral',
    'Rivendell': 'super-good',
    'Rohan': 'good',
    'Southern Mirkwood': 'evil',
    'Tharbad': 'neutral',
    'Valinor': 'super-good',
    'Weathertop': 'neutral',
    'the Ancient Broken Road': 'evil',
    'the Barrow-downs': 'neutral',
    'the Blue Mountains': 'good',
    'the Central Anduin Vale': 'neutral',
    'the Ettenmoors': 'evil',
    'the Gladden Fields': 'evil',
    'the Grey Havens': 'super-good',
    'the Lhun Valley': 'good',
    'the Lorien Surroundings': 'good',
    'the Midgewaters': 'neutral',
    'the Misty Mountains': 'evil',
    'the Northern Anduin Vale': 'evil',
    'the Old East Road': 'evil',
    'the Old Forest': 'neutral',
    'the Old Forest Road': 'evil',
    'the Redhorn Pass': 'evil',
    'the Road to Fornost': 'neutral',
    'the Road to Grey Havens': 'good',
    'the Road to Tharbad': 'neutral',
    'the Shire': 'good',
    'the Tower Hills': 'good',
    'the Troll Warrens': 'super-evil',
    'the Trollshaws': 'evil'
};

export const EMBER_COLOR_BY_ALIGNMENT: Record<ZoneAlignment, EmberColorProfile> = {
    'super-good': { hue: 132, saturation: 96, lightness: 68, glowLightness: 48 },
    good: { hue: 186, saturation: 100, lightness: 72, glowLightness: 52 },
    neutral: { hue: 46, saturation: 100, lightness: 70, glowLightness: 50 },
    evil: { hue: 274, saturation: 96, lightness: 72, glowLightness: 50 },
    'super-evil': { hue: 0, saturation: 100, lightness: 68, glowLightness: 48 }
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
