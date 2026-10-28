/** @file useCommandTree.mounts.test.tsx — Ordinary NPC mounts enable mount commands through their traits. */
// @vitest-environment jsdom
import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {useCommandTree} from './useCommandTree';
import {NPC_BUTTONS} from '../constants/buttons/inline/npcs';
import {getCommandActionTargetEntries} from '../objects/commandActionTargetModel';
import type {GmcpOccupant} from '../types';
import type {useCommandTreeController} from './useCommandTreeController';

vi.mock('./useRoomDrinkWater',()=>({useRoomDrinkWater:()=>false}));
vi.mock('./useGearPanelData',()=>({useGearPanelData:()=>({status:{skills:'ready'}})}));
vi.mock('./useCommandTreeAutomaticTarget',()=>({useCommandTreeAutomaticTarget:()=>null}));
afterEach(cleanup);

// --- Live Room Mount Eligibility Section ---
it('enables Ride and Lead for pack horses, ponies and mules classified as NPCs', () => {
 const animals: GmcpOccupant[] = [
  {id:'mount-horse',name:'a sturdy pack horse',type:'npc',pc:false},
  {id:'mount-pony',name:'a pony',type:'npc',pc:false},
  {id:'mount-mule',name:'a mule',type:'npc',pc:false}
 ];
 const guard: GmcpOccupant = {id:'guard',name:'a town guard',type:'npc',pc:false};
 const controllerFor = (npcs:GmcpOccupant[]) => ({
  game:{characterName:'Tester',inlineCategories:[],roomNpcs:npcs,entities:{},currentTerrain:'field',viewport:{isMobile:true}},
  ui:{displayInventoryLines:[],displayEqLines:[]},vitals:{characterInfo:{}},
  entries:getCommandActionTargetEntries([],npcs,[],[],[]),menuButtons:NPC_BUTTONS,
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}
 }) as unknown as ReturnType<typeof useCommandTreeController>;
 const {result,rerender}=renderHook(({npcs})=>useCommandTree(controllerFor(npcs)),{initialProps:{npcs:[guard]}});
 expect(result.current.grouped[1].buttons.some(button=>button.id==='btn-mount-ride')).toBe(false);
 rerender({npcs:[guard,...animals]});
 expect(controllerFor(animals).entries.every(entry=>entry.category==='cat-npc')).toBe(true);
 for (const id of ['btn-mount-ride','btn-mount-lead']) {
  const button=result.current.grouped[1].buttons.find(entry=>entry.id===id);
  expect(button).toBeDefined();
  expect(result.current.targetsFor(button!)?.map(entry=>entry.id)).toEqual(animals.map(animal=>`roomchars:${animal.id}`));
 }
 act(()=>result.current.chooseGroup(1));
 expect(result.current.commandSections.find(section=>section.label==='Mounts')?.buttons.map(button=>button.id)).toContain('btn-mount-ride');
});
