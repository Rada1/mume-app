/**
 * @file weatherUtils.ts
 * @description Normalizes GMCP weather payloads into client weather states.
 */

import { WeatherType } from '../types';

// --- Logic Section ---

export const normalizeGmcpWeather = (value: unknown): WeatherType | null => {
    if (value === undefined) return null;
    if (value === null) return 'clear';

    const raw = String(value);
    const trimmed = raw.trim();
    if (!trimmed) return 'none';

    const lower = trimmed.toLowerCase();
    if (lower === '~' || lower.includes('cloud') || lower.includes('overcast')) return 'cloud';
    if (lower === '\'' || lower === '"') return 'rain';
    if (lower === '*') return 'heavy-rain';
    if (lower.includes('snow')) return 'snow';
    if (lower.includes('rain')) return lower.includes('heavy') ? 'heavy-rain' : 'rain';
    if (lower === 'clear' || lower === 'none' || lower === 'calm') return lower as WeatherType;

    return null;
};
