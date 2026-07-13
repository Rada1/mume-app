/**
 * @file environmentGlowUtils.ts
 * @description Static configurations and helper functions for the dynamic EnvironmentGlow component.
 */

export interface HSLColor {
    h: number;
    s: number;
    l: number;
}

export interface TerrainConfig {
    color1: HSLColor;
    color2: HSLColor;
    speed: number;
    amplitude: number;
}

export const TERRAIN_CONFIGS: Record<string, TerrainConfig> = {
    forest: {
        color1: { h: 140, s: 65, l: 15 },
        color2: { h: 110, s: 50, l: 20 },
        speed: 0.006,
        amplitude: 14,
    },
    water: {
        color1: { h: 205, s: 75, l: 20 },
        color2: { h: 180, s: 65, l: 24 },
        speed: 0.012,
        amplitude: 18,
    },
    underground: {
        color1: { h: 280, s: 25, l: 10 },
        color2: { h: 15, s: 75, l: 14 },
        speed: 0.003,
        amplitude: 8,
    },
    mountain: {
        color1: { h: 215, s: 15, l: 22 },
        color2: { h: 240, s: 10, l: 30 },
        speed: 0.005,
        amplitude: 10,
    },
    hills: {
        color1: { h: 35, s: 40, l: 16 },
        color2: { h: 70, s: 30, l: 20 },
        speed: 0.006,
        amplitude: 12,
    },
    field: {
        color1: { h: 90, s: 45, l: 16 },
        color2: { h: 60, s: 40, l: 20 },
        speed: 0.007,
        amplitude: 12,
    },
    road: {
        color1: { h: 40, s: 25, l: 15 },
        color2: { h: 30, s: 20, l: 18 },
        speed: 0.006,
        amplitude: 8,
    },
    city: {
        color1: { h: 25, s: 35, l: 18 },
        color2: { h: 0, s: 25, l: 22 },
        speed: 0.006,
        amplitude: 10,
    },
    building: {
        color1: { h: 35, s: 35, l: 18 },
        color2: { h: 15, s: 30, l: 22 },
        speed: 0.005,
        amplitude: 8,
    },
    'account-blue': {
        color1: { h: 220, s: 70, l: 12 },
        color2: { h: 200, s: 60, l: 16 },
        speed: 0.010,
        amplitude: 18,
    },
    default: {
        color1: { h: 220, s: 20, l: 16 },
        color2: { h: 200, s: 15, l: 20 },
        speed: 0.004,
        amplitude: 8,
    },
};

export const LIGHTING_COLORS: Record<string, HSLColor> = {
    sun:        { h: 200, s: 20, l: 45 },
    moon:       { h: 222, s: 58, l: 32 },
    artificial: { h: 28,  s: 40, l: 30 },
    dark:       { h: 260, s: 22, l: 28 },
    none:       { h: 220, s: 18, l: 38 },
};

export const LIGHT_WAVE_HEIGHT_MULTIPLIER = 1.5;

export const adjustForTheme = (color: HSLColor, isLightMode: boolean): HSLColor => {
    let { h, s, l } = color;
    if (isLightMode) {
        l = Math.min(95, 76 + l * 0.4);
        s = Math.max(12, s * 0.5);
    }
    return { h, s, l };
};

export const lerp = (start: number, end: number, amt: number): number => {
    return (1 - amt) * start + amt * end;
};

export const lerpHue = (start: number, end: number, amt: number): number => {
    let diff = end - start;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return (start + diff * amt + 360) % 360;
};
