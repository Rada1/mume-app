/**
 * @file shaperLibraries.test.ts
 * @description Tests for /lib install operations and command serialization.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import {
    addShaperLibrary,
    buildShaperLibraryCommands,
    listShaperLibraries,
    setShaperLibraryParam
} from '../shaperLibraries';

// --- Test Section ---
describe('shaper libraries', () => {
    it('installs a catalog library with its supervisor-review flag', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 300 });
        const roomId = doc.selectedRoomId;
        const next = addShaperLibrary(doc, 'mobile', '1313', 'script');
        const installs = listShaperLibraries(next, 'mobile', '1313');

        expect(installs).toHaveLength(1);
        expect(installs[0].requiresSupervisorReview).toBe(true);
        expect(installs[0].requiresLoad).toBe(true);
        // Unrelated room target stays empty.
        expect(listShaperLibraries(next, 'room', roomId)).toHaveLength(0);
    });

    it('does not install the same library twice on one target', () => {
        let doc = createDefaultShaperDocument({ zoneNumber: 300 });
        doc = addShaperLibrary(doc, 'room', 'room-a', 'fishable');
        doc = addShaperLibrary(doc, 'room', 'room-a', 'fishable');
        expect(listShaperLibraries(doc, 'room', 'room-a')).toHaveLength(1);
    });

    it('serializes add, set, and a single load command', () => {
        let doc = createDefaultShaperDocument({ zoneNumber: 300 });
        doc = addShaperLibrary(doc, 'room', 'room-a', 'fishable');
        doc = addShaperLibrary(doc, 'room', 'room-a', 'fog');
        const fog = listShaperLibraries(doc, 'room', 'room-a').find(item => item.name === 'fog');
        doc = setShaperLibraryParam(doc, fog!.id, 'level', '3');

        const commands = buildShaperLibraryCommands(
            listShaperLibraries(doc, 'room', 'room-a'),
            'room',
            '300:00'
        );

        expect(commands).toContain('/lib room 300:00 add fishable');
        expect(commands).toContain('/lib room 300:00 add fog');
        expect(commands).toContain('/lib room 300:00 set 2 level 3');
        expect(commands.filter(line => line.endsWith('load'))).toHaveLength(1);
    });
});
