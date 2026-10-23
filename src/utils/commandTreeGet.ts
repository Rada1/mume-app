/** @file commandTreeGet.ts — Identifies the staged Get target flow in the V2 command tree. */
import type { CustomButton, DrawerLine, GmcpOccupant } from '../types';
import type { CommandTargetSuggestion } from '../objects/targetSuggestionTypes';
import { getContainerTargetSuggestions, getGearTargetSuggestions } from '../objects/gearTargetSuggestions';
import { getRoomCorpseTargetSuggestions } from '../objects/roomTargetSuggestions';
import { hasObjectTrait } from '../objects/objectTargetModel';

// --- Command Identity Section ---
export const isCommandTreeGetAction = (button: CustomButton | null): boolean =>
    Boolean(button && /^get\s+(?:%n(?:\|[^\s]+)?|\$1)$/i.test(button.command.trim()));

// --- Source Target Section ---
export interface CommandTreeGetFromTarget extends CommandTargetSuggestion {
    category: 'container' | 'corpse';
}

export const getCommandTreeGetFromTargets = (
    roomItems: Array<string | GmcpOccupant>, inventory: DrawerLine[], worn: DrawerLine[], roomNum: number | string
): CommandTreeGetFromTarget[] => {
    const byObject = new Map<string, CommandTreeGetFromTarget>();
    getContainerTargetSuggestions(roomItems, inventory, worn).filter(target => target.meta !== 'exit')
        .forEach(target => byObject.set(target.objectId || target.key, {...target,
            containerId: target.containerId || target.objectId || target.key, category: 'container'}));

    const roomCorpses = getRoomCorpseTargetSuggestions(roomItems).map(target => ({...target,
        meta: 'room', category: 'corpse' as const,
        containerId: `command-get-corpse:${roomNum}:${target.objectId || target.key}`
    }));
    const gearCorpses = (lines: DrawerLine[], meta: 'inventory' | 'worn') =>
        getGearTargetSuggestions(lines.filter(line => !line.isHeader && hasObjectTrait(line, 'trait-corpse')), meta)
            .map(target => ({...target, category: 'corpse' as const,
                containerId: `command-get-corpse:${roomNum}:${target.objectId || target.key}`}));
    [...roomCorpses, ...gearCorpses(inventory, 'inventory'), ...gearCorpses(worn, 'worn')]
        .forEach(target => byObject.set(target.objectId || target.key, target));
    return Array.from(byObject.values());
};
