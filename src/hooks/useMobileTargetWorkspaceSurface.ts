/** @file useMobileTargetWorkspaceSurface.ts — Keeps the shared target popover above mobile command and map layers. */
import { useLayoutEffect, type RefObject } from 'react';

// --- Mobile popover lifetime ---
export const useMobileTargetWorkspaceSurface = (ref: RefObject<HTMLElement | null>, enabled: boolean) => {
    useLayoutEffect(() => {
        const panel = ref.current;
        if (!enabled || !panel || typeof panel.showPopover !== 'function') return;
        panel.showPopover();
        return () => {
            if (panel.matches(':popover-open')) panel.hidePopover();
        };
    }, [ref, enabled]);
};
