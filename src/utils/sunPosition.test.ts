/** @file sunPosition.test.ts -- Seasonal sunrise, noon height, and sunset continuity. */
import { expect, it } from 'vitest';
import { MUME_MONTHS, SOLAR_HOURS } from './mumeTimeUtils';
import { getSunPosition } from './sunPosition';

// --- Seasonal Solar Path ---
it.each(MUME_MONTHS)('rises from and sets below the corner sky in %s', month => {
    const solar = SOLAR_HOURS[MUME_MONTHS.indexOf(month)];
    const at = (minute: number) => getSunPosition({ month, hour: 0, minute });
    const sunrise = solar.dawn * 60;
    const sunset = solar.dusk * 60;
    expect(at(sunrise - 1).opacity).toBe(0);
    expect(at(sunrise).yPercent).toBe(54);
    expect(at(sunrise).opacity).toBe(1);
    expect(at(sunrise + 30).yPercent).toBe(39);
    expect(at(sunrise + 60).yPercent).toBe(24);
    expect(at((sunrise + sunset) / 2).yPercent).toBeCloseTo(8);
    expect(at(sunset - 60).yPercent).toBe(24);
    expect(at(sunset - 30).yPercent).toBe(39);
    expect(at(sunset - 0.001).opacity).toBe(1);
    expect(at(sunset).yPercent).toBe(54);
    expect(at(sunset).opacity).toBe(0);
});

it('meets the gradient horizon at both cutoffs, at the center of twilight', () => {
    const position = getSunPosition({ month: 'Afteryule', hour: 8, minute: 0 });
    const ellipseRadius = Math.hypot((100 - position.xPercent) / 56, position.yPercent / 58);
    // The actual CSS radial mask reaches transparency at 94% of the ellipse.
    expect(ellipseRadius).toBeCloseTo(0.94, 2);
});

// --- Boundary and Direction Checks ---
it('has continuous coordinates at the rise, daytime, and setting boundaries', () => {
    const at = (minute: number) => getSunPosition({ month: 'Afteryule', hour: 0, minute });
    for (const boundary of [8 * 60, 9 * 60, 17 * 60, 18 * 60]) {
        expect(Math.abs(at(boundary - 0.001).yPercent - at(boundary + 0.001).yPercent)).toBeLessThan(0.001);
    }
    let last = at(9 * 60).yPercent;
    for (let minute = 9 * 60 + 1; minute <= 13 * 60; minute++) {
        const position = at(minute);
        expect(position.yPercent).toBeLessThanOrEqual(last);
        expect(position.xPercent).toBe(94);
        last = position.yPercent;
    }
    for (let minute = 13 * 60 + 1; minute <= 17 * 60; minute++) {
        const position = at(minute);
        expect(position.yPercent).toBeGreaterThanOrEqual(last);
        last = position.yPercent;
    }
});
