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

export interface MapSwipeWheelPosition extends MapSwipeWheelPoint {
    originX: number;
    originY: number;
}

export const MAP_SWIPE_WHEEL_COMMANDS = {
    nw: 'up',
    up: 'north',
    ne: null,
    left: 'west',
    center: 'look',
    right: 'east',
    sw: null,
    down: 'south',
    se: 'down'
} as const;

export type MapSwipeWheelCell = keyof typeof MAP_SWIPE_WHEEL_COMMANDS;
export type MapSwipeWheelVerticalExit = 'up' | 'down';

const NO_VERTICAL_EXITS: ReadonlySet<MapSwipeWheelVerticalExit> = new Set();

const getCardinalSwipeCell = (dx: number, dy: number): MapSwipeWheelCell | null => {
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    if (angle >= 337.5 || angle < 22.5) return 'right';
    if (angle >= 67.5 && angle < 112.5) return 'down';
    if (angle >= 157.5 && angle < 202.5) return 'left';
    if (angle >= 247.5 && angle < 292.5) return 'up';
    return null;
};

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

export const getMapSwipeWheelGestureCell = (
    origin: MapSwipeWheelPoint,
    pointer: MapSwipeWheelPoint,
    bounds: MapSwipeWheelBounds,
    swipeThreshold = 18,
    _availableVerticalExits?: ReadonlySet<MapSwipeWheelVerticalExit>
): MapSwipeWheelCell | null => {
    const originCell = getMapSwipeWheelCell(origin, bounds);
    if (!originCell) return getMapSwipeWheelCell(pointer, bounds);

    const dx = pointer.x - origin.x;
    const dy = pointer.y - origin.y;
    if (Math.hypot(dx, dy) < swipeThreshold) {
        return getMapSwipeWheelCell(pointer, bounds);
    }

    const cardinalCell = getCardinalSwipeCell(dx, dy);
    if (cardinalCell) return cardinalCell;

    if (originCell !== 'center') {
        return getMapSwipeWheelCell(pointer, bounds);
    }

    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    if (angle < 67.5) return 'se';
    if (angle < 112.5) return 'down';
    if (angle < 157.5) return getMapSwipeWheelCell(pointer, bounds) === 'sw' ? 'sw' : null;
    if (angle < 247.5) return 'nw';
    if (angle < 292.5) return 'up';
    return getMapSwipeWheelCell(pointer, bounds) === 'ne' ? 'ne' : null;
};

export const getMapSwipeWheelGestureCommand = (
    origin: MapSwipeWheelPoint,
    pointer: MapSwipeWheelPoint,
    bounds: MapSwipeWheelBounds,
    availableVerticalExits: ReadonlySet<MapSwipeWheelVerticalExit> = NO_VERTICAL_EXITS
): string | null => {
    const cell = getMapSwipeWheelGestureCell(origin, pointer, bounds, 18, availableVerticalExits);
    return cell ? MAP_SWIPE_WHEEL_COMMANDS[cell] : null;
};
