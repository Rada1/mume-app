/** @file EnvironmentWeatherLayers.test.tsx -- Shared cloud/light timing and quick cloud entry regressions. */
// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EnvironmentTransitionOptions } from '../../types';
import { useEnvironmentTransitions } from '../../hooks/useEnvironmentTransitions';
import { EnvironmentVignetteLayers } from './EnvironmentVignetteLayers';
import { EnvironmentWeatherLayers } from './EnvironmentWeatherLayers';

// --- Actual Layer Harness ---
const Harness = ({ performanceMode = false, ...options }: EnvironmentTransitionOptions & { performanceMode?: boolean }) => {
    const { lightingTransition, weatherTransition } = useEnvironmentTransitions(options);
    return <div className={`environment-root front lighting-state-${options.lighting}`}>
        <EnvironmentVignetteLayers {...options} {...lightingTransition} isEnabled />
        <EnvironmentWeatherLayers transition={weatherTransition} isFoggy={false} lightning={false}
            isEnabled isPerformanceMode={performanceMode} />
    </div>;
};
const initial: EnvironmentTransitionOptions = {
    lighting: 'sun', weather: 'clear', isIndoor: false, isOutdoor: true, isNight: false,
};
let frames: FrameRequestCallback[];
const advance = (elapsed: number) => act(() => {
    vi.advanceTimersByTime(elapsed);
    const pending = frames;
    frames = [];
    pending.forEach(callback => callback(performance.now()));
});
beforeEach(() => {
    frames = [];
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

// --- Synchronized Entry ---
it.each([false, true])('fades sky darkness while clouds sweep into place over one second (Performance: %s)', performanceMode => {
    const view = render(<Harness {...initial} performanceMode={performanceMode} />);
    const clear = view.container.querySelector('.environment-weather-scene.lighting-state-sun');
    view.rerender(<Harness {...initial} lighting="dark" weather="cloud" performanceMode={performanceMode} />);
    const weather = view.container.querySelector<HTMLElement>('.environment-weather-scene.lighting-state-dark')!;
    const darkness = view.container.querySelector<HTMLElement>('.vignette-state-dark')!;
    const motion = weather.querySelector<HTMLElement>('.corner-weather-cloud-motion')!;
    const clouds = weather.querySelector('.corner-weather-clouds');
    expect(view.container.querySelector('.environment-weather-scene.lighting-state-sun')).toBe(clear);
    expect(weather.style.opacity).toBe('0');
    expect(darkness.style.opacity).toBe('0');
    expect(motion.style.transform).toBe('translateX(45%)');
    advance(500);
    expect(weather.style.opacity).toBe('0.5');
    expect(darkness.style.opacity).toBe('0.5');
    expect(motion.style.transform).toBe('translateX(22.5%)');
    advance(500);
    expect(weather.style.opacity).toBe('1');
    expect(darkness.style.opacity).toBe('1');
    expect(motion.style.transform).toBe('translateX(0%)');
    expect(view.container.querySelectorAll('.environment-weather-scene')).toHaveLength(1);
    expect(weather.querySelector('.corner-weather-clouds')).toBe(clouds);
    view.rerender(<Harness {...initial} lighting="dark" weather="cloud" performanceMode={performanceMode} />);
    advance(1000);
    expect(weather.querySelector('.corner-weather-clouds')).toBe(clouds);
    expect(motion.style.transform).toBe('translateX(0%)');
});

it('retains clear-sun styling until cloud cover actually fades over it', () => {
    const view = render(<Harness {...initial} />);
    const clearSun = view.container.querySelector<HTMLElement>('.vignette-state-sun.weather-state-clear')!;
    view.rerender(<Harness {...initial} weather="cloud" />);
    const cloudySun = view.container.querySelector<HTMLElement>('.vignette-state-sun.weather-state-cloud')!;
    expect(view.container.querySelector('.vignette-state-sun.weather-state-clear')).toBe(clearSun);
    expect(clearSun.style.opacity).toBe('1');
    expect(cloudySun.style.opacity).toBe('0');
    advance(500);
    expect(clearSun.style.opacity).toBe('0.5');
    expect(cloudySun.style.opacity).toBe('0.5');
    advance(500);
    expect(clearSun.isConnected).toBe(false);
    expect(cloudySun.style.opacity).toBe('1');
});

it('does not sweep existing clouds again just because their lighting changes', () => {
    const view = render(<Harness {...initial} weather="cloud" />);
    view.rerender(<Harness {...initial} weather="cloud" lighting="dark" />);
    const darkCloud = view.container.querySelector('.environment-weather-scene.lighting-state-dark')!;
    expect((darkCloud.querySelector('.corner-weather-cloud-motion') as HTMLElement).style.transform).toBe('translateX(0%)');
    advance(1000);
});

it('preserves the visible blend when weather arrives after a lighting update', () => {
    const view = render(<Harness {...initial} />);
    view.rerender(<Harness {...initial} lighting="dark" />);
    advance(500);
    const sun = view.container.querySelector<HTMLElement>('.vignette-state-sun')!;
    const darkness = view.container.querySelector<HTMLElement>('.vignette-state-dark')!;
    expect(sun.style.opacity).toBe('0.5');
    expect(darkness.style.opacity).toBe('0.5');
    view.rerender(<Harness {...initial} lighting="dark" weather="cloud" />);
    expect(view.container.querySelector('.vignette-state-sun')).toBe(sun);
    expect(view.container.querySelector('.vignette-state-dark')).toBe(darkness);
    expect(sun.style.opacity).toBe('0.5');
    expect(darkness.style.opacity).toBe('0.5');
    const cloudScene = view.container.querySelector<HTMLElement>('.environment-weather-scene .weather-cloud')!.parentElement!;
    expect(cloudScene.style.opacity).toBe('0');
    advance(250);
    expect(Number(sun.style.opacity)).toBeCloseTo(0.421875);
    expect(Number(darkness.style.opacity)).toBeCloseTo(0.578125);
    advance(750);
    expect(sun.isConnected).toBe(false);
    expect(darkness.style.opacity).toBe('1');
    expect(view.container.querySelectorAll('.environment-weather-scene')).toHaveLength(1);
});
