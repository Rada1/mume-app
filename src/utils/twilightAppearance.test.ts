/** @file twilightAppearance.test.ts -- Seasonal clock windows and continuous twilight palettes. */
import { expect, it } from 'vitest';
import { MUME_MONTHS, SOLAR_HOURS } from './mumeTimeUtils';
import { getTwilightAppearance } from './twilightAppearance';

// --- Solar Boundaries ---
it.each(MUME_MONTHS)('centers a one-minute real-time twilight window on each cutoff in %s', month => {
    const solar = SOLAR_HOURS[MUME_MONTHS.indexOf(month)];
    for (const phase of ['dawn', 'dusk'] as const) {
        const cutoff = (phase === 'dawn' ? solar.dawn : solar.dusk) * 60;
        const start = cutoff - 30;
        const at = (minute: number) => getTwilightAppearance({ month, hour: 0, minute });
        expect(at(start - 0.001).opacity).toBe(0);
        expect(at(start).phase).toBe(phase);
        expect(at(start).opacity).toBe(0);
        expect(at(cutoff).progress).toBe(0.5);
        expect(at(cutoff).opacity).toBeCloseTo(0.48);
        expect(at(cutoff - 15).opacity).toBeCloseTo(at(cutoff + 15).opacity);
        expect(at(cutoff + 30).phase).toBeNull();
        expect(at(cutoff + 30).opacity).toBe(0);
    }
});

// --- Smooth Color and Intensity ---
it.each([8, 18])('keeps the %i-hour cycle continuous, without yellow or brightness pulses', hour => {
    const samples = Array.from({ length: 6000 }, (_, i) =>
        getTwilightAppearance({ month: 'Afteryule', hour, minute: 30 + i / 100 }));
    let previousChannels: number[] | undefined;
    samples.forEach((sample, index) => {
        const channels = sample.color.match(/[\d.]+/g)!.map(Number);
        expect(channels[1]).toBeLessThanOrEqual(channels[2]);
        if (previousChannels) channels.forEach((channel, i) =>
            expect(Math.abs(channel - previousChannels![i])).toBeLessThan(0.1));
        if (index > 0 && index < 3000) expect(sample.opacity).toBeGreaterThanOrEqual(samples[index - 1].opacity);
        if (index > 3000) expect(sample.opacity).toBeLessThanOrEqual(samples[index - 1].opacity);
        previousChannels = channels;
    });
});

it('does not create twilight at noon or midnight', () => {
    for (const hour of [0, 12]) {
        expect(getTwilightAppearance({ month: 'Afteryule', hour, minute: 0 }).phase).toBeNull();
    }
});
