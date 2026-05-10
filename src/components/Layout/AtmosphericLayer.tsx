/**
 * @file AtmosphericLayer.tsx
 * @description Drives all environmental visual effects. Resolves the active terrain
 * into a background image URL and passes it to EnvironmentEffects.
 * Manual bgImage from settings overrides the terrain-driven image.
 */
import React from 'react';
import { useGame } from '../../context/GameContext';
import { EnvironmentEffects } from '../Atmosphere/EnvironmentEffects';
import { resolveTerrainBackground } from '../../utils/terrainBackgrounds';

export const AtmosphericLayer: React.FC = () => {
    const {
        lighting,
        weather,
        isFoggy,
        lightningEnabled,
        isImmersionMode,
        viewport,
        bgImage,
        bgImageBottom,
        activeSession,
        currentTerrain,
        spectateTerrain,
        accountState,
    } = useGame();

    // --- Terrain Resolution ---
    const isAccountMode = accountState.stage !== 'none';
    const isSpectating = activeSession === 'spectate';
    const activeTerrain = isSpectating ? spectateTerrain : currentTerrain;

    // Account Mode Overrides: Force moon lighting and field background
    const effectiveLighting = isAccountMode ? 'moon' : lighting;
    const resolvedBgImage = isAccountMode 
        ? '/assets/Pictures/account.png' 
        : (bgImage ?? resolveTerrainBackground(activeTerrain));

    return (
        <EnvironmentEffects
            lighting={effectiveLighting}
            weather={weather}
            isFoggy={isFoggy}
            lightning={lightningEnabled}
            isImmersionMode={isImmersionMode}
            isMobile={viewport.isMobile}
            bgImage={resolvedBgImage}
            bgImageBottom={bgImageBottom}
            terrain={activeTerrain}
        />
    );
};
