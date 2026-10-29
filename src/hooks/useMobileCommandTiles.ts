/** @file useMobileCommandTiles.ts — Shared catalog families and persistent mobile gesture assignments. */
import { useEffect, useMemo, useRef } from 'react';
import type { useCommandTree } from './useCommandTree';
import type { useCommandTreeController } from './useCommandTreeController';
import { MOBILE_COMMAND_TILES, MOBILE_TILE_DIRECTIONS, createMobileTileButton, tileContainsCommand } from '../utils/mobileCommandTiles';
import { useMobileCommandTilesStore } from '../stores/useMobileCommandTilesStore';
import { getCommandTreeSection } from '../utils/commandTreeSections';
import { executeDefaultCommandTarget, executeUntargetedTransferCommand, getDefaultCommandTarget } from './commandDefaultTarget';
import { canCommandAcceptTarget } from '../utils/commandTargetUtils';
import { usesCommandTargetChip } from '../utils/commandTreeCurrentTarget';
import { isCommandTreeTransfer } from '../utils/commandTreeTransfer';
import { isCommandTreeObservation } from '../utils/commandTreeObservation';
import { assignPinnedWheelCell } from '../components/Controls/GameButton/pinnedWheelAssignments';
import { completeMobileTileBindings, hasMobileTileArrangement, removeMobileTileBinding } from '../utils/mobileTileAssignments';
import { isCommandTreePracticeAction } from '../utils/commandTreePractice';
import { usePanelData } from './usePanelData';
import { uiPerformance } from '../utils/uiPerformance';
import type { CustomButton, SwipeDirection } from '../types';
import { getCommandTreeBasePreview } from '../utils/commandTreePreview';
import { useTacticalCommandPrefixStore } from '../stores/useTacticalCommandPrefixStore';
import { isCommandTreeSocial, MOBILE_SOCIAL_SHORTCUTS } from '../utils/commandTreeSocial';

