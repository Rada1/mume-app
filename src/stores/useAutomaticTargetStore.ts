/** @file useAutomaticTargetStore.ts — Holds the latest user-selected automatic target for the target chip. */

// --- Logic Section ---
import { create } from 'zustand';
import { useEffect } from 'react';

interface AutomaticTargetState {
    target: string | null;
    roomKey: string | null;
    setTarget: (target: string | null, roomKey?: string | null) => void;
    clearIfRoomChanged: (roomKey: string) => void;
}

export const useAutomaticTargetStore = create<AutomaticTargetState>((set, get) => ({
    target: null,
    roomKey: null,
    setTarget: (target, roomKey) => set({ target, roomKey: target ? roomKey || null : null }),
    clearIfRoomChanged: roomKey => {
        const current = get();
        if (current.target && current.roomKey !== roomKey) set({ target: null, roomKey: null });
    }
}));

export { getRoomIdentityKey as getAutomaticTargetRoomKey } from '../utils/roomIdentityUtils';

export const useAutomaticTargetForRoom = (roomKey: string): string | null => {
    const target = useAutomaticTargetStore(state => state.target);
    const storedRoomKey = useAutomaticTargetStore(state => state.roomKey);
    const clearIfRoomChanged = useAutomaticTargetStore(state => state.clearIfRoomChanged);

    useEffect(() => {
        if (target && storedRoomKey !== roomKey) clearIfRoomChanged(roomKey);
    }, [clearIfRoomChanged, roomKey, storedRoomKey, target]);

    return storedRoomKey === roomKey ? target : null;
};
