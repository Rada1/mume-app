/**
 * @file useShaperLiveImportRunner.test.ts
 * @description Regression tests for Shaper live import command sequencing.
 */

import { describe, expect, it } from 'vitest';
import {
    buildShaperRoomLiveImportCommands,
    buildShaperZoneInfoListCommand,
    buildShaperZoneInfoReadCommand
} from '../useShaperLiveImportRunner';

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
