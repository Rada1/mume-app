/** @file desktopTargetWorkspaceTargets.ts — Resolve log selections against the quick-menu target model. */
import type { PopoverState } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getInlineCategoryAxes, normalizeInlineCategoryId } from './inlineCategoryAxes';

// --- Request Resolution ---
export const getDesktopWorkspaceKind = (request: PopoverState): 'Room'|'Inventory'|'Equipment' => {
 const location = getInlineCategoryAxes(request.category || request.setId || '').location;
 return location === 'worn' ? 'Equipment' : location === 'carried' ? 'Inventory' : 'Room';
};

export const getDesktopWorkspaceTarget = (request: PopoverState, entries: CommandActionTargetEntry[]): CommandActionTargetEntry => {
 const exact = entries.find(entry => entry.id === request.entityId);
 if (exact) return exact;
 const category = normalizeInlineCategoryId(request.category || request.setId || 'cat-room-object');
 const kind = getDesktopWorkspaceKind(request);
 const context = request.context || request.keyword || '';
 const keyword = request.keyword || context;
 if (keyword.toLowerCase() === 'self') return {
  id:'command-panel-self', label:'Self', keyword:'self', context:'self', category:'cat-ally', group:'players', scope:'self'
 };
 const local = entries.filter(entry => kind === 'Equipment' ? entry.group === 'worn'
  : kind === 'Inventory' ? entry.group === 'inventory' : entry.scope === 'room');
 const sameId = local.filter(entry => entry.id.split(':').pop() === request.entityId?.split(':').pop());
 if (sameId.length === 1) return sameId[0];
 const sameKeyword = local.filter(entry => entry.keyword === keyword || entry.context === context);
 if (sameKeyword.length === 1) return sameKeyword[0];
 return {
  id:request.entityId || `desktop-target:${category}:${context}`, label:request.displayName || context || 'Target',
  keyword, context, category, parentNoun:request.parentNoun,
  group:kind === 'Equipment' ? 'worn' : kind === 'Inventory' ? 'inventory'
   : getInlineCategoryAxes(category).isCharacter ? 'npcs' : 'objects',
  scope:kind === 'Room' ? 'room' : 'self', hasDoor:request.hasDoor
 };
};
