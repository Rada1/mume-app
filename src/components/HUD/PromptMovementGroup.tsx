/**
 * @file PromptMovementGroup.tsx
 * @description Sleek inline movement action toggles (Swim, Ride, Climb, Sneak) for the prompt bar.
 */

import React, { memo, FC } from 'react';

export interface MovementIndicatorItem {
    id: 'swim' | 'ride' | 'climb' | 'sneak';
    label: string;
    title: string;
    active: boolean;
    command: 'swim' | 'ride' | 'lead' | 'climb' | 'sneak';
}

interface PromptMovementGroupProps {
    indicators: MovementIndicatorItem[];
    animations: Record<string, { direction: 'up' | 'down'; key: number }>;
    onMovementClick: (command: 'swim' | 'ride' | 'lead' | 'climb' | 'sneak', event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const PromptMovementGroup: FC<PromptMovementGroupProps> = ({
    indicators,
    animations,
    onMovementClick
}) => {
    if (!indicators || indicators.length === 0) return null;

    return (
        <span className="prompt-group prompt-movement-group prompt-movement-indicators" aria-label="Movement toggles">
            {indicators.map((ind, index) => {
                const animation = animations[ind.id];
                return (
                    <React.Fragment key={ind.id}>
                        {index > 0 && <span className="prompt-item-sep"> </span>}
                        <button
                            key={`${ind.id}-${animation?.key || 0}`}
                            type="button"
                            className={`prompt-action-link prompt-move-link prompt-movement-indicator${ind.active ? ' is-active active' : ''}${animation ? ` movement-indicator-change-${animation.direction}` : ''}`}
                            title={ind.title}
                            aria-label={ind.title}
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
