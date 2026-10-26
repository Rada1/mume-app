/** @file useMapContextMenuPlacement.ts — Places mobile room actions above a protected map selection. */
import { useLayoutEffect, useRef, useState } from 'react';
import type { MapContextMenuPosition } from '../types';

// --- Placement Logic Section ---
export const useMapContextMenuPlacement = (enabled: boolean, anchor: MapContextMenuPosition['anchor'], x: number, y: number) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({x, y});
    // The browser's top layer escapes app transforms, clipping and panel stacking contexts.
    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!enabled || !menu || typeof menu.showPopover !== 'function') return;
        menu.showPopover();
        return () => menu.hidePopover();
    }, [enabled]);
    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!enabled || !anchor || !menu) return;
        const place = () => {
            const viewport = window.visualViewport;
            const left = (viewport?.offsetLeft ?? 0) + 8;
            const top = (viewport?.offsetTop ?? 0) + 8;
            const right = left + (viewport?.width ?? window.innerWidth) - 16;
            const bottom = top + (viewport?.height ?? window.innerHeight) - 16;
            const {width, height} = menu.getBoundingClientRect();
            const clampX = (value: number) => Math.max(left, Math.min(value, right - width));
            const clampY = (value: number) => Math.max(top, Math.min(value, bottom - height));
            const {x: ax, y: ay, gap} = anchor;
            const centeredX = clampX(ax - width / 2);
            const centeredY = clampY(ay - height / 2);
            const candidates = [
                {x: centeredX, y: ay - gap - height},
                {x: centeredX, y: ay + gap},
                {x: ax - gap - width, y: centeredY},
                {x: ax + gap, y: centeredY}
            ];
            const fits = candidates.find(p => p.x >= left && p.y >= top && p.x + width <= right && p.y + height <= bottom);
            // On cramped screens choose the clamped position that covers the least of the selection.
            const fallback = candidates.map(p => ({x: clampX(p.x), y: clampY(p.y)})).sort((a, b) => {
                const overlap = (p: {x: number; y: number}) =>
                    Math.max(0, Math.min(p.x + width, ax + gap) - Math.max(p.x, ax - gap))
                    * Math.max(0, Math.min(p.y + height, ay + gap) - Math.max(p.y, ay - gap));
                return overlap(a) - overlap(b);
            })[0];
            const next = fits ?? fallback;
            setPosition(current => current.x === next.x && current.y === next.y ? current : next);
        };
        place();
        const observer = new ResizeObserver(place);
        observer.observe(menu);
        window.addEventListener('resize', place);
        window.visualViewport?.addEventListener('resize', place);
        window.visualViewport?.addEventListener('scroll', place);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', place);
            window.visualViewport?.removeEventListener('resize', place);
            window.visualViewport?.removeEventListener('scroll', place);
        };
    }, [enabled, anchor, x, y]);
    return {menuRef, position};
};
