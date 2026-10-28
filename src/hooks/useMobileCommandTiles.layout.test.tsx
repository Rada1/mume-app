/** @file useMobileCommandTiles.layout.test.tsx — Default completion and intentional gaps survive catalog growth. */
// @vitest-environment jsdom
import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {useMobileCommandTiles} from './useMobileCommandTiles';
import {useMobileCommandTilesStore} from '../stores/useMobileCommandTilesStore';
import {createButton} from '../utils/buttonFactory';
import {createMobileTileButton, MOBILE_COMMAND_TILES} from '../utils/mobileCommandTiles';
import {getCommandTreeSection} from '../utils/commandTreeSections';
import type {useCommandTree} from './useCommandTree';
import type {useCommandTreeController} from './useCommandTreeController';

vi.mock('./usePanelData',()=>({usePanelData:()=>({request:vi.fn()})}));
vi.mock('../utils/commandTreeSections',()=>({getCommandTreeSection:vi.fn(()=> 'Move')}));
afterEach(()=>{cleanup();useMobileCommandTilesStore.setState({characters:{},customized:{},socialDefaultUpdated:{}});});

// --- Saved Default and Arrange Workflow Section ---
it('offers social shortcuts and persists arranged tap and swipe actions', () => {
 const say=createButton({id:'say',label:'Say',command:'say',setId:'communicate'});
 const social=createButton({id:'v2-social',label:'Social',command:'social',setId:'social list'});
 const family=MOBILE_COMMAND_TILES.find(tile=>tile.id==='social')!;
 const oldDefault={...createMobileTileButton({...family,preferred:'say'},[say,social])};
 const controller={game:{characterName:'Tester',triggerHaptic:vi.fn()}} as unknown as ReturnType<typeof useCommandTreeController>;
 const grouped=Array.from({length:5},(_,i)=>({label:String(i),buttons:i===4?[say,social]:[]}));
 const tree={grouped,sectionFor:(button:typeof say)=>button.id==='say'?'Messages':'Social actions'} as unknown as ReturnType<typeof useCommandTree>;
 useMobileCommandTilesStore.setState({characters:{tester:[oldDefault]},customized:{}});
 const {result,unmount}=renderHook(()=>useMobileCommandTiles(controller,tree));
 const tile=result.current.tiles.find(entry=>entry.id==='social')!;
 expect(tile.label).toBe('Social');
 expect(tile.commands.map(command=>command.command)).toContain('smile');
 expect(tile.commands.map(command=>command.command)).toContain('raise eyebrow');
 expect(tile.commands.map(command=>command.command)).not.toContain('say');
 expect(tile.button.command).toBe('smile');
 unmount();
 useMobileCommandTilesStore.setState({characters:{tester:[oldDefault]},customized:{tester:[oldDefault.id]},socialDefaultUpdated:{}});
 const manual=renderHook(()=>useMobileCommandTiles(controller,tree));
 expect(manual.result.current.tiles.find(entry=>entry.id==='social')?.button.command).toBe('smile');
 const wave=manual.result.current.tiles.find(entry=>entry.id==='social')!.commands.find(entry=>entry.command==='wave')!;
 act(()=>manual.result.current.assignCommand('social',wave,'center'));
 expect(manual.result.current.tiles.find(entry=>entry.id==='social')?.button.command).toBe('wave');
});

it('previews a held command and clears the draft when the hold ends or unmounts', () => {
 const preview=vi.fn();
 const controller={game:{characterName:'Tester',setCommandPreview:preview},practice:{setOpen:vi.fn()}} as unknown as ReturnType<typeof useCommandTreeController>;
 const tree={grouped:Array.from({length:5},(_,index)=>({label:String(index),buttons:[]}))} as unknown as ReturnType<typeof useCommandTree>;
 const {result,unmount}=renderHook(()=>useMobileCommandTiles(controller,tree));
 const command=createButton({id:'give',label:'Give',command:'give %n',setId:'trait-utility'});
 act(()=>result.current.previewCommand(command));
 expect(preview).toHaveBeenLastCalledWith('give');
 act(()=>result.current.previewCommand(null));
 expect(preview).toHaveBeenLastCalledWith(null);
 act(()=>result.current.previewCommand(command));
 unmount();
 expect(preview).toHaveBeenLastCalledWith(null);
});

