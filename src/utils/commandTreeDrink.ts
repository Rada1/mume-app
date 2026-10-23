/** @file commandTreeDrink.ts — One Drink action using the shared fluid-container and room-water resolver. */
import type { CustomButton, DrawerLine } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getDrinkTargetSuggestions } from '../objects/gearTargetSuggestions';
import { createButton } from './buttonFactory';
// --- Shared Drink Command Section ---
export const COMMAND_TREE_DRINK_BUTTON = createButton({id: 'v2-drink', label: 'Drink', command: 'drink %n', setId: 'trait-fluid-container'});
export const isCommandTreeDrink = (button: CustomButton | null) => button?.id === COMMAND_TREE_DRINK_BUTTON.id;
export const isLegacyDrinkCommand = (button: CustomButton) => /^drink(?:\s+(?:water|%n|\$1))?$/i.test(button.command.trim());
// --- Target Projection Section ---
export const getCommandTreeDrinkTargets = (inventory: DrawerLine[], equipment: DrawerLine[], roomWaterAvailable: boolean): CommandActionTargetEntry[] =>
    getDrinkTargetSuggestions(inventory, equipment, roomWaterAvailable).map(target => {
        const water = target.meta === 'source';
        const worn = target.objectLocation === 'worn';
        return {
            id: target.key, label: water ? 'Water in this room' : target.label, keyword: target.value, context: target.value,
            category: water ? 'cat-room' : worn ? 'cat-worn-object' : 'cat-inventory-object',
            group: water ? 'objects' : worn ? 'worn' : 'inventory', scope: water ? 'room' : 'self'
        };
    });
