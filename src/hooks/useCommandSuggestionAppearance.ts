/** @file useCommandSuggestionAppearance.ts — Shared target category colors for command suggestions. */
import type { CommandTargetSuggestion } from '../objects/targetSuggestionTypes';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getCategoryIdForKindLocation, getInlineGlowColor } from '../utils/inlineActionModel';
import { getEntityHighlightKind } from '../utils/inlineCategoryAxes';

// --- Target Appearance ---
export const useCommandSuggestionAppearance = () => {
    const settings = useSettingsStore();
    return (entry: CommandTargetSuggestion) => {
        const location = entry.objectLocation || entry.meta;
        const kind = entry.objectId || ['inventory', 'worn', 'shop-item'].includes(entry.meta)
            ? 'object' : entry.meta === 'who' ? 'ally' : entry.meta;
        const category = entry.category || getCategoryIdForKindLocation(kind, location);
        const color = entry.meta === 'self' ? '#fff' : getInlineGlowColor(category, settings.inlineCategories, {
            player: settings.playerColor, ally: settings.playerColor, all: settings.playerColor,
            npc: settings.npcColor, enemy: settings.enemyColor, neutral: settings.neutralColor,
            object: settings.objectColor, room: settings.roomColor
        }, settings.theme) || undefined;
        return { color, kind: getEntityHighlightKind(category) };
    };
};
