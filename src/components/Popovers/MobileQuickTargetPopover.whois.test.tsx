/** @file MobileQuickTargetPopover.whois.test.tsx — Ally Whois capture stays in the quick popover. */
// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import { useUIStore } from '../../stores/useUIStore';
import { MobileQuickTargetPopover } from './MobileQuickTargetPopover';

// --- Whois request and response ---
afterEach(() => { cleanup(); useUIStore.getState().setPopoverState(null); });
it('captures an ally Whois in place without closing the menu', () => {
    const entry = { id:'ally', label:'Elena', keyword:'Elena', context:'Elena', category:'cat-ally', group:'players', scope:'room' } as CommandActionTargetEntry;
    useUIStore.getState().setPopoverState({ x:0, y:0, type:'menu', entityId:'ally', category:'cat-ally', setId:'cat-ally', context:'Elena' });
    const executeCommand = vi.fn(), close = vi.fn();
    const controller = { game: { inlineCategories:[], roomNum:1, isSpectateMode:false, executeCommand,
        initAudio:vi.fn(), isSoundEnabled:false, parser:{ setPendingFlags:vi.fn() } }, vitals:{ characterInfo:{} } } as unknown as ReturnType<typeof useCommandTreeController>;
    render(<MobileQuickTargetPopover entry={entry} controller={controller} close={close} />);
    fireEvent.click(screen.getByRole('button', { name:'Whois' }));
    expect(executeCommand).toHaveBeenCalledWith('whois elena', true, true, false, false, { shouldFocus:false, fromUi:true });
    expect(close).not.toHaveBeenCalled();
    expect(useUIStore.getState().popoverState?.isCapturingWhois).toBe(true);
    expect(screen.getByText('Looking up player…')).toBeTruthy();
    act(() => { const current = useUIStore.getState().popoverState!; useUIStore.getState().setPopoverState({ ...current, isCapturingWhois:false, capturedWhoisLines:['Elena is an Elf.'] }); });
    expect(screen.getByText('Elena is an Elf.')).toBeTruthy();
    expect(screen.getByRole('button', { name:'Whois' })).toBeTruthy();
});

it('offers only Whois for a remote ally even if the target has room scope', () => {
    const entry = { id:'ally', label:'Elena', keyword:'Elena', context:'Elena', category:'cat-ally-remote', group:'players', scope:'room' } as CommandActionTargetEntry;
    const controller = { game: { inlineCategories:[], roomNum:1, isSpectateMode:false }, vitals:{ characterInfo:{} } } as unknown as ReturnType<typeof useCommandTreeController>;
    render(<MobileQuickTargetPopover entry={entry} controller={controller} close={vi.fn()} />);
    expect(screen.getByRole('button', { name:'Whois' })).toBeTruthy();
    expect(screen.queryByRole('button', { name:'Examine' })).toBeNull();
    expect(screen.queryByRole('button', { name:'Follow' })).toBeNull();
    expect(screen.queryByRole('button', { name:'Group' })).toBeNull();
});

it('opens communication choices and prepares a directed message without sending it', () => {
    const entry = { id:'ally', label:'Elena', keyword:'Elena', context:'Elena', category:'cat-ally', group:'players', scope:'room' } as CommandActionTargetEntry;
    const setParley = vi.fn(), executeCommand = vi.fn(), close = vi.fn();
    const controller = { game: { inlineCategories:[], roomNum:1, isSpectateMode:false, viewport:{ isMobile:true }, setParley, executeCommand }, vitals:{ characterInfo:{} } } as unknown as ReturnType<typeof useCommandTreeController>;
    render(<MobileQuickTargetPopover entry={entry} controller={controller} close={close} />);
    fireEvent.click(screen.getByRole('button', { name:'Chat' }));
    expect(screen.getByRole('button', { name:'Whisper' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name:'Tell' }));
    const update = setParley.mock.calls[0][0];
    expect(update({ message:'draft' })).toEqual({ active:true, mode:'parley', command:'tell', target:'elena', message:'draft' });
    expect(executeCommand).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
});

it('limits directed chat channels for remote allies', () => {
    const entry = { id:'ally', label:'Elena', keyword:'Elena', context:'Elena', category:'cat-ally-remote', group:'players', scope:'remote' } as CommandActionTargetEntry;
    const controller = { game: { inlineCategories:[], roomNum:1, isSpectateMode:false }, vitals:{ characterInfo:{} } } as unknown as ReturnType<typeof useCommandTreeController>;
    render(<MobileQuickTargetPopover entry={entry} controller={controller} close={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name:'Chat' }));
    expect(screen.getByRole('button', { name:'Tell' })).toBeTruthy();
    expect(screen.queryByRole('button', { name:'Whisper' })).toBeNull();
    expect(screen.queryByRole('button', { name:'Ask' })).toBeNull();
});
