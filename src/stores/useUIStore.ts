import { create } from 'zustand';
import { PopoverState } from '../types';

interface MumeEditState {
    isOpen: boolean;
    title: string;
    text: string;
    key: string;
}

interface UIState {
    isCharacterOpen: boolean;
    isStatsOpen: boolean;
    isInventoryOpen: boolean;
    isEquipmentOpen: boolean;
    isPlayersOpen: boolean;
    popoverState: PopoverState | null;
    mumeEditState: MumeEditState;
    isNewbieMode: boolean;

    setIsCharacterOpen: (open: boolean) => void;
    setIsStatsOpen: (open: boolean) => void;
    setIsInventoryOpen: (open: boolean) => void;
    setIsEquipmentOpen: (open: boolean) => void;
    setIsPlayersOpen: (open: boolean) => void;
    setPopoverState: (state: PopoverState | null) => void;
    setMumeEditState: (state: MumeEditState) => void;
    setIsNewbieMode: (mode: boolean) => void;

    openCharacter: () => void;
    closeCharacter: () => void;
    openStats: () => void;
    closeStats: () => void;
    openInventory: () => void;
    closeInventory: () => void;
    openEquipment: () => void;
    closeEquipment: () => void;
    openPlayers: () => void;
    closePlayers: () => void;
    closeAllPanels: () => void;
}

const defaultMumeEditState: MumeEditState = {
    isOpen: false,
    title: '',
    text: '',
    key: ''
};

export const useUIStore = create<UIState>((set) => ({
    isCharacterOpen: false,
    isStatsOpen: false,
    isInventoryOpen: false,
    isEquipmentOpen: false,
    isPlayersOpen: false,
    popoverState: null,
    mumeEditState: defaultMumeEditState,
    isNewbieMode: true,

    setIsCharacterOpen: (open) => set({ isCharacterOpen: open }),
    setIsStatsOpen: (open) => set({ isStatsOpen: open }),
    setIsInventoryOpen: (open) => set({ isInventoryOpen: open }),
    setIsEquipmentOpen: (open) => set({ isEquipmentOpen: open }),
    setIsPlayersOpen: (open) => set({ isPlayersOpen: open }),
    setPopoverState: (state) => set({ popoverState: state }),
    setMumeEditState: (state) => set({ mumeEditState: state }),
    setIsNewbieMode: (mode) => set({ isNewbieMode: mode }),

    openCharacter: () => set({ isCharacterOpen: true }),
    closeCharacter: () => set({ isCharacterOpen: false }),
    openStats: () => set({ isStatsOpen: true }),
    closeStats: () => set({ isStatsOpen: false }),
    openInventory: () => set({ isInventoryOpen: true }),
    closeInventory: () => set({ isInventoryOpen: false }),
    openEquipment: () => set({ isEquipmentOpen: true }),
    closeEquipment: () => set({ isEquipmentOpen: false }),
    openPlayers: () => set({ isPlayersOpen: true }),
    closePlayers: () => set({ isPlayersOpen: false }),
    
    closeAllPanels: () => set({
        isCharacterOpen: false,
        isStatsOpen: false,
        isInventoryOpen: false,
        isEquipmentOpen: false,
        isPlayersOpen: false,
    })
}));

export const getUI = () => useUIStore.getState();