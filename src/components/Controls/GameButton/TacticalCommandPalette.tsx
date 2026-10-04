/** @file TacticalCommandPalette.tsx — Scrollable commands beneath the swipe wheel. */

import React from 'react';
import type { ActionType, SwipeDirection } from '../../../types';
import { getSkillPresentation } from '../../../utils/skillPresentation';

// --- Types ---
export interface TacticalPaletteCommand {
    key: string;
    label: string;
    command: string;
    actionType?: ActionType;
    setId?: string;
    isLearned?: boolean;
}

export type TacticalSwapCell =
    | { kind: 'wheel'; direction: SwipeDirection | 'center' }
    | { kind: 'palette'; command: string; actionType: ActionType; setId: string };

interface Props {
    commands: TacticalPaletteCommand[];
    activeCommand: string;
    getCommandTargetGlowColor?: (command: string) => string | null;
    getCommandTextColor?: (command: string) => string | undefined;
    onPointerDown?: React.PointerEventHandler<HTMLElement>;
    onPointerMove?: React.PointerEventHandler<HTMLElement>;
    onPointerUp?: React.PointerEventHandler<HTMLElement>;
    onPointerCancel?: React.PointerEventHandler<HTMLElement>;
    swapSourceCommand?: string | null;
}

// --- UI Section ---
export const TacticalCommandPalette: React.FC<Props> = ({ commands, activeCommand, swapSourceCommand, getCommandTargetGlowColor, getCommandTextColor, ...pointerHandlers }) => {
    if (!commands.length) return null;
    return <div
        className="unified-tactical-command-palette"
        aria-label="Available commands"
        {...pointerHandlers}
    >
        <div className="unified-tactical-command-grid">
            {commands.map(item => {
                const presentation = getSkillPresentation(item.command, item.label);
                const isLearned = item.isLearned !== false;
                const commandTextColor = getCommandTextColor?.(item.command);
                const targetAvailableColor = isLearned ? getCommandTargetGlowColor?.(item.command) ?? null : null;
                const targetGlowColor = targetAvailableColor
                    ? commandTextColor || targetAvailableColor
                    : null;
                return <div
                    key={item.key}
                    className={`unified-tactical-command-item${activeCommand.trim().toLowerCase() === item.command.trim().toLowerCase() ? ' is-active' : ''}${swapSourceCommand?.trim().toLowerCase() === item.command.trim().toLowerCase() ? ' is-swap-source' : ''}${!isLearned ? ' is-unlearned' : ''}${targetGlowColor ? ' is-target-ready' : ''}`}
                    style={{ '--target-glow-color': targetGlowColor || undefined } as React.CSSProperties}
                    data-palette-command={item.command}
                    data-palette-action-type={item.actionType || 'command'}
                    data-palette-set-id={item.setId || ''}
                    data-palette-learned={isLearned}
                    aria-disabled={!isLearned}
                    aria-label={item.label}
                >
                    <span
                        className="unified-tactical-command-label"
                        style={{ color: commandTextColor }}
                    >{presentation.label}</span>
                </div>;
            })}
        </div>
    </div>;
};
