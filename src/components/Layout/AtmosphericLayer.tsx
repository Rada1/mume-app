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
import { resolveRaceBackground, resolveRaceBackgroundScale } from '../../utils/raceBackgrounds';
import { useModeStore } from '../../stores/useModeStore';

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
        userSession,
        currentTerrain,
        spectateTerrain,
        accountState,
    } = useGame();

    // --- Terrain Resolution ---
    const isAccountMode = accountState.stage !== 'none';
    const activeView = useModeStore(state => state.activeView);
    const isSpectating = activeSession === 'spectate' || activeView === 'target';
    const activeTerrain = isSpectating ? spectateTerrain : currentTerrain;

    // Account Mode Overrides: Stage-aware lighting and background
    const isCreationSequence = ['character-creation', 'stat-editing', 'account-confirmation'].includes(accountState.stage);

    const effectiveLighting = isAccountMode 
        ? (isCreationSequence ? 'dark' : 'moon') 
        : lighting;

    const resolvedBgImage = isAccountMode 
        ? '/assets/Pictures/account.png' 
        : (bgImage ?? resolveTerrainBackground(activeTerrain));
    const race = userSession.vitals.characterInfo.race;
    const resolvedBottomBgImage = bgImageBottom
        ?? (!isAccountMode && !isSpectating
            ? resolveRaceBackground(race)
            : null);
    const resolvedBottomBgScale = bgImageBottom || isAccountMode || isSpectating
        ? 1
        : resolveRaceBackgroundScale(race);

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
            terrain={activeTerrain}
        />
    );
};
