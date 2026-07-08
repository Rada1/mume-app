/**
 * @file roomTerrainVisuals.ts
 * @description Resolves room terrain names into pixel-card visual keys and glow colors.
 */

// --- Logic Section ---
export const getRoomTerrainVisualKey = (terrain: string | null | undefined): string => {
    if (!terrain) return 'neutral';
    const normalized = terrain.toLowerCase();
    if (normalized === 'mountains') return 'mountain';
    if (normalized === 'hills') return 'hill';
    if (normalized.includes('underwater')) return 'underwater';
    if (normalized.includes('brush') || normalized.includes('shrub') || normalized.includes('thicket')) return 'brush';
    if (normalized.includes('forest') || normalized.includes('wood') || normalized.includes('jungle')) return 'forest';
    if (normalized.includes('shallow') || normalized.includes('swamp') || normalized.includes('marsh') || normalized.includes('bog')) return 'marsh';
    if (normalized.includes('water') || normalized.includes('rapid') || normalized.includes('river') || normalized.includes('sea') || normalized.includes('ocean') || normalized.includes('lake')) return 'water';
    if (normalized.includes('cave') || normalized.includes('cavern') || normalized.includes('crypt')) return 'cavern';
    if (normalized.includes('tunnel') || normalized.includes('mine') || normalized.includes('underground')) return 'tunnel';
    if (normalized.includes('mountain') || normalized.includes('peak') || normalized.includes('cliff')) return 'mountain';
    if (normalized.includes('hill')) return 'hill';
    if (normalized.includes('road') || normalized.includes('path') || normalized.includes('bridge') || normalized.includes('trail')) return 'road';
    if (normalized.includes('building') || normalized.includes('inside') || normalized.includes('shop') || normalized.includes('tavern') || normalized.includes('inn')) return 'building';
    if (normalized.includes('city') || normalized.includes('town')) return 'city';
    if (normalized.includes('field') || normalized.includes('plain') || normalized.includes('grass') || normalized.includes('meadow') || normalized.includes('heath') || normalized.includes('tundra')) return 'grass';
    return 'neutral';
};

export const getZoneVisualKey = (zone: string | null | undefined): string => {
    if (!zone) return 'neutral';
    const normalized = zone.toLowerCase();
    if (normalized.includes('shire') || normalized.includes('hobbiton') || normalized.includes('buckland')) return 'shire';
    if (normalized.includes('fangorn')) return 'fangorn';
    if (normalized.includes('old forest') || normalized.includes('old-forest')) return 'old-forest';
    if (normalized.includes('moria') || normalized.includes('khazad')) return 'moria';
    if (normalized.includes('mordor') || normalized.includes('gorgoroth') || normalized.includes('ephel duath')) return 'mordor';
    if (normalized.includes('angmar') || normalized.includes('carn dum')) return 'angmar';
    if (normalized.includes('forochel') || normalized.includes('forodwaith')) return 'forochel';
    if (normalized.includes('lothlorien') || normalized.includes('lorien') || normalized.includes('caras galadhon')) return 'lothlorien';
    if (normalized.includes('rivendell') || normalized.includes('imladris')) return 'rivendell';
    if (normalized.includes('fangorn')) return 'fangorn';
    if (normalized.includes('mirkwood') || normalized.includes('greenwood')) return 'mirkwood';
    if (normalized.includes('misty') || normalized.includes('ered luin') || normalized.includes('ered lithui')) return 'mountains';
    if (normalized.includes('rohan') || normalized.includes('mark')) return 'rohan';
    if (normalized.includes('gondor') || normalized.includes('minas')) return 'gondor';
    if (normalized.includes('bree')) return 'bree';
    if (normalized.includes('eriador') || normalized.includes('arnor')) return 'eriador';
    return 'neutral';
};

export const getRoomTerrainGlowColor = (terrain: string | null | undefined): string => {
    if (!terrain) return 'rgba(255, 255, 255, 0.06)';
    const normalized = terrain.toLowerCase();
    if (normalized.includes('underwater')) return 'rgba(20, 184, 166, 0.19)';
    if (normalized.includes('shallow') || normalized.includes('swamp') || normalized.includes('marsh') || normalized.includes('bog')) return 'rgba(101, 163, 13, 0.18)';
    if (normalized.includes('brush') || normalized.includes('shrub') || normalized.includes('thicket')) return 'rgba(74, 222, 128, 0.16)';
    if (normalized.includes('forest') || normalized.includes('wood') || normalized.includes('jungle')) return 'rgba(34, 197, 94, 0.16)';
    if (normalized.includes('water') || normalized.includes('rapid') || normalized.includes('river') || normalized.includes('sea') || normalized.includes('ocean') || normalized.includes('lake')) return 'rgba(14, 165, 233, 0.18)';
    if (normalized.includes('mountain') || normalized.includes('peak') || normalized.includes('cliff') || normalized.includes('hill')) return 'rgba(148, 163, 184, 0.16)';
    if (normalized.includes('road') || normalized.includes('path') || normalized.includes('bridge') || normalized.includes('trail')) return 'rgba(217, 119, 6, 0.16)';
    if (normalized.includes('building') || normalized.includes('inside') || normalized.includes('shop') || normalized.includes('tavern') || normalized.includes('inn')) return 'rgba(245, 158, 11, 0.16)';
    if (normalized.includes('city') || normalized.includes('town')) return 'rgba(239, 68, 68, 0.16)';
    if (normalized.includes('underground') || normalized.includes('cave') || normalized.includes('tunnel')) return 'rgba(139, 92, 246, 0.16)';
    return 'rgba(132, 204, 22, 0.16)';
};
