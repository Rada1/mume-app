/**
 * @file useSwipeUpToMinimize.ts
 * @description Touch gesture for collapsing the mobile character panel without stealing its scrolling.
 */

// --- Logic Section ---
import { useRef } from 'react';
import type { TouchEvent } from 'react';

export const useSwipeUpToMinimize = (enabled: boolean, onMinimize: () => void) => {
    const startRef = useRef<{ x: number; y: number } | null>(null);

    const onTouchStart = (event: TouchEvent<HTMLElement>) => {
        startRef.current = null;
        if (!enabled || event.touches.length !== 1) return;
        const target = event.target as HTMLElement;
        if (target.closest('button, input, select, textarea, a')) return;

        const scrollRegion = event.currentTarget.querySelector<HTMLElement>('.this-is-you-body-wrapper');
        if (scrollRegion?.contains(target) && scrollRegion.scrollHeight > scrollRegion.clientHeight + 2
            && scrollRegion.scrollTop + scrollRegion.clientHeight < scrollRegion.scrollHeight - 2) return;

        startRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };

    const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
        const start = startRef.current;
        startRef.current = null;
        if (!start || event.changedTouches.length !== 1) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (dy < -48 && Math.abs(dy) > Math.abs(dx) * 1.4) onMinimize();
    };

    const onTouchCancel = () => { startRef.current = null; };

    return { onTouchStart, onTouchEnd, onTouchCancel };
};
