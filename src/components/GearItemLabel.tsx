/** @file GearItemLabel.tsx — Shared gear slot, article, item tier, and condition presentation. */
import React from 'react';
import type { GearItemLabelProps } from '../types';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getInlineGlowColor } from '../utils/inlineActionModel';
import { classifyItemTier } from '../utils/itemTier';
import './GearPanel.css';

// --- Render Section ---
export const GearItemLabel: React.FC<GearItemLabelProps> = ({ row, category, showSlot }) => {
    const settings = useSettingsStore();
    const color = getInlineGlowColor(category, settings.inlineCategories,
        { object: settings.objectColor }, settings.theme) || settings.objectColor;
    const tier = classifyItemTier(row.line.text);
    const conditionLabel = tier.stateLabel || row.condition.replace(/[()]/g, '').trim();
    return <>
        {showSlot && <span className="gear-slot">{row.slotLabel}</span>}
        <span className="gear-item-text">
            {row.article && <span className="gear-article">{row.article} </span>}
            <span className={`gear-item-name${tier.tier ? ` inline-item-tier-${tier.tier}` : ''}`}
                style={tier.tier ? undefined : { color }}>{row.name}</span>
            {row.condition && <span
                className={`gear-condition-indicator${tier.state ? ` item-state-${tier.state}` : ' is-unknown'}`}
                role="img" aria-label={`Condition: ${conditionLabel}`} title={`Condition: ${conditionLabel}`} />}
        </span>
    </>;
};
