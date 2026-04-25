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
    if (!data.isSnooped) return;
    getSpectateRoom().applyRoomInfo(data);
});

gmcpBus.on('Room.UpdateExits', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().applyExitsUpdate(data);
});

gmcpBus.on('Room.AddPlayer', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().addPlayer(data);
});

gmcpBus.on('Room.RemovePlayer', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().removePlayer(data);
});

gmcpBus.on('Room.Players', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().setPlayers(data as any);
});

gmcpBus.on('Room.Npcs', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().setNpcs(data as any);
});

gmcpBus.on('Room.AddNpc', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().addNpc(data);
});

gmcpBus.on('Room.RemoveNpc', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().removeNpc(data);
});

gmcpBus.on('Room.Items', (data) => {
    if (!data.isSnooped) return;
    getSpectateRoom().applyItemsUpdate(data as any);
});