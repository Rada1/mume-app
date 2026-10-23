/**
 * @file useCharacterPanelVitalsRefresh.ts
 * @description Refreshes character information when the panel changes state.
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
    }, [executeCommand, isMinimized, isPlaying, isSpectateMode]);
};
