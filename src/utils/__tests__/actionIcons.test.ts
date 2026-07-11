/**
 * @file actionIcons.test.ts
 * @description Verifies the action-button verb→icon resolver.
 */

import { describe, expect, it } from 'vitest';
import { Eye, Tent, FlameKindling, Swords, BookOpen, Play } from 'lucide-react';
import { resolveActionIcon } from '../actionIcons';

describe('resolveActionIcon', () => {
    it('maps known verbs to their icon', () => {
        expect(resolveActionIcon('watch')).toBe(Eye);
        expect(resolveActionIcon('read')).toBe(BookOpen);
    });

    it('distinguishes camp (campfire) from camp rent (tent) by full command', () => {
        expect(resolveActionIcon('camp')).toBe(FlameKindling);
        expect(resolveActionIcon('camp rent')).toBe(Tent);
    });

    it('keys on the leading verb of a multi-word command', () => {
        expect(resolveActionIcon('kill orc')).toBe(Swords);
        expect(resolveActionIcon('look sign')).toBe(Eye);
    });

    it('falls back to the label when the command verb is unknown', () => {
        expect(resolveActionIcon('', 'Watch')).toBe(Eye);
    });

    it('returns a neutral default for unmapped actions', () => {
        expect(resolveActionIcon('frobnicate')).toBe(Play);
        expect(resolveActionIcon('')).toBe(Play);
    });
});
