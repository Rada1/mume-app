/**
 * @file shaperTerrainTile.ts
 * @description Resolves MMapper pixmap assets for Shaper room tiles.
 */

import { useEffect, useState } from 'react';
import type { ShaperDirection, ShaperSector } from '../model/shaperTypes';

// --- Mapping Section ---
const PIXMAP_BASE = '/assets/mmapper/pixmaps';

const SECTOR_TO_PIXMAP: Record<ShaperSector, string> = {
    inside: 'terrain-indoors.png',
    building: 'terrain-indoors.png',
    city: 'terrain-city.png',
    field: 'terrain-field.png',
    forest: 'terrain-forest.png',
    hills: 'terrain-hills.png',
    mountain: 'terrain-mountains.png',
    shallows: 'terrain-shallow.png',
    water: 'terrain-water.png',
    road: 'terrain-road.png',
    rapids: 'terrain-rapids.png',
    underwater: 'terrain-underwater.png',
    brush: 'terrain-brush.png',
    tunnel: 'terrain-tunnel.png',
    cavern: 'terrain-cavern.png'
};

const DOOR_PIXMAPS: Record<ShaperDirection, string> = {
    n: 'door-north.png',
    e: 'door-east.png',
    s: 'door-south.png',
    w: 'door-west.png',
    u: 'door-up.png',
    d: 'door-down.png'
};

const CLIMB_PIXMAPS: Partial<Record<ShaperDirection, string>> = {
    u: 'exit-climb-up.png',
    d: 'exit-climb-down.png'
};

const cardinalOrder: ShaperDirection[] = ['n', 'e', 's', 'w'];
const loadedAssets = new Set<string>();
let assetVersion = 0;
const listeners = new Set<() => void>();

// --- Asset Section ---
const assetUrl = (name: string): string => `${PIXMAP_BASE}/${name}`;

const preload = (name: string): void => {
    if (loadedAssets.has(name) || typeof Image === 'undefined') return;
    loadedAssets.add(name);
    const image = new Image();
    image.onload = () => {
        assetVersion += 1;
        listeners.forEach(fn => fn());
    };
    image.src = assetUrl(name);
};

// --- Public API Section ---
export const getShaperTerrainTile = (sector: ShaperSector | ''): string =>
    assetUrl(sector ? SECTOR_TO_PIXMAP[sector] : 'terrain-undefined.png');

export const getShaperDoorTile = (direction: ShaperDirection, isClimb?: boolean): string =>
    assetUrl((isClimb && CLIMB_PIXMAPS[direction]) || DOOR_PIXMAPS[direction]);

export const getShaperPathTile = (
    kind: 'road' | 'trail',
    directions: ShaperDirection[]
): string => {
    const suffix = cardinalOrder.filter(dir => directions.includes(dir)).join('') || 'none';
    return assetUrl(`${kind}-${suffix.length === 4 ? 'all' : suffix}.png`);
};

export const shaperTileVariant = (x: number, y: number): number =>
    ((x * 31 + y * 17) % 6 + 6) % 6;

export const useShaperTerrainAssets = (): number => {
    const [version, setVersion] = useState(assetVersion);
    useEffect(() => {
        [...Object.values(SECTOR_TO_PIXMAP), ...Object.values(DOOR_PIXMAPS), ...Object.values(CLIMB_PIXMAPS)]
            .forEach(name => name && preload(name));
        const fn = () => setVersion(assetVersion);
        listeners.add(fn);
        return () => { listeners.delete(fn); };
    }, []);
    return version;
};
