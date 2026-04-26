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
    const mode = useModeStore.getState();
    if (mode.isSpectating || (data as any).isSnooped) return;
    useRoomStore.getState().applyRoomInfo(data);
});

gmcpBus.on('Room.UpdateExits', (data) => {
    if ((data as any).isSnooped) return;
    useRoomStore.getState().applyExitsUpdate(data);
});

gmcpBus.on('Room.Items', (data) => {
    if ((data as any).isSnooped) return;
    useRoomStore.getState().setItems(data as any);
});

gmcpBus.on('Room.Chars', (data) => {
    if ((data as any).isSnooped) return;
    // setChars is already updated by useGmcpOccupants hook, but we could do it here
});

gmcpBus.on('Room.AddChar', (data) => {
    if ((data as any).isSnooped) return;
    useRoomStore.getState().addChar(data);
});

gmcpBus.on('Room.UpdateChar', (data) => {
    if ((data as any).isSnooped) return;
    useRoomStore.getState().updateChar(data);
});

gmcpBus.on('Room.RemoveChar', (data) => {
    if ((data as any).isSnooped) return;
    useRoomStore.getState().removeChar(data);
});

export const getRoom = () => useRoomStore.getState();
