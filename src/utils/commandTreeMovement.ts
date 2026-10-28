/** @file commandTreeMovement.ts — Move command entry for the directional submenu. */
import type { CustomButton } from '../types';
import { createButton } from './buttonFactory';
// --- Movement Command Section ---
export const COMMAND_TREE_MOVE_BUTTON = createButton({id: 'v2-move', label: 'Go', command: 'move', setId: 'trait-utility'});
export const COMMAND_TREE_FOLLOW_BUTTON = createButton({id: 'v2-follow', label: 'Follow', command: 'follow %n', setId: 'inline-ally', color: '#16a34a'});
export const isCommandTreeMoveAction = (button: CustomButton | null) => button?.id === COMMAND_TREE_MOVE_BUTTON.id;
