/**
 * @file EnvironmentVignetteLayers.tsx
 * @description Cross-fades vignette shapes when lighting or indoor state changes.
 */

// --- Logic Section ---
import React from 'react';
import type { EnvironmentSceneLayer, LightingType, WeatherType, MumeTime } from '../../types';
import { getVignetteWeatherVariant } from '../../utils/environmentWeatherAppearance';
import { SunDisc } from './SunDisc';
import './EnvironmentVignetteLayers.css';

type EnvironmentVignetteLayersProps = {
    lighting: LightingType;
    previousLighting: LightingType | null;
    previousIsIndoor: boolean;
    previousIsNight: boolean;
    isIndoor: boolean;
    isNight: boolean;
    isFading: boolean;
    progress: number;
    isEnabled: boolean;
    showVignette?: boolean;
    showSky?: boolean;
    gameTime?: MumeTime;
    weather?: WeatherType;
    previousWeather?: WeatherType | null;
    scenes?: EnvironmentSceneLayer[];
};

type VignetteLayer = {
    showSky: boolean;
    lighting: LightingType;
    weather: WeatherType;
    isIndoor: boolean;
    isNight: boolean;
    opacity: number;
    key: string;
};

// --- Vignette Rendering ---
const vignetteKey = (lighting: LightingType, isIndoor: boolean, isNight: boolean, weather: WeatherType): string =>
    `${lighting}:${lighting === 'dark' && isIndoor}:${lighting === 'artificial' && !isIndoor && isNight}:${getVignetteWeatherVariant(lighting, weather)}`;

export const EnvironmentVignetteLayers: React.FC<EnvironmentVignetteLayersProps> = ({
    lighting,
    previousLighting,
    previousIsIndoor,
    previousIsNight,
    isIndoor,
    isNight,
    progress,
    isEnabled,
    showVignette = true,
    showSky = true,
    gameTime,
    weather = 'clear',
    previousWeather = null,
    scenes,
}) => {
    if (!isEnabled) return null;

    const fallbackLayers: VignetteLayer[] = !previousLighting
        ? [{ lighting, weather, isIndoor, isNight, showSky, opacity: 1, key: vignetteKey(lighting, isIndoor, isNight, weather) }]
        : [
            {
                lighting: previousLighting,
                showSky,
                weather: previousWeather ?? weather,
                isIndoor: previousIsIndoor,
                isNight: previousIsNight,
                opacity: 1 - progress,
                key: vignetteKey(previousLighting, previousIsIndoor, previousIsNight, previousWeather ?? weather),
            },
            { lighting, weather, isIndoor, isNight, showSky, opacity: progress, key: vignetteKey(lighting, isIndoor, isNight, weather) },
        ];

    const profiles = new Map<string, VignetteLayer>();
    for (const layer of scenes ?? []) {
        const { lighting, weather, isIndoor, isNight } = layer.scene;
        const showSky = !layer.scene.blocksSky;
        const key = `${vignetteKey(lighting, isIndoor, isNight, weather)}:${showSky}`;
        const profile = profiles.get(key);
        if (profile) profile.opacity += layer.opacity;
        else profiles.set(key, { lighting, weather, isIndoor, isNight, showSky, key, opacity: layer.opacity });
    }
    const layers = scenes ? [...profiles.values()] : fallbackLayers;

    return <div className="environment-vignette-layers" aria-hidden="true">
        {layers.map(layer => (
            <div
                className={`environment-vignette-transition-layer environment-vignette-scene lighting-state-${layer.lighting} weather-state-${getVignetteWeatherVariant(layer.lighting, layer.weather)} vignette-state-${layer.lighting}${previousLighting ? ' is-transitioning' : ''}${layer.isIndoor || !layer.showSky ? ' is-indoor' : ''}${layer.showSky && layer.lighting === 'artificial' && !layer.isIndoor && layer.isNight ? ' has-night-sky' : ''}`}
                key={layer.key}
                style={{ opacity: layer.opacity }}
                aria-hidden="true"
            >
                {showVignette && <div className="client-vignette-overlay" />}
                {(layer.showSky || !['sun', 'moon'].includes(layer.lighting)) && <div className="client-corner-light-overlay" />}
                {/* Keep the sun inside the room fade, outside the sky mask that vanishes at the horizon. */}
                {layer.showSky && layer.lighting === 'sun' && <SunDisc time={gameTime} />}
            </div>
        ))}
    </div>;
};
