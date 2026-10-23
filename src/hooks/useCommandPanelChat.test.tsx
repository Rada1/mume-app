// @vitest-environment jsdom
/** @file useCommandPanelChat.test.tsx — Shared feed, explicit destinations, drafts, and scroll behavior. */
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrawerLine, Message, PopoverState } from '../types';
import { useCommandPanelChat } from './useCommandPanelChat';
import { useChatTranscript } from './useChatTranscript';
import { useChatPanel } from './useChatPanel';
import { OnlineCommandTargets } from '../components/Popovers/StandardMenu/OnlineCommandTargets';
import { useMessageStore } from '../stores/useMessageStore';
import { useModeStore } from '../stores/useModeStore';
import { getCommandCommunicationIntent, getCommunicationCommands, getOnlineCommunicationTargets } from '../utils/commandCommunication';

const mocks = vi.hoisted(() => ({ executeCommand: vi.fn(), triggerHaptic: vi.fn(), whoList: ['Alice', 'Bob'] }));
vi.mock('../context/GameContext', () => ({ useGame: () => mocks }));

// --- Fixtures ---
const message = (id: string, sender: string, channel = 'tell'): Message => ({
    id, timestamp: Date.now(), type: 'comm', html: '', textRaw: 'Hello',
    isComm: true, commSender: sender, replyCommand: channel, commText: 'Hello'
});
const target = (name: string): PopoverState => ({
    x: 0, y: 0, type: 'menu', setId: 'cat-ally', category: 'cat-ally', entityId: `player:${name}`, context: name
});
beforeEach(() => {
    mocks.executeCommand.mockClear();
    Object.assign(mocks, { whoLines: [] as DrawerLine[] });
    useModeStore.setState({ isSpectating: false, activeView: 'self' });
    useMessageStore.setState({ userChat: [message('a', 'Alice'), message('b', 'Bob'), message('g', 'Groupmate', 'group')], spectateChat: [] });
});
afterEach(cleanup);

