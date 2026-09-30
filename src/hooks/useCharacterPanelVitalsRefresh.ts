/**
 * @file useCharacterPanelVitalsRefresh.ts
 * @description Refreshes vitals when the character panel is expanded.
 */

// --- Logic Section ---
import { useEffect, useRef } from 'react';

export const useCharacterPanelVitalsRefresh = (
    isMinimized: boolean,
    isPlaying: boolean,
    isSpectateMode: boolean,
    executeCommand: (command: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void
): void => {
    const wasMinimized = useRef(isMinimized);

    useEffect(() => {
        const wasCollapsed = wasMinimized.current;
        wasMinimized.current = isMinimized;
        if (wasCollapsed && !isMinimized && isPlaying && !isSpectateMode) {
            executeCommand('score', true, true, true, true);
        }
    }, [executeCommand, isMinimized, isPlaying, isSpectateMode]);
};
