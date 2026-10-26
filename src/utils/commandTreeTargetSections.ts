/** @file commandTreeTargetSections.ts — Grouping target entries into UI sections for CommandPanelV2. */
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { extractMumeKeyword } from './keywordUtils';

// --- Logic Section ---
export const getObjectTargetSections = (entries: CommandActionTargetEntry[]) => [
    { label: 'Room Objects', entries: entries.filter(entry => entry.group === 'objects' && entry.scope === 'room') },
    { label: 'Inventory', entries: entries.filter(entry => entry.group === 'inventory') },
    { label: 'Worn', entries: entries.filter(entry => entry.group === 'worn') }
].filter(section => section.entries.length > 0);

export const getCommandObjectTargetDisplayLabel = (selector: string, fallback: string): string => {
    const ordinal = selector.match(/^(\d+)\./)?.[1];
    const keywordSource = ordinal ? selector.slice(ordinal.length + 1) : selector;
    const keyword = extractMumeKeyword(keywordSource);
    return keyword ? `${ordinal ? `${ordinal}.` : ''}${keyword}` : fallback;
};

export const getCommandActionTargetDisplayLabel = (entry: CommandActionTargetEntry): string => {
    const isObjectTarget = entry.group === 'objects' || entry.group === 'inventory' || entry.group === 'worn';
    if (!isObjectTarget || entry.category === 'cat-exit'
        || entry.id === 'observation-look-in-trigger') return entry.label;
    return getCommandObjectTargetDisplayLabel(entry.keyword, entry.label);
};

export const getCommandTargetSections = (entries: CommandActionTargetEntry[]) => {
    const sections: { label: string; entries: CommandActionTargetEntry[] }[] = [
        { label: 'Current Target', entries: entries.filter(entry => entry.scope === 'global') },
        { label: 'Room Entities', entries: entries.filter(entry => entry.scope === 'room' && ['players', 'npcs'].includes(entry.group) && entry.category !== 'cat-exit') },
        { label: 'Room Objects', entries: entries.filter(entry => entry.scope === 'room' && entry.group === 'objects') },
        { label: 'Doors', entries: entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor === true) },
        { label: 'Exits', entries: entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor !== true) },
        { label: 'You', entries: entries.filter(entry => entry.scope === 'self' && entry.group !== 'inventory' && entry.group !== 'worn') },
        { label: 'Inventory', entries: entries.filter(entry => entry.scope === 'self' && entry.group === 'inventory') },
        { label: 'Worn', entries: entries.filter(entry => entry.scope === 'self' && entry.group === 'worn') },
        { label: 'Group Members', entries: entries.filter(entry => entry.scope === 'remote' || entry.group === 'group') },
        { label: 'Weather', entries: entries.filter(entry => entry.group === 'weather') }
    ];
    const assigned = new Set(sections.flatMap(section => section.entries.map(entry => entry.id)));
    const otherEntries = entries.filter(entry => !assigned.has(entry.id));
    if (otherEntries.length) sections.push({ label: 'Other Targets', entries: otherEntries });
    return sections.filter(section => section.entries.length > 0);
};
