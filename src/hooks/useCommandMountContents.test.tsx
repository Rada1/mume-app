// @vitest-environment jsdom
/** @file useCommandMountContents.test.tsx — Checks mount disclosure requests and captured cargo isolation. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { useCorpseContentsStore } from '../stores/useCorpseContentsStore';
import { useCommandMountContents } from './useCommandMountContents';

const game = vi.hoisted(() => ({ roomNum: 420, inlineCategories: [], executeCommand: vi.fn(), parser: { setPendingFlags: vi.fn() } }));
vi.mock('../context/GameContext', () => ({ useGame: () => game }));

// --- Mount Capture Checks ---
const mount: CommandActionTargetEntry = {
    id: 'roomchars:17', label: 'pack horse', context: '2.horse', keyword: '2.horse',
    category: 'cat-npc', group: 'npcs', scope: 'room'
};
const cargo = [{ id: 'cargo-1', text: 'a leather bag', html: 'a leather bag', isItem: true }];
beforeEach(() => {
    game.roomNum = 420;
    vi.clearAllMocks();
    useCorpseContentsStore.getState().clearContents();
});
afterEach(cleanup);

describe('mount contents disclosure', () => {
    it('recognizes mount traits on NPCs and fetches only when opened using the exact target', () => {
        const { result } = renderHook(() => useCommandMountContents(mount));
        expect(result.current.isMount).toBe(true);
        expect(game.executeCommand).not.toHaveBeenCalled();
        act(() => result.current.toggle());
        expect(game.parser.setPendingFlags).toHaveBeenCalledWith(true, true, 'examine 2.horse');
        expect(game.executeCommand).toHaveBeenCalledWith('examine 2.horse', true, true, false, true,
            { shouldFocus: false, fromUi: true });
        expect(result.current.loading).toBe(true);
        act(() => useCorpseContentsStore.getState().captureContents('examine 2.horse', cargo));
        expect(result.current.rows.map(row => row.name)).toEqual(['leather bag']);
        expect(result.current.loading).toBe(false);
        act(() => result.current.toggle());
        expect(game.executeCommand).toHaveBeenCalledTimes(1);
        act(() => result.current.toggle());
        expect(game.executeCommand).toHaveBeenCalledTimes(2);
        expect(result.current.rows).toEqual([]);
    });

    it('does not display cargo from a previous room and recognizes empty responses', () => {
        const { result, rerender } = renderHook(() => useCommandMountContents(mount));
        act(() => result.current.toggle());
        act(() => useCorpseContentsStore.getState().captureContents('examine 2.horse', []));
        expect(result.current.loading).toBe(false);
        expect(result.current.rows).toEqual([]);
        game.roomNum = 421;
        rerender();
        expect(result.current.open).toBe(false);
    });

    it('keeps overlapping mount and corpse requests isolated', () => {
        const store = useCorpseContentsStore.getState();
        store.requestContents('horse', '2.horse');
        store.requestContents('corpse', 'corpse');
        store.captureContents('examine 2.horse', cargo);
        expect(useCorpseContentsStore.getState().contents.horse).toEqual(cargo);
        expect(useCorpseContentsStore.getState().pending?.containerId).toBe('corpse');
        store.captureContents('examine corpse', []);
        expect(useCorpseContentsStore.getState().contents.corpse).toEqual([]);
        expect(useCorpseContentsStore.getState().pending).toBeNull();
    });
});
