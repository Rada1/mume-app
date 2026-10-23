/**
 * @file belowPopoverPosition.ts
 * @description Places target submenus below their trigger without clipping to a panel.
 */
import type { CSSProperties } from 'react';

// --- Logic Section ---
const VIEWPORT_GUTTER = 8;

export const getBelowPopoverPlacement = (
    anchorRect: DOMRect,
    contentRect: DOMRect,
    viewportWidth: number,
    viewportHeight: number
): CSSProperties => {
    const width = Math.min(contentRect.width, Math.max(0, viewportWidth - VIEWPORT_GUTTER * 2));
    const maxLeft = Math.max(VIEWPORT_GUTTER, viewportWidth - width - VIEWPORT_GUTTER);
    const left = Math.max(VIEWPORT_GUTTER, Math.min(anchorRect.left, maxLeft));
    const top = Math.min(Math.max(VIEWPORT_GUTTER, anchorRect.bottom), viewportHeight - VIEWPORT_GUTTER);

    return {
        position: 'fixed',
        left,
        width,
        top,
        maxHeight: Math.max(0, viewportHeight - top - VIEWPORT_GUTTER)
    };
};
