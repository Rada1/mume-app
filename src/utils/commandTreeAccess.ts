/** @file commandTreeAccess.ts — Shared doors/container commands and local target grouping. */
import type { CustomButton, GameEntity, InlineCategoryConfig } from '../types';
import { EntityCapability } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getResolvedTraitSections } from './inlineActionModel';
import { isFluidContainer } from './gameUtils';
import { createButton } from './buttonFactory';
// --- Shared Command Section ---
export const COMMAND_TREE_ACCESS_BUTTONS = ['open', 'close', 'lock', 'unlock', 'pick', 'knock'].map(verb => createButton({
    id: `v2-access-${verb}`, label: verb[0].toUpperCase() + verb.slice(1), command: `${verb} %n`, setId: 'trait-door-actions'
}));
export const COMMAND_TREE_EMPTY_BUTTON = createButton({id: 'v2-container-empty', label: 'Empty', command: 'empty %n', setId: 'trait-container'});
export const COMMAND_TREE_CALL_BUTTON = createButton({
    id: 'v2-call-door', label: 'Call', command: 'call', setId: 'trait-door-actions'
});
export const isCommandTreeCallAction = (button: CustomButton | null) => button?.id === COMMAND_TREE_CALL_BUTTON.id;
export const COMMAND_TREE_CONTAINER_BUTTONS = [...COMMAND_TREE_ACCESS_BUTTONS.filter(button => !/^knock\b/.test(button.command)).map(button => ({...button,
    id: button.id.replace('v2-access-', 'v2-container-'), setId: 'trait-container'
})), COMMAND_TREE_EMPTY_BUTTON];
export const isCommandTreeAccess = (button: CustomButton | null) =>
    Boolean(button && (/^v2-(?:access|container)-/.test(button.id) || /^pick(?:\s|$)/i.test(button.command.trim())));
export const isCommandTreeContainer = (button: CustomButton) => button.id.startsWith('v2-container-');
export const isLegacyAccessCommand = (button: CustomButton) => /^(?:open|close|lock|unlock|pick|knock|empty)(?:\s+(?:exit(?:\s+%n)?|%n(?:\|exit)?|\$1))?$/i.test(button.command.trim());
// --- Local Target Section ---
export const getAccessTargets = (entries: CommandActionTargetEntry[], button: CustomButton, entities: Record<string, GameEntity>, categories: InlineCategoryConfig[]) =>
    entries.filter(entry => {
        if (entry.scope === 'remote' || entry.scope === 'global') return false;
        const isContainerAction = isCommandTreeContainer(button);
        const accessVerb = button.command.trim().split(/\s+/)[0].toLowerCase();
        if (accessVerb === 'pick') {
            if (entry.category === 'cat-exit') return entry.scope === 'room' && entry.hasDoor === true;
            if (entry.scope !== 'room' || entry.group !== 'objects') return false;
            const objectName = [entry.gearRow?.name, entry.gearRow?.line.text, entry.label, entry.keyword, entry.context].filter(Boolean).join(' ');
            return /\bchest\b/i.test(objectName);
        }
        if (['lock', 'unlock', 'knock'].includes(accessVerb)) {
            return entry.category === 'cat-exit' && entry.scope === 'room' && entry.hasDoor === true;
        }
        if (entry.category === 'cat-exit') return entry.hasDoor === true
            && (!isContainerAction || ['open', 'close'].includes(accessVerb));
        if (!isContainerAction) return false;
        if (!['objects', 'worn', 'inventory'].includes(entry.group)) return false;
        const objectName = [entry.gearRow?.name, entry.gearRow?.line.text, entry.label, entry.keyword, entry.context].filter(Boolean).join(' ');
        const traits = getResolvedTraitSections(entry.category, objectName, categories);
        const capabilities = entities[entry.id]?.capabilities || [];
        const fluidContainer = capabilities.some(capability =>
            [EntityCapability.FluidContainer, EntityCapability.DrinkContainer].includes(capability))
            || isFluidContainer(objectName)
            || traits.some(section => section.trait.id === 'trait-fluid-container');
        const hasContainerTrait = Boolean(entry.gearRow?.isContainer
            || capabilities.some(capability => [EntityCapability.Container, EntityCapability.FluidContainer, EntityCapability.DrinkContainer].includes(capability))
            || traits.some(section => section.trait.id === 'trait-container' || section.trait.id === 'trait-fluid-container'));
        const cannotAccessFluidContainer = ['open', 'close', 'lock', 'unlock', 'pick'].includes(accessVerb);
        return hasContainerTrait && !(cannotAccessFluidContainer && fluidContainer);
    });
export const getAccessTargetSections = (entries: CommandActionTargetEntry[]) => [
    {label: 'Doors', entries: entries.filter(entry => entry.category === 'cat-exit')},
    {label: 'Room containers', entries: entries.filter(entry => entry.category !== 'cat-exit' && entry.group === 'objects')},
    {label: 'Inventory containers', entries: entries.filter(entry => entry.group === 'inventory')},
    {label: 'Worn containers', entries: entries.filter(entry => entry.group === 'worn')}
].filter(section => section.entries.length > 0);
