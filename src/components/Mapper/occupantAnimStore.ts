/**
 * Module-level animation store for room occupant enter/exit animations.
 * Written by GMCP handlers, read by drawRoomOccupants each frame.
 */

export interface OccupantAnimEntry {
    dir?: string;           // 'n','s','e','w','u','d','ne','nw','se','sw'
    type: 'enter' | 'exit' | 'tap';
    startTime: number;     // Date.now() when animation began
    name: string;
    id?: string | number;
    isPlayer: boolean;
    startOffset?: { dx: number, dy: number }; // Relative to room center
}

export const OCCUPANT_ANIM_DURATION = 300; // ms

/** Keyed by occupant identity — id takes priority over name */
export const occupantAnims = new Map<string, OccupantAnimEntry>();

export function getOccupantKey(id: string | number | null | undefined, name: string): string {
    return (id != null && id !== '') ? `id:${id}` : `name:${String(name).toLowerCase()}`;
}

/** Direction word (from game text) → map code */
export const DIR_WORD_TO_CODE: Record<string, string> = {
    north: 'n', south: 's', east: 'e', west: 'w',
    up: 'u', down: 'd', above: 'u', below: 'd',
    northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
}

export function registerOccupantTap(id: string | number | undefined, name: string, isPlayer: boolean) {
    const key = getOccupantKey(id, name);
    occupantAnims.set(key, {
        type: 'tap',
        startTime: Date.now(),
        name,
        id,
        isPlayer
    });
}
