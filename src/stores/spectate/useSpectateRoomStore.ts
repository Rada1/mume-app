/**
 * @file useSpectateRoomStore.ts
 * @description Display store for the spectated character's visible room data.
 */

import { create } from 'zustand';
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
