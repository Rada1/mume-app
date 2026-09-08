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
    'super-good': { hue: 132, saturation: 96, lightness: 68, glowLightness: 48 }, // Original bright Lothlórien emerald green
    good: { hue: 196, saturation: 48, lightness: 50, glowLightness: 36 },         // Muted twilight / starlight cyan
    neutral: { hue: 38, saturation: 45, lightness: 32, glowLightness: 20 },       // Antique beeswax candle / warm earth gold
    evil: { hue: 272, saturation: 42, lightness: 26, glowLightness: 16 },         // Shadowy deep plum / dark amethyst
    'super-evil': { hue: 8, saturation: 55, lightness: 28, glowLightness: 18 }   // Smoldering dark cinder / iron rust red
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
