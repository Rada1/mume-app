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
import { useMumeTime } from '../../hooks/useMumeTime';
import { getMumeTimeOfDayClass } from '../../utils/mumeTimeUtils';
import { useAudioEffects } from '../../hooks/useAudioSystem';
import { useSolarTransitionSounds } from '../../hooks/useSolarTransitionSounds';
import { useRoomNoLight } from '../../hooks/useRoomNoLight';

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
        playerPosition,
        spectateTerrain,
        spectateRoomZone,
        accountState,
        gameState,
        sessionMode,
        gameTime,
    } = useGame();
    const currentGameTime = useMumeTime(gameTime);
    const noLight = useRoomNoLight();
    const isNight = getMumeTimeOfDayClass(
        currentGameTime.month,
        currentGameTime.hour,
        currentGameTime.minute
    ) === 'night';

    const manualBgImage = useSettingsStore(state => state.bgImage);
    const manualBgImageBottom = useSettingsStore(state => state.bgImageBottom);

    // --- Terrain Resolution ---
    const isAccountMode = (gameState === 'account' || accountState.stage !== 'none') && sessionMode !== 'replay';
    const activeView = useModeStore(state => state.activeView);
    const isSpectating = useModeStore(state => state.isSpectating);
    const isViewingSpectateTarget = isSpectating && activeView === 'target';
    const activeTerrain = isViewingSpectateTarget ? spectateTerrain : currentTerrain;
    const activeZone = isViewingSpectateTarget ? spectateRoomZone : roomZone;
    const effectiveTerrain = isAccountMode ? 'account-blue' : activeTerrain;
    const effectiveZone = isAccountMode ? null : activeZone;

    // --- Account Screens: No Environmental Lighting or Weather ---
    const visualLighting = isAccountMode ? 'none' : lighting;
    const { playEffect } = useAudioEffects();
    useSolarTransitionSounds(
        currentGameTime,
        gameTime !== null && !isAccountMode && (gameState === 'playing' || sessionMode === 'replay'),
        playEffect
    );

    // Resolved background image: map texture by default. Terrain bitmap backgrounds stay unhooked.
    const resolvedBgImage = manualBgImage || MAP_BACKGROUND_IMAGE;
    const resolvedBottomBgImage = manualBgImageBottom;
    const resolvedBottomBgScale = 1;

    return (
        <EnvironmentEffects
            noLight={noLight}
            lighting={visualLighting}
            weather={weather}
            isFoggy={isFoggy}
            lightning={lightningEnabled}
            isImmersionMode={isImmersionMode && !isAccountMode}
            isMobile={viewport.isMobile}
            bgImage={resolvedBgImage}
            bgImageBottom={resolvedBottomBgImage}
            bgImageBottomScale={resolvedBottomBgScale}
            terrain={effectiveTerrain}
            zone={effectiveZone}
            isNight={isNight}
            gameTime={currentGameTime}
            isSleeping={!isAccountMode && !isViewingSpectateTarget && playerPosition === 'sleeping'}
        />
    );
};
