/** @file commandTreeMovement.ts — Move command entry for the directional submenu. */
import type { CustomButton } from '../types';
import { createButton } from './buttonFactory';
// --- Movement Command Section ---
export const COMMAND_TREE_MOVE_BUTTON = createButton({id: 'v2-move', label: 'Move', command: 'move', setId: 'trait-utility'});
export const isCommandTreeMoveAction = (button: CustomButton | null) => button?.id === COMMAND_TREE_MOVE_BUTTON.id;
