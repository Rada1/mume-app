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
    // No setPlayers in Slice, but we can use addPlayer or something?
    // Actually the slice should have setPlayers if we want it.
});

gmcpBus.on('Room.Items', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().applyItemsUpdate(data as any);
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
