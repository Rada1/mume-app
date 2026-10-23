/**
 * @file EnvironmentEffects.tsx
 * @description Renders weather and atmospheric layers for the active view.
 */

// --- Logic Section ---
import React from 'react';
import { LightingType, WeatherType, MumeTime } from '../../types';
import { EnvironmentWeatherLayers } from './EnvironmentWeatherLayers';
import { EnvironmentVignetteLayers } from './EnvironmentVignetteLayers';
import { Embers } from './Embers';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useInputStore } from '../../stores/useInputStore';
import { EnvironmentGlow } from './EnvironmentGlow';
import { getZoneAmbientGlow } from '../../utils/zoneColors';
import { isOutdoorTerrain } from '../../utils/terrainUtils';
import { useDeathBackgroundFade } from '../../hooks/useDeathBackgroundFade';
import { useEnvironmentTransitions } from '../../hooks/useEnvironmentTransitions';
import { normalizeZoneBackgroundKey } from '../../utils/zoneBackgroundPosition';
import './Stars.css';
import './SunlightClouds.css';
import './Moonlight.css';
import './SunlightBirds.css';
import './ArtificialNightSky.css';
import './EnvironmentTransitions.css';
import { EnvironmentTwilight } from './EnvironmentTwilight';

const BACKGROUND_MAP_OPACITY = 0.18;
const BACKGROUND_MAP_OPACITY_NO_IMMERSION = BACKGROUND_MAP_OPACITY * 0.35;
const BACKGROUND_BLEND_MS = 5000;
const ZONE_COLOR_TRANSITION_MS = 7000;
const getLightingTint = (lighting: LightingType): string => {
    switch (lighting) {
        case 'sun': return 'rgba(255, 245, 210, 0.08)';
        case 'moon': return 'rgba(28, 48, 115, 0.48)';
        case 'artificial': return 'rgba(180, 30, 20, 0.15)';
        case 'dark': return 'rgba(0, 0, 15, 0.6)';
        default: return 'rgba(0, 0, 0, 0)';
    }
};
interface EnvironmentEffectsProps {
    noLight?: boolean;
    lighting: LightingType;
    weather: WeatherType;
    isFoggy: boolean;
    lightning: boolean;
    lightningX?: number;
    isImmersionMode: boolean;
    isMobile: boolean;
    bgImage?: string | null;
    bgImageBottom?: string | null;
    bgImageBottomScale?: number;
    terrain?: string | null;
    zone?: string | null;
    isSleeping?: boolean;
    isNight?: boolean;
    gameTime?: MumeTime;
}
export const EnvironmentEffects: React.FC<EnvironmentEffectsProps> = ({
    noLight = false,
    lighting,
    weather,
    isFoggy,
    lightning,
    lightningX = 50,
    isImmersionMode,
    isMobile,
    bgImage,
    terrain,
    zone,
    isSleeping = false,
    isNight = false, gameTime,
}) => {
    const input = useInputStore(s => s.input);
    const isPerformanceMode = useSettingsStore(s => s.isPerformanceMode);
    const isImmersionWeatherEffectsEnabled = useSettingsStore(s => s.isImmersionWeatherEffectsEnabled);
    const zoneBackgroundPosition = useSettingsStore(s => s.zoneBackgroundPositions[normalizeZoneBackgroundKey(zone)]);
    const isIndoorTerrain = Boolean(terrain) && !isOutdoorTerrain(terrain);
    const backgroundPanStyle = {
        '--background-pan-x': `${zoneBackgroundPosition?.x ?? 0}vw`,
        '--background-pan-y': `${zoneBackgroundPosition?.y ?? 0}vh`
    } as React.CSSProperties;
    const showImmersionWeatherEffects = isImmersionMode && isImmersionWeatherEffectsEnabled;
    const showStars = !noLight && isImmersionMode && isOutdoorTerrain(terrain) && (
        lighting === 'moon' || lighting === 'dark' || (lighting === 'artificial' && isNight)
    );
    const { lightingTransition, weatherTransition, starsOpacity } = useEnvironmentTransitions({
        blocksSky: noLight,
        lighting, gameTime,
        weather,
        isOutdoor: isOutdoorTerrain(terrain),
        isIndoor: isIndoorTerrain,
        isNight,
        isVignetteReady: Boolean(terrain) && terrain !== 'account-blue' && lighting !== 'none' && lighting !== 'normal',
    });
    const deathFadePhase = useDeathBackgroundFade();

    const [prevPropBg, setPrevPropBg] = React.useState<string | null>(bgImage || null);
    const [prevImage, setPrevImage] = React.useState<string | null>(null);
    const [currentImage, setCurrentImage] = React.useState<string | null>(bgImage || null);
    const [triggerFade, setTriggerFade] = React.useState(false);

    // Sync state during render to eliminate transition lag
    if (bgImage !== prevPropBg) {
        setPrevPropBg(bgImage || null);
        setPrevImage(currentImage);
        setCurrentImage(bgImage || null);
        setTriggerFade(false);
    }

    React.useEffect(() => {
        if (!triggerFade && currentImage) {
            const frame = requestAnimationFrame(() => {
                setTriggerFade(true);
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [currentImage, triggerFade]);

    // Smooth cross-fade when moving between zone palettes.
    const currentZoneGlow = getZoneAmbientGlow(zone);
    const [auraState, setAuraState] = React.useState({
        currentGlow: currentZoneGlow,
        prevGlow: null as string | null,
        triggerFade: false
    });

    React.useEffect(() => {
        setAuraState(prev => {
            if (prev.currentGlow === currentZoneGlow) return prev;
            return {
                prevGlow: prev.currentGlow,
                currentGlow: currentZoneGlow,
                triggerFade: false
            };
        });
    }, [currentZoneGlow]);

    React.useEffect(() => {
        if (auraState.prevGlow && !auraState.triggerFade) {
            const frame = requestAnimationFrame(() => {
                setAuraState(prev => ({ ...prev, triggerFade: true }));
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [auraState.prevGlow, auraState.triggerFade]);

    React.useEffect(() => {
        if (auraState.triggerFade) {
            const timer = setTimeout(() => {
                setAuraState(prev => ({ ...prev, prevGlow: null, triggerFade: false }));
            }, ZONE_COLOR_TRANSITION_MS);
            return () => clearTimeout(timer);
        }
    }, [auraState.triggerFade]);

    const isWater = React.useMemo(() => {
        if (!bgImage) return false;
        const lowerBg = bgImage.toLowerCase();
        return lowerBg.includes('water.png') ||
               lowerBg.includes('shallows.png') ||
               lowerBg.includes('rapids.png') ||
               lowerBg.includes('underwater.webp');
    }, [bgImage]);

    const isForest = React.useMemo(() => {
        if (!bgImage) return false;
        return bgImage.toLowerCase().includes('forest.png');
    }, [bgImage]);

    const backgroundMapOpacity = isImmersionMode ? BACKGROUND_MAP_OPACITY : BACKGROUND_MAP_OPACITY_NO_IMMERSION;

    return (
        <div style={{ '--lightning-x': `${lightningX}%` } as React.CSSProperties}>
            {/* --- BACK LAYER: Ambient & Lighting [z-index: 1] --- */}
            <div className={`environment-root back lighting-state-${lighting || 'none'} terrain-${(terrain || 'default').toLowerCase().replace(/\s+/g, '-')} ${isSleeping ? 'is-sleeping' : ''} ${isWater ? 'water-motion-active' : ''} ${isForest ? 'forest-motion-active' : ''}`}>
                {isImmersionMode && !isMobile && prevImage && (
                    <div
                        className="background-layer"
                        style={{
                            ...backgroundPanStyle,
                            backgroundImage: `url(${prevImage})`,
                            opacity: triggerFade ? 0 : backgroundMapOpacity,
                            transition: `opacity ${BACKGROUND_BLEND_MS}ms ease-in-out, left 0.4s ease, top 0.4s ease`,
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: getLightingTint(lighting),
                            mixBlendMode: 'multiply',
                            pointerEvents: 'none',
                            transition: 'background-color 7s cubic-bezier(0.25, 0.1, 0.25, 1)',
                        }} />
                    </div>
                )}
                {isImmersionMode && !isMobile && currentImage && (
                    <div
                        className="background-layer"
                        style={{
                            ...backgroundPanStyle,
                            backgroundImage: `url(${currentImage})`,
                            opacity: prevImage ? (triggerFade ? backgroundMapOpacity : 0) : backgroundMapOpacity,
                            transition: prevImage
                                ? `opacity ${BACKGROUND_BLEND_MS}ms ease-in-out, left 0.4s ease, top 0.4s ease`
                                : 'left 0.4s ease, top 0.4s ease',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: getLightingTint(lighting),
                            mixBlendMode: 'multiply',
                            pointerEvents: 'none',
                            transition: 'background-color 7s cubic-bezier(0.25, 0.1, 0.25, 1)',
                        }} />
                    </div>
                )}
                {isImmersionMode && (
                    <>
                        {!noLight && <div className="client-lighting-overlay client-sun-overlay" />}
                        {!noLight && <div className="client-lighting-overlay client-moon-overlay" />}
                        <div className="client-lighting-overlay client-artificial-overlay" />
                        <div className="client-sleep-overlay" />
                    </>
                )}
                {isImmersionMode && (
                    <EnvironmentGlow terrain={terrain || undefined} zone={zone} lighting={lighting} input={input} />
                )}
                {isImmersionMode && (
                    <>
                        {auraState.prevGlow && (
                            <div
                                className="client-terrain-ambient-aura"
                                aria-hidden="true"
                                style={{
                                    '--terrain-glow-color': auraState.prevGlow,
                                    opacity: auraState.triggerFade ? 0 : 1,
                                    transition: `opacity ${ZONE_COLOR_TRANSITION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
                                } as React.CSSProperties}
                            />
                        )}
                        <div
                            className="client-terrain-ambient-aura"
                            aria-hidden="true"
                            style={{
                                '--terrain-glow-color': auraState.currentGlow,
                                opacity: auraState.prevGlow ? (auraState.triggerFade ? 1 : 0) : 1,
                                transition: auraState.prevGlow ? `opacity ${ZONE_COLOR_TRANSITION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)` : 'none',
                            } as React.CSSProperties}
                        />
                    </>
                )}
                <div
                    className={`client-death-background ${deathFadePhase === 'flash' ? 'is-flashing' : deathFadePhase === 'black' ? 'is-black' : deathFadePhase === 'fading' ? 'is-fading' : ''}`}
                    aria-hidden="true"
                />
            </div>

            {/* --- EMBER LAYER: Full-client particles above the map/drawer surface --- */}
            {isImmersionMode && !isMobile && !isPerformanceMode && (
                <div className={`embers-client-layer${lighting === 'dark' || (lighting === 'artificial' && showStars) ? ' avoids-top-right-vignette' : ''}`}>
                    <Embers count={44} zone={zone} />
                </div>
            )}

            {/* --- FRONT LAYER: Atmospheric & Interactive [z-index: 4500+] --- */}
            <div className={`environment-root front lighting-state-${lighting || 'none'} ${isIndoorTerrain ? 'is-indoor' : ''} ${showStars ? 'has-night-sky' : ''}`}>
                {isImmersionMode && <div className="client-dark-overlay" aria-hidden="true" />}
                {isImmersionMode && <div className="client-star-veil" style={{ opacity: starsOpacity, transition: 'none' }} aria-hidden="true" />}
                <EnvironmentWeatherLayers
                    transition={weatherTransition}
                    isFoggy={isFoggy}
                    lightning={lightning}
                    isEnabled={showImmersionWeatherEffects}
                    isPerformanceMode={isPerformanceMode}
                />
                <EnvironmentTwilight time={gameTime} isOutdoor={isOutdoorTerrain(terrain)} isEnabled={isImmersionMode && !noLight} />
                <EnvironmentVignetteLayers
                    scenes={lightingTransition.scenes}
                    lighting={lighting}
                    previousLighting={lightingTransition.previousLighting}
                    previousIsIndoor={lightingTransition.previousIsIndoor}
                    previousIsNight={lightingTransition.previousIsNight}
                    previousWeather={lightingTransition.previousWeather} weather={weather}
                    isIndoor={isIndoorTerrain}
                    isNight={isNight}
                    isFading={lightingTransition.isFading}
                    progress={lightingTransition.progress} gameTime={gameTime}
                    isEnabled={isImmersionMode}
                    showVignette={!isMobile}
                />
                {isImmersionMode && !noLight && !isPerformanceMode && lighting === 'sun' && isOutdoorTerrain(terrain) && (
                    <div className="client-sunlight-birds" aria-hidden="true"><span /><span /><span /></div>
                )}
            </div>
        </div>
    );
};
