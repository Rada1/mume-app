import { CustomButton } from '../../../types';
import { WORLD_BUTTONS } from './world';
import { ITEM_BUTTONS } from './items';
import { NPC_BUTTONS } from './npcs';

/**
 * @file index.ts
 * @description Aggregates all inline category buttons.
 */

export const INLINE_CATEGORY_BUTTONS: CustomButton[] = [
    ...WORLD_BUTTONS,
    ...ITEM_BUTTONS,
    ...NPC_BUTTONS
];

