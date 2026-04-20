import { create } from 'zustand';
import { gmcpBus } from '../events/gmcpBus';
import { GmcpRoomInfo, GmcpUpdateExits, GmcpOccupant } from '../types';
import { useModeStore } from './useModeStore';

interface RoomState {
    roomName: string | null;
    roomDesc: string | null;
    roomZone: string | null;
    terrain: string | null;
    exits: string[] | Record<string, any>;
    players: GmcpOccupant[];
    npcs: GmcpOccupant[];
    items: GmcpOccupant[];

    applyRoomInfo: (info: GmcpRoomInfo) => void;
    applyExitsUpdate: (update: GmcpUpdateExits) => void;
    setPlayers: (players: GmcpOccupant[]) => void;
    setNpcs: (npcs: GmcpOccupant[]) => void;
    setItems: (items: GmcpOccupant[]) => void;
    addPlayer: (player: string | GmcpOccupant) => void;
    removePlayer: (player: string | GmcpOccupant) => void;
    addNpc: (npc: string | GmcpOccupant) => void;
    removeNpc: (npc: string | GmcpOccupant) => void;
    clear: () => void;
}

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

export const useRoomStore = create<RoomState>((set, get) => ({
    roomName: null,
    roomDesc: null,
    roomZone: null,
    terrain: null,
    exits: [],
    players: [],
    npcs: [],
    items: [],

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

gmcpBus.on('Room.Info', (data) => useRoomStore.getState().applyRoomInfo(data));
gmcpBus.on('Room.UpdateExits', (data) => useRoomStore.getState().applyExitsUpdate(data));

gmcpBus.on('Room.Players', (data) => {
    let rawList = Array.isArray(data) ? data : ((data as any).players || (data as any).members || (data as any).chars || (data as any).char || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    useRoomStore.getState().setPlayers(normalizeList(rawList));
});

gmcpBus.on('Room.Npcs', (data) => {
    let rawList = Array.isArray(data) ? data : ((data as any).npcs || (data as any).chars || (data as any).char || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    useRoomStore.getState().setNpcs(normalizeList(rawList));
});

gmcpBus.on('Room.Items', (data) => {
    if ((data as any).location && (data as any).location !== 'room' && (data as any).location !== 'objects') return;
    let rawList = Array.isArray(data) ? data : ((data as any).items || (data as any).objects || (data as any).obj || (data as any).objs || []);
    if (rawList && !Array.isArray(rawList)) rawList = [rawList];
    useRoomStore.getState().setItems(normalizeList(rawList));
});

gmcpBus.on('Room.AddPlayer', (data) => useRoomStore.getState().addPlayer(data));
gmcpBus.on('Room.RemovePlayer', (data) => useRoomStore.getState().removePlayer(data));
gmcpBus.on('Room.AddNpc', (data) => useRoomStore.getState().addNpc(data));
gmcpBus.on('Room.RemoveNpc', (data) => useRoomStore.getState().removeNpc(data));

export const getRoom = () => useRoomStore.getState();