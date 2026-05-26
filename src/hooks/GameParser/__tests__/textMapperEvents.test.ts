/**
 * @file textMapperEvents.test.ts
 * @description Tests text/XML room facts used by the mapper without GMCP.
 */

import { describe, expect, it } from 'vitest';
import { consumeTextMapperLine, createTextMapperState, extractXmlMovementDir } from '../textMapperEvents';

// --- Logic Section ---
describe('textMapperEvents', () => {
    it('builds a room event from XML room tags', () => {
        const state = createTextMapperState();

        consumeTextMapperLine(state, '<room area="Wold" terrain="field">', false);
        consumeTextMapperLine(state, '<name>Grassy Plains</name>', false);
        consumeTextMapperLine(state, '<description>A clear spring bubbles here.</description>', false);
        consumeTextMapperLine(state, '<exits>North East South West</exits>', false);
        const result = consumeTextMapperLine(state, '</room>', false);

        expect(result.event).toMatchObject({
            num: 0,
            name: 'Grassy Plains',
            desc: 'A clear spring bubbles here.',
            area: 'Wold',
            terrain: 'field',
            source: 'text'
        });
        expect(Object.keys(result.event?.exits || {})).toEqual(['n', 'e', 's', 'w']);
    });

    it('parses expanded visible exit lines', () => {
        const state = createTextMapperState();

        consumeTextMapperLine(state, '<room>', false);
        consumeTextMapperLine(state, '<name>Hidden Spring in the Grass</name>', false);
        consumeTextMapperLine(state, 'North - Dirt-packed Plains', false);
        consumeTextMapperLine(state, 'East  - Barren Plains', false);
        const result = consumeTextMapperLine(state, '>', true);

        expect(result.event?.exits?.n?.name).toBe('Dirt-packed Plains');
        expect(result.event?.exits?.e?.name).toBe('Barren Plains');
    });

    it('extracts movement directions from MUME XML movement tags', () => {
        expect(extractXmlMovementDir('<movement dir=south/>')).toBe('s');
        expect(extractXmlMovementDir('&lt;movement dir="northwest"/&gt;')).toBe('nw');
        expect(extractXmlMovementDir('<movement/>')).toBe('');
    });
});
