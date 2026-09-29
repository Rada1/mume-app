/** @file mapSwipeWheelUtils.ts — Resolves map swipe-wheel cells and commands. */

// --- Types Section ---
export interface MapSwipeWheelPoint {
    x: number;
    y: number;
}

export interface MapSwipeWheelBounds extends MapSwipeWheelPoint {
    width: number;
    height: number;
}

export const MAP_SWIPE_WHEEL_COMMANDS = {
    nw: 'up',
    up: 'north',
    ne: 'where',
    left: 'west',
    center: 'look',
    right: 'east',
    sw: 'exits',
    down: 'south',
    se: 'down'
} as const;

export type MapSwipeWheelCell = keyof typeof MAP_SWIPE_WHEEL_COMMANDS;

// --- Logic Section ---
export const getMapSwipeWheelCell = (
    point: MapSwipeWheelPoint,
    bounds: MapSwipeWheelBounds
): MapSwipeWheelCell | null => {
    const size = Math.min(bounds.width, bounds.height);
    if (size <= 0) return null;

    const gridLeft = bounds.x + (bounds.width - size) / 2;
    const gridTop = bounds.y + (bounds.height - size) / 2;
    const col = Math.floor(((point.x - gridLeft) / size) * 3);
    const row = Math.floor(((point.y - gridTop) / size) * 3);
    if (col < 0 || col >= 3 || row < 0 || row >= 3) return null;

    const cells: MapSwipeWheelCell[][] = [
        ['nw', 'up', 'ne'],
        ['left', 'center', 'right'],
        ['sw', 'down', 'se']
    ];
    return cells[row][col];
};

export const getMapSwipeWheelCommand = (
    point: MapSwipeWheelPoint,
    bounds: MapSwipeWheelBounds
): string | null => {
    const cell = getMapSwipeWheelCell(point, bounds);
    return cell ? MAP_SWIPE_WHEEL_COMMANDS[cell] : null;
};
