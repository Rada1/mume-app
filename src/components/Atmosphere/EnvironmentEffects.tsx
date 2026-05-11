import React, { useRef, useEffect } from 'react';
import { LightingType, WeatherType } from '../../types';
import Rain from './Rain';
import { Embers } from './Embers';
import { useAtmosphereStore } from '../../stores/useAtmosphereStore';
import { chromaKeyBottomBackground } from '../../utils/imageUtils';

interface EnvironmentEffectsProps {
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
}

export const EnvironmentEffects: React.FC<EnvironmentEffectsProps> = ({
    lighting,
    weather,
    isFoggy,
    lightning,
    lightningX = 50,
    isImmersionMode,
    isMobile,
    bgImage,
    bgImageBottom,
    bgImageBottomScale = 1,
    terrain
}) => {
    // --- Command pulse: flash the active light source on each command ---
    const sunRef = useRef<HTMLDivElement>(null);
    const moonRef = useRef<HTMLDivElement>(null);
    const artificialRef = useRef<HTMLDivElement>(null);
    const darkRef = useRef<HTMLDivElement>(null);
    const pulseRafRef = useRef<number | null>(null);
    const lastPulseStartRef = useRef<number>(0);
    const lightingRef = useRef(lighting);
    useEffect(() => {
        lightingRef.current = lighting;
        // Clear any in-flight pulse when lighting changes so it doesn't bleed into the crossfade
        [sunRef, moonRef, artificialRef, darkRef].forEach(r => r.current?.classList.remove('command-pulse'));
    }, [lighting]);

    // How long after a pulse starts to suppress restarts (keeps the light steady during rapid commands)
    const PULSE_BRIGHT_WINDOW_MS = 1600;

    const commandPulseKey = useAtmosphereStore((s) => s.commandPulseKey);
    useEffect(() => {
        if (commandPulseKey === 0) return;
        const refMap: Partial<Record<LightingType, React.RefObject<HTMLDivElement>>> = {
            sun: sunRef, moon: moonRef, artificial: artificialRef, dark: darkRef,
        };
        const el = refMap[lightingRef.current]?.current;
        if (!el) return;
        const now = Date.now();
        // If we're still in the bright phase, don't restart — just let it play through
        if (now - lastPulseStartRef.current < PULSE_BRIGHT_WINDOW_MS) return;
        lastPulseStartRef.current = now;
        if (pulseRafRef.current !== null) cancelAnimationFrame(pulseRafRef.current);
        el.classList.remove('command-pulse');
        pulseRafRef.current = requestAnimationFrame(() => {
            el.classList.add('command-pulse');
            pulseRafRef.current = null;
        });
    }, [commandPulseKey]);

    // --- Background Cross-fade Logic ---
    const [layerA, setLayerA] = React.useState<string | null>(bgImage || null);
    const [layerB, setLayerB] = React.useState<string | null>(null);
    const [activeLayer, setActiveLayer] = React.useState<'A' | 'B'>('A');

    React.useEffect(() => {
        if (activeLayer === 'A') {
            if (bgImage !== layerA) {
                setLayerB(bgImage || null);
                setActiveLayer('B');
            }
        } else {
            if (bgImage !== layerB) {
                setLayerA(bgImage || null);
                setActiveLayer('A');
            }
        }
    }, [bgImage, activeLayer, layerA, layerB]);

    // --- Bottom Background Processing ---
    const [processedBottomImage, setProcessedBottomImage] = React.useState<string | null>(null);
    React.useEffect(() => {
        let cancelled = false;

        if (!bgImageBottom) {
            setProcessedBottomImage(null);
            return () => {
                cancelled = true;
            };
        }

        chromaKeyBottomBackground(bgImageBottom).then(result => {
            if (!cancelled) setProcessedBottomImage(result);
        });

        return () => {
            cancelled = true;
        };
    }, [bgImageBottom]);

    return (
        <div style={{ '--lightning-x': `${lightningX}%` } as React.CSSProperties}>
            {/* --- BACK LAYER: Ambient & Lighting [z-index: 1] --- */}
            <div className={`environment-root back lighting-state-${isImmersionMode ? lighting : 'none'} terrain-${(terrain || 'default').toLowerCase().replace(/\s+/g, '-')}`}>
                {isImmersionMode && (
                    <>
                        {/* Layer A */}
                        <div
                            className={`log-background-mask top ${activeLayer === 'A' ? 'visible' : 'hidden'}`}
                            style={{ '--bg-image': layerA ? `url(${layerA})` : 'none' } as React.CSSProperties}
                        />
                        {/* Layer B */}
                        <div
                            className={`log-background-mask top ${activeLayer === 'B' ? 'visible' : 'hidden'}`}
                            style={{ '--bg-image': layerB ? `url(${layerB})` : 'none' } as React.CSSProperties}
                        />
                        <div
                            className="log-background-mask bottom"
                            style={{
                                '--bg-image': processedBottomImage ? `url(${processedBottomImage})` : 'none',
                                '--bottom-bg-scale': bgImageBottomScale
                            } as React.CSSProperties}
                        />
                    </>
                )}
                {isImmersionMode && (
                    <>
                        <div ref={sunRef} className="lighting-container lighting-sun" style={{ opacity: lighting === 'sun' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div ref={moonRef} className="lighting-container lighting-moon" style={{ opacity: lighting === 'moon' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div ref={artificialRef} className="lighting-container lighting-artificial" style={{ opacity: lighting === 'artificial' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div ref={darkRef} className="lighting-container lighting-dark" style={{ opacity: lighting === 'dark' ? 1 : 0 }}><div className="lighting-inner" /></div>

                        <div className="dust-layer" />
                        <div className="overlay-layer" />
                        <div className="terrain-tint-layer" />
                        <div className={`storm-overlay-layer ${weather === 'heavy-rain' ? 'active' : ''}`} />
                        <div className="screen-vignette" />


                    </>
                )}
            </div>

            {/* --- FRONT LAYER: Atmospheric & Interactive [z-index: 4500+] --- */}
            <div className={`environment-root front`}>
                {isImmersionMode && (
                    <>
                        <div
                            className={`weather-layer weather-cloud ${(weather === 'rain' || weather === 'heavy-rain') ? 'storm-clouds' : ''} ${lightning ? 'lightning-active' : ''}`}
                            style={{ opacity: (weather === 'cloud' || weather === 'rain' || weather === 'heavy-rain') ? 1 : 0 }}
                        />
                        {lightning && <div className="lightning-glow-drop" />}
                        {(weather === 'rain' || weather === 'heavy-rain') && <Rain heavy={weather === 'heavy-rain'} />}
                        {weather === 'snow' && <div className="weather-layer weather-snow" />}
                        {!isMobile && <Embers count={lighting === 'artificial' ? 60 : 30} />}
                    </>
                )}
                {/* Fog renders regardless of immersion mode — it's a gameplay-relevant state */}
                <div className={`fog-layer ${isFoggy ? 'fog-active' : ''}`} />

                {/* Full-screen lightning disabled in favor of cloud-only lightning */}
                {/* <div className={`lightning-layer ${lightning ? 'lightning-active' : ''}`} /> */}

            </div>
        </div>
    );

};
