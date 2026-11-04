/** @file useQuickStateHover.ts — Keep quick menus open while crossing to their popover. */
import { useCallback, useEffect, useRef } from 'react';

// --- Hover Section ---
export function useQuickStateHover(active: string | null, close: () => void) {
    const timer = useRef<number | null>(null);
    const activeRef = useRef(active);
    const closeRef = useRef(close);
    activeRef.current = active;
    closeRef.current = close;

    const cancel = useCallback(() => {
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = null;
    }, []);
    const leave = useCallback((label: string, pointerType: string) => {
        if (pointerType === 'touch') return;
        cancel();
        timer.current = window.setTimeout(() => {
            timer.current = null;
            if (activeRef.current === label) closeRef.current();
        }, 220);
    }, [cancel]);
    useEffect(() => cancel, [cancel]);
    return { cancel, leave };
}
