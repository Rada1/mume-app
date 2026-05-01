/**
 * @file roomSlice.ts
 * @description Shared logic for room information, exits, and occupants (Players/NPCs).
 * This slice is used by both the main useRoomStore and the useSpectateRoomStore.
 */

import { GmcpRoomInfo, GmcpUpdateExits, GmcpOccupant, WhereEntry } from '../../types';
import { normalizeOccupantType } from '../../services/classification/normalizeOccupantType';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';

export interface RoomState {
    roomName: string;
    roomDesc: string;
    roomZone: string;
    terrain: string;
    exits: string[];
    rawExits: Record<string, any>;
    chars: Record<number, GmcpOccupant>;
    items: GmcpOccupant[];
    roomNum: number;
    whoList: string[];
    whereList: WhereEntry[];

    applyRoomInfo: (data: GmcpRoomInfo) => void;
    applyExitsUpdate: (data: GmcpUpdateExits | any) => void;
    addChar: (data: any) => void;
    updateChar: (data: any) => void;
    removeChar: (data: any) => void;
    setChars: (chars: Record<number, GmcpOccupant> | ((prev: Record<number, GmcpOccupant>) => Record<number, GmcpOccupant>)) => void;
    setWhoList: (list: string[] | ((prev: string[]) => string[])) => void;
    setWhereList: (list: WhereEntry[] | ((prev: WhereEntry[]) => WhereEntry[])) => void;
    setRoomInfo: (info: Partial<{ roomName: string; roomDesc: string; roomZone: string; terrain: string; roomNum: number }>) => void;
    setRoomName: (name: string | null | ((prev: string) => string)) => void;
    setRoomDesc: (desc: string | null | ((prev: string) => string)) => void;
    setRoomZone: (zone: string | null | ((prev: string) => string)) => void;
    setRoomExits: (exits: string[] | ((prev: string[]) => string[])) => void;
    setExits: (exits: string[] | ((prev: string[]) => string[])) => void;
    setCurrentTerrain: (terrain: string | ((prev: string) => string)) => void;
    setTerrain: (terrain: string | ((prev: string) => string)) => void;

    setItems: (items: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) => void;
    applyItemsUpdate: (data: GmcpOccupant[]) => void;
}

export const initialRoomState: Pick<RoomState, 'roomName' | 'roomDesc' | 'roomZone' | 'terrain' | 'exits' | 'rawExits' | 'chars' | 'items' | 'roomNum' | 'whoList' | 'whereList'> = {
    roomName: '',
    roomDesc: '',
    roomZone: '',
    terrain: '',
    exits: [],
    rawExits: {},
    chars: {},
    items: [],
    roomNum: 0,
    whoList: [],
    whereList: []
};

// --- Logic Section ---

/**
 * Parses GMCP entity data into a consistent GmcpOccupant format.
 * Handles mixed types (string, object, number) from MUME.
 */
const parseOccupant = (data: any): GmcpOccupant | null => {
    if (!data) return null;

    // Case 1: Simple string (keyword or short desc)
    if (typeof data === 'string') {
        return {
            id: data, // Fallback ID
            name: data,
            keyword: getOccupantCommandKeyword({ name: data }),
            short: data
        };
    }

    // Case 2: Object (standard GMCP)
    if (typeof data === 'object') {
        const id = data.id !== undefined ? String(data.id) : (data.name || data.short || data.shortdesc || null);
        if (!id) return null;

        // Ensure we do not overwrite existing data with undefined during partial updates
        const parsed: Partial<GmcpOccupant> = { id };
        if (data.name) parsed.name = data.name;
        if (data.short || data.shortdesc || data.name || id) parsed.short = data.short || data.shortdesc || data.name || id;
        if (data.level !== undefined) parsed.level = data.level;
        if (data.hp !== undefined) parsed.hp = data.hp;
        if (data.maxhp !== undefined) parsed.maxhp = data.maxhp;
        if (data.status || data.hpStatus || data.health) parsed.status = data.status || data.hpStatus || data.health;
        // Normalize MUME's `pc` flag into the canonical `type` field. Without
        // this, NPCs that arrive with only `pc: 0` (no explicit type) are
        // invisible to classifyOccupant and never get inline buttons.
        const normalizedType = normalizeOccupantType(data);
        if (normalizedType) parsed.type = normalizedType;
        if (data.name || data.keyword || data.short || data.shortdesc) {
            parsed.keyword = getOccupantCommandKeyword({ ...data, type: normalizedType || data.type }, id);
        }
        if (data.pc !== undefined) parsed.pc = data.pc;
        if (Array.isArray(data.labels)) parsed.labels = data.labels;
        if (Array.isArray(data.flags)) parsed.flags = data.flags;

        return parsed as GmcpOccupant;
    }

    // Case 3: Number (rare, usually an ID)
    if (typeof data === 'number') {
        return {
            id: String(data),
            name: `Entity ${data}`,
            short: `Entity ${data}`
        };
    }

    return null;
};

/**
 * Creates the room actions for a Zustand store.
 */
