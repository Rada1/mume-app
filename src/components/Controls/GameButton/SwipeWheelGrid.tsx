/** @file SwipeWheelGrid.tsx — The fixed 3x3 swipe grid and custom cell deletion targets. */

import React from 'react';
import type { CustomButton, CustomSwipeCellMetadata, SwipeDirection } from '../../../types';
import { getClassKeyFromSetId, getSkillPresentation } from '../../../utils/skillPresentation';
import { getButtonSwipeCommandTextColor } from '../../../utils/swipeCommandColors';
import { FOLLOWERS_COMMAND_PREFIX } from '../../../stores/useTacticalCommandPrefixStore';
import type { TacticalSwapCell } from './TacticalCommandPalette';
import { toSwipeCenterActionLabel } from './swipeCenterActionLabel';

// --- Logic Section ---
const REBIND_GRID_CELLS: Array<Array<SwipeDirection | 'center'>> = [
    ['nw', 'up', 'ne'],
    ['left', 'center', 'right'],
    ['sw', 'down', 'se']
];

const getWheelSlotCommand = (button: CustomButton, direction: SwipeDirection): string => {
    const swipeCommand = button.swipeCommands?.[direction]?.trim() || '';
    if (swipeCommand) return swipeCommand;
    if (button.longSwipeActionTypes?.[direction] === 'assign') return '';
    return button.longSwipeCommands?.[direction]?.trim() || '';
};

// --- Types ---
interface Props {
    button: CustomButton;
    displayDirection: SwipeDirection | 'center' | null;
    swapSource: TacticalSwapCell | null;
    isSwapMode: boolean;
    isDeletingCustomCell: boolean;
    isChoosingRebindSlot: boolean;
    rebindDirection: SwipeDirection | 'center' | null;
    isPinned: boolean;
    onPinnedPointerDown?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerMove?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerUp?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerCancel?: React.PointerEventHandler<HTMLElement>;
    getCommandTargetGlowColor?: (command: string) => string | null;
    getCommandLearnedState?: (command: string) => boolean | undefined;
    onDeleteCustomSwipeAction?: (command: string, direction?: SwipeDirection) => boolean;
    onDeleteComplete: () => void;
    onSelectSwapCell: (cell: TacticalSwapCell) => void;
    onSelectRebindSlot: (direction: SwipeDirection | 'center') => void;
}

