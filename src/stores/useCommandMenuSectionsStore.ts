/** @file useCommandMenuSectionsStore.ts — Remember collapsed command menu sections across openings and reloads. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Section Preferences Section ---
export const getCommandMenuSectionKey = (menu: string, section: string) => JSON.stringify([menu, section]);

export const useCommandMenuSectionsStore = create<{
    collapsed: Record<string, boolean>;
    toggle: (key: string) => void;
    expand: (key: string) => void;
}>()(persist(set => ({
    collapsed: {},
    toggle: key => set(state => {
        const collapsed = { ...state.collapsed };
        if (collapsed[key]) delete collapsed[key];
        else collapsed[key] = true;
        return { collapsed };
    }),
    expand: key => set(state => {
        if (!state.collapsed[key]) return state;
        const collapsed = { ...state.collapsed };
        delete collapsed[key];
        return { collapsed };
    })
}), { name: 'mume-command-menu-sections' }));
