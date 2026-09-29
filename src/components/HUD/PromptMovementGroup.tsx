/**
 * @file PromptMovementGroup.tsx
 * @description Sleek inline movement action toggles (Swim, Ride, Climb, Sneak) for the prompt bar.
 */

import React, { memo, FC } from 'react';

export interface MovementIndicatorItem {
    id: 'swim' | 'ride' | 'climb' | 'sneak' | 'hidden';
    label: string;
    title: string;
    active: boolean;
    command: 'swim' | 'ride' | 'lead' | 'climb' | 'sneak' | 'hide' | 'equipment';
}

interface PromptMovementGroupProps {
    indicators: MovementIndicatorItem[];
    animations: Record<string, { direction: 'up' | 'down'; key: number }>;
    onMovementClick: (command: 'swim' | 'ride' | 'lead' | 'climb' | 'sneak' | 'hide' | 'equipment', event: React.MouseEvent<HTMLButtonElement>) => void;
    compact?: boolean;
}

export const PromptMovementGroup: FC<PromptMovementGroupProps> = ({
    indicators,
    animations,
    onMovementClick,
    compact = false
}) => {
    if (!indicators || indicators.length === 0) return null;
    const visibleIndicators = indicators;
    if (visibleIndicators.length === 0) return null;

    return (
        <span className={`prompt-group prompt-movement-group prompt-movement-indicators${compact ? ' is-compact' : ''}`} aria-label="Movement toggles">
            {visibleIndicators.map((ind, index) => {
                const animation = animations[ind.id];
                return (
                    <React.Fragment key={ind.id}>
                        {!compact && index > 0 && <span className="prompt-item-sep"> </span>}
                        <button
                            key={`${ind.id}-${animation?.key || 0}`}
                            type="button"
                            className={`prompt-action-link prompt-move-link prompt-movement-indicator${ind.active ? ' is-active active' : ''}${animation ? ` movement-indicator-change-${animation.direction}` : ''}`}
                            title={ind.title}
                            aria-label={ind.title}
                            aria-pressed={ind.active}
                            onClick={(e) => onMovementClick(ind.command, e)}
                        >
                            {ind.label}
                        </button>
                    </React.Fragment>
                );
            })}
        </span>
    );
};

export default memo(PromptMovementGroup);
