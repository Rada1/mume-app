/**
 * @file useSpectateLiveRoomStore.ts
 * @description Live ingest store for raw spectated character room data.
 */

import { create } from 'zustand';
import { gmcpBus } from '../../events/gmcpBus';
import { GmcpOccupant } from '../../types';
import {
    RoomState,
    initialRoomState,
    createRoomActions
} from '../slices/roomSlice';

export const useSpectateLiveRoomStore = create<RoomState>((set, get) => ({
    ...initialRoomState,
    ...createRoomActions(set, get)
}));

export const getSpectateLiveRoom = () => useSpectateLiveRoomStore.getState();

const isRecord = (data: unknown): data is Record<string, unknown> =>
    !!data && typeof data === 'object';

const isSnooped = (data: unknown) =>
    isRecord(data) && (!!data.isSnooped || !!data.spectating);

// --- Logic Section ---

gmcpBus.on('Room.Info', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveRoom().applyRoomInfo(data);
});

gmcpBus.on('Room.UpdateExits', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveRoom().applyExitsUpdate(data);
});

gmcpBus.on('Room.AddChar', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveRoom().addChar(data);
});

gmcpBus.on('Room.RemoveChar', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveRoom().removeChar(data);
});

gmcpBus.on('Room.Chars', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveRoom().setChars(data as Record<number, GmcpOccupant>);
});

gmcpBus.on('Room.Items', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveRoom().applyItemsUpdate(data as GmcpOccupant[]);
});
