/** @file useCommandTree.performance.test.tsx - Guards cached target checks during menu navigation. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useCommandTree } from './useCommandTree';
import type { useCommandTreeController } from './useCommandTreeController';
import { createButton } from '../utils/buttonFactory';
import { getEligibleActionButtonIds, isButtonValidForEntity } from '../utils/actionUtils';
import { deduplicateCommandTreeButtons } from '../utils/commandTreeIdentity';
import { getPracticeClassKey } from '../utils/practiceClassCatalog';
// --- Mock Section ---
vi.mock('./useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));
vi.mock('./useGearPanelData', () => ({ useGearPanelData: () => ({status:{skills:'ready'}}) }));
vi.mock('../utils/commandTreeIdentity', async importOriginal => {
 const actual = await importOriginal<typeof import('../utils/commandTreeIdentity')>();
 return {...actual, deduplicateCommandTreeButtons: vi.fn(actual.deduplicateCommandTreeButtons)};
});
vi.mock('../utils/practiceClassCatalog', async importOriginal => {
 const actual = await importOriginal<typeof import('../utils/practiceClassCatalog')>();
 return {...actual, getPracticeClassKey: vi.fn(actual.getPracticeClassKey)};
});
vi.mock('../utils/actionUtils', async importOriginal => {
 const actual = await importOriginal<typeof import('../utils/actionUtils')>();
 return {...actual, getEligibleActionButtonIds: vi.fn(actual.getEligibleActionButtonIds), isButtonValidForEntity: vi.fn(() => true)};
});
vi.mock('../utils/inlineActionModel', async importOriginal => ({
 ...await importOriginal<typeof import('../utils/inlineActionModel')>(),
 getResolvedTraitSections: vi.fn((category: string) => [{trait:{id:category}}]),
 getButtonIdsForTraits: vi.fn((traits: {id:string}[]) => ['test-hit','test-tell','test-whisper','test-follow', ...(traits[0]?.id === 'cat-ally-remote' ? ['old-bless'] : ['test-cast']), ...(traits[0]?.id === 'cat-worn-object' ? ['btn-worn-remove'] : traits[0]?.id === 'cat-inventory-object' ? ['btn-inv-wear','btn-inv-drop'] : traits[0]?.id === 'cat-room-object' ? ['btn-get'] : [])])
}));
// --- Render Checks ---
it('reuses target eligibility when opening branches and on unrelated renders', async () => {
 const controller = {
  game:{characterName:'Ellessar',inlineCategories:[],roomNpcs:[],entities:{},currentTerrain:'field'},
  ui:{},vitals:{characterInfo:{}},entries:[
   {id:'room-npc',label:'Guard',context:'guard',keyword:'guard',category:'cat-npc',group:'npcs',scope:'room'},
   {id:'boots',label:'Boots',context:'boots',keyword:'boots',category:'cat-worn-object',group:'worn',scope:'self'},
   {id:'coat',label:'Coat',context:'coat',keyword:'coat',category:'cat-inventory-object',group:'inventory',scope:'self'},
   {id:'bag',label:'Bag',context:'bag',keyword:'bag',category:'cat-room-object',group:'objects',scope:'room'},
   {id:'ally',label:'Ally',context:'ally',keyword:'ally',category:'cat-ally-remote',group:'players',scope:'remote'}
  ],
  menuButtons:[createButton({id:'test-hit',label:'Hit',command:'hit %n',setId:'trait-offense'}),createButton({id:'old-hit',label:'Hit',command:'hit',setId:'warriorskilllist'}),createButton({id:'test-cast',label:'Bless',command:'cast bless %n',setId:'trait-buffs'}),createButton({id:'old-bless',label:'bless',command:'bless',setId:'clericspelllist'}),createButton({id:'quoted-bless',label:'Bless',command:"cast 'bless'",setId:'clericspelllist'}),createButton({id:'class-cleric',label:'Cleric',command:'cleric',setId:'spellbook'}),
   createButton({id:'old-tell',label:'Tell',command:'tell',setId:'communicate'}),createButton({id:'test-tell',label:'Tell',command:'tell %n',setId:'trait-communication'}),
   createButton({id:'old-whisper',label:'Whisper',command:'whisper',setId:'communicate'}),createButton({id:'test-whisper',label:'Whisper',command:'whisper %n',setId:'trait-communication'}),
   createButton({id:'old-follow',label:'Follow $1',command:'follow $1',setId:'inline-ally'}),createButton({id:'test-follow',label:'Follow',command:'follow %n',setId:'inline-ally'})],
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),
  practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}
 } as unknown as ReturnType<typeof useCommandTreeController>;
 let tree: ReturnType<typeof useCommandTree>;
 const host=document.createElement('div');
 const root=createRoot(host);
 function Harness() {tree=useCommandTree(controller); return null;}
 try {
  await act(async () => root.render(<Harness/>));
  tree.grouped.forEach(entry => { void entry.buttons; }); // Exercise the full catalog for the reuse checks below.
  const first=vi.mocked(isButtonValidForEntity).mock.calls.length;
  expect(first).toBeGreaterThan(0);
  await act(async () => tree.chooseGroup(0));
  expect(tree.grouped[0].buttons.filter(button=>button.label==='Hit')).toHaveLength(1);
  expect(tree.grouped[0].buttons.find(button=>button.label==='Hit')?.command).toBe('hit %n');
  expect(tree.grouped[0].buttons.filter(button=>button.label.toLowerCase()==='bless')).toHaveLength(1);
  expect(tree.grouped[0].buttons.some(button=>button.label==='Cleric')).toBe(false);
  expect(tree.commandSections.map(section => section.label)).toEqual(['Combat action','Warrior','Thief','Mage','Cleric','Ranger','Training']);
  expect(tree.commandSections.flatMap(section => section.buttons.map(button => button.id))).toEqual(expect.arrayContaining(['test-hit','test-cast']));
  await act(async () => tree.chooseCommand(tree.grouped[0].buttons.find(button=>button.id==='test-cast')!));
  expect(tree.targets.map(entry=>entry.id)).toContain('ally');
  await act(async () => tree.chooseCommand(controller.menuButtons[0]));
  await act(async () => root.render(<Harness/>));
  expect(vi.mocked(isButtonValidForEntity).mock.calls.length).toBe(first);
  await act(async () => tree.chooseGroup(3));
  expect(tree.grouped.map(group=>group.label)).toEqual(['Abilities','Movement','Observation','Objects','Social','Info']);
  expect(tree.commandSections.map(section=>section.label)).toEqual(expect.arrayContaining(['Move']));
  const itemCommands=tree.commandSections.flatMap(section=>section.buttons);
  expect(itemCommands.map(button=>button.label)).toEqual(expect.arrayContaining(['Remove','Wear','Drop','Get']));
  for (const [verb,id] of [['remove','boots'],['wear','coat'],['drop','coat'],['get','bag']]) {
   const button=itemCommands.find(button=>button.command === `${verb} %n`)!;
   await act(async()=>tree.chooseCommand(button));
   expect(tree.targets.filter(entry=>entry.keyword!=='all').map(entry=>entry.id)).toEqual([id]);
  }
  expect(vi.mocked(isButtonValidForEntity).mock.calls.length).toBe(first);
  controller.shop.available=true;
  await act(async()=>root.render(<Harness/>));
  const shopSection=tree.commandSections.find(section=>section.label==='Shop');
  expect(shopSection?.buttons.map(button=>button.label)).toEqual(['Buy','Sell','Value','Compare','Show']);
  await act(async()=>tree.chooseGroup(4));
  const communication=tree.commandSections.flatMap(section=>section.buttons);
  const laugh=communication.find(button=>button.label==='Laugh')!;
  expect(laugh.command).toBe('laugh %n');
  await act(async()=>tree.chooseCommand(laugh));
  expect(tree.targets.map(entry=>entry.id)).toEqual(['command-panel-self','room-npc']);
  for(const label of ['Tell','Whisper','Follow']) {
   const matching=communication.filter(button=>button.label===label);
   expect(matching).toHaveLength(1);
   expect(matching[0].command).toBe(`${label.toLowerCase()} %n`);
   await act(async()=>tree.chooseCommand(matching[0]));
   if (label === 'Tell') expect(tree.targets).toEqual([]); // Tell uses the separate online-player cascade.
   else expect(tree.targets.length).toBeGreaterThan(0);
  }
  expect(communication.some(button=>button.label.includes('$1'))).toBe(false);
  const beforeCharacterChange=vi.mocked(isButtonValidForEntity).mock.calls.length;
  controller.vitals.characterInfo={...controller.vitals.characterInfo,race:'elf'};
  await act(async()=>root.render(<Harness/>));
  expect(vi.mocked(isButtonValidForEntity).mock.calls.length).toBeGreaterThan(beforeCharacterChange);
  const catalogRebuilds = vi.mocked(deduplicateCommandTreeButtons).mock.calls.length;
  const sectionLookups = vi.mocked(getPracticeClassKey).mock.calls.length;
  const hitBeforeRoomUpdate = tree.grouped[0].buttons.find(button => button.id === 'test-hit');
  const beforeTargetsChange=vi.mocked(isButtonValidForEntity).mock.calls.length;
  controller.entries=controller.entries.filter(entry=>entry.id!=='room-npc');
  await act(async()=>root.render(<Harness/>));
  expect(vi.mocked(isButtonValidForEntity).mock.calls.length).toBeGreaterThan(beforeTargetsChange);
  expect(tree.targetsFor(controller.menuButtons[0]).some(entry=>entry.id==='room-npc')).toBe(false);
  expect(vi.mocked(deduplicateCommandTreeButtons)).toHaveBeenCalledTimes(catalogRebuilds);
  expect(vi.mocked(getPracticeClassKey)).toHaveBeenCalledTimes(sectionLookups);
  expect(tree.grouped[0].buttons.find(button => button.id === 'test-cast')).toBeDefined();
  controller.entries = [...controller.entries, {id:'new-guard',label:'Guard',context:'guard',keyword:'guard',category:'cat-npc',group:'npcs',scope:'room'}];
  await act(async()=>root.render(<Harness/>));
  expect(tree.targetsFor(controller.menuButtons[0]).some(entry => entry.id === 'new-guard')).toBe(true);
  expect(tree.grouped[0].buttons.find(button => button.id === 'test-hit')).toBe(hitBeforeRoomUpdate);
  expect(vi.mocked(deduplicateCommandTreeButtons)).toHaveBeenCalledTimes(catalogRebuilds);
  expect(vi.mocked(getPracticeClassKey)).toHaveBeenCalledTimes(sectionLookups);
  controller.practice.guild={...controller.practice.guild,hasGuildmaster:true};
  await act(async()=>root.render(<Harness/>));
  await act(async()=>tree.chooseGroup(0));
  const training=tree.commandSections.filter(section=>section.label==='Training');
  expect(training).toHaveLength(1);
  expect(training[0].buttons.map(button=>button.command)).toEqual(['practice %n']);
  expect(controller.practice.setOpen).toHaveBeenLastCalledWith(false);
  await act(async()=>tree.chooseCommand(training[0].buttons[0]));
  expect(controller.practice.setOpen).toHaveBeenLastCalledWith(true);


 } finally {await act(async () => root.unmount());}
});

it('does no hidden-group eligibility work during Info and Observation replies, but refreshes targets when Abilities opens', async () => {
 vi.mocked(isButtonValidForEntity).mockClear();
 vi.mocked(getEligibleActionButtonIds).mockClear();
 const hit = createButton({id:'test-hit',label:'Hit',command:'hit %n',setId:'trait-offense'});
 const guard = {id:'guard',label:'Guard',context:'guard',keyword:'guard',category:'cat-npc',group:'npcs',scope:'room'};
 const controller = {game:{characterName:'Ellessar',inlineCategories:[],roomNpcs:[],entities:{},currentTerrain:'field'},
  ui:{},vitals:{characterInfo:{}},entries:[guard],menuButtons:[hit],previewEntity:vi.fn(),previewTargetContext:vi.fn(),
  practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}} as unknown as ReturnType<typeof useCommandTreeController>;
 let tree!: ReturnType<typeof useCommandTree>;
 const root = createRoot(document.createElement('div'));
 function Harness(){tree=useCommandTree(controller);return null;}
 try {
  await act(async()=>root.render(<Harness/>));
  for(const group of [5,2]) {
   await act(async()=>tree.chooseGroup(group));
   controller.entries = [...controller.entries];
   await act(async()=>root.render(<Harness/>));
   expect(getEligibleActionButtonIds).not.toHaveBeenCalled();
   expect(isButtonValidForEntity).not.toHaveBeenCalled();
  }
  await act(async()=>tree.chooseGroup(0));
  expect(isButtonValidForEntity).toHaveBeenCalled();
  expect(tree.targetsFor(hit).some(entry=>entry.id==='guard')).toBe(true);
  const checks = vi.mocked(isButtonValidForEntity).mock.calls.length;
  await act(async()=>tree.chooseGroup(5));
  controller.entries = [];
  await act(async()=>root.render(<Harness/>));
  expect(isButtonValidForEntity).toHaveBeenCalledTimes(checks);
  await act(async()=>tree.chooseGroup(0));
  expect(tree.targetsFor(hit).some(entry=>entry.id==='guard')).toBe(false);
 } finally {await act(async()=>root.unmount());}
});

it('keeps training navigation stable under StrictMode and external open requests',async()=>{
 const base={ui:{},game:{characterName:'Ellessar',inlineCategories:[],roomNpcs:[],entities:{},currentTerrain:'field'},vitals:{characterInfo:{}},entries:[],menuButtons:[],previewEntity:vi.fn(),previewTargetContext:vi.fn(),shop:{browsing:false}};
 let tree:ReturnType<typeof useCommandTree>;
 let setRequest:(value:number)=>void;
 let renders=0;
 function Harness(){
  const [open,setOpen]=React.useState(false);
  const [request,changeRequest]=React.useState(0);
  setRequest=changeRequest; renders++;
  tree=useCommandTree({...base,practice:{open,setOpen},practiceOpenRequest:request} as unknown as ReturnType<typeof useCommandTreeController>);
  return null;
 }
 const root=createRoot(document.createElement('div'));
 try{
  await act(async()=>root.render(<React.StrictMode><Harness/></React.StrictMode>));
  for(const group of [4,0,4,2,4,3,1,4]){
   await act(async()=>tree.chooseGroup(group));
   expect(tree.group).toBe(group);
  }
  await act(async()=>tree.chooseGroup(0));
  await act(async()=>setRequest(1));
  expect(tree.group).toBe(0);
  await act(async()=>tree.chooseGroup(0));
  expect(tree.group).toBe(null);
  await act(async()=>tree.chooseGroup(0));
  expect(tree.group).toBe(0);
  expect(renders).toBeLessThan(100);
 }finally{await act(async()=>root.unmount());}
});
