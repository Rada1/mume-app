/**
 * @file terrainBackgrounds.ts
 * @description Maps GMCP terrain keys to background image asset paths.
 * Images should be placed in public/assets/Pictures/terrain/.
 * The terrain string is sourced from GMCP Room.Info and normalized to lowercase.
 *
 * To add a new terrain: add an entry to TERRAIN_BACKGROUND_MAP and drop the image
 * in public/assets/Pictures/terrain/.
 */

// --- Terrain Key → Asset Path Map ---

const BASE_PATH = '/assets/Pictures/terrain/';

export const TERRAIN_BACKGROUND_MAP: Record<string, string> = {
    // Open terrain
    'field':         `${BASE_PATH}field.png`,
    'farmland':      `${BASE_PATH}field.png`,
    'grass':         `${BASE_PATH}field.png`,
    'plains':        `${BASE_PATH}field.png`,

    // Roads & paths
    'road':          `${BASE_PATH}road.webp`,
    'path':          `${BASE_PATH}road.webp`,
    'trail':         `${BASE_PATH}road.webp`,

    // Forests
    'forest':        `${BASE_PATH}forest.png`,
    'dense forest':  `${BASE_PATH}forest.png`,
    'dense_forest':  `${BASE_PATH}forest.png`,
    'light forest':  `${BASE_PATH}forest.png`,
    'light_forest':  `${BASE_PATH}forest.png`,
    'woods':         `${BASE_PATH}forest.png`,

    // Mountains & hills
    'mountain':      `${BASE_PATH}mountains.png`,
    'mountains':     `${BASE_PATH}mountains.png`,
    'rocky':         `${BASE_PATH}mountains.png`,
    'hills':         `${BASE_PATH}hills.png`,
    'hill':          `${BASE_PATH}hills.png`,

    // Water
    'water':         `${BASE_PATH}water.png`,
    'river':         `${BASE_PATH}water.png`,
    'lake':          `${BASE_PATH}water.png`,
    'ocean':         `${BASE_PATH}water.png`,
    'sea':           `${BASE_PATH}water.png`,
    'shallows':      `${BASE_PATH}shallows.png`,
    'shallow water': `${BASE_PATH}shallows.png`,
    'shallow_water': `${BASE_PATH}shallows.png`,
    'ford':          `${BASE_PATH}shallows.png`,
    'rapids':        `${BASE_PATH}rapids.png`,
    'underwater':    `${BASE_PATH}underwater.webp`,

    // Urban / Indoor
    'city':          `${BASE_PATH}city.png`,
    'town':          `${BASE_PATH}city.png`,
    'building':      `${BASE_PATH}building.png`,
    'inside':        `${BASE_PATH}building.png`,
    'indoors':       `${BASE_PATH}building.png`,

    // Underground
    'cave':          `${BASE_PATH}cavern.png`,
    'cavern':        `${BASE_PATH}cavern.png`,
    'tunnel':        `${BASE_PATH}tunnel.png`,
    'underground':   `${BASE_PATH}tunnel.png`,

    // Special
    'swamp':         `${BASE_PATH}swamp.webp`,
    'marsh':         `${BASE_PATH}swamp.webp`,
    'desert':        `${BASE_PATH}desert.webp`,
    'sand':          `${BASE_PATH}desert.webp`,
    'arctic':        `${BASE_PATH}arctic.webp`,
    'snow':          `${BASE_PATH}arctic.webp`,
    'tundra':        `${BASE_PATH}arctic.webp`,
};

export const DEFAULT_TERRAIN_BG = `${BASE_PATH}default.webp`;

// --- Resolver ---

/**
 * Given a raw GMCP terrain string, returns the URL of the matching background image.
 * Falls back to DEFAULT_TERRAIN_BG if no match is found.
 */
export function resolveTerrainBackground(terrain: string | null | undefined): string | null {
    if (!terrain) return null;
    const key = terrain.toLowerCase().trim();
    return TERRAIN_BACKGROUND_MAP[key] ?? DEFAULT_TERRAIN_BG;
}
