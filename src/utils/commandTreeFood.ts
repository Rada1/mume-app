/** @file commandTreeFood.ts — Food and drink commands exposed by the V2 command tree. */
import { createButton } from './buttonFactory';

// --- Food Action Section ---
export const COMMAND_TREE_FOOD_BUTTONS = [
    createButton({ id: 'v2-taste', label: 'Taste', command: 'taste %n', setId: 'inline-food' }),
    createButton({ id: 'v2-sip', label: 'Sip', command: 'sip %n', setId: 'inline-fluidcontainer' }),
    createButton({ id: 'v2-forage', label: 'Forage', command: 'forage', setId: 'cat-room' })
];

export const isCommandTreeForageAvailable = (race?: string | null, subrace?: string | null): boolean => {
    const ancestry = `${race || ''} ${subrace || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return ancestry.includes('beorning') || ancestry.includes('bear');
};
