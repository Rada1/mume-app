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
        const executeCommand = vi.fn((command: string, _silent?: boolean, _isSystem?: boolean, _historical?: boolean, _fromDrawer?: boolean) => {
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
        expect(executeCommand.mock.calls.filter(([command]) => command === 'inventory' || command === 'examine mount')
            .every(([, silent, isSystem, historical, fromDrawer]) => silent === true && isSystem === true && historical === false && fromDrawer === true)).toBe(true);
        expect(result.current.status).toContain(accepted ? 'Sold 1 item.' : 'The shop refused the cargo.');
    });
});

it('gets valuables from each corpse in sequence and keeps the batch busy', async () => {
    const item: DrawerLine = {id:'sword',text:'a steel sword',html:'a steel sword',isItem:true};
    let inventory: DrawerLine[] = [];
    let sequence = 0;
    let rerenderHook = () => {};
    const executeCommand = vi.fn((command: string) => {
        queueMicrotask(() => {
            if (command === 'inventory') { inventory = [...inventory]; rerenderHook(); }
            if (command.startsWith('examine ')) useCorpseContentsStore.getState().captureContents(command, [item]);
            const text = command.startsWith('get ') ? 'You get a steel sword.' : '';
            const message = (type: Message['type'], content: string): Message => ({
                id:String(++sequence), type, textRaw:content, html:content, timestamp:Date.now()
            });
            useMessageStore.getState().setUserMessages(previous => [...previous, message('game',text),message('prompt','>')]);
        });
    });
    const {result, rerender} = renderHook(() => useMountCargoActions({executeCommand,inventoryLines:inventory}));
    rerenderHook = rerender;
    act(() => result.current.lootAllValuables([{containerId:'one',commandTarget:'1.rider-corpse'},
        {containerId:'two',commandTarget:'2.rider-corpse'}]));
    expect(result.current.isBusy).toBe(true);
    await waitFor(() => expect(result.current.isBusy).toBe(false));
    expect(executeCommand.mock.calls.map(([command]) => command)).toEqual([
        'examine 1.rider-corpse','get sword 1.rider-corpse',
        'examine 2.rider-corpse','get sword 2.rider-corpse'
    ]);
    expect(result.current.status).toBe('Looted valuables from 2 corpses.');
});

it('gives newly collected numbered items to the mount in safe descending order', async () => {
    const existing: DrawerLine = {id:'sword',text:'a steel sword',html:'a steel sword',isItem:true};
    let inventory: DrawerLine[] = [existing];
    let sequence = 0;
    let rerenderHook = () => {};
    const executeCommand = vi.fn((command: string) => {
        queueMicrotask(() => {
            if (command === 'inventory') { inventory = [...inventory]; rerenderHook(); }
            const text = command.startsWith('get ') ? 'You get a steel sword.' : command.startsWith('give ') ? 'You give a steel sword to your mount.' : '';
            const message = (type: Message['type'], content: string): Message => ({id:String(++sequence),type,textRaw:content,html:content,timestamp:Date.now()});
            useMessageStore.getState().setUserMessages(previous => [...previous,message('game',text),message('prompt','>')]);
        });
    });
    const {result, rerender} = renderHook(() => useMountCargoActions({executeCommand,inventoryLines:inventory}));
    rerenderHook = rerender;
    act(() => result.current.transferLootToMount([{target:'1.sword',label:'first sword'}, {target:'2.sword',label:'second sword'}], 'mount'));
    await waitFor(() => expect(result.current.isBusy).toBe(false));
    expect(executeCommand.mock.calls.map(([command]) => command)).toEqual([
        'inventory','get 2.sword','give 2.sword mount','get 1.sword','give 2.sword mount'
    ]);
});

it('collects a mail set with one bulk command and no inventory or repeat examine', async () => {
    const mail: DrawerLine[] = [
        {id:'shirt',text:'a steel mail shirt',html:'',isItem:true},
        {id:'leggings',text:'a steel mail leggings',html:'',isItem:true}
    ];
    let sequence = 0;
    const executeCommand = vi.fn((command: string) => queueMicrotask(() => {
        if (command.startsWith('examine ')) useCorpseContentsStore.getState().captureContents(command, mail);
        const text = command.startsWith('get ') ? 'You get a steel mail shirt.' : '';
        const message = (type: Message['type'], content: string): Message => ({id:String(++sequence),type,textRaw:content,html:content,timestamp:Date.now()});
        useMessageStore.getState().setUserMessages(previous => [...previous,message('game',text),message('prompt','>')]);
    }));
    const {result} = renderHook(() => useMountCargoActions({executeCommand,inventoryLines:[]}));
    act(() => result.current.lootAllValuables([{containerId:'corpse',commandTarget:'rider-corpse'}]));
    await waitFor(() => expect(result.current.isBusy).toBe(false));
    expect(executeCommand.mock.calls.map(([command]) => command)).toEqual(['examine rider-corpse','get all.mail rider-corpse']);
    expect(useCorpseContentsStore.getState().contents.corpse).toBeUndefined();
});

it('refreshes inventory once for a mount batch and protects previously carried mail', async () => {
    const mail: DrawerLine[] = [{id:'shirt',text:'a steel mail shirt',html:'',isItem:true}, {id:'legs',text:'a steel mail leggings',html:'',isItem:true}];
    let inventory: DrawerLine[] = [{id:'old',text:'a fine mail shirt',html:'',isItem:true}];
    let sequence = 0;
    let rerenderHook = () => {};
    const executeCommand = vi.fn((command: string) => queueMicrotask(() => {
        if (command === 'inventory') { inventory = [...inventory]; rerenderHook(); }
        if (command.startsWith('examine ')) useCorpseContentsStore.getState().captureContents(command, mail);
        const text = command.startsWith('get ') ? 'You get a steel mail shirt.' : command.startsWith('give ') ? 'You give the mail to your mount.' : '';
        const message = (type: Message['type'], content: string): Message => ({id:String(++sequence),type,textRaw:content,html:content,timestamp:Date.now()});
        useMessageStore.getState().setUserMessages(previous => [...previous,message('game',text),message('prompt','>')]);
    }));
    const {result, rerender} = renderHook(() => useMountCargoActions({executeCommand,inventoryLines:inventory}));
    rerenderHook = rerender;
    act(() => result.current.lootAllValuables([{containerId:'one',commandTarget:'1.rider-corpse'},
        {containerId:'two',commandTarget:'2.rider-corpse'}], 'mount'));
    await waitFor(() => expect(result.current.isBusy).toBe(false));
    expect(executeCommand.mock.calls.map(([command]) => command)).toEqual([
        'inventory','examine 1.rider-corpse','get all.mail 1.rider-corpse','give 2.mail mount','give 2.mail mount',
        'examine 2.rider-corpse','get all.mail 2.rider-corpse','give 2.mail mount','give 2.mail mount'
    ]);
});
