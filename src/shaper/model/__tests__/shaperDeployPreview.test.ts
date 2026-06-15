/**
 * @file shaperDeployPreview.test.ts
 * @description Regression tests for selected-room Shaper deploy previews.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import { buildMultiRoomDeployPreview, buildSelectedRoomDeployPreview, buildZoneDeployPreview } from '../shaperDeployPreview';
import type { ShaperExitDraft, ShaperDoorFlag, ShaperRoomDraft } from '../shaperTypes';

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
        expect(preview.commands).toContain('/at 300:00 /room desc');
        expect(preview.commands).toContain('  A clean test room waits here.');
        expect(preview.commands).toContain('/at 300:00 /room kadd sign notice');
        expect(preview.commands).toContain('/at 300:00 /room edescription e');
        expect(preview.commands).toContain('/at 300:00 /com add mobile 2 0');
        expect(preview.commands).toContain('/at 300:00 /room owner builder');
        expect(preview.commands.at(-1)).toBe('/at 300:00 /room save');
        expect(preview.warnings).toContain('Description and keyword description previews require an editor-save deployment step.');
    });

    it('omits the /room owner command when owner is unset or none', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const base = doc.rooms[doc.selectedRoomId];

        const noneRoom = { ...base, name: 'Owned by no one', owner: 'none' };
        const nonePreview = buildSelectedRoomDeployPreview(
            noneRoom,
            { ...doc.rooms, [noneRoom.id]: noneRoom },
            doc.exits,
            {}
        );
        expect(nonePreview.commands.some(line => line.includes('/room owner'))).toBe(false);

        const emptyRoom = { ...base, name: 'Owned by no one', owner: '  ' };
        const emptyPreview = buildSelectedRoomDeployPreview(
            emptyRoom,
            { ...doc.rooms, [emptyRoom.id]: emptyRoom },
            doc.exits,
            {}
        );
        expect(emptyPreview.commands.some(line => line.includes('/room owner'))).toBe(false);
    });

    it('builds door and climb commands from exit flags', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const room = doc.rooms[doc.selectedRoomId];
        const targetId = 'room-1-0-0';
        const exits: Record<string, ShaperExitDraft> = {
            [`${room.id}:e`]: {
                id: `${room.id}:e`,
                fromRoomId: room.id,
                direction: 'e' as const,
                toRoomId: targetId,
                isTwoWay: false,
                doorName: 'gate',
                doorFlags: ['door', 'closed'] as ShaperDoorFlag[]
            },
            [`${room.id}:s`]: {
                id: `${room.id}:s`,
                fromRoomId: room.id,
                direction: 's' as const,
                toRoomId: targetId,
                isTwoWay: false,
                doorFlags: ['climb_down'] as ShaperDoorFlag[],
                climbDifficulty: 12,
                climbDamage: 3
            }
        };

        const preview = buildSelectedRoomDeployPreview(room, doc.rooms, exits, {});

        expect(preview.commands).toContain('/at 300:00 /room dadd e gate');
        expect(preview.commands).toContain('/at 300:00 /room cliset s 12 3');
        expect(preview.commands.at(-1)).toBe('/at 300:00 /room save');
    });

    it('pushes entity-attached redress libraries as room library commands', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const room = doc.rooms[doc.selectedRoomId];
        const commandNodes = {
            'obj-1': {
                id: 'obj-1',
                roomId: room.id,
                parentId: null,
                order: 0,
                type: 'object' as const,
                limit: { world: null, zone: null, room: 1, chancePercent: 100, raw: '100' },
                fields: { vnum: '9902', name: 'some cracked wood' },
                notes: ''
            }
        };
        const libraries = {
            'lib-1': {
                id: 'lib-1',
                targetType: 'object' as const,
                targetId: 'obj-1',
                name: 'redress-obj',
                parameters: { object: '9902', keywords: 'watchtower', 'short-desc': 'a watchtower is here' },
                requiresSupervisorReview: false,
                requiresLoad: true,
                notes: ''
            }
        };

        const preview = buildSelectedRoomDeployPreview(room, doc.rooms, {}, commandNodes, libraries);

        expect(preview.commands).toContain('/lib room 300:00 add redress-obj');
        expect(preview.commands).toContain('/lib room 300:00 set 1 object 9902');
        expect(preview.commands).toContain('/lib room 300:00 set 1 keywords watchtower');
        expect(preview.commands).toContain('/lib room 300:00 load');
    });

    it('does not save an empty selected-room deploy preview', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const room = doc.rooms[doc.selectedRoomId];

        const preview = buildSelectedRoomDeployPreview(room, doc.rooms, {}, {});

        expect(preview.commands).toEqual([]);
        expect(preview.warnings).toContain('Select or edit a room with deployable fields to generate commands.');
    });

    it('treats missing legacy text fields as empty instead of crashing', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const base = doc.rooms[doc.selectedRoomId];
        const legacyRoom = {
            ...base,
            name: undefined,
            preposition: undefined,
            description: undefined,
            owner: undefined,
            keywords: [{ id: 'legacy-keyword', keywords: ['plaque'], description: undefined }]
        } as Partial<ShaperRoomDraft> as ShaperRoomDraft;

        const preview = buildSelectedRoomDeployPreview(
            legacyRoom,
            { ...doc.rooms, [legacyRoom.id]: legacyRoom },
            doc.exits,
            {}
        );

        expect(preview.commands).toContain('/at 300:00 /room kadd plaque');
        expect(preview.commands.some(line => line.includes('/room desc'))).toBe(false);
        expect(preview.warnings).not.toContain('Description and keyword description previews require an editor-save deployment step.');
    });
});

describe('buildZoneDeployPreview', () => {
    it('aggregates every deployable room in room-number order and skips empty rooms', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const roomIds = Object.keys(doc.rooms);
        // Name two rooms (deployable); leave the rest empty.
        const rooms = {
            ...doc.rooms,
            [roomIds[1]]: { ...doc.rooms[roomIds[1]], name: 'Second room', preposition: 'in' },
            [roomIds[0]]: { ...doc.rooms[roomIds[0]], name: 'First room', preposition: 'in' }
        };

        const preview = buildZoneDeployPreview(rooms, {}, {});

        const nameCommands = preview.commands.filter(c => c.includes('/room name'));
        expect(nameCommands).toHaveLength(2);
        // Both rooms' commands appear, ordered by room number (lower first).
        const [lower, higher] = [rooms[roomIds[0]], rooms[roomIds[1]]]
            .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
        const lowerIdx = preview.commands.findIndex(c => c.startsWith(`/at ${lower.roomNumber} /room name`));
        const higherIdx = preview.commands.findIndex(c => c.startsWith(`/at ${higher.roomNumber} /room name`));
        expect(lowerIdx).toBeGreaterThanOrEqual(0);
        expect(higherIdx).toBeGreaterThan(lowerIdx);
        // Each deployable room ends with its own save.
        expect(preview.commands.filter(c => c.endsWith('/room save'))).toHaveLength(2);
    });

    it('warns when no room has deployable fields', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const preview = buildZoneDeployPreview(doc.rooms, {}, {});
        expect(preview.commands).toEqual([]);
        expect(preview.warnings).toContain('No rooms have deployable fields yet.');
    });
});

describe('buildMultiRoomDeployPreview', () => {
    it('deploys only the selected rooms, in room-number order, skipping others', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const roomIds = Object.keys(doc.rooms);
        const rooms = {
            ...doc.rooms,
            [roomIds[0]]: { ...doc.rooms[roomIds[0]], name: 'First room', preposition: 'in' },
            [roomIds[1]]: { ...doc.rooms[roomIds[1]], name: 'Second room', preposition: 'in' },
            [roomIds[2]]: { ...doc.rooms[roomIds[2]], name: 'Third room', preposition: 'in' }
        };

        // Select only rooms 0 and 2; room 1 must be excluded even though deployable.
        const preview = buildMultiRoomDeployPreview([roomIds[0], roomIds[2]], rooms, {}, {});

        const nameCommands = preview.commands.filter(c => c.includes('/room name'));
        expect(nameCommands).toHaveLength(2);
        expect(preview.commands.some(c => c.includes('First room'))).toBe(true);
        expect(preview.commands.some(c => c.includes('Third room'))).toBe(true);
        expect(preview.commands.some(c => c.includes('Second room'))).toBe(false);
        expect(preview.commands.filter(c => c.endsWith('/room save'))).toHaveLength(2);

        const [lower, higher] = [rooms[roomIds[0]], rooms[roomIds[2]]]
            .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
        const lowerIdx = preview.commands.findIndex(c => c.startsWith(`/at ${lower.roomNumber} /room name`));
        const higherIdx = preview.commands.findIndex(c => c.startsWith(`/at ${higher.roomNumber} /room name`));
        expect(higherIdx).toBeGreaterThan(lowerIdx);
    });

    it('ignores unknown ids and warns when no selected room is deployable', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const roomId = Object.keys(doc.rooms)[0];
        const preview = buildMultiRoomDeployPreview([roomId, 'does-not-exist'], doc.rooms, {}, {});
        expect(preview.commands).toEqual([]);
        expect(preview.warnings).toContain('No selected rooms have deployable fields yet.');
    });
});
