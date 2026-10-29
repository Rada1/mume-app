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
    const isPerformanceMode = useSettingsStore(s => s.isPerformanceMode);
    const isImmersionWeatherEffectsEnabled = useSettingsStore(s => s.isImmersionWeatherEffectsEnabled);
    const isTerrainGlowEnabled = useSettingsStore(s => s.isImmersionTerrainGlowEnabled);
    const isZoneAuraEnabled = useSettingsStore(s => s.isImmersionZoneAuraEnabled);
    const isEmbersEnabled = useSettingsStore(s => s.isImmersionEmbersEnabled);
    const immersionEmberCount = useSettingsStore(s => s.immersionEmberCount);
    const zoneAuraColorStrength = useSettingsStore(s => s.immersionZoneAuraColorStrength);
    const zoneAuraDarkness = useSettingsStore(s => s.immersionZoneAuraDarkness);
    const showImmersionBackgroundImage = useSettingsStore(s => s.showImmersionBackgroundImage);
    const useImmersionBackgroundSidePanel = useSettingsStore(s => s.useImmersionBackgroundSidePanel);
    const zoneBackgroundPosition = useSettingsStore(s => s.zoneBackgroundPositions[normalizeZoneBackgroundKey(zone)]);
    const backgroundBrightness = useSettingsStore(s => s.mapBackgroundVisuals.brightness);
    const backgroundBlur = useSettingsStore(s => s.mapBackgroundVisuals.blur);
    const backgroundZoom = useSettingsStore(s => s.mapBackgroundVisuals.zoom);
    const isIndoorTerrain = Boolean(terrain) && !isOutdoorTerrain(terrain);
    const backgroundPanStyle = {
        '--background-pan-x': `${zoneBackgroundPosition?.x ?? 0}vw`,
        '--background-pan-y': `${zoneBackgroundPosition?.y ?? 0}vh`,
        '--immersion-background-brightness': backgroundBrightness,
        '--immersion-background-blur': `${backgroundBlur}px`,
        '--immersion-background-size': `${800 * backgroundZoom}%`
    } as React.CSSProperties;
    const showWeatherAndCornerLighting = isImmersionMode && isImmersionWeatherEffectsEnabled;
    const showTerrainGlow = isImmersionMode && isTerrainGlowEnabled;
    const showZoneAura = isImmersionMode && isZoneAuraEnabled;
    const showEmbers = isImmersionMode && isEmbersEnabled;
    const showStars = showWeatherAndCornerLighting && !noLight && isOutdoorTerrain(terrain) && (
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
    const currentZoneGlow = getZoneAmbientGlow(zone, zoneAuraColorStrength);
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
    const showFullImmersionBackground = isImmersionMode && showImmersionBackgroundImage && (isMobile || !useImmersionBackgroundSidePanel);

    return (
        <div style={{ '--lightning-x': `${lightningX}%` } as React.CSSProperties}>
            {/* --- BACK LAYER: Ambient & Lighting [z-index: 1] --- */}
            <div className={`environment-root back lighting-state-${lighting || 'none'} terrain-${(terrain || 'default').toLowerCase().replace(/\s+/g, '-')} ${isSleeping ? 'is-sleeping' : ''} ${isWater ? 'water-motion-active' : ''} ${isForest ? 'forest-motion-active' : ''}`}>
                {showFullImmersionBackground && prevImage && (
                    <div
                        className="background-layer"
                        style={{
                            ...backgroundPanStyle,
                            backgroundImage: `url(${prevImage})`,
                            opacity: triggerFade ? 0 : backgroundMapOpacity,
                            transition: `opacity ${BACKGROUND_BLEND_MS}ms ease-in-out, left 0.4s ease, top 0.4s ease`,
                        }}
                    />
                )}
                {showFullImmersionBackground && currentImage && (
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
                    />
                )}
                {isImmersionMode && <div className="client-sleep-overlay" />}
                {showTerrainGlow && (
                    <EnvironmentGlow terrain={terrain || undefined} zone={zone} lighting={lighting} />
                )}
                {showZoneAura && (
                    <>
                        {auraState.prevGlow && (
                            <div
                                className="client-terrain-ambient-aura"
                                aria-hidden="true"
                                style={{
                                    '--terrain-glow-color': auraState.prevGlow,
                                    '--zone-aura-darkness': zoneAuraDarkness,
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
                                '--zone-aura-darkness': zoneAuraDarkness,
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
            {showEmbers && !isPerformanceMode && (
                <div className={`embers-client-layer${lighting === 'dark' || (lighting === 'artificial' && showStars) ? ' avoids-top-right-vignette' : ''}`}>
                    <Embers count={immersionEmberCount} zone={zone} />
                </div>
            )}

            {/* --- FRONT LAYER: Atmospheric & Interactive [z-index: 4500+] --- */}
            <div className={`environment-root front lighting-state-${lighting || 'none'} ${isIndoorTerrain ? 'is-indoor' : ''} ${showStars ? 'has-night-sky' : ''}`}>
                {showWeatherAndCornerLighting && <div className="client-star-veil" style={{ opacity: starsOpacity, transition: 'none' }} aria-hidden="true" />}
                <EnvironmentWeatherLayers
                    transition={weatherTransition}
                    isFoggy={isFoggy}
                    lightning={lightning}
                    isEnabled={showWeatherAndCornerLighting}
                    isPerformanceMode={isPerformanceMode}
                />
                <EnvironmentTwilight time={gameTime} isOutdoor={isOutdoorTerrain(terrain)} isEnabled={showWeatherAndCornerLighting && !noLight} />
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
                    isEnabled={showWeatherAndCornerLighting}
                    showVignette={!isMobile}
                />
                {showWeatherAndCornerLighting && !noLight && !isPerformanceMode && lighting === 'sun' && isOutdoorTerrain(terrain) && (
                    <div className="client-sunlight-birds" aria-hidden="true"><span /><span /><span /></div>
                )}
            </div>
        </div>
    );
};
