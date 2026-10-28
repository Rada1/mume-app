/** @file useCommandTree.search.test.tsx — Observe search actions expose pace choices without room entities. */
// @vitest-environment jsdom
import {cleanup,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useCommandTree} from './useCommandTree';
import type {useCommandTreeController} from './useCommandTreeController';
import {createButton} from '../utils/buttonFactory';
import {MOBILE_COMMAND_TILES,tileContainsCommand} from '../utils/mobileCommandTiles';
import {applyTargetToCommand,getCommandTargetMenuKind} from '../utils/commandTargetUtils';

vi.mock('./useRoomDrinkWater',()=>({useRoomDrinkWater:()=>false}));
vi.mock('./useGearPanelData',()=>({useGearPanelData:()=>({status:{skills:'ready'}})}));
vi.mock('./useCommandTreeAutomaticTarget',()=>({useCommandTreeAutomaticTarget:()=>null}));
afterEach(cleanup);

// --- Observation Search Workflow Section ---
it('deduplicates Reveal/Flush in Observe and sends each selected pace as its argument',()=>{
 const controller={
  game:{characterName:'Tester',inlineCategories:[],roomNpcs:[],entities:{},viewport:{isMobile:true}},
  ui:{displayInventoryLines:[],displayEqLines:[]},vitals:{characterInfo:{}},entries:[],
  menuButtons:['reveal','flush'].map(verb=>createButton({id:verb,label:verb,command:verb,setId:'trait-utility'})),
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}
 } as unknown as ReturnType<typeof useCommandTreeController>;
 const {result}=renderHook(()=>useCommandTree(controller));
 for(const verb of ['reveal','flush']){
  const buttons=result.current.grouped[2].buttons.filter(button=>button.command.startsWith(verb));
  expect(buttons).toHaveLength(1);
  const button=buttons[0];
  expect(tileContainsCommand(MOBILE_COMMAND_TILES.find(tile=>tile.id==='observe')!,button)).toBe(true);
  expect(getCommandTargetMenuKind(button.command)).toBe('pace-options');
  const targets=result.current.targetsFor(button);
  expect(targets.map(target=>target.label)).toEqual(['Quick','Fast','Normal','Careful','Thorough']);
  expect(targets.map(target=>applyTargetToCommand(button.command,target.context))).toEqual(
   ['quick','fast','normal','careful','thorough'].map(pace=>`${verb} ${pace}`));
 }
});