// --- UI Section ---
export const SwipeWheelGrid: React.FC<Props> = ({
    button, displayDirection, swapSource, isSwapMode, isDeletingCustomCell, isChoosingRebindSlot,
    rebindDirection, isPinned, onPinnedPointerDown, onPinnedPointerMove, onPinnedPointerUp,
    onPinnedPointerCancel, getCommandTargetGlowColor, getCommandLearnedState,
    onDeleteCustomSwipeAction, onDeleteComplete, onSelectSwapCell, onSelectRebindSlot
}) => {
    const buttonClassKey = getClassKeyFromSetId(button.command) || getClassKeyFromSetId(button.setId);
    const centerCommand = button.command;
    const centerCommandTextColor = getButtonSwipeCommandTextColor(button, centerCommand);
    const centerIsLearned = getCommandLearnedState?.(centerCommand) !== false;
    const centerTargetAvailableColor = centerIsLearned ? getCommandTargetGlowColor?.(centerCommand) ?? null : null;
    const centerTargetGlowColor = centerTargetAvailableColor ? centerCommandTextColor || centerTargetAvailableColor : null;

    return <div
        className="swipe-wheel-container"
        onPointerDown={isPinned ? onPinnedPointerDown : undefined}
        onPointerMove={isPinned ? onPinnedPointerMove : undefined}
        onPointerUp={isPinned ? onPinnedPointerUp : undefined}
        onPointerCancel={isPinned ? onPinnedPointerCancel : undefined}
    >
        {(['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'] as SwipeDirection[]).map((direction, index) => {
            const command = getWheelSlotCommand(button, direction);
            const isActive = displayDirection === direction && Boolean(command);
            return <div
                key={`slice-${direction}`}
                className={`swipe-slice ${isActive ? 'active' : ''}`}
                style={{ transform: `rotate(${index * 45}deg)`, opacity: 1, pointerEvents: 'auto' }}
            ><div className="slice-separator" /></div>;
        })}
        {(['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'] as SwipeDirection[]).map(direction => {
            const command = getWheelSlotCommand(button, direction);
            const customCell: CustomSwipeCellMetadata | undefined = button.customSwipeCells?.[direction];
            const isActive = displayDirection === direction;
            const isLearned = getCommandLearnedState?.(command) !== false;
            const targetAvailableColor = isLearned ? getCommandTargetGlowColor?.(command) ?? null : null;
            const isPrefixAction = command.trim().toLowerCase() === FOLLOWERS_COMMAND_PREFIX;
            const presentation = customCell
                ? { label: customCell.label }
                : isPrefixAction ? { label: 'Command' } : getSkillPresentation(command, command, buttonClassKey);
            const commandTextColor = getButtonSwipeCommandTextColor(button, command)
                || (isPrefixAction ? '#facc15' : undefined);
            const targetGlowColor = targetAvailableColor ? commandTextColor || targetAvailableColor : null;
            const deleteCustomCell = () => {
                if (customCell && onDeleteCustomSwipeAction?.(command, direction)) onDeleteComplete();
            };
            return <span
                key={`label-${direction}`}
                className={`swipe-sq-label ${isActive ? 'active' : ''}${!isLearned ? ' is-unlearned' : ''}${isPrefixAction ? ' is-command-prefix' : ''}${swapSource?.kind === 'wheel' && swapSource.direction === direction ? ' is-swap-source' : ''}${isSwapMode ? ' is-swap-mode' : ''}${customCell ? ' is-custom-cell' : ''}${isDeletingCustomCell ? ' is-delete-mode' : ''}${command ? '' : ' is-empty'}`}
                data-dir={direction}
                data-wheel-direction={direction}
                data-wheel-command={command}
                data-wheel-custom={Boolean(customCell)}
                data-wheel-learned={isLearned}
                role={isSwapMode || (isDeletingCustomCell && customCell) ? 'button' : undefined}
                tabIndex={isSwapMode || (isDeletingCustomCell && customCell) ? 0 : undefined}
                aria-label={customCell ? `${customCell.label}, custom cell` : undefined}
                onPointerDown={event => { if (isDeletingCustomCell || isSwapMode) event.stopPropagation(); }}
                onPointerUp={event => { if (isDeletingCustomCell || isSwapMode) event.stopPropagation(); }}
                onClick={event => {
                    if (isSwapMode) {
                        event.stopPropagation();
                        onSelectSwapCell({ kind: 'wheel', direction });
                        return;
                    }
                    if (!isDeletingCustomCell) return;
                    event.stopPropagation();
                    deleteCustomCell();
                }}
                onKeyDown={event => {
                    if (isSwapMode && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        onSelectSwapCell({ kind: 'wheel', direction });
                        return;
                    }
                    if (!isDeletingCustomCell || !customCell || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    deleteCustomCell();
                }}
            >
                <span
                    className={`swipe-action-card${targetGlowColor ? ' is-target-ready' : ''}${command ? '' : ' is-empty'}`}
                    style={{
                        '--target-glow-color': targetGlowColor || undefined,
                        '--wheel-command-text-color': commandTextColor,
                    } as React.CSSProperties}
                >{command && <span className="swipe-action-text">{presentation.label}</span>}</span>
            </span>;
        })}
        <div
            className={`swipe-center ${displayDirection === 'center' ? 'active' : ''}${!centerIsLearned ? ' is-unlearned' : ''}${centerTargetGlowColor ? ' is-target-ready' : ''}${swapSource?.kind === 'wheel' && swapSource.direction === 'center' ? ' is-swap-source' : ''}${isSwapMode ? ' is-swap-mode' : ''}`}
            style={{
                '--target-glow-color': centerTargetGlowColor || undefined,
                '--wheel-command-text-color': centerCommandTextColor,
            } as React.CSSProperties}
            data-wheel-direction="center"
            data-wheel-command={centerCommand}
            data-wheel-learned={centerIsLearned}
            role={isSwapMode ? 'button' : undefined}
            tabIndex={isSwapMode ? 0 : undefined}
            aria-label={isSwapMode ? 'Select center cell for swapping' : undefined}
            onPointerDown={event => { if (isSwapMode || isDeletingCustomCell) event.stopPropagation(); }}
            onPointerUp={event => { if (isSwapMode || isDeletingCustomCell) event.stopPropagation(); }}
            onClick={event => {
                if (!isSwapMode && !isDeletingCustomCell) return;
                event.stopPropagation();
                if (isSwapMode) onSelectSwapCell({ kind: 'wheel', direction: 'center' });
            }}
            onKeyDown={event => {
                if (!isSwapMode || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onSelectSwapCell({ kind: 'wheel', direction: 'center' });
            }}
        >{centerCommand.trim() && <span className="swipe-center-label">{toSwipeCenterActionLabel(button)}</span>}</div>
        {isChoosingRebindSlot && <div className="unified-tactical-rebind-grid" aria-label="Choose wheel slot to rebind">
            {REBIND_GRID_CELLS.flat().map(direction => <button
                key={direction}
                type="button"
                className={rebindDirection === direction ? 'is-selected' : ''}
                aria-label={`Choose ${direction === 'center' ? 'center' : direction} slot`}
                onPointerDown={event => event.stopPropagation()}
                onClick={event => {
                    event.stopPropagation();
                    onSelectRebindSlot(direction);
                }}
            />)}
        </div>}
    </div>;
};
