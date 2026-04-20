/**
 * @file useSpectateRoomStore.ts
 * @description Store for spectated character's current room. Gated to ONLY update during spectate sessions.
 */

import { create } from 'zustand';
import { useModeStore } from '../useModeStore';
import { gmcpBus } from '../../events/gmcpBus';
import { 
    RoomState, 
    initialRoomState, 
    createRoomActions 
} from '../slices/roomSlice';

export const useSpectateRoomStore = create<RoomState>((set, get) => ({
    ...initialRoomState,
    ...createRoomActions(set, get)
}));

export const getSpectateRoom = () => useSpectateRoomStore.getState();

// --- Event Subscriptions ---

gmcpBus.on('Room.Info', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().applyRoomInfo(data);
});

gmcpBus.on('Room.Exits', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().applyExitsUpdate(data);
});

gmcpBus.on('Room.AddPlayer', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().addPlayer(data);
});

gmcpBus.on('Room.RemovePlayer', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().removePlayer(data);
});

gmcpBus.on('Room.AddNPC', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().addNpc(data);
});

gmcpBus.on('Room.RemoveNPC', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().removeNpc(data);
});

gmcpBus.on('Room.Items', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateRoom().applyItemsUpdate(data);
});
