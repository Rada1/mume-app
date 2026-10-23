/** @file useCommandTreeItems.ts - Location -> object -> valid actions for item branches. */
import { useEffect, useMemo, useState } from 'react';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
import { useGearPanelData } from './useGearPanelData';
import { createButton } from '../utils/buttonFactory';
// --- Logic Section ---
export const useCommandTreeItems = (controller: ReturnType<typeof useCommandTreeController>, location: string | null) => {
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const data = useGearPanelData(location === 'All' || location === 'Equipment', location === 'All' || location === 'Inventory');
 const locations = ['Equipment', 'Inventory', 'Room', ...((controller.shop.atShop ?? controller.shop.available) ? ['Shop'] : [])];
 const objects = useMemo(() => controller.entries.filter(entry =>
  location === 'All' ? entry.group === 'worn' || entry.group === 'inventory' || (entry.group === 'objects' && entry.scope === 'room')
   : location === 'Equipment' ? entry.group === 'worn' : location === 'Inventory' ? entry.group === 'inventory'
   : location === 'Room' ? entry.group === 'objects' && entry.scope === 'room' : false
 ), [controller.entries, location]);
 const selected = objects.find(entry => entry.id === selectedId) || null;
 useEffect(() => {setSelectedId(null); controller.previewEntity(null);}, [location, controller.previewEntity]);
 const chooseObject = (entry: CommandActionTargetEntry) => {
  if (entry.id === selectedId) return;
  setSelectedId(entry.id); controller.previewEntity(entry);
 };
 const actions = useMemo(() => {
  if (!selected || controller.activeState.entityId !== selected.id) return [];
  const seen = new Set<string>();
  return controller.actionGroups.flatMap(group => [
   ...group.buttons,
   ...group.inspectionCommands.map(command => createButton({id:`item-inspect-${command}`,label:command === 'look' ? 'Look' : 'Consider',command:`${command} %n`,setId:'trait-examine'}))
  ]).filter(button => {if (seen.has(button.command)) return false; seen.add(button.command); return true;});
 }, [selected, controller.activeState.entityId, controller.actionGroups]);
 const kind: 'equipment' | 'inventory' = location === 'Equipment' ? 'equipment' : 'inventory';
 const objectSections = ['Equipment', 'Inventory', 'Room'].map(label => ({label,
  objects: objects.filter(entry => label === 'Equipment' ? entry.group === 'worn' : label === 'Inventory' ? entry.group === 'inventory' : entry.group === 'objects'),
  kind: (label === 'Equipment' ? 'equipment' : 'inventory') as 'equipment' | 'inventory',
  ready: label === 'Room' || data.status[label === 'Equipment' ? 'equipment' : 'inventory'] === 'ready'
 }));
 return {objectSections, locations, objects, selected, chooseObject, actions, kind, ready: location === 'Room' || data.status[kind] === 'ready'};
};
