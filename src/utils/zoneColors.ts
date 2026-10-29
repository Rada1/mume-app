/**
 * @file zoneColors.ts
 * @description Curated zone colors for immersion atmosphere and room highlights.
 */

import { normalizeZoneName } from './zoneName';

// --- Constants Section ---

export const KNOWN_ZONE_COLORS: Record<string, string> = {
    // Strongly good zones use a light sea-green.
    'bree': '#69b68f',
    'fornost': '#69b68f',
    'lorien': '#69b68f',
    'rivendell': '#69b68f',
    'valinor': '#69b68f',
    'blue mountains': '#69b68f',
    'grey havens': '#69b68f',
    'shire': '#69b68f',

    // Semi-good zones use a light blue with a green hue.
    'fangorn': '#75b2e8',
    'lorien surroundings': '#75b2e8',
    'the lorien surroundings': '#75b2e8',
    'rohan': '#75b2e8',
    'ettenmoors': '#75b2e8',
    'gladden fields': '#75b2e8',
    'lhun valley': '#75b2e8',
    'midgewaters': '#75b2e8',
    'old forest': '#75b2e8',
    'road to fornost': '#75b2e8',
    'road to grey havens': '#75b2e8',
    'road to tharbad': '#75b2e8',
    'tower hills': '#75b2e8',

    // Neutral zones use the tested mauve.
    'dunland': '#968894',
    'eregion': '#968894',
    'isengard': '#968894',
    'ost-in-edhil': '#968894',
    'tharbad': '#968894',
    'weathertop': '#968894',
    'ancient broken road': '#968894',
    'barrow-downs': '#968894',
    'central anduin vale': '#968894',
    'northern anduin vale': '#968894',
    'old east road': '#968894',

    // Semi-evil zones use the previous Troll Warrens purple.
    'emyn-nu-fuin': '#8246ad',
    'southern mirkwood': '#8246ad',
    'misty mountains': '#8246ad',
    'old forest road': '#8246ad',
    'redhorn pass': '#8246ad',
    'trollshaws': '#8246ad',

    // Evil zones use Moria red.
    'dol guldur': '#a51c24',
    'goblin-town': '#a51c24',
    'moria': '#a51c24',
    'troll warrens': '#a51c24',
};

export const DEFAULT_ZONE_COLOR = '#475569';
const STRONGLY_GOOD_ZONE_AURA_COLOR = '#0a301b';
const GOOD_ZONE_AURA_COLOR = '#0a2340';
const NEUTRAL_ZONE_AURA_COLOR = '#3a210f';
const SEMI_EVIL_ZONE_AURA_COLOR = '#291039';
const EVIL_ZONE_AURA_COLOR = '#4f0d12';

const STRONGLY_GOOD_ZONES = new Set([
    'bree',
    'fornost',
    'lorien',
    'rivendell',
    'valinor',
    'blue mountains',
    'grey havens',
    'shire',
]);
const GOOD_ZONES = new Set([
    'fangorn',
    'lorien surroundings',
    'rohan',
    'ettenmoors',
    'gladden fields',
    'lhun valley',
    'midgewaters',
    'old forest',
    'road to fornost',
    'road to grey havens',
    'road to tharbad',
    'tower hills',
]);
const NEUTRAL_ZONES = new Set([
    'dunland',
    'eregion',
    'isengard',
    'ost-in-edhil',
    'tharbad',
    'weathertop',
    'ancient broken road',
    'barrow-downs',
    'central anduin vale',
    'northern anduin vale',
    'old east road',
]);
const SEMI_EVIL_ZONES = new Set([
    'emyn-nu-fuin',
    'southern mirkwood',
    'misty mountains',
    'old forest road',
    'redhorn pass',
    'trollshaws',
]);
const EVIL_ZONES = new Set([
    'dol guldur',
    'goblin-town',
    'moria',
    'troll warrens',
]);

const getZoneAlignmentKey = (zone: string | null | undefined): string => {
    const normalizedZone = normalizeZoneName(zone);
    return normalizedZone.startsWith('the ')
        ? normalizedZone.slice(4).trim()
        : normalizedZone;
};

const isStronglyGoodZone = (zone: string | null | undefined): boolean =>
    STRONGLY_GOOD_ZONES.has(getZoneAlignmentKey(zone));
const isGoodZone = (zone: string | null | undefined): boolean =>
    GOOD_ZONES.has(getZoneAlignmentKey(zone));
const isNeutralZone = (zone: string | null | undefined): boolean =>
    NEUTRAL_ZONES.has(getZoneAlignmentKey(zone));
const isSemiEvilZone = (zone: string | null | undefined): boolean =>
    SEMI_EVIL_ZONES.has(getZoneAlignmentKey(zone));
const isEvilZone = (zone: string | null | undefined): boolean =>
    EVIL_ZONES.has(getZoneAlignmentKey(zone));

const getZoneAuraPaletteColor = (zone: string | null | undefined): string | null => {
    if (isStronglyGoodZone(zone)) return STRONGLY_GOOD_ZONE_AURA_COLOR;
    if (isGoodZone(zone)) return GOOD_ZONE_AURA_COLOR;
    if (isNeutralZone(zone)) return NEUTRAL_ZONE_AURA_COLOR;
    if (isSemiEvilZone(zone)) return SEMI_EVIL_ZONE_AURA_COLOR;
    if (isEvilZone(zone)) return EVIL_ZONE_AURA_COLOR;
    return null;
};

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
    const clean = normalizeZoneName(zone);
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

/** Uses the zone palette as a translucent ambient glow behind the client. */
export const getZoneAmbientGlow = (zone: string | null | undefined, strength = 0.18): string => {
    const color = getZoneAuraPaletteColor(zone) ?? getZoneColor(zone);
    const red = parseInt(color.slice(1, 3), 16);
    const green = parseInt(color.slice(3, 5), 16);
    const blue = parseInt(color.slice(5, 7), 16);
    const alpha = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0.18;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

/** Keeps the client rim visible in dark zones while preserving the zone hue. */
export const getZoneFrameColor = (zone: string | null | undefined): string => {
    const auraPaletteColor = getZoneAuraPaletteColor(zone);
    if (auraPaletteColor) {
        const { h, s } = hexToHsl(auraPaletteColor);
        const frameLightness = isNeutralZone(zone) ? 30 : isStronglyGoodZone(zone) || isGoodZone(zone) ? 28 : 25;
        return hslToHex(h, s, frameLightness);
    }

    const { h, s, l } = hexToHsl(getZoneColor(zone));
    return hslToHex(h, s, Math.max(l, 55));
};
