/**
 * @file ActionCommandRow.tsx
 * @description Terminal command row with a selectable room target.
 */

import React, { FC, useState } from 'react';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';
import type { ActionItem } from './rightActionData';

type Props = {
    item: ActionItem;
    index: number;
    target: string | null;
    choices: CommandTargetSuggestion[];
    isPressed: boolean;
    onFire: () => void;
    onChoose: (target: string) => void;
    onTypeTarget: () => void;
};

// --- Render Section ---
export const ActionCommandRow: FC<Props> = ({ item, index, target, choices, isPressed, onFire, onChoose, onTypeTarget }) => {
    const [isOpen, setIsOpen] = useState(false);
    const syntax = `/${item.cmd.trim()}`;
    return (
        <div
            className={`right-panel-action-btn${item.isDanger ? ' is-danger' : ''}${item.needsTarget && target ? ' target-ready' : ''}${isPressed ? ' is-pressed' : ''}`}
            role="button"
            tabIndex={0}
            onClick={onFire}
            onKeyDown={event => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onFire();
                }
            }}
        >
            <span className="action-btn-key">{index + 1}</span>
            <span className="action-btn-label">{item.label}</span>
            {item.needsTarget ? (
                <button
                    type="button"
                    className="action-btn-target"
                    aria-label={`Choose target for ${item.label}`}
                    aria-expanded={isOpen}
                    onClick={event => { event.stopPropagation(); setIsOpen(open => !open); }}
                >
                    {syntax} <span>{target || `<${item.targetKind === 'objects' ? 'object' : item.targetKind === 'allies' ? 'ally' : 'target'}>`}</span>
                </button>
            ) : <span className="action-btn-syntax">{syntax}</span>}
            <span className="action-btn-enter" aria-hidden="true">↗</span>
            {isOpen && (
                <div className="action-target-menu" role="group" aria-label={`${item.label} targets`} onClick={event => event.stopPropagation()}>
                    {choices.map(choice => (
                        <button key={choice.key} type="button" onClick={() => { onChoose(choice.value); setIsOpen(false); }}>
                            <span>{choice.label}</span><small>{choice.value}</small>
                        </button>
                    ))}
                    <button type="button" onClick={() => { onTypeTarget(); setIsOpen(false); }}>type target…</button>
                </div>
            )}
        </div>
    );
};
