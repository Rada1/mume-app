/** @file desktopTargetWorkspaceTargets.test.ts — Log-to-menu target identity and location checks. */
import { expect, it } from 'vitest';
import { getDesktopWorkspaceKind, getDesktopWorkspaceTarget } from './desktopTargetWorkspaceTargets';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { PopoverState } from '../types';

// --- Target Identity ---
const room: CommandActionTargetEntry = {id:'roomchars:17', label:'A guard', keyword:'guard', context:'guard', category:'cat-npc', group:'npcs', scope:'room'};
const carried: CommandActionTargetEntry = {id:'gear-guard', label:'Guard statue', keyword:'guard', context:'guard', category:'cat-inventory-object', group:'inventory', scope:'self'};
const request: PopoverState = {x:0, y:0, entityId:'log:17', setId:'cat-npc', context:'guard', keyword:'guard'};
it('matches a log entity to its room target without selecting a carried object with the same keyword', () => {
 expect(getDesktopWorkspaceTarget(request, [carried, room])).toBe(room);
 expect(getDesktopWorkspaceTarget({...request, entityId:'older-log-id'}, [carried, room])).toBe(room);
});
it('resolves gear locations and preserves a clicked target until its snapshot loads', () => {
 expect(getDesktopWorkspaceKind({...request, category:'cat-worn-object'})).toBe('Equipment');
 const inventoryRequest = {...request, category:'cat-inventory-object', displayName:'Guard statue'};
 expect(getDesktopWorkspaceKind(inventoryRequest)).toBe('Inventory');
 expect(getDesktopWorkspaceTarget(inventoryRequest, [])).toMatchObject({context:'guard', scope:'self', group:'inventory'});
});
it('uses the shared Self identity so personal actions remain available under Room', () => {
 expect(getDesktopWorkspaceTarget({...request, keyword:'self', context:'self'}, [])).toMatchObject({id:'command-panel-self', scope:'self'});
});

it('resolves corpse text to the corpse even if its id and keyword match a living animal', () => {
 const pony: CommandActionTargetEntry = {id:'roomchars:17',label:'a pony',keyword:'pony',context:'pony',category:'cat-npc',group:'npcs',scope:'room'};
 const corpse: CommandActionTargetEntry = {id:'room-object:3',label:'corpse of a pony',keyword:'pony-corpse',context:'pony-corpse',category:'cat-room-object',group:'objects',scope:'room'};
 const clicked = {...request,entityId:pony.id,category:'cat-npc',displayName:'corpse of a pony',context:'pony',keyword:'pony'};
 expect(getDesktopWorkspaceTarget(clicked,[pony,corpse])).toBe(corpse);
 expect(getDesktopWorkspaceTarget(clicked,[pony])).toMatchObject({label:'corpse of a pony',context:'pony-corpse',category:'cat-room-object',group:'objects'});
 expect(getDesktopWorkspaceTarget({...clicked,context:'2.pony',keyword:'2.pony'},[pony])).toMatchObject({context:'2.pony-corpse',group:'objects'});
});
