/**
 * @file PromptStanceGroup.tsx
 * @description Sleek inline stance toggles (Position, Alertness, Speed, Mood) for prompt bar.
 */

import React, { memo, FC } from 'react';

export interface StanceItem {
    id: 'position' | 'alert' | 'speed' | 'mood';
    tag: string;
    code: string;
    text: string;
    title: string;
    isActive: boolean;
    animKey?: number;
}

interface PromptStanceGroupProps {
    items: StanceItem[];
    onItemClick: (id: 'position' | 'alert' | 'speed' | 'mood', event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const PromptStanceGroup: FC<PromptStanceGroupProps> = ({ items, onItemClick }) => {
    if (!items || items.length === 0) return null;

    return (
        <span className="prompt-group prompt-stance-group prompt-mode-indicators" aria-label="Stance and disposition settings">
            {items.map((item, index) => (
                <React.Fragment key={item.id}>
                    {index > 0 && <span className="prompt-item-sep"> </span>}
                    <button
                        key={`${item.id}-${item.animKey || 0}`}
                        type="button"
                        className={`prompt-action-link prompt-stance-link prompt-mode-indicator${item.isActive ? ' is-active active' : ''}${item.animKey ? ' mode-indicator-change' : ''}`}
                        title={item.title}
                        aria-label={item.title}
                        onClick={(e) => onItemClick(item.id, e)}
                    >
                        <span className="prompt-stat-label">{item.tag.charAt(0)}</span>
                        <span className="prompt-stat-value">{item.tag.slice(1)}</span>
                    </button>
                </React.Fragment>
            ))}
        </span>
    );
};

export default memo(PromptStanceGroup);
