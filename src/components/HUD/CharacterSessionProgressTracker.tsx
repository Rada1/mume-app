/** @file CharacterSessionProgressTracker.tsx — Keeps session XP/TP baselines current while the command panel is closed. */

// --- Logic Section ---
import React from 'react';
import { useGame } from '../../context/GameContext';
import { useCharacterSessionProgress } from '../../hooks/useCharacterSessionProgress';
import { useModeStore } from '../../stores/useModeStore';
import { useActiveVitals } from '../../stores/useActiveGameState';

// --- Render Section ---
export const CharacterSessionProgressTracker: React.FC = () => {
    const { characterName, gameState, sessionMode } = useGame();
    const activeVitals = useActiveVitals();
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const spectateTarget = useModeStore(state => state.spectateTarget);
    const isAccountScreen = gameState === 'account' && sessionMode !== 'replay';
    const name = activeVitals.characterInfo.name || characterName || '';
    const scope = isSpectating
        ? `spectate:${activeView === 'target' ? spectateTarget || '' : 'self'}`
        : `player:${name}`;

    useCharacterSessionProgress(
        name,
        isAccountScreen ? null : activeVitals.characterInfo.xp,
        isAccountScreen ? null : activeVitals.characterInfo.tp,
        isAccountScreen ? null : activeVitals.characterInfo.tnl,
        isAccountScreen ? null : activeVitals.characterInfo.tpnl,
        scope
    );

    return null;
};
