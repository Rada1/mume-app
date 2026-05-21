/**
 * @file mumeTimeUtils.ts
 * @description Calendar, epoch, and lunar cycle synchronization utilities for the MUME game clock.
 */

import { MumeTime } from '../types';

// --- Logic Section: Solar and Calendar Math ---

export const SOLAR_HOURS: Record<number, { dawn: number; dusk: number }> = {
    0: { dawn: 8, dusk: 18 },  // Afteryule
    1: { dawn: 9, dusk: 17 },  // Solmath
    2: { dawn: 8, dusk: 18 },  // Rethe
    3: { dawn: 7, dusk: 19 },  // Astron
    4: { dawn: 7, dusk: 20 },  // Thrimidge
    5: { dawn: 6, dusk: 20 },  // Forelithe
    6: { dawn: 5, dusk: 21 },  // Afterlithe
    7: { dawn: 4, dusk: 22 },  // Wedmath
    8: { dawn: 5, dusk: 21 },  // Halimath
    9: { dawn: 6, dusk: 20 },  // Winterfilth
    10: { dawn: 7, dusk: 20 }, // Blotmath
    11: { dawn: 7, dusk: 19 }, // Foreyule
};

export const MUME_MONTHS = [
    'Afteryule', 'Solmath', 'Rethe', 'Astron', 'Thrimidge', 'Forelithe',
    'Afterlithe', 'Wedmath', 'Halimath', 'Winterfilth', 'Blotmath', 'Foreyule'
];

export const MUME_WEEKDAYS = [
    'Sunday', 'Monday', 'Trewsday', 'Hevenly Day', 'Mersday', 'Highday', 'Sterday'
];

/**
 * Calculates MUME minutes elapsed since the start of year 2850.
 */
export function dateToMumeMinutes(
    year: number,
    monthIndex: number,
    day: number,
    hour: number,
    minute: number
): number {
    const yearsElapsed = year - 2850;
    const monthsElapsed = yearsElapsed * 12 + monthIndex;
    const daysElapsed = monthsElapsed * 30 + (day - 1);
    const hoursElapsed = daysElapsed * 24 + hour;
    const minutesElapsed = hoursElapsed * 60 + minute;
    return minutesElapsed;
}

/**
 * Calculates the full calendar time from a calibrated starting epoch.
 */
export function getMumeTimeFromEpoch(epoch: number, realTimeMs: number): MumeTime {
    const elapsedMinutes = Math.floor(realTimeMs / 1000 - epoch);

    const MINUTES_PER_DAY = 24 * 60; // 1440
    const MINUTES_PER_MONTH = 30 * MINUTES_PER_DAY; // 43200
    const MINUTES_PER_YEAR = 12 * MINUTES_PER_MONTH; // 518400

    const year = 2850 + Math.floor(elapsedMinutes / MINUTES_PER_YEAR);
    const yearRemainder = ((elapsedMinutes % MINUTES_PER_YEAR) + MINUTES_PER_YEAR) % MINUTES_PER_YEAR;

    const monthIndex = Math.floor(yearRemainder / MINUTES_PER_MONTH);
    const monthRemainder = yearRemainder % MINUTES_PER_MONTH;

    const dayIndex = Math.floor(monthRemainder / MINUTES_PER_DAY);
    const dayRemainder = monthRemainder % MINUTES_PER_DAY;

    const hour = Math.floor(dayRemainder / 60);
    const minute = dayRemainder % 60;
    const day = dayIndex + 1;

    const month = MUME_MONTHS[monthIndex] || 'Unknown';
    const weekdayIndex = ((monthIndex * 30) + dayIndex) % 7;
    const weekday = MUME_WEEKDAYS[weekdayIndex] || 'Unknown';

    const moon = getMoonDetails(elapsedMinutes, hour * 60 + minute);

    return {
        hour,
        minute,
        day,
        month,
        year,
        weekday,
        era: 'Third Age',
        lastSyncRealTime: realTimeMs,
        mumeStartEpoch: epoch,
        moon
    };
}

// --- Logic Section: Lunar Cycle Calculations ---

export function getMoonDetails(elapsedMinutes: number, currentDayMinute: number) {
    // Synodic Moon Cycle: 42524 MUME minutes
    // zenithMinutes represents the minute of the day (0..1399) when the moon reaches its highest point (zenith)
    const rawZenith = Math.floor((elapsedMinutes * 1440) / 42524);
    const zenithMinutes = ((rawZenith % 1440) + 1440) % 1440;

    // level ranges from 0 (New Moon) to 12 (Full Moon)
    const level = Math.abs(12 - Math.round(zenithMinutes / 60));

    // phaseIndex: 0..4
    const phaseIndex = Math.min(4, Math.floor(level / 3));

    // Waxing/Waning State: Waxing if zenithMinutes >= 720 (noon to midnight), otherwise Waning
    const waxing = zenithMinutes >= 720;

    let phaseName = 'New Moon';
    if (phaseIndex === 0) {
        phaseName = 'New Moon';
    } else if (phaseIndex === 4) {
        phaseName = 'Full Moon';
    } else if (phaseIndex === 1) {
        phaseName = waxing ? 'Waxing Crescent' : 'Waning Crescent';
    } else if (phaseIndex === 2) {
        phaseName = waxing ? 'First Quarter' : 'Third Quarter';
    } else if (phaseIndex === 3) {
        phaseName = waxing ? 'Waxing Gibbous' : 'Waning Gibbous';
    }

    // Moon rises 6 hours (360 minutes) before zenith, sets 6 hours after zenith
    // riseTime = (zenithMinutes - 360 + 1440) % 1440 = (zenithMinutes + 1080) % 1440
    const riseTime = (zenithMinutes + 1080) % 1440;

    // Time elapsed since the moon rose
    const elapsedSinceRise = (currentDayMinute - riseTime + 1440) % 1440;

    const isAboveHorizon = elapsedSinceRise < 720; // Above horizon for 12 hours (720 minutes)
    let position = 'Below the horizon';

    if (isAboveHorizon) {
        const segment = Math.floor(elapsedSinceRise / 90); // 8 segments of 90 minutes each
        if (segment === 0) {
            position = 'East';
        } else if (segment === 1 || segment === 2) {
            position = 'Southeast';
        } else if (segment === 3 || segment === 4) {
            position = 'South';
        } else if (segment === 5 || segment === 6) {
            position = 'Southwest';
        } else if (segment === 7) {
            position = 'West';
        }
    }

    return {
        zenithMinutes,
        level,
        phaseIndex,
        phaseName,
        waxing,
        position,
        isAboveHorizon
    };
}
