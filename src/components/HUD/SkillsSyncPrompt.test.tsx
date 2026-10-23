// @vitest-environment jsdom
/** @file SkillsSyncPrompt.test.tsx — Sync prompt visibility after the command panel loads skills. */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillsSyncPrompt } from './SkillsSyncPrompt';
import { usePanelDataStore } from '../../stores/usePanelDataStore';

const mocks = vi.hoisted(() => ({ executeCommand: vi.fn() }));
vi.mock('../../context/GameContext', () => ({
    useGame: () => ({ executeCommand: mocks.executeCommand, gameState: 'playing', isSpectateMode: false })
}));

beforeEach(() => {
    usePanelDataStore.getState().setSession(null);
    usePanelDataStore.getState().setSession('ellessar');
    mocks.executeCommand.mockClear();
});

afterEach(() => {
    cleanup();
    usePanelDataStore.getState().setSession(null);
});

describe('SkillsSyncPrompt', () => {
    it('hides from the command panel after the first successful sync', () => {
        render(<SkillsSyncPrompt hideWhenReady />);
        fireEvent.click(screen.getByRole('button', { name: 'Sync skills & spells' }));
        expect(screen.getByRole('button', { name: 'Syncing skills & spells…' }).hasAttribute('disabled')).toBe(true);

        act(() => usePanelDataStore.getState().complete('skills'));
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('keeps the refresh button visible where hideWhenReady is not enabled', () => {
        render(<SkillsSyncPrompt />);
        act(() => usePanelDataStore.getState().complete('skills'));
        expect(screen.getByRole('button', { name: 'Refresh skills & spells' })).toBeTruthy();
    });
});
