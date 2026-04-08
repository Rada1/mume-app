import { useRef, useEffect } from 'react';

interface UseTerminalSyncProps {
    gameState: import('../../../types').GameState;
    viewport: ReturnType<typeof import('../../../hooks/useViewport').useViewport>;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
}

export const useTerminalSync = ({ gameState, viewport, executeCommand }: UseTerminalSyncProps) => {
    const lastSyncRef = useRef({ cols: 0, rows: 0 });

    useEffect(() => {
        if (gameState === 'disconnected' || !viewport.columns || !viewport.rows) return;

        // Skip if dimensions haven't changed since last SUCCESSFUL sync command
        if (viewport.columns === lastSyncRef.current.cols &&
            viewport.rows === lastSyncRef.current.rows) return;

        const timer = setTimeout(() => {
            // Re-check inside timer in case it changed back or already fired
            if (viewport.columns === lastSyncRef.current.cols &&
                viewport.rows === lastSyncRef.current.rows) return;

            console.log(`[Sync] Terminal: ${viewport.columns}x${viewport.rows}`);

            // Combine into one command to minimize silent capture overhead
            executeCommand(`change width ${viewport.columns}; change length ${viewport.rows}`, true, true);

            // Update the ref so we don't spam if executeCommand identity shifts again
            lastSyncRef.current = { cols: viewport.columns, rows: viewport.rows };
        }, 500); // 500ms settle time

        return () => clearTimeout(timer);
    }, [viewport.columns, viewport.rows, gameState, executeCommand]);
};
