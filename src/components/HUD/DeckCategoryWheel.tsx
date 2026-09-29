/**
 * @file DeckCategoryWheel.tsx
 * @description Renders deck categories through the shared tactical button controls.
 */

// --- Logic Section ---
import React, { useState } from 'react';
import type { CustomButton, SwipeDirection } from '../../types';
import { GameButton, type GameButtonProps } from '../Controls/GameButton/GameButton';
import type { WheelReplacementMode } from '../Controls/GameButton/TacticalCommandPanel';
import type { TacticalPaletteCommand } from '../Controls/GameButton/TacticalCommandPalette';
import type { DeckItem } from './useDeckTargeting';

const DIRECTIONS: SwipeDirection[] = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];

interface DeckCategoryWheelProps {
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    button: CustomButton;
    gameButtonProps: Omit<GameButtonProps, 'button' | 'className' | 'useDefaultPositioning' | 'iconNode' | 'ariaLabel' | 'onSwapWheel'>;
    availableActions: DeckItem[];
    onSwapCells: (sourceIndex: number, destinationIndex: number) => boolean;
    onAssignAction: (directionIndex: number, action: DeckItem) => boolean;
}

// --- UI Section ---
export const DeckCategoryWheel: React.FC<DeckCategoryWheelProps> = ({
    label, icon: Icon, button, gameButtonProps, availableActions, onSwapCells, onAssignAction
}) => {
    const [swapPickerDirection, setSwapPickerDirection] = useState<number | null>(null);
    const [swapPickerSourceCommand, setSwapPickerSourceCommand] = useState('');
    const wheelCommands = new Set([
        button.command,
        ...Object.values(button.swipeCommands || {}),
        ...Object.values(button.longSwipeCommands || {})
    ].map(command => command.trim().toLowerCase()).filter(Boolean));
    const extendedActions = availableActions.filter(action => !wheelCommands.has(action.cmd.trim().toLowerCase()));

    const openSwapPicker = (direction: SwipeDirection | 'center' | null) => {
        if (swapPickerDirection === null) {
            const sourceCommand = direction === 'center' || !direction
                ? button.command
                : button.swipeCommands?.[direction] || button.longSwipeCommands?.[direction] || button.command;
            setSwapPickerSourceCommand(sourceCommand.trim().toLowerCase());
            setSwapPickerDirection(-1);
            return;
        }
        const directionIndex = direction && direction !== 'center' ? DIRECTIONS.indexOf(direction) : -1;
        setSwapPickerDirection(directionIndex < 0 ? 8 : directionIndex);
    };
    const moveWheelCommand = (source: SwipeDirection | 'center', destination: SwipeDirection | 'center') => {
        const sourceIndex = source === 'center' ? 8 : DIRECTIONS.indexOf(source);
        const destinationIndex = destination === 'center' ? 8 : DIRECTIONS.indexOf(destination);
        if (sourceIndex < 0 || destinationIndex < 0) return false;
        return onSwapCells(sourceIndex, destinationIndex);
    };
    const assignWheelCommand = (command: string, _actionType: import('../../types').ActionType, destination: SwipeDirection | 'center') => {
        const action = availableActions.find(candidate => candidate.cmd.trim().toLowerCase() === command.trim().toLowerCase());
        const destinationIndex = destination === 'center' ? 8 : DIRECTIONS.indexOf(destination);
        if (action && destinationIndex >= 0) onAssignAction(destinationIndex, action);
    };

    const wheelReplacementMode: WheelReplacementMode | null = swapPickerDirection === null ? null : {
        title: swapPickerDirection === -1
            ? 'SELECT A WHEEL SLOT'
            : `CHOOSE ${swapPickerDirection === 8 ? 'CENTER' : DIRECTIONS[swapPickerDirection].toUpperCase()} COMMAND`,
        awaitingSlotSelection: swapPickerDirection === -1,
        selectedDirection: swapPickerDirection === -1
            ? null
            : swapPickerDirection === 8 ? 'center' : DIRECTIONS[swapPickerDirection],
        executeOnSelect: true,
        suggestions: availableActions.filter(action => action.cmd.trim().toLowerCase() !== swapPickerSourceCommand).map((action, index) => ({
            key: `${action.label}:${action.cmd}:${index}`,
            label: action.label,
            value: action.cmd,
            meta: 'command'
        })),
        onSelect: value => {
            const action = availableActions.find(candidate => candidate.cmd === value
                && candidate.cmd.trim().toLowerCase() !== swapPickerSourceCommand);
            if (action) {
                onAssignAction(swapPickerDirection, action);
                setSwapPickerSourceCommand('');
                setSwapPickerDirection(null);
            }
            return action?.cmd;
        },
        onCancel: () => {
            setSwapPickerSourceCommand('');
            setSwapPickerDirection(null);
        }
    };

    return <div className="deck-category-control">
        <GameButton
            {...gameButtonProps}
            button={button}
            className="deck-tab deck-category-button"
            useDefaultPositioning={false}
            iconNode={<Icon size={17} strokeWidth={2.2} />}
            ariaLabel={`${label} actions`}
            onSwapWheel={openSwapPicker}
            onMovePinnedCells={moveWheelCommand}
            onAssignPinnedCommand={assignWheelCommand}
            commandPalette={extendedActions.map((action, index): TacticalPaletteCommand => ({
                key: `${action.label}:${action.cmd}:${index}`,
                label: action.label,
                command: action.cmd,
                actionType: 'command'
            }))}
            wheelReplacementMode={wheelReplacementMode}
            openDecisionPanelOnHold
        />
    </div>;
};
