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

    it('emits full-desc as an editor block, not an inline set value', () => {
        let doc = createDefaultShaperDocument({ zoneNumber: 300 });
        doc = addShaperLibrary(doc, 'object', '4500', 'redress-obj');
        const redress = listShaperLibraries(doc, 'object', '4500')[0];
        doc = setShaperLibraryParam(doc, redress.id, 'short-desc', 'a rusty key');
        doc = setShaperLibraryParam(doc, redress.id, 'full-desc', 'A small rusty key.\nIt is covered in grime.');

        const commands = buildShaperLibraryCommands(
            listShaperLibraries(doc, 'object', '4500'),
            'object',
            '4500'
        );

        // Single-line fields stay inline.
        expect(commands).toContain('/lib object 4500 set 1 short-desc a rusty key');
        // full-desc opens the editor: opener line carries no value, body is indented,
        // and a [save editor] marker closes the block.
        expect(commands).toContain('/lib object 4500 set 1 full-desc');
        expect(commands).not.toContain('/lib object 4500 set 1 full-desc A small rusty key.');
        expect(commands).toContain('  A small rusty key.');
        expect(commands).toContain('  It is covered in grime.');
        expect(commands).toContain('  [save editor]');
    });

    it('skips a full-desc editor block when the value is empty', () => {
        let doc = createDefaultShaperDocument({ zoneNumber: 300 });
        doc = addShaperLibrary(doc, 'object', '4500', 'redress-obj');
        const redress = listShaperLibraries(doc, 'object', '4500')[0];
        doc = setShaperLibraryParam(doc, redress.id, 'full-desc', '   ');

        const commands = buildShaperLibraryCommands(
            listShaperLibraries(doc, 'object', '4500'),
            'object',
            '4500'
        );

        expect(commands.some(line => line.includes('full-desc'))).toBe(false);
        expect(commands.some(line => line.includes('[save editor]'))).toBe(false);
    });
});
