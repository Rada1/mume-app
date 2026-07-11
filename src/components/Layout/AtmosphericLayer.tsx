/**
 * @file AtmosphericLayer.tsx
 * @description Drives all environmental visual effects. Resolves the active terrain
 * into terrain classes while keeping bitmap backgrounds map-based.
 * Manual bgImage from settings overrides the default map background.
 */
import React from 'react';
import { useGame } from '../../context/GameContext';
import { EnvironmentEffects } from '../Atmosphere/EnvironmentEffects';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

const MAP_BACKGROUND_IMAGE = '/assets/Pictures/UIPics/darkmap.png';

export const AtmosphericLayer: React.FC = () => {
    const {
        lighting,
        weather,
        isFoggy,
        lightningEnabled,
        isImmersionMode,
        viewport,
        currentTerrain,
        roomZone,
        spectateTerrain,
        spectateRoomZone,
        accountState,
    } = useGame();

    const manualBgImage = useSettingsStore(state => state.bgImage);
    const manualBgImageBottom = useSettingsStore(state => state.bgImageBottom);

    // --- Terrain Resolution ---
    const isAccountMode = accountState.stage !== 'none';
    const activeView = useModeStore(state => state.activeView);
    const isSpectating = useModeStore(state => state.isSpectating);
    const isViewingSpectateTarget = isSpectating && activeView === 'target';
    const activeTerrain = isViewingSpectateTarget ? spectateTerrain : currentTerrain;
    const activeZone = isViewingSpectateTarget ? spectateRoomZone : roomZone;
    const effectiveTerrain = isAccountMode ? 'account-blue' : activeTerrain;
    const effectiveZone = isAccountMode ? null : activeZone;

    // Account Mode Overrides: Stage-aware lighting and background
    const isCreationSequence = ['character-creation', 'stat-editing', 'account-confirmation'].includes(accountState.stage);

    const effectiveLighting = isAccountMode 
        ? (isCreationSequence ? 'dark' : 'moon') 
        : lighting;

    // Resolved background image: map texture by default. Terrain bitmap backgrounds stay unhooked.
    const resolvedBgImage = manualBgImage || MAP_BACKGROUND_IMAGE;
    const resolvedBottomBgImage = manualBgImageBottom;
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
            zone={effectiveZone}
        />
    );
};
