/** @file useMobileMovementMapSlot.ts — Finds the landscape Movement menu's minimap slot. */

import { useEffect, useState } from 'react';

// --- Logic Section ---
export const useMobileMovementMapSlot = (enabled: boolean): HTMLElement | null => {
    const [slot, setSlot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!enabled || typeof document === 'undefined') {
            setSlot(null);
            return;
        }

        const app = document.querySelector<HTMLElement>('.app-container');
        if (!app) return;

        const updateSlot = () => {
            const nextSlot = app.querySelector<HTMLElement>('.command-tree-movement-map-slot');
            setSlot(current => current === nextSlot ? current : nextSlot);
        };

        updateSlot();
        const observer = new MutationObserver(updateSlot);
        observer.observe(app, { childList: true });
        return () => observer.disconnect();
    }, [enabled]);

    return slot;
};
