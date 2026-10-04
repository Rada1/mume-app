/** @file pinnedWheelAssignments.ts — Reassigns commands between pinned wheel cells. */

import type { ActionType, CustomButton, SwipeDirection } from '../../../types';

// --- Logic Section ---
type WheelCell = SwipeDirection | 'center';

interface CellBinding {
    command: string;
    actionType?: ActionType;
    longCommand?: string;
    longActionType?: ActionType;
    setId?: string;
}

const readBinding = (button: CustomButton, cell: WheelCell): CellBinding => cell === 'center'
    ? {
        command: button.command,
        actionType: button.actionType,
        longCommand: button.longCommand,
        longActionType: button.longActionType,
        setId: button.rebindCenterSetId
    }
    : {
        command: button.swipeCommands?.[cell] || '',
        actionType: button.swipeActionTypes?.[cell],
        longCommand: button.longSwipeCommands?.[cell] || '',
        longActionType: button.longSwipeActionTypes?.[cell],
        setId: button.rebindSets?.[cell]
    };

const writeBinding = (button: CustomButton, cell: WheelCell, binding: CellBinding): CustomButton => {
    if (cell === 'center') {
        return {
            ...button,
            command: binding.command,
            actionType: binding.actionType,
            longCommand: binding.longCommand,
            longActionType: binding.longActionType,
            rebindCenterSetId: binding.setId
        };
    }

    return {
        ...button,
        swipeCommands: { ...(button.swipeCommands || {}), [cell]: binding.command },
        longSwipeCommands: { ...(button.longSwipeCommands || {}), [cell]: binding.longCommand || '' },
        swipeActionTypes: { ...(button.swipeActionTypes || {}), [cell]: binding.actionType },
        longSwipeActionTypes: { ...(button.longSwipeActionTypes || {}), [cell]: binding.longActionType },
        rebindSets: { ...(button.rebindSets || {}), [cell]: binding.setId || '' }
    };
};

const WHEEL_CELLS: WheelCell[] = ['center', 'up', 'ne', 'right', 'se', 'down', 'sw', 'left', 'nw'];
const normalizeCommand = (command: string): string => command.trim().toLowerCase().replace(/\s+/g, ' ');

export const normalizePinnedWheelCommands = (button: CustomButton): CustomButton => {
    const seen = new Set<string>();
    return WHEEL_CELLS.reduce((current, cell) => {
        const binding = readBinding(current, cell);
        const command = normalizeCommand(binding.command || '');
        const longCommand = normalizeCommand(binding.longCommand || '');
        let changed = false;

        if (command && seen.has(command)) {
            binding.command = '';
            binding.actionType = undefined;
            changed = true;
        } else if (command) {
            seen.add(command);
        }

        if (longCommand && seen.has(longCommand)) {
            binding.longCommand = '';
            binding.longActionType = undefined;
            changed = true;
        } else if (longCommand) {
            seen.add(longCommand);
        }

        return changed ? writeBinding(current, cell, binding) : current;
    }, button);
};

// --- Public API ---
export const swapPinnedWheelCells = (button: CustomButton, source: WheelCell, destination: WheelCell): CustomButton => {
    if (source === destination) return button;
    const sourceBinding = readBinding(button, source);
    const destinationBinding = readBinding(button, destination);
    return normalizePinnedWheelCommands(writeBinding(writeBinding(button, source, destinationBinding), destination, sourceBinding));
};

export const assignPinnedWheelCell = (
    button: CustomButton,
    destination: WheelCell,
    command: string,
    actionType: ActionType | undefined,
    setId?: string
): CustomButton => {
    const normalizedCommand = normalizeCommand(command);
    const source = WHEEL_CELLS.find(cell => {
        if (cell === destination) return false;
        const binding = readBinding(button, cell);
        return normalizeCommand(binding.command || '') === normalizedCommand
            || normalizeCommand(binding.longCommand || '') === normalizedCommand;
    });

    if (source) {
        const sourceBinding = readBinding(button, source);
        const destinationBinding = readBinding(button, destination);
        return normalizePinnedWheelCommands(writeBinding(
            writeBinding(button, source, destinationBinding),
            destination,
            sourceBinding
        ));
    }

    return normalizePinnedWheelCommands(writeBinding(button, destination, { command, actionType, setId }));
};
