/**
 * @file mapLayoutIndex.ts
 * @description Tracks local mapper room layout changes for canvas spatial indexes.
 */

// --- Types Section ---
interface LayoutIndexedRoom {
    id: string;
    x: number;
    y: number;
    z?: number;
    terrain?: string;
    light?: number | string;
    sundeath?: number | string;
    zone?: string;
    isPermanentSnow?: boolean;
    exits?: Record<string, {
        target?: string;
        closed?: boolean;
        hasDoor?: boolean;
    }>;
}

export type LocalSpatialIndex = Record<number, Record<string, string[]>>;

// --- Logic Section ---
export const isLocalLayoutRoom = (room: LayoutIndexedRoom | undefined): room is LayoutIndexedRoom => {
    return !!room && !room.id.startsWith('m_');
};

const getLocalRoomIds = (rooms: Record<string, LayoutIndexedRoom>) => {
    return Object.keys(rooms).filter(id => isLocalLayoutRoom(rooms[id]));
};

export const didLocalLayoutChange = (
    oldRooms: Record<string, LayoutIndexedRoom>,
    newRooms: Record<string, LayoutIndexedRoom>
): boolean => {
    const oldKeys = getLocalRoomIds(oldRooms);
    const newKeys = getLocalRoomIds(newRooms);
    if (oldKeys.length !== newKeys.length) return true;

    for (const key of newKeys) {
        const oldRoom = oldRooms[key];
        const newRoom = newRooms[key];
        if (!isLocalLayoutRoom(oldRoom) || !isLocalLayoutRoom(newRoom)) return true;

        if (oldRoom.x !== newRoom.x || oldRoom.y !== newRoom.y || oldRoom.z !== newRoom.z) return true;
        if (oldRoom.terrain !== newRoom.terrain) return true;
        if (oldRoom.light !== newRoom.light || oldRoom.sundeath !== newRoom.sundeath) return true;

        const oldExits = oldRoom.exits || {};
        const newExits = newRoom.exits || {};
        const oldExitKeys = Object.keys(oldExits);
        const newExitKeys = Object.keys(newExits);
        if (oldExitKeys.length !== newExitKeys.length) return true;

        for (const dir of newExitKeys) {
            const oldEx = oldExits[dir];
            const newEx = newExits[dir];
            if (!oldEx) return true;
            if (oldEx.target !== newEx.target || oldEx.closed !== newEx.closed || oldEx.hasDoor !== newEx.hasDoor) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Detects whether any terrain-relevant field changed across ALL rooms (including
 * preloaded `m_` rooms, so door open/close on base-map rooms is caught). Unlike
 * didLocalLayoutChange this is used to gate the static-layer *cache* version, so
 * transient room churn (visit flags, re-received data) no longer forces a full
 * cache rebuild on every step.
 */
export const didCacheRelevantChange = (
    oldRooms: Record<string, LayoutIndexedRoom>,
    newRooms: Record<string, LayoutIndexedRoom>
): boolean => {
    const oldKeys = Object.keys(oldRooms);
    const newKeys = Object.keys(newRooms);
    if (oldKeys.length !== newKeys.length) return true;

    for (const key of newKeys) {
        const o = oldRooms[key];
        const n = newRooms[key];
        if (!o) return true;

        if (o.x !== n.x || o.y !== n.y || o.z !== n.z) return true;
        if (o.terrain !== n.terrain) return true;
        if (o.light !== n.light || o.sundeath !== n.sundeath) return true;
        if (o.zone !== n.zone || o.isPermanentSnow !== n.isPermanentSnow) return true;

        const oe = o.exits || {};
        const ne = n.exits || {};
        const oek = Object.keys(oe);
        const nek = Object.keys(ne);
        if (oek.length !== nek.length) return true;

        for (const dir of nek) {
            const ox = oe[dir];
            const nx = ne[dir];
            if (!ox) return true;
            if (ox.target !== nx.target || ox.closed !== nx.closed || ox.hasDoor !== nx.hasDoor) return true;
        }
    }

    return false;
};

export const buildLocalSpatialIndex = (rooms: Record<string, LayoutIndexedRoom>): LocalSpatialIndex => {
    const nextIndex: LocalSpatialIndex = {};

    for (const id of getLocalRoomIds(rooms)) {
        const room = rooms[id];
        const rz = Math.round(room.z || 0);
        if (!nextIndex[rz]) nextIndex[rz] = {};

        const bucketX = Math.floor(room.x / 5);
        const bucketY = Math.floor(room.y / 5);
        const key = `${bucketX},${bucketY}`;
        if (!nextIndex[rz][key]) nextIndex[rz][key] = [];
        nextIndex[rz][key].push(room.id);
    }

    return nextIndex;
};
