/**
 * @file shaperLiveImportPlan.test.ts
 * @description Tests live-zone read command planning for Shaper imports.
 */

import { describe, expect, it } from 'vitest';
import { buildShaperLiveReadPlan, buildShaperRoomReadCommands } from '../shaperLiveImportPlan';

// --- Test Section ---
describe('shaperLiveImportPlan', () => {
    it('starts with zone discovery commands', () => {
        const plan = buildShaperLiveReadPlan({ zoneNumber: 31 });

        expect(plan.commands.map(item => item.command)).toEqual([
            '/stat zone 31',
            '/zone 31 list',
            '/info z 31 list'
        ]);
    });

    it('builds room scan commands for stat, com, and room libs', () => {
        expect(buildShaperRoomReadCommands('31:04').map(item => item.command)).toEqual([
            '/at 31:04 /stat room full',
            '/at 31:04 /com list -commands',
            '/lib room 31:04 list'
        ]);
    });

    it('keeps zone info keywords separate from room scans', () => {
        const plan = buildShaperLiveReadPlan({
            zoneNumber: 31,
            roomNumbers: ['31:04'],
            zoneInfoKeywords: ['map', 'history', 'map']
        });

        expect(plan.commands.map(item => item.command)).toContain('/info z 31 map');
        expect(plan.commands.map(item => item.command)).toContain('/info z 31 history');
        expect(plan.commands.filter(item => item.phase === 'zone-info')).toHaveLength(2);
        expect(plan.commands.filter(item => item.phase === 'room-scan')).toHaveLength(3);
    });

    it('can generate a default 00-99 grid scan when requested', () => {
        const plan = buildShaperLiveReadPlan({ zoneNumber: 31, includeGridRooms: true });

        expect(plan.commands.filter(item => item.phase === 'room-scan')).toHaveLength(300);
        expect(plan.commands.map(item => item.command)).toContain('/at 31:00 /stat room full');
        expect(plan.commands.map(item => item.command)).toContain('/at 31:99 /stat room full');
    });
});
