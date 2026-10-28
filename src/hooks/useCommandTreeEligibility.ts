/** @file useCommandTreeEligibility.ts — Lazy live targets with stable character requirement inputs. */
import { useMemo } from 'react';
import { useCommandTreeController } from './useCommandTreeController';
import { useCommandTreeCatalog } from './useCommandTreeCatalog';
import { isButtonValidForEntity } from '../utils/actionUtils';
import { useCommandTraitEligibility } from './useCommandTraitEligibility';
import { commandTreeGroup as classify, isCommandTreeSpell, commandTreeAbilityClass, commandTreeMountSection } from '../utils/commandTreeGroups';
import { commandTreeActionKey } from '../utils/commandTreeIdentity';
import { isCommandTreeShopAction } from '../utils/commandTreeShop';
import { isCommandTreePracticeAction } from '../utils/commandTreePractice';
import { isCommandTreeObservation, getObservationTargets, getLookInTargets } from '../utils/commandTreeObservation';
import { isCommandTreeAccess, isCommandTreeCallAction, isCommandTreeContainer, getAccessTargets } from '../utils/commandTreeAccess';
import { isCommandTreeDrink, getCommandTreeDrinkTargets } from '../utils/commandTreeDrink';
import { isDoorPresenceSpellCommand } from '../utils/doorCommandUtils';
import { parseKeyedSpellCommand } from '../utils/magicKeyUtils';
import { hasWornLantern } from '../utils/commandTreeLightCamp';
import { getCommandTreeGetFromTargets, isCommandTreeGetAction } from '../utils/commandTreeGet';
import { useRoomDrinkWater } from './useRoomDrinkWater';
import { getCommandTreeCurrentTarget, isCommandTreeOffensiveTargetAction } from '../utils/commandTreeCurrentTarget';
import { isCommandTreeSelfTarget } from '../utils/commandTreeTargetColor';
import { useCommandTreeAutomaticTarget } from './useCommandTreeAutomaticTarget';
import { createObjectTargetEntries, getGearObjectCandidates, getRoomObjectCandidates, hasObjectTrait } from '../objects/objectTargetModel';
import { isCommandTreeSearchAction, getCommandTreeSearchTargets } from '../utils/commandTreeSearch';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { CustomButton } from '../types';
// --- Eligibility Snapshot Section ---
export const useCommandTreeEligibility = (
 controller: ReturnType<typeof useCommandTreeController>,
 preparedCatalog: ReturnType<typeof useCommandTreeCatalog>['preparedCatalog'],
 variantsByAction: ReturnType<typeof useCommandTreeCatalog>['variantsByAction'],
 atShop: boolean, skillsReady: boolean, isMobileReadabilityMode: boolean
) => {
 const traitEligibilityFor = useCommandTraitEligibility(controller.game.inlineCategories, controller.vitals.characterInfo);
 const automaticTarget = useCommandTreeAutomaticTarget();
 const roomWaterAvailable = useRoomDrinkWater();
 // These projections classify names; reuse them across room/target snapshots.
 const inventoryCandidates = useMemo(() => getGearObjectCandidates(controller.ui.displayInventoryLines || [], 'inventory'), [controller.ui.displayInventoryLines]);
 const wornCandidates = useMemo(() => getGearObjectCandidates(controller.ui.displayEqLines || [], 'worn'), [controller.ui.displayEqLines]);
 return useMemo(() => {
 const selfEntry: CommandActionTargetEntry = { id: 'command-panel-self', label: controller.game.characterName || 'You', keyword: 'self', context: 'self', category: 'cat-ally', group: 'players' as const, scope: 'self' as const };
 const roomEntry: CommandActionTargetEntry = { ...selfEntry, id: 'command-panel-room', label: 'Current room', keyword: '', context: '', category: 'cat-room', scope: 'room' as const };
 const candidates: CommandActionTargetEntry[] = [selfEntry, roomEntry, ...controller.entries];
 const deps = { buttons: controller.menuButtons, inlineCategories: controller.game.inlineCategories, roomNpcs: controller.game.roomNpcs, entities: controller.game.entities, characterInfo: controller.vitals.characterInfo, currentTerrain: controller.game.currentTerrain };
 const allowedButtons = new Map<string, ReadonlySet<string>>();
 const allowedFor = (entry: CommandActionTargetEntry) => {
  let allowed = allowedButtons.get(entry.id);
  if (!allowed) {
   allowed = traitEligibilityFor(entry.category, controller.game.entities[entry.id]?.name || entry.label);
   allowedButtons.set(entry.id, allowed);
  }
  return allowed;
 };
 let roomMountAvailable: boolean | undefined;
 const hasRoomMount = () => roomMountAvailable ??= controller.entries.some(entry => entry.scope === 'room'
  && entry.group === 'npcs'
  && ['btn-mount-ride','btn-mount-lead','btn-mount-abandon','btn-mount-dismount']
   .some(id => allowedFor(entry).has(id)));
 const hasWornWhetstone = () => (controller.ui.displayEqLines || []).some(line => line.isItem && !line.isHeader
  && hasObjectTrait(line, 'trait-whetstone'));
 const hasInventory = inventoryCandidates.some(item => item.keyword.toLowerCase() !== 'all');
 const hasWornGear = wornCandidates.some(item => item.keyword.toLowerCase() !== 'all');
 let getSourcesAvailable: boolean | undefined;
 const hasGetSources = () => getSourcesAvailable ??= getCommandTreeGetFromTargets(
  controller.game.roomItems || [], controller.ui.displayInventoryLines || [], controller.ui.displayEqLines || [], controller.game.roomNum
 ).length > 0;
  const roomWaterTargets = (): CommandActionTargetEntry[] => {
   const supportsDrink = (entry: CommandActionTargetEntry) => {
    const actionIds = allowedFor(entry);
    const objectName = `${entry.label} ${entry.keyword} ${entry.context}`;
    return actionIds.has('btn-water-drink') || actionIds.has('btn-fluid-drink')
     || hasObjectTrait(objectName, 'trait-water') || hasObjectTrait(objectName, 'trait-fluid-container');
   };
   const targets = controller.entries.filter(entry => entry.scope === 'room' && entry.group === 'objects' && supportsDrink(entry));
   const targetIds = new Set(targets.map(entry => entry.id));
   const targetKeywords = new Set(targets.map(entry => entry.keyword.trim().toLowerCase()));
   const roomWaterObjects = createObjectTargetEntries(getRoomObjectCandidates(controller.game.roomItems || []))
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
  if (parseKeyedSpellCommand(button.command)) { targetCache.set(key, []); return []; }
  if (isCommandTreeSearchAction(button)) {
   const matches=getCommandTreeSearchTargets();targetCache.set(key,matches);return matches;
  }
  if (/^follow\b/i.test(button.command.trim())) {
   const matches = candidates.filter(entry => entry.id === 'command-panel-self'
    || (entry.id !== 'command-panel-room' && entry.scope === 'room'
     && ['players','npcs'].includes(entry.group) && entry.category !== 'cat-exit'));
   targetCache.set(key,matches); return matches;
  }
  if (/^(?:tell|whois)\b/i.test(button.command.trim())) {
   targetCache.set(key, []); return [];
  }
  if (/^watch\s*$/i.test(button.command.trim())) {
   targetCache.set(key, []); return [];
  }
  if (/social/i.test(button.setId)) {
   const matches = candidates.filter(entry => (entry.id === 'command-panel-self' || entry.scope === 'room')
    && ['players','npcs'].includes(entry.group) && !['cat-room','cat-exit'].includes(entry.category));
   targetCache.set(key, matches); return matches;
  }
  if (isCommandTreeCallAction(button)) {
   targetCache.set(key, []); return [];
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
  if (/^whet\s+%n(?:\||\s|$)/i.test(button.command.trim())) {
   const variants = [button, ...(variantsByAction.get(key) || [])];
   const matches = controller.entries.filter(entry => {
    if (entry.group !== 'worn' || !entry.gearRow
     || !hasObjectTrait(entry.gearRow.line, 'trait-weapon')
     || /\b[\w-]*bow\b/i.test(entry.gearRow.name)) return false;
    const targetActions = new Set([...allowedFor(entry), 'btn-whet']);
    return variants.some(variant => variant.id === 'btn-whet'
     && isButtonValidForEntity(variant, entry.id, entry.category, deps, entry.category, entry.label, targetActions));
   });
   targetCache.set(key, matches); return matches;
  }
  if (/^recite\s+%n(?:\||\s|$)/i.test(button.command.trim())) {
   const variants = [button, ...(variantsByAction.get(key) || [])];
   const matches = controller.entries.filter(entry => {
    if (entry.group !== 'inventory' || !entry.gearRow) return false;
    const name = entry.gearRow.name.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    const isKnownScroll = /\b(?:azure|black|blue|purple|vellum|ivory|clear\s+ivory|ebony)\s+scroll\b/.test(name)
     || /\bobsidian eye\b/.test(name)
     || /\bscroll\s+which\s+reads\s+["']?ysafg\b["']?/.test(name);
    if (!isKnownScroll) return false;
    const targetActions = new Set([...allowedFor(entry), 'btn-recite']);
    return variants.some(variant => variant.id === 'btn-recite'
     && isButtonValidForEntity(variant, entry.id, entry.category, deps, entry.category, entry.label, targetActions));
   });
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
  if (isCommandTreeAccess(button) || /^pick\b/i.test(button.command.trim())) {
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
  const isOffensiveTargetAction = variants.some(isCommandTreeOffensiveTargetAction);
  const selectedTarget = isOffensiveTargetAction
   ? getCommandTreeCurrentTarget(candidates, controller.vitals.target || automaticTarget)
   : null;
  const currentTarget = selectedTarget && !isCommandTreeSelfTarget(selectedTarget, controller.game.characterName)
   ? selectedTarget : null;
  const verb = button.command.trim().split(/\s+/)[0].toLowerCase();
  const roomWaterMatches = ['sip','quaff'].includes(verb) ? roomWaterTargets() : [];
  const isMessage = /^(say|tell|whisper|ask|reply|emote|narrate|yell|shout|sing|pray|chat)$/.test(verb) || /communicat/.test(button.setId);
  const isAssist = verb === 'assist' || verb === 'ass';
  const playerName = controller.game.characterName?.trim().toLowerCase() || '';
  const resolvedMatches = candidates.filter(entry => {
   if (isDoorPresenceSpellCommand(button.command)
    && (entry.scope !== 'room' || entry.category !== 'cat-exit' || entry.hasDoor !== true)) return false;
   if (isOffensiveTargetAction && isCommandTreeSelfTarget(entry, controller.game.characterName)) return false;
   if (['ride','lead','abandon','dismount'].includes(verb)
    && (entry.scope !== 'room' || entry.group !== 'npcs')) return false;
   if (isMessage && (entry.id === 'command-panel-self' || entry.keyword.toLowerCase() === 'self'
    || entry.context.toLowerCase() === 'self' || entry.label.toLowerCase() === controller.game.characterName?.toLowerCase())) return false;
   // Assist targets must be other group members; allies and the player are not valid choices.
   if (isAssist && (!entry.groupMember || entry.scope === 'self'
    || Boolean(playerName && [entry.label, entry.keyword, entry.context, entry.groupMember.name, entry.groupMember.label]
     .some(name => typeof name === 'string' && name.trim().toLowerCase() === playerName)))) return false;
   const targetVerb = isCommandTreeSpell(button) ? 'cast' : verb;
   if (targetVerb === 'use' && entry.group !== 'worn') return false;
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
  if (verb === 'whet' && !hasWornWhetstone()) return false;
  if (['wear', 'put', 'give', 'drop'].includes(verb)
   && !hasInventory) return false;
  if (verb === 'remove'
   && !hasWornGear) return false;
  if (commandTreeMountSection(button) && !hasRoomMount()) return false;
  if (isCommandTreeContainer(button) && !targetsFor(button).length) return false;
  if (isCommandTreeCallAction(button) && !controller.entries.some(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor === true)) return false;
   if (/^(sell|value|mend|buy)\b/.test(button.command) && !atShop) return false;
   if (classify(button) === null) return false;
   if (!button.command || button.setId === 'trait-state') return false;
   if (button.requirement?.ability && !skillsReady) return false;
   if ((isCommandTreeSpell(button) || commandTreeAbilityClass(button)) && !skillsReady) return false;
   const canGetFromSource = isCommandTreeGetAction(button) && hasGetSources();
   const allowUntargetedAbility = isMobileReadabilityMode && classify(button) === 0;
   if (!isCommandTreeShopAction(button) && !isCommandTreePracticeAction(button) && /%n/.test(button.command) && !/^(?:tell|whois)\b/i.test(button.command) && !targetsFor(button).length && !parseKeyedSpellCommand(button.command) && !canGetFromSource && !allowUntargetedAbility) return false;
   return true;
 };
 // Navigation reads labels only; resolve a group's eligibility on first use.
 const grouped = preparedCatalog.groups.map(entry => {
  let buttons: CustomButton[] | undefined;
  return {label: entry.label, get buttons() { return buttons ??= entry.buttons.filter(isAvailable); }};
 });
 return {grouped, targetsFor, sectionFor: preparedCatalog.sectionFor};
 // Eligibility reads race/subrace/class only; XP/gold/level packets must reuse
 // the lazy group and target caches that all twelve mobile families consume.
 }, [preparedCatalog, variantsByAction, traitEligibilityFor, inventoryCandidates, wornCandidates, controller.entries, controller.menuButtons, controller.game.characterName, controller.game.inlineCategories,
     controller.game.roomNpcs, controller.game.entities, controller.vitals.characterInfo?.race, controller.vitals.characterInfo?.subrace, controller.vitals.characterInfo?.class, controller.vitals.target,
     controller.game.currentTerrain, controller.game.roomItems, controller.game.roomNum, atShop, skillsReady, roomWaterAvailable, controller.ui.displayInventoryLines, controller.ui.displayEqLines,
     isMobileReadabilityMode, automaticTarget]);
};
