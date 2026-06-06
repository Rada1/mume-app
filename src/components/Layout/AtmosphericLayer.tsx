/**
 * @file AtmosphericLayer.tsx
 * @description Drives all environmental visual effects. Resolves the active terrain
 * into a background image URL and passes it to EnvironmentEffects.
 * Manual bgImage from settings overrides the terrain-driven image.
 */
import React from 'react';
import { useGame } from '../../context/GameContext';
import { EnvironmentEffects } from '../Atmosphere/EnvironmentEffects';
import { useModeStore } from '../../stores/useModeStore';

export const AtmosphericLayer: React.FC = () => {
    const {
        lighting,
        weather,
        isFoggy,
        lightningEnabled,
        isImmersionMode,
        viewport,
        activeSession,
        currentTerrain,
        spectateTerrain,
        accountState,
    } = useGame();

    // --- Terrain Resolution ---
    const isAccountMode = accountState.stage !== 'none';
    const activeView = useModeStore(state => state.activeView);
    const isSpectating = activeSession === 'spectate' || activeView === 'target';
    const activeTerrain = isSpectating ? spectateTerrain : currentTerrain;
    const effectiveTerrain = isAccountMode ? 'account-blue' : activeTerrain;

    // Account Mode Overrides: Stage-aware lighting and background
    const isCreationSequence = ['character-creation', 'stat-editing', 'account-confirmation'].includes(accountState.stage);

    const effectiveLighting = isAccountMode 
        ? (isCreationSequence ? 'dark' : 'moon') 
        : lighting;

    // Resolved background image: always use mountain.png for gameplay, or account.png in account mode
    const resolvedBgImage = isAccountMode 
        ? (accountState.stage === 'login' ? null : '/assets/Pictures/account.png')
        : '/assets/Pictures/terrain/mountain.png';
    const resolvedBottomBgImage = null;
    const resolvedBottomBgScale = 1;

    return (
        <EnvironmentEffects
            lighting={effectiveLighting}
            weather={weather}
            isFoggy={isFoggy}
            lightning={lightningEnabled}
            isImmersionMode={isImmersionMode}
            isMobile={viewport.isMobile}
            bgImage={resolvedBgImage}
            bgImageBottom={resolvedBottomBgImage}
            bgImageBottomScale={resolvedBottomBgScale}
            terrain={effectiveTerrain}
        />
    );
};
