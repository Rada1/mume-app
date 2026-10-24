/** @file useCommandGearQuickMenu.test.tsx — Backwards gear selection preserves the parent argument. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useCommandGearQuickMenu } from './useCommandGearQuickMenu';
import type { useCommandTreeController } from './useCommandTreeController';
import { createButton } from '../utils/buttonFactory';
import { resolveButtonClickCommand } from './interactions/resolveButtonClickCommand';

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT:true});

// --- Fixtures ---
vi.mock('./useGearPanelData', () => ({useGearPanelData: () => ({status:{inventory:'ready',equipment:'ready'}})}));
vi.mock('./useCommandTree', () => ({COMMAND_TREE_GROUPS:['Abilities','Movement','Vision','Objects','Social','Info']}));
vi.mock('./useCommandTreeGetFrom', () => ({useCommandTreeGetFrom: () => ({
 selected:{key:'backpack',value:'backpack',containerId:'bag',meta:'inventory'},
 items:[{key:'sword',label:'A steel sword',value:'2.sword'}],
 fromSections:[{targets:[{key:'backpack',value:'backpack',containerId:'bag',meta:'inventory',objectId:'bag'}]}],
 selectContainer:vi.fn(), clearSelection:vi.fn(), loading:false
})}));

// --- Selection and Execution ---
it('selects a contained item without executing and restores container actions when reselected', async () => {
 const parent = {id:'bag',label:'Backpack',keyword:'backpack',context:'backpack',category:'cat-inventory-object',group:'inventory',scope:'self'};
 const controller = {entries:[parent],shop:{},activeState:{},actionGroups:[],previewEntity:vi.fn(),game:{executeCommand:vi.fn()}} as unknown as ReturnType<typeof useCommandTreeController>;
 controller.previewEntity = vi.fn(entry => {
  controller.activeState = {entityId:entry?.id} as typeof controller.activeState;
  controller.actionGroups = entry ? [{buttons:[createButton({id:'get',label:'Get',command:entry.parentNoun?'get %n %p':'get %n',setId:'trait-get-container-item'})],inspectionCommands:[]}] as typeof controller.actionGroups : [];
 });
 let menu!: ReturnType<typeof useCommandGearQuickMenu>;
 const root=createRoot(document.createElement('div'));
 function Harness(){menu=useCommandGearQuickMenu(controller,'Inventory');return null;}
 const render=async()=>{await act(async()=>root.render(<Harness/>));};
 const resolve=()=>resolveButtonClickCommand({button:menu.items.actions[0],context:menu.selectedContent?.context||'backpack',parentNoun:menu.selectedContent?.parentNoun,popoverCategory:menu.selectedContent?.category||'cat-inventory-object',target:null,keywordOverrides:{},isTrackpadModifierActive:false,joystickTargetModifierActive:false}).finalCmd;
 try {
  await render();
  await act(async()=>menu.chooseObject(menu.items.objects[0]));
  await render();
  expect(resolve()).toBe('get backpack');
  await act(async()=>menu.chooseContent(menu.contentItems[0]));
  await render();
  expect(menu.items.selected?.id).toBe('bag');
  expect(menu.selectedContent?.parentNoun).toBe('backpack');
  expect(resolve()).toBe('get 2.sword backpack');
  expect(controller.game.executeCommand).not.toHaveBeenCalled();
  await act(async()=>menu.chooseObject(menu.items.objects[0]));
  await render();
  expect(menu.selectedContent).toBeNull();
  expect(resolve()).toBe('get backpack');
 } finally {await act(async()=>root.unmount());}
});
