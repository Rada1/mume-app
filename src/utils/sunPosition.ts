/** @file sunPosition.ts -- Seasonal solar height inside the corner sky. */
import type { MumeTime, SunPosition } from '../types';
import { getVisualSolarHours } from './solarTiming';

// --- Solar Path ---
// The sky ellipse is 56% wide and 58% tall, fading to zero at 94%.
// At the sun's x=94%, its lower boundary is approximately y=54%, not 64%.
const HORIZON_Y = 54;
const LOW_SKY_Y = 24;
const NOON_Y = 8;
const smoothstep = (value: number) => value * value * (3 - 2 * value);

export const getSunPosition = (
    time: Pick<MumeTime, 'month' | 'hour' | 'minute'>,
    fractionalMinute = 0,
): SunPosition => {
    const solar = getVisualSolarHours(time.month);
    const minute = time.hour * 60 + time.minute + fractionalMinute;
    const sunrise = solar.dawn * 60;
    const sunset = solar.dusk * 60;
    // The bottom of the sky mask acts as its horizon, rather than the viewport edge.
    if (minute < sunrise || minute >= sunset) {
        return { xPercent: 94, yPercent: HORIZON_Y, opacity: 0 };
    }
    let yPercent: number;
    if (minute < sunrise + 60) {
        yPercent = HORIZON_Y - (HORIZON_Y - LOW_SKY_Y) * smoothstep((minute - sunrise) / 60);
    } else if (minute > sunset - 60) {
        yPercent = LOW_SKY_Y + (HORIZON_Y - LOW_SKY_Y) * smoothstep((minute - sunset + 60) / 60);
    } else {
        const dayProgress = (minute - sunrise - 60) / (sunset - sunrise - 120);
        yPercent = LOW_SKY_Y - (LOW_SKY_Y - NOON_Y) * Math.sin(Math.PI * dayProgress) ** 2;
    }
    return { xPercent: 94, yPercent, opacity: 1 };
};
