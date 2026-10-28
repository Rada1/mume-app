/** @file useClientDetailsViewport.ts — Applies independent mobile and desktop Details preferences. */
import { useLayoutEffect } from 'react';
import { useClientPanelStackStore } from '../stores/useClientPanelStackStore';

// --- Shared viewport preference ---
export const useClientDetailsViewport = (isMobile: boolean) => {
    useLayoutEffect(() => {
        useClientPanelStackStore.getState().setDetailsViewport(isMobile);
    }, [isMobile]);
};
