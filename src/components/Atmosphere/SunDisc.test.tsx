/** @file SunDisc.test.tsx -- Clock positioning without replaying the source vignette fade. */
// @vitest-environment jsdom
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { dateToMumeMinutes, getMumeTimeFromEpoch } from '../../utils/mumeTimeUtils';
import { SunDisc } from './SunDisc';

// --- Clock Fixture ---
const at = (hour: number, minute = 0) => getMumeTimeFromEpoch(0,
    dateToMumeMinutes(2850, 0, 1, hour, minute) * 1000);
afterEach(cleanup);

// --- Retained Solar Element ---
it('moves the existing sun from the lower edge to midday and back down at sunset', () => {
    const view = render(<SunDisc time={at(9)} />);
    const sun = view.container.firstElementChild as HTMLElement;
    expect(sun.style.top).toBe('54%');
    view.rerender(<SunDisc time={at(9, 30)} />);
    expect(view.container.firstElementChild).toBe(sun);
    expect(sun.style.top).toBe('39%');
    view.rerender(<SunDisc time={at(14)} />);
    expect(sun.style.top).toBe('8%');
    view.rerender(<SunDisc time={at(19)} />);
    expect(sun.style.top).toBe('54%');
    expect(sun.style.opacity).toBe('0');
});
