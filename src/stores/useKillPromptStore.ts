/**
 * @file useKillPromptStore.ts
 * @description Holds the most recent mob kill so the UI can offer a quick loot
 * prompt (a small card with a LOOT action) right after something dies.
 */

import { create } from 'zustand';

export interface KillPrompt {
    id: string;
    name: string;
    at: number;
}

interface KillPromptState {
    prompt: KillPrompt | null;
    showKill: (name: string) => void;
    clearKill: () => void;
}

export const useKillPromptStore = create<KillPromptState>((set) => ({
    prompt: null,
    showKill: (name) => set({
        prompt: {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            at: Date.now()
        }
    }),
    clearKill: () => set({ prompt: null })
}));

// Module helper so non-React parser code can fire the prompt.
export const triggerKillPrompt = (name: string) =>
    useKillPromptStore.getState().showKill(name);
