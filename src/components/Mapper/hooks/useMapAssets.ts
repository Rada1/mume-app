/**
 * @file useMapAssets.ts
 * @description Preloads and manages image assets for the Mapper (terrain icons).
 */

import { useEffect, useState, MutableRefObject } from 'react';

const ASSETS = {
    tree: '/assets/map/forest/tree1.png',
    trees1: '/assets/map/forest/trees1.png',
    trees2: '/assets/map/forest/trees2.png',
    trees3: '/assets/map/forest/trees3.png',
    hill: '/assets/Pictures/terrain/hills.png',
    peak1: '/assets/map/m_peaks/peak1.png',
    peak2: '/assets/map/m_peaks/peak2.png',
    peak3: '/assets/map/m_peaks/peak3.png',
    city: '/assets/map/city/1.png',
    building: '/assets/map/building/1.png',
    road: '/assets/map/road/1.png',
    shallows: '/assets/map/water/1.png',
    water: '/assets/map/water/2.png',
    cavern: '/assets/map/cavern/1.png',
    mountain: '/assets/Pictures/terrain/mountains.png',
    mountain2: '/assets/Pictures/terrain/mountain2.png',
};

const bakeTreeShadow = (img: HTMLImageElement, isDarkMode: boolean): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    // Add 15% padding on all sides to prevent shadow clipping
    const paddingX = img.width * 0.15;
    const paddingY = img.height * 0.15;
    canvas.width = img.width + paddingX * 2;
    canvas.height = img.height + paddingY * 2;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = img.width * 0.09;
    ctx.shadowOffsetX = img.width * 0.035;
    ctx.shadowOffsetY = img.height * 0.055;

    ctx.drawImage(img, paddingX, paddingY);
    return canvas;
};

export const useMapAssets = (imagesRef: MutableRefObject<Record<string, HTMLImageElement | HTMLCanvasElement>>) => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let loadedCount = 0;
        const total = Object.keys(ASSETS).length;
        
        const checkDone = (key: string, img: HTMLImageElement) => {
            // Bake shadows for tree assets
            if (key === 'tree' || key.startsWith('trees')) {
                imagesRef.current[key + '_dark'] = bakeTreeShadow(img, true);
                imagesRef.current[key + '_light'] = bakeTreeShadow(img, false);
            }
            
            loadedCount++;
            if (loadedCount === total) {
                setLoaded(true);
            }
        };

        Object.entries(ASSETS).forEach(([key, src]) => {
            if (imagesRef.current[key]) {
                loadedCount++;
                if (loadedCount === total) setLoaded(true);
                return;
            }

            const img = new Image();
            img.onload = () => checkDone(key, img);
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === total) setLoaded(true);
            };
            img.src = src;
            imagesRef.current[key] = img;
        });
    }, [imagesRef]);

    return { assetsLoaded: loaded };
};
