/** @file commandTreeTargetSections.ts — Grouping target entries into UI sections for CommandPanelV2. */
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { extractMumeKeyword } from './keywordUtils';

// --- Logic Section ---
export const getObjectTargetSections = (entries: CommandActionTargetEntry[]) => [
    { label: 'Doors', entries: entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor === true) },
    { label: 'Exits', entries: entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor !== true) },
    { label: 'Room Objects', entries: entries.filter(entry => entry.group === 'objects' && entry.scope === 'room' && entry.category !== 'cat-exit') },
    { label: 'Inventory', entries: entries.filter(entry => entry.group === 'inventory') },
    { label: 'Worn', entries: entries.filter(entry => entry.group === 'worn') }
].filter(section => section.entries.length > 0);

export const getCommandObjectTargetDisplayLabel = (selector: string, fallback: string): string => {
    const ordinal = selector.match(/^(\d+)\./)?.[1];
    const fullName = fallback.split(';', 1)[0].replace(/\s+\([^)]*\)\s*$/, '').trim();
    if (fullName) return `${ordinal ? `${ordinal}. ` : ''}${fullName}`;
    const keywordSource = ordinal ? selector.slice(ordinal.length + 1) : selector;
    const keyword = extractMumeKeyword(keywordSource);
    return keyword ? `${ordinal ? `${ordinal}. ` : ''}${keyword}` : fallback;
};

export const getCommandActionTargetDisplayLabel = (entry: CommandActionTargetEntry): string => {
    if (entry.category === 'cat-exit') {
        if (!entry.hasDoor) return entry.label;
        const doorName = entry.doorName?.trim() || 'door';
        return entry.label.toLowerCase().includes(doorName.toLowerCase())
            ? entry.label
            : `${entry.label} (${doorName})`;
    }
    const isObjectTarget = entry.group === 'objects' || entry.group === 'inventory' || entry.group === 'worn';
    if (!isObjectTarget || entry.category === 'cat-command-option'
        || entry.id === 'observation-look-in-trigger') return entry.label;
    if (entry.gearRow) return entry.gearRow.name.split(';', 1)[0].trim();
    return getCommandObjectTargetDisplayLabel(entry.keyword, entry.label);
};

export const getCommandTargetSections = (entries: CommandActionTargetEntry[], includeSelfInRoomEntities = false) => {
    const sections: { label: string; entries: CommandActionTargetEntry[] }[] = [
        { label: 'Current Target', entries: entries.filter(entry => entry.scope === 'global') },
        { label: 'Options', entries: entries.filter(entry => entry.category === 'cat-command-option') },
        { label: 'Room Entities', entries: entries.filter(entry => (
            entry.scope === 'room' && ['players', 'npcs'].includes(entry.group) && entry.category !== 'cat-exit'
        ) || (
            includeSelfInRoomEntities && entry.scope === 'self' && entry.group !== 'inventory' && entry.group !== 'worn' && entry.category !== 'cat-command-option'
        )) },
        { label: 'Room Objects', entries: entries.filter(entry => entry.scope === 'room' && entry.group === 'objects' && entry.category !== 'cat-exit') },
        { label: 'Doors', entries: entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor === true) },
        { label: 'Exits', entries: entries.filter(entry => entry.scope === 'room' && entry.category === 'cat-exit' && entry.hasDoor !== true) },
        ...(!includeSelfInRoomEntities ? [{ label: 'You', entries: entries.filter(entry => entry.scope === 'self' && entry.group !== 'inventory' && entry.group !== 'worn' && entry.category !== 'cat-command-option') }] : []),
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
