/**
 * @file mapSwipeFeedback.ts
 * @description Emits normalized map-edge feedback for directional movement.
 */

// --- Logic Section ---
const MAP_EDGE_DIRECTIONS: Record<string, string> = {
    n: 'n', north: 'n', up: 'n',
    s: 's', south: 's', down: 's',
    e: 'e', east: 'e', right: 'e',
    w: 'w', west: 'w', left: 'w',
    ne: 'ne', northeast: 'ne',
    nw: 'nw', northwest: 'nw',
    se: 'se', southeast: 'se',
    sw: 'sw', southwest: 'sw',
    u: 'nw', d: 'se'
};

export const dispatchMapSwipeEdgeFeedback = (direction: string | null | undefined): void => {
    if (!direction || typeof window === 'undefined') return;
    const edgeDirection = MAP_EDGE_DIRECTIONS[direction.toLowerCase()];
    if (edgeDirection) {
        window.dispatchEvent(new CustomEvent('map-swipe-edge-feedback', {
            detail: { direction: edgeDirection }
        }));
    }
};
