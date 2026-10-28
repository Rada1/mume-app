/** @file mobileTileAssignments.ts — Complete default wheels and preserve explicit command arrangement. */
import type { CustomButton } from '../types';
import { MOBILE_TILE_DIRECTIONS } from './mobileCommandTiles';

// --- Default Grid Completion Section ---
export const hasMobileTileArrangement = (button: CustomButton): boolean =>
 button.rebindSets !== undefined || button.rebindCenterSetId !== undefined || button.longSwipeCommands !== undefined;

export const completeMobileTileBindings = (button: CustomButton, commands: CustomButton[]): CustomButton => {
 const slots = ['center', ...MOBILE_TILE_DIRECTIONS] as const;
 const read = (slot: typeof slots[number]) => slot === 'center' ? button.command
  : button.swipeCommands?.[slot] || button.longSwipeCommands?.[slot] || '';
 const available = new Set(commands.map(entry => entry.command));
 const assigned = new Set(slots.map(read).filter(command => available.has(command)));
 const remaining = commands.filter(entry => entry.command && !assigned.has(entry.command));
 let next = button;
 for (const slot of slots) {
  if (available.has(read(slot))) continue;
  const entry = remaining.shift();
  if (!entry) break;
  next = slot === 'center'
   ? {...next, command: entry.command, actionType: entry.actionType || 'command'}
   : {...next, swipeCommands: {...next.swipeCommands, [slot]: entry.command},
     swipeActionTypes: {...next.swipeActionTypes, [slot]: entry.actionType || 'command'}};
 }
 return next;
};

// --- Move assigned commands to the extra-command list ---
export const removeMobileTileBinding = (button:CustomButton,command:string):CustomButton => {
 const next = {...button,swipeCommands:{...button.swipeCommands},
  longSwipeCommands:button.longSwipeCommands ? {...button.longSwipeCommands} : undefined,
  swipeActionTypes:{...button.swipeActionTypes},
  longSwipeActionTypes:button.longSwipeActionTypes ? {...button.longSwipeActionTypes} : undefined,
  rebindSets:button.rebindSets ? {...button.rebindSets} : undefined};
 if (next.command === command) {next.command='';next.actionType='command';next.longCommand='';next.rebindCenterSetId=undefined;}
 for (const direction of MOBILE_TILE_DIRECTIONS) {
  if (next.swipeCommands[direction] !== command && next.longSwipeCommands?.[direction] !== command) continue;
  delete next.swipeCommands[direction];delete next.longSwipeCommands?.[direction];
  delete next.swipeActionTypes[direction];delete next.longSwipeActionTypes?.[direction];delete next.rebindSets?.[direction];
 }
 return next;
};
