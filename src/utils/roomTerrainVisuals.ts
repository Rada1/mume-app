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
    if (normalized.includes('underwater')) return 'rgba(20, 140, 130, 0.17)';
    if (normalized.includes('shallow') || normalized.includes('swamp') || normalized.includes('marsh') || normalized.includes('bog')) return 'rgba(85, 120, 25, 0.17)';
    if (normalized.includes('brush') || normalized.includes('shrub') || normalized.includes('thicket')) return 'rgba(55, 140, 80, 0.16)';
    if (normalized.includes('forest') || normalized.includes('wood') || normalized.includes('jungle')) return 'rgba(46, 125, 75, 0.17)';
    if (normalized.includes('water') || normalized.includes('rapid') || normalized.includes('river') || normalized.includes('sea') || normalized.includes('ocean') || normalized.includes('lake')) return 'rgba(28, 120, 168, 0.17)';
    if (normalized.includes('mountain') || normalized.includes('peak') || normalized.includes('cliff') || normalized.includes('hill')) return 'rgba(125, 135, 150, 0.15)';
    if (normalized.includes('road') || normalized.includes('path') || normalized.includes('bridge') || normalized.includes('trail')) return 'rgba(195, 115, 20, 0.16)';
    if (normalized.includes('building') || normalized.includes('inside') || normalized.includes('shop') || normalized.includes('tavern') || normalized.includes('inn')) return 'rgba(215, 145, 25, 0.16)';
    if (normalized.includes('city') || normalized.includes('town')) return 'rgba(175, 60, 60, 0.16)';
    if (normalized.includes('underground') || normalized.includes('cave') || normalized.includes('tunnel')) return 'rgba(115, 75, 180, 0.16)';
    return 'rgba(90, 130, 45, 0.16)';
};
