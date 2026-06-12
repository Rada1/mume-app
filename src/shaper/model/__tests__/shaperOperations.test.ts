/**
 * @file shaperOperations.test.ts
 * @description Regression tests for Shaper room placement operations.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import { addShaperRoomAt, removeShaperRoom } from '../shaperOperations';

// --- Test Section ---
describe('shaper room operations', () => {
    it('deletes base 10x10 rooms and re-adds them with their coordinate room number', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 28 });
        const removed = removeShaperRoom(doc, 'room-9-9-0');

        expect(removed.rooms['room-9-9-0']).toBeUndefined();
        expect(Object.values(removed.rooms).some(room => room.x === 9 && room.y === 9 && room.z === 0)).toBe(false);

        const restored = addShaperRoomAt(removed, 9, 9, 0);
        const room = restored.rooms[restored.selectedRoomId];

        expect(room.x).toBe(9);
        expect(room.y).toBe(9);
        expect(room.z).toBe(0);
        expect(room.roomNumber).toBe('28:99');
        expect(room.inactive).toBeUndefined();
    });

    it('treats legacy inactive placeholder rooms as empty cells', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const legacy = {
            ...doc,
            rooms: {
                ...doc.rooms,
                'room-9-9-0': { ...doc.rooms['room-9-9-0'], inactive: true }
            }
        };

        const restored = addShaperRoomAt(legacy, 9, 9, 0);
        const room = restored.rooms[restored.selectedRoomId];

        expect(room.roomNumber).toBe('31:99');
        expect(room.inactive).toBeUndefined();
        expect(Object.values(restored.rooms).filter(item => item.x === 9 && item.y === 9 && item.z === 0)).toHaveLength(1);
    });
});
