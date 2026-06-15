/**
 * @file shaperLiveTranscript.test.ts
 * @description Tests live MUME transcript block splitting for Shaper imports.
 */

import { describe, expect, it } from 'vitest';
import { parseShaperLiveTranscript } from '../shaperLiveTranscript';

// --- Test Section ---
describe('shaperLiveTranscript', () => {
    it('splits prompt-prefixed live read commands into output blocks', () => {
        const blocks = parseShaperLiveTranscript(`
* W C Mana:Burning > /info z 31 map
North road notes.
* W C Mana:Burning > /at 31:04 /stat room full
Name: [A quiet road]
Sector: [road]
`);

        expect(blocks).toEqual([
            { command: '/info z 31 map', output: 'North road notes.' },
            { command: '/at 31:04 /stat room full', output: 'Name: [A quiet road]\nSector: [road]' }
        ]);
    });

    it('recognizes explicit /info zone keyword reads', () => {
        const blocks = parseShaperLiveTranscript(`
* W C Mana:Burning > /info zone 31 asciimap read
Key
`);

        expect(blocks).toEqual([
            { command: '/info zone 31 asciimap read', output: 'Key' }
        ]);
    });
});
