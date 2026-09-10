/**
 * @file commandCompletionSounds.test.ts
 * @description Unit tests for reply-bound command sound scheduling.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    clearCommandCompletionSounds,
    consumeCommandCompletionSound,
    queueCommandCompletionSound
} from './commandCompletionSounds';

describe('command completion sounds', () => {
    afterEach(() => {
        clearCommandCompletionSounds();
        vi.useRealTimers();
    });

    it('plays queued effects in reply order', () => {
        queueCommandCompletionSound('look');
        queueCommandCompletionSound('who');

        expect(consumeCommandCompletionSound()).toBe('look');
        expect(consumeCommandCompletionSound()).toBe('who');
        expect(consumeCommandCompletionSound()).toBeNull();
    });

    it('discards effects whose command never receives a reply', () => {
        vi.useFakeTimers();
        queueCommandCompletionSound('eqinventory');
        vi.advanceTimersByTime(30_001);

        expect(consumeCommandCompletionSound()).toBeNull();
    });
});
