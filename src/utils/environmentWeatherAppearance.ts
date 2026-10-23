/** @file environmentWeatherAppearance.ts -- Weather-dependent corner-light profiles. */
import type { LightingType, WeatherType } from '../types';

// --- Stable Visual Variants ---
export const getVignetteWeatherVariant = (lighting: LightingType, weather: WeatherType): string => {
    const rainy = weather === 'rain' || weather === 'heavy-rain';
    if ((lighting === 'sun' || lighting === 'moon') && rainy) return 'rain';
    if (lighting === 'sun' && (weather === 'cloud' || weather === 'snow')) return 'cloud';
    return 'clear';
};

export const hasWeatherClouds = (weather: WeatherType): boolean =>
    ['cloud', 'rain', 'heavy-rain', 'snow'].includes(weather);
