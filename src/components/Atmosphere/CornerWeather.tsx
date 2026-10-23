/** @file CornerWeather.tsx — Veiled sky weather and low-lying corner fog. */
import React from 'react';
import type { CornerWeatherProps } from '../../types';
import './CornerWeather.css';

// --- Small, stable particle field ---
const PARTICLES = Array.from({ length: 32 }, (_, index) => ({
    '--particle-x': `${(index * 37 + 7) % 100}%`,
    '--particle-delay': `${-(index * 0.73)}s`,
    '--particle-duration': `${0.75 + (index % 7) * 0.08}s`,
    '--snow-duration': `${9 + (index % 7) * 1.3}s`,
    '--particle-size': `${1.5 + (index % 4) * 0.5}px`,
} as React.CSSProperties));

// --- Render confined atmospheric textures ---
export const CornerWeather: React.FC<CornerWeatherProps> = ({ weather, isFoggy, lightning, isPerformanceMode, cloudEntryProgress = 1 }) => (
    <>
        <div className={`corner-weather-sky weather-${weather}${lightning ? ' has-lightning' : ''}`} aria-hidden="true">
            <div className="corner-weather-cloud-motion" style={{ transform: `translateX(${(1 - cloudEntryProgress) * 45}%)` }}>
                {['cloud', 'rain', 'heavy-rain', 'snow'].includes(weather) && <div className="corner-weather-clouds" />}
                {['rain', 'heavy-rain'].includes(weather) && <div className="corner-weather-cloud-cover" />}
            </div>
            {weather === 'snow' && !isPerformanceMode && (
                <div className="corner-precipitation is-snow">
                    {PARTICLES.slice(0, isPerformanceMode ? 12 : 18).map((style, index) => <span key={index} style={style} />)}
                </div>
            )}
        </div>
        {isFoggy && <div className="corner-weather-fog" aria-hidden="true" />}
    </>
);
