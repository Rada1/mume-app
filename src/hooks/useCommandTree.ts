/** @file useCommandTree.ts — Command-first navigation, available targets and delayed branch previews. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCommandTreeController } from './useCommandTreeController';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useGearPanelData } from './useGearPanelData';
import { getEligibleActionButtonIds, isButtonValidForEntity } from '../utils/actionUtils';
import { ITEM_BUTTONS } from '../constants/buttons/inline/items';
import { SOCIAL_BUTTONS } from '../constants/buttons/socials';
import { SELF_STATE_BUTTONS } from '../constants/buttons/state';
import { commandTreeGroup as classify, isCommandTreeSpell, commandTreeAbilityClass, commandTreeMountSection } from '../utils/commandTreeGroups';
import { commandTreeActionKey, commandTreeSpellName, deduplicateCommandTreeButtons, normalizeCommandTreeButton } from '../utils/commandTreeIdentity';
import { getPracticeClassKey } from '../utils/practiceClassCatalog';
import { COMMAND_TREE_SHOP_BUTTONS, isCommandTreeShopAction, isLegacyCommandTreeShopAction } from '../utils/commandTreeShop';
import { COMMAND_TREE_PRACTICE_BUTTON, isCommandTreePracticeAction } from '../utils/commandTreePractice';
import { COMMAND_TREE_MOVE_BUTTON, isCommandTreeMoveAction } from '../utils/commandTreeMovement';
import { COMMAND_TREE_OBSERVATION_BUTTONS, isCommandTreeObservation, isLegacyObservationCommand, getObservationTargets, getLookInTargets } from '../utils/commandTreeObservation';
import { COMMAND_TREE_ACCESS_BUTTONS, COMMAND_TREE_CALL_BUTTON, COMMAND_TREE_CONTAINER_BUTTONS, isCommandTreeAccess, isCommandTreeCallAction, isCommandTreeContainer, isLegacyAccessCommand, getAccessTargets } from '../utils/commandTreeAccess';
import { COMMAND_TREE_DRINK_BUTTON, isCommandTreeDrink, isLegacyDrinkCommand, getCommandTreeDrinkTargets } from '../utils/commandTreeDrink';
import { COMMAND_TREE_FOOD_BUTTONS, isCommandTreeForageAvailable } from '../utils/commandTreeFood';
import { getCommandTreeGetFromTargets, isCommandTreeGetAction } from '../utils/commandTreeGet';
import { useRoomDrinkWater } from './useRoomDrinkWater';
import { createButton } from '../utils/buttonFactory';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { CustomButton } from '../types';
// --- Logic Section ---
export const COMMAND_TREE_GROUPS = ['Abilities', 'Movement', 'Vision', 'Objects', 'Social', 'Character'];
const isLegacyCommandTreeGetAll = (button: CustomButton) => /^get\s+all(?:\s|$)/i.test(button.command.trim());
const isLegacyCommandTreeEatFood = (button: CustomButton) => /^eat\s+food$/i.test(button.command.trim());
const isDeferredCommandTreeCampRent = (button: CustomButton) => /^camp\s+rent(?:\s|$)/i.test(button.command.trim());
export const useCommandTree = (controller: ReturnType<typeof useCommandTreeController>) => {
 const atShop = controller.shop.atShop ?? controller.shop.available;
 const [group, setGroup] = useState<number | null>(null);
 const [command, setCommand] = useState<CustomButton | null>(null);
 const [section, setSection] = useState<string | null>(null);
 const [quick, setQuick] = useState<string | null>(null);
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
 useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
 const cancelPreview = () => { if (timer.current) clearTimeout(timer.current); };
 const defer = (action: () => void) => { cancelPreview(); timer.current = setTimeout(action, 180); };
 const chooseGroup = (index: number) => { cancelPreview(); if (group === index) { setGroup(null); setSection(null); setCommand(null); setQuick(null); controller.previewEntity(null); return; } setGroup(index); setSection(null); setCommand(null); setQuick(null); controller.previewEntity(null); };
 const chooseCommand = (button: CustomButton) => { cancelPreview(); if (command?.id === button.id && command.command === button.command) return; setCommand(button); if (group === 0 && !/^cast\b/.test(button.command)) setSection(null); setQuick(null); controller.previewEntity(null); controller.previewTargetContext(['info','stat','score'].includes(button.command) ? 'self' : 'room'); };
 const chooseSection = (value: string) => { cancelPreview(); if (section === value) return; setSection(value); setCommand(null); };
 const panelData = useGearPanelData(group === 1 || group === 2 || group === 3 || isCommandTreeObservation(command) || isCommandTreeAccess(command), group === 1 || group === 2 || group === 3 || isCommandTreeObservation(command) || isCommandTreeAccess(command));
 const roomWaterAvailable = useRoomDrinkWater();
 const {catalog, variantsByAction} = useMemo(() => {
 const catalog = [...controller.menuButtons, ...ITEM_BUTTONS].map(normalizeCommandTreeButton);
 const variantsByAction = new Map<string, CustomButton[]>();
 for (const variant of catalog) {
  const key = commandTreeActionKey(variant);
  const variants = variantsByAction.get(key) || [];
  variants.push(variant); variantsByAction.set(key, variants);
 }
 return {catalog, variantsByAction};
 }, [controller.menuButtons]);
 const {grouped, targetsFor, sectionFor} = useMemo(() => {
 const selfEntry: CommandActionTargetEntry = { id: 'command-panel-self', label: controller.game.characterName || 'You', keyword: 'self', context: 'self', category: 'cat-ally', group: 'players' as const, scope: 'self' as const };
 const roomEntry: CommandActionTargetEntry = { ...selfEntry, id: 'command-panel-room', label: 'Current room', keyword: '', context: '', category: 'cat-room', scope: 'room' as const };
 const candidates: CommandActionTargetEntry[] = [selfEntry, roomEntry, ...controller.entries];
 const deps = { buttons: controller.menuButtons, inlineCategories: controller.game.inlineCategories, roomNpcs: controller.game.roomNpcs, entities: controller.game.entities, characterInfo: controller.vitals.characterInfo, currentTerrain: controller.game.currentTerrain };
 const allowedButtons = new Map(candidates.map(entry => [entry.id, getEligibleActionButtonIds(
  entry.category, controller.game.entities[entry.id]?.name || entry.label, deps
 )]));
 const targetCache = new Map<string, CommandActionTargetEntry[]>();
 const targetsFor = (button: CustomButton) => {
  const key = isCommandTreeAccess(button) ? button.id : commandTreeActionKey(button);
  const cached = targetCache.get(key);
  if (cached) return cached;
  if (/^(?:tell|whois)\b/i.test(button.command.trim())) {
   targetCache.set(key, []); return [];
  }
  if (/social/i.test(button.setId)) {
   const matches = candidates.filter(entry => (entry.id === 'command-panel-self' || entry.scope === 'room')
    && ['players','npcs'].includes(entry.group) && !['cat-room','cat-exit'].includes(entry.category));
   targetCache.set(key, matches); return matches;
  }
  if (isCommandTreeCallAction(button)) {
   const matches = controller.entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor === true);
   targetCache.set(key, matches); return matches;
  }
  if (isCommandTreeDrink(button)) {
   const matches = getCommandTreeDrinkTargets(controller.ui.displayInventoryLines || [], controller.ui.displayEqLines || [], roomWaterAvailable);
   targetCache.set(key, matches); return matches;
  }
  if (/^eat\b/i.test(button.command.trim())) {
   const matches = candidates.filter(entry => (entry.group === 'objects' || entry.group === 'inventory')
    && allowedButtons.get(entry.id)?.has('btn-food-eat'));
   targetCache.set(key, matches); return matches;
  }
  if (/^scout\b/i.test(button.command.trim())) {
   const matches = controller.entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit');
   targetCache.set(key, matches); return matches;
  }
  if (isCommandTreeAccess(button)) {
   const matches = getAccessTargets(candidates, button, controller.game.entities, controller.game.inlineCategories || []);
   targetCache.set(key, matches); return matches;
  }
  if (isCommandTreeObservation(button)) {
   const matches = getObservationTargets(candidates, button).filter(entry => entry.id !== 'observation-look-in-trigger');
   const lookInTargets = /^look\b/i.test(button.command)
    ? getLookInTargets(candidates, controller.game.entities, controller.game.inlineCategories || []) : [];
   if (lookInTargets.length) matches.push(...getObservationTargets(candidates, button).filter(entry => entry.id === 'observation-look-in-trigger'));
   targetCache.set(key, matches); return matches;
  }
  const variants = [button, ...(variantsByAction.get(key) || [])];
  const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
  const isMessage = /^(say|tell|whisper|ask|reply|emote|narrate|yell|shout|sing|pray|chat)$/.test(verb) || /communicat/.test(button.setId);
  const isAssist = verb === 'assist' || verb === 'ass';
  const playerName = controller.game.characterName?.trim().toLowerCase() || '';
  const resolvedMatches = candidates.filter(entry => {
   if (isMessage && (entry.id === 'command-panel-self' || entry.keyword.toLowerCase() === 'self'
    || entry.context.toLowerCase() === 'self' || entry.label.toLowerCase() === controller.game.characterName?.toLowerCase())) return false;
   // Assist targets must be other group members; allies and the player are not valid choices.
   if (isAssist && (!entry.groupMember || entry.scope === 'self'
    || Boolean(playerName && [entry.label, entry.keyword, entry.context, entry.groupMember.name, entry.groupMember.label]
     .some(name => name?.trim().toLowerCase() === playerName)))) return false;
   const targetVerb = isCommandTreeSpell(button) ? 'cast' : verb;
   if (targetVerb === 'remove' && entry.group !== 'worn') return false;
   if (['wear','wield','hold','drop','give','put','sell','value','mend'].includes(targetVerb) && entry.group !== 'inventory') return false;
   if (targetVerb === 'get' && entry.group !== 'objects' && !entry.parentNoun) return false;
   if (entry.category === 'cat-exit' && entry.hasDoor === false && /door/.test(button.setId)) return false;
   if (entry.groupMember && /^(kill|hit|bash|kick|backstab)\b/.test(button.command)) return false;
   return variants.some(variant => allowedButtons.get(entry.id)?.has(variant.id)
    && isButtonValidForEntity(variant, entry.id, entry.category, deps, entry.category, entry.label, allowedButtons.get(entry.id)));
 });
  const matches = /^bash\s+%n(?:\||\s|$)/i.test(button.command.trim())
   ? resolvedMatches.filter(entry => entry.scope === 'room'
    && ((['players','npcs'].includes(entry.group) && entry.category !== 'cat-exit')
     || (entry.category === 'cat-exit' && entry.hasDoor === true)))
   : resolvedMatches;
  if (/^(?:drop|get|wear|remove)\s+%n(?:\|[^\s]+)?$/i.test(button.command.trim()) && matches.length) {
   const first = matches[0];
   matches.unshift({id: `command-tree-all:${key}`, label: 'All', keyword: 'all', context: 'all',
    category: first.category, group: first.group, scope: first.scope});
  }
  targetCache.set(key, matches);
  return matches;
 };
 const extra = ['info', 'stat', 'score', 'look', 'examine', 'exits', 'map', 'who', 'where'].map(verb => createButton({id: `v2-${verb}`, label: verb[0].toUpperCase()+verb.slice(1), command: verb, setId: ['info','stat','score'].includes(verb) ? 'trait-personal-information' : 'cat-room'}));
 const foodButtons = COMMAND_TREE_FOOD_BUTTONS.filter(button => button.id !== 'v2-forage'
  || isCommandTreeForageAvailable(controller.vitals.characterInfo?.race, controller.vitals.characterInfo?.subrace));
 const buttons = deduplicateCommandTreeButtons([...catalog, ...SOCIAL_BUTTONS, ...extra, ...foodButtons].filter(button=>!isLegacyDrinkCommand(button) && !isLegacyAccessCommand(button) && !isLegacyObservationCommand(button) && !isLegacyCommandTreeShopAction(button) && !isLegacyCommandTreeGetAll(button) && !isLegacyCommandTreeEatFood(button) && !isDeferredCommandTreeCampRent(button) && !/^call(?:\s|$)/i.test(button.command.trim()) && !/^practice(?:\s|$)/i.test(button.command) && !/^(?:move|north|south|east|west|up|down|n|s|e|w|u|d)$/i.test(button.command.trim())).concat(atShop ? COMMAND_TREE_SHOP_BUTTONS : [], [COMMAND_TREE_PRACTICE_BUTTON, COMMAND_TREE_MOVE_BUTTON, COMMAND_TREE_CALL_BUTTON, ...COMMAND_TREE_OBSERVATION_BUTTONS, ...COMMAND_TREE_ACCESS_BUTTONS, COMMAND_TREE_DRINK_BUTTON]).map(normalizeCommandTreeButton)).filter(button => {
  if (isCommandTreeCallAction(button) && !targetsFor(button).length) return false;
   if (/^(sell|value|mend|buy)\b/.test(button.command) && !atShop) return false;
   if (classify(button) === null) return false;
   if (!button.command || button.setId === 'trait-state') return false;
   if (button.requirement?.ability && panelData.status.skills !== 'ready') return false;
   if ((isCommandTreeSpell(button) || commandTreeAbilityClass(button)) && panelData.status.skills !== 'ready') return false;
   const hasGetSources = isCommandTreeGetAction(button) && getCommandTreeGetFromTargets(
    controller.game.roomItems || [], controller.ui.displayInventoryLines || [], controller.ui.displayEqLines || [], controller.game.roomNum
   ).length > 0;
   if (!isCommandTreeShopAction(button) && !isCommandTreePracticeAction(button) && /%n/.test(button.command) && !/^(?:tell|whois)\b/i.test(button.command) && !targetsFor(button).length && !hasGetSources) return false;
   return true;
 });
 const sectionFor = (button: CustomButton) => {
  const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
  const mountSection = commandTreeMountSection(button);
  if (mountSection) return mountSection;
  if (isCommandTreeCallAction(button)) return 'Doors';
  if (isCommandTreeAccess(button)) return isCommandTreeContainer(button) ? 'Containers' : 'Doors';
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
  if (classify(button) === 2) {
   if (verb === 'weather') return 'Weather';
   return ['exits','map'].includes(verb) ? 'Navigation' : 'Observation';
  }
  if (classify(button) === 3) {
   if (['buy','sell','value','mend','list'].includes(verb)) return 'Shop';
   if (['wear','wield','hold','remove'].includes(verb)) return 'Equipment';
   if (['get','take','put','give','drop'].includes(verb)) return 'Move items';
   if (['camp','camp rent'].includes(button.command.trim().toLowerCase()) || ['fill','light','snuff','cover','uncover'].includes(verb.toLowerCase())) return 'Light & Camp';
   if (['eat','drink','taste','sip','quaff','forage'].includes(verb.toLowerCase())) return 'Food & Drink';
   return 'Use items';
  }
  if (verb === 'cast') return 'Spells';
  if (['who','whois','where'].includes(verb)) return 'People';
  if (/communicat/.test(button.setId) || /^(say|tell|whisper|ask|reply|emote|narrate|yell|shout|sing|pray|chat)$/.test(verb)) return 'Messages';
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
  return ['Combat actions','Movement','Observation','Item actions','People','Information'][classify(button)];
 };
 const mountCommandOrder: Record<string, number> = { ride: 0, lead: 1, dismount: 2, abandon: 3 };
 const grouped = COMMAND_TREE_GROUPS.map((label, index) => ({label, buttons: [...buttons.filter(button => classify(button) === index), ...(index === 3 ? COMMAND_TREE_CONTAINER_BUTTONS.filter(button => targetsFor(button).length > 0) : [])].sort((a,b) => {
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
 return {grouped, targetsFor, sectionFor};
 }, [catalog, variantsByAction, controller.entries, controller.menuButtons, controller.game.characterName, controller.game.inlineCategories,
     controller.game.roomNpcs, controller.game.entities, controller.vitals.characterInfo,
     controller.game.currentTerrain, controller.game.roomItems, controller.game.roomNum, atShop, panelData.status.skills, roomWaterAvailable, controller.ui.displayInventoryLines, controller.ui.displayEqLines]);
 const commandSections = useMemo(() => group === null ? [] : (group === 0 ? ['Combat action','Mage','Warrior','Cleric','Thief','Ranger','Training'] : [...new Set(grouped[group].buttons.map(sectionFor))].sort((a,b) => {
   if (group !== 1) return 0;
   const priority = (label: string) => label === 'Movement' ? 0 : label === 'Mounts' ? 1 : 2;
   return priority(a) - priority(b);
  }))
  .map(label => ({label, buttons: label === 'Shop' ? COMMAND_TREE_SHOP_BUTTONS : grouped[group].buttons.filter(button => sectionFor(button) === label)})), [group, grouped, sectionFor]);
 useEffect(() => { if (controller.shopOpenRequest && atShop) {useCommandPanelStore.getState().clearShopOpenRequest(); setGroup(3); setSection('Shop'); setCommand(COMMAND_TREE_SHOP_BUTTONS[0]);} }, [controller.shopOpenRequest, atShop]);
 useEffect(() => { if (controller.shop.browsing && atShop) {setGroup(3); setSection('Shop'); if (!isCommandTreeShopAction(command)) setCommand(COMMAND_TREE_SHOP_BUTTONS[0]);} }, [controller.shop.browsing, atShop]);
 useEffect(() => { if (controller.practiceOpenRequest) {useCommandPanelStore.getState().clearPracticeOpenRequest(); setGroup(0); setSection('Training'); setCommand(COMMAND_TREE_PRACTICE_BUTTON);} }, [controller.practiceOpenRequest]);
 useEffect(() => { controller.practice.setOpen(group === 0 && isCommandTreePracticeAction(command)); }, [group, command, controller.practice.setOpen]);
 useEffect(() => {
  if (group !== null && isCommandTreeAccess(command) && !grouped[group].buttons.some(button => button.id === command?.id)) setCommand(null);
 }, [group, command, grouped]);
 const targets = command ? targetsFor(command) : [];
 const quickButtons = SELF_STATE_BUTTONS.filter(button => button.inlineSubgroup === quick);
 return {commandSections, section, chooseSection, group, command, quick, setQuick, grouped, targets, targetsFor, quickButtons, chooseGroup, chooseCommand, defer, cancelPreview};
};

