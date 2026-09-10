// @vitest-environment jsdom
/**
 * @file useTriggerProcessor.test.ts
 * @description Unit tests for useTriggerProcessor, ensuring room descriptions skip sound triggers.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTriggerProcessor } from './useTriggerProcessor';

describe('useTriggerProcessor', () => {
    it('plays sound when trigger matches normal game text', () => {
        const playSound = vi.fn();
        const playRandomSound = vi.fn();
        const isSoundEnabledRef = { current: true };
        const dummyBuffer = {} as AudioBuffer;
        const soundTriggersRef = {
            current: [
                { pattern: 'orc', isRegex: false, buffer: dummyBuffer }
            ]
        };

        const { result } = renderHook(() => useTriggerProcessor({
            isSoundEnabledRef,
            soundTriggersRef,
            playSound,
            playRandomSound,
            buttonsRef: { current: [] },
            setButtons: vi.fn(),
            buttonTimers: { current: {} },
            setActiveSet: vi.fn(),
            actionsRef: { current: [] },
            executeCommandRef: { current: vi.fn() }
        }));

        result.current.processTriggers('An orc wanders in.');
        expect(playSound).toHaveBeenCalledWith(dummyBuffer);
    });

    it('does not play sound when trigger matches text within a room description', () => {
        const playSound = vi.fn();
        const playRandomSound = vi.fn();
        const isSoundEnabledRef = { current: true };
        const dummyBuffer = {} as AudioBuffer;
        const soundTriggersRef = {
            current: [
                { pattern: 'orc', isRegex: false, buffer: dummyBuffer }
            ]
        };

        const { result } = renderHook(() => useTriggerProcessor({
            isSoundEnabledRef,
            soundTriggersRef,
            playSound,
            playRandomSound,
            buttonsRef: { current: [] },
            setButtons: vi.fn(),
            buttonTimers: { current: {} },
            setActiveSet: vi.fn(),
            actionsRef: { current: [] },
            executeCommandRef: { current: vi.fn() }
        }));

        result.current.processTriggers('Long ago, an orc clan burned this tower.', true);
        expect(playSound).not.toHaveBeenCalled();
    });
});
