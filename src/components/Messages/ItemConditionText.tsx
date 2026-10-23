/** @file ItemConditionText.tsx — Renders the shared equipment condition colors in log text. */
import React from 'react';
import type { ItemConditionTextProps } from '../../types';
import { getItemConditionSegments } from '../../hooks/itemConditionSegments';

// --- Render Section ---
export const ItemConditionText: React.FC<ItemConditionTextProps> = props => <>
    {getItemConditionSegments(props).map((segment, index) => segment.state
        ? <span key={index} className={`inline-item-condition item-state-${segment.state}`}>{segment.text}</span>
        : <React.Fragment key={index}>{segment.text}</React.Fragment>)}
</>;
