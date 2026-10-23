/** @file useCommandTargetSelection.ts — Reuses gear selection, commands, and colors for command targets. */
import { useMemo } from 'react';
import type { GearPanelSection, GearSelectionAction, GearSelectionItem } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { useGearSelection } from './useGearSelection';
import { useGearPanel } from './useGearPanel';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getGearScopeKey, getGearSelectionCommands } from '../utils/gearSelectionUtils';
import { getInlineGlowColor } from '../utils/inlineActionModel';

// --- Logic Section ---
export const useCommandTargetSelection = (entries: CommandActionTargetEntry[]) => {
    const selection = useGearSelection();
    const gear = useGearPanel();
    const settings = useSettingsStore();
    const items = useMemo(() => new Map(entries.flatMap(entry => {
        if (!entry.gearRow) return [];
        const item: GearSelectionItem = {
            id: `${entry.group}:${entry.id}`, row: entry.gearRow,
            section: entry.group === 'inventory' ? 'carried' : entry.group === 'worn' ? 'worn' : 'room'
        };
        return [[`${entry.group}:${entry.id}`, item] as const];
    })), [entries]);
    const itemFor = (entry: CommandActionTargetEntry) => items.get(`${entry.group}:${entry.id}`) || (entry.gearRow ? {
        id: `${entry.group}:${entry.id}`,
        row: entry.gearRow,
        section: entry.group === 'inventory' ? 'carried' as const : entry.group === 'worn' ? 'worn' as const : 'room' as const,
        parentNoun: entry.parentNoun,
        parentId: entry.parentId
    } : undefined);
    const levelFor = (entry: CommandActionTargetEntry, levelEntries: CommandActionTargetEntry[] = entries) => {
        const selectedItem = itemFor(entry);
        if (!selectedItem) return [];
        const scopeKey = getGearScopeKey(selectedItem.section, selectedItem.parentId);
        return levelEntries.flatMap(candidate => {
            const item = itemFor(candidate);
            return item && getGearScopeKey(item.section, item.parentId) === scopeKey ? [item] : [];
        });
    };
    const checkboxProps = (entry: CommandActionTargetEntry, levelEntries: CommandActionTargetEntry[] = entries) => {
        const item = itemFor(entry);
        return item ? {
            checked: selection.isSelected(item.id), disabled: selection.isScopeLocked(item.section, item.parentId),
            label: `Select ${item.row.name}`,
            onChange: () => selection.toggleItem(item, levelFor(entry, levelEntries))
        } : null;
    };
    const levelCheckboxProps = (group: CommandActionTargetEntry[], label: string, fallbackScope?: {
        section: GearPanelSection; parentId?: string; parentNoun?: string;
    }) => {
        const level = group.flatMap(entry => { const item = itemFor(entry); return item ? [item] : []; });
        const first = level[0];
        const section = first?.section ?? fallbackScope?.section;
        if (!section) return null;
        const parentId = first?.parentId ?? fallbackScope?.parentId;
        const parentNoun = first?.parentNoun ?? fallbackScope?.parentNoun;
        if (!first) return {
            checked: false, disabled: selection.isScopeLocked(section, parentId), label: `Select all ${label}`,
            onChange: () => undefined
        };
        const count = selection.getScopeCount(level);
        return {
            checked: count === level.length, mixed: count > 0 && count < level.length,
            disabled: selection.isScopeLocked(section, parentId), label: `Select all ${label}`,
            onChange: () => selection.toggleLevel(section, parentId, parentNoun, level)
        };
    };
    const categoryCheckboxProps = levelCheckboxProps;
    const colorFor = (category: string) => getInlineGlowColor(category, settings.inlineCategories, {
        player: settings.playerColor, ally: settings.playerColor, all: settings.playerColor,
        npc: settings.npcColor, enemy: settings.enemyColor, neutral: settings.neutralColor,
        object: settings.objectColor, room: settings.roomColor
    }, settings.theme) || undefined;
    const runAction = (action: GearSelectionAction, destination?: string) => {
        if (!selection.selection) return;
        const commands = getGearSelectionCommands(selection.selection, action, destination);
        if (!commands.length) return;
        gear.executeCommand(commands.join('; '), false, false, false, false, { fromUi: true });
        if (action === 'give') gear.executeCommand('inventory', true, true, false, true);
        gear.triggerHaptic?.(10);
        selection.clear();
    };
    const containers = [...items.values()].filter(item => item.row.isContainer && !selection.isSelected(item.id)).map(item => item.row);
    return { ...selection, itemFor, checkboxProps, categoryCheckboxProps, colorFor, runAction,
        containers, recipients: gear.recipients, levelCheckboxProps };
};

export type CommandTargetSelection = ReturnType<typeof useCommandTargetSelection>;