// --- Catalog and character bindings ---
export const useMobileCommandTiles = (controller: ReturnType<typeof useCommandTreeController>, tree: ReturnType<typeof useCommandTree>) => {
 useEffect(() => () => controller.game.setCommandPreview?.(null), [controller.game.setCommandPreview]);
 const character = controller.game.characterName?.toLowerCase() || 'guest';
 const characters = useMobileCommandTilesStore(state => state.characters);
 const customized = useMobileCommandTilesStore(state => state.customized);
 const socialDefaultUpdated = useMobileCommandTilesStore(state => state.socialDefaultUpdated);
 const update = useMobileCommandTilesStore(state => state.update);
 const arrange = useMobileCommandTilesStore(state => state.arrange);
 const markSocialDefaultUpdated = useMobileCommandTilesStore(state => state.markSocialDefaultUpdated);
 const panelData = usePanelData();
 // Eligibility belongs to the target snapshot, not saved bindings. Completing or
 // arranging a tile must not refilter the entire catalog on the resulting render.
 const membership = useRef(new WeakMap<CustomButton, string[]>());
 const families = useMemo(() => {
  const finish = uiPerformance.startWork('Mobile families');
  try {
   const commandsByTile = new Map(MOBILE_COMMAND_TILES.map(tile => [tile.id, [] as CustomButton[]]));
   const seenByTile = new Map(MOBILE_COMMAND_TILES.map(tile => [tile.id, new Set<string>()]));
   // Every family lists its groups in ascending catalog order. Walk each group
   // once, then distribute commands using classification cached by button identity.
   const groups = [...new Set(MOBILE_COMMAND_TILES.flatMap(tile => tile.groups))].sort((a,b) => a-b);
   for (const index of groups) {
    for (const button of tree.grouped[index].buttons) {
     let ids = membership.current.get(button);
     if (!ids) {
      const section = tree.sectionFor?.(button) ?? getCommandTreeSection(button);
      ids = MOBILE_COMMAND_TILES.filter(tile => tileContainsCommand(tile,button,section)).map(tile => tile.id);
      membership.current.set(button,ids);
     }
     for (const id of ids) {
      const tile = MOBILE_COMMAND_TILES.find(entry => entry.id === id)!;
      if (!tile.groups.includes(index)) continue;
      const seen = seenByTile.get(id)!;
      if (seen.has(button.command)) continue;
      seen.add(button.command);commandsByTile.get(id)!.push(button);
     }
    }
   }
   return MOBILE_COMMAND_TILES.map(tile => ({...tile,commands:tile.id === 'social' && commandsByTile.get(tile.id)!.some(isCommandTreeSocial)
    ? MOBILE_SOCIAL_SHORTCUTS : commandsByTile.get(tile.id)!}));
  } finally {finish();}
 }, [tree.grouped,tree.sectionFor]);
 const tiles = useMemo(() => families.map(tile => {
  const {commands} = tile;
  const saved = characters[character]?.find(button => button.id === `mobile-tile-${tile.id}`);
  let button = saved || createMobileTileButton(tile,commands);
  const manuallyArranged = saved && (customized[character]?.includes(saved.id) || hasMobileTileArrangement(saved));
  if (tile.id === 'social' && !commands.some(entry => entry.command === button.command)) {
   const social = commands.find(entry => entry.command === tile.preferred);
   if (social) {
    const previous = button;
    const direction = MOBILE_TILE_DIRECTIONS.find(slot => previous.swipeCommands?.[slot] === social.command);
    button = manuallyArranged ? assignPinnedWheelCell(previous,'center',social.command,social.actionType || 'command',social.setId)
     : {...previous, command:social.command, actionType:social.actionType || 'command',
     ...(direction ? {swipeCommands:{...previous.swipeCommands,[direction]:previous.command},
      swipeActionTypes:{...previous.swipeActionTypes,[direction]:previous.actionType || 'command'}} : {})};
   }
  }
  // Remove relocated commands without shifting the user's other gesture slots.
  if (tile.id === 'combat' || tile.id === 'interact' || tile.id === 'consume') {
   const removed=tile.id === 'combat' ? /^flee(?:\s|$)/i
    : tile.id === 'consume' ? /^(?:fill|empty)(?:\s|$)/i
    : /^(?:(?:pick|group|follow|butcher)(?:\s|$)|drain\s+%n(?:\s|$))/i;
   const bindings = [button.command,...Object.values(button.swipeCommands || {}),...Object.values(button.longSwipeCommands || {})];
   for (const command of bindings) {
    if (command && removed.test(command.trim())) button=removeMobileTileBinding(button,command);
   }
  }
  if (!manuallyArranged) button = completeMobileTileBindings(button,commands);
  return {...tile,commands,button};
 }), [families,character,characters,customized,socialDefaultUpdated]);
 useEffect(() => {
  const changed = tiles.filter(tile => tile.commands.length
   && characters[character]?.find(button => button.id === tile.button.id) !== tile.button);
  if (changed.length) update(character,previous => [
   ...previous.filter(button => !changed.some(tile => tile.button.id === button.id)), ...changed.map(tile => tile.button)
  ]);
  if (!socialDefaultUpdated[character] && tiles.find(tile => tile.id === 'social')?.commands.some(button => button.command === 'smile')) {
   markSocialDefaultUpdated(character);
  }
 }, [tiles,character,characters,update,socialDefaultUpdated,markSocialDefaultUpdated]);
 // Practice targets belong to the current hold, never persistent tree navigation.
 const previewCommand = (button:CustomButton | null) => {
  controller.game.setCommandPreview?.(button ? getCommandTreeBasePreview(button.command) : null);
  controller.practice.setOpen(Boolean(isCommandTreePracticeAction(button)));
  if (!button && isCommandTreePracticeAction(tree.command)) tree.clearCommand();
 };
 const interceptCommand = (command: string) => {
  if (controller.isHelpMode) {controller.executeHelp(command); return true;}
  const verb = command.trim().split(/\s+/)[0].toLowerCase();
  if (verb === 'practice') {
   if (!controller.practice.open) panelData.request('skills',true);
   return true;
  }
  const report = tiles.find(tile => tile.id === 'information')?.commands.find(button => button.command === command);
  if (report && getCommandTreeSection(report) !== 'Observation') {
   controller.dismissOutputs(); controller.requestCommandReport(command,report.label); return true;
  }
  return false;
 };
 const execute = (button: import('../types').CustomButton,event: React.MouseEvent) => {
  if ((!useTacticalCommandPrefixStore.getState().prefix || controller.isHelpMode) && interceptCommand(button.command)) {controller.game.triggerHaptic(20);return;}
  if (isCommandTreeTransfer(button)) executeUntargetedTransferCommand(controller,button,event);
  else if (isCommandTreeObservation(button) || /^(?:assist|ass)(?:\s|$)/i.test(button.command)) {
   controller.game.handleButtonClick({...button,command:button.command.replace(/%n(?:\|[^\s]+)?/g,'').replace(/\s+/g,' ').trim()},event);
  } else if (!executeDefaultCommandTarget(controller,button,tree.targetsFor(button) || [],event)) {
   if (button.setId === 'trait-communication') controller.communication.handleCommand(button.command.replace(/%n(?:\|[^\s]+)?/g,'').trim());
   else controller.game.handleButtonClick(button,event);
  }
 };
 const usesTargetChip = (button:CustomButton) => {
  if (controller.isHelpMode || controller.game.gameState !== 'playing' || controller.game.isSpectateMode
   || !usesCommandTargetChip(button)
   || !canCommandAcceptTarget(button.command) || isCommandTreeTransfer(button) || isCommandTreeObservation(button)
   || /^(?:assist|ass|practice)(?:\s|$)/i.test(button.command.trim())
   || tiles.find(tile => tile.id === 'information')?.commands.some(entry => entry.command === button.command)) return false;
  return Boolean(getDefaultCommandTarget(controller,tree.targetsFor(button) || [],button)
   || (controller.vitals.target && /%n/.test(button.command) && button.setId !== 'trait-communication'));
 };
 const assignCommand = (tileId:string,command:CustomButton,slot:SwipeDirection | 'center' | 'extra') => {
  const button = tiles.find(tile => tile.id === tileId)?.button;
  if (!button) return;
  arrange(character,slot === 'extra' ? removeMobileTileBinding(button,command.command)
   : assignPinnedWheelCell(button,slot,command.command,command.actionType || 'command',command.setId));
  controller.game.triggerHaptic(20);
 };
 return {tiles,execute,assignCommand,previewCommand,usesTargetChip};
};
