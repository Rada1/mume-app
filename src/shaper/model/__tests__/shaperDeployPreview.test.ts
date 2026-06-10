/**
 * @file shaperDeployPreview.test.ts
 * @description Regression tests for selected-room Shaper deploy previews.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import { buildSelectedRoomDeployPreview } from '../shaperDeployPreview';

// --- Test Section ---
describe('buildSelectedRoomDeployPreview', () => {
    it('includes room fields, editor blocks, exits, and command nodes', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const room = {
            ...doc.rooms[doc.selectedRoomId],
            name: 'A test room',
            preposition: 'in',
            description: 'A clean test room waits here.',
            sector: 'field' as const,
            flags: ['indoors' as const],
            owner: 'builder',
            keywords: [{
                id: 'keyword-1',
                keywords: ['sign', 'notice'],
                description: 'The sign has careful notes.'
            }]
        };
        const targetId = 'room-1-0-0';
        const exits = {
            ...doc.exits,
            [`${room.id}:e`]: {
                id: `${room.id}:e`,
                fromRoomId: room.id,
                direction: 'e' as const,
                toRoomId: targetId,
                isTwoWay: false,
                exitDescription: 'The passage continues east.'
            }
        };
        const commandNodes = {
            'com-1': {
                id: 'com-1',
                roomId: room.id,
                parentId: null,
                order: 0,
                type: 'mobile' as const,
                limit: { world: null, zone: null, room: null, chancePercent: 100, raw: '0' },
                fields: { vnum: '2', name: 'raccoon' },
                notes: ''
            }
        };

        const preview = buildSelectedRoomDeployPreview(
            room,
            { ...doc.rooms, [room.id]: room },
            exits,
            commandNodes
        );

        expect(preview.commands).toContain('/at 300:00 /room name in@A test room');
        expect(preview.commands).toContain('/at 300:00 /room description');
        expect(preview.commands).toContain('  A clean test room waits here.');
        expect(preview.commands).toContain('/at 300:00 /room kadd sign notice');
        expect(preview.commands).toContain('/at 300:00 /room edescription e');
        expect(preview.commands).toContain('/at 300:00 /com add mobile 2 0');
        expect(preview.warnings).toContain('Description and keyword description previews require an editor-save deployment step.');
    });
});
