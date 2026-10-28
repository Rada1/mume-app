// @vitest-environment jsdom
/** @file useCommandMagicKeys.test.ts — Button destinations use saved keys instead of room targets. */
import { act, cleanup, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommandMagicKeys } from './useCommandMagicKeys';
import type { useCommandTreeController } from './useCommandTreeController';
import { useSettingsStore } from '../stores/useSettingsStore';
import { makeMagicKeyTarget } from '../utils/magicKeyUtils';
import { createButton } from '../utils/buttonFactory';

// --- Saved key fixtures ---
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T12:00:00Z')); });
afterEach(() => { cleanup(); useSettingsStore.setState({teleportTargets: []}); vi.useRealTimers(); });

describe('keyed spell buttons', () => {
    it.each(['teleport', 'portal', 'scry', 'watch room'])('previews and casts %s with the selected key', spell => {
        const key = makeMagicKeyTarget('abc123', 'Rivendell', 'locate');
        useSettingsStore.setState({teleportTargets: [key]});
        const handleButtonClick = vi.fn(), setCommandPreview = vi.fn(), completed = vi.fn();
        const controller = { game: {gameState: 'playing', handleButtonClick, setCommandPreview} } as unknown as ReturnType<typeof useCommandTreeController>;
        const button = createButton({id: spell, command: `cast '${spell}'`, label: spell, setId: 'trait-mage'});
        const {result} = renderHook(() => useCommandMagicKeys(controller, button, completed));
        act(() => result.current.preview(key));
        expect(setCommandPreview).toHaveBeenLastCalledWith(`cast '${spell}' abc123`);
        act(() => result.current.choose(key, {} as React.MouseEvent));
        expect(handleButtonClick).toHaveBeenCalledWith(expect.objectContaining({command: `cast '${spell}' abc123`}), expect.anything());
        expect(completed).toHaveBeenCalledTimes(1);
        expect(setCommandPreview).toHaveBeenLastCalledWith(null);
    });

    it('sorts favorites first and rejects a key that expires during the hold', () => {
        const expired = {...makeMagicKeyTarget('old', 'Old place', 'locate'), expiresAt: Date.now() - 1};
        const recent = makeMagicKeyTarget('new', 'New place', 'locate');
        const favorite = {...makeMagicKeyTarget('favorite', 'Favorite place', 'locate'), isFavorite: true, expiresAt: Date.now() + 500};
        useSettingsStore.setState({teleportTargets: [expired, recent, favorite]});
        const handleButtonClick = vi.fn();
        const controller = {game: {gameState: 'playing', handleButtonClick}} as unknown as ReturnType<typeof useCommandTreeController>;
        const button = createButton({id: 'portal', label: 'Portal', command: "cast 'portal'", setId: 'trait-mage'});
        const {result} = renderHook(() => useCommandMagicKeys(controller, button));
        expect(result.current.targets.map(key => key.id)).toEqual(['favorite', 'new']);
        act(() => vi.advanceTimersByTime(600));
        act(() => result.current.choose(favorite, {} as React.MouseEvent));
        expect(handleButtonClick).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(400));
        expect(result.current.targets.map(key => key.id)).toEqual(['new']);
    });
});
