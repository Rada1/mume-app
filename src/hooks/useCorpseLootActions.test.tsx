/** @file useCorpseLootActions.test.tsx - Corpse refresh waits for confirmed responses and respects room changes. */
// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageStore } from '../stores/useMessageStore';
import { useCorpseContentsStore } from '../stores/useCorpseContentsStore';
import { useCorpseLootActions } from './useCorpseLootActions';
// --- Test Section ---
let sequence = 0;
const reply = (text = '>') => act(() => useMessageStore.getState().setUserMessages(previous => [...previous, {
    id: String(++sequence), type: 'prompt', textRaw: text, html: text, timestamp: Date.now()
}]));
beforeEach(() => { useMessageStore.setState({ user: [] }); useCorpseContentsStore.getState().clearContents(); });
afterEach(cleanup);
describe('persistent corpse loot', () => {
    it('refreshes only after all selected-item commands have replies', async () => {
        const executeCommand = vi.fn();
        const examineCorpse = vi.fn();
        const { result } = renderHook(() => useCorpseLootActions({ executeCommand, examineCorpse, roomNum: 1 }));
        act(() => result.current.execute('corpse', 'get sword guard-corpse; give sword mount'));
        expect(executeCommand.mock.calls).toEqual([['get sword guard-corpse']]);
        expect(examineCorpse).not.toHaveBeenCalled();
        reply();
        await waitFor(() => expect(executeCommand).toHaveBeenCalledWith('give sword mount'));
        expect(examineCorpse).not.toHaveBeenCalled();
        reply();
        await waitFor(() => expect(examineCorpse).toHaveBeenCalledWith('corpse'));
    });
    it('does not optimistically delete a corpse or empty its cached items', async () => {
        useCorpseContentsStore.setState({ contents: { corpse: [{ id: 'sword', text: 'a sword', html: 'a sword', isItem: true }] } });
        const examineCorpse = vi.fn();
        const { result } = renderHook(() => useCorpseLootActions({ executeCommand: vi.fn(), examineCorpse, roomNum: 1 }));
        act(() => result.current.execute('corpse', 'get all guard-corpse'));
        expect(useCorpseContentsStore.getState().contents.corpse).toHaveLength(1);
        reply('You cannot carry that. >');
        await waitFor(() => expect(examineCorpse).toHaveBeenCalledWith('corpse'));
        expect(useCorpseContentsStore.getState().contents.corpse).toHaveLength(1);
    });
    it('cancels remaining actions and refresh when leaving the room', async () => {
        const executeCommand = vi.fn();
        const examineCorpse = vi.fn();
        const { result, rerender } = renderHook(({ roomNum }) => useCorpseLootActions({ executeCommand, examineCorpse, roomNum }), { initialProps: { roomNum: 1 } });
        act(() => result.current.execute('corpse', 'get sword guard-corpse; give sword mount'));
        rerender({ roomNum: 2 });
        reply();
        await waitFor(() => expect(result.current.isBusy).toBe(false));
        expect(executeCommand).toHaveBeenCalledTimes(1);
        expect(examineCorpse).not.toHaveBeenCalled();
    });
});
