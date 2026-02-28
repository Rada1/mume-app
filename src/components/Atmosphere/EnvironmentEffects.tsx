import React from 'react';
import { LightingType, WeatherType, DeathStage } from '../../types';
import { DEATH_IMG } from '../../constants';
import Rain from '../Rain';

interface EnvironmentEffectsProps {
    lighting: LightingType;
    weather: WeatherType;
    isFoggy: boolean;
    inCombat: boolean;
    hitFlash: boolean;
    lightning: boolean;
    deathStage: DeathStage;
}

export const EnvironmentEffects: React.FC<EnvironmentEffectsProps> = ({
    lighting,
    weather,
    isFoggy,
    inCombat,
    hitFlash,
    lightning,
    deathStage
}) => {
    return (
        <div className={`environment-root lighting-state-${lighting}`}>
            {/* --- LAYER 1: BOTTOM (Atmospheric Effects) [z-index: 5] --- */}
            <div className="lighting-container lighting-sun" style={{ opacity: lighting === 'sun' ? 1 : 0 }}><div className="lighting-inner" /></div>
            <div className="lighting-container lighting-moon" style={{ opacity: lighting === 'moon' ? 1 : 0 }}><div className="lighting-inner" /></div>
            <div className="lighting-container lighting-artificial" style={{ opacity: lighting === 'artificial' ? 1 : 0 }}><div className="lighting-inner" /></div>
            <div className="lighting-container lighting-dark" style={{ opacity: lighting === 'dark' ? 1 : 0 }}><div className="lighting-inner" /></div>

            {/* Weather & Fog */}
            <div className={`weather-layer weather-cloud`} style={{ opacity: weather === 'cloud' ? 1 : 0 }} />
            <div className={`fog-layer ${isFoggy ? 'fog-active' : ''}`} style={{ opacity: isFoggy ? 1 : 0 }} />
            {(weather === 'rain' || weather === 'heavy-rain') && <Rain heavy={weather === 'heavy-rain'} />}

            {/* --- LAYER 2: MIDDLE (Grounding Overlay) [z-index: 10] --- */}
            <div className="overlay-layer" />
            <div className="screen-vignette" />

            {/* --- LAYER 3: TOP (Alerts & Combat) [z-index: 20+] --- */}
            <div className={`combat-grayscale-filter ${inCombat ? 'active' : ''}`} />
            <div className={`combat-vignette ${inCombat ? 'active' : ''}`} />
            <div className={`combat-layer-flash ${hitFlash ? 'active' : ''}`} />
            <div className={`lightning-layer ${lightning ? 'lightning-active' : ''}`} />

            {/* Death Overlay (Highest) */}
            <div className={`death-overlay ${deathStage !== 'none' ? 'death-active' : ''}`}
                style={{ opacity: deathStage === 'fade_in' ? 0 : (deathStage === 'black_hold' ? 1 : undefined) }} />
            <div className={`death-image-layer ${deathStage === 'flash' ? 'death-flash' : ''}`}
                style={{ backgroundImage: `url(${DEATH_IMG})`, opacity: deathStage === 'flash' ? 1 : 0 }} />
        </div>
    );
};
