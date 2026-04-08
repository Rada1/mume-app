/**
 * @file terrainUtils.ts
 * @description Shared utilities for MUME terrain normalization and identification.
 */

export const normalizeTerrain = (t: string): string => {
    if (!t) return '';
    t = t.trim();
    const low = t.toLowerCase();

    // MUME GMCP Symbols & Keywords
    if (t === 'f' || low.includes('forest') || low.includes('jungle') || low.includes('wood') || low.includes('tree') || low.includes('leaf') || low.includes('thicket')) return 'forest';
    if (t === '.' || low.includes('field') || low.includes('plain') || low.includes('grass') || low.includes('meadow') || low.includes('heath') || low.includes('tundra')) return 'field';
    if (t === ':' || low.includes('brush') || low.includes('bush') || low.includes('scrub') || low.includes('shrub') || low.includes('swamp')) return 'brush';
    if (t === '~' || t === '%' || t === 'W' || t === 'U' || low.includes('water') || low.includes('river') || low.includes('lake') || low.includes('ocean') || low.includes('swim') || low.includes('sea') || low.includes('bog') || low.includes('shallow') || low.includes('rapid') || low.includes('underwater')) return 'water';
    if (t === '+' || low.includes('road') || low.includes('trail') || low.includes('path') || low.includes('bridge') || low.includes('cobble')) return 'road';
    if (t === '<' || low.includes('mountain') || low.includes('rock') || low.includes('cliff') || low.includes('peak') || low.includes('glacier')) return 'mountain';
    if (t === '(' || low.includes('hill')) return 'hills';
    if (t === '=' || t === '0' || low.includes('tunnel') || low.includes('cave') || low.includes('underground') || low.includes('mine') || low.includes('dark') || low.includes('crypt') || low.includes('cavern')) return 'underground';
    if (t === '#' || low.includes('city') || low.includes('town') || low.includes('street')) return 'city';
    if (t === '[' || low.includes('shop') || low.includes('inside') || low.includes('indoor') || low.includes('inn') || low.includes('building') || low.includes('room') || low.includes('stable') || low.includes('tavern') || low.includes('basement') || low.includes('cellar')) return 'building';

    return low.replace(/\s+/g, '-');
};
