/** @file mapContextMenuPosition.ts — Bounds map action menus to their map or viewport. */

// --- Logic Section ---
export const getMapContextMenuPosition = ({
    clientX,
    clientY,
    bounds,
    menuWidth,
    menuHeight
}: {
    clientX: number;
    clientY: number;
    bounds: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>;
    menuWidth: number;
    menuHeight: number;
}) => {
    const maxX = Math.max(8, bounds.width - menuWidth - 8);
    const maxY = Math.max(8, bounds.height - menuHeight - 8);
    return {
        x: Math.min(Math.max(clientX - bounds.left, 8), maxX),
        y: Math.min(Math.max(clientY - bounds.top, 8), maxY)
    };
};
