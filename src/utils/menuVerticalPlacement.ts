/** @file menuVerticalPlacement.ts — Choose the side with more available menu space. */
// --- Placement Section ---
export function menuVerticalPlacement(anchorTop: number, anchorBottom: number, viewportHeight: number, besideRow = false) {
    const upEdge = besideRow ? anchorBottom : anchorTop;
    const downEdge = besideRow ? anchorTop : anchorBottom;
    const above = Math.max(0, upEdge - 8);
    const below = Math.max(0, viewportHeight - downEdge - 8);
    return above >= below
        ? { top: undefined, bottom: viewportHeight - upEdge, maxHeight: above }
        : { top: downEdge, bottom: undefined, maxHeight: below };
}
