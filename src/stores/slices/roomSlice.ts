/**
 * @file roomSlice.ts
 * @description Shared logic for room information, exits, and occupants (Players/NPCs).
 * This slice is used by both the main useRoomStore and the useSpectateRoomStore.
 */

import { GmcpRoomInfo, GmcpEntity, GmcpRoomExits } from '../../types';

export interface RoomState {
    roomName: string;
    roomDesc: string;
    roomZone: string;
    terrain: string;
    exits: string[];
    rawExits: Record<string, any>;
    players: GmcpEntity[];
    npcs: GmcpEntity[];
    items: GmcpEntity[];
    roomNum: number;

    applyRoomInfo: (data: GmcpRoomInfo) => void;
    applyExitsUpdate: (data: GmcpRoomExits) => void;
    addPlayer: (data: any) => void;
    addNpc: (data: any) => void;
    removePlayer: (data: any) => void;
    removeNpc: (data: any) => void;
    setRoomInfo: (info: Partial<{ name: string; description: string; zone: string; terrain: string; roomNum: number }>) => void;
    setRoomExits: (exits: string[]) => void;
    setCurrentTerrain: (terrain: string) => void;
    applyItemsUpdate: (data: GmcpEntity[]) => void;
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
 * Parses GMCP entity data into a consistent GmcpEntity format.
 * Handles mixed types (string, object, number) from MUME.
 */
const parseOccupant = (data: any): GmcpEntity | null => {
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
        };
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
const filterOccupant = (list: GmcpEntity[], parsedToRemove: GmcpEntity) => {
    const removeId = String(parsedToRemove.id);
    return list.filter(p => String(p.id) !== removeId);
};

/**
 * Upsert utility to update an existing entity in the list or append it.
 */
const upsertOccupant = (list: GmcpEntity[], entity: GmcpEntity): GmcpEntity[] => {
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

    applyExitsUpdate: (data: GmcpRoomExits) => {
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

    setRoomExits: (exits: string[]) => {
        set({ exits });
    },

    setCurrentTerrain: (terrain: string) => {
        set({ terrain });
    },
    
    applyItemsUpdate: (data: GmcpEntity[]) => {
        set({ items: Array.isArray(data) ? data : [] });
    }
});
