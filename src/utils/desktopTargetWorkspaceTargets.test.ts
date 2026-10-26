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
