import { create } from 'zustand';
import { gmcpBus } from '../events/gmcpBus';
import { GmcpRoomInfo, GmcpUpdateExits, GmcpOccupant } from '../types';
import { useModeStore } from './useModeStore';
import { RoomState, createRoomActions, initialRoomState } from './slices/roomSlice';

export type RoomStore = RoomState;

export const useRoomStore = create<RoomStore>((set, get) => ({
    ...initialRoomState,
    ...createRoomActions(set, get)
}));

// --- Event Subscriptions ---

gmcpBus.on('Room.Info', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().applyRoomInfo(data);
});

gmcpBus.on('Room.UpdateExits', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().applyExitsUpdate(data);
});

gmcpBus.on('Room.Items', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().setItems(data as any);
});

gmcpBus.on('Room.AddPlayer', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().addPlayer(data);
});

gmcpBus.on('Room.RemovePlayer', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().removePlayer(data);
});

gmcpBus.on('Room.Players', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().setPlayers(data as any);
});

gmcpBus.on('Room.Npcs', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().setNpcs(data as any);
});

gmcpBus.on('Room.AddNpc', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().addNpc(data);
});

gmcpBus.on('Room.RemoveNpc', (data) => {
    if (data.isSnooped) return;
    useRoomStore.getState().removeNpc(data);
});

export const getRoom = () => useRoomStore.getState();
