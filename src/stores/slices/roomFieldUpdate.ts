/** @file roomFieldUpdate.ts — Avoids notifying room subscribers for unchanged fields. */
import type { RoomState } from './roomSlice';

// --- Logic Section ---
export const roomFieldUpdate = <K extends keyof RoomState>(state: RoomState, key: K, value: RoomState[K]): Partial<RoomState> => {
    const previous = state[key];
    const unchanged = Object.is(previous, value) || (Array.isArray(previous) && Array.isArray(value)
        && previous.length === value.length && previous.every((entry, index) => Object.is(entry, value[index])));
    return unchanged ? state : { [key]: value } as Pick<RoomState, K>;
};
