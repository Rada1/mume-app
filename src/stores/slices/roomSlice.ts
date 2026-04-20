/**
 * @file roomSlice.ts
 * @description Shared logic for room information, exits, and occupants (Players/NPCs).
 * This slice is used by both the main useRoomStore and the useSpectateRoomStore.
 */

import { GmcpRoomInfo, GmcpUpdateExits, GmcpOccupant } from '../../types';

export interface RoomState {
    roomName: string;
    roomDesc: string;
    roomZone: string;
    terrain: string;
    exits: string[];
    rawExits: Record<string, any>;
    players: GmcpOccupant[];
    npcs: GmcpOccupant[];
    items: GmcpOccupant[];
    roomNum: number;

    applyRoomInfo: (data: GmcpRoomInfo) => void;
    applyExitsUpdate: (data: GmcpUpdateExits) => void;
    addPlayer: (data: any) => void;
    addNpc: (data: any) => void;
    removePlayer: (data: any) => void;
    removeNpc: (data: any) => void;
    setRoomInfo: (info: Partial<{ roomName: string; roomDesc: string; roomZone: string; terrain: string; roomNum: number }>) => void;
    setRoomName: (name: string | null | ((prev: string) => string)) => void;
    setRoomDesc: (desc: string | null | ((prev: string) => string)) => void;
    setRoomZone: (zone: string | null | ((prev: string) => string)) => void;
    setRoomExits: (exits: string[] | ((prev: string[]) => string[])) => void;
    setExits: (exits: string[] | ((prev: string[]) => string[])) => void;
    setCurrentTerrain: (terrain: string | ((prev: string) => string)) => void;
    setTerrain: (terrain: string | ((prev: string) => string)) => void;
    setPlayers: (players: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) => void;
    setNpcs: (npcs: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) => void;
    setItems: (items: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) => void;
    applyItemsUpdate: (data: GmcpOccupant[]) => void;
}

export const initialRoomState = {
    roomName: '',
    roomDesc: '',
    roomZone: '',
    terrain: '',
    exits: [],
    rawExits: {},
    players: [],
    npcs: [],
    items: [],
    roomNum: 0
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
            short: data
        };
    }

    // Case 2: Object (standard GMCP)
    if (typeof data === 'object') {
        const id = data.id !== undefined ? String(data.id) : (data.name || data.short || data.shortdesc || null);
        if (!id) return null;

        return {
            id,
            name: data.name || data.short || data.shortdesc || id,
            short: data.short || data.shortdesc || data.name || id,
            level: data.level,
            hp: data.hp,
            maxhp: data.maxhp,
            status: data.status || data.hpStatus || data.health
        } as unknown as GmcpOccupant;
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
 * Filter utility to remove an occupant by ID (stringified for safety).
 */
const filterOccupant = (list: GmcpOccupant[], parsedToRemove: GmcpOccupant) => {
    const removeId = String(parsedToRemove.id);
    return list.filter(p => String(p.id) !== removeId);
};

/**
 * Upsert utility to update an existing entity in the list or append it.
 */
const upsertOccupant = (list: GmcpOccupant[], entity: GmcpOccupant): GmcpOccupant[] => {
    const entityId = String(entity.id);
    const index = list.findIndex(e => String(e.id) === entityId);
    
    if (index !== -1) {
        const newList = [...list];
        newList[index] = { ...newList[index], ...entity };
        return newList;
    }
    
    return [...list, entity];
};

/**
 * Creates the room actions for a Zustand store.
 */
export const createRoomActions = (set: any, get: any) => ({
    applyRoomInfo: (data: GmcpRoomInfo) => {
        set((state: RoomState) => {
            const isNewPhysicalRoom = data.num !== undefined && data.num !== state.roomNum;
            
            return {
                roomName: data.name || state.roomName,
                roomDesc: data.details || state.roomDesc,
                roomZone: data.zone || state.roomZone,
                terrain: data.terrain || state.terrain,
                roomNum: data.num !== undefined ? data.num : state.roomNum,
                // SMARTER: Only clear occupants if it's a physical room change
                players: isNewPhysicalRoom ? [] : state.players,
                npcs: isNewPhysicalRoom ? [] : state.npcs,
                items: isNewPhysicalRoom ? [] : state.items,
                // Exits often come in the same packet
                exits: data.exits ? Object.keys(data.exits) : state.exits,
                rawExits: data.exits ? data.exits : state.rawExits
            };
        });
    },

    applyExitsUpdate: (data: GmcpUpdateExits) => {
        set({
            exits: Object.keys(data),
            rawExits: data
        });
    },

    addPlayer: (data: any) => {
        const parsed = parseOccupant(data);
        if (!parsed) return;
        set((state: RoomState) => ({
            players: upsertOccupant(state.players, parsed),
            // Cross-list cleanup: ensure they aren't in the NPC list
            npcs: filterOccupant(state.npcs, parsed)
        }));
    },

    addNpc: (data: any) => {
        const parsed = parseOccupant(data);
        if (!parsed) return;
        set((state: RoomState) => ({
            npcs: upsertOccupant(state.npcs, parsed),
            // Cross-list cleanup: ensure they aren't in the player list
            players: filterOccupant(state.players, parsed)
        }));
    },

    removePlayer: (data: any) => {
        const parsed = parseOccupant(data);
        if (!parsed) return;
        set((state: RoomState) => ({
            players: filterOccupant(state.players, parsed)
        }));
    },

    removeNpc: (data: any) => {
        const parsed = parseOccupant(data);
        if (!parsed) return;
        set((state: RoomState) => ({
            npcs: filterOccupant(state.npcs, parsed)
        }));
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

    setPlayers: (players: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) => 
        set((state: RoomState) => ({ players: typeof players === 'function' ? players(state.players) : players })),
    setNpcs: (npcs: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) => 
        set((state: RoomState) => ({ npcs: typeof npcs === 'function' ? npcs(state.npcs) : npcs })),
    setItems: (items: GmcpOccupant[] | ((prev: GmcpOccupant[]) => GmcpOccupant[])) => 
        set((state: RoomState) => ({ items: typeof items === 'function' ? items(state.items) : items })),
    
    applyItemsUpdate: (data: GmcpOccupant[]) => {
        set({ items: Array.isArray(data) ? data : [] });
    }
});