/** @file twilightAppearance.ts -- Clock-driven outdoor twilight colors without gradient keyframes. */
import type { MumeTime, TwilightAppearance } from '../types';
import { getVisualSolarHours } from './solarTiming';

// --- Seasonal Twilight Windows ---
// One MUME minute lasts one real second: straddle each cutoff by 30 seconds.
const TWILIGHT_MINUTES = 60;
const DAWN_COLORS = [[99, 73, 132], [163, 79, 116], [207, 103, 108], [187, 131, 153]];
const DUSK_COLORS = [[187, 131, 153], [207, 103, 108], [163, 79, 116], [99, 73, 132]];

// --- Continuous Color and Intensity ---
export const getTwilightAppearance = (
    time: Pick<MumeTime, 'month' | 'hour' | 'minute'>,
    fractionalMinute = 0,
): TwilightAppearance => {
    const solar = getVisualSolarHours(time.month);
    const minute = time.hour * 60 + time.minute + fractionalMinute;
    const dawnStart = solar.dawn * 60 - TWILIGHT_MINUTES / 2;
    const duskStart = solar.dusk * 60 - TWILIGHT_MINUTES / 2;
    const phase = minute >= dawnStart && minute < dawnStart + TWILIGHT_MINUTES ? 'dawn'
        : minute >= duskStart && minute < duskStart + TWILIGHT_MINUTES ? 'dusk' : null;
    if (!phase) return { phase: null, progress: 0, color: 'rgb(99, 73, 132)', opacity: 0 };

    const progress = (minute - (phase === 'dawn' ? dawnStart : duskStart)) / TWILIGHT_MINUTES;
    const colors = phase === 'dawn' ? DAWN_COLORS : DUSK_COLORS;
    const position = progress * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(position));
    const fraction = position - index;
    const blend = fraction * fraction * (3 - 2 * fraction);
    const channels = colors[index].map((channel, i) =>
        (channel + (colors[index + 1][i] - channel) * blend).toFixed(3));
    return {
        phase, progress,
        color: `rgb(${channels.join(', ')})`,
        opacity: Math.sin(progress * Math.PI) ** 2 * 0.48,
    };
};
