/**
 * @file shaperProjectZone.test.ts
 * @description Regression tests for Shaper project zone renumbering.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import { addShaperExtraRoom } from '../shaperOperations';
import { changeShaperProjectZone } from '../shaperProjectZone';

// --- Test Section ---
describe('changeShaperProjectZone', () => {
    it('renumbers grid and extra rooms while preserving offsets', () => {
        let doc = createDefaultShaperDocument({ zoneNumber: 31 });
        doc = addShaperExtraRoom(doc, 0);
        const extraRoom = doc.rooms[doc.selectedRoomId];

        const next = changeShaperProjectZone(doc, 28);

        expect(next.zoneNumber).toBe(28);
        expect(next.rooms['room-9-9-0'].roomNumber).toBe('28:99');
        expect(next.rooms[extraRoom.id].roomNumber).toBe('28:101');
        expect(doc.rooms['room-9-9-0'].roomNumber).toBe('31:99');
    });

    it('ignores invalid zone numbers', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        expect(changeShaperProjectZone(doc, -1)).toBe(doc);
        expect(changeShaperProjectZone(doc, 31.5)).toBe(doc);
    });
});
