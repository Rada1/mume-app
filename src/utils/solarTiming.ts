/** @file solarTiming.ts -- Shared visual solar cutoffs relative to the game's phase labels. */
import { MUME_MONTHS, SOLAR_HOURS } from './mumeTimeUtils';

// --- Visual Horizon Timing ---
// The listed dawn/dusk hour is the visual horizon crossing.
export const getVisualSolarHours = (month: string) => {
    const solar = SOLAR_HOURS[MUME_MONTHS.indexOf(month)] ?? SOLAR_HOURS[3];
    return { dawn: solar.dawn, dusk: solar.dusk };
};
