/** @file useSwipeDownToMinimize.ts — Close the mobile character sheet with a downward swipe. */

// --- Logic Section ---
import { useRef } from 'react';
import type { TouchEvent } from 'react';
import { useHaptics } from './interactions/useHaptics';

export const useSwipeDownToMinimize = (enabled: boolean, onMinimize: () => void) => {
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const { triggerHaptic } = useHaptics();

    const onTouchStart = (event: TouchEvent<HTMLElement>) => {
        startRef.current = null;
        if (!enabled || event.touches.length !== 1) return;
        const target = event.target as HTMLElement;
        if (target.closest('button, input, select, textarea, a, [role="button"]:not(.this-is-you-tier-identity)')) return;

        const scrollRegion = event.currentTarget.querySelector<HTMLElement>('.this-is-you-body-wrapper');
        if (scrollRegion?.contains(target) && scrollRegion.scrollTop > 2) return;
        startRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };

    const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
        const start = startRef.current;
        startRef.current = null;
        if (!start || event.changedTouches.length !== 1) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (dy > 48 && dy > Math.abs(dx) * 1.4) {
            event.preventDefault();
            triggerHaptic(20);
            onMinimize();
        }
    };

    const onTouchCancel = () => { startRef.current = null; };

    return { onTouchStart, onTouchEnd, onTouchCancel };
};
