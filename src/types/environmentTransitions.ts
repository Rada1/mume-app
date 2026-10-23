/**
 * @file environmentTransitions.ts
 * @description Types for coordinated lighting and weather transitions.
 */

// --- Transition Types ---
import type { LightingType, WeatherType, MumeTime } from './game';

export interface TwilightAppearance {
    phase: 'dawn' | 'dusk' | null;
    progress: number;
    color: string;
    opacity: number;
}

export interface EnvironmentTwilightProps {
    time?: MumeTime;
    isOutdoor: boolean;
    isEnabled: boolean;
}

export interface SunPosition {
    xPercent: number;
    yPercent: number;
    opacity: number;
}

export interface LightingTransitionState {
    scenes: EnvironmentSceneLayer[];
    progress: number;
    previousLighting: LightingType | null;
    previousIsIndoor: boolean;
    previousIsNight: boolean;
    previousWeather: WeatherType | null;
    isFading: boolean;
}

export interface WeatherTransitionState {
    scenes: EnvironmentSceneLayer[];
    current: WeatherType;
    previous: WeatherType | null;
    currentLighting: LightingType;
    previousLighting: LightingType | null;
    currentIsIndoor: boolean;
    previousIsIndoor: boolean;
    progress: number;
    isFading: boolean;
}

export interface EnvironmentTransitionOptions {
    blocksSky?: boolean;
    gameTime?: MumeTime;
    lighting: LightingType;
    weather: WeatherType;
    isOutdoor: boolean;
    isIndoor: boolean;
    isNight: boolean;
    isVignetteReady?: boolean;
}

export interface EnvironmentTransitionResult {
    starsOpacity: number;
    lightingTransition: LightingTransitionState;
    weatherTransition: WeatherTransitionState;
}

export interface EnvironmentSceneSnapshot extends EnvironmentTransitionOptions {
    nightLighting?: LightingType;
    isVignetteReady: boolean;
}

export interface EnvironmentSceneTransition {
    key: string;
    previous: EnvironmentSceneSnapshot | null;
    progress: number;
    layers: EnvironmentSceneLayer[];
}

export interface EnvironmentSceneLayer {
    scene: EnvironmentSceneSnapshot;
    opacity: number;
    cloudEntryProgress: number;
}
