/** @file useAutomaticTargetStore.ts — Holds the latest user-selected automatic target for the target chip. */

// --- Logic Section ---
import { create } from 'zustand';
import { useEffect } from 'react';
import { isTargetSuggestionMatch, type CommandTargetSuggestion } from '../utils/commandSuggestionUtils';

interface AutomaticTargetState {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    target: string | null;
    roomKey: string | null;
    setTarget: (target: string | null, roomKey?: string | null) => void;
    clearIfRoomChanged: (roomKey: string) => void;
}

export const useAutomaticTargetStore = create<AutomaticTargetState>((set, get) => ({
    enabled: false,
    setEnabled: enabled => set({ enabled, target: null, roomKey: null }),
    target: null,
    roomKey: null,
    setTarget: (target, roomKey) => set({ target, roomKey: target ? roomKey || null : null }),
    clearIfRoomChanged: roomKey => {
        const current = get();
        if (current.target && current.roomKey !== roomKey) set({ target: null, roomKey: null });
    }
}));

export { getRoomIdentityKey as getAutomaticTargetRoomKey } from '../utils/roomIdentityUtils';

export const useAutomaticTargetForRoom = (
    roomKey: string,
    availableTargets?: CommandTargetSuggestion[]
): string | null => {
    const target = useAutomaticTargetStore(state => state.target);
    const storedRoomKey = useAutomaticTargetStore(state => state.roomKey);
    const clearIfRoomChanged = useAutomaticTargetStore(state => state.clearIfRoomChanged);
    const targetIsAvailable = !availableTargets
        || availableTargets.some(suggestion => isTargetSuggestionMatch(suggestion, target));

    useEffect(() => {
        if (target && storedRoomKey !== roomKey) clearIfRoomChanged(roomKey);
    }, [clearIfRoomChanged, roomKey, storedRoomKey, target]);

    useEffect(() => {
        if (!target || storedRoomKey !== roomKey || !availableTargets) return;
        if (availableTargets.some(suggestion => isTargetSuggestionMatch(suggestion, target))) return;

        useAutomaticTargetStore.setState(current => current.target === target && current.roomKey === roomKey
            ? { target: null, roomKey: null }
            : current);
    }, [availableTargets, roomKey, storedRoomKey, target]);

    return storedRoomKey === roomKey && targetIsAvailable ? target : null;
};