export const createRoomActions = (set: (fn: (state: RoomState) => any) => void, get: () => RoomState) => ({
    applyRoomInfo: (data: GmcpRoomInfo) => {
        set((state: RoomState) => {
            const incomingId = data.num ?? data.vnum ?? data.id;
            const isNewPhysicalRoom = incomingId !== undefined && incomingId !== null && String(incomingId) !== String(state.roomNum);
            
            return {
                roomName: data.name || state.roomName,
                roomDesc: data.desc || state.roomDesc,
                roomZone: data.zone || state.roomZone,
                terrain: data.terrain || state.terrain,
                roomNum: incomingId !== undefined && incomingId !== null ? Number(incomingId) : state.roomNum,
                // SMARTER: Only clear occupants if it's a physical room change
                chars: isNewPhysicalRoom ? {} : state.chars,
                items: isNewPhysicalRoom ? [] : state.items,
                // Exits often come in the same packet
                exits: data.exits ? Object.keys(data.exits) : state.exits,
                rawExits: data.exits ? data.exits : state.rawExits
            };
        });
    },

    applyExitsUpdate: (data: GmcpUpdateExits | any) => {
        const exitsData = data.exits || data;
        set((state) => ({
            ...state,
            exits: Object.keys(exitsData),
            rawExits: exitsData
        }));
    },

    addChar: (data: any) => {
        const parsed = parseOccupant(data);
        if (!parsed || parsed.id === undefined) return;
        const id = Number(parsed.id);
        if (isNaN(id)) return;

        set((state: RoomState) => {
            const newChars = { ...state.chars };
            newChars[id] = parsed;
            return { chars: newChars };
        });
    },

    updateChar: (data: any) => {
        const parsed = parseOccupant(data);
        if (!parsed || parsed.id === undefined) return;
        const id = Number(parsed.id);
        if (isNaN(id)) return;

        set((state: RoomState) => {
            const newChars = { ...state.chars };
            const existing = newChars[id];
            if (existing) {
                // Shallow merge to preserve keys not in the update message
                newChars[id] = { ...existing, ...parsed };
            } else {
                newChars[id] = parsed;
            }
            return { chars: newChars };
        });
    },

    removeChar: (data: any) => {
        const parsed = parseOccupant(data);
        if (!parsed || parsed.id === undefined) return;
        const id = Number(parsed.id);
        if (isNaN(id)) return;

        set((state: RoomState) => {
            const newChars = { ...state.chars };
            delete newChars[id];
            return { chars: newChars };
        });
    },

    setRoomInfo: (info: Partial<{ roomName: string; roomDesc: string; roomZone: string; terrain: string; roomNum: number }>) => {
        set((state: RoomState) => ({ ...state, ...info }));
    },

    setRoomName: (roomName: string | null | ((prev: string) => string)) => 
        set((state: RoomState) => ({ roomName: typeof roomName === 'function' ? roomName(state.roomName) : (roomName || '') })),
    setRoomDesc: (roomDesc: string | null | ((prev: string) => string)) => 
        set((state: RoomState) => ({ roomDesc: typeof roomDesc === 'function' ? roomDesc(state.roomDesc) : (roomDesc || '') })),
    setRoomZone: (roomZone: string | null | ((prev: string) => string)) => 
        set((state: RoomState) => ({ roomZone: typeof roomZone === 'function' ? roomZone(state.roomZone) : (roomZone || '') })),

    setRoomExits: (exits: string[] | ((prev: string[]) => string[])) => 
        set((state: RoomState) => ({ exits: typeof exits === 'function' ? exits(state.exits) : exits })),

    setExits: (exits: string[] | ((prev: string[]) => string[])) => 
        set((state: RoomState) => ({ exits: typeof exits === 'function' ? exits(state.exits) : exits })),

    setCurrentTerrain: (terrain: string | ((prev: string) => string)) => 
        set((state: RoomState) => ({ terrain: typeof terrain === 'function' ? terrain(state.terrain) : terrain })),

    setTerrain: (terrain: string | ((prev: string) => string)) => 
        set((state: RoomState) => ({ terrain: typeof terrain === 'function' ? terrain(state.terrain) : terrain })),

    setChars: (chars: Record<number, GmcpOccupant> | ((prev: Record<number, GmcpOccupant>) => Record<number, GmcpOccupant>)) =>
        set((state: RoomState) => ({ chars: typeof chars === 'function' ? chars(state.chars) : chars })),

    setItems: (items: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) =>
        set((state: RoomState) => ({ items: typeof items === 'function' ? items(state.items) : (Array.isArray(items) ? items : state.items) })),
    
    applyItemsUpdate: (data: GmcpOccupant[]) => {
        set((state: RoomState) => ({ ...state, items: Array.isArray(data) ? data : [] }));
    },

    setWhoList: (whoList: string[] | ((prev: string[]) => string[])) => 
        set((state: RoomState) => ({ whoList: typeof whoList === 'function' ? whoList(state.whoList) : whoList })),

    setWhereList: (whereList: WhereEntry[] | ((prev: WhereEntry[]) => WhereEntry[])) => 
        set((state: RoomState) => ({ whereList: typeof whereList === 'function' ? whereList(state.whereList) : whereList })),
});
