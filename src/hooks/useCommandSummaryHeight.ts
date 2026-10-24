/** @file useCommandSummaryHeight.ts — Reserves desktop panel space above the character summary. */
import { useLayoutEffect, useRef } from 'react';

// --- Summary Measurement Section ---
export function useCommandSummaryHeight() {
    const summaryRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const summary = summaryRef.current;
        const slot = summary?.closest<HTMLElement>('.command-dock-summary');
        const app = slot?.closest<HTMLElement>('.app-container');
        if (!slot || !app || slot.closest('.command-dock-shell-mobile')) return;

        const property = '--command-dock-summary-height';
        const update = () => {
            const height = `${Math.ceil(slot.getBoundingClientRect().height)}px`;
            if (app.style.getPropertyValue(property) !== height) app.style.setProperty(property, height);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(slot);
        return () => {
            observer.disconnect();
            app.style.removeProperty(property);
        };
    }, []);

    return summaryRef;
}
