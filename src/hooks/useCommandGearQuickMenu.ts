/** @file useCommandGearQuickMenu.ts — Build actions backwards from gear and container contents. */
import { useEffect, useState } from 'react';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { useCommandTreeItems } from './useCommandTreeItems';
import { useCommandTreeGetFrom } from './useCommandTreeGetFrom';
import type { useCommandTreeController } from './useCommandTreeController';
import { COMMAND_TREE_GROUPS } from './useCommandTree';
import { commandTreeGroup } from '../utils/commandTreeGroups';
import { getCommandTreeSection, getCommandTreeSectionLabels } from '../utils/commandTreeSections';

// --- Selection and Action Sections ---
export const useCommandGearQuickMenu = (controller: ReturnType<typeof useCommandTreeController>, kind: 'Inventory' | 'Equipment' | 'Room', initialTarget?: CommandActionTargetEntry, persistent = false, onSelect?: (entry: CommandActionTargetEntry) => void) => {
 const getFrom = useCommandTreeGetFrom(controller);
 const [contentKey, setContentKey] = useState<string | null>(null);
 const allContent = getFrom.items.find(item => item.value === 'all') || null;
 const contentItems: CommandActionTargetEntry[] = getFrom.items.filter(item => item.value !== 'all').map(item => ({
  id: `${getFrom.selected?.key}:content:${item.key}`, label: item.label,
  keyword: item.value, context: item.value, category: 'cat-container-item',
  group: 'objects', scope: 'self', parentNoun: getFrom.selected?.value,
  parentId: getFrom.selected?.containerId
 }));
 const selectedContent = contentItems.find(item => item.id === contentKey) || null;
 const items = useCommandTreeItems(controller, kind, selectedContent, persistent || kind !== 'Room');
 useEffect(() => { getFrom.clearSelection(); setContentKey(null); }, [kind]);
 const containerFor = (entry: CommandActionTargetEntry) => {
  const targetLocation = entry.group === 'objects' ? 'room' : entry.group;
  return getFrom.fromSections.flatMap(group => group.targets).find(target =>
   target.meta === targetLocation && (target.objectId === entry.id || target.containerId === entry.gearRow?.line.id));
 };
 const chooseObject = (entry: CommandActionTargetEntry) => {
  setContentKey(null);
  items.chooseObject(entry);
  onSelect?.(entry);
  const container = containerFor(entry);
  if (!persistent && container) getFrom.selectContainer(container);
  else if (!persistent || (getFrom.selected && getFrom.selected.key !== container?.key)) getFrom.clearSelection();
 };
 const toggleContainer = (entry: CommandActionTargetEntry) => {
  const container = containerFor(entry);
  if (!container) return;
  const expanded = getFrom.selected?.key === container.key;
  chooseObject(entry);
  if (expanded) getFrom.clearSelection(); else getFrom.selectContainer(container);
 };
 useEffect(() => {
  if (initialTarget && items.selected?.id !== initialTarget.id) chooseObject(initialTarget);
 }, [kind, initialTarget?.id]);
 const chooseContent = (entry: CommandActionTargetEntry) => {
  setContentKey(entry.id);
  controller.previewEntity(entry);
 };
 const actionSections = COMMAND_TREE_GROUPS.map((label, index) => {
  const buttons = items.actions.filter(button => {
   if (button.id === 'btn-corpse-get-all' || /^g\s*\/\s*all$/i.test(button.label)) return false;
   const group = commandTreeGroup(button);
   return group === index || (group === null && index === 3);
  });
  const sections = getCommandTreeSectionLabels(buttons,index).map(label => ({label,
   buttons:buttons.filter(button=>getCommandTreeSection(button)===label)
  }));
  return {label,buttons,sections};
 }).filter(section => section.buttons.length > 0);
 const roomEntities = items.objects.filter(entry => entry.id === 'command-panel-self'
  || (entry.scope === 'room' && ['players', 'npcs'].includes(entry.group)));
 const roomObjects = items.objects.filter(entry => entry.scope === 'room' && entry.group === 'objects');
 return { items, getFrom, allContent, contentItems, selectedContent, chooseObject, chooseContent, actionSections, roomEntities, roomObjects, containerFor, toggleContainer };
};
