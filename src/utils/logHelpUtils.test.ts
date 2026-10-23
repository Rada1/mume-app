/**
 * @file logHelpUtils.test.ts
 * @description Unit tests for log help click extraction and dispatch.
 */
// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractTopicFromLogClick, handleLogHelpClick } from './logHelpUtils';
import { cleanTopicCandidate, dispatchCommandHelp } from './commandHelpUtils';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useUIStore } from '../stores/useUIStore';

describe('logHelpUtils', () => {
    beforeEach(() => {
        useCommandPanelStore.setState({ isHelpMode: false, isOpen: true, isMobileGuideOpen: false });
        useUIStore.setState({ popoverState: null });
        vi.restoreAllMocks();
    });

    describe('cleanTopicCandidate', () => {
        it('cleans leading and trailing punctuation while preserving inner characters', () => {
            expect(cleanTopicCandidate("'cure light'")).toBe('cure light');
            expect(cleanTopicCandidate('"flee!"')).toBe('flee');
            expect(cleanTopicCandidate('(parry)')).toBe('parry');
            expect(cleanTopicCandidate('[exits].')).toBe('exits');
            expect(cleanTopicCandidate('  bash  ')).toBe('bash');
            expect(cleanTopicCandidate('cure-light')).toBe('cure-light');
        });
    });

    describe('extractTopicFromLogClick', () => {
        it('prioritizes text selection if present', () => {
            vi.spyOn(window, 'getSelection').mockReturnValue({
                toString: () => '  sanctuary  '
            } as any);

            const dummyEvent = {
                target: document.createElement('div')
            } as any;

            expect(extractTopicFromLogClick(dummyEvent)).toBe('sanctuary');
        });

        it('extracts topic from clicked inline button data-cmd', () => {
            vi.spyOn(window, 'getSelection').mockReturnValue(null);

            const btn = document.createElement('button');
            btn.className = 'inline-btn';
            btn.setAttribute('data-cmd', 'cast fireball %n');
            btn.textContent = 'Fireball';

            const dummyEvent = { target: btn } as any;
            expect(extractTopicFromLogClick(dummyEvent)).toBe('cast fireball %n');
        });

        it('extracts topic from clicked inline button data-context fallback', () => {
            vi.spyOn(window, 'getSelection').mockReturnValue(null);

            const btn = document.createElement('button');
            btn.className = 'inline-btn';
            btn.setAttribute('data-context', 'orc');
            btn.textContent = 'an orc';

            const dummyEvent = { target: btn } as any;
            expect(extractTopicFromLogClick(dummyEvent)).toBe('orc');
        });

        it('extracts topic from clicked word element (.log-text-word)', () => {
            vi.spyOn(window, 'getSelection').mockReturnValue(null);

            const span = document.createElement('span');
            span.className = 'log-text-word';
            span.textContent = 'flee!';

            const dummyEvent = { target: span } as any;
            expect(extractTopicFromLogClick(dummyEvent)).toBe('flee');
        });

        it('returns null if target is not element or has no recognizable content', () => {
            vi.spyOn(window, 'getSelection').mockReturnValue(null);
            const dummyEvent = { target: null } as any;
            expect(extractTopicFromLogClick(dummyEvent)).toBeNull();
        });
    });

    describe('dispatchCommandHelp', () => {
        it('sets capturing help state in popover store and executes command', () => {
            const executeCommand = vi.fn();
            useCommandPanelStore.setState({ isOpen: false, isHelpMode: true });

            const success = dispatchCommandHelp('con %n', executeCommand);
            expect(success).toBe(true);

            // Opens command panel and exits help mode
            expect(useCommandPanelStore.getState().isOpen).toBe(true);
            expect(useCommandPanelStore.getState().isHelpMode).toBe(false);

            // Arm popoverState with help details
            const popover = useUIStore.getState().popoverState;
            expect(popover?.isCapturingHelp).toBe(true);
            expect(popover?.helpTopic).toBe('consider');
            expect(popover?.hasInspectionCard).toBe(true);

            // Dispatches server help command
            expect(executeCommand).toHaveBeenCalledWith(
                'help consider',
                false,
                false,
                false,
                false,
                { shouldFocus: false, fromUi: true }
            );
        });

        it('handles mobile viewport opening mobile guide', () => {
            const executeCommand = vi.fn();
            useCommandPanelStore.setState({ isMobileGuideOpen: false, isHelpMode: true });

            const success = dispatchCommandHelp('flee', executeCommand, true);
            expect(success).toBe(true);
            expect(useCommandPanelStore.getState().isMobileGuideOpen).toBe(true);
        });
    });

    describe('handleLogHelpClick', () => {
        it('returns false immediately when not in help mode', () => {
            useCommandPanelStore.setState({ isHelpMode: false });
            const executeCommand = vi.fn();
            const dummyEvent = {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                target: document.createElement('div')
            } as any;

            const handled = handleLogHelpClick(dummyEvent, executeCommand);
            expect(handled).toBe(false);
            expect(executeCommand).not.toHaveBeenCalled();
            expect(dummyEvent.preventDefault).not.toHaveBeenCalled();
        });

        it('consumes event and dispatches help when in help mode', () => {
            useCommandPanelStore.setState({ isHelpMode: true });
            const executeCommand = vi.fn();

            const span = document.createElement('span');
            span.className = 'log-text-word';
            span.textContent = 'bash';

            const dummyEvent = {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                target: span
            } as any;

            const handled = handleLogHelpClick(dummyEvent, executeCommand);
            expect(handled).toBe(true);
            expect(dummyEvent.preventDefault).toHaveBeenCalled();
            expect(dummyEvent.stopPropagation).toHaveBeenCalled();
            expect(executeCommand).toHaveBeenCalledWith(
                'help bash',
                false,
                false,
                false,
                false,
                { shouldFocus: false, fromUi: true }
            );
            expect(useCommandPanelStore.getState().isHelpMode).toBe(false);
        });

        it('cancels help mode if empty space clicked', () => {
            useCommandPanelStore.setState({ isHelpMode: true });
            const executeCommand = vi.fn();

            const dummyEvent = {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                target: null
            } as any;

            const handled = handleLogHelpClick(dummyEvent, executeCommand);
            expect(handled).toBe(true);
            expect(useCommandPanelStore.getState().isHelpMode).toBe(false);
            expect(executeCommand).not.toHaveBeenCalled();
        });
    });
});
