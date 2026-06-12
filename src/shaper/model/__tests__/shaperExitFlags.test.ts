/**
 * @file shaperExitFlags.test.ts
 * @description Regression tests for Shaper exit flag predicates.
 */

import { describe, expect, it } from 'vitest';
import { hasShaperExitClimb, hasShaperExitDoor, syncShaperExitDoorFlag } from '../shaperExitFlags';
import type { ShaperExitDraft } from '../shaperTypes';

// --- Fixture Section ---
const exit = (patch: Partial<ShaperExitDraft> = {}): ShaperExitDraft => ({
    id: 'room-0-0-0:n',
    fromRoomId: 'room-0-0-0',
    direction: 'n',
    toRoomId: 'room-0-1-0',
    isTwoWay: false,
    ...patch
});

// --- Test Section ---
describe('shaper exit flags', () => {
    it('treats door and climb flags as authoritative', () => {
        expect(hasShaperExitDoor(exit({ doorFlags: ['door'] }))).toBe(true);
        expect(hasShaperExitClimb(exit({ doorFlags: ['climb_up'] }))).toBe(true);
        expect(hasShaperExitClimb(exit({ doorFlags: ['climb_down'] }))).toBe(true);
    });

    it('preserves legacy booleans as compatibility signals', () => {
        expect(hasShaperExitDoor(exit({ hasDoor: true }))).toBe(true);
        expect(hasShaperExitClimb(exit({ isClimb: true }))).toBe(true);
    });

    it('toggles the door flag without disturbing other flags', () => {
        const startingExit = exit({ doorFlags: ['closed'] });

        expect(syncShaperExitDoorFlag(startingExit, true)).toEqual(['closed', 'door']);
        expect(syncShaperExitDoorFlag(exit({ doorFlags: ['closed', 'door'] }), false)).toEqual(['closed']);
    });
});