// --- Communication Integration ---
describe('command panel communication', () => {
    it('prepares an inline tell composer and opens history without hiding commands or sending', () => {
        const { result, rerender } = renderHook(({ selected }) => useCommandPanelChat(selected), { initialProps: { selected: target('Alice') } });
        act(() => { expect(result.current.handleCommand('tell %n')).toBe(true); });
        expect(result.current.activeCommand).toBe('tell %n');
        expect(result.current.historyPanelOpen).toBe(true);
        expect(result.current.chat.target).toBe('Alice');
        expect(result.current.chat.filter).toBe('all');
        expect(result.current.chat.visibleMessages.map(item => item.id)).toEqual(['a', 'b', 'g']);
        expect(mocks.executeCommand).not.toHaveBeenCalled();
        rerender({ selected: target('Bob') });
        expect(result.current.chat.target).toBe('Alice');
        expect(result.current.chat.visibleMessages).toHaveLength(3);
    });
    it('preserves a draft while the history panel opens and closes, then sends to the explicit recipient', () => {
        const { result, rerender } = renderHook(({ selected }) => useCommandPanelChat(selected), { initialProps: { selected: target('Alice') } });
        act(() => { result.current.handleCommand('tell'); result.current.chat.setInputValue('Meet at the gate'); });
        act(() => result.current.setHistoryPanelOpen(false));
        rerender({ selected: target('Bob') });
        act(() => result.current.setHistoryPanelOpen(true));
        expect(result.current.chat.inputValue).toBe('Meet at the gate');
        act(() => result.current.chat.send({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>));
        expect(mocks.executeCommand).toHaveBeenCalledWith('tell Alice Meet at the gate');
    });
    it('replies to a sender while keeping other communications visible', () => {
        const { result } = renderHook(() => useCommandPanelChat(target('Alice')));
        act(() => result.current.chat.replyToMessage(message('reply', 'Bob')));
        expect(result.current.chat.target).toBe('Bob');
        expect(result.current.chat.filter).toBe('all');
        expect(result.current.chat.visibleMessages).toHaveLength(3);
    });
    it('supports group composition and leaves noncommunication actions alone', () => {
        expect(getCommandCommunicationIntent('gsay', 'Alice')).toEqual({ command: 'group', target: null, text: '' });
        expect(getCommandCommunicationIntent('tell Bob hello', 'Alice')).toEqual({ command: 'tell', target: 'Bob', text: 'hello' });
        expect(getCommandCommunicationIntent('wield sword', 'Alice')).toBeNull();
    });
    it('retains channel filters when preparing a recipient', () => {
        const { result } = renderHook(() => useCommandPanelChat(target('Alice')));
        act(() => result.current.chat.setFilter('group'));
        act(() => result.current.handleCommand('whisper %n'));
        expect(result.current.chat.filter).toBe('group');
        expect(result.current.chat.command).toBe('whisper');
        expect(result.current.chat.target).toBe('Alice');
    });
    it('does not use an object as a communication recipient', () => {
        const selected = { ...target('sword'), category: 'cat-inventory-object', setId: 'cat-inventory-object' };
        const { result } = renderHook(() => useCommandPanelChat(selected));
        act(() => { result.current.handleCommand('tell'); result.current.chat.setInputValue('Hello'); });
        expect(result.current.chat.target).toBeNull();
        act(() => result.current.chat.send({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>));
        expect(mocks.executeCommand).not.toHaveBeenCalled();
    });
    it('sends group messages with the game command and no recipient', () => {
        const { result } = renderHook(() => useCommandPanelChat(target('Alice')));
        act(() => { result.current.handleCommand('group'); result.current.chat.setInputValue('Ready'); });
        act(() => result.current.chat.send({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>));
        expect(mocks.executeCommand).toHaveBeenCalledWith('gsay Ready');
    });
    it('offers directed commands only for applicable selected targets', () => {
        const local = getCommunicationCommands('Alice', true, true).map(choice => choice.command);
        expect(local).toEqual(expect.arrayContaining(['tell', 'whisper', 'ask', 'say', 'narrate']));
        expect(local).not.toContain('group');
        const remote = getCommunicationCommands('Bob', false, false).map(choice => choice.command);
        expect(remote).toContain('tell');
        expect(remote).not.toEqual(expect.arrayContaining(['whisper']));
        expect(remote).not.toContain('ask');
        expect(remote).not.toContain('group');
        expect(getCommunicationCommands(null, false, false).some(choice => choice.target)).toBe(false);
    });
    it('keeps the inline draft when history closes and opens it for another communication action', () => {
        const { result } = renderHook(() => useCommandPanelChat(target('Alice')));
        expect(result.current.historyVisible).toBe(false);
        act(() => { result.current.handleCommand('tell'); result.current.chat.setInputValue('Meet at the gate'); });
        expect(result.current.historyVisible).toBe(true);
        expect(result.current.chat.inputValue).toBe('Meet at the gate');
        act(() => result.current.setHistoryPanelOpen(false));
        expect(result.current.historyVisible).toBe(false);
        act(() => result.current.handleCommand('say'));
        expect(result.current.historyVisible).toBe(true);
        expect(result.current.activeCommand).toBe('say');
        expect(result.current.chat.inputValue).toBe('');
    });
    it('projects who names as remote targets and refreshes only when expanded', () => {
        const entries = getOnlineCommunicationTargets(['12|Bob', '10|Alice', '12|Bob']);
        expect(entries.map(entry => entry.label)).toEqual(['Alice', 'Bob']);
        expect(entries[0]).toMatchObject({ category: 'cat-ally-remote', scope: 'remote', context: 'Alice' });
        const choose = vi.fn();
        const { container } = render(<OnlineCommandTargets onSelect={choose} />);
        expect(mocks.executeCommand).not.toHaveBeenCalled();
        const details = container.querySelector('details')!;
        details.open = true;
        fireEvent(details, new Event('toggle'));
        expect(mocks.executeCommand).toHaveBeenCalledWith('who', true, true, false, true);
        fireEvent.click(screen.getByRole('button', { name: /Bob/ }));
        expect(choose).toHaveBeenCalledWith(expect.objectContaining({ context: 'Bob', scope: 'remote' }));
    });
    it('shows each online player who line without the bracketed command keyword', () => {
        const whoLine: DrawerLine = {
            id: 'who-alice', text: 'Alice the Hobbit Archer', prefix: '[32 Elf] ',
            html: '[32 Elf] <span style="color: rgb(34, 197, 94)">Alice</span> the Hobbit Archer',
            tokens: [
                { type: 'entity', content: 'Alice', entityId: 'player:alice', metadata: { kind: 'player' } },
                { type: 'text', content: ' the Hobbit Archer' }
            ]
        };
        const unprefixedWhoLine: DrawerLine = {
            id: 'who-bob', text: 'Bob the Hobbit', prefix: '', html: 'Bob the Hobbit',
            tokens: [
                { type: 'entity', content: 'Bob', entityId: 'player:bob', metadata: { kind: 'player' } },
                { type: 'text', content: ' the Hobbit' }
            ]
        };
        Object.assign(mocks, { whoLines: [whoLine, unprefixedWhoLine] });
        const { container } = render(<OnlineCommandTargets onSelect={vi.fn()} color="rgb(34, 197, 94)" open />);
        const [line, unprefixedLine] = container.querySelectorAll('.command-action-target-online-line');
        expect(line.textContent).toBe('[32 Elf] Alice the Hobbit Archer');
        expect(unprefixedLine.textContent).toBe('Bob the Hobbit');
        expect(line.querySelector('.command-action-target-online-prefix-slot')?.textContent).toBe('[32 Elf] ');
        expect(unprefixedLine.querySelector('.command-action-target-online-prefix-slot')?.textContent).toBe('');
        expect(line?.querySelector('.command-action-target-online-player-name')?.textContent).toBe('Alice');
        expect((line.querySelector('.command-action-target-online-player-name') as HTMLElement | null)?.style.color).toBe('rgb(34, 197, 94)');
        expect(unprefixedLine.querySelector('.command-action-target-online-player-name')?.textContent).toBe('Bob');
        expect(line?.getAttribute('style')).toBeNull();
        expect(container.querySelector('button')?.textContent).not.toContain('<Alice>');
    });
    it('keeps the reading position when messages arrive while chat is hidden', () => {
        const { result, rerender } = renderHook(({ visible }) => {
            const chat = useChatPanel();
            return useChatTranscript({ chat, isVisible: visible });
        }, { initialProps: { visible: true } });
        const scroll = document.createElement('div');
        Object.defineProperties(scroll, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 } });
        result.current.scrollRef.current = scroll;
        scroll.scrollTop = 100;
        act(() => result.current.onScroll());
        rerender({ visible: false });
        act(() => useMessageStore.getState().addUserChatMessage(message('new', 'Bob')));
        rerender({ visible: true });
        expect(scroll.scrollTop).toBe(100);
        expect(result.current.atBottom).toBe(false);
    });
});
