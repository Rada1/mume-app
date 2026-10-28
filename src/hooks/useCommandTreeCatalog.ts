/** @file useCommandTreeCatalog.ts — Memoized command normalization, root grouping and section metadata. */
import { useMemo } from 'react';
import type { useCommandTreeController } from './useCommandTreeController';
import type { CustomButton } from '../types';
import { ITEM_BUTTONS } from '../constants/buttons/inline/items';
import { SOCIAL_BUTTONS } from '../constants/buttons/socials';
import { commandTreeGroup as classify } from '../utils/commandTreeGroups';
import { getCommandTreeSection } from '../utils/commandTreeSections';
import { commandTreeActionKey, deduplicateCommandTreeButtons, normalizeCommandTreeButton } from '../utils/commandTreeIdentity';
import { COMMAND_TREE_SHOP_BUTTONS, isLegacyCommandTreeShopAction } from '../utils/commandTreeShop';
import { COMMAND_TREE_PRACTICE_BUTTON } from '../utils/commandTreePractice';
import { COMMAND_TREE_MOVE_BUTTON } from '../utils/commandTreeMovement';
import { COMMAND_TREE_OBSERVATION_BUTTONS, isLegacyObservationCommand } from '../utils/commandTreeObservation';
import { COMMAND_TREE_ACCESS_BUTTONS, COMMAND_TREE_CALL_BUTTON, COMMAND_TREE_CONTAINER_BUTTONS, isLegacyAccessCommand } from '../utils/commandTreeAccess';
import { COMMAND_TREE_DRINK_BUTTON, isLegacyDrinkCommand } from '../utils/commandTreeDrink';
import { COMMAND_TREE_FOOD_BUTTONS, isCommandTreeForageAvailable } from '../utils/commandTreeFood';
import { COMMAND_TREE_LIGHT_CAMP_BUTTONS } from '../utils/commandTreeLightCamp';
import { createButton } from '../utils/buttonFactory';
import { COMMAND_TREE_SEARCH_BUTTONS } from '../utils/commandTreeSearch';
import { COMMAND_TREE_SOCIAL_BUTTON, isLegacyCommandTreeSocialEmote } from '../utils/commandTreeSocial';
// --- Catalog Metadata Section ---
export const COMMAND_TREE_GROUPS = ['Abilities', 'Movement', 'Info', 'Objects', 'Social'];
const isLegacyCommandTreeGetAll = (button: CustomButton) => /^get\s+all(?:\s|$)/i.test(button.command.trim());
const isLegacyCommandTreeEatFood = (button: CustomButton) => /^eat\s+food$/i.test(button.command.trim());
const isDeferredCommandTreeCampRent = (button: CustomButton) => /^camp\s+rent(?:\s|$)/i.test(button.command.trim());
const isDuplicateKillAction = (button: CustomButton) => /^kill(?:\s|$)/i.test(button.command.trim());
const isCommandTreeConverseButton = (button: CustomButton) => button.id === 'btn-converse'
 || /^(?:__parley__|converse)$/i.test(button.command.trim());
