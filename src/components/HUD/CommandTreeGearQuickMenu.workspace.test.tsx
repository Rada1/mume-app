/** @file CommandTreeGearQuickMenu.workspace.test.tsx — Real workspace target selection and staged Give execution. */
// @vitest-environment jsdom
import React, { act, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { CommandTreeGearQuickMenu } from './CommandTreeGearQuickMenu';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { CustomButton } from '../../types';
import { createButton } from '../../utils/buttonFactory';
import type { CommandTreeGetFromTarget } from '../../utils/commandTreeGet';
import type { CommandTargetSuggestion } from '../../objects/targetSuggestionTypes';

// --- External Boundaries ---
vi.mock('../../hooks/useGearPanelData', () => ({useGearPanelData: () => ({status:{inventory:'ready',equipment:'ready'}})}));
vi.mock('../../hooks/useCommandTree', () => ({COMMAND_TREE_GROUPS:['Abilities','Movement','Info','Objects','Social']}));
const contentsFixture = vi.hoisted(() => ({targets:[] as CommandTreeGetFromTarget[], items:[] as CommandTargetSuggestion[], selectContainer:vi.fn(), getItem:vi.fn()}));
vi.mock('../../hooks/useCommandTreeGetFrom', () => ({useCommandTreeGetFrom: () => {
 const [selected,setSelected] = useState<CommandTreeGetFromTarget|null>(null);
 return {items:selected?contentsFixture.items:[], fromSections:[{targets:contentsFixture.targets}], selected,
  selectContainer:(target: CommandTreeGetFromTarget)=>{contentsFixture.selectContainer(target);setSelected(target);},
  clearSelection:()=>setSelected(null), getItem:contentsFixture.getItem, previewItem:vi.fn()};
}}));
vi.mock('./CommandTreeAction', () => ({CommandTreeAction: ({button, onRequestPut, controller}: {
 button: CustomButton; onRequestPut: (button: CustomButton, event: React.MouseEvent) => boolean;
 controller: ReturnType<typeof useCommandTreeController>;
}) => <button data-command={button.command} data-context={controller.activeState.context} data-parent={controller.activeState.parentNoun}
 onClick={event => onRequestPut(button,event)}>{button.label}</button>}));

beforeEach(()=>{contentsFixture.targets=[];contentsFixture.items=[];contentsFixture.selectContainer.mockClear();contentsFixture.getItem.mockClear();});

// --- Target-to-Recipient Flow ---
it('highlights a log-selected target, omits its redundant location heading, and waits for the Give recipient', async () => {
 const source: CommandActionTargetEntry = {id:'lantern',label:'Brass lantern',keyword:'lantern',context:'lantern',category:'cat-inventory-object',group:'inventory',scope:'self'};
 const recipient: CommandActionTargetEntry = {id:'roomchars:17',label:'A guard',keyword:'guard',context:'guard',category:'cat-npc',group:'npcs',scope:'room'};
 const entries = [source, recipient];
 const handleButtonClick = vi.fn();
 const setCommandPreview = vi.fn();
 const give = createButton({id:'give',label:'Give',command:'give %n',setId:'trait-object'});
 const put = createButton({id:'put',label:'Put',command:'put %n',setId:'trait-object'});
 const identify = createButton({id:'identify',label:'Identify',command:"cast 'identify' %n",setId:'magespelllist'});
 const rootNode = document.createElement('div');
 document.body.append(rootNode);
 const root = createRoot(rootNode);
 function Harness() {
  const [active, setActive] = useState<CommandActionTargetEntry|null>(null);
  const previewEntity = useCallback((entry: CommandActionTargetEntry|null) => setActive(entry), []);
  const controller = {entries, shop:{}, previewEntity, activeState:{entityId:active?.id},
   actionGroups:[{buttons:[give,put,identify],inspectionCommands:[]}], isHelpMode:false, dismissOutputs:vi.fn(),
   targetSelection:{colorFor:()=>'#e6c96e'}, ui:{displayInventoryLines:[],displayEqLines:[]},
   game:{characterName:'Tester',gameState:'playing',isSpectateMode:false,roomItems:[{id:'bag',name:'a leather backpack'}],handleButtonClick,setCommandPreview}
  } as unknown as ReturnType<typeof useCommandTreeController>;
  return <CommandTreeGearQuickMenu workspace controller={controller} kind="Inventory" initialTarget={source}
   tree={{defer:action=>action(),cancelPreview:()=>{}}}/>;
 }
 try {
  await act(async () => root.render(<Harness/>));
  const selected = rootNode.querySelector('[data-target-id="lantern"]');
  expect(selected?.getAttribute('aria-expanded')).toBe('true');
  expect(selected?.getAttribute('data-target-kind')).toBe('object');
  expect(rootNode.querySelector('.command-tree-gear-quick-list > .command-tree-section-heading')).toBeNull();
  expect(rootNode.querySelector('.desktop-target-command-label')).toBeNull();
  expect(rootNode.querySelector('[aria-label="Abilities Mage"]')).not.toBeNull();
  const commandHeadings=[...rootNode.querySelectorAll('.command-tree-gear-quick-actions .command-tree-section-heading-label')].map(node=>node.textContent);
  expect(commandHeadings).toContain('Mage');
  expect(commandHeadings).toContain('Move');
  expect(commandHeadings).not.toContain('Abilities');
  expect(commandHeadings).not.toContain('Objects');
  const moveCommands=rootNode.querySelector('.desktop-workspace-command-grid[aria-label="Move commands"]');
  expect(moveCommands?.querySelectorAll('button')).toHaveLength(2);
  const button = [...rootNode.querySelectorAll('button')].find(button=>button.textContent==='Give')!;
  await act(async () => button.click());
  expect(handleButtonClick).not.toHaveBeenCalled();
  const destinationColumn = rootNode.querySelector('[aria-label="Give recipients in this room"]');
  expect(destinationColumn).not.toBeNull();
  const recipientButton = [...destinationColumn!.querySelectorAll('button')].find(button=>button.textContent==='A guard')!;
  await act(async () => recipientButton.click());
  expect(handleButtonClick).toHaveBeenCalledWith(expect.objectContaining({command:'give lantern guard',actionType:'command'}),expect.anything());
  expect(rootNode.querySelector('[data-target-id="lantern"]')?.getAttribute('aria-expanded')).toBe('true');
  const putButton = [...rootNode.querySelectorAll('button')].find(button=>button.textContent==='Put')!;
  await act(async () => putButton.click());
  expect(rootNode.querySelector('[aria-label="Give recipients in this room"]')).toBeNull();
  const containers = rootNode.querySelector('[aria-label="Put destination containers"]');
  expect(containers).not.toBeNull();
  const containerButton = containers!.querySelector<HTMLButtonElement>('button')!;
  await act(async () => containerButton.click());
  expect(handleButtonClick).toHaveBeenLastCalledWith(expect.objectContaining({command:expect.stringMatching(/^put lantern (?:1\.)?backpack$/)}),expect.anything());
 } finally {
  await act(async () => root.unmount());
  rootNode.remove();
 }
});

// --- Container Disclosure and Object Identity ---
it('expands contents beneath a separate corpse chevron, keeps the corpse selectable, and omits G/All', async () => {
 const corpse: CommandActionTargetEntry = {id:'corpse-id',label:'corpse of a guard',keyword:'corpse',context:'corpse',category:'cat-corpse',group:'objects',scope:'room'};
 const boots: CommandActionTargetEntry = {id:'boots-id',label:'leather boots',keyword:'boots',context:'boots',category:'cat-room-object',group:'objects',scope:'room'};
 const entries=[corpse,boots];
 contentsFixture.targets=[{key:'corpse-source',objectId:corpse.id,containerId:'corpse-capture',label:corpse.label,value:'corpse',meta:'room',category:'corpse'}];
 contentsFixture.items=[{key:'all',label:'All',value:'all',meta:'container'},{key:'spear',label:'a longspear (well-maintained)',value:'spear',meta:'inventory'}];
 const rootNode=document.createElement('div');
 document.body.append(rootNode);
 const root=createRoot(rootNode);
 function Harness() {
  const [active,setActive]=useState<CommandActionTargetEntry|null>(null);
  const previewEntity=useCallback((entry: CommandActionTargetEntry|null)=>setActive(entry),[]);
  const buttons=[createButton({id:'get',label:'Get',command:active?.parentNoun?'get %n %p':'get %n',setId:'trait-object'}),
   createButton({id:'btn-corpse-get-all',label:'G/All',command:'get all %n',setId:'inline-corpses'})];
  const controller={entries,shop:{},previewEntity,activeState:{entityId:active?.id,context:active?.context,parentNoun:active?.parentNoun},
   actionGroups:[{buttons,inspectionCommands:[]}],targetSelection:{colorFor:()=>'#e6c96e'},
   ui:{displayInventoryLines:[],displayEqLines:[]},game:{characterName:'Tester',gameState:'playing',isSpectateMode:false,roomItems:[]}
  } as unknown as ReturnType<typeof useCommandTreeController>;
  return <CommandTreeGearQuickMenu workspace kind="Room" controller={controller} initialTarget={corpse}
   tree={{defer:action=>action(),cancelPreview:()=>{}}}/>;
 }
 try {
  await act(async()=>root.render(<Harness/>));
  expect(contentsFixture.selectContainer).not.toHaveBeenCalled();
  expect(rootNode.querySelector('[data-target-id="boots-id"] svg')).toBeNull();
  expect([...rootNode.querySelectorAll('button')].some(button=>button.textContent==='G/All')).toBe(false);
  const toggle=rootNode.querySelector<HTMLButtonElement>('[aria-label="Show contents of corpse of a guard"]')!;
  expect(toggle).not.toBeNull();
  await act(async()=>toggle.click());
  expect(contentsFixture.selectContainer).toHaveBeenCalledOnce();
  const dropdown=rootNode.querySelector('.desktop-target-container-contents')!;
  expect(dropdown.parentElement?.querySelector('.desktop-target-container-row')?.nextElementSibling).toBe(dropdown);
  expect(rootNode.querySelector('.command-tree-gear-quick-contents')).toBeNull();
  const spear=[...dropdown.querySelectorAll('button')].find(button=>button.textContent==='spear')!;
  expect(spear).not.toBeNull();
  await act(async()=>spear.click());
  const get=[...rootNode.querySelectorAll('button')].find(button=>button.textContent==='Get')!;
  expect(get.dataset.command).toBe('get %n %p');
  expect(get.dataset.context).toBe('spear');
  expect(get.dataset.parent).toBe('corpse');
  await act(async()=>rootNode.querySelector<HTMLButtonElement>('[data-target-id="corpse-id"]')!.click());
  expect(get.dataset.command).toBe('get %n');
  expect(get.dataset.context).toBe('corpse');
  await act(async()=>toggle.click());
  expect(rootNode.querySelector('.desktop-target-container-contents')).toBeNull();
 } finally {await act(async()=>root.unmount());rootNode.remove();}
});
