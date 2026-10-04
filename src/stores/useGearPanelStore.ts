/** @file useGearPanelStore.ts — Visibility of the equipment and inventory panel. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActiveDockedPanelStore } from './useActiveDockedPanelStore';

interface GearPanelState {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const useGearPanelStore = create<GearPanelState>()(
    persist(set => ({
        isOpen: false,
        setIsOpen: isOpen => {
            set({ isOpen });
            const activeStore = useActiveDockedPanelStore.getState();
            if (isOpen) activeStore.setActivePanel('gear');
            else if (activeStore.activePanel === 'gear') activeStore.setActivePanel(null);
        },
    }), { name: 'mume-gear-panel' })
);
