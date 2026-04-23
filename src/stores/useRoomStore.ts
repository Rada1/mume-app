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

gmcpBus.on('Room.Items', (data) => {
    if (useModeStore.getState().isSpectating) return;
    useRoomStore.getState().setItems(data as any);
});

// Occupant Add/Remove events are handled by useGmcpOccupants.ts in GameContext 
// to allow for sophisticated classification, animation triggers, and entity registration.

// NPC Add/Remove events are also handled by useGmcpOccupants.ts

export const getRoom = () => useRoomStore.getState();
