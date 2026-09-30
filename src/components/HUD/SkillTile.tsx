/**
 * @file SkillTile.tsx
 * @description Skill and spell tile button for the RightActionPanel deck.
 */

import React, { FC, useRef, useState } from 'react';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';

export interface SkillTileItem {
    name: string;
    syntax: string;
    mana: number | null;
    isPassive?: boolean;
    isKnown: boolean;
    pct: number | null;
    hotkey?: number | null;
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
    const practiceTouchRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
    const skipPracticeClickRef = useRef<number | null>(null);
    const metaLabel = item.isPassive ? 'Learned' : item.isKnown ? (isSpellClass ? null : 'Learned') : '--';
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
            <span className="action-btn-key" aria-hidden="true">{item.hotkey ?? ''}</span>
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
                {item.mana !== null && <span className="skill-tile-mana">{item.mana} Mana</span>}
                {metaLabel && <span>{metaLabel}</span>}
                {item.pct !== null && <span className="skill-tile-pct">{item.pct}%</span>}
            </div>
            {practice && <button type="button" className="skill-tile-practice" disabled={!practice.enabled}
                aria-label={`${practice.label} ${item.name}`}
                onPointerDown={event => {
                    event.stopPropagation();
                    if (event.pointerType === 'touch' && practice.enabled) {
                        practiceTouchRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
                    }
                }}
                onPointerMove={event => {
                    const press = practiceTouchRef.current;
                    if (press?.pointerId === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
                        press.moved = true;
                    }
                }}
                onPointerUp={event => {
                    event.stopPropagation();
                    const press = practiceTouchRef.current;
                    practiceTouchRef.current = null;
                    if (event.pointerType === 'touch' && press?.pointerId === event.pointerId && !press.moved && practice.enabled) {
                        skipPracticeClickRef.current = Date.now() + 700;
                        practice.onClick();
                    }
                }}
                onPointerCancel={event => {
                    event.stopPropagation();
                    if (practiceTouchRef.current?.pointerId === event.pointerId) practiceTouchRef.current = null;
                }}
                onClick={event => {
                    event.stopPropagation();
                    if (skipPracticeClickRef.current !== null && Date.now() <= skipPracticeClickRef.current) {
                        skipPracticeClickRef.current = null;
                        return;
                    }
                    skipPracticeClickRef.current = null;
                    practice.onClick();
                }}>
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