it('completes old defaults but keeps a user-created empty cell after further catalog updates', () => {
 const commands = Array.from({length:13},(_,i)=>createButton({id:`get-${i}`,label:`Get ${i}`,command:`get item${i}`,setId:'trait-utility'}));
 const family = MOBILE_COMMAND_TILES.find(tile=>tile.id==='gear')!;
 const saved = createMobileTileButton(family,commands.slice(0,3));
 useMobileCommandTilesStore.setState({characters:{tester:[saved]},customized:{}});
 const controller = {game:{characterName:'Tester',triggerHaptic:vi.fn()}} as unknown as ReturnType<typeof useCommandTreeController>;
 const treeFor = (count:number) => ({grouped:Array.from({length:5},(_,index)=>({label:String(index),buttons:index===3?commands.slice(0,count):[]}))}) as unknown as ReturnType<typeof useCommandTree>;
 const {result,rerender}=renderHook(({count})=>useMobileCommandTiles(controller,treeFor(count)),{initialProps:{count:12}});
 const gear=()=>result.current.tiles.find(tile=>tile.id==='gear')!;
 const bound=()=>[gear().button.command,...Object.values(gear().button.swipeCommands || {})];
 expect(bound()).toHaveLength(9);
 expect(commands.slice(0,12).filter(command=>!bound().includes(command.command))).toHaveLength(3);
 act(()=>result.current.assignCommand('gear',commands[1],'extra'));
 expect(gear().button.swipeCommands?.up).toBeUndefined();
 expect(useMobileCommandTilesStore.getState().customized.tester).toContain(saved.id);
 rerender({count:13});
 expect(gear().button.swipeCommands?.up).toBeUndefined();
 expect(bound().filter(Boolean)).toHaveLength(8);
});

it('preserves an existing manually arranged layout from before explicit arrangement tracking', () => {
 const command = createButton({id:'get',label:'Get',command:'get %n',setId:'trait-utility'});
 const saved = {...createMobileTileButton(MOBILE_COMMAND_TILES[8],[command]),rebindSets:{}};
 useMobileCommandTilesStore.setState({characters:{tester:[saved]},customized:{}});
 const controller={game:{characterName:'Tester'}} as unknown as ReturnType<typeof useCommandTreeController>;
 const tree={grouped:Array.from({length:5},(_,i)=>({label:String(i),buttons:i===3?[command,{...command,id:'drop',command:'drop %n'}]:[]}))} as unknown as ReturnType<typeof useCommandTree>;
 const {result}=renderHook(()=>useMobileCommandTiles(controller,tree));
 expect(result.current.tiles.find(tile=>tile.id==='gear')?.button).toBe(saved);
});

// --- Catalog Work Reuse Section ---
it('reuses family classification across persistence, arrangement and unrelated renders', () => {
 const command=createButton({id:'get',label:'Get',command:'get %n',setId:'trait-utility'});
 const drop=createButton({id:'drop',label:'Drop',command:'drop %n',setId:'trait-utility'});
 const reads=vi.fn();
 const groups=(commands:typeof command[])=>Array.from({length:5},(_,i)=>({
  label:String(i),get buttons(){reads(i);return i===3?commands:[];}
 }));
 const controller={game:{characterName:'Tester',triggerHaptic:vi.fn()}} as unknown as ReturnType<typeof useCommandTreeController>;
 const initialGroups=groups([command]);
 vi.mocked(getCommandTreeSection).mockClear();
 const {result,rerender}=renderHook(({grouped})=>useMobileCommandTiles(controller,{grouped} as unknown as ReturnType<typeof useCommandTree>),{initialProps:{grouped:initialGroups}});
 const gear=()=>result.current.tiles.find(tile=>tile.id==='gear')!;
 const originalCommands=gear().commands;
 // Initial default persistence triggers a render but does not repeat filtering.
 expect(reads).toHaveBeenCalledTimes(5);
 expect(getCommandTreeSection).toHaveBeenCalledTimes(1);
 act(()=>result.current.assignCommand('gear',command,'extra'));
 rerender({grouped:initialGroups});
 expect(gear().commands).toBe(originalCommands);
 expect(reads).toHaveBeenCalledTimes(5);
 expect(getCommandTreeSection).toHaveBeenCalledTimes(1);
 // A new eligibility snapshot refreshes availability without reclassifying old commands.
 rerender({grouped:groups([command,drop])});
 expect(gear().commands).toEqual([command,drop]);
 expect(reads).toHaveBeenCalledTimes(10);
 expect(getCommandTreeSection).toHaveBeenCalledTimes(2);
 rerender({grouped:groups([drop])});
 expect(gear().commands).toEqual([drop]);
 expect(getCommandTreeSection).toHaveBeenCalledTimes(2);
});

it('uses the shared catalog section cache when assigning mobile families', () => {
 const button=createButton({id:'get',label:'Get',command:'get %n',setId:'trait-utility'});
 const sectionFor=vi.fn(()=> 'Move');
 const controller={game:{characterName:'Tester'}} as unknown as ReturnType<typeof useCommandTreeController>;
 const grouped=Array.from({length:5},(_,i)=>({label:String(i),buttons:i===3?[button]:[]}));
 vi.mocked(getCommandTreeSection).mockClear();
 const {result}=renderHook(()=>useMobileCommandTiles(controller,{grouped,sectionFor} as unknown as ReturnType<typeof useCommandTree>));
 expect(result.current.tiles.find(tile=>tile.id==='gear')?.commands).toEqual([button]);
 expect(sectionFor).toHaveBeenCalledTimes(1);
 expect(getCommandTreeSection).not.toHaveBeenCalled();
});
