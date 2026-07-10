/**
 * @file roomItemDetection.test.ts
 * @description Regression tests for room item tracking eligibility.
 */

import { describe, expect, it } from 'vitest';
import { isEnvironmentEventLine } from '../../../utils/environmentEventUtils';
import { hasXmlTag } from '../../../utils/xmlTagUtils';
import { classifyRoutedMessageType, shouldDetectRoomItemsFromLine } from '../useMessageRouter';

// --- Logic Section ---
describe('shouldDetectRoomItemsFromLine', () => {
    it('rejects worn equipment slot lines', () => {
        expect(shouldDetectRoomItemsFromLine(
            '<worn on body> a fine metal breastplate',
            '&lt;worn on body&gt; a <object>fine metal breastplate</object>'
        )).toBe(false);
    });

    it('rejects pending equipment capture before the capture session starts', () => {
        expect(shouldDetectRoomItemsFromLine(
            'a fine metal breastplate',
            '<object>a fine metal breastplate</object>',
            { expectedCaptureType: 'equipment' }
        )).toBe(false);
    });

    it('allows tagged objects from room context', () => {
        expect(shouldDetectRoomItemsFromLine(
            'A rusty sword is here.',
            'A <object>rusty sword</object> is here.'
        )).toBe(true);
    });
});

describe('isEnvironmentEventLine', () => {
    it('recognizes sun, moon, darkness, and weather text events', () => {
        expect(isEnvironmentEventLine('The sun sets.'.toLowerCase())).toBe(true);
        expect(isEnvironmentEventLine('The evening star rises and shimmers with white fire above Valinor.'.toLowerCase())).toBe(true);
        expect(isEnvironmentEventLine('The moon rises.'.toLowerCase())).toBe(true);
        expect(isEnvironmentEventLine('The sheen of the moon graces the sky no more as Tilion carries it away west.'.toLowerCase())).toBe(true);
        expect(isEnvironmentEventLine("The Necromancer's darkness grows.".toLowerCase())).toBe(true);
        expect(isEnvironmentEventLine('It starts to rain.'.toLowerCase())).toBe(true);
    });
});

describe('hasXmlTag', () => {
    it('recognizes raw and escaped status tags', () => {
        expect(hasXmlTag('<status>dark</status>', 'status')).toBe(true);
        expect(hasXmlTag('&lt;status&gt;dark&lt;/status&gt;', 'status')).toBe(true);
        expect(hasXmlTag('<room>dark</room>', 'status')).toBe(false);
    });
});

describe('useMessageRouter', () => {
    it('routes raw and escaped weather XML tags as weather messages', () => {
        expect(classifyRoutedMessageType(
            'game',
            'It starts to rain.',
            'it starts to rain.',
            '<weather>It starts to rain.</weather>',
            '',
            false,
            false
        )).toBe('weather');

        expect(classifyRoutedMessageType(
            'game',
            'The air grows colder.',
            'the air grows colder.',
            '&lt;weather&gt;The air grows colder.&lt;/weather&gt;',
            '',
            false,
            false
        )).toBe('weather');
    });
});
