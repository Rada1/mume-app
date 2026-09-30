/** @file Tests matching the worker map backdrop to the active message log. */
// --- Logic Section ---

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readMapBackground } from './mapBackground';

afterEach(() => vi.unstubAllGlobals());

describe('readMapBackground', () => {
  it('uses the opaque log backdrop color', () => {
    const canvas = {} as HTMLCanvasElement;
    const backdrop = {} as HTMLElement;
    vi.stubGlobal('document', { querySelector: () => backdrop });
    vi.stubGlobal('getComputedStyle', (element: Element) => element === canvas
      ? { getPropertyValue: () => '#f3eee3' }
      : { backgroundColor: 'rgb(26, 20, 16)' });

    expect(readMapBackground(canvas)).toEqual([26 / 255, 20 / 255, 16 / 255]);
  });

  it('uses the theme app backdrop while the log backdrop is transparent', () => {
    const canvas = {} as HTMLCanvasElement;
    const backdrop = {} as HTMLElement;
    vi.stubGlobal('document', { querySelector: () => backdrop });
    vi.stubGlobal('getComputedStyle', (element: Element) => element === canvas
      ? { getPropertyValue: () => '#f3eee3' }
      : { backgroundColor: 'rgba(0, 0, 0, 0)' });

    expect(readMapBackground(canvas)).toEqual([243 / 255, 238 / 255, 227 / 255]);
  });
});
