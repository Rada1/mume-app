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
    if (!(data as any).isSnooped) return;
    getSpectateRoom().applyRoomInfo(data);
});

gmcpBus.on('Room.UpdateExits', (data) => {
    if (!(data as any).isSnooped) return;
    getSpectateRoom().applyExitsUpdate(data);
});

gmcpBus.on('Room.AddChar', (data) => {
    if (!(data as any).isSnooped) return;
    getSpectateRoom().addChar(data);
});

gmcpBus.on('Room.RemoveChar', (data) => {
    if (!(data as any).isSnooped) return;
    getSpectateRoom().removeChar(data);
});

gmcpBus.on('Room.Chars', (data) => {
    if (!(data as any).isSnooped) return;
    getSpectateRoom().setChars(data as any);
});







gmcpBus.on('Room.Items', (data) => {
    if (!(data as any).isSnooped) return;
    getSpectateRoom().applyItemsUpdate(data as any);
});