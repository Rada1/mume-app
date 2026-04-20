import { create } from 'zustand';
import { PopoverState } from '../types';

interface MumeEditState {
    isOpen: boolean;
    title: string;
    text: string;
    key: string;
}

export type DrawerType = 'none' | 'left' | 'right' | 'stats' | 'inv' | 'eq' | 'players' | 'map' | 'settings' | 'library' | 'actions' | 'help' | 'diagnostic';

interface UIState {
    // Legacy mapping compatibility
    isCharacterOpen: boolean;
    isStatsOpen: boolean;
    isInventoryOpen: boolean;
    isEquipmentOpen: boolean;
    isPlayersOpen: boolean;
    
    // New structure
    drawer: DrawerType;
    isDrawerPeeking: boolean;
    mapExpanded: boolean;
    popoverState: PopoverState | null;
    mumeEditState: MumeEditState;
    isNewbieMode: boolean;
    isSettingsOpen: boolean;
    isLibraryOpen: boolean;
    isButtonsOpen: boolean;
    settingsTab: 'general' | 'sound' | 'actions' | 'help';
    diagnosticLogs: string[];
    showReplayHud: boolean;
    characterTab: 'info' | 'practice' | 'quests';
    
    // Keyword Edit UI
    keywordEditState: { context: string; displayText: string } | null;
    keywordFailureBanner: { context: string; displayText: string } | null;

    // Actions
    setIsCharacterOpen: (open: boolean) => void;
    setIsStatsOpen: (open: boolean) => void;
    setIsInventoryOpen: (open: boolean) => void;
    setIsEquipmentOpen: (open: boolean) => void;
    setIsPlayersOpen: (open: boolean) => void;
    
    setDrawer: (drawer: DrawerType) => void;
    setIsDrawerPeeking: (peeking: boolean) => void;
    setMapExpanded: (expanded: boolean) => void;
    
    setPopoverState: (state: PopoverState | null) => void;
    setMumeEditState: (state: MumeEditState | ((prev: MumeEditState) => MumeEditState)) => void;
    setIsNewbieMode: (mode: boolean) => void;
    setIsSettingsOpen: (open: boolean) => void;
    setIsLibraryOpen: (open: boolean) => void;
    setIsButtonsOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'help') => void;
    addDiagnosticLog: (msg: string) => void;
    setShowReplayHud: (show: boolean) => void;
    setKeywordEditState: (state: { context: string; displayText: string } | null) => void;
    setKeywordFailureBanner: (state: { context: string; displayText: string } | null) => void;

    // Generic Updater for legacy compatibility
    setUI: (update: Partial<UIState> | ((prev: UIState) => UIState)) => void;

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
    
    drawer: 'none',
    isDrawerPeeking: false,
    mapExpanded: false,
    popoverState: null,
    mumeEditState: defaultMumeEditState,
    isNewbieMode: true,
    isSettingsOpen: false,
    isLibraryOpen: false,
    isButtonsOpen: false,
    settingsTab: 'general',
    diagnosticLogs: [],
    showReplayHud: false,
    characterTab: 'info',
    keywordEditState: null,
    keywordFailureBanner: null,

    setIsCharacterOpen: (open) => set({ isCharacterOpen: open, drawer: open ? 'left' : 'none' }),
    setIsStatsOpen: (open) => set({ isStatsOpen: open, drawer: open ? 'stats' : 'none' }),
    setIsInventoryOpen: (open) => set({ isInventoryOpen: open, drawer: open ? 'inv' : 'none' }),
    setIsEquipmentOpen: (open) => set({ isEquipmentOpen: open, drawer: open ? 'eq' : 'none' }),
    setIsPlayersOpen: (open) => set({ isPlayersOpen: open, drawer: open ? 'players' : 'none' }),
    
    setDrawer: (drawer) => set({ drawer }),
    setIsDrawerPeeking: (peeking) => set({ isDrawerPeeking: peeking }),
    setMapExpanded: (expanded) => set({ mapExpanded: expanded }),

    setPopoverState: (state) => set({ popoverState: state }),
    setMumeEditState: (updater) => set((state) => ({ 
        mumeEditState: typeof updater === 'function' ? updater(state.mumeEditState) : updater 
    })),
    setIsNewbieMode: (mode) => set({ isNewbieMode: mode }),
    setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
    setIsLibraryOpen: (open) => set({ isLibraryOpen: open }),
    setIsButtonsOpen: (open) => set({ isButtonsOpen: open }),
    setSettingsTab: (tab) => set({ settingsTab: tab }),
    addDiagnosticLog: (msg) => set((state) => ({ 
        diagnosticLogs: [msg, ...state.diagnosticLogs].slice(0, 50) 
    })),
    setShowReplayHud: (show) => set({ showReplayHud: show }),
    setKeywordEditState: (state) => set({ keywordEditState: state }),
    setKeywordFailureBanner: (state) => set({ keywordFailureBanner: state }),

    setUI: (updater) => set((state) => {
        const next = typeof updater === 'function' ? updater(state) : updater;
        return { ...next };
    }),

    openCharacter: () => set({ isCharacterOpen: true, drawer: 'left' }),
    closeCharacter: () => set({ isCharacterOpen: false, drawer: 'none' }),
    openStats: () => set({ isStatsOpen: true, drawer: 'stats' }),
    closeStats: () => set({ isStatsOpen: false, drawer: 'none' }),
    openInventory: () => set({ isInventoryOpen: true, drawer: 'inv' }),
    closeInventory: () => set({ isInventoryOpen: false, drawer: 'none' }),
    openEquipment: () => set({ isEquipmentOpen: true, drawer: 'eq' }),
    closeEquipment: () => set({ isEquipmentOpen: false, drawer: 'none' }),
    openPlayers: () => set({ isPlayersOpen: true, drawer: 'players' }),
    closePlayers: () => set({ isPlayersOpen: false, drawer: 'none' }),

    closeAllPanels: () => set({
        isCharacterOpen: false,
        isStatsOpen: false,
        isInventoryOpen: false,
        isEquipmentOpen: false,
        isPlayersOpen: false,
        drawer: 'none'
    })
}));

export const getUI = () => useUIStore.getState();