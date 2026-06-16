/**
 * @file useShaperLiveImportRunner.test.ts
 * @description Regression tests for Shaper live import command sequencing.
 */

import { describe, expect, it } from 'vitest';
import {
    buildShaperRoomLiveImportCommands,
    buildShaperZoneInfoListCommand,
    buildShaperZoneInfoReadCommand,
    findShaperFollowUpRoomNumbers
} from '../useShaperLiveImportRunner';
import { createDefaultShaperDocument } from '../../model/shaperDocument';

// --- Test Section ---
describe('buildShaperRoomLiveImportCommands', () => {
    it('reads room libraries through the rich room list command', () => {
        expect(buildShaperRoomLiveImportCommands('31:50')).toEqual([
            '/at 31:50 /stat room full',
            '/at 31:50 /com list',
            '/lib room 31:50 list'
        ]);
    });

    it('canonicalizes padded grid room ids for MUME commands', () => {
        expect(buildShaperRoomLiveImportCommands('31:08')[2]).toBe('/lib room 31:8 list');
    });
});

describe('Shaper zone info import commands', () => {
    it('uses explicit zone keyword list and read commands', () => {
        expect(buildShaperZoneInfoListCommand(31)).toBe('/info zone 31 list');
        expect(buildShaperZoneInfoReadCommand(31, 'asciimap')).toBe('/info zone 31 asciimap read');
    });
});

describe('findShaperFollowUpRoomNumbers', () => {
    it('queues same-zone exit-created rooms that were not in the build-list pass', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 188 });
        const importedRoom = Object.values(doc.rooms).find(item => item.roomNumber === '188:07');
        const exitTarget = Object.values(doc.rooms).find(item => item.roomNumber === '188:17');
        expect(importedRoom).toBeTruthy();
        expect(exitTarget).toBeTruthy();
        if (importedRoom) {
            doc.rooms[importedRoom.id] = {
                ...importedRoom,
                liveSnapshot: { importedAt: 1234, statRoomFull: 'East 188: 17, flags: none' }
            };
        }

        const imported = new Set(['188:07', '188:18', '188:27']);
        expect(findShaperFollowUpRoomNumbers(doc, imported)).toContain('188:17');
    });
});
