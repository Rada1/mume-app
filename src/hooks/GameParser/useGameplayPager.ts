/** @file useGameplayPager.ts — Advances panel viewers while leaving manual viewers interactive. */
import { useCallback } from 'react';
import { usePanelDataStore } from '../../stores/usePanelDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { isPagerPrompt } from '../../utils/pagerPrompt';
import type { GameplayPagerDeps } from '../../types';

// --- Logic Section: Viewer Ownership ---
export const useGameplayPager = ({ gameState, sendCommand, addMessage, ownsCapture }: GameplayPagerDeps) =>
    useCallback((line: string, isSnoop: boolean): boolean => {
        if (gameState !== 'playing' || !isPagerPrompt(line)) return false;
        const panels = usePanelDataStore.getState();
        const ui = useUIStore.getState();
        const automated = !isSnoop && (panels.hasActiveRequest() || ownsCapture()
            || ui.shopVariantRequest !== null);
        if (automated && sendCommand) {
            // Bypass command middleware: a viewer Return must not finalize or replace the capture.
            queueMicrotask(() => sendCommand(''));
        } else {
            addMessage(isSnoop ? 'snoop' : 'game', line);
        }
        // A viewer prompt is never a game prompt or a capture boundary.
        return true;
    }, [gameState, sendCommand, addMessage, ownsCapture]);
