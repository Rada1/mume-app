/** @file useGearPanelStore.ts — Visibility of the equipment and inventory panel. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GearPanelState {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const useGearPanelStore = create<GearPanelState>()(
    persist(set => ({
        isOpen: false,
        setIsOpen: isOpen => set({ isOpen }),
    }), { name: 'mume-gear-panel' })
);
