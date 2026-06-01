/**
 * @file roomItemDetection.test.ts
 * @description Regression tests for room item tracking eligibility.
 */

import { describe, expect, it } from 'vitest';
import { shouldDetectRoomItemsFromLine } from '../useMessageRouter';

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
