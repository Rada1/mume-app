/** @file desktopTargetWorkspaceTargets.ts — Resolve log selections against the quick-menu target model. */
import type { PopoverState } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getInlineCategoryAxes, normalizeInlineCategoryId } from './inlineCategoryAxes';
import { getCorpseLogTarget } from '../objects/corpseLogTarget';
import { getCorpseCommandKeyword, getObjectTraits } from '../objects/objectTargetModel';

// --- Request Resolution ---
export const getDesktopWorkspaceKind = (request: PopoverState): 'Room'|'Inventory'|'Equipment' => {
 const location = getInlineCategoryAxes(request.category || request.setId || '').location;
 return location === 'worn' ? 'Equipment' : location === 'carried' ? 'Inventory' : 'Room';
};

export const getDesktopWorkspaceTarget = (request: PopoverState, entries: CommandActionTargetEntry[]): CommandActionTargetEntry => {
 const corpse = getCorpseLogTarget(request.displayName, request.context || request.keyword, request.category || request.setId);
 const isCorpseEntry = (entry: CommandActionTargetEntry) => getInlineCategoryAxes(entry.category).isObject &&
  (getObjectTraits(entry.gearRow?.line || entry.label).includes('trait-corpse') || /(?:^|-)corpse$/i.test(entry.context.replace(/^\d+\./, '')));
 const exact = entries.find(entry => entry.id === request.entityId && (!corpse || isCorpseEntry(entry)));
 if (exact) return exact;
 const category = corpse?.category || normalizeInlineCategoryId(request.category || request.setId || 'cat-room-object');
 const kind = getDesktopWorkspaceKind({...request, category});
 const context = corpse?.context || request.context || request.keyword || '';
 const keyword = corpse?.context || request.keyword || context;
 if (keyword.toLowerCase() === 'self') return {
  id:'command-panel-self', label:'Self', keyword:'self', context:'self', category:'cat-ally', group:'players', scope:'self'
 };
 const local = entries.filter(entry => (!corpse || isCorpseEntry(entry)) && (kind === 'Equipment' ? entry.group === 'worn'
  : kind === 'Inventory' ? entry.group === 'inventory' : entry.scope === 'room'));
 const sameId = local.filter(entry => entry.id.split(':').pop() === request.entityId?.split(':').pop());
 if (sameId.length === 1) return sameId[0];
 const sameKeyword = local.filter(entry => entry.keyword === keyword || entry.context === context);
 if (sameKeyword.length === 1) return sameKeyword[0];
 if (corpse && !/^\d+\./.test(context)) {
  const byName = local.filter(entry => getCorpseCommandKeyword(entry.label) === context);
  if (byName.length === 1) return byName[0];
 }
 return {
  id:request.entityId || `desktop-target:${category}:${context}`, label:request.displayName || context || 'Target',
  keyword, context, category, parentNoun:request.parentNoun,
  group:kind === 'Equipment' ? 'worn' : kind === 'Inventory' ? 'inventory'
   : getInlineCategoryAxes(category).isCharacter ? 'npcs' : 'objects',
  scope:kind === 'Room' ? 'room' : 'self', hasDoor:request.hasDoor
 };
};
