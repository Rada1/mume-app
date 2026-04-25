import { create } from 'zustand';
import { PopoverState } from '../types';

interface MumeEditState {
    isOpen: boolean;
    title: string;
    text: string;
    key: string;
}

export type DrawerType = 'none' | 'stats' | 'character' | 'inventory' | 'equipment' | 'players' | 'session-log' | 'map' | 'settings' | 'library' | 'actions' | 'help' | 'diagnostic';

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
    settingsTab: 'general' | 'sound' | 'actions' | 'buttons' | 'help';
    diagnosticLogs: string[];
    showReplayHud: boolean;
    characterTab: 'info' | 'practice' | 'quests';
    
    setManagerOpen: boolean;
    // Header Menu State
    isMenuOpen: boolean;
    isSetMenuOpen: boolean;
    menuView: 'main' | 'availableSets';
    
    // Keyword Edit UI
    keywordEditState: { context: string; displayText: string } | null;
    keywordFailureBanner: { context: string; displayText: string } | null;
    selectedObjectIds: Set<string>;

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
    setSelectedObjectIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    toggleObjectSelection: (id: string, setId?: string) => void;
    clearObjectSelection: () => void;

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
    mapExpanded: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
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
    setManagerOpen: false,
    isMenuOpen: false,
    isSetMenuOpen: false,
    menuView: 'main',
    keywordEditState: null,
    keywordFailureBanner: null,
    selectedObjectIds: new Set<string>(),

    setIsCharacterOpen: (open) => set({ isCharacterOpen: open, drawer: open ? 'character' : 'none' }),
    setIsStatsOpen: (open) => set({ isStatsOpen: open, drawer: open ? 'stats' : 'none' }),
    setIsInventoryOpen: (open) => set({ isInventoryOpen: open, drawer: open ? 'inventory' : 'none' }),
    setIsEquipmentOpen: (open) => set({ isEquipmentOpen: open, drawer: open ? 'equipment' : 'none' }),
    setIsPlayersOpen: (open) => set({ isPlayersOpen: open, drawer: open ? 'players' : 'none' }),
    
    setDrawer: (drawer) => set({ 
        drawer,
        isCharacterOpen: drawer === 'character',
        isStatsOpen: drawer === 'stats',
        isInventoryOpen: drawer === 'inventory',
        isEquipmentOpen: drawer === 'equipment',
        isPlayersOpen: drawer === 'players'
    }),
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
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'buttons' | 'help') => set({ settingsTab: tab }),
    addDiagnosticLog: (msg) => set((state) => ({ 
        diagnosticLogs: [msg, ...state.diagnosticLogs].slice(0, 50) 
    })),
    setShowReplayHud: (show) => set({ showReplayHud: show }),
    setKeywordEditState: (state) => set({ keywordEditState: state }),
    setKeywordFailureBanner: (state) => set({ keywordFailureBanner: state }),
    setSelectedObjectIds: (updater) => set((state) => ({ 
        selectedObjectIds: typeof updater === 'function' ? updater(state.selectedObjectIds) : updater 
    })),
    toggleObjectSelection: (id, setId) => set((state) => {
        const next = setId ? new Set<string>(state.selectedObjectIds) : new Set<string>();
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedObjectIds: next };
    }),
    clearObjectSelection: () => set({ selectedObjectIds: new Set() }),

    setUI: (updater) => set((state) => {
        const next = typeof updater === 'function' ? updater(state) : updater;
        return { 
            ...next,
            isCharacterOpen: next.drawer === 'character',
            isStatsOpen: next.drawer === 'stats',
            isInventoryOpen: next.drawer === 'inventory',
            isEquipmentOpen: next.drawer === 'equipment',
            isPlayersOpen: next.drawer === 'players'
        };
    }),

    openCharacter: () => set({ isCharacterOpen: true, drawer: 'character' }),
    closeCharacter: () => set({ isCharacterOpen: false, drawer: 'none' }),
    openStats: () => set({ isStatsOpen: true, drawer: 'stats' }),
    closeStats: () => set({ isStatsOpen: false, drawer: 'none' }),
    openInventory: () => set({ isInventoryOpen: true, drawer: 'inventory' }),
    closeInventory: () => set({ isInventoryOpen: false, drawer: 'none' }),
    openEquipment: () => set({ isEquipmentOpen: true, drawer: 'equipment' }),
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