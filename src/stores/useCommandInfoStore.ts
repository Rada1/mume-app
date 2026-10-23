/** @file useCommandInfoStore.ts — Remember the command panel character-info disclosure state. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Info Visibility Section ---
export const useCommandInfoStore = create<{
    collapsed: boolean;
    toggle: () => void;
}>()(persist(set => ({
    collapsed: false,
    toggle: () => set(state => ({ collapsed: !state.collapsed }))
}), { name: 'mume-command-info' }));
