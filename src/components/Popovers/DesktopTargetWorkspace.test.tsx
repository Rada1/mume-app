/** @file DesktopTargetWorkspace.test.tsx — Desktop workspace lifetime and target navigation regressions. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DesktopTargetWorkspaceHost } from './DesktopTargetWorkspace';
import { useDesktopTargetWorkspaceStore } from '../../stores/useDesktopTargetWorkspaceStore';
import { useUIStore } from '../../stores/useUIStore';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { PopoverState } from '../../types';

// --- Client Boundaries ---
const device = vi.hoisted(() => ({mobile: false, entries: [] as CommandActionTargetEntry[]}));
vi.mock('../../context/GameContext', () => ({
 useGame: () => ({viewport: {isMobile: device.mobile}}),
 useUI: () => useUIStore()
}));
vi.mock('../../hooks/useCommandTreeController', () => ({useCommandTreeController: () => ({entries: device.entries})}));
vi.mock('../HUD/CommandTreeGearQuickMenu', () => ({
 CommandTreeGearQuickMenu: ({kind, initialTarget, onSelect}: {
  kind: string; initialTarget?: CommandActionTargetEntry; onSelect: (entry: CommandActionTargetEntry) => void;
 }) => <div data-menu-location={kind}>
  <span data-selected-target>{initialTarget?.label || 'No target'}</span>
  <button onClick={() => onSelect({id:'other', label:'Other target', keyword:'other', context:'other',
   category:'cat-inventory-object', group:'inventory', scope:'self'})}>Select other target</button>
 </div>
}));

// --- Workspace Lifecycle ---
const request: PopoverState = {x:0, y:0, type:'menu', entityId:'lantern', setId:'cat-inventory-object',
 category:'cat-inventory-object', context:'lantern', keyword:'lantern', displayName:'Brass lantern'};
let root: Root;
const render = async () => {await act(async () => root.render(<DesktopTargetWorkspaceHost/>));};
const click = async (label: string) => {
 const button = [...document.querySelectorAll('button')].find(element => element.textContent === label);
 expect(button, `Button ${label} exists`).toBeDefined();
 await act(async () => button!.click());
};
beforeEach(async () => {
 device.mobile = false;
 device.entries = [];
 useDesktopTargetWorkspaceStore.getState().close();
 useUIStore.setState({popoverState: request});
 document.body.innerHTML = '<div id="root"></div><div id="client-panel-inline-actions-slot"></div>';
 root = createRoot(document.getElementById('root')!);
 await render();
});
afterEach(async () => {
 await act(async () => root.unmount());
 useDesktopTargetWorkspaceStore.getState().close();
 useUIStore.setState({popoverState:null});
 document.body.innerHTML = '';
});

it('opens the matching location and remembers each tab selection', async () => {
 expect(document.querySelector('[data-menu-location]')?.getAttribute('data-menu-location')).toBe('Inventory');
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('Brass lantern');
 await click('Select other target');
 await click('Room');
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('No target');
 await click('Inventory');
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('Other target');
 await act(async () => useUIStore.setState({popoverState:{...request, entityId:'boots', category:'cat-worn-object', displayName:'Leather boots'}}));
 expect(document.querySelector('[data-menu-location]')?.getAttribute('data-menu-location')).toBe('Equipment');
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('Leather boots');
});

it('stays open through outside interactions, cleared popovers and inspection captures', async () => {
 await act(async () => {
  document.body.dispatchEvent(new Event('pointerdown', {bubbles:true}));
  useUIStore.setState({popoverState:null});
 });
 expect(document.querySelector('[aria-label="Target commands"]')).not.toBeNull();
 await act(async () => useUIStore.setState({popoverState:{...request, commandPanelCapture:true, hasInspectionCard:true}}));
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('Brass lantern');
 await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})));
 expect(document.querySelector('[aria-label="Target commands"]')).toBeNull();
 expect(useUIStore.getState().popoverState?.hasInspectionCard).toBe(true);
});

it('resolves a log selection when gear arrives without overwriting a later manual selection', async () => {
 device.entries = [{id:'gear-lantern',label:'Loaded lantern',keyword:'lantern',context:'lantern',category:'cat-inventory-object',group:'inventory',scope:'self'}];
 await render();
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('Loaded lantern');
 await click('Select other target');
 device.entries = [...device.entries];
 await render();
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('Other target');
 await click('Room');
 await act(async () => useUIStore.setState({popoverState:{...request}}));
 expect(document.querySelector('[data-menu-location]')?.getAttribute('data-menu-location')).toBe('Inventory');
 expect(document.querySelector('[data-selected-target]')?.textContent).toBe('Loaded lantern');
});

it('closes explicitly and leaves mobile on its existing interface', async () => {
 await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Close target commands"]')!.click());
 expect(useUIStore.getState().popoverState).toBeNull();
 expect(document.querySelector('[aria-label="Target commands"]')).toBeNull();
 device.mobile = true;
 await act(async () => useUIStore.setState({popoverState:request}));
 expect(document.querySelector('[aria-label="Target commands"]')).toBeNull();
 expect(useUIStore.getState().popoverState?.entityId).toBe('lantern');
});
