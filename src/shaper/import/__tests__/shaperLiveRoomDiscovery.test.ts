/**
 * @file shaperLiveRoomDiscovery.test.ts
 * @description Tests parsing `/misc build list` room discovery output.
 */

import { describe, expect, it } from 'vitest';
import { parseShaperBuildListRooms } from '../shaperLiveRoomDiscovery';

// --- Test Section ---
describe('shaperLiveRoomDiscovery', () => {
    it('extracts only rooms in the requested project zone', () => {
        const rooms = parseShaperBuildListRooms(`
31:00 31: 2 3104
32:00 should not import
Room 31:12 (3112) - among the Great Roots
`, 31);

        expect(rooms).toEqual(['31:00', '31:02', '31:04', '31:12']);
    });

    it('parses live /misc build list output with bracketed room ids', () => {
        const rooms = parseShaperBuildListRooms(`
[31:0]    in a Thinning of Trees       {forest}    BUILD
[31:1]    at the Head of a Wide Ravine  {forest}    BUILD
[31:8]    on a Jagged Crag              {hills}     BUILD
[31:10]   in a Muddy Pit Surrounded by  {forest}    BUILD
[31:16]   on an Elevated Perch          {mountains} BUILD
`, 31);

        expect(rooms).toEqual(['31:00', '31:01', '31:08', '31:10', '31:16']);
    });
});
