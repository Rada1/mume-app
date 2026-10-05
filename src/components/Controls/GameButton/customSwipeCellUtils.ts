/** @file customSwipeCellUtils.ts — Creates and removes user-defined swipe wheel cells. */

import type { CustomButton, CustomSwipeCellMetadata, SwipeDirection } from '../../../types';

// --- Logic Section ---
export const CUSTOM_CELL_DIRECTION_PRIORITY: SwipeDirection[] = ['up', 'right', 'down', 'left', 'nw', 'ne', 'sw', 'se'];

export const getCustomCellRestoreMetadata = (
    button: CustomButton,
    direction: SwipeDirection,
    label: string
): CustomSwipeCellMetadata => {
    const command = button.swipeCommands?.[direction] || button.longSwipeCommands?.[direction] || '';
    return {
        label,
        ...(command ? { restoreCommand: button.swipeCommands?.[direction] || '' } : {}),
        ...(button.swipeActionTypes?.[direction] ? { restoreActionType: button.swipeActionTypes[direction] } : {}),
        ...(button.longSwipeCommands?.[direction] ? { restoreLongCommand: button.longSwipeCommands[direction] } : {}),
        ...(button.longSwipeActionTypes?.[direction] ? { restoreLongActionType: button.longSwipeActionTypes[direction] } : {}),
        ...(button.rebindSets?.[direction] ? { restoreSetId: button.rebindSets[direction] } : {}),
    };
};

export const assignCustomSwipeCell = (
    button: CustomButton,
    direction: SwipeDirection,
    command: string,
    metadata: CustomSwipeCellMetadata
): CustomButton => {
    const longSwipeCommands = { ...(button.longSwipeCommands || {}) };
    const longSwipeActionTypes = { ...(button.longSwipeActionTypes || {}) };
    const rebindSets = { ...(button.rebindSets || {}) };
    delete longSwipeCommands[direction];
    delete longSwipeActionTypes[direction];
    delete rebindSets[direction];
    return {
        ...button,
        swipeCommands: { ...(button.swipeCommands || {}), [direction]: command },
        swipeActionTypes: { ...(button.swipeActionTypes || {}), [direction]: 'command' },
        longSwipeCommands,
        longSwipeActionTypes,
        rebindSets,
        customSwipeCells: { ...(button.customSwipeCells || {}), [direction]: metadata },
    };
};

export const removeCustomSwipeCell = (button: CustomButton, direction: SwipeDirection): CustomButton => {
    const metadata = button.customSwipeCells?.[direction];
    if (!metadata) return button;

    const swipeCommands = { ...(button.swipeCommands || {}) };
    const swipeActionTypes = { ...(button.swipeActionTypes || {}) };
    const longSwipeCommands = { ...(button.longSwipeCommands || {}) };
    const longSwipeActionTypes = { ...(button.longSwipeActionTypes || {}) };
    const rebindSets = { ...(button.rebindSets || {}) };
    if (metadata.restoreCommand) swipeCommands[direction] = metadata.restoreCommand;
    else delete swipeCommands[direction];
    if (metadata.restoreActionType) swipeActionTypes[direction] = metadata.restoreActionType;
    else delete swipeActionTypes[direction];
    if (metadata.restoreLongCommand) longSwipeCommands[direction] = metadata.restoreLongCommand;
    else delete longSwipeCommands[direction];
    if (metadata.restoreLongActionType) longSwipeActionTypes[direction] = metadata.restoreLongActionType;
    else delete longSwipeActionTypes[direction];
    if (metadata.restoreSetId) rebindSets[direction] = metadata.restoreSetId;
    else delete rebindSets[direction];

    const customSwipeCells = { ...(button.customSwipeCells || {}) };
    delete customSwipeCells[direction];
    return { ...button, swipeCommands, swipeActionTypes, longSwipeCommands, longSwipeActionTypes, rebindSets, customSwipeCells };
};
