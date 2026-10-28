// @vitest-environment jsdom
/** @file RoomLootPanel.test.tsx — Direct ground and corpse loot actions. */
import React from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {RoomLootPanel} from './RoomLootPanel';
import type {DrawerLine} from '../../types';

// --- Direct Get workflow ---
afterEach(cleanup);
it('gets ground objects directly and navigates to numbered corpse contents', () => {
 const corpse = {id:'corpse-2',label:'corpse of a rider',commandTarget:'2.rider-corpse',containerId:'body-2'};
 const groundLootItems = [{id:'ground-2',label:'piece of cheese',commandTarget:'2.cheese'}];
 const examineCorpse=vi.fn(), lootCorpse=vi.fn(), lootAllValuables=vi.fn(), executeCorpseCommand=vi.fn(), executeCommand=vi.fn(), transferLootToMount=vi.fn(), setGiveLootToMount=vi.fn();
 const lines: DrawerLine[] = [
  {id:'one',text:'a piece of cheese',html:'',context:'cheese',isItem:true},
  {id:'two',text:'a piece of cheese',html:'',context:'cheese',isItem:true}
 ];
 const props = {isMobile:false, roomCorpses:[corpse], groundLootItems, cargoBusy:false, corpseContents:{},
  examineCorpse, lootCorpse, lootAllValuables, executeCorpseCommand, executeCommand, onClose:vi.fn(), transferLootToMount,
  giveLootToMount:false, setGiveLootToMount, recipientTarget:'mount', setRecipientTarget:vi.fn(), mounts:[]};
 const {rerender}=render(<RoomLootPanel {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'All'}));
 expect(executeCommand).toHaveBeenCalledWith('get all');
 fireEvent.click(screen.getByRole('button',{name:'Valuables'}));
 expect(lootAllValuables).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'piece of cheese'}));
 expect(executeCommand).toHaveBeenCalledWith('get 2.cheese');
 fireEvent.click(screen.getByRole('button',{name:'corpse of a rider'}));
 expect(examineCorpse).toHaveBeenCalledWith(corpse);
 expect(screen.getByText('Examining…')).toBeTruthy();
 rerender(<RoomLootPanel {...props} corpseContents={{'body-2':lines}}/>);
 fireEvent.click(screen.getByRole('button',{name:'All'}));
 expect(lootCorpse).toHaveBeenCalledWith(corpse);
 fireEvent.click(screen.getAllByRole('button',{name:'a piece of cheese'})[1]);
 expect(executeCorpseCommand).toHaveBeenCalledWith(corpse, 'get 2.cheese 2.rider-corpse');
 expect(screen.getByRole('dialog',{name:'Get items'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Back to ground items'}));
 expect(screen.getByRole('button',{name:'piece of cheese'})).toBeTruthy();
 fireEvent.click(screen.getByRole('switch',{name:'Loot to mount'}));
 expect(setGiveLootToMount).toHaveBeenCalledWith(true);
 rerender(<RoomLootPanel {...props} giveLootToMount/>);
 fireEvent.click(screen.getByRole('button',{name:'piece of cheese'}));
 expect(transferLootToMount).toHaveBeenCalledWith([{target:'2.cheese',label:'piece of cheese'}], 'mount');
 fireEvent.click(screen.getByRole('button',{name:'corpse of a rider'}));
 rerender(<RoomLootPanel {...props} giveLootToMount corpseContents={{'body-2':lines}}/>);
 fireEvent.click(screen.getByRole('button',{name:'All'}));
 expect(transferLootToMount).toHaveBeenCalledWith(expect.arrayContaining([{id:'two',target:'2.cheese',label:'a piece of cheese'}]), 'mount', corpse);
 expect(screen.queryByText(/<.*>/)).toBeNull();
});
