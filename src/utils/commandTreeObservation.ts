/** @file commandTreeObservation.ts — Observation commands and their shared local target sections. */
import type { CustomButton, GameEntity, InlineCategoryConfig } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getAccessTargetSections, getAccessTargets } from './commandTreeAccess';
import { createButton } from './buttonFactory';
// --- Command Section ---
export const COMMAND_TREE_OBSERVATION_BUTTONS = ['look', 'examine', 'consider'].map(verb => createButton({
    id: `v2-observation-${verb}`, label: verb[0].toUpperCase() + verb.slice(1),
    command: `${verb} %n`, setId: 'trait-utility'
}));
export const COMMAND_TREE_LOOK_IN_BUTTON = createButton({
    id: 'v2-container-look-in', label: 'Look In', command: 'look in %n', setId: 'trait-container'
});
export const LOOK_IN_TARGET_ID = 'observation-look-in-trigger';
export const isCommandTreeObservation = (button: CustomButton | null) => Boolean(button?.id.startsWith('v2-observation-'));
export const isLegacyObservationCommand = (button: CustomButton) => /^look\s+in(?:\s|$)/i.test(button.command.trim())
    || /^(?:look|examine|consider|con)(?:\s+(?:%n|\$1))?$/i.test(button.command.trim());
// --- Target Section ---
export const getLookInTargets = (entries: CommandActionTargetEntry[], entities: Record<string, GameEntity>, categories: InlineCategoryConfig[]) =>
    getAccessTargets(entries, COMMAND_TREE_LOOK_IN_BUTTON, entities, categories).filter(entry => entry.category !== 'cat-exit');

export const getObservationTargets = (candidates: CommandActionTargetEntry[], button: CustomButton) => {
    const isConsider = /^consider\b/i.test(button.command.trim());
    const entries = candidates.filter(entry => entry.scope !== 'remote' && entry.scope !== 'global'
        && entry.id !== 'command-panel-room');
    const lookInTarget: CommandActionTargetEntry = {
        id: LOOK_IN_TARGET_ID, label: 'In', keyword: 'in', context: 'in', category: 'cat-container',
        group: 'objects', scope: 'room'
    };
    const directions: CommandActionTargetEntry[] = ['north', 'east', 'south', 'west', 'up', 'down'].map(label => ({
        id: `observation-direction:${label}`, label: label[0].toUpperCase() + label.slice(1), keyword: label,
        context: label, category: 'cat-exit', group: 'objects', scope: 'room'
    }));
    return [...entries.filter(entry => entry.category !== 'cat-exit'),
        ...(button.command.trim().toLowerCase().startsWith('look ') ? [lookInTarget] : []),
        ...(isConsider ? [] : directions)];
};
export const getObservationTargetSections = (entries: CommandActionTargetEntry[]) => [
    {label: 'Room', entries: entries.filter(entry => (entry.scope === 'room' || entry.id === 'command-panel-self')
        && entry.id !== 'command-panel-room' && entry.id !== LOOK_IN_TARGET_ID && entry.category !== 'cat-exit'
        && entry.group !== 'inventory' && entry.group !== 'worn')},
    {label: 'Inventory', entries: entries.filter(entry => entry.group === 'inventory')},
    {label: 'Equipment', entries: entries.filter(entry => entry.group === 'worn')},
    {label: 'Directions', entries: entries.filter(entry => entry.category === 'cat-exit')},
    {label: 'Containers', entries: entries.filter(entry => entry.id === LOOK_IN_TARGET_ID)}
].filter(section => section.entries.length > 0);

export const getLookInTargetSections = (entries: CommandActionTargetEntry[]) => getAccessTargetSections(entries);
