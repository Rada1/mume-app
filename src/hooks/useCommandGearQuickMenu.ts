/** @file useCommandGearQuickMenu.ts — Build actions backwards from gear and container contents. */
import { useEffect, useState } from 'react';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { useCommandTreeItems } from './useCommandTreeItems';
import { useCommandTreeGetFrom } from './useCommandTreeGetFrom';
import type { useCommandTreeController } from './useCommandTreeController';
import { COMMAND_TREE_GROUPS } from './useCommandTree';
import { commandTreeGroup } from '../utils/commandTreeGroups';

// --- Selection and Action Sections ---
export const useCommandGearQuickMenu = (controller: ReturnType<typeof useCommandTreeController>, kind: 'Inventory' | 'Equipment') => {
 const getFrom = useCommandTreeGetFrom(controller);
 const [contentKey, setContentKey] = useState<string | null>(null);
 const contentItems: CommandActionTargetEntry[] = getFrom.items.filter(item => item.value !== 'all').map(item => ({
  id: `${getFrom.selected?.key}:content:${item.key}`, label: item.label,
  keyword: item.value, context: item.value, category: 'cat-container-item',
  group: 'objects', scope: 'self', parentNoun: getFrom.selected?.value,
  parentId: getFrom.selected?.containerId
 }));
 const selectedContent = contentItems.find(item => item.id === contentKey) || null;
 const items = useCommandTreeItems(controller, kind, selectedContent);
 useEffect(() => { getFrom.clearSelection(); setContentKey(null); }, [kind]);
 const chooseObject = (entry: CommandActionTargetEntry) => {
  setContentKey(null);
  items.chooseObject(entry);
  const container = getFrom.fromSections.flatMap(group => group.targets).find(target =>
   target.meta === entry.group && (target.objectId === entry.id || target.containerId === entry.gearRow?.line.id));
  if (container) getFrom.selectContainer(container); else getFrom.clearSelection();
 };
 const chooseContent = (entry: CommandActionTargetEntry) => {
  setContentKey(entry.id);
  controller.previewEntity(entry);
 };
 const actionSections = COMMAND_TREE_GROUPS.map((label, index) => ({label,
  buttons: items.actions.filter(button => {
   const group = commandTreeGroup(button);
   return group === index || (group === null && index === 3);
  })
 })).filter(section => section.buttons.length > 0);
 return { items, getFrom, contentItems, selectedContent, chooseObject, chooseContent, actionSections };
};
