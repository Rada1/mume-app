/** @file useCommandTree.ts — Command-first navigation, available targets and delayed branch previews. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCommandTreeController } from './useCommandTreeController';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { getCommandMenuSectionKey, useCommandMenuSectionsStore } from '../stores/useCommandMenuSectionsStore';
import { useGearPanelData } from './useGearPanelData';
import { useCommandTreeCatalog } from './useCommandTreeCatalog';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getEligibleActionButtonIds, isButtonValidForEntity } from '../utils/actionUtils';
import { SELF_STATE_BUTTONS } from '../constants/buttons/state';
import { getSelectedStateCommand } from '../utils/playerStateOptions';
import { commandTreeGroup as classify, isCommandTreeSpell, commandTreeAbilityClass, commandTreeMountSection } from '../utils/commandTreeGroups';
import { commandTreeActionKey } from '../utils/commandTreeIdentity';
import { COMMAND_TREE_SHOP_BUTTONS, isCommandTreeShopAction } from '../utils/commandTreeShop';
import { COMMAND_TREE_PRACTICE_BUTTON, isCommandTreePracticeAction } from '../utils/commandTreePractice';
import { COMMAND_TREE_MOVE_BUTTON, isCommandTreeMoveAction } from '../utils/commandTreeMovement';
import { isCommandTreeObservation, getObservationTargets, getLookInTargets } from '../utils/commandTreeObservation';
import { COMMAND_TREE_EMPTY_BUTTON, isCommandTreeAccess, isCommandTreeCallAction, isCommandTreeContainer, getAccessTargets } from '../utils/commandTreeAccess';
import { isCommandTreeDrink, getCommandTreeDrinkTargets } from '../utils/commandTreeDrink';
import { hasWornLantern } from '../utils/commandTreeLightCamp';
import { getCommandTreeGetFromTargets, isCommandTreeGetAction } from '../utils/commandTreeGet';
import { useRoomDrinkWater } from './useRoomDrinkWater';
import { normalizeInlineCategoryId } from '../utils/inlineCategoryAxes';
import { getCommandTreeBasePreview } from '../utils/commandTreePreview';
import { getCommandTreeCurrentTarget, isCommandTreeOffensiveTargetAction } from '../utils/commandTreeCurrentTarget';
import { getGearObjectCandidates, getRoomObjectCandidates, hasObjectTrait } from '../objects/objectTargetModel';
import { uiPerformance } from '../utils/uiPerformance';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { CustomButton } from '../types';
// --- Logic Section ---
export { COMMAND_TREE_GROUPS } from './useCommandTreeCatalog';
export const useCommandTree = (controller: ReturnType<typeof useCommandTreeController>) => {
 const atShop = controller.shop.atShop ?? controller.shop.available;
 const isReadabilityMode = useSettingsStore(state => state.isReadabilityMode);
 const isMobileReadabilityMode = controller.game.viewport?.isMobile === true && isReadabilityMode;
 const [group, setGroup] = useState<number | null>(() => isMobileReadabilityMode ? 0 : null);
 const previousMobileReadabilityMode = useRef(isMobileReadabilityMode);
 const [command, setCommand] = useState<CustomButton | null>(null);
 const [section, setSection] = useState<string | null>(null);
 const [abilityClass, setAbilityClass] = useState('Mage');
 const [categorySections, setCategorySections] = useState<Record<number, string>>({2: 'Observation', 3: 'Move', 4: 'Messages'});
 const categorySection = group === null ? undefined : categorySections[group];
 const [quick, setQuick] = useState<string | null>(null);
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
 useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
 useEffect(() => {
  if (isMobileReadabilityMode && !previousMobileReadabilityMode.current) {
   setGroup(0);
   setSection(null);
   setCommand(null);
   setQuick(null);
   controller.previewEntity(null);
  }
  previousMobileReadabilityMode.current = isMobileReadabilityMode;
 }, [isMobileReadabilityMode, controller.previewEntity]);
 const cancelPreview = () => { if (timer.current) clearTimeout(timer.current); };
 const defer = (action: () => void) => { cancelPreview(); timer.current = setTimeout(action, 180); };
 const chooseCommand = (button: CustomButton) => { cancelPreview(); if (command?.id === button.id && command.command === button.command) return; setCommand(button); if (group === 0 && !/^cast\b/.test(button.command)) setSection(null); setQuick(null); controller.previewEntity(null); controller.previewTargetContext(['info','stat','score','inventory','equipment'].includes(button.command) ? 'self' : 'room'); };
 const chooseGroup = (index: number) => {
  cancelPreview();
  if (group === index) {
   if (isMobileReadabilityMode && index === 1) { chooseCommand(COMMAND_TREE_MOVE_BUTTON); return; }
   setGroup(null); setSection(null); setCommand(null); setQuick(null); controller.previewEntity(null); return;
  }
  setGroup(index); setSection(null); setQuick(null); controller.previewEntity(null);
  if (isMobileReadabilityMode && index === 1) chooseCommand(COMMAND_TREE_MOVE_BUTTON);
  else setCommand(null);
 };
 const chooseSection = (value: string) => { cancelPreview(); if (section === value) return; setSection(value); setCommand(null); };
 const clearCommand = useCallback(() => {
  setCommand(null); controller.game.setCommandPreview?.(null); controller.previewEntity(null);
 }, [controller.game.setCommandPreview, controller.previewEntity]);
 const chooseAbilityClass = (value: string) => { cancelPreview(); if (abilityClass === value) return; setAbilityClass(value); setCommand(null); setQuick(null); controller.previewEntity(null); };
 const chooseCategorySection = (value: string) => { cancelPreview(); if (group === null || categorySection === value) return; setCategorySections(previous => ({...previous, [group]: value})); setCommand(null); setQuick(null); controller.previewEntity(null); };
 useEffect(() => {
  if (group === null || !command) return;
  controller.game.setCommandPreview?.(getCommandTreeBasePreview(command.command));
  return () => controller.game.setCommandPreview?.(null);
 }, [group, command?.id, command?.command, controller.game.setCommandPreview]);
 const needsGearTargets = group === 1 || group === 2 || group === 3
  || isCommandTreeObservation(command) || Boolean(command && isCommandTreeContainer(command));
 const panelData = useGearPanelData(needsGearTargets, needsGearTargets);
 const roomWaterAvailable = useRoomDrinkWater();
 const finishCatalog = uiPerformance.startWork('Tree catalog');
 const {variantsByAction, preparedCatalog} = useCommandTreeCatalog(controller, atShop);
 finishCatalog();
 const finishEligibility = uiPerformance.startWork('Tree eligibility');
 const {grouped, targetsFor, sectionFor} = useMemo(() => {
 const selfEntry: CommandActionTargetEntry = { id: 'command-panel-self', label: controller.game.characterName || 'You', keyword: 'self', context: 'self', category: 'cat-ally', group: 'players' as const, scope: 'self' as const };
 const roomEntry: CommandActionTargetEntry = { ...selfEntry, id: 'command-panel-room', label: 'Current room', keyword: '', context: '', category: 'cat-room', scope: 'room' as const };
 const candidates: CommandActionTargetEntry[] = [selfEntry, roomEntry, ...controller.entries];
 const hasRoomMount = controller.entries.some(entry => entry.scope === 'room' && normalizeInlineCategoryId(entry.category) === 'cat-mount');
 let localContainerAvailable: boolean | undefined;
 const hasLocalContainer = () => localContainerAvailable ??= getAccessTargets(candidates, COMMAND_TREE_EMPTY_BUTTON, controller.game.entities, controller.game.inlineCategories || []).length > 0;
 const deps = { buttons: controller.menuButtons, inlineCategories: controller.game.inlineCategories, roomNpcs: controller.game.roomNpcs, entities: controller.game.entities, characterInfo: controller.vitals.characterInfo, currentTerrain: controller.game.currentTerrain };
 const allowedButtons = new Map<string, ReadonlySet<string>>();
 const allowedFor = (entry: CommandActionTargetEntry) => {
  let allowed = allowedButtons.get(entry.id);
  if (!allowed) {
   allowed = getEligibleActionButtonIds(entry.category, controller.game.entities[entry.id]?.name || entry.label, deps);
   allowedButtons.set(entry.id, allowed);
  }
  return allowed;
 };
  const roomWaterTargets = () => {
   const supportsDrink = (entry: CommandActionTargetEntry) => {
    const actionIds = allowedFor(entry);
    const objectName = `${entry.label} ${entry.keyword} ${entry.context}`;
    return actionIds.has('btn-water-drink') || actionIds.has('btn-fluid-drink')
     || hasObjectTrait(objectName, 'trait-water') || hasObjectTrait(objectName, 'trait-fluid-container');
   };
   const targets = controller.entries.filter(entry => entry.scope === 'room' && entry.group === 'objects' && supportsDrink(entry));
   const targetIds = new Set(targets.map(entry => entry.id));
   const targetKeywords = new Set(targets.map(entry => entry.keyword.trim().toLowerCase()));
   const roomWaterObjects = getRoomObjectCandidates(controller.game.roomItems || [])
    .filter(candidate => (hasObjectTrait(candidate.source, 'trait-water') || hasObjectTrait(candidate.source, 'trait-fluid-container'))
     && !targetIds.has(candidate.id) && !targetKeywords.has(candidate.selector.trim().toLowerCase()))
    .map(candidate => ({
     id: candidate.id, label: candidate.label, keyword: candidate.selector, context: candidate.selector,
     category: 'cat-room-object', group: 'objects' as const, scope: 'room' as const
    }));
   const resolvedTargets = [...targets, ...roomWaterObjects];
   if (resolvedTargets.length || !roomWaterAvailable) return resolvedTargets;
   return [{
    id: 'command-room-water', label: 'Water in this room', keyword: 'water', context: 'water',
    category: 'cat-room', group: 'objects' as const, scope: 'room' as const
   }];
  };
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
   const matches = getCommandTreeDrinkTargets(controller.ui.displayInventoryLines || [], controller.ui.displayEqLines || [], roomWaterAvailable, roomWaterTargets());
   targetCache.set(key, matches); return matches;
  }
  if (/^(?:light|snuff)\s+%n$/i.test(button.command.trim())) {
   const variants = [button, ...(variantsByAction.get(key) || [])];
   const matches = controller.entries.filter(entry => entry.group === 'worn'
    && /\blantern\b/i.test(`${entry.label} ${entry.keyword} ${entry.context}`)
    && variants.some(variant => allowedFor(entry).has(variant.id)
     && isButtonValidForEntity(variant, entry.id, entry.category, deps, entry.category, entry.label, allowedFor(entry))));
   targetCache.set(key, matches); return matches;
  }
  if (/^eat\b/i.test(button.command.trim())) {
   const matches = candidates.filter(entry => (entry.group === 'objects' || entry.group === 'inventory')
    && allowedFor(entry).has('btn-food-eat'));
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
  const currentTarget = variants.some(isCommandTreeOffensiveTargetAction)
   ? getCommandTreeCurrentTarget(candidates, controller.vitals.target)
   : null;
  const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
  const roomWaterMatches = ['sip','quaff'].includes(verb) ? roomWaterTargets() : [];
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
   return variants.some(variant => allowedFor(entry).has(variant.id)
    && isButtonValidForEntity(variant, entry.id, entry.category, deps, entry.category, entry.label, allowedFor(entry)));
 });
  const roomMatches = /^bash\s+%n(?:\||\s|$)/i.test(button.command.trim())
   ? resolvedMatches.filter(entry => entry.scope === 'room'
    && ((['players','npcs'].includes(entry.group) && entry.category !== 'cat-exit')
     || (entry.category === 'cat-exit' && entry.hasDoor === true)))
   : resolvedMatches;
  const matches = currentTarget
   ? [currentTarget, ...roomMatches.filter(entry => entry.id !== currentTarget.id)]
   : [...roomWaterMatches, ...roomMatches.filter(entry => !roomWaterMatches.some(water => water.id === entry.id))];
  if (/^(?:drop|get|wear|remove)\s+%n(?:\|[^\s]+)?$/i.test(button.command.trim()) && matches.length) {
   const first = matches[0];
   matches.unshift({id: `command-tree-all:${key}`, label: 'All', keyword: 'all', context: 'all',
    category: first.category, group: first.group, scope: first.scope});
  }
  targetCache.set(key, matches);
  return matches;
 };
 const isAvailable = (button: CustomButton) => {
  if (/^(?:light|snuff)\s+%n$/i.test(button.command.trim()) && !hasWornLantern(controller.ui.displayEqLines || [])) return false;
  const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
  if (['wear', 'put', 'give', 'drop'].includes(verb)
   && !getGearObjectCandidates(controller.ui.displayInventoryLines || [], 'inventory').some(item => item.keyword.toLowerCase() !== 'all')) return false;
  if (verb === 'remove'
   && !getGearObjectCandidates(controller.ui.displayEqLines || [], 'worn').some(item => item.keyword.toLowerCase() !== 'all')) return false;
  if (commandTreeMountSection(button) && !hasRoomMount) return false;
  if (isCommandTreeContainer(button) && !hasLocalContainer()) return false;
  if (isCommandTreeCallAction(button) && !targetsFor(button).length) return false;
   if (/^(sell|value|mend|buy)\b/.test(button.command) && !atShop) return false;
   if (classify(button) === null) return false;
   if (!button.command || button.setId === 'trait-state') return false;
   if (button.requirement?.ability && panelData.status.skills !== 'ready') return false;
   if ((isCommandTreeSpell(button) || commandTreeAbilityClass(button)) && panelData.status.skills !== 'ready') return false;
   const hasGetSources = isCommandTreeGetAction(button) && getCommandTreeGetFromTargets(
    controller.game.roomItems || [], controller.ui.displayInventoryLines || [], controller.ui.displayEqLines || [], controller.game.roomNum
   ).length > 0;
   const allowUntargetedAbility = isMobileReadabilityMode && classify(button) === 0;
   if (!isCommandTreeShopAction(button) && !isCommandTreePracticeAction(button) && /%n/.test(button.command) && !/^(?:tell|whois)\b/i.test(button.command) && !targetsFor(button).length && !hasGetSources && !allowUntargetedAbility) return false;
   return true;
 };
 // Navigation reads labels only; resolve a group's eligibility on first use.
 const grouped = preparedCatalog.groups.map(entry => {
  let buttons: CustomButton[] | undefined;
  return {label: entry.label, get buttons() { return buttons ??= entry.buttons.filter(isAvailable); }};
 });
 return {grouped, targetsFor, sectionFor: preparedCatalog.sectionFor};
 }, [preparedCatalog, variantsByAction, controller.entries, controller.menuButtons, controller.game.characterName, controller.game.inlineCategories,
     controller.game.roomNpcs, controller.game.entities, controller.vitals.characterInfo, controller.vitals.target,
     controller.game.currentTerrain, controller.game.roomItems, controller.game.roomNum, atShop, panelData.status.skills, roomWaterAvailable, controller.ui.displayInventoryLines, controller.ui.displayEqLines,
     isMobileReadabilityMode]);
 const commandSections = useMemo(() => {
  if (group === null) return [];
  const buttons = grouped[group].buttons;
  const labels = group === 0
   ? ['Combat action','Mage','Warrior','Cleric','Thief','Ranger'].filter(label => buttons.some(button => sectionFor(button) === label))
   : [...new Set(buttons.map(sectionFor))].sort((a,b) => {
    if (group === 2) return Number(b === 'Observation') - Number(a === 'Observation');
    if (group === 3) {
     const priority = (label: string) => { const index = ['Move', 'Modify', 'Use'].indexOf(label); return index < 0 ? 3 : index; };
     return priority(a) - priority(b);
    }
    if (group !== 1) return 0;
    const priority = (label: string) => label === 'Movement' ? 0 : label === 'Doors' ? 1 : label === 'Mounts' ? 2 : 3;
    return priority(a) - priority(b);
   });
  return labels.map(label => ({label, buttons: label === 'Shop' ? COMMAND_TREE_SHOP_BUTTONS : buttons.filter(button => sectionFor(button) === label)}));
 }, [group, grouped, sectionFor]);
 useEffect(() => { if (controller.shopOpenRequest && atShop) {useCommandPanelStore.getState().clearShopOpenRequest(); setGroup(3); setSection('Shop'); setCommand(COMMAND_TREE_SHOP_BUTTONS[0]); useCommandMenuSectionsStore.getState().expand(getCommandMenuSectionKey('Objects','Shop'));} }, [controller.shopOpenRequest, atShop]);
 useEffect(() => { if (controller.shop.browsing && atShop) {setGroup(3); setSection('Shop'); useCommandMenuSectionsStore.getState().expand(getCommandMenuSectionKey('Objects','Shop')); if (!isCommandTreeShopAction(command)) setCommand(COMMAND_TREE_SHOP_BUTTONS[0]);} }, [controller.shop.browsing, atShop]);
 useEffect(() => { if (controller.practiceOpenRequest) {useCommandPanelStore.getState().clearPracticeOpenRequest(); setGroup(2); setSection('Character'); setCommand(COMMAND_TREE_PRACTICE_BUTTON);} }, [controller.practiceOpenRequest]);
 useEffect(() => { controller.practice.setOpen(group === 2 && isCommandTreePracticeAction(command)); }, [group, command, controller.practice.setOpen]);
 useEffect(() => {
  const isAbilityMovementMode = group === 0 && isMobileReadabilityMode && command
   && (isCommandTreeMoveAction(command) || isCommandTreeAccess(command) && !isCommandTreeContainer(command));
  if (group !== null && command && !isAbilityMovementMode && (isCommandTreeAccess(command) || commandTreeMountSection(command))
   && !grouped[group].buttons.some(button => button.id === command.id)) setCommand(null);
 }, [group, command, grouped, isMobileReadabilityMode]);
 const targets = command ? targetsFor(command) : [];
 const quickButtons = SELF_STATE_BUTTONS.filter(button => button.inlineSubgroup === quick);
 const quickValues: Record<string, string | undefined> = {Position: controller.game.playerPosition, Mood: controller.game.mood, 'Cast Speed': controller.game.spellSpeed, Alertness: controller.game.alertness};
 const selectedQuickButtonId = quickButtons.find(button => button.command === getSelectedStateCommand(quick, quickValues[quick || '']))?.id;
 finishEligibility();
 return {commandSections, section, abilityClass, categorySection, sectionFor: preparedCatalog.sectionFor, chooseSection, clearCommand, chooseAbilityClass, chooseCategorySection, group, command, quick, setQuick, grouped, targets, targetsFor, quickButtons, selectedQuickButtonId, chooseGroup, chooseCommand, defer, cancelPreview};
};

