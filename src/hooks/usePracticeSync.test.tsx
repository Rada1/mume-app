// @vitest-environment jsdom
/** @file usePracticeSync.test.tsx — Manual practice captures satisfy player sync without spectate leakage. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePracticeHandler } from './usePracticeHandler';
import { usePanelDataStore } from '../stores/usePanelDataStore';

// --- Capture Completion ---
beforeEach(() => {
    usePanelDataStore.getState().setSession(null);
    usePanelDataStore.getState().setSession('ellessar');
});
afterEach(() => {
    cleanup();
    usePanelDataStore.getState().setSession(null);
});

it('marks a completed manual practice listing as synced', () => {
    const { result } = renderHook(() => usePracticeHandler(vi.fn()));
    act(() => {
        result.current.parsePracticeLine('You have 3 practice sessions left.');
        result.current.parsePracticeLine('Bash  Excellent  Normal  Warrior');
    });
    expect(usePanelDataStore.getState().status.skills).toBe('idle');
    act(() => result.current.finalizePractice());
    expect(usePanelDataStore.getState().status.skills).toBe('ready');
    expect(result.current.practiceData?.skills[0].name).toBe('Bash');
});

it('does not mark the player synced from a spectated practice list', () => {
    const { result } = renderHook(() => usePracticeHandler(vi.fn(), undefined, false));
    act(() => {
        result.current.parsePracticeLine('You have 3 practice sessions left.');
        result.current.parsePracticeLine('Bash  Excellent  Normal  Warrior');
        result.current.finalizePractice();
    });
    expect(usePanelDataStore.getState().status.skills).toBe('idle');
});
