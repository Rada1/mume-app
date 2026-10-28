/** @file useWorkspaceActionCategories.ts — One selected command category for the shared target popover. */
import { useMemo, useState } from 'react';
import type { useCommandGearQuickMenu } from './useCommandGearQuickMenu';
import { getCommandMenuSectionKey } from '../stores/useCommandMenuSectionsStore';
import { usePanelDataStore } from '../stores/usePanelDataStore';

const CLASS_LABELS = ['Mage', 'Warrior', 'Ranger', 'Cleric', 'Thief'];
const ROOM_ENTITY_CATEGORIES = new Set(['cat-ally', 'cat-enemy', 'cat-neutral', 'cat-npc', 'cat-mount', 'cat-room-object', 'cat-object']);

// --- Category visibility and stable command ordering ---
export const useWorkspaceActionCategories = (
    groups: ReturnType<typeof useCommandGearQuickMenu>['actionSections'], targetLabel: string, targetCategory: string
) => {
    const [selectedKey, select] = useState<string | null>(null);
    const skillsReady = usePanelDataStore(state => state.status.skills === 'ready');
    const categories = useMemo(() => {
      const available = groups.flatMap(group => group.sections.filter(section =>
        !['social actions', 'messages'].includes(section.label.toLowerCase()) || ['cat-ally', 'cat-ally-remote'].includes(targetCategory)
    ).flatMap(section => {
        const buttons = section.buttons.filter(button => !/^flee(?:\s|$)/i.test(button.command.trim()));
        if (!buttons.length) return [];
        const key = CLASS_LABELS.includes(section.label) ? `workspace-class-${section.label}`
            : getCommandMenuSectionKey(`Actions for ${targetLabel}`, `${group.label} ${section.label}`);
        const shortLabels: Record<string, string> = {
            'combat action': 'Combat', 'combat actions': 'Combat', observation: 'Observe', 'social actions': 'Social'
        };
        return [{ key, label: shortLabels[section.label.toLowerCase()] || section.label,
            fullLabel: section.label, buttons }];
      }));
      if (!ROOM_ENTITY_CATEGORIES.has(targetCategory)) return available;
      const classes = CLASS_LABELS.map(label => available.find(category => category.label === label)
        || {key: `workspace-class-${label}`, label, fullLabel: label, buttons: []});
      const other = available.filter(category => !CLASS_LABELS.includes(category.label));
      const combatIndex = other.findIndex(category => category.label === 'Combat');
      other.splice(combatIndex + 1, 0, ...classes);
      return other;
    }, [groups, targetLabel, targetCategory]);
    const selected = categories.find(category => category.key === selectedKey) || categories[0];
    const commands = useMemo(() => {
        const seen = new Set<string>();
        return (selected?.buttons || [])
            .filter(button => {
                if (seen.has(button.id)) return false;
                seen.add(button.id);
                return true;
            });
    }, [selected]);
    const isClassCategory = CLASS_LABELS.includes(selected?.label || '');
    return { categories, commands, selectedKey: selected?.key, select, isClassCategory,
        needsSkillSync: isClassCategory && !skillsReady };
};
