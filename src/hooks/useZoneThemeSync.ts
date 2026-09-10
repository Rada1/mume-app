/**
 * @file useZoneThemeSync.ts
 * @description Syncs the active room zone colors to root CSS custom properties when Immersion Mode is enabled.
 */

import { useEffect } from 'react';
import { useRoomStore } from '../stores/useRoomStore';
import { useSpectateRoomStore } from '../stores/spectate/useSpectateRoomStore';
import { useModeStore } from '../stores/useModeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getZoneColor, getZoneTextColor } from '../utils/zoneColors';

// --- Logic Section ---

/**
 * Publishes `--current-zone-color` and `--current-zone-text-color` to the root element.
 * Only applies zone-derived colors when Immersion Mode is active; cleans them up
 * when disabled so that default styling (warm gold) takes effect.
 */
export const useZoneThemeSync = (): void => {
    const isSpectating = useModeStore(s => s.isSpectating);
    const roomZone = useRoomStore(s => s.roomZone);
    const spectateRoomZone = useSpectateRoomStore(s => s.roomZone);
    const settingsTheme = useSettingsStore(s => s.theme);
    const isImmersionMode = useSettingsStore(s => s.isImmersionMode);

    const activeZone = (isSpectating ? spectateRoomZone : roomZone) || '';

    useEffect(() => {
        const root = document.documentElement;

        if (!isImmersionMode) {
            root.style.removeProperty('--current-zone-color');
            root.style.removeProperty('--current-zone-text-color');
            return;
        }

        const baseColor = getZoneColor(activeZone);
        const textColor = getZoneTextColor(activeZone, settingsTheme === 'light');

        root.style.setProperty('--current-zone-color', baseColor);
        root.style.setProperty('--current-zone-text-color', textColor);
    }, [activeZone, settingsTheme, isImmersionMode]);
};
