import { create } from 'zustand';
import { gmcpBus } from '../events/gmcpBus';
import { GmcpRoomInfo, GmcpUpdateExits, GmcpOccupant } from '../types';
import { useModeStore } from './useModeStore';

export interface RoomState {
    roomName: string | null;
    roomDesc: string | null;
    roomZone: string | null;
    terrain: string | null;
    exits: string[] | Record<string, any>;
    players: GmcpOccupant[];
    npcs: GmcpOccupant[];
    items: GmcpOccupant[];
}

export interface RoomActions {
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    setRoomZone: (zone: string | null) => void;
    setTerrain: (terrain: string | null) => void;
    setExits: (exits: string[] | Record<string, any>) => void;
    setPlayers: (players: GmcpOccupant[]) => void;
    setNpcs: (npcs: GmcpOccupant[]) => void;
    setItems: (items: GmcpOccupant[]) => void;
    addPlayer: (player: string | GmcpOccupant) => void;
    removePlayer: (player: string | GmcpOccupant) => void;
    addNpc: (npc: string | GmcpOccupant) => void;
    removeNpc: (npc: string | GmcpOccupant) => void;
    applyRoomInfo: (info: GmcpRoomInfo) => void;
    applyExitsUpdate: (update: GmcpUpdateExits) => void;
    applyItemsUpdate: (data: any) => void;
    clear: () => void;
}

export type RoomStore = RoomState & RoomActions;

const parseOccupant = (data: string | GmcpOccupant): GmcpOccupant => {
    if (typeof data === 'string') {
        return { name: data, keyword: data, short: data };
    }
    return data;
};

const filterOccupant = (occupantToRemove: string | GmcpOccupant) => (p: GmcpOccupant) => {
    const parsedToRemove = parseOccupant(occupantToRemove);
    if (parsedToRemove.id && p.id === parsedToRemove.id) return false;
    if (parsedToRemove.name && p.name === parsedToRemove.name) return false;
    return true;
};

const normalizeList = (list: any[]): GmcpOccupant[] => {
    return list.map(item => parseOccupant(item));
};

export const useRoomStore = create<RoomStore>((set, get) => ({
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

    applyRoomInfo: (info) => set((state) => ({
        roomName: info.name ?? state.roomName,
        roomDesc: info.desc ?? state.roomDesc,
        roomZone: info.zone ?? info.area ?? state.roomZone,
        terrain: info.terrain ?? info.environment ?? state.terrain,
        exits: info.exits ? Object.keys(info.exits) : state.exits,
        items: [] // Per blueprint, items clear on info
    })),

    applyExitsUpdate: (update) => set({
        exits: update.exits ? Object.keys(update.exits) : []
    }),

    setPlayers: (players) => set({ players }),
    setNpcs: (npcs) => set({ npcs }),
    setItems: (items) => set({ items }),

    addPlayer: (player) => set((state) => ({
        players: [...state.players.filter(filterOccupant(player)), parseOccupant(player)]
    })),

    removePlayer: (player) => set((state) => ({
        players: state.players.filter(filterOccupant(player))
    })),

    addNpc: (npc) => set((state) => ({
        npcs: [...state.npcs.filter(filterOccupant(npc)), parseOccupant(npc)]
    })),

    removeNpc: (npc) => set((state) => ({
        npcs: state.npcs.filter(filterOccupant(npc))
    })),
    
    applyItemsUpdate: (data) => set((state) => {
        if (data.location && data.location !== 'room' && data.location !== 'objects') return state;
        let rawList = Array.isArray(data) ? data : (data.items || data.objects || data.obj || data.objs || []);
        if (rawList && !Array.isArray(rawList)) rawList = [rawList];
        return { items: normalizeList(rawList) };
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

gmcpBus.on('Room.Info', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().applyRoomInfo(data);
});

gmcpBus.on('Room.UpdateExits', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().applyExitsUpdate(data);
});

gmcpBus.on('Room.Players', (data) => {
    if (useModeStore.getState().isSpectating) return;
    let rawList = Array.isArray(data) ? data : ((data as any).players || (data as any).members || (data as any).chars || (data as any).char || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    useRoomStore.getState().setPlayers(normalizeList(rawList));
});

gmcpBus.on('Room.Npcs', (data) => {
    if (useModeStore.getState().isSpectating) return;
    let rawList = Array.isArray(data) ? data : ((data as any).npcs || (data as any).chars || (data as any).char || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    useRoomStore.getState().setNpcs(normalizeList(rawList));
});

gmcpBus.on('Room.Items', (data) => {
    if (useModeStore.getState().isSpectating) return;
    let rawList = Array.isArray(data) ? data : ((data as any).items || (data as any).objects || (data as any).obj || (data as any).objs || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    useRoomStore.getState().setItems(normalizeList(rawList));
});

gmcpBus.on('Room.AddPlayer', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().addPlayer(data);
});

gmcpBus.on('Room.RemovePlayer', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().removePlayer(data);
});

gmcpBus.on('Room.AddNpc', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().addNpc(data);
});

gmcpBus.on('Room.RemoveNpc', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().removeNpc(data);
});

export const getRoom = () => useRoomStore.getState();