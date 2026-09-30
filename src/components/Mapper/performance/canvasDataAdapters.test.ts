/** @file Tests small map records adapted for the Performance Mode worker. */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { mergeRoomExits } from './canvasDataAdapters';

describe('mergeRoomExits', () => {
  it('keeps bundled exits when live GMCP omits directions and lets live data override', () => {
    const merged = mergeRoomExits(
      { north: { target: 'live-north' } },
      { n: { target: 'map-north' }, e: { target: 'map-east' } },
    );

    expect(merged.n).toEqual({ target: 'live-north' });
    expect(merged.e).toEqual({ target: 'map-east' });
  });
});
