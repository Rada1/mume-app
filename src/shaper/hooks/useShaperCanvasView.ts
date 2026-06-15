/**
 * @file useShaperCanvasView.ts
 * @description Transient pan/zoom camera for the Shaper concept canvas. Scroll
 *              to zoom toward the cursor, drag the background to pan, and map
 *              screen coordinates back to grid cells for placement.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

// --- Constants Section ---
// SHAPER_CELL is the grid pitch (spacing between room centres); SHAPER_TILE is
// the rendered room size. The difference is the gutter that keeps rooms visibly
// separated, and the generous pitch gives more working space than the play map.
export const SHAPER_CELL = 132;
export const SHAPER_TILE = 100;
export const SHAPER_GUTTER = (SHAPER_CELL - SHAPER_TILE) / 2;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.4;
const ZOOM_SENSITIVITY = 0.0015;

export interface ShaperCamera {
    x: number;
    y: number;
    zoom: number;
}

const clampZoom = (zoom: number): number => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

// --- Hook Section ---
export const useShaperCanvasView = () => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [camera, setCamera] = useState<ShaperCamera>({ x: 40, y: 40, zoom: 1 });
    const panRef = useRef<{ pointerId: number; startX: number; startY: number; camX: number; camY: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // Convert a client point to its grid cell, accounting for camera + cell size.
    const screenToCell = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
        const rect = viewportRef.current?.getBoundingClientRect();
        const sx = clientX - (rect?.left ?? 0);
        const sy = clientY - (rect?.top ?? 0);
        const worldX = (sx - camera.x) / camera.zoom;
        const worldY = (sy - camera.y) / camera.zoom;
        // Floor, not round: a room occupies the cell box [k*CELL, k*CELL+CELL),
        // so any point inside it, including the tile center, maps back to k.
        return { x: Math.floor(worldX / SHAPER_CELL), y: Math.floor(worldY / SHAPER_CELL) };
    }, [camera]);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = el.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            setCamera(prev => {
                const nextZoom = clampZoom(prev.zoom * (1 - e.deltaY * ZOOM_SENSITIVITY));
                const scale = nextZoom / prev.zoom;
                return {
                    zoom: nextZoom,
                    x: sx - (sx - prev.x) * scale,
                    y: sy - (sy - prev.y) * scale
                };
            });
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const handlePanStart = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
        panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, camX: camera.x, camY: camera.y };
        setIsPanning(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [camera]);

    const handlePanMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
        const pan = panRef.current;
        if (!pan || pan.pointerId !== e.pointerId) return;
        setCamera(prev => ({
            ...prev,
            x: pan.camX + (e.clientX - pan.startX),
            y: pan.camY + (e.clientY - pan.startY)
        }));
    }, []);

    const handlePanEnd = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
        if (panRef.current?.pointerId !== e.pointerId) return;
        panRef.current = null;
        setIsPanning(false);
    }, []);

    const resetCamera = useCallback(() => setCamera({ x: 40, y: 40, zoom: 1 }), []);

    return {
        viewportRef,
        camera,
        isPanning,
        screenToCell,
        handlePanStart,
        handlePanMove,
        handlePanEnd,
        resetCamera
    };
};
