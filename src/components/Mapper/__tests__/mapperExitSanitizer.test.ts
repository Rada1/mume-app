/**
 * @file mapperExitSanitizer.test.ts
 * @description Tests cleanup of text-derived fake door exits.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeTextDerivedDoorExits } from '../mapperExitSanitizer';
import { MapperRoom } from '../mapperTypes';

// --- Logic Section ---
const baseRoom: MapperRoom = {
    id: 'm_100',
    gmcpId: 100,
    name: 'A Room',
    desc: '',
    x: 0,
    y: 0,
    z: 0,
    zone: 'The Shire',
    terrain: 'Field',
    exits: {},
    notes: '',
    createdAt: 1
};

describe('sanitizeTextDerivedDoorExits', () => {
    it('removes fake doors made from text destination labels', () => {
        const room = {
            ...baseRoom,
            exits: {
                n: { target: '', name: 'Barren Plains', closed: false, hasDoor: true },
                s: { target: 'm_99', closed: false, hasDoor: false }
            }
        };

        expect(sanitizeTextDerivedDoorExits(room).exits).toEqual({
            s: { target: 'm_99', closed: false, hasDoor: false }
        });
    });

    it('keeps real door exits with targets or flags', () => {
        const room = {
            ...baseRoom,
            exits: {
                n: { target: 'm_101', name: 'gate', closed: true, hasDoor: true },
                e: { target: '', name: 'secret', closed: false, hasDoor: true, flags: ['SECRET'] }
            }
        };

        expect(sanitizeTextDerivedDoorExits(room)).toBe(room);
    });
});
