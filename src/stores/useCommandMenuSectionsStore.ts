/** @file useCommandMenuSectionsStore.ts — Remember collapsed command menu sections across openings and reloads. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Section Preferences Section ---
export const useCommandMenuSectionsStore = create<{
    collapsed: Record<string, boolean>;
    toggle: (key: string) => void;
}>()(persist(set => ({
    collapsed: {},
    toggle: key => set(state => {
        const collapsed = { ...state.collapsed };
        if (collapsed[key]) delete collapsed[key];
        else collapsed[key] = true;
        return { collapsed };
    })
}), { name: 'mume-command-menu-sections' }));
