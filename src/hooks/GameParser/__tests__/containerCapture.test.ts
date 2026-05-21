/**
 * @file containerCapture.test.ts
 * @description Unit tests for container log capture parser triggers and behavior.
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { useCaptureParser, CaptureParserDeps } from '../useCaptureParser';
import { renderHook, act } from '@testing-library/react';

describe('useCaptureParser container triggers', () => {
    const createMockDeps = (): CaptureParserDeps => ({
        captureSession: null,
        setCaptureSession: vi.fn(),
        setInventoryLines: vi.fn(),
        setEqLines: vi.fn(),
        setStatsLines: vi.fn(),
        setPracticeLines: vi.fn(),
        setWhoLines: vi.fn(),
        setWhoList: vi.fn(),
        setScoreLines: vi.fn(),
        setInfoLines: vi.fn(),
        setQuestLines: vi.fn(),
        setAchievementLines: vi.fn(),
        setContainerContents: vi.fn(),
        registerEntity: vi.fn(),
        ansiConvert: { toHtml: (s: string) => s },
        captureStage: { current: 'idle' }
    });

    it('detects look inside container lines', () => {
        const deps = createMockDeps();
        const { result } = renderHook(() => useCaptureParser(deps));

        // Test normal container headers
        expect(result.current.checkTriggers('When you look inside the pouch, you see:')).toBe('container');
        expect(result.current.checkTriggers('When you look inside the sack, it is empty.')).toBe('container');
        expect(result.current.checkTriggers('When you look in the backpack, you see:')).toBe('container');
        
        // Test non-matching lines
        expect(result.current.checkTriggers('You see nothing special.')).toBeNull();
        expect(result.current.checkTriggers('a leather pouch')).toBeNull();
    });

    it('correctly associates lastRequestedContainerId with the capture session', () => {
        const deps = createMockDeps();
        const { result } = renderHook(() => useCaptureParser(deps));

        // 1. Set the last requested container ID
        act(() => {
            result.current.setLastRequestedContainerId('container-item-99');
        });

        // 2. Start a container session
        act(() => {
            result.current.startSession('container');
        });

        // Check that setCaptureSession was called with container metadata containing containerId
        expect(deps.setCaptureSession).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'container',
                metadata: {
                    containerId: 'container-item-99'
                }
            })
        );
    });

    it('updates containerContents state when finalizing container session', () => {
        const deps = createMockDeps();
        const { result } = renderHook(() => useCaptureParser(deps));

        // Start session and accumulate lines
        act(() => {
            result.current.setLastRequestedContainerId('container-item-99');
            result.current.startSession('container');
        });

        // Feed some items in container
        act(() => {
            result.current.accumulateLine('a wooden key');
            result.current.accumulateLine('a loaf of bread');
        });

        // Finalize session
        act(() => {
            result.current.finalizeSession();
        });

        // Expect setContainerContents to have been called
        expect(deps.setContainerContents).toHaveBeenCalled();
        const updateFn = (deps.setContainerContents as any).mock.calls[0][0];
        const initialContents = {};
        const newContents = updateFn(initialContents);

        expect(newContents['container-item-99']).toBeDefined();
        expect(newContents['container-item-99'].length).toBe(2);
        expect(newContents['container-item-99'][0].text).toBe('a wooden key');
        expect(newContents['container-item-99'][1].text).toBe('a loaf of bread');
    });

    it('correctly classifies header lines and item lines in container session', () => {
        const deps = createMockDeps();
        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.setLastRequestedContainerId('container-item-99');
            result.current.startSession('container');
        });

        act(() => {
            result.current.accumulateLine('<header>In your sable pouch (worn on belt):</header>');
            result.current.accumulateLine('a red ruby');
        });

        act(() => {
            result.current.finalizeSession();
        });

        const updateFn = (deps.setContainerContents as any).mock.calls[0][0];
        const newContents = updateFn({});
        const lines = newContents['container-item-99'];

        expect(lines).toBeDefined();
        expect(lines.length).toBe(2);

        // Header line
        expect(lines[0].text).toBe('In your sable pouch (worn on belt):');
        expect(lines[0].isHeader).toBe(true);
        expect(lines[0].isItem).toBe(false);

        // Item line
        expect(lines[1].text).toBe('a red ruby');
        expect(lines[1].isHeader).toBe(false);
        expect(lines[1].isItem).toBe(true);
    });

    it('stores the command in the capture session metadata and exposes via getSession', () => {
        const deps = createMockDeps();
        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.setPendingFlags(false, false, 'look in sable pouch');
            result.current.startSession('container');
        });

        const session = result.current.getSession?.();
        expect(session).toBeDefined();
        expect(session?.metadata?.command).toBe('look in sable pouch');
    });
});
