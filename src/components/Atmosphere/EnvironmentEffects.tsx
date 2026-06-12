import React from 'react';
import { LightingType, WeatherType } from '../../types';
import Rain from './Rain';
import { Embers } from './Embers';
import { useInputStore } from '../../stores/useInputStore';
import { EnvironmentGlow } from './EnvironmentGlow';

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

const getLightingTint = (lighting: LightingType): string => {
    return 'rgba(0, 0, 0, 0)'; // Tints disabled per user request
};

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
    const input = useInputStore(s => s.input);

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
                {prevImage && (
                    <div 
                        className="background-layer" 
                        style={{ 
                            backgroundImage: `url(${prevImage})`,
                            opacity: triggerFade ? 0 : 1,
                            transition: 'opacity 300ms ease-in-out',
                        }} 
                    >
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: getLightingTint(lighting),
                            mixBlendMode: 'multiply',
                            pointerEvents: 'none',
                            transition: 'background-color 0.8s ease-in-out',
                        }} />
                    </div>
                )}
                {currentImage && (
                    <div 
                        className="background-layer" 
                        style={{ 
                            backgroundImage: `url(${currentImage})`,
                            opacity: prevImage ? (triggerFade ? 1 : 0) : 1,
                            transition: prevImage ? 'opacity 300ms ease-in-out' : 'none',
                        }} 
                    >
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: getLightingTint(lighting),
                            mixBlendMode: 'multiply',
                            pointerEvents: 'none',
                            transition: 'background-color 0.8s ease-in-out',
                        }} />
                    </div>
                )}
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
                        />
                        {lightning && <div className="lightning-glow-drop" />}
                        {(weather === 'rain' || weather === 'heavy-rain') && <Rain heavy={weather === 'heavy-rain'} />}
                        {weather === 'snow' && <div className="weather-layer weather-snow" />}

                    </>
                )}
                {isImmersionMode && <div className={`fog-layer ${isFoggy ? 'fog-active' : ''}`} />}
            </div>
        </div>
    );
};
