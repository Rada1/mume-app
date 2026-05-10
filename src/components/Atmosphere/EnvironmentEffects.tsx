import React from 'react';
import { LightingType, WeatherType } from '../../types';
import Rain from './Rain';
import { Embers } from './Embers';

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
    terrain
}) => {
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
                            style={{ '--bg-image': bgImageBottom ? `url(${bgImageBottom})` : 'none' } as React.CSSProperties}
                        />
                    </>
                )}
                {isImmersionMode && (
                    <>
                        <div className="lighting-container lighting-sun" style={{ opacity: lighting === 'sun' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div className="lighting-container lighting-moon" style={{ opacity: lighting === 'moon' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div className="lighting-container lighting-artificial" style={{ opacity: lighting === 'artificial' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div className="lighting-container lighting-dark" style={{ opacity: lighting === 'dark' ? 1 : 0 }}><div className="lighting-inner" /></div>

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
