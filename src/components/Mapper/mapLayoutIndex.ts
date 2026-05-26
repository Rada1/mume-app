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
