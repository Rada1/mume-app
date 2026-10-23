/** @file usePanelData.ts — Requests snapshots only when a panel needs them. */
import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { usePanelDataStore } from '../stores/usePanelDataStore';
import type { PanelDataKind } from '../types';

// --- Panel Requests ---
export const usePanelData = () => {
    const { executeCommand, gameState, isSpectateMode } = useGame();
    const status = usePanelDataStore(state => state.status);
    const session = usePanelDataStore(state => state.session);
    const revision = usePanelDataStore(state => state.revision);
    const request = useCallback((kind: PanelDataKind, force = false) => {
        if (gameState !== 'playing' || isSpectateMode) return;
        usePanelDataStore.getState().request(kind,
            command => executeCommand(command, true, true, false, true, { shouldFocus: false }), force);
    }, [executeCommand, gameState, isSpectateMode, session]);
    return { status, request, revision, enabled: gameState === 'playing' && !isSpectateMode };
};
