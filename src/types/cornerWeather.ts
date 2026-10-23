/** @file cornerWeather.ts — Inputs for the corner weather surfaces. */
import type { WeatherType } from './game';

// --- Weather display inputs ---
export interface CornerWeatherProps {
    weather: WeatherType;
    isFoggy: boolean;
    lightning: boolean;
    isPerformanceMode: boolean;
    cloudEntryProgress?: number;
}
