/**
 * @file shaperOperations.test.ts
 * @description Regression tests for Shaper room placement operations.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import { addShaperExtraRoom, addShaperRoomAt, moveShaperRoom, moveShaperRoomToLayer, removeShaperRoom } from '../shaperOperations';

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

    it('assigns a unique room number when adding the same coordinate on another z layer', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const next = addShaperRoomAt(doc, 5, 0, 1);
        const room = next.rooms[next.selectedRoomId];

        expect(doc.rooms['room-5-0-0'].roomNumber).toBe('31:50');
        expect(room.x).toBe(5);
        expect(room.y).toBe(0);
        expect(room.z).toBe(1);
        expect(room.roomNumber).toBe('31:101');
    });

    it('keeps room numbers unique when moving between z layers', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const withUpper = addShaperRoomAt(doc, 5, 0, 1);
        const moved = moveShaperRoom(withUpper, withUpper.selectedRoomId, 6, 0, 1);
        const room = moved.rooms[moved.selectedRoomId];

        expect(room.roomNumber).toBe('31:101');
        expect(Object.values(moved.rooms).filter(item => item.roomNumber === '31:60')).toHaveLength(1);
    });

    it('moves extra rooms between layers without placing them on the grid', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const withExtra = addShaperExtraRoom(doc, 0);
        const extraId = withExtra.selectedRoomId;
        const moved = moveShaperRoomToLayer(withExtra, extraId, -1);
        const room = moved.rooms[extraId];

        expect(room.kind).toBe('extra');
        expect(room.z).toBe(-1);
        expect(room.roomNumber).toBe(withExtra.rooms[extraId].roomNumber);
    });

    it('keeps grid room numbers when moving only between layers', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const moved = moveShaperRoomToLayer(doc, 'room-9-9-0', 1);
        const room = moved.rooms['room-9-9-0'];

        expect(room.kind).toBe('grid');
        expect(room.z).toBe(1);
        expect(room.roomNumber).toBe('31:99');
    });
});
