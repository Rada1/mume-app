/** @file EnvironmentWeatherLayers.tsx -- Retained weather scenes on the shared one-second sky clock. */
import React from 'react';
import type { WeatherTransitionState } from '../../types';
import Rain from './Rain';
import { CornerWeather } from './CornerWeather';

// --- Weather Rendering ---
export const EnvironmentWeatherLayers = ({
    transition, isFoggy, lightning, isEnabled, isPerformanceMode,
}: {
    transition: WeatherTransitionState; isFoggy: boolean; lightning: boolean;
    isEnabled: boolean; isPerformanceMode: boolean;
}) => {
    if (!isEnabled) return null;
    const { current, previous, currentLighting, previousLighting, currentIsIndoor, previousIsIndoor, progress } = transition;
    const currentKey = `${current}:${currentLighting}:${currentIsIndoor}`;
    const fallbackLayers = [{ weather: current, lighting: currentLighting, indoor: currentIsIndoor,
        opacity: previous === null ? 1 : progress,
        entry: previous !== null && (previous !== current || previousIsIndoor) ? progress : 1, key: currentKey }];
    if (previous !== null && previousLighting !== null) fallbackLayers.unshift({
        weather: previous, lighting: previousLighting, indoor: previousIsIndoor,
        opacity: 1 - progress, entry: 1, key: `${previous}:${previousLighting}:${previousIsIndoor}`,
    });
    const layers = transition.scenes ? transition.scenes.map(layer => ({
        weather: layer.scene.weather, lighting: layer.scene.lighting, indoor: layer.scene.isIndoor,
        opacity: layer.opacity, entry: layer.cloudEntryProgress,
        key: `${layer.scene.weather}:${layer.scene.lighting}:${layer.scene.isIndoor}:${Boolean(layer.scene.blocksSky)}`,
    })) : fallbackLayers;
    return <div className="environment-weather-layers" aria-hidden="true">
        {layers.map(layer => <div
            className={`environment-weather-transition-layer environment-weather-scene lighting-state-${layer.lighting}`}
            key={layer.key} style={{ opacity: layer.opacity }}>
            {!layer.indoor && <>
                <CornerWeather weather={layer.weather} isFoggy={isFoggy} lightning={lightning}
                    isPerformanceMode={isPerformanceMode} cloudEntryProgress={layer.entry} />
                {(layer.weather === 'rain' || layer.weather === 'heavy-rain') && <Rain heavy={layer.weather === 'heavy-rain'} />}
            </>}
        </div>)}
    </div>;
};
