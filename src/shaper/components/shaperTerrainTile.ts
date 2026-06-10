/**
 * @file shaperTerrainTile.ts
 * @description Renders Shaper room tiles using the real map's procedural terrain
 *              renderer (drawTerrainIcon) so the concept grid matches the play
 *              map's art. Each (sector, variant) is rendered once to an offscreen
 *              canvas and cached as a data URL for use as a DOM tile background.
 */

import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { drawTerrainIcon } from '../../components/Mapper/renderers/drawTerrains';
import { getTerrainColor } from '../../components/Mapper/mapperUtils';
import type { ShaperSector } from '../model/shaperTypes';

// --- Mapping Section ---
// Shaper sector -> the play map's terrain name understood by the renderer.
const SECTOR_TO_TERRAIN: Record<ShaperSector, string> = {
    inside: 'Inside',
    building: 'Building',
    city: 'City',
    field: 'Field',
    forest: 'Forest',
    hills: 'Hills',
    mountain: 'Mountains',
    shallows: 'Shallows',
    water: 'Water',
    road: 'Road',
    rapids: 'Rapids',
    underwater: 'Underwater',
    brush: 'Brush',
    tunnel: 'Tunnel',
    cavern: 'Cavern'
};

// Image assets the renderer optionally uses (falls back to procedural art until ready).
const ASSETS: Record<string, string> = {
    tree: '/assets/map/forest/tree1.png',
    trees1: '/assets/map/forest/trees1.png',
    trees2: '/assets/map/forest/trees2.png',
    trees3: '/assets/map/forest/trees3.png',
    mountain: '/assets/Pictures/terrain/mountains.png',
    mountain2: '/assets/Pictures/terrain/mountain2.png',
    hill: '/assets/Pictures/terrain/hills.png',
    peak1: '/assets/map/m_peaks/peak1.png',
    peak2: '/assets/map/m_peaks/peak2.png',
    peak3: '/assets/map/m_peaks/peak3.png',
    city: '/assets/map/city/1.png',
    building: '/assets/map/building/1.png',
    road: '/assets/map/road/1.png',
    shallows: '/assets/map/water/1.png',
    water: '/assets/map/water/2.png',
    cavern: '/assets/map/cavern/1.png'
};

const RENDER_SIZE = 200; // Render at 2x the world tile size so it stays crisp when zoomed in.
const IS_DARK = true;

// --- Renderer State Section ---
const imagesRef: MutableRefObject<Record<string, HTMLImageElement>> = { current: {} };
const processedIconsRef: MutableRefObject<Record<string, HTMLCanvasElement>> = { current: {} };
const tileCache = new Map<string, string>();

let assetVersion = 0;
const listeners = new Set<() => void>();
let assetsRequested = false;

const loadAssets = (): void => {
    if (assetsRequested || typeof window === 'undefined') return;
    assetsRequested = true;
    for (const [key, src] of Object.entries(ASSETS)) {
        const img = new Image();
        img.onload = () => {
            // New art is ready: invalidate cache and notify subscribers to re-render.
            tileCache.clear();
            processedIconsRef.current = {};
            assetVersion += 1;
            listeners.forEach(fn => fn());
        };
        img.src = src;
        imagesRef.current[key] = img;
    }
};

// --- Public API Section ---
// Returns a data URL for the given sector tile, or null when unset.
export const getShaperTerrainColor = (sector: ShaperSector | ''): string | undefined => {
    if (!sector) return undefined;
    return getTerrainColor(SECTOR_TO_TERRAIN[sector], IS_DARK, 0.62);
};

export const getShaperTerrainTile = (sector: ShaperSector | '', variant: number): string | null => {
    if (!sector) return null;
    if (typeof document === 'undefined') return null;

    const key = `${sector}_${variant}_v${assetVersion}`;
    const cached = tileCache.get(key);
    if (cached) return cached;

    const terrain = SECTOR_TO_TERRAIN[sector];
    const canvas = document.createElement('canvas');
    canvas.width = RENDER_SIZE;
    canvas.height = RENDER_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = getTerrainColor(terrain, IS_DARK, 0.62);
    ctx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE);
    drawTerrainIcon(ctx, 0, 0, RENDER_SIZE, terrain, IS_DARK, processedIconsRef, imagesRef, variant);

    const url = canvas.toDataURL();
    tileCache.set(key, url);
    return url;
};

// Deterministic per-room art variant so neighbouring tiles look varied but stable.
export const shaperTileVariant = (x: number, y: number): number =>
    ((x * 31 + y * 17) % 6 + 6) % 6;

// Subscribe so tiles re-render once the image assets finish loading.
export const useShaperTerrainAssets = (): number => {
    const [version, setVersion] = useState(assetVersion);
    useEffect(() => {
        loadAssets();
        const fn = () => setVersion(assetVersion);
        listeners.add(fn);
        fn();
        return () => { listeners.delete(fn); };
    }, []);
    return version;
};
