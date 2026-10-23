/**
 * @file zoneBackgroundPosition.ts
 * @description Canonical zone keys for saved atmospheric background positions.
 */

// --- Logic Section ---
export const normalizeZoneBackgroundKey = (zone: string | null | undefined): string =>
    (zone || '')
        .toLowerCase()
        .trim()
        .replace(/^the\s+/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ');
