/** @file useCommandGearTransfer.ts — Continue Give/Put from the object selected in a quick target menu. */
import { useEffect, useState, type MouseEvent } from 'react';
import type { CustomButton } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getGearTargetSuggestions } from '../objects/gearTargetSuggestions';
import { createButton } from '../utils/buttonFactory';
import { useCommandTreeTransfer } from './useCommandTreeTransfer';
import type { useCommandTreeController } from './useCommandTreeController';

// --- Staged Object Transfer ---
const placeholder = createButton({id:'quick-transfer-placeholder', label:'Put', command:'put %n', setId:'trait-object'});
export const useCommandGearTransfer = (controller: ReturnType<typeof useCommandTreeController>, kind: string,
 selected: CommandActionTargetEntry | null, contentsSelected: boolean, workspace: boolean) => {
 const [command, setCommand] = useState<CustomButton|null>(null);
 const source = selected ? getGearTargetSuggestions(controller.ui.displayInventoryLines || [], 'inventory')
  .find(target => target.objectId === selected.id) || {
   key:selected.id, objectId:selected.id, label:selected.label, value:selected.context, meta:'inventory'
  } : undefined;
 const transfer = useCommandTreeTransfer(controller, command || placeholder, source);
 useEffect(() => setCommand(null), [kind, selected?.id, contentsSelected]);
 const reset = () => setCommand(null);
 const request = (button: CustomButton, event: MouseEvent) => {
  if (kind !== 'Inventory' || !selected || contentsSelected || !/^(?:put|give)(?:\s|$)/i.test(button.command)) return false;
  if (!workspace && /^give\b/i.test(button.command)) return false;
  event.preventDefault();
  event.stopPropagation();
  setCommand(button);
  controller.game.setCommandPreview?.(`${/^give\b/i.test(button.command)?'give':'put'} ${source?.value || '<item>'}`);
  return true;
 };
 return {...transfer, command, request, reset};
};
