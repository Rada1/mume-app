// @vitest-environment jsdom
/**
 * @file useSpellCompletionTracker.test.ts
 * @description Tests for spell completion tracking and magiccomplete audio trigger.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellCompletionTracker } from './useSpellCompletionTracker';

describe('useSpellCompletionTracker', () => {
    let playIncantationSound: ReturnType<typeof vi.fn>;
    let playEffect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        playIncantationSound = vi.fn();
        playEffect = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('detects spell start and triggers incantation sound', () => {
        const { result } = renderHook(() => useSpellCompletionTracker({ playIncantationSound, playEffect }));

        act(() => {
            result.current.handleSpellLine(
                'You start to concentrate...',
                'you start to concentrate...',
                false
            );
        });

        expect(playIncantationSound).toHaveBeenCalledTimes(1);
        expect(result.current.lastSpellCastTimeRef.current).toBeGreaterThan(0);
    });

    it('plays magiccomplete when a completion message arrives within 5 seconds', () => {
        const { result } = renderHook(() => useSpellCompletionTracker({ playIncantationSound, playEffect }));

        act(() => {
            result.current.handleSpellLine(
                'You start to concentrate...',
                'you start to concentrate...',
                false
            );
        });

        // Advance 2 seconds (well within 5.0s window)
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        act(() => {
            result.current.handleSpellLine(
                'Your magic armour is revitalised.',
                'your magic armour is revitalised.',
                false
            );
        });

        expect(playEffect).toHaveBeenCalledWith('magiccomplete');
        // Once completed, cast timestamp is reset
        expect(result.current.lastSpellCastTimeRef.current).toBe(0);
    });

    it('does NOT play magiccomplete if the completion message arrives after 5 seconds', () => {
        const { result } = renderHook(() => useSpellCompletionTracker({ playIncantationSound, playEffect }));

        act(() => {
            result.current.handleSpellLine(
                'You start to concentrate...',
                'you start to concentrate...',
                false
            );
        });

        // Advance 5.5 seconds (exceeding 5.0s window)
        act(() => {
            vi.advanceTimersByTime(5500);
        });

        act(() => {
            result.current.handleSpellLine(
                'Your magic armour is revitalised.',
                'your magic armour is revitalised.',
                false
            );
        });

        expect(playEffect).not.toHaveBeenCalledWith('magiccomplete');
    });

    it('clears cast window if spell is interrupted or lost', () => {
        const { result } = renderHook(() => useSpellCompletionTracker({ playIncantationSound, playEffect }));

        act(() => {
            result.current.handleSpellLine(
                'You start to concentrate...',
                'you start to concentrate...',
                false
            );
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Interrupted
        act(() => {
            result.current.handleSpellLine(
                'You lost your concentration!',
                'you lost your concentration!',
                false
            );
        });

        expect(result.current.lastSpellCastTimeRef.current).toBe(0);

        // Subsequent message should not trigger completion
        act(() => {
            result.current.handleSpellLine(
                'Your magic armour is revitalised.',
                'your magic armour is revitalised.',
                false
            );
        });

        expect(playEffect).not.toHaveBeenCalled();
    });

    it('triggers magiccomplete for dynamic regex completions like fireball and sleep', () => {
        const { result } = renderHook(() => useSpellCompletionTracker({ playIncantationSound, playEffect }));

        // Fireball test
        act(() => {
            result.current.handleSpellLine('You start to concentrate...', 'you start to concentrate...', false);
        });
        act(() => {
            vi.advanceTimersByTime(1500);
            result.current.handleSpellLine(
                'Your fireball hits a pack horse with full force, causing an immediate death.',
                'your fireball hits a pack horse with full force, causing an immediate death.',
                false
            );
        });
        expect(playEffect).toHaveBeenCalledWith('magiccomplete');

        playEffect.mockClear();

        // Sleep test
        act(() => {
            result.current.handleSpellLine('You start to concentrate...', 'you start to concentrate...', false);
        });
        act(() => {
            vi.advanceTimersByTime(2000);
            result.current.handleSpellLine(
                'A pack horse lies down and falls asleep.',
                'a pack horse lies down and falls asleep.',
                false
            );
        });
        expect(playEffect).toHaveBeenCalledWith('magiccomplete');

        playEffect.mockClear();

        // Cure light test
        act(() => {
            result.current.handleSpellLine('You start to concentrate...', 'you start to concentrate...', false);
        });
        act(() => {
            vi.advanceTimersByTime(1200);
            result.current.handleSpellLine(
                'Your scratches and bruises disappear.',
                'your scratches and bruises disappear.',
                false
            );
        });
        expect(playEffect).toHaveBeenCalledWith('magiccomplete');
    });

    it('does NOT trigger magiccomplete on wear-off messages like shroud or bless expiration', () => {
        const { result } = renderHook(() => useSpellCompletionTracker({ playIncantationSound, playEffect }));

        act(() => {
            result.current.handleSpellLine('You start to concentrate...', 'you start to concentrate...', false);
        });
        act(() => {
            vi.advanceTimersByTime(1000);
            result.current.handleSpellLine(
                'The light of Aman fades away from you.',
                'the light of aman fades away from you.',
                false
            );
            result.current.handleSpellLine(
                'You feel more exposed.',
                'you feel more exposed.',
                false
            );
        });

        expect(playEffect).not.toHaveBeenCalledWith('magiccomplete');
    });

    it('ignores lines when isSnoop is true', () => {
        const { result } = renderHook(() => useSpellCompletionTracker({ playIncantationSound, playEffect }));

        act(() => {
            result.current.handleSpellLine('You start to concentrate...', 'you start to concentrate...', true);
        });

        expect(playIncantationSound).not.toHaveBeenCalled();
        expect(result.current.lastSpellCastTimeRef.current).toBe(0);
    });
});
