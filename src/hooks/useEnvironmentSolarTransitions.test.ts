/** @file useEnvironmentSolarTransitions.test.ts -- Twilight reaches the real sky endpoints. */
// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EnvironmentTransitionOptions, LightingType } from '../types';
import { dateToMumeMinutes, getMumeTimeFromEpoch } from '../utils/mumeTimeUtils';
import { useEnvironmentTransitions } from './useEnvironmentTransitions';

// --- Calibrated Clock and Frame Fixtures ---
const options = (phase: 'dawn' | 'dusk', offset: number, lighting: LightingType): EnvironmentTransitionOptions => ({
    lighting, weather: 'clear', isOutdoor: true, isIndoor: false, isNight: lighting !== 'sun',
    gameTime: getMumeTimeFromEpoch(0, dateToMumeMinutes(2850, 0, 1, phase === 'dawn' ? 9 : 19, offset) * 1000),
});
let frames: FrameRequestCallback[];
beforeEach(() => {
    frames = [];
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

// --- Full Sky, Including Stars and Weather ---
it.each(['dawn', 'dusk'] as const)('blends the real %s endpoints across the cutoff without a second fade', phase => {
    const start = phase === 'dawn' ? 'dark' : 'sun';
    const end = phase === 'dawn' ? 'sun' : 'dark';
    const view = renderHook(useEnvironmentTransitions, { initialProps: options(phase, -30, start) });
    const weights = () => {
        const scenes = view.result.current.lightingTransition.scenes;
        return {
            sun: scenes.filter(layer => layer.scene.lighting === 'sun').reduce((sum, layer) => sum + layer.opacity, 0),
            stars: view.result.current.starsOpacity,
        };
    };
    for (let offset = -30; offset <= 30; offset++) {
        view.rerender(options(phase, offset, offset < 0 ? start : end));
        const progress = (offset + 30) / 60;
        const eased = progress ** 2 * (3 - 2 * progress);
        const daylight = phase === 'dawn' ? eased : 1 - eased;
        expect(weights().sun).toBeCloseTo(daylight);
        expect(weights().stars).toBeCloseTo((1 - daylight) * 0.96);
        expect(view.result.current.weatherTransition.scenes).toEqual(view.result.current.lightingTransition.scenes);
        if (offset === 0) {
            const before = weights();
            view.rerender(options(phase, offset, start));
            expect(weights()).toEqual(before);
            view.rerender(options(phase, offset, end));
            expect(weights()).toEqual(before);
        }
        act(() => {
            vi.advanceTimersByTime(1000);
            const pending = frames; frames = [];
            pending.forEach(callback => callback(performance.now()));
        });
    }
    const finished = weights();
    view.rerender(options(phase, 31, end));
    expect(weights()).toEqual(finished);
    expect(finished.stars).toBe(phase === 'dawn' ? 0 : 0.96);
});

it('keeps indoor artificial light independent of the solar cycle', () => {
    const props = { ...options('dusk', 0, 'artificial'), isOutdoor: false, isIndoor: true };
    const view = renderHook(useEnvironmentTransitions, { initialProps: props });
    expect(view.result.current.lightingTransition.scenes).toHaveLength(1);
    expect(view.result.current.lightingTransition.scenes[0].scene.lighting).toBe('artificial');
    expect(view.result.current.starsOpacity).toBe(0);
});

it('preserves the visible night palette when the cutoff first reports moonlight', () => {
    const view = renderHook(useEnvironmentTransitions, { initialProps: options('dusk', 0, 'sun') });
    const before = view.result.current.lightingTransition.scenes;
    view.rerender(options('dusk', 0, 'moon'));
    const after = view.result.current.lightingTransition.scenes;
    for (const source of ['sun', 'dark', 'moon']) {
        const weight = (layers: typeof before) => layers.filter(layer => layer.scene.lighting === source)
            .reduce((sum, layer) => sum + layer.opacity, 0);
        expect(weight(after)).toBeCloseTo(weight(before));
    }
    expect(view.result.current.starsOpacity).toBeCloseTo(0.48);
});
