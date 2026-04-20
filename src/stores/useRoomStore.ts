/**
 * @file useRoomStore.ts
 * @description Main store for player's current room. Gated to ignore updates during spectate sessions.
 */

import { create } from 'zustand';
import { useModeStore } from './useModeStore';
import { gmcpBus } from '../events/gmcpBus';
import { 
    RoomState, 
    initialRoomState, 
    createRoomActions 
} from './slices/roomSlice';

export const useRoomStore = create<RoomState>((set, get) => ({
    ...initialRoomState,
    ...createRoomActions(set, get)
}));

export const getRoom = () => useRoomStore.getState();

// --- Event Subscriptions ---

gmcpBus.on('Room.Info', (data) => {
    if (useModeStore.getState().isSpectating) return;
    getRoom().applyRoomInfo(data);
});

gmcpBus.on('Room.Exits', (data) => {
    if (useModeStore.getState().isSpectating) return;
    getRoom().applyExitsUpdate(data);
});

gmcpBus.on('Room.AddPlayer', (data) => {
    if (useModeStore.getState().isSpectating) return;
    getRoom().addPlayer(data);
});

gmcpBus.on('Room.RemovePlayer', (data) => {
    if (useModeStore.getState().isSpectating) return;
    getRoom().removePlayer(data);
});

gmcpBus.on('Room.AddNPC', (data) => {
    if (useModeStore.getState().isSpectating) return;
    getRoom().addNpc(data);
});

gmcpBus.on('Room.RemoveNPC', (data) => {
    if (useModeStore.getState().isSpectating) return;
    getRoom().removeNpc(data);
});

gmcpBus.on('Room.Items', (data) => {
    if (useModeStore.getState().isSpectating) return;
    getRoom().applyItemsUpdate(data);
});