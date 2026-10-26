/** @file useMobileReadabilityDefault.ts — Applies the mobile default until the user chooses a preference. */

// --- Logic Section ---
import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

// --- Default Synchronization ---
export const useMobileReadabilityDefault = (isMobile: boolean): void => {
    const isReadabilityMode = useSettingsStore(state => state.isReadabilityMode);
    const hasCustomReadabilityMode = useSettingsStore(state => state.hasCustomReadabilityMode);
    const setDefaultReadabilityMode = useSettingsStore(state => state.setDefaultReadabilityMode);

    useEffect(() => {
        if (hasCustomReadabilityMode || isReadabilityMode === isMobile) return;
        setDefaultReadabilityMode(isMobile);
    }, [hasCustomReadabilityMode, isMobile, isReadabilityMode, setDefaultReadabilityMode]);
};
