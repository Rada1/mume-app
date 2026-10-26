/** @file useCommandTreeItems.ts - Location -> object -> valid actions for item branches. */
import { useEffect, useMemo, useState } from 'react';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
import { useGearPanelData } from './useGearPanelData';
import { createButton } from '../utils/buttonFactory';
// --- Logic Section ---
export const useCommandTreeItems = (controller: ReturnType<typeof useCommandTreeController>, location: string | null, actionTarget?: CommandActionTargetEntry | null, retainSelectionWhenMissing = false) => {
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const [selectedSnapshot, setSelectedSnapshot] = useState<CommandActionTargetEntry | null>(null);
 const data = useGearPanelData(location === 'All' || location === 'Equipment', location === 'All' || location === 'Inventory');
 const locations = ['Equipment', 'Inventory', 'Room', ...((controller.shop.atShop ?? controller.shop.available) ? ['Shop'] : [])];
 const objects = useMemo(() => {
  const roomSelf: CommandActionTargetEntry = {
   id: 'command-panel-self', label: controller.game.characterName || 'You', keyword: 'self', context: 'self',
   category: 'cat-ally', group: 'players', scope: 'self'
  };
  const entries = controller.entries.filter(entry =>
   location === 'All' ? entry.group === 'worn' || entry.group === 'inventory' || (entry.group === 'objects' && entry.scope === 'room')
    : location === 'Equipment' ? entry.group === 'worn' : location === 'Inventory' ? entry.group === 'inventory'
   : location === 'Room' ? entry.scope === 'room' && ['objects', 'players', 'npcs'].includes(entry.group) && entry.category !== 'cat-exit' : false
  );
  if (location === 'Room') entries.unshift(roomSelf);
  if (!entries.length || !['Equipment', 'Inventory', 'Room'].includes(location || '')) return entries;
  const isRoom = location === 'Room';
  if (isRoom && !entries.some(entry => entry.group === 'objects')) return entries;
  const isEquipment = location === 'Equipment';
  return [{
   id: `command-tree-${location?.toLowerCase()}-all`, label: 'All', keyword: 'all', context: 'all',
   category: isRoom ? 'cat-room-object' : isEquipment ? 'cat-worn-object' : 'cat-inventory-object',
   group: isRoom ? 'objects' as const : isEquipment ? 'worn' as const : 'inventory' as const,
   scope: isRoom ? 'room' as const : 'self' as const
  }, ...entries];
 }, [controller.entries, controller.game.characterName, location]);
 // Keep gear actions open if a command moves the selected item to another location.
 const selected = objects.find(entry => entry.id === selectedId) || (retainSelectionWhenMissing ? selectedSnapshot : null);
 useEffect(() => {setSelectedId(null); setSelectedSnapshot(null); controller.previewEntity(null);}, [location, controller.previewEntity]);
 const chooseObject = (entry: CommandActionTargetEntry) => {
  if (entry.id === selectedId && controller.activeState.entityId === entry.id) return;
  setSelectedId(entry.id); setSelectedSnapshot(entry); controller.previewEntity(entry);
 };
 const selectedActionTarget = actionTarget || selected;
 const actions = useMemo(() => {
  if (!selectedActionTarget || controller.activeState.entityId !== selectedActionTarget.id) return [];
  const seen = new Set<string>();
  return controller.actionGroups.flatMap(group => [
   ...group.buttons,
   ...group.inspectionCommands.map(command => createButton({id:`item-inspect-${command}`,label:command === 'look' ? 'Look' : 'Consider',command:`${command} %n`,setId:'trait-examine'}))
  ]).filter(button => {if (seen.has(button.command)) return false; seen.add(button.command); return true;});
 }, [selectedActionTarget, controller.activeState.entityId, controller.actionGroups]);
 const kind: 'equipment' | 'inventory' = location === 'Equipment' ? 'equipment' : 'inventory';
 const objectSections = ['Equipment', 'Inventory', 'Room'].map(label => ({label,
  objects: objects.filter(entry => label === 'Equipment' ? entry.group === 'worn' : label === 'Inventory' ? entry.group === 'inventory' : entry.scope === 'room' && entry.category !== 'cat-exit'),
  kind: (label === 'Equipment' ? 'equipment' : 'inventory') as 'equipment' | 'inventory',
  ready: label === 'Room' || data.status[label === 'Equipment' ? 'equipment' : 'inventory'] === 'ready'
 }));
 return {objectSections, locations, objects, selected, chooseObject, actions, kind, ready: location === 'Room' || data.status[kind] === 'ready'};
};
