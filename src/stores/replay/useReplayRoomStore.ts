/**
 * @file useReplayRoomStore.ts
 * @description Isolated Zustand store for room and occupant state during replay (theater) mode.
 * Matches the interface of the main RoomStore but is driven by the ReplayEngine.
 */

import { create } from 'zustand';
import { initialRoomState, createRoomActions, RoomState } from '../slices/roomSlice';

export type ReplayRoomStore = RoomState & {
    loadSnapshot: (data: Partial<RoomState>) => void;
};

export const useReplayRoomStore = create<ReplayRoomStore>((set, get) => ({
    ...initialRoomState,
    ...createRoomActions(set, get),
    loadSnapshot: (data) => set(data as any),
}));
