import React from 'react';
import { LightingType, WeatherType } from '../../types';
import Rain from './Rain';

interface EnvironmentEffectsProps {
    lighting: LightingType;
    weather: WeatherType;
    isFoggy: boolean;
    lightning: boolean;
    isImmersionMode: boolean;
}

export const EnvironmentEffects: React.FC<EnvironmentEffectsProps> = ({
    lighting,
    weather,
    isFoggy,
    lightning,
    isImmersionMode
}) => {
    return (
        <>
            {/* --- BACK LAYER: Ambient & Lighting [z-index: 1] --- */}
            <div className={`environment-root back lighting-state-${isImmersionMode ? lighting : 'none'}`}>
                {isImmersionMode && (
                    <>
                        <div className="lighting-container lighting-sun" style={{ opacity: lighting === 'sun' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div className="lighting-container lighting-moon" style={{ opacity: lighting === 'moon' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div className="lighting-container lighting-artificial" style={{ opacity: lighting === 'artificial' ? 1 : 0 }}><div className="lighting-inner" /></div>
                        <div className="lighting-container lighting-dark" style={{ opacity: lighting === 'dark' ? 1 : 0 }}><div className="lighting-inner" /></div>

                        <div className="dust-layer" />
                        <div className="overlay-layer" />
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
                            className={`weather-layer weather-cloud ${(weather === 'rain' || weather === 'heavy-rain') ? 'storm-clouds' : ''}`}
                            style={{ opacity: (weather === 'cloud' || weather === 'rain' || weather === 'heavy-rain') ? 1 : 0 }}
                        />
                        {(weather === 'rain' || weather === 'heavy-rain') && <Rain heavy={weather === 'heavy-rain'} />}
                    </>
                )}
                {/* Fog renders regardless of immersion mode — it's a gameplay-relevant state */}
                <div className={`fog-layer ${isFoggy ? 'fog-active' : ''}`} />

                <div className={`lightning-layer ${lightning ? 'lightning-active' : ''}`} />

            </div>
        </>
    );

};
