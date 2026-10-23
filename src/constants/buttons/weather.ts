/**
 * @file weather.ts
 * @description Weather report actions for room and global targets.
 */
import { createButton } from '../../utils/buttonFactory';

// --- Weather Actions ---
const createWeatherButton = (scope: 'global' | 'fog' | 'local', label: string) => createButton({
    id: `command-weather-${scope}`,
    label,
    command: `weather ${scope}`,
    setId: scope === 'local' ? 'trait-room-weather' : 'trait-weather',
    color: '#64748b',
    shape: 'rect',
    width: 140,
    height: 32
});

export const WEATHER_BUTTONS = [
    createWeatherButton('global', 'Global'),
    createWeatherButton('fog', 'Fog'),
    createWeatherButton('local', 'Local')
];
