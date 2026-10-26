/** @file commandTreeSections.ts — Shared command subcategories for command and target workspaces. */
import type { CustomButton } from '../types';
import { commandTreeGroup as classify, commandTreeAbilityClass, commandTreeMountSection, isCommandTreeObservationCommand } from './commandTreeGroups';
import { commandTreeSpellName } from './commandTreeIdentity';
import { getPracticeClassKey } from './practiceClassCatalog';
import { isCommandTreeCallAction, isCommandTreeAccess, isCommandTreeContainer } from './commandTreeAccess';
import { isCommandTreeObservation } from './commandTreeObservation';
import { isCommandTreeMoveAction } from './commandTreeMovement';
import { isCommandTreeShopAction } from './commandTreeShop';
import { isCommandTreePracticeAction } from './commandTreePractice';

// --- Shared Subcategory Assignment ---
export const COMMAND_TREE_ABILITY_CLASS_ORDER = ['Warrior', 'Thief', 'Mage', 'Cleric', 'Ranger'];
export const getCommandTreeSection = (button: CustomButton) => {
  const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
  const mountSection = commandTreeMountSection(button);
  if (mountSection) return mountSection;
  if (isCommandTreeObservationCommand(button)) return 'Observation';
  if (classify(button) === 2) return ['exits','map'].includes(verb) ? 'Navigation'
   : ['who','whois','where'].includes(verb) ? 'People' : verb === 'weather' ? 'Weather'
    : ['help','hint','hints','time'].includes(verb) ? 'Game' : 'Character';
  if (isCommandTreeCallAction(button)) return 'Doors';
  if (isCommandTreeAccess(button)) return isCommandTreeContainer(button) ? verb === 'empty' ? 'Move' : 'Modify' : 'Doors';
  if (['scout','watch'].includes(verb)) return 'Observation';
  if (isCommandTreeObservation(button)) return 'Observation';
  if (isCommandTreeMoveAction(button)) return 'Movement';
  if (isCommandTreeShopAction(button)) return 'Shop';
  if (isCommandTreePracticeAction(button)) return 'Training';
  if (classify(button) === 0) {
   const ability = commandTreeSpellName(button) || button.command.replace(/\s+%n.*$/, '').trim().toLowerCase();
   const abilityClass = commandTreeAbilityClass(button) || getPracticeClassKey(ability) || getPracticeClassKey(ability.split(/\s+/)[0]);
   return abilityClass ? abilityClass.charAt(0).toUpperCase() + abilityClass.slice(1) : 'Combat action';
  }
  if (classify(button) === 3) {
   if (/corpse/i.test(button.setId)) return 'Corpses';
   if (['buy','sell','value','mend','list'].includes(verb)) return 'Shop';
   if (['wear','wield','hold','remove','get','take','put','give','drop','pour','fill','empty'].includes(verb)) return 'Move';
   if (verb === 'camp' || ['light','snuff','cover','uncover'].includes(verb)) return 'Modify';
   return 'Use';
  }
  if (verb === 'cast') return 'Spells';
  if (['who','whois','where'].includes(verb)) return 'People';
  if (/communicat/.test(button.setId) || /^(say|tell|whisper|ask|reply|emote|narrate|yell|shout|sing|pray|chat|converse|__parley__)$/.test(verb)) return 'Messages';
  if (/social/.test(button.setId)) return 'Social actions';
  if (/^(buy|sell|value|mend|list)$/.test(verb)) return 'Shop';
  if (/group|follow/.test(button.command)) return 'Group';
  if (/practice|train/.test(button.command)) return 'Training';
  if (/^(info|stat|score)$/.test(verb)) return 'Character information';
  if (/door/.test(button.setId)) return 'Doors & Containers';
  if (/exit/.test(button.setId)) return 'Exits';
  if (/weather/.test(button.command)) return 'Weather';
  if (/object|inventory|equipment/.test(button.setId)) return 'Item actions';
  if (/heal|buff|support/.test(button.setId)) return 'Support';
  return ['Combat actions','Movement','Information','Item actions','People'][classify(button) ?? 3];
 };

// --- Shared Subcategory Order ---
export const getCommandTreeSectionLabels = (buttons: CustomButton[], group: number, sectionFor = getCommandTreeSection): string[] => {
 const labels = [...new Set(buttons.map(sectionFor))];
 const order = group === 0 ? ['Combat action', ...COMMAND_TREE_ABILITY_CLASS_ORDER]
  : group === 1 ? ['Movement','Doors','Mounts']
   : group === 2 ? ['Observation'] : group === 3 ? ['Move','Modify','Use'] : [];
 const priority = (label: string) => {const index=order.indexOf(label);return index<0?order.length:index;};
 return labels.sort((a,b)=>priority(a)-priority(b));
};