export const useCommandTreeCatalog = (controller: ReturnType<typeof useCommandTreeController>, atShop: boolean) => {
 const {catalog, variantsByAction} = useMemo(() => {
 const catalog = [...controller.menuButtons, ...ITEM_BUTTONS, ...COMMAND_TREE_LIGHT_CAMP_BUTTONS].map(normalizeCommandTreeButton);
 const variantsByAction = new Map<string, CustomButton[]>();
 for (const variant of catalog) {
  const key = commandTreeActionKey(variant);
  const variants = variantsByAction.get(key) || [];
  variants.push(variant); variantsByAction.set(key, variants);
 }
 return {catalog, variantsByAction};
 }, [controller.menuButtons]);
 const commandCatalog = useMemo(() => {
  const extra = ['info', 'stat', 'score', 'history', 'quests', 'achievements', 'inventory', 'equipment', 'hints', 'help', 'time', 'look', 'examine', 'exits', 'map', 'who', 'where'].map(verb => createButton({id: `v2-${verb}`, label: verb[0].toUpperCase()+verb.slice(1), command: verb, setId: ['info','stat','score','history','quests','achievements','inventory','equipment'].includes(verb) ? 'trait-personal-information' : 'cat-room'}));
  const foodButtons = COMMAND_TREE_FOOD_BUTTONS.filter(button => button.id !== 'v2-forage'
   || isCommandTreeForageAvailable(controller.vitals.characterInfo?.race, controller.vitals.characterInfo?.subrace));
  return deduplicateCommandTreeButtons([...catalog, ...SOCIAL_BUTTONS, ...extra, ...foodButtons].filter(button=>!isLegacyDrinkCommand(button) && !isLegacyAccessCommand(button) && !isLegacyObservationCommand(button) && !isLegacyCommandTreeShopAction(button) && !isLegacyCommandTreeGetAll(button) && !isLegacyCommandTreeEatFood(button) && !isDeferredCommandTreeCampRent(button) && !isDuplicateKillAction(button) && !isCommandTreeConverseButton(button) && !isLegacyCommandTreeSocialEmote(button) && !/^call(?:\s|$)/i.test(button.command.trim()) && !/^practice(?:\s|$)/i.test(button.command) && !/^(?:move|north|south|east|west|up|down|n|s|e|w|u|d)$/i.test(button.command.trim())).concat(atShop ? COMMAND_TREE_SHOP_BUTTONS : [], [COMMAND_TREE_PRACTICE_BUTTON, COMMAND_TREE_MOVE_BUTTON, COMMAND_TREE_CALL_BUTTON, COMMAND_TREE_SOCIAL_BUTTON, ...COMMAND_TREE_OBSERVATION_BUTTONS, ...COMMAND_TREE_SEARCH_BUTTONS, ...COMMAND_TREE_ACCESS_BUTTONS, COMMAND_TREE_DRINK_BUTTON]).map(normalizeCommandTreeButton));
 }, [catalog, atShop, controller.vitals.characterInfo?.race, controller.vitals.characterInfo?.subrace]);
 const preparedCatalog = useMemo(() => {
 const sectionCache = new Map<CustomButton, string>();
 const sectionFor = (button: CustomButton) => {
  const cached = sectionCache.get(button);
  if (cached !== undefined) return cached;
  const section = getCommandTreeSection(button);
  sectionCache.set(button, section);
  return section;
 };
 const groupCache = new Map<CustomButton, number | null>();
 const groupFor = (button: CustomButton) => {
  if (!groupCache.has(button)) groupCache.set(button, classify(button));
  return groupCache.get(button);
 };
 const mountCommandOrder: Record<string, number> = { ride: 0, lead: 1, dismount: 2, abandon: 3 };
 const grouped = COMMAND_TREE_GROUPS.map((label, index) => ({label, buttons: [...commandCatalog.filter(button => groupFor(button) === index && !/^follow\b/i.test(button.command.trim())), ...(index === 3 ? COMMAND_TREE_CONTAINER_BUTTONS : [])].sort((a,b) => {
  const aSection = sectionFor(a);
  const bSection = sectionFor(b);
  if (aSection !== bSection) return aSection.localeCompare(bSection);
  if (aSection === 'Mounts') {
   const aVerb = a.command.trim().toLowerCase().split(/\s+/)[0];
   const bVerb = b.command.trim().toLowerCase().split(/\s+/)[0];
   return (mountCommandOrder[aVerb] ?? Number.MAX_SAFE_INTEGER) - (mountCommandOrder[bVerb] ?? Number.MAX_SAFE_INTEGER);
  }
  return a.label.localeCompare(b.label);
 })}));
 return {groups: grouped, sectionFor};
 }, [commandCatalog]);
 return {variantsByAction, preparedCatalog};
};
