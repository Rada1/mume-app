/** @file useCommandTreeItems.test.tsx - Checks location-first item navigation and contextual actions. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useCommandTreeItems } from './useCommandTreeItems';
import type { useCommandTreeController } from './useCommandTreeController';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { createButton } from '../utils/buttonFactory';
import { useGearPanelData } from './useGearPanelData';
// --- Mock Section ---
vi.mock('./useGearPanelData', () => ({useGearPanelData:vi.fn(() => ({status:{equipment:'ready',inventory:'ready'}}))}));
// --- Navigation Checks ---
it('opens Equipment / Inventory / Room, lists matching objects, then their actions', async () => {
 const entry=(id: string, group: CommandActionTargetEntry['group'], scope: CommandActionTargetEntry['scope']): CommandActionTargetEntry => ({id,label:id,context:id,keyword:id,group,scope,category:group==='worn'?'cat-worn-object':group==='inventory'?'cat-inventory-object':'cat-room-object'});
 const worn=entry('boots','worn','self');
 const carried=entry('flask','inventory','self');
 const nearby=entry('sword','objects','room');
 const remove=createButton({id:'remove',label:'Remove',command:'remove %n',setId:'trait-object'});
 const drop=createButton({id:'drop',label:'Drop',command:'drop %n',setId:'trait-object'});
 const previewEntity=vi.fn();
 const controller={entries:[worn,carried,nearby],shop:{available:true},previewEntity,activeState:{entityId:'boots'},actionGroups:[{buttons:[remove],inspectionCommands:[]}]} as unknown as ReturnType<typeof useCommandTreeController>;
 const root=createRoot(document.createElement('div'));
 let items: ReturnType<typeof useCommandTreeItems>;
 function Harness({location}:{location:string|null}) {items=useCommandTreeItems(controller,location);return null;}
 try {
  await act(async()=>root.render(<Harness location={null}/>));
  expect(items.locations).toEqual(['Equipment','Inventory','Room','Shop']);
  expect(items.objects).toEqual([]);
  expect(useGearPanelData).toHaveBeenLastCalledWith(false,false);
  await act(async()=>root.render(<Harness location="Equipment"/>));
  expect(items.objects).toEqual([worn]);
  expect(items.actions).toEqual([]);
  expect(useGearPanelData).toHaveBeenLastCalledWith(true,false);
  await act(async()=>items.chooseObject(worn));
  expect(previewEntity).toHaveBeenLastCalledWith(worn);
  expect(items.actions).toEqual([remove]);
  await act(async()=>root.render(<Harness location="Inventory"/>));
  expect(items.objects).toEqual([carried]);
  expect(items.selected).toBeNull();
  expect(items.actions).toEqual([]);
  expect(useGearPanelData).toHaveBeenLastCalledWith(false,true);
  controller.activeState.entityId='flask';
  controller.actionGroups=[{section:{key:'object',label:'Object'},buttons:[drop],inspectionCommands:[]}];
  await act(async()=>items.chooseObject(carried));
  expect(items.actions).toEqual([drop]);
  await act(async()=>root.render(<Harness location="Room"/>));
  expect(items.objects).toEqual([nearby]);
  expect(items.selected).toBeNull();
  expect(useGearPanelData).toHaveBeenLastCalledWith(false,false);
  await act(async()=>root.render(<Harness location="All"/>));
  expect(items.objectSections.map(section=>section.label)).toEqual(['Equipment','Inventory','Room']);
  expect(items.objectSections.map(section=>section.objects)).toEqual([[worn],[carried],[nearby]]);
  expect(useGearPanelData).toHaveBeenLastCalledWith(true,true);
 } finally {await act(async()=>root.unmount());}
});
