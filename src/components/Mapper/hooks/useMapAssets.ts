/**
 * @file useMapAssets.ts
 * @description Preloads and manages image assets for the Mapper (terrain icons).
 */

import { useEffect, useState, MutableRefObject } from 'react';

const ASSETS = {
    tree: '/assets/map/forest/tree1.png',
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

export const useMapAssets = (imagesRef: MutableRefObject<Record<string, HTMLImageElement>>) => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let loadedCount = 0;
        const total = Object.keys(ASSETS).length;
        
        const checkDone = () => {
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
            img.onload = checkDone;
            img.onerror = checkDone; // Skip failed assets but don't block
            img.src = src;
            imagesRef.current[key] = img;
        });
    }, [imagesRef]);

    return { assetsLoaded: loaded };
};
