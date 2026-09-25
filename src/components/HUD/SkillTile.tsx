/**
 * @file SkillTile.tsx
 * @description Skill and spell tile button for the RightActionPanel deck.
 */

import React, { FC, useState } from 'react';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';

export interface SkillTileItem {
    name: string;
    syntax: string;
    mana: number | null;
    isPassive?: boolean;
    isKnown: boolean;
    pct: number | null;
}

interface SkillTileProps {
    item: SkillTileItem;
    isSpellClass?: boolean;
    isPressed?: boolean;
    onClick: () => void;
    target?: string | null;
    targetChoices?: CommandTargetSuggestion[];
    onChooseTarget?: (target: string) => void;
    onTypeTarget?: () => void;
    practice?: { enabled: boolean; label: string; onClick: () => void };
}

export const SkillTile: FC<SkillTileProps> = ({ item, isSpellClass, isPressed, onClick, target, targetChoices, onChooseTarget, onTypeTarget, practice }) => {
    // --- Logic Section ---
    const [isOpen, setIsOpen] = useState(false);
    const metaLabel = item.isPassive ? 'Passive' : item.isKnown ? (isSpellClass ? 'Spell' : 'Learned') : '--';
    const hasTarget = Boolean(onChooseTarget && onTypeTarget && item.syntax.includes('<target>'));
    const syntax = hasTarget ? item.syntax.replace('<target>', '') : item.syntax;
    // --- Render Section ---
    return (
        <div
            className={`right-panel-skill-tile${!item.isKnown ? ' is-dim' : ''}${item.isPassive ? ' is-passive' : ''}${isPressed ? ' is-pressed' : ''}`}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={event => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault(); onClick();
                }
            }}
            title={`${item.name} · ${item.syntax}`}
        >
            <div className="skill-tile-main">
                <span className="skill-tile-name">{item.name}</span>
                <span className="skill-tile-syntax">{syntax}
                    {hasTarget && <button type="button" className="skill-tile-target" aria-label={`Choose target for ${item.name}`}
                        aria-expanded={isOpen} onClick={event => { event.stopPropagation(); setIsOpen(open => !open); }}>
                        {target || '<target>'}
                    </button>}
                </span>
            </div>
            <div className="skill-tile-meta">
                {item.mana !== null && <span className="skill-tile-mana">{item.mana}m</span>}
                <span className={isSpellClass ? 'skill-tile-spell-meta' : undefined}>{metaLabel}</span>
                {item.pct !== null && <span className="skill-tile-pct">{item.pct}%</span>}
            </div>
            {practice && <button type="button" className="skill-tile-practice" disabled={!practice.enabled}
                aria-label={`${practice.label} ${item.name}`}
                onClick={event => { event.stopPropagation(); practice.onClick(); }}>
                {practice.label}
            </button>}
            {isOpen && hasTarget && <div className="action-target-menu" role="group" aria-label={`${item.name} targets`}
                onClick={event => event.stopPropagation()}>
                {targetChoices?.map(choice => <button key={choice.key} type="button"
                    onClick={() => { onChooseTarget?.(choice.value); setIsOpen(false); }}>
                    <span>{choice.label}</span><small>{choice.value}</small>
                </button>)}
                <button type="button" onClick={() => { onTypeTarget?.(); setIsOpen(false); }}>type target…</button>
            </div>}
        </div>
    );
};

export default SkillTile;
