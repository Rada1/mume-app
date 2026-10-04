/** @file useActiveDockedPanelStore.ts — Selection for the shared docked panel slot. */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DockedPanelTab } from '../utils/dockedPanelUtils';

// --- Logic Section ---
export const useActiveDockedPanelStore = create<{
    activePanel: DockedPanelTab | null | undefined;
    setActivePanel: (panel: DockedPanelTab | null) => void;
}>()(
    persist(
        set => ({
            activePanel: undefined,
            setActivePanel: activePanel => set({ activePanel })
        }),
        { name: 'mume-active-docked-panel' }
    )
);
