/** @file useCommandTree.sheath.test.tsx — Worn sheaths expose gear commands. */
// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCommandTree } from './useCommandTree';
import { getCommandActionTargetEntries } from '../objects/commandActionTargetModel';
import { MOBILE_COMMAND_TILES, tileContainsCommand } from '../utils/mobileCommandTiles';
import type { useCommandTreeController } from './useCommandTreeController';

vi.mock('./useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));
vi.mock('./useGearPanelData', () => ({ useGearPanelData: () => ({status:{skills:'ready'}}) }));
vi.mock('./useCommandTreeAutomaticTarget', () => ({ useCommandTreeAutomaticTarget: () => null }));
afterEach(cleanup);

// --- Worn gear eligibility ---
it('offers draw and sheath for a worn weapon sheath and removes them when it is gone', () => {
 const sheath = {id:'sheath', text:'a weapon sheath with a shiny dagger', html:'', isItem:true, prefix:'<worn on belt>'};
 const makeController = (worn: typeof sheath[]) => ({
  game:{characterName:'Tester',inlineCategories:[],roomNpcs:[],roomItems:[],entities:{},currentTerrain:'field',viewport:{isMobile:true}},
  ui:{displayInventoryLines:[],displayEqLines:worn},vitals:{characterInfo:{}},entries:getCommandActionTargetEntries([],[],[],worn,[]),menuButtons:[],
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}
 } as unknown as ReturnType<typeof useCommandTreeController>);
 const {result,rerender} = renderHook(({worn}) => useCommandTree(makeController(worn)), {initialProps:{worn:[sheath]}});
 const gear = MOBILE_COMMAND_TILES.find(tile => tile.id === 'gear')!;
 const commands = result.current.grouped[3].buttons.filter(button => tileContainsCommand(gear,button,result.current.sectionFor(button)));
 expect(commands.map(button => button.command)).toEqual(expect.arrayContaining(['draw %n','sheath']));
 expect(result.current.targetsFor(commands.find(button => button.command === 'draw %n')!)).toEqual(expect.arrayContaining([expect.objectContaining({group:'worn'})]));
 rerender({worn:[]});
 expect(result.current.grouped[3].buttons.map(button => button.command)).not.toContain('sheath');
});

it('offers bows in inventory and worn gear as draw targets', () => {
 const inventory = [{id:'bow',text:'a longbow',html:'',isItem:true}];
 const worn = [{id:'bow2',text:'a shortbow',html:'',isItem:true,prefix:'<worn on back>'},
  {id:'bow3',text:'a crossbow',html:'',isItem:true,prefix:'<held>'}];
 const controller = {game:{characterName:'Tester',inlineCategories:[],roomNpcs:[],roomItems:[],entities:{},currentTerrain:'field',viewport:{isMobile:true}},
  ui:{displayInventoryLines:inventory,displayEqLines:worn},vitals:{characterInfo:{}},entries:getCommandActionTargetEntries([],[],[],worn,inventory),menuButtons:[],
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}} as unknown as ReturnType<typeof useCommandTreeController>;
 const {result} = renderHook(() => useCommandTree(controller));
 const draw = result.current.grouped[3].buttons.find(button => button.command === 'draw %n');
 expect(draw).toBeDefined();
 expect(result.current.targetsFor(draw!).map(entry => entry.keyword)).toEqual(expect.arrayContaining(['longbow','shortbow']));
 expect(result.current.targetsFor(draw!).map(entry => entry.keyword)).not.toContain('crossbow');
});
