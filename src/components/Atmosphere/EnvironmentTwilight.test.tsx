/** @file EnvironmentTwilight.test.tsx -- Outdoor gating and clock continuity across room changes. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { dateToMumeMinutes, getMumeTimeFromEpoch } from '../../utils/mumeTimeUtils';
import { EnvironmentTwilight } from './EnvironmentTwilight';

// --- Clock Fixtures ---
const at = (minute: number) => getMumeTimeFromEpoch(0,
    dateToMumeMinutes(2850, 0, 1, 9, minute) * 1000);
afterEach(cleanup);

// --- Room Visibility ---
it('resumes the current clock phase outdoors without replaying dawn on room changes', () => {
    const view = render(<EnvironmentTwilight time={at(0)} isOutdoor isEnabled />);
    const vignette = view.container.firstElementChild as HTMLElement;
    expect(Number(vignette.style.opacity)).toBeCloseTo(0.48);
    view.rerender(<EnvironmentTwilight time={at(0)} isOutdoor={false} isEnabled />);
    expect(vignette.style.opacity).toBe('0');
    view.rerender(<EnvironmentTwilight time={at(15)} isOutdoor isEnabled />);
    expect(view.container.firstElementChild).toBe(vignette);
    expect(Number(vignette.style.opacity)).toBeCloseTo(0.24);
    view.rerender(<EnvironmentTwilight time={at(30)} isOutdoor isEnabled />);
    expect(vignette.style.opacity).toBe('0');
});

it('stays invisible without a clock or with immersion disabled', () => {
    const view = render(<EnvironmentTwilight isOutdoor isEnabled />);
    expect((view.container.firstElementChild as HTMLElement).style.opacity).toBe('0');
    view.rerender(<EnvironmentTwilight time={at(30)} isOutdoor isEnabled={false} />);
    expect((view.container.firstElementChild as HTMLElement).style.opacity).toBe('0');
});
