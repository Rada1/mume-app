/**
 * @file popoverPanelUtils.ts
 * @description Shared display rules for persistent desktop inline-action panels.
 */

import type { PopoverState } from '../types';

// --- Logic Section ---

export const isDesktopTargetWorkspaceRequest = (state: PopoverState | null): state is PopoverState => Boolean(
 state?.entityId && !state.commandPanelCapture && !state.isRoomDescription
 && !['command-panel-room', 'command-panel-self'].includes(state.entityId)
 && (!state.type || state.type === 'menu') && state.menuDisplay !== 'dial'
);

export const isDesktopInlineActionPanel = (
    popoverState: PopoverState | null,
    viewportWidth: number
): boolean => Boolean(
    popoverState?.entityId && !popoverState.commandPanelCapture &&
    (!popoverState.type || popoverState.type === 'menu') &&
    viewportWidth >= 1025
);

export const isInlineActionPopover = (popoverState: PopoverState | null): boolean => Boolean(
    popoverState?.entityId && !popoverState.commandPanelCapture &&
    popoverState.sourceRect &&
    (!popoverState.type || popoverState.type === 'menu') &&
    popoverState.menuDisplay !== 'dial'
);

export const shouldKeepInlineActionPopoverOpen = (
    popoverState: PopoverState | null,
    viewportWidth: number
): boolean => isDesktopInlineActionPanel(popoverState, viewportWidth) || isInlineActionPopover(popoverState);
