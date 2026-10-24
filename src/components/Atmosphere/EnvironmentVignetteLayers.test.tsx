/** @file EnvironmentVignetteLayers.test.tsx — Vignette initialization and cross-fade lifecycle regressions. */
// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EnvironmentTransitionOptions, MumeTime } from '../../types';
import { useEnvironmentTransitions } from '../../hooks/useEnvironmentTransitions';
import { EnvironmentVignetteLayers } from './EnvironmentVignetteLayers';
import { dateToMumeMinutes, getMumeTimeFromEpoch } from '../../utils/mumeTimeUtils';

// --- Transition Harness ---
const Harness = (props: EnvironmentTransitionOptions & { gameTime?: MumeTime }) => {
    const { lightingTransition } = useEnvironmentTransitions(props);
    return <EnvironmentVignetteLayers {...props} {...lightingTransition} isEnabled />;
};
const initial: EnvironmentTransitionOptions = {
    lighting: 'artificial', weather: 'clear', isIndoor: true, isOutdoor: false,
    isNight: false, isVignetteReady: true,
};
let frames: FrameRequestCallback[] = [];
const nextFrame = (elapsed = 0) => act(() => {
    vi.advanceTimersByTime(elapsed);
    const pending = frames;
    frames = [];
    pending.forEach(callback => callback(performance.now()));
});
beforeEach(() => {
    frames = [];
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
        frames.push(callback);
        return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

// --- Regression Cases ---
it('fades stars and the night-sky glow together when only the room dark flag changes', () => {
    const SkyHarness = ({ blocked }: { blocked: boolean }) => {
        const options = { ...initial, lighting: 'dark' as const, isOutdoor: true, isIndoor: false, isNight: true, blocksSky: blocked };
        const { lightingTransition, starsOpacity } = useEnvironmentTransitions(options);
        return <><span data-testid="stars" data-opacity={starsOpacity}/>
            <EnvironmentVignetteLayers {...options} {...lightingTransition} isEnabled /></>;
    };
    const view = render(<SkyHarness blocked={false}/>);
    const stars = () => Number(view.getByTestId('stars').getAttribute('data-opacity'));
    view.rerender(<SkyHarness blocked/>);
    expect(stars()).toBeCloseTo(0.96);
    nextFrame(500);
    expect(stars()).toBeCloseTo(0.48);
    expect(view.container.querySelector<HTMLElement>('.vignette-state-dark:not(.is-indoor)')?.style.opacity).toBe('0.5');
    expect(view.container.querySelector<HTMLElement>('.vignette-state-dark.is-indoor')?.style.opacity).toBe('0.5');
    // Reversing direction mid-fade must retain the current visible mix.
    view.rerender(<SkyHarness blocked={false}/>);
    expect(stars()).toBeCloseTo(0.48);
    nextFrame(500);
    expect(stars()).toBeCloseTo(0.72);
    nextFrame(500);
    expect(stars()).toBeCloseTo(0.96);
    view.rerender(<SkyHarness blocked/>);
    nextFrame(1000);
    expect(stars()).toBe(0);
    expect(view.container.querySelector('.vignette-state-dark:not(.is-indoor)')).toBeNull();
});
it('uses a black dark-room vignette and suppresses the artificial night-sky glow when sky is blocked', () => {
    const props = { previousLighting: null, previousIsIndoor: false, previousIsNight: true,
        isIndoor: false, isNight: true, isFading: false, progress: 1, isEnabled: true, showSky: false } as const;
    const view = render(<EnvironmentVignetteLayers {...props} lighting="dark" />);
    expect(view.container.querySelector('.vignette-state-dark.is-indoor')).not.toBeNull();
    view.rerender(<EnvironmentVignetteLayers {...props} lighting="artificial" />);
    expect(view.container.querySelector('.has-night-sky')).toBeNull();
    expect(view.container.querySelector('.client-sun-disc')).toBeNull();
});
it('redirects rapid reversals from the visible mix and ignores callbacks from cancelled fades', () => {
    const view = render(<Harness {...initial} lighting="dark" />);
    const opacity = (source: string) => Number(view.container.querySelector<HTMLElement>(`.vignette-state-${source}`)?.style.opacity ?? 0);
    view.rerender(<Harness {...initial} lighting="sun" />);
    nextFrame(250);
    expect(opacity('sun')).toBeCloseTo(0.15625);
    const obsoleteSunFrame = frames[0];

    view.rerender(<Harness {...initial} lighting="dark" />);
    expect(opacity('sun')).toBeCloseTo(0.15625);
    nextFrame(100);
    const sunBeforeReturn = 0.15625 * (1 - 0.028);
    expect(opacity('sun')).toBeCloseTo(sunBeforeReturn);

    view.rerender(<Harness {...initial} lighting="sun" />);
    expect(opacity('sun')).toBeCloseTo(sunBeforeReturn);
    // Simulate a previously queued callback arriving after its target key repeats.
    act(() => obsoleteSunFrame(performance.now() + 2000));
    expect(opacity('sun')).toBeCloseTo(sunBeforeReturn);
    expect(opacity('dark')).toBeCloseTo(1 - sunBeforeReturn);
    nextFrame(500);
    expect(opacity('sun')).toBeCloseTo(sunBeforeReturn + (1 - sunBeforeReturn) * 0.5);

    const mixBeforeThirdSource = opacity('sun');
    view.rerender(<Harness {...initial} />);
    expect(opacity('sun')).toBeCloseTo(mixBeforeThirdSource);
    expect(opacity('artificial')).toBe(0);
    nextFrame(500);
    expect(opacity('sun')).toBeCloseTo(mixBeforeThirdSource * 0.5);
    expect(opacity('artificial')).toBeCloseTo(0.5);
    nextFrame(500);
    expect(opacity('artificial')).toBe(1);
    expect(view.container.querySelectorAll('.environment-vignette-scene')).toHaveLength(1);
});

it('retains the visible outgoing layer and mounts the incoming layer fully transparent', () => {
    const view = render(<Harness {...initial} />);
    const oldLayer = view.container.querySelector('.vignette-state-artificial');
    view.rerender(<Harness {...initial} lighting="sun" />);
    const newLayer = view.container.querySelector<HTMLElement>('.vignette-state-sun');
    expect(view.container.querySelector('.vignette-state-artificial')).toBe(oldLayer);
    expect(newLayer?.style.opacity).toBe('0');
    nextFrame();
    expect(newLayer?.style.opacity).toBe('0');
    for (const progress of [0.15625, 0.5, 0.84375]) {
        nextFrame(250);
        expect(Number(newLayer?.style.opacity)).toBeCloseTo(progress);
        expect(Number((oldLayer as HTMLElement).style.opacity)).toBeCloseTo(1 - progress);
    }
    nextFrame(250);
    expect(newLayer?.style.opacity).toBe('1');
    expect(oldLayer?.isConnected).toBe(false);
    nextFrame(1000);
    expect(view.container.querySelector('.vignette-state-artificial')).toBeNull();
    expect(view.container.querySelector('.vignette-state-sun')).toBe(newLayer);
    expect(newLayer?.classList.contains('is-transitioning')).toBe(false);
});

it('shows the first login room immediately without a fade', () => {
    const view = render(<Harness {...initial} lighting="moon" isVignetteReady={false} />);
    view.rerender(<Harness {...initial} />);
    const layers = view.container.querySelectorAll<HTMLElement>('.environment-vignette-scene');
    expect(layers).toHaveLength(1);
    expect(layers[0].style.opacity).toBe('1');
    expect(layers[0].classList.contains('is-transitioning')).toBe(false);
    expect(frames).toHaveLength(0);
});

it('keeps artificial lighting static through clock and terrain updates', () => {
    const view = render(<Harness {...initial} />);
    view.rerender(<Harness {...initial} isNight />);
    view.rerender(<Harness {...initial} isNight isIndoor={false} isOutdoor />);
    expect(view.container.querySelectorAll('.environment-vignette-scene')).toHaveLength(1);
    expect(view.container.querySelector<HTMLElement>('.vignette-state-artificial')?.style.opacity).toBe('1');
    expect(view.container.querySelector('.is-transitioning')).toBeNull();
    expect(frames).toHaveLength(0);
});

it('retains the sunlight corner inside the same fading scene and ignores late clock updates', () => {
    const view = render(<Harness {...initial} />);
    view.rerender(<Harness {...initial} lighting="sun" />);
    nextFrame(500);
    const sun = view.container.querySelector<HTMLElement>('.vignette-state-sun');
    expect(sun?.querySelector('.client-corner-light-overlay')).not.toBeNull();
    expect(sun?.style.opacity).toBe('0.5');
    view.rerender(<Harness {...initial} lighting="sun" isNight />);
    expect(sun?.style.opacity).toBe('0.5');
    nextFrame(500);
    expect(sun?.style.opacity).toBe('1');
    nextFrame(1000);
    expect(sun?.style.opacity).toBe('1');
    expect(view.container.querySelectorAll('.environment-vignette-scene')).toHaveLength(1);
});

it('shows the sun at Wedmath 8:09 even when the sunlit room has indoor terrain', () => {
    const gameTime = getMumeTimeFromEpoch(0, dateToMumeMinutes(2850, 7, 25, 8, 9) * 1000);
    const view = render(<Harness {...initial} weather="none" gameTime={gameTime} />);
    expect(view.container.querySelector('.client-sun-disc')).toBeNull();
    view.rerender(<Harness {...initial} lighting="sun" weather="none" gameTime={gameTime} />);
    const scene = view.container.querySelector<HTMLElement>('.vignette-state-sun')!;
    const disc = scene.querySelector<HTMLElement>('.client-sun-disc')!;
    expect(disc).not.toBeNull();
    expect(scene.classList.contains('is-indoor')).toBe(true);
    expect(scene.style.opacity).toBe('0');
    expect(disc.style.opacity).toBe('1');
    expect(parseFloat(disc.style.top)).toBeGreaterThan(8);
    expect(parseFloat(disc.style.top)).toBeLessThan(24);
    nextFrame(500);
    expect(scene.style.opacity).toBe('0.5');
    nextFrame(500);
    expect(scene.style.opacity).toBe('1');
    expect(scene.querySelector('.client-sun-disc')).toBe(disc);
});

it('renders the horizon sun outside the sky mask during sunlight at 4:00 and 5:19, and never during artificial lighting', () => {
    const at = (hour: number, minute: number) => getMumeTimeFromEpoch(0, dateToMumeMinutes(2850, 7, 27, hour, minute) * 1000);
    const view = render(<Harness {...initial} isIndoor={false} isOutdoor gameTime={at(4, 0)} />);
    expect(view.container.querySelector('.client-sun-disc')).toBeNull();
    view.rerender(<Harness {...initial} lighting="sun" isIndoor={false} isOutdoor gameTime={at(4, 0)} />);
    const scene = view.container.querySelector<HTMLElement>('.vignette-state-sun')!;
    const sun = scene.querySelector<HTMLElement>('.client-sun-disc')!;
    expect(sun).not.toBeNull();
    expect(sun.parentElement).toBe(scene);
    expect(sun.style.top).toBe('54%');
    expect(sun.style.opacity).toBe('1');
    view.rerender(<Harness {...initial} lighting="sun" isIndoor={false} isOutdoor gameTime={at(5, 19)} />);
    expect(scene.querySelector('.client-sun-disc')).toBe(sun);
    expect(parseFloat(sun.style.top)).toBeLessThan(54);
    view.rerender(<Harness {...initial} isIndoor={false} isOutdoor gameTime={at(5, 19)} />);
    nextFrame(1000);
    expect(view.container.querySelector('.client-sun-disc')).toBeNull();
});
