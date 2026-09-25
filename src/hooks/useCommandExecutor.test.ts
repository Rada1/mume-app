// @vitest-environment jsdom
/**
 * @file useCommandExecutor.test.ts
 * @description Unit tests for useCommandExecutor movement hooks and pad flash events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCommandExecutor, ExecutorDeps } from './useCommandExecutor';

describe('useCommandExecutor movement events', () => {
    let mockDeps: ExecutorDeps;

    beforeEach(() => {
        mockDeps = {
            telnet: { sendCommand: vi.fn() },
            addMessage: vi.fn(),
            initAudio: vi.fn(),
            navIntervalRef: { current: null },
            mapperRef: { current: null } as any,
            teleportTargets: [],
            captureStage: { current: 'idle' },
            setInventoryLines: vi.fn(),
            setStatsLines: vi.fn(),
            setInfoLines: vi.fn(),
            setScoreLines: vi.fn(),
            setEqLines: vi.fn(),
            setTarget: vi.fn(),
            finalizeCapture: vi.fn(),
            setPendingFlags: vi.fn(),
            target: null,
            setPopoverState: vi.fn(),
            status: 'connected',
            handleTabClick: vi.fn(),
            setGearTab: vi.fn(),
            setPlayersTab: vi.fn(),
            setCharTab: vi.fn(),
            setIsSettingsOpen: vi.fn(),
            setSettingsTab: vi.fn(),
            actions: [],
            setActions: vi.fn(),
            activePrompt: '',
            isPasswordMode: false,
            gameState: 'game'
        } as unknown as ExecutorDeps;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('dispatches mume:movement-command-press when user types "north" or "n"', () => {
        const events: string[] = [];
        const listener = (e: Event) => {
            events.push((e as CustomEvent<{ cmd: string }>).detail.cmd);
        };
        window.addEventListener('mume:movement-command-press', listener);

        const { result } = renderHook(() => useCommandExecutor(mockDeps));

        result.current.executeCommand('north');
        expect(events).toContain('n');

        result.current.executeCommand('n');
        expect(events.filter(c => c === 'n').length).toBe(2);

        window.removeEventListener('mume:movement-command-press', listener);
    });

    it('dispatches mume:movement-command-press when user types "west" or "w"', () => {
        const events: string[] = [];
        const listener = (e: Event) => {
            events.push((e as CustomEvent<{ cmd: string }>).detail.cmd);
        };
        window.addEventListener('mume:movement-command-press', listener);

        const { result } = renderHook(() => useCommandExecutor(mockDeps));

        result.current.executeCommand('west');
        expect(events).toContain('w');

        result.current.executeCommand('w');
        expect(events.filter(c => c === 'w').length).toBe(2);

        window.removeEventListener('mume:movement-command-press', listener);
    });

    it('dispatches mume:movement-command-press for look, scan, and exits', () => {
        const events: string[] = [];
        const listener = (e: Event) => {
            events.push((e as CustomEvent<{ cmd: string }>).detail.cmd);
        };
        window.addEventListener('mume:movement-command-press', listener);

        const { result } = renderHook(() => useCommandExecutor(mockDeps));

        result.current.executeCommand('look');
        result.current.executeCommand('l');
        result.current.executeCommand('scan');
        result.current.executeCommand('exits');

        expect(events).toEqual(['look', 'look', 'scan', 'exits']);

        window.removeEventListener('mume:movement-command-press', listener);
    });
});
