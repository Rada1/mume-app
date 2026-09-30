/**
 * @file Tests preservation of door state across partial GMCP exit packets.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { MapperExit } from '../mapperTypes';
import { mergeExitDoorState } from './exitDoorState';

const closedExit: MapperExit = {
  target: 'm_2', closed: true, hasDoor: true, flags: ['door', 'closed'],
};

describe('partial GMCP exit door state', () => {
  it('preserves an optimistic open state when a packet only updates the destination', () => {
    const openedExit = { ...closedExit, closed: false };
    expect(mergeExitDoorState(openedExit, 2)).toMatchObject({ closed: false, hasDoor: true });
  });

  it('preserves an optimistic closed state when flags are omitted', () => {
    expect(mergeExitDoorState({ ...closedExit, closed: true }, { name: 'oak door', id: 2 }))
      .toMatchObject({ closed: true, hasDoor: true });
  });

  it('uses explicit flags as the new authoritative door state', () => {
    expect(mergeExitDoorState(closedExit, { name: 'oak door', id: 2, flags: ['door'] }))
      .toMatchObject({ closed: false, hasDoor: true, flags: ['door'] });
    expect(mergeExitDoorState({ ...closedExit, closed: false }, { name: 'oak door', id: 2, flags: ['door', 'closed'] }))
      .toMatchObject({ closed: true, hasDoor: true });
  });

});
