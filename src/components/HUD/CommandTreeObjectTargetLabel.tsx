/** @file CommandTreeObjectTargetLabel.tsx — Log-matched coloring for object target names. */
import React from 'react';
import type { GearRow } from '../../types';
import { classifyItemTier } from '../../utils/itemTier';
import { getInlineGlowColor } from '../../utils/inlineActionModel';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { GearItemLabel } from '../GearItemLabel';

// --- Render Section ---
export const CommandTreeObjectTargetLabel = ({label, category, location, row, showSlot = false, children}: {
    label: string;
    category?: string;
    location?: string;
    row?: GearRow;
    showSlot?: boolean;
    children?: React.ReactNode;
}) => {
    const settings = useSettingsStore();
    const resolvedCategory = category || (location === 'worn' ? 'cat-worn-object'
        : location === 'inventory' ? 'cat-inventory-object' : 'cat-room-object');
    const tier = classifyItemTier(row?.line.text || label);
    const color = getInlineGlowColor(resolvedCategory, settings.inlineCategories,
        { object: settings.objectColor }, settings.theme) || settings.objectColor;

    if (row && showSlot) return <GearItemLabel row={row} category={resolvedCategory} showSlot/>;
    return <span className={`gear-item-name${tier.tier ? ` inline-item-tier-${tier.tier}` : ''}`}
        style={tier.tier ? undefined : {color}}>{children ?? label}</span>;
};
