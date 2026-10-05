/** @file TacticalCommandPalette.tsx — Scrollable commands beneath the swipe wheel. */

import React from 'react';
import type { ActionType, SwipeDirection } from '../../../types';
import { getSkillPresentation } from '../../../utils/skillPresentation';
import { FOLLOWERS_COMMAND_PREFIX } from '../../../stores/useTacticalCommandPrefixStore';

// --- Types ---
export interface TacticalPaletteCommand {
    key: string;
    label: string;
    command: string;
    actionType?: ActionType;
    setId?: string;
    isLearned?: boolean;
    isCustomCell?: boolean;
}

export type TacticalSwapCell =
    | { kind: 'wheel'; direction: SwipeDirection | 'center' }
    | { kind: 'palette'; command: string; actionType: ActionType; setId: string };

interface Props {
    commands: TacticalPaletteCommand[];
    activeCommand: string;
    getCommandTargetGlowColor?: (command: string) => string | null;
    getCommandTextColor?: (command: string) => string | undefined;
    isDeletingCustomCell?: boolean;
    onDeleteCustomCell?: (command: string) => void;
    isSwapMode?: boolean;
    onSelectSwapCell?: (cell: TacticalSwapCell) => void;
    onPointerDown?: React.PointerEventHandler<HTMLElement>;
    onPointerMove?: React.PointerEventHandler<HTMLElement>;
    onPointerUp?: React.PointerEventHandler<HTMLElement>;
    onPointerCancel?: React.PointerEventHandler<HTMLElement>;
    swapSourceCommand?: string | null;
}

// --- UI Section ---
export const TacticalCommandPalette: React.FC<Props> = ({ commands, activeCommand, swapSourceCommand, getCommandTargetGlowColor, getCommandTextColor, isDeletingCustomCell = false, onDeleteCustomCell, isSwapMode = false, onSelectSwapCell, ...pointerHandlers }) => {
    if (!commands.length) return null;
    return <div
        className="unified-tactical-command-palette"
        aria-label="Available commands"
        {...pointerHandlers}
    >
        <div className="unified-tactical-command-grid">
            {commands.map(item => {
                const presentation = item.isCustomCell || item.command.trim().toLowerCase() === FOLLOWERS_COMMAND_PREFIX
                    ? { label: item.label }
                    : getSkillPresentation(item.command, item.label);
                const isLearned = item.isLearned !== false;
                const commandTextColor = getCommandTextColor?.(item.command);
                const targetAvailableColor = isLearned ? getCommandTargetGlowColor?.(item.command) ?? null : null;
                const targetGlowColor = targetAvailableColor
                    ? commandTextColor || targetAvailableColor
                    : null;
                return <div
                    key={item.key}
                    className={`unified-tactical-command-item${activeCommand.trim().toLowerCase() === item.command.trim().toLowerCase() ? ' is-active' : ''}${swapSourceCommand?.trim().toLowerCase() === item.command.trim().toLowerCase() ? ' is-swap-source' : ''}${isSwapMode ? ' is-swap-mode' : ''}${!isLearned ? ' is-unlearned' : ''}${targetGlowColor ? ' is-target-ready' : ''}${item.isCustomCell ? ' is-custom-cell' : ''}${isDeletingCustomCell ? ' is-delete-mode' : ''}`}
                    style={{ '--target-glow-color': targetGlowColor || undefined } as React.CSSProperties}
                    data-palette-command={item.command}
                    data-palette-action-type={item.actionType || 'command'}
                    data-palette-set-id={item.setId || ''}
                    data-palette-learned={isLearned}
                    aria-disabled={!isLearned}
                    aria-label={item.label}
                    role={isSwapMode || (isDeletingCustomCell && item.isCustomCell) ? 'button' : undefined}
                    tabIndex={isSwapMode || (isDeletingCustomCell && item.isCustomCell) ? 0 : undefined}
                    onPointerDown={event => {
                        if (isDeletingCustomCell || isSwapMode) event.stopPropagation();
                    }}
                    onPointerUp={event => {
                        if (isDeletingCustomCell || isSwapMode) event.stopPropagation();
                    }}
                    onClick={event => {
                        if (isSwapMode) {
                            event.stopPropagation();
                            onSelectSwapCell?.({
                                kind: 'palette',
                                command: item.command,
                                actionType: item.actionType || 'command',
                                setId: item.setId || '',
                            });
                            return;
                        }
                        if (!isDeletingCustomCell) return;
                        event.stopPropagation();
                        if (item.isCustomCell) onDeleteCustomCell?.(item.command);
                    }}
                    onKeyDown={event => {
                        if (isSwapMode && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            onSelectSwapCell?.({
                                kind: 'palette',
                                command: item.command,
                                actionType: item.actionType || 'command',
                                setId: item.setId || '',
                            });
                            return;
                        }
                        if (!isDeletingCustomCell || !item.isCustomCell || (event.key !== 'Enter' && event.key !== ' ')) return;
                        event.preventDefault();
                        onDeleteCustomCell?.(item.command);
                    }}
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
