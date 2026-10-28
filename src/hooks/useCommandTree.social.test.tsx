/** @file useCommandTree.social.test.tsx — Social is one themed command instead of a flat social list. */
// @vitest-environment jsdom
import React from 'react';
import {cleanup,render,renderHook,screen,fireEvent} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useCommandTree} from './useCommandTree';
import type {useCommandTreeController} from './useCommandTreeController';
import type {CommandActionTargetEntry} from '../objects/commandActionTargetModel';
import {SOCIAL_BUTTONS} from '../constants/buttons/socials';
import {COMMAND_TREE_SOCIAL_THEMES,isCommandTreeSocial} from '../utils/commandTreeSocial';
import {CommandTreeSocialTargets} from '../components/HUD/CommandTreeSocialTargets';

vi.mock('./useRoomDrinkWater',()=>({useRoomDrinkWater:()=>false}));
vi.mock('./useGearPanelData',()=>({useGearPanelData:()=>({status:{skills:'ready'}})}));
vi.mock('./useCommandTreeAutomaticTarget',()=>({useCommandTreeAutomaticTarget:()=>null}));
vi.mock('../components/HUD/CommandTreeAction',()=>({CommandTreeAction:({targetLabel,button}:{targetLabel?:string;button:{command:string}})=><button type="button" data-social-target="true">{`${button.command}|${targetLabel}`}</button>}));
afterEach(cleanup);

it('replaces the flat social list with one Social command and themed columns',()=>{
 const npc:CommandActionTargetEntry={id:'npc',label:'Gandalf',keyword:'gandalf',context:'gandalf',category:'cat-ally',group:'players',scope:'room'};
 const object:CommandActionTargetEntry={id:'object',label:'wooden chest',keyword:'2.chest',context:'2.chest',category:'cat-room-object',group:'objects',scope:'room'};
 const inventory:CommandActionTargetEntry={id:'inventory',label:'sword',keyword:'sword',context:'sword',category:'cat-inventory-object',group:'inventory',scope:'self'};
 const controller={
  game:{characterName:'Tester',inlineCategories:[],roomNpcs:[],entities:{},currentTerrain:'field',viewport:{isMobile:true},executeCommand:vi.fn(),initAudio:vi.fn(),isSoundEnabled:false,playClickSound:vi.fn()},
  ui:{displayInventoryLines:[],displayEqLines:[]},vitals:{characterInfo:{}},entries:[npc,object,inventory],menuButtons:SOCIAL_BUTTONS,
  previewEntity:vi.fn(),previewTargetContext:vi.fn(),practice:{open:false,setOpen:vi.fn()},shop:{browsing:false}
 } as unknown as ReturnType<typeof useCommandTreeController>;
 const {result}=renderHook(()=>useCommandTree(controller));
 const social=result.current.grouped[4].buttons;
 expect(social.filter(isCommandTreeSocial)).toHaveLength(1);
 expect(social.some(button=>button.id.startsWith('soc-'))).toBe(false);
 const button=social.find(isCommandTreeSocial)!;
 expect(result.current.targetsFor(button).some(entry=>entry.id==='npc')).toBe(true);
 expect(COMMAND_TREE_SOCIAL_THEMES.map(theme=>theme.label)).toEqual(['Signals','Happy','Sad','Ponder','Angry','Affection','Silly']);
 render(<CommandTreeSocialTargets controller={controller} button={button} targets={result.current.targetsFor(button)}/>);
 fireEvent.click(screen.getByText('Signals'));
 fireEvent.click(screen.getByText('Nod'));
 expect([...document.querySelectorAll('[data-social-target]')].map(el=>el.textContent)).toEqual(['nod %n|Gandalf']);
 fireEvent.click(screen.getByText('No target'));
 expect(controller.game.executeCommand).toHaveBeenCalledWith('nod',undefined,undefined,undefined,undefined,{fromUi:true});
 const sad = COMMAND_TREE_SOCIAL_THEMES.find(theme => theme.id === 'sad')!;
 expect(sad.socials.every(entry => entry.targeted)).toBe(true);
 fireEvent.click(screen.getByText('Sad'));
 fireEvent.click(screen.getByText('Sniff'));
 expect([...document.querySelectorAll('[data-social-target]')].map(el=>el.textContent)).toEqual(['sniff %n|Gandalf']);
 fireEvent.click(screen.getByText('No target'));
 expect(controller.game.executeCommand).toHaveBeenCalledWith('sniff',undefined,undefined,undefined,undefined,{fromUi:true});
 const happy = COMMAND_TREE_SOCIAL_THEMES.find(theme => theme.id === 'happy')!;
 expect(happy.socials.every(entry => entry.targeted)).toBe(true);
 fireEvent.click(screen.getByText('Happy'));
 fireEvent.click(screen.getByText('Laugh'));
 expect([...document.querySelectorAll('[data-social-target]')].map(el=>el.textContent)).toEqual(['laugh %n|Gandalf']);
 fireEvent.click(screen.getByText('No target'));
 expect(controller.game.executeCommand).toHaveBeenCalledWith('laugh',undefined,undefined,undefined,undefined,{fromUi:true});
 fireEvent.click(screen.getByText('Signals'));
 fireEvent.click(screen.getByText('Point'));
 expect([...document.querySelectorAll('[data-social-target]')].map(el=>el.textContent)).toEqual(['point %n|Gandalf', 'point %n|2. wooden chest']);
 expect(screen.queryByText('point %n|sword')).toBeNull();
 fireEvent.click(screen.getByText('North'));
 expect(controller.game.executeCommand).toHaveBeenCalledWith('point north',undefined,undefined,undefined,undefined,{fromUi:true});
});
