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
    } = useGame();

    // --- Terrain Resolution ---
    // Use spectate terrain when spectating, player terrain otherwise.
    const isSpectating = activeSession === 'spectate';
    const activeTerrain = isSpectating ? spectateTerrain : currentTerrain;

    // Manual upload overrides terrain-driven image; terrain image is the fallback.
    const resolvedBgImage = bgImage ?? resolveTerrainBackground(activeTerrain);

    return (
        <EnvironmentEffects
            lighting={lighting}
            weather={weather}
            isFoggy={isFoggy}
            lightning={lightningEnabled}
            isImmersionMode={isImmersionMode}
            isMobile={viewport.isMobile}
            bgImage={resolvedBgImage}
            bgImageBottom={bgImageBottom}
        />
    );
};
