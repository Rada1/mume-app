/**
 * @file useCharacterPanelVitalsRefresh.ts
 * @description Refreshes combat ratings on panel transitions and vitals when expanded.
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
        const panelStateChanged = wasCollapsed !== isMinimized;
        if (!panelStateChanged || !isPlaying || isSpectateMode) return;

        executeCommand('info %O %D %k %A', true, true, true, true);

        if (wasCollapsed && !isMinimized) {
            const scoreRefreshTimeout = window.setTimeout(() => {
                executeCommand('score', true, true, true, true);
            }, 100);
            return () => window.clearTimeout(scoreRefreshTimeout);
        }
    }, [executeCommand, isMinimized, isPlaying, isSpectateMode]);
};
