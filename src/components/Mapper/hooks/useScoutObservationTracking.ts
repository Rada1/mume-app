/**
 * @file useScoutObservationTracking.ts
 * @description Tracks whether incoming room data belongs to a scout observation.
 */

import { useEffect, useRef, type MutableRefObject } from 'react';

// --- Logic Section ---
const SCOUT_COMMAND_TIMEOUT_MS = 30_000;

export function useScoutObservationTracking(): MutableRefObject<boolean> {
    const isScoutingRef = useRef(false);
    const sawScoutResponseRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let timeout: ReturnType<typeof setTimeout> | null = null;
        const setScouting = (active: boolean, response = false) => {
            isScoutingRef.current = active;
            sawScoutResponseRef.current = active && response;
            if (timeout) clearTimeout(timeout);
            // A confirmed scout can take longer than a fixed timer. Its final
            // room report and prompt explicitly end the observation window.
            timeout = active && !response
                ? setTimeout(() => {
                    isScoutingRef.current = false;
                    sawScoutResponseRef.current = false;
                    timeout = null;
                }, SCOUT_COMMAND_TIMEOUT_MS)
                : null;
        };

        const onScoutState = (event: Event) => {
            const detail = (event as CustomEvent<{ active?: unknown; response?: unknown }>).detail;
            setScouting(detail?.active === true, detail?.response === true);
        };
        const onCommandSent = (event: Event) => {
            const detail = (event as CustomEvent<{ cmd?: string; isSystem?: boolean }>).detail;
            if (detail?.isSystem || /^scout(?:\s|$)/i.test(detail?.cmd?.trim() || '')) return;
            if (!sawScoutResponseRef.current) setScouting(false);
        };

        window.addEventListener('mume-mapper-scout-state', onScoutState);
        window.addEventListener('mume-command-sent', onCommandSent);
        return () => {
            window.removeEventListener('mume-mapper-scout-state', onScoutState);
            window.removeEventListener('mume-command-sent', onCommandSent);
            if (timeout) clearTimeout(timeout);
        };
    }, []);

    return isScoutingRef;
}
