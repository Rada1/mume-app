/**
 * @file useKillPromptStore.ts
 * @description Tracks recently killed mobs so the room loot list can include their corpses.
 */

import { create } from 'zustand';
import { useRoomStore } from './useRoomStore';

export interface KillPrompt {
    id: string;
    name: string;
    at: number;
    roomNum: number;
}

interface KillPromptState {
    corpses: KillPrompt[];
    showKill: (name: string, roomNum: number) => void;
    clearKill: () => void;
    removeCorpse: (id: string) => void;
    retainRoom: (roomNum: number) => void;
}

export const useKillPromptStore = create<KillPromptState>((set) => ({
    corpses: [],
    showKill: (name, roomNum) => set((state) => {
        const corpse = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            at: Date.now(),
            roomNum
        };
        return { corpses: [...state.corpses, corpse] };
    }),
    clearKill: () => set({ corpses: [] }),
    removeCorpse: (id) => set(state => ({
        corpses: state.corpses.filter(corpse => corpse.id !== id)
    })),
    retainRoom: (roomNum) => set(state => ({
        corpses: state.corpses.filter(corpse => corpse.roomNum === roomNum)
    }))
}));

// Module helper so non-React parser code can fire the prompt.
export const triggerKillPrompt = (name: string) =>
    useKillPromptStore.getState().showKill(name, useRoomStore.getState().roomNum);
