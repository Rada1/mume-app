/** @file useCommandTree.corpses.test.tsx — Corpse commands route to Consume or Interact. */
// @vitest-environment jsdom
import {cleanup, renderHook} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {useCommandTree} from './useCommandTree';
import {getCommandActionTargetEntries} from '../objects/commandActionTargetModel';
import {getDesktopCategoryCommands, getDesktopCommandCategories} from '../utils/desktopCommandCategories';
import {MOBILE_COMMAND_TILES, tileContainsCommand} from '../utils/mobileCommandTiles';
import type {useCommandTreeController} from './useCommandTreeController';

vi.mock('./useRoomDrinkWater',()=>({useRoomDrinkWater:()=>false}));
vi.mock('./useGearPanelData',()=>({useGearPanelData:()=>({status:{skills:'ready'}})}));
vi.mock('./useCommandTreeAutomaticTarget',()=>({useCommandTreeAutomaticTarget:()=>null}));
afterEach(cleanup);

// --- Corpse command routing ---
it.each(['Elf','Orc'])('routes corpse actions with the correct race eligibility for %s', race => {
 const objects = [{id:'body',name:'corpse of a pony',type:'object'}];
 const controller = {game:{characterName:'Tester',inlineCategories:[],roomNpcs:[],roomItems:objects,entities:{},currentTerrain:'field',viewport:{isMobile:true}},
  ui:{displayInventoryLines:[],displayEqLines:[]},vitals:{characterInfo:{race}},entries:getCommandActionTargetEntries([],[],objects,[],[]),menuButtons:[],
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}} as unknown as ReturnType<typeof useCommandTreeController>;
 const {result}=renderHook(()=>useCommandTree(controller));
 const commands=result.current.grouped[3].buttons;
 for (const id of ['btn-corpse-butcher','btn-corpse-burn','btn-corpse-bury']) {
  const button=commands.find(item=>item.id===id);
  expect(button).toBeDefined();
  expect(result.current.targetsFor(button!)).toEqual(expect.arrayContaining([expect.objectContaining({context:'pony-corpse'})]));
  const targetTile = id === 'btn-corpse-butcher' ? 'consume' : 'interact';
  expect(tileContainsCommand(MOBILE_COMMAND_TILES.find(tile=>tile.id===targetTile)!,button!,result.current.sectionFor(button!))).toBe(true);
 }
 const interact=getDesktopCommandCategories(false).find(category=>category.id==='interact')!;
 const consume=getDesktopCommandCategories(false).find(category=>category.id==='consume')!;
 expect(getDesktopCategoryCommands(interact,result.current.grouped).map(button=>button.id)).not.toContain('btn-corpse-butcher');
 expect(getDesktopCategoryCommands(consume,result.current.grouped).map(button=>button.id)).toContain('btn-corpse-butcher');
 expect(commands.some(button=>button.id==='btn-corpse-drain')).toBe(race==='Orc');
 expect(getDesktopCategoryCommands(consume,result.current.grouped).some(button=>button.id==='btn-corpse-drain')).toBe(race==='Orc');
 expect(getDesktopCategoryCommands(interact,result.current.grouped).some(button=>button.id==='btn-corpse-drain')).toBe(false);
});
