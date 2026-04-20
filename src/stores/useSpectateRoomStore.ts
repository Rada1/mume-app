import { create } from 'zustand';
import { GmcpRoomInfo, GmcpUpdateExits, GmcpOccupant } from '../types';
import { gmcpBus } from '../events/gmcpBus';
import { useModeStore } from './useModeStore';

export interface RoomState {
    roomName: string | null;
    roomDesc: string | null;
    roomZone: string | null;
    terrain: string | null;
    exits: string[];
    players: GmcpOccupant[];
    npcs: GmcpOccupant[];
    items: GmcpOccupant[];
}

export interface RoomActions {
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    setRoomZone: (zone: string | null) => void;
    setTerrain: (terrain: string | null) => void;
    setExits: (exits: string[]) => void;
    setPlayers: (players: any) => void;
    setNpcs: (npcs: any) => void;
    setItems: (items: any) => void;
    applyRoomInfo: (info: GmcpRoomInfo) => void;
    applyExitsUpdate: (update: GmcpUpdateExits) => void;
    clear: () => void;
}

export type RoomStore = RoomState & RoomActions;

const parseOccupant = (data: string | GmcpOccupant): GmcpOccupant => {
    if (typeof data === 'string') {
        return { name: data, keyword: data, short: data };
    }
    return data;
};

const normalizeList = (list: any[]): GmcpOccupant[] => {
    return list.map(item => parseOccupant(item));
};

export const useSpectateRoomStore = create<RoomStore>((set) => ({
    roomName: null,
    roomDesc: null,
    roomZone: null,
    terrain: null,
    exits: [],
    players: [],
    npcs: [],
    items: [],

    setRoomName: (roomName) => set({ roomName }),
    setRoomDesc: (roomDesc) => set({ roomDesc }),
    setRoomZone: (roomZone) => set({ roomZone }),
    setTerrain: (terrain) => set({ terrain }),
    setExits: (exits) => set({ exits }),
    
    setPlayers: (playersUpdate) => set((state) => {
        const next = typeof playersUpdate === 'function' ? playersUpdate(state.players) : playersUpdate;
        return { players: normalizeList(next) };
    }),
    setNpcs: (npcsUpdate) => set((state) => {
        const next = typeof npcsUpdate === 'function' ? npcsUpdate(state.npcs) : npcsUpdate;
        return { npcs: normalizeList(next) };
    }),
    setItems: (itemsUpdate) => set((state) => {
        const next = typeof itemsUpdate === 'function' ? itemsUpdate(state.items) : itemsUpdate;
        return { items: normalizeList(next) };
    }),

    applyRoomInfo: (info) => set((state) => ({
        roomName: info.name ?? state.roomName,
        roomDesc: info.desc ?? state.roomDesc,
        roomZone: info.zone ?? info.area ?? state.roomZone,
        terrain: info.terrain ?? info.environment ?? state.terrain,
        exits: info.exits ? Object.keys(info.exits) : state.exits,
        items: []
    })),

    applyExitsUpdate: (update) => set({
        exits: update.exits ? Object.keys(update.exits) : []
    }),

    clear: () => set({
        roomName: null,
        roomDesc: null,
        roomZone: null,
        terrain: null,
        exits: [],
        players: [],
        npcs: [],
        items: []
    })
}));

export const getSpectateRoom = () => useSpectateRoomStore.getState();

gmcpBus.on('Room.Info', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().applyRoomInfo(data);
});

gmcpBus.on('Room.UpdateExits', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().applyExitsUpdate(data);
});

gmcpBus.on('Room.Players', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    let rawList = Array.isArray(data) ? data : ((data as any).players || (data as any).members || (data as any).chars || (data as any).char || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    getSpectateRoom().setPlayers(normalizeList(rawList));
});

gmcpBus.on('Room.Npcs', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    let rawList = Array.isArray(data) ? data : ((data as any).npcs || (data as any).chars || (data as any).char || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    getSpectateRoom().setNpcs(normalizeList(rawList));
});

gmcpBus.on('Room.Items', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    let rawList = Array.isArray(data) ? data : ((data as any).items || (data as any).objects || (data as any).obj || (data as any).objs || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    getSpectateRoom().setItems(normalizeList(rawList));
});
