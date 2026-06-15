/**
 * @file shaperRoomProse.test.ts
 * @description Tests for agent-facing Shaper room prose helpers.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import { addShaperComNode } from '../shaperComCommands';
import { addShaperLibrary } from '../shaperLibraries';
import { applyShaperRoomProse, buildShaperProjectProseContext, buildShaperRoomProseContext } from '../shaperRoomProse';

// --- Test Section ---
describe('shaper room prose helpers', () => {
    it('applies room name, preposition, and description without changing room identity', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const roomId = doc.selectedRoomId;
        const next = applyShaperRoomProse(doc, roomId, {
            name: '  A mossy threshold  ',
            preposition: '  at ',
            description: 'A low arch opens into the green hush.\r\nSmall stones glimmer under moss.  '
        });
        const room = next.rooms[roomId];

        expect(room.name).toBe('A mossy threshold');
        expect(room.preposition).toBe('at');
        expect(room.description).toBe('A low arch opens into the green hush.\nSmall stones glimmer under moss.');
        expect(room.id).toBe(roomId);
        expect(room.roomNumber).toBe('31:00');
        expect(room.x).toBe(0);
        expect(room.y).toBe(0);
        expect(doc.rooms[roomId].name).toBe('');
    });

    it('builds room context with neighboring room prose hints', () => {
        let doc = createDefaultShaperDocument({ zoneNumber: 31 });
        doc = applyShaperRoomProse(doc, 'room-1-0-0', {
            name: 'A stone lane',
            description: 'The lane bends eastward.'
        });

        const context = buildShaperRoomProseContext(doc, 'room-0-0-0');

        expect(context?.roomNumber).toBe('31:00');
        expect(context?.neighbors).toContainEqual({
            direction: 'e',
            roomNumber: '31:10',
            name: 'A stone lane',
            sector: ''
        });
    });

    it('includes project settings that guide generated prose', () => {
        let doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const roomId = 'room-0-0-0';
        doc = {
            ...doc,
            rooms: { ...doc.rooms, [roomId]: { ...doc.rooms[roomId], sector: 'forest', flags: ['dark'], notes: 'Ancient ruin mood.' } },
            exits: {
                ...doc.exits,
                [`${roomId}:e`]: {
                    ...doc.exits[`${roomId}:e`],
                    hasDoor: true,
                    doorName: 'ivy gate',
                    doorFlags: ['hidden'],
                    exitDescription: 'A gate is almost lost beneath ivy.'
                }
            }
        };
        doc = addShaperLibrary(doc, 'room', roomId, 'fog');
        doc = addShaperComNode(doc, roomId, 'mobile', null, '123', 'old watchman');
        doc = addShaperComNode(doc, roomId, 'object', null, '456', 'rusted key');

        const roomContext = buildShaperRoomProseContext(doc, roomId);
        const projectContext = buildShaperProjectProseContext(doc);

        expect(roomContext?.sector).toBe('forest');
        expect(roomContext?.flags).toEqual(['dark']);
        expect(roomContext?.libraries.map(item => item.name)).toContain('fog');
        expect(roomContext?.mobs).toContainEqual({ vnum: '123', name: 'old watchman', resetType: 'mobile', resetDetail: '' });
        expect(roomContext?.objects).toContainEqual({ vnum: '456', name: 'rusted key', resetType: 'object', resetDetail: '' });
        expect(roomContext?.exits).toContainEqual(expect.objectContaining({
            direction: 'e',
            hasDoor: true,
            doorName: 'ivy gate',
            doorFlags: ['hidden'],
            exitDescription: 'A gate is almost lost beneath ivy.'
        }));
        expect(projectContext.rooms.some(room => room.roomNumber === '31:00')).toBe(true);
    });

    it('merges zone lore keywords into prose context', () => {
        const doc = {
            ...createDefaultShaperDocument({ zoneNumber: 31 }),
            zoneInfoKeywords: {
                story: { id: 'story', keyword: 'story', body: 'The valley remembers old wars.' },
                history: { id: 'history', keyword: 'history', body: 'A ruined watch line crossed this field.' },
                map: { id: 'map', keyword: 'map', body: 'Northern rooms climb into wooded hills.' }
            }
        };

        const roomContext = buildShaperRoomProseContext(doc, doc.selectedRoomId);
        const projectContext = buildShaperProjectProseContext(doc);

        expect(roomContext?.lore).toContain('old wars');
        expect(roomContext?.lore).toContain('ruined watch line');
        expect(roomContext?.lore).toContain('wooded hills');
        expect(projectContext.lore).toBe(roomContext?.lore);
    });
});
