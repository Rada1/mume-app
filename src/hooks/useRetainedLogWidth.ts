/** @file useRetainedLogWidth.ts — Keeps closing a desktop dock from resizing the log. */
import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

// --- Desktop Log Geometry ---
export const useRetainedLogWidth = (
    logRef: RefObject<HTMLDivElement | null>, isMobile: boolean, hasDockedPanels: boolean
) => {
    const previousDocked = useRef(hasDockedPanels);
    const lastWidth = useRef(0);

    useLayoutEffect(() => {
        const log = logRef.current;
        if (isMobile || !log) {
            previousDocked.current = hasDockedPanels;
            return;
        }
        if (previousDocked.current && !hasDockedPanels && lastWidth.current > 0) {
            document.documentElement.style.setProperty('--desktop-log-width', `${lastWidth.current / window.innerWidth * 100}vw`);
        }
        previousDocked.current = hasDockedPanels;
        const measure = () => { lastWidth.current = log.getBoundingClientRect().width; };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(log);
        return () => observer.disconnect();
    }, [hasDockedPanels, isMobile, logRef]);
};
