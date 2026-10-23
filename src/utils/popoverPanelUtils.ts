/**
 * @file popoverPanelUtils.ts
 * @description Shared display rules for persistent desktop inline-action panels.
 */

import type { PopoverState } from '../types';

// --- Logic Section ---

export const isDesktopInlineActionPanel = (
    popoverState: PopoverState | null,
    viewportWidth: number
): boolean => Boolean(
    popoverState?.entityId &&
    (!popoverState.type || popoverState.type === 'menu') &&
    viewportWidth >= 1025
);
