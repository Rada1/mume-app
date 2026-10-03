/** @file Resolves MMapper terrain ordinals into the mapper's display labels. */
import { TERRAIN as MMAPPER_TERRAIN } from './performance/webcockpit/model';
import { normalizeTerrain } from './mapperUtils';

// --- Logic Section ---
export const getMmapperTerrainLabel = (terrain: string | number | null): string => {
    const value = typeof terrain === 'string' ? terrain.trim() : terrain;
    const ordinal = typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value)
            ? Number(value)
            : null;

    if (ordinal !== null && Number.isInteger(ordinal) && ordinal >= 0 && ordinal < MMAPPER_TERRAIN.length) {
        return normalizeTerrain(MMAPPER_TERRAIN[ordinal]);
    }
    return normalizeTerrain(value);
};
