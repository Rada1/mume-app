/** @file mobileQuickTargetActions.ts — Small, contextual actions for a tapped log target. */
import type { CharacterInfo, InlineCategoryConfig } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getCorpseCommandKeyword, getObjectTraits } from '../objects/objectTargetModel';
import { getInlineCategoryAxes } from './inlineCategoryAxes';
import { getResolvedTraitSections } from './inlineActionModel';
import { formatMumeTarget } from './keywordUtils';
import { isMountEligibleForCharacter } from './mountEligibility';
import { isButtonEligibleForCharacter } from './characterEligibility';

export type MobileQuickAction = { label: string; command: string };
export type MobileQuickTarget = { kind: 'corpse' | 'character' | 'mount' | 'object' | 'other'; target: string; actions: MobileQuickAction[] };

// --- Contextual action selection ---
export const getMobileQuickTarget = (entry: CommandActionTargetEntry, configs: InlineCategoryConfig[], character?: CharacterInfo): MobileQuickTarget => {
 const target = formatMumeTarget(entry.context || entry.keyword) || '';
 const actions: MobileQuickAction[] = [];
 const add = (label: string, command: string) => actions.push({ label, command });
 const axes = getInlineCategoryAxes(entry.category);
 const traits = new Set([...getObjectTraits(entry.gearRow?.line || entry.label),
  ...getResolvedTraitSections(entry.category, entry.label, configs).map(section => section.trait.id)]);
 if (!target || entry.scope === 'remote' || entry.id === 'command-panel-self') return { kind:'other', target, actions };
 if (axes.isCharacter) {
  if (entry.category === 'cat-mount' || traits.has('trait-mount')) {
   if (isMountEligibleForCharacter(entry.label, character)) { add('Ride', `ride ${target}`); add('Lead', `lead ${target}`); }
   add('Unsaddle all', `unsaddle ${target} all`);
   return {kind:'mount', target, actions};
  }
  if (entry.category === 'cat-ally' || entry.category === 'cat-ally-remote' || entry.groupMember) {
   add('Follow', `follow ${target}`); add('Group', `group ${target}`);
  } else add('Hit', `hit ${target}`);
  return {kind:'character', target, actions};
 }
 if (!axes.isObject) return {kind:'other', target, actions};
 if (traits.has('trait-corpse') && entry.group === 'objects') {
  const ordinal = target.match(/^(\d+\.)/)?.[1] || '';
  const corpseTarget = /^(?:\d+\.)?[\w'-]+-corpse$/i.test(target)
   ? target : `${ordinal}${getCorpseCommandKeyword(entry.label).replace(/^\d+\./, '')}`;
  add('Loot', `get all ${corpseTarget}`); add('Butcher', `butcher ${corpseTarget}`);
  if (isButtonEligibleForCharacter({race:['Orc']}, character)) add('Drain', `drain ${corpseTarget}`);
  return {kind:'corpse', target:corpseTarget, actions};
 }
 if (entry.group === 'worn' || axes.location === 'worn') add('Remove', `remove ${target}`);
 else if (entry.group === 'inventory' || axes.location === 'carried') {
  if (traits.has('trait-food')) add('Eat', `eat ${target}`);
  else if (traits.has('trait-water') || traits.has('trait-fluid-container')) add('Drink', `drink ${target}`);
  else {
   add('Drop', `drop ${target}`);
   if (['trait-armour','trait-jewelry','trait-shield','trait-container'].some(id => traits.has(id))) add('Wear', `wear ${target}`);
   if (traits.has('trait-weapon')) add('Wield', `wield ${target}`);
  }
 } else {
  add('Get', `get ${target}`);
  if (traits.has('trait-food')) add('Eat', `eat ${target}`);
  else if (traits.has('trait-water') || traits.has('trait-fluid-container')) add('Drink', `drink ${target}`);
 }
 return {kind:'object', target, actions};
};
