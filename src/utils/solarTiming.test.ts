/** @file solarTiming.test.ts -- Listed dawn and dusk match the visual horizon crossings. */
import { expect, it } from 'vitest';
import { getVisualSolarHours } from './solarTiming';
import { getSunPosition } from './sunPosition';
import { getTwilightAppearance } from './twilightAppearance';

// --- Wedmath: Listed Dawn 4 AM, Dusk 10 PM ---
it('shows the sun at 4 AM and centers the dawn transition around it', () => {
    const at = (hour: number) => ({ month: 'Wedmath', hour, minute: 0 });
    expect(getVisualSolarHours('Wedmath').dawn).toBe(4);
    expect(getSunPosition({ ...at(3), minute: 59 }).opacity).toBe(0);
    expect(getSunPosition(at(4))).toMatchObject({ yPercent: 54, opacity: 1 });
    expect(getTwilightAppearance({ ...at(3), minute: 30 })).toMatchObject({ phase: 'dawn', progress: 0 });
    expect(getTwilightAppearance(at(4))).toMatchObject({ phase: 'dawn', progress: 0.5 });
    expect(getTwilightAppearance({ ...at(4), minute: 30 }).phase).toBeNull();
});

it('sets the sun at 10 PM and centers the dusk transition around it', () => {
    const at = (hour: number) => ({ month: 'Wedmath', hour, minute: 0 });
    expect(getVisualSolarHours('Wedmath').dusk).toBe(22);
    expect(getSunPosition({ ...at(21), minute: 59 }).opacity).toBe(1);
    expect(getSunPosition(at(22))).toMatchObject({ yPercent: 54, opacity: 0 });
    expect(getTwilightAppearance({ ...at(21), minute: 30 })).toMatchObject({ phase: 'dusk', progress: 0 });
    expect(getTwilightAppearance(at(22))).toMatchObject({ phase: 'dusk', progress: 0.5 });
    expect(getTwilightAppearance({ ...at(22), minute: 30 }).phase).toBeNull();
});
