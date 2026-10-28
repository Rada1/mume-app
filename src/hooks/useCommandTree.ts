/** @file useCommandTree.ts — Command-first navigation, available targets and delayed branch previews. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCommandTreeController } from './useCommandTreeController';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { getCommandMenuSectionKey, useCommandMenuSectionsStore } from '../stores/useCommandMenuSectionsStore';
import { useGearPanelData } from './useGearPanelData';
import { useCommandTreeCatalog } from './useCommandTreeCatalog';
import { useSettingsStore } from '../stores/useSettingsStore';
import { SELF_STATE_BUTTONS } from '../constants/buttons/state';
import { getSelectedStateCommand } from '../utils/playerStateOptions';
import { commandTreeMountSection } from '../utils/commandTreeGroups';
import { COMMAND_TREE_SHOP_BUTTONS, COMMAND_TREE_SHOP_LIST_BUTTON, isCommandTreeShopAction } from '../utils/commandTreeShop';
import { COMMAND_TREE_PRACTICE_BUTTON, isCommandTreePracticeAction } from '../utils/commandTreePractice';
import { COMMAND_TREE_MOVE_BUTTON, isCommandTreeMoveAction } from '../utils/commandTreeMovement';
import { isCommandTreeObservation } from '../utils/commandTreeObservation';
import { isCommandTreeAccess, isCommandTreeContainer } from '../utils/commandTreeAccess';
import { getCommandTreeBasePreview } from '../utils/commandTreePreview';
import { COMMAND_TREE_ABILITY_CLASS_ORDER } from '../utils/commandTreeSections';
import { uiPerformance } from '../utils/uiPerformance';
import type { CustomButton } from '../types';
import { useCommandTreeEligibility } from './useCommandTreeEligibility';
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
 const finishCatalog = uiPerformance.startWork('Tree catalog');
 const {variantsByAction, preparedCatalog} = useCommandTreeCatalog(controller, atShop);
 finishCatalog();
 const finishEligibility = uiPerformance.startWork('Tree eligibility');
 const {grouped, targetsFor, sectionFor} = useCommandTreeEligibility(controller, preparedCatalog, variantsByAction,
  atShop, panelData.status.skills === 'ready', isMobileReadabilityMode);
 const commandSections = useMemo(() => {
  if (group === null) return [];
  const buttons = grouped[group].buttons;
  const labels = group === 0
   ? ['Combat action', ...COMMAND_TREE_ABILITY_CLASS_ORDER].filter(label => buttons.some(button => sectionFor(button) === label))
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
 useEffect(() => { if (controller.shopOpenRequest && atShop) {useCommandPanelStore.getState().clearShopOpenRequest(); setGroup(3); setSection('Shop'); setCommand(COMMAND_TREE_SHOP_LIST_BUTTON); useCommandMenuSectionsStore.getState().expand(getCommandMenuSectionKey('Objects','Shop'));} }, [controller.shopOpenRequest, atShop]);
 useEffect(() => { if (controller.shop.browsing && atShop) {setGroup(3); setSection('Shop'); useCommandMenuSectionsStore.getState().expand(getCommandMenuSectionKey('Objects','Shop')); if (!isCommandTreeShopAction(command)) setCommand(COMMAND_TREE_SHOP_LIST_BUTTON);} }, [controller.shop.browsing, atShop]);
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

