// @vitest-environment jsdom
/**
 * @file useCaptureParser.test.tsx
 * @description Regression coverage for inline inspection responses.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '../../stores/useUIStore';
import { CaptureParserDeps, useCaptureParser } from './useCaptureParser';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';
import { canBootstrapExpectedCapture } from './captureBootstrap';
import { useArchiveStore } from '../../stores/useArchiveStore';

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
    it('keeps numbered mailbox rows with their mailbox heading', () => {
        const deps = createDeps();
        deps.captureStage.current = 'mail_list';
        useArchiveStore.getState().setActiveView('mail-inbox');
        const {result} = renderHook(() => useCaptureParser(deps));
        act(() => {
            result.current.setPendingFlags(false, false, 'l mail');
            result.current.startSession('mail_list');
            result.current.accumulateLine('Mail - 1 message');
            expect(result.current.checkTriggers('1 : @Ellessar (Ellessar)')).toBe('mail_list');
            result.current.accumulateLine('1 : @Ellessar (Ellessar)');
            result.current.finalizeSession();
        });
        expect(useArchiveStore.getState().entriesByView['mail-inbox']).toMatchObject([{id:1,subject:'@Ellessar',author:'Ellessar'}]);
    });
    it('allows board and book captures to start from plain output', () => {
        expect(['board_list', 'board_read', 'book_read'].map(canBootstrapExpectedCapture)).toEqual([true, true, true]);
    });
    it('stores silent corpse and inventory snapshots for the loot workflow', () => {
        const deps = createDeps();
        const {result} = renderHook(() => useCaptureParser(deps));
        useCorpseContentsStore.getState().clearContents();
        useCorpseContentsStore.getState().requestContents('loot-body', 'rider-corpse');
        act(() => {
            result.current.setPendingFlags(true, true, 'examine rider-corpse');
            result.current.startSession('examine');
            result.current.accumulateLine('In the corpse of a rider:');
            result.current.accumulateLine('a steel sword');
            result.current.finalizeSession();
            result.current.setPendingFlags(true, true, 'inventory');
            result.current.startSession('inventory');
            result.current.accumulateLine('You are carrying:');
            result.current.accumulateLine('a steel sword');
            result.current.finalizeSession();
        });
        expect(useCorpseContentsStore.getState().contents['loot-body']?.map(line => line.text)).toContain('a steel sword');
        expect(deps.setInventoryLines).toHaveBeenCalled();
        useCorpseContentsStore.getState().clearContents();
    });
    it.each(['inventory', 'equipment', 'container'] as const)('keeps an empty %s listing out of item registration', type => {
        const deps = createDeps();
        const {result} = renderHook(() => useCaptureParser(deps));
        act(() => {
            result.current.startSession(type);
            result.current.accumulateLine('Nothing.');
        });
        expect(deps.registerEntity).not.toHaveBeenCalled();
        const session = vi.mocked(deps.setCaptureSession).mock.calls.at(-1)?.[0];
        expect(session?.lines).toMatchObject([{text: 'Nothing.', isItem: false}]);
    });

    it('captures generic Info command output into the Details report', () => {
        const deps = createDeps();
        const reply = 'It is a clear, starry night.';
        useUIStore.getState().setPopoverState({
            x: 0,
            y: 0,
            setId: 'trait-personal-information',
            isCapturingCommandReport: true,
            commandReportCommand: 'time',
            commandReportLabel: 'Time'
        });
        deps.captureStage.current = 'command_report';
        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.setPendingFlags(false, false, 'time');
            expect(result.current.checkTriggers('> time')).toBeNull();
            const type = result.current.checkTriggers(reply);
            expect(type).toBe('command_report');
            if (type) {
                result.current.startSession(type);
                result.current.accumulateLine(reply);
                result.current.finalizeSession();
            }
        });

        expect(useUIStore.getState().popoverState).toMatchObject({
            isCapturingCommandReport: false,
            commandReportLabel: 'Time',
            capturedCommandReportLines: [reply]
        });
    });

    it('captures book contents into Details without opening the archive', () => {
        const deps = createDeps();
        const command = 'read 2.book';
        useUIStore.getState().setPopoverState({x:0, y:0, setId:'book', commandPanelCapture:true,
            commandReportCommand:command, commandReportLabel:'2.book', isCapturingCommandReport:true});
        const {result} = renderHook(() => useCaptureParser(deps));
        act(() => {
            result.current.setPendingFlags(true, true, command);
            result.current.startSession('book_read');
            result.current.accumulateLine('First page of the story.');
            result.current.finalizeSession();
        });
        expect(useUIStore.getState().popoverState).toMatchObject({
            isCapturingCommandReport:false, capturedCommandReportLines:['First page of the story.']
        });
    });

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
