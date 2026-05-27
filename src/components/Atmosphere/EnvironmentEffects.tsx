import React from 'react';
import { LightingType, WeatherType } from '../../types';
import Rain from './Rain';
import { Embers } from './Embers';
import { useGame } from '../../context/GameContext';
import { EnvironmentGlow } from './EnvironmentGlow';
import { CloudWave } from './CloudWave';

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
    terrain
}) => {
    const { input } = useGame();

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

    return (
        <div style={{ '--lightning-x': `${lightningX}%` } as React.CSSProperties}>
            {/* --- BACK LAYER: Ambient & Lighting [z-index: 1] --- */}
            <div className={`environment-root back lighting-state-none terrain-${(terrain || 'default').toLowerCase().replace(/\s+/g, '-')} ${isWater ? 'water-motion-active' : ''} ${isForest ? 'forest-motion-active' : ''}`}>
                <EnvironmentGlow terrain={terrain || undefined} lighting={lighting} input={input} />
                {isImmersionMode && (
                    <div className={`storm-overlay-layer ${weather === 'heavy-rain' ? 'active' : ''}`} />
                )}
            </div>

            {/* --- FRONT LAYER: Atmospheric & Interactive [z-index: 4500+] --- */}
            <div className={`environment-root front`}>
                {isImmersionMode && (
                    <>
                        <div
                            className={`weather-layer weather-cloud ${(weather === 'rain' || weather === 'heavy-rain') ? 'storm-clouds' : ''} ${lightning ? 'lightning-active' : ''}`}
                            style={{ opacity: (weather === 'cloud' || weather === 'rain' || weather === 'heavy-rain') ? 1 : 0 }}
                        >
                            <CloudWave storm={weather === 'rain' || weather === 'heavy-rain'} lightning={lightning} />
                        </div>
                        {lightning && <div className="lightning-glow-drop" />}
                        {!isMobile && (weather === 'rain' || weather === 'heavy-rain') && <Rain heavy={weather === 'heavy-rain'} />}
                        {weather === 'snow' && <div className="weather-layer weather-snow" />}
                        {!isMobile && <Embers count={lighting === 'artificial' ? 60 : 30} />}
                    </>
                )}
                {isImmersionMode && <div className={`fog-layer ${isFoggy ? 'fog-active' : ''}`} />}
            </div>
        </div>
    );
};
