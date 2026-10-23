/** @file useMountCargoActions.test.tsx — Mount sale targeting and refused cargo regression checks. */
// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrawerLine, Message } from '../types';
import { useCorpseContentsStore } from '../stores/useCorpseContentsStore';
import { useMessageStore } from '../stores/useMessageStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useMountCargoActions } from './useMountCargoActions';

// --- Logic Section ---
beforeEach(() => {
    useMessageStore.setState({ user: [] });
    useCorpseContentsStore.getState().clearContents();
    useRoomStore.setState({ roomNum: 420 });
});
afterEach(cleanup);

describe('selling mount cargo', () => {
    it.each([true, false])('uses mount for examine, unsaddle and returns (sale accepted: %s)', async accepted => {
        const cargo: DrawerLine = {
            id: 'cargo', text: 'a steel sword', html: 'a steel sword', isItem: true
        };
        let inventory: DrawerLine[] = [];
        let carrying = false;
        let sequence = 0;
        let rerenderHook = () => {};
        const executeCommand = vi.fn((command: string) => {
            queueMicrotask(() => {
                let response = '';
                if (command === 'inventory') {
                    inventory = carrying ? [cargo] : [];
                    rerenderHook();
                } else if (command === 'examine mount') {
                    useCorpseContentsStore.getState().captureContents(command, [cargo]);
                } else if (command.startsWith('unsaddle ')) response = 'Your mule drops a steel sword.';
                else if (command.startsWith('get ')) carrying = true;
                else if (command.startsWith('sell ')) {
                    if (accepted) { response = 'You sell a steel sword.'; carrying = false; }
                    else response = 'I do not buy that.';
                } else if (command.startsWith('give ')) carrying = false;
                const message = (type: Message['type'], text: string): Message => ({
                    id: String(++sequence), type, textRaw: text, html: text, timestamp: Date.now()
                });
                useMessageStore.getState().setUserMessages(previous => [
                    ...previous, message('game', response), message('prompt', '>')
                ]);
            });
        });
        const { result, rerender } = renderHook(() => useMountCargoActions({ executeCommand, inventoryLines: inventory }));
        rerenderHook = rerender;
        act(() => result.current.sellMountLoot());
        await waitFor(() => expect(result.current.isBusy).toBe(false));
        expect(executeCommand.mock.calls.map(([command]) => command)).toEqual([
            'inventory', 'examine mount', 'unsaddle mount sword', 'get sword', 'inventory', 'sell sword',
            ...accepted ? [] : ['give sword mount', 'inventory']
        ]);
        expect(result.current.status).toContain(accepted ? 'Sold 1 item.' : 'The shop refused the cargo.');
    });
});
