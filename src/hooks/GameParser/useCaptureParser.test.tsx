// @vitest-environment jsdom
/**
 * @file useCaptureParser.test.tsx
 * @description Regression coverage for inline inspection responses.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '../../stores/useUIStore';
import { CaptureParserDeps, useCaptureParser } from './useCaptureParser';

// --- Tests Section ---

afterEach(() => useUIStore.getState().setPopoverState(null));

const createDeps = (): CaptureParserDeps => ({
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
    registerEntity: vi.fn(),
    ansiConvert: { toHtml: (line: string) => line },
    captureStage: { current: 'none' }
});

describe('inline inspection capture', () => {
    it.each([
        ['whois', 'isCapturingWhois', 'capturedWhoisLines', 'Ryon is a Man Adventurer.'],
        ['examine', 'isCapturingExamine', 'capturedExamineLines', 'You see a gatekeeper.'],
        ['consider', 'isCapturingConsider', 'capturedConsiderLines', 'You could beat the gatekeeper.']
    ] as const)('places %s output in the active popover', (type, loadingKey, linesKey, reply) => {
        const deps = createDeps();
        const store = useUIStore.getState();
        store.setPopoverState({ x: 0, y: 0, setId: 'inline-ally', context: 'Ryon', [loadingKey]: true });
        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.setPendingFlags(true, false, `${type} Ryon`);
            result.current.startSession(type);
            result.current.accumulateLine(reply);
            result.current.finalizeSession();
        });

        expect(useUIStore.getState().popoverState).toMatchObject({
            [loadingKey]: false,
            [linesKey]: [reply]
        });
    });
});
