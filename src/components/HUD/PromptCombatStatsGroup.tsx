/**
 * @file PromptCombatStatsGroup.tsx
 * @description Sleek inline combat ratings indicators (OB, DB, PB, ARM, SA, SS) for prompt bar.
 */

import React, { memo, FC } from 'react';
import { formatEquipmentSpellStat } from '../../utils/equipmentSpellStatsUtils';

export interface CombatStatItem {
    label: string;
    name: string;
    description: string;
    value?: number;
    equipmentOnly?: boolean;
}

interface PromptCombatStatsGroupProps {
    stats: CombatStatItem[];
    animations: Record<string, { direction: 'up' | 'down'; key: number }>;
}

export const PromptCombatStatsGroup: FC<PromptCombatStatsGroupProps> = ({ stats, animations }) => {
    if (!stats || stats.length === 0) return null;

    return (
        <span className="prompt-group prompt-combat-group prompt-combat-stat-indicators" aria-label="Combat ratings">
            {stats.map((stat, index) => {
                const animation = animations[stat.label];
                return (
                    <React.Fragment key={stat.label}>
                        {index > 0 && <span className="prompt-item-sep"> </span>}
                        <span
                            className="prompt-stat-entry prompt-stat-item"
                            title={`${stat.name}: ${stat.description}`}
                        >
                            <span className="prompt-label-prefix prompt-stat-label">{stat.label}</span>
                            <span
                                key={animation?.key || 0}
                                className={`prompt-val-text prompt-stat-value${animation ? ` combat-stat-change-${animation.direction}` : ''}`}
                            >
                                {stat.equipmentOnly ? formatEquipmentSpellStat(stat.value) : `${stat.value}%`}
                            </span>
                        </span>
                    </React.Fragment>
                );
            })}
        </span>
    );
};

export default memo(PromptCombatStatsGroup);
