/** @file useCommandTree.access.test.tsx — Interact access commands work with doors and containers. */
// @vitest-environment jsdom
import React from 'react';
import {cleanup,render,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useCommandTree} from './useCommandTree';
import type {useCommandTreeController} from './useCommandTreeController';
import type {CommandActionTargetEntry} from '../objects/commandActionTargetModel';
import {COMMAND_TREE_CONTAINER_BUTTONS,getAccessTargets} from '../utils/commandTreeAccess';
import {CommandTreeAccessTargets} from '../components/HUD/CommandTreeAccessTargets';
import {createButton} from '../utils/buttonFactory';
import {MOBILE_COMMAND_TILES,tileContainsCommand} from '../utils/mobileCommandTiles';

vi.mock('./useRoomDrinkWater',()=>({useRoomDrinkWater:()=>false}));
vi.mock('./useGearPanelData',()=>({useGearPanelData:()=>({status:{skills:'ready'}})}));
vi.mock('./useCommandTreeAutomaticTarget',()=>({useCommandTreeAutomaticTarget:()=>null}));
vi.mock('../context/useMapper',()=>({useMapper:()=>({currentRoomId:'1',rooms:{'1':{exits:{e:{doorName:'oakdoor'}}}},renderVersion:1})}));
vi.mock('../components/HUD/CommandTreeAction',()=>({CommandTreeAction:({targetLabel}:{targetLabel?:string})=><button type="button" data-access-target="true">{targetLabel}</button>}));
afterEach(cleanup);

// --- Door and Container Eligibility Section ---
it('keeps Interact access commands available in a room with a door and no containers',()=>{
 const door:CommandActionTargetEntry={id:'east',label:'East',keyword:'e',context:'exit e',category:'cat-exit',group:'objects',scope:'room',hasDoor:true};
 const recoverBtn=createButton({id:'dynamic-thief-Recover',label:'Recover',command:'recover',setId:'thief'});
 const controller={
  game:{characterName:'Tester',inlineCategories:[],roomNpcs:[],entities:{},currentTerrain:'field',viewport:{isMobile:true}},
  ui:{displayInventoryLines:[],displayEqLines:[]},vitals:{characterInfo:{}},entries:[door],menuButtons:[recoverBtn],
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}
 } as unknown as ReturnType<typeof useCommandTreeController>;
 const {result}=renderHook(()=>useCommandTree(controller));
 const interact=result.current.grouped[3].buttons;
 expect(result.current.grouped[0].buttons.some(button=>button.command==='recover')).toBe(true);
 expect(interact.some(button=>button.command==='recover')).toBe(false);
 const thiefTile=MOBILE_COMMAND_TILES.find(tile=>tile.id==='thief')!;
 const interactTile=MOBILE_COMMAND_TILES.find(tile=>tile.id==='interact')!;
 expect(tileContainsCommand(thiefTile,recoverBtn)).toBe(true);
 expect(tileContainsCommand(interactTile,recoverBtn)).toBe(false);
 for(const verb of ['open','close','lock','unlock','pick']){
  const button=interact.find(entry=>entry.id===`v2-container-${verb}`);
  expect(button).toBeDefined();
  expect(result.current.targetsFor(button!)).toEqual([door]);
  const {container:view,unmount}=render(<CommandTreeAccessTargets controller={controller} button={button!} targets={[door]}/>);
  expect(view.querySelector('.movement-pad')).toBeNull();
  expect([...view.querySelectorAll('[data-access-target]')].map(el=>el.textContent)).toEqual(['East (oakdoor)']);
  unmount();
 }
 expect(interact.some(button=>button.id==='v2-container-empty')).toBe(false);
 const container:CommandActionTargetEntry={id:'chest',label:'a wooden chest',keyword:'chest',context:'chest',category:'cat-room-object',group:'objects',scope:'room'};
 const bag:CommandActionTargetEntry={id:'bag',label:'a leather bag',keyword:'bag',context:'bag',category:'cat-room-object',group:'objects',scope:'room'};
 const invChest:CommandActionTargetEntry={id:'inv-chest',label:'a small chest',keyword:'chest',context:'chest',category:'cat-inventory-object',group:'inventory',scope:'self'};
 const wornChest:CommandActionTargetEntry={id:'worn-chest',label:'a worn pouch',keyword:'pouch',context:'pouch',category:'cat-worn-object',group:'worn',scope:'self'};
 const open=COMMAND_TREE_CONTAINER_BUTTONS.find(button=>button.id==='v2-container-open')!;
 const lock=COMMAND_TREE_CONTAINER_BUTTONS.find(button=>button.id==='v2-container-lock')!;
 const unlock=COMMAND_TREE_CONTAINER_BUTTONS.find(button=>button.id==='v2-container-unlock')!;
 const pick=COMMAND_TREE_CONTAINER_BUTTONS.find(button=>button.id==='v2-container-pick')!;
 expect(getAccessTargets([door,{...door,id:'north',hasDoor:false},container],open,{},[])).toEqual([door,container]);
 expect(getAccessTargets([door,{...door,id:'north',hasDoor:false},container,bag,invChest,wornChest],lock,{},[])).toEqual([door]);
 expect(getAccessTargets([door,{...door,id:'north',hasDoor:false},container,bag,invChest,wornChest],unlock,{},[])).toEqual([door]);
 expect(getAccessTargets([door,{...door,id:'north',hasDoor:false},container,bag,invChest],pick,{},[])).toEqual([door,container]);
 expect(result.current.targetsFor(pick)).toEqual([door]);
});
