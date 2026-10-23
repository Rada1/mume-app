/** @file useRoomObjects.test.ts — NPC descriptions must not become additional room objects. */
import { describe, expect, it } from 'vitest';
import type { GmcpOccupant } from '../types';
import { filterRoomObjects } from './useRoomObjects';
import { getPlainRoomObjectDescription, getRoomObjectEntityNames } from './GameParser/roomItemDetection';
import { getCommandActionTargetEntries } from '../objects/commandActionTargetModel';

// --- Room Classification Regression Checks ---
const horse: GmcpOccupant = { id: 17, name: 'pack horse', type: 'npc' };
const phantom: GmcpOccupant = { id: 'roomitems:horse:1', name: 'sturdy pack horse' };

describe('room NPC/object separation', () => {
    it('keeps the horse only in the NPC targets', () => {
        const objects = filterRoomObjects([phantom], [horse]);
        const entries = getCommandActionTargetEntries([], [horse], objects, [], []);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ id: 'roomchars:17', group: 'npcs', scope: 'room' });
    });

    it('removes a false object once character data arrives without mutating raw items', () => {
        const items = [phantom];
        expect(filterRoomObjects(items, [])).toEqual(items);
        expect(filterRoomObjects(items, [horse])).toEqual([]);
        expect(items).toEqual([phantom]);
    });

    it('rejects explicit NPC and mount types even without a separate room character', () => {
        expect(filterRoomObjects([{ ...phantom, type: 'npc' }, { ...phantom, type: 'mount' }, { ...phantom, pc: 0 }], [])).toEqual([]);
    });

    it('uses matching GMCP identity when the description differs', () => {
        expect(filterRoomObjects([{ id: '17', name: 'a horse' }], [horse])).toEqual([]);
    });

    it('preserves corpses, depictions, gear, and objects with a different full name', () => {
        const names = ['corpse of a pack horse', 'pack horse corpse', 'wooden statue of a pack horse',
            'pack horse figurine', 'pack horse saddle', 'toy horse', 'a sword'];
        const items = names.map(name => ({ name }));
        expect(filterRoomObjects(items, [horse])).toEqual(items);
    });

    it('uses full aliases rather than matching just the final command noun', () => {
        expect(filterRoomObjects([phantom], [{ ...horse, name: 'war horse', keyword: 'horse' }])).toEqual([phantom]);
    });

    it('does not treat tagged or escaped character posture lines as plain objects', () => {
        const text = 'A sturdy pack horse is standing here.';
        expect(getPlainRoomObjectDescription(text, '<character>A sturdy pack horse</character> is standing here.')).toBeNull();
        expect(getPlainRoomObjectDescription(text, '&lt;character&gt;A sturdy pack horse&lt;/character&gt; is standing here.')).toBeNull();
        expect(getPlainRoomObjectDescription('A sword is lying here.')).toBe('sword');
    });

    it('does not collect equipment on a mount as room objects', () => {
        expect(getRoomObjectEntityNames([
            { type: 'entity', entityId: 'horse', content: 'pack horse', metadata: { kind: 'mount' } },
            { type: 'entity', entityId: 'saddle', content: 'saddle', metadata: { kind: 'object', location: 'room' } }
        ])).toEqual([]);
    });
});
