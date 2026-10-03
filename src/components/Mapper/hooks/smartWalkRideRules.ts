/**
 * @file smartWalkRideRules.ts
 * @description Shared room restrictions for mounted smart-walk routes.
 */

// The fallback pathfinder reads legacy MM2 tuples: 7=shallow, 8=water,
// 9=underwater. Canonical-map routes use terrain names, not these ordinals.
const LEGACY_WATER_TERRAIN_CODES = new Set([8, 9]);

export function isWaterTerrain(terrain: unknown): boolean {
    if (typeof terrain === 'number' && LEGACY_WATER_TERRAIN_CODES.has(terrain)) return true;
    if (typeof terrain !== 'string' || !terrain.trim()) return false;
    const numericCode = Number(terrain);
    if (Number.isInteger(numericCode) && LEGACY_WATER_TERRAIN_CODES.has(numericCode)) return true;
    const name = terrain.trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (name.includes('shallow')) return false;
    return /\bwater\b|\brapids?\b|\bunderwater\b/.test(name) || ['w', 'u', '~', '%'].includes(name);
}

export function isNoRideRoom(terrain: unknown, loadFlags: unknown, ridable: unknown): boolean {
    if (isWaterTerrain(terrain)) return true;

    const flags = Array.isArray(loadFlags) ? loadFlags : [];
    if (flags.some(flag => String(flag).toUpperCase().replace(/[\s-]+/g, '_') === 'NO_RIDE')) return true;

    if (ridable === false || ridable === 2) return true;
    if (typeof ridable === 'string') {
        const value = ridable.trim().toUpperCase().replace(/[\s-]+/g, '_');
        return value === 'NO_RIDE' || value === 'NOT_RIDABLE' || value === 'FALSE' || value === '2';
    }
    return false;
}
