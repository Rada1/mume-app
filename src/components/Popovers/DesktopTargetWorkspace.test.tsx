// @vitest-environment jsdom
/** @file DesktopTargetWorkspace.test.tsx — Desktop log targets use the compact floating menu. */
import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DesktopTargetWorkspaceHost } from './DesktopTargetWorkspace';
import { useDesktopTargetWorkspaceStore } from '../../stores/useDesktopTargetWorkspaceStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';

// --- Desktop workspace boundaries ---
const state = vi.hoisted(() => ({executeCommand: vi.fn(), setPendingFlags: vi.fn(), entries: []}));
vi.mock('../../context/GameContext', () => ({useUI: () => useUIStore()}));
vi.mock('../../hooks/useCommandTreeController', () => ({useCommandTreeController: () => ({
 game: {viewport:{isMobile:false}, inlineCategories:[], roomNum:1, parser:{setPendingFlags:state.setPendingFlags},
  executeCommand:state.executeCommand, initAudio:vi.fn(), isSoundEnabled:false}, vitals:{}, entries:state.entries
})}));

afterEach(() => {
 cleanup();
 useDesktopTargetWorkspaceStore.getState().close();
 useUIStore.setState({popoverState:null});
 useCorpseContentsStore.getState().clearContents();
 state.executeCommand.mockClear();
 document.body.replaceChildren();
});

it('opens beside desktop log text, inspects in place and closes after an action', async () => {
 const slot = document.createElement('div');
 slot.id = 'client-panel-inline-actions-slot';
 document.body.append(slot);
 useUIStore.setState({popoverState:{x:80,y:120,type:'menu',entityId:'elf',setId:'cat-npc',category:'cat-npc',
  context:'elf',displayName:'an elf',sourceRect:{left:60,top:100,width:40,height:20}}});
 render(<DesktopTargetWorkspaceHost/>);
 await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull());
 const panel = document.querySelector<HTMLElement>('[aria-label="Target commands"]')!;
 expect(slot.contains(panel)).toBe(false);
 expect(panel.style.getPropertyValue('--target-popover-left')).toBe('60px');
 expect(panel.style.getPropertyValue('--target-popover-top')).toBe('94px');
 expect(panel.textContent).toContain('Hit');
 expect(panel.querySelector('[role="listbox"]')).toBeNull();
 const actions = panel.querySelector<HTMLElement>('.mobile-quick-target-actions')!;
 actions.getBoundingClientRect = () => new DOMRect(0,
  parseFloat(panel.style.getPropertyValue('--target-popover-top')) + 40
   + (panel.textContent?.includes('Examining…') ? 20 : panel.textContent?.includes('A watchful elf.') ? 50 : 0), 200, 40);
 const originalActionTop = actions.getBoundingClientRect().top;
 fireEvent.click([...panel.querySelectorAll('button')].find(button => button.textContent === 'Examine')!);
 expect(state.executeCommand).toHaveBeenCalledWith('examine elf',true,true,false,true,{shouldFocus:false,fromUi:true});
 expect(actions.getBoundingClientRect().top).toBe(originalActionTop);
 act(() => useCorpseContentsStore.getState().captureContents('examine elf', [{id:'description',html:'A watchful elf.',text:'A watchful elf.'}]));
 expect(panel.textContent).toContain('A watchful elf.');
 expect(actions.getBoundingClientRect().top).toBe(originalActionTop);
 fireEvent.click([...panel.querySelectorAll('button')].find(button => button.textContent === 'Hit')!);
 expect(state.executeCommand).toHaveBeenCalledWith('hit elf',false,false,false,false,{shouldFocus:false,fromUi:true});
 await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).toBeNull());
});

it('closes when the popover state is cleared or Escape is pressed', async () => {
 const request = {x:80,y:120,type:'menu' as const,entityId:'elf',setId:'cat-npc',category:'cat-npc',context:'elf'};
 useUIStore.setState({popoverState:request});
 render(<DesktopTargetWorkspaceHost/>);
 await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull());
 act(() => useUIStore.setState({popoverState:null}));
 await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).toBeNull());
 act(() => useUIStore.setState({popoverState:request}));
 await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull());
 fireEvent.keyDown(window,{key:'Escape'});
 await waitFor(() => expect(document.querySelector('[aria-label="Target commands"]')).toBeNull());
});
