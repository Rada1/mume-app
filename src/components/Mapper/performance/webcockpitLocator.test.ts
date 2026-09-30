/** @file Regression checks for WebCockpit-style MUME room matching. */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { createLocatorState, learnRoomIds, locateRoom, parseMovedDirection, prepareRoomIndex } from './webcockpitLocator';

const source = {
  '10': [0, 0, 0, 2, { e: { target: '20' } }, 'West Gate', '910', [], [], 'Bree'],
  '20': [1, 0, 0, 2, { w: { target: '10' }, n: { target: '30' } }, 'Market', '920', [], [], 'Bree', 0, 0, '', '', '', '', '', 'A busy market.'],
  '30': [1, 1, 0, 2, { s: { target: '20' } }, 'Market', 0, [], [], 'Bree', 0, 0, '', '', '', '', '', 'A quiet market.'],
} as const;

describe('WebCockpit-style MUME locator', () => {
  it('normalizes MUME movement directions', () => {
    expect(parseMovedDirection({ dir: 'north' })).toBe('n');
    expect(parseMovedDirection('d')).toBe('d');
    expect(parseMovedDirection({ dir: 'teleport' })).toBeNull();
  });

  it('locates by the authoritative server room id', () => {
    const state = createLocatorState();
    const result = locateRoom(prepareRoomIndex(source), state, { id: 920, name: 'Market' });
    expect(result).toEqual({ roomId: '20', matchedBy: 'id' });
  });

  it('uses the moved direction when the server id is missing', () => {
    const state = createLocatorState();
    state.lastRoomId = '10';
    state.pendingDirection = 'e';
    const result = locateRoom(prepareRoomIndex(source), state, { name: 'Market', desc: 'A busy market.' });
    expect(result).toEqual({ roomId: '20', matchedBy: 'direction' });
  });

  it('learns a missing server id after a text match', () => {
    const state = createLocatorState();
    const index = prepareRoomIndex(source);
    const info = { id: 9123, name: 'Market', desc: 'A quiet market.' };
    const result = locateRoom(index, state, info);
    expect(result).toEqual({ roomId: '30', matchedBy: 'text' });
    learnRoomIds(index, state, info, result.roomId!);
    expect(state.learnedIds.get('9123')).toBe('30');
  });
});
