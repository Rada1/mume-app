/** @file TacticalCommandPalette.tsx — Scrollable commands beneath the swipe wheel. */

import React from 'react';
import type { ActionType, SwipeDirection } from '../../../types';
import { SkillClassIcon } from '../../HUD/SkillClassIcon';
import { getClassKeyFromSetId, getSkillPresentation } from '../../../utils/skillPresentation';

// --- Types ---
export interface TacticalPaletteCommand {
    key: string;
    label: string;
    command: string;
    actionType?: ActionType;
    setId?: string;
}

export type TacticalSwapCell =
    | { kind: 'wheel'; direction: SwipeDirection | 'center' }
    | { kind: 'palette'; command: string; actionType: ActionType; setId: string };

interface Props {
    commands: TacticalPaletteCommand[];
    activeCommand: string;
    iconNode?: React.ReactNode;
    onPointerDown?: React.PointerEventHandler<HTMLElement>;
    onPointerMove?: React.PointerEventHandler<HTMLElement>;
    onPointerUp?: React.PointerEventHandler<HTMLElement>;
    onPointerCancel?: React.PointerEventHandler<HTMLElement>;
    swapSourceCommand?: string | null;
}

// --- UI Section ---
export const TacticalCommandPalette: React.FC<Props> = ({ commands, activeCommand, iconNode, swapSourceCommand, ...pointerHandlers }) => {
    if (!commands.length) return null;
    return <div
        className="unified-tactical-command-palette"
        aria-label="Available commands"
        {...pointerHandlers}
    >
        <div className="unified-tactical-command-grid">
            {commands.map(item => {
                const presentation = getSkillPresentation(item.command, item.label, getClassKeyFromSetId(item.setId));
                return <div
                    key={item.key}
                    className={`unified-tactical-command-item${activeCommand.trim().toLowerCase() === item.command.trim().toLowerCase() ? ' is-active' : ''}${swapSourceCommand?.trim().toLowerCase() === item.command.trim().toLowerCase() ? ' is-swap-source' : ''}`}
                    data-palette-command={item.command}
                    data-palette-action-type={item.actionType || 'command'}
                    data-palette-set-id={item.setId || ''}
                    aria-label={item.label}
                >
                    {presentation.classKey
                        ? <SkillClassIcon classKey={presentation.classKey} size={18} />
                        : iconNode && <span className="unified-tactical-command-icon" aria-hidden="true">{iconNode}</span>}
                    <span className="unified-tactical-command-label">{presentation.label}</span>
                </div>;
            })}
        </div>
    </div>;
};
