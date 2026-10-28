// @vitest-environment jsdom
/** @file MobileTargetPopover.test.tsx — Mobile log target actions use a compact anchored surface. */
import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DesktopTargetWorkspaceHost } from './DesktopTargetWorkspace';
import { useDesktopTargetWorkspaceStore } from '../../stores/useDesktopTargetWorkspaceStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';

// --- Mobile workspace boundaries ---
const state = vi.hoisted(() => ({ entries: [] as CommandActionTargetEntry[], executeCommand: vi.fn(), setPendingFlags: vi.fn() }));
vi.mock('../../context/GameContext', () => ({
    useGame: () => ({ viewport: { isMobile: true } }),
    useUI: () => useUIStore()
}));
vi.mock('../../hooks/useCommandTreeController', () => ({
    useCommandTreeController: () => ({ game: { viewport: { isMobile: true }, inlineCategories: [], roomNum: 1,
        parser: { setPendingFlags: state.setPendingFlags }, executeCommand: state.executeCommand,
        initAudio: vi.fn(), isSoundEnabled: false }, vitals: {}, entries: state.entries })
}));
vi.mock('../../hooks/useWorkspaceTargetReveal', () => ({ useWorkspaceTargetReveal: () => undefined }));
vi.mock('../HUD/CommandTreeGearQuickMenu', () => ({
    CommandTreeGearQuickMenu: () => <button type="button">Look</button>
}));

afterEach(() => {
    cleanup();
    useDesktopTargetWorkspaceStore.getState().close();
    useUIStore.setState({ popoverState: null });
    useCorpseContentsStore.getState().clearContents();
    state.executeCommand.mockClear();
    state.setPendingFlags.mockClear();
    state.entries = [];
});

it('opens beside the selected target without offering an unrelated target list', async () => {
    useUIStore.setState({ popoverState: { x: 80, y: 120, setId: 'cat-npc', category: 'cat-npc',
        entityId: 'elf', context: 'elf', displayName: 'an elf', sourceRect: { left: 60, top: 100, width: 40, height: 20 } } });
    render(<DesktopTargetWorkspaceHost />);
    await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull());
    const panel = document.querySelector<HTMLElement>('[aria-label="Target commands"]')!;
    expect(panel.classList.contains('is-inline-target-popover')).toBe(true);
    expect(panel.style.getPropertyValue('--target-popover-left')).toBe('60px');
    expect(panel.style.getPropertyValue('--target-popover-top')).toBe('94px');
    expect(panel.textContent).toContain('an elf');
    expect(panel.textContent).toContain('Hit');
    expect(panel.textContent).not.toContain('Look');
    expect(state.executeCommand).not.toHaveBeenCalled();
    fireEvent.click([...panel.querySelectorAll('button')].find(button => button.textContent === 'Examine')!);
    expect(state.executeCommand).toHaveBeenCalledWith('examine elf', true, true, false, true, {shouldFocus:false, fromUi:true});
    act(() => useCorpseContentsStore.getState().captureContents('examine elf', [{ id:'description', html:'A watchful elf stands here.', text:'A watchful elf stands here.' }]));
    expect(panel.textContent).toContain('A watchful elf stands here.');
    expect(panel.querySelector('[role="listbox"]')).toBeNull();
    fireEvent.click([...panel.querySelectorAll('button')].find(button => button.textContent === 'Hit')!);
    expect(state.executeCommand).toHaveBeenCalledWith('hit elf', false, false, false, false, {shouldFocus:false, fromUi:true});
    await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).toBeNull());
});

it.each([
    ['cat-room-object', 'a broadsword', 'sword'],
    ['cat-inventory-object', 'some bread', 'bread'],
    ['cat-worn-object', 'a cloak', 'cloak'],
    ['cat-npc', 'a pack horse', 'horse'],
])('lets the user examine %s targets in the popover', async (category, displayName, context) => {
    useUIStore.setState({ popoverState: { x: 80, y: 120, setId: category, category,
        entityId: context, context, displayName } });
    render(<DesktopTargetWorkspaceHost />);
    await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull());
    const panel = document.querySelector<HTMLElement>('[aria-label="Target commands"]')!;
    expect(state.executeCommand).not.toHaveBeenCalled();
    fireEvent.click([...panel.querySelectorAll('button')].find(button => button.textContent === 'Examine')!);
    expect(state.executeCommand).toHaveBeenCalledWith(`examine ${context}`, true, true, false, true, {shouldFocus:false, fromUi:true});
    act(() => useCorpseContentsStore.getState().captureContents(`examine ${context}`, [{id:'description', html:'A detailed description.', text:'A detailed description.'}]));
    expect(panel.textContent).toContain('A detailed description.');
});

it('examines a corpse using the corpse keyword rather than the living creature keyword', async () => {
    useUIStore.setState({popoverState:{x:80,y:120,setId:'cat-room-object',category:'cat-room-object',entityId:'corpse',
        context:'rider',displayName:'corpse of an Ohurk-uai warg-rider'}});
    render(<DesktopTargetWorkspaceHost />);
    await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull());
    fireEvent.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Examine')!);
    expect(state.executeCommand).toHaveBeenCalledWith('examine rider-corpse', true, true, false, true, {shouldFocus:false, fromUi:true});
});

it('offers corpse actions when a living pony shares the clicked corpse identity', async () => {
    state.entries = [{id:'pony', label:'a pony', keyword:'pony', context:'pony', category:'cat-npc', group:'npcs', scope:'room'},
        {id:'corpse', label:'corpse of a pony', keyword:'pony-corpse', context:'pony-corpse', category:'cat-room-object', group:'objects', scope:'room'}];
    useUIStore.setState({popoverState:{x:80,y:120,setId:'cat-npc',category:'cat-npc',entityId:'pony',context:'pony',displayName:'corpse of a pony'}});
    render(<DesktopTargetWorkspaceHost />);
    await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull());
    const panel = document.querySelector<HTMLElement>('[aria-label="Target commands"]')!;
    expect(panel.textContent).toContain('corpse of a pony');
    expect(panel.textContent).toContain('Loot');
    expect(panel.textContent).toContain('Butcher');
    expect(panel.textContent).not.toContain('Ride');
    fireEvent.click([...panel.querySelectorAll('button')].find(button => button.textContent === 'Examine')!);
    expect(state.executeCommand).toHaveBeenCalledWith('examine pony-corpse', true, true, false, true, {shouldFocus:false, fromUi:true});
});
