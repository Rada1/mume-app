import { create } from 'zustand';
import { PopoverState, DrawerType } from '../types';

interface MumeEditState {
    isOpen: boolean;
    title: string;
    text: string;
    key: string;
}

export interface UIState {
    // Current active drawer
    drawer: DrawerType;
    isDrawerPeeking: boolean;
    mapExpanded: boolean;
    popoverState: PopoverState | null;
    mumeEditState: MumeEditState;
    isNewbieMode: boolean;
    isSettingsOpen: boolean;
    isLibraryOpen: boolean;
    isButtonsOpen: boolean;
    settingsTab: 'general' | 'sound' | 'actions' | 'buttons' | 'help' | 'traits';
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
    managerSelectedSet: string | null;
    
    // Tab States for Drawers
    gearTab: 'worn' | 'inv';
    playersTab: 'online' | 'nearby' | 'group';
    charTab: 'info' | 'quests' | 'skills';

    // Actions
    setGearTab: (tab: 'worn' | 'inv') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    
    setDrawer: (drawer: DrawerType) => void;
    setIsDrawerPeeking: (peeking: boolean) => void;
    setMapExpanded: (expanded: boolean) => void;
    
    setPopoverState: (state: PopoverState | null) => void;
    setMumeEditState: (state: MumeEditState | ((prev: MumeEditState) => MumeEditState)) => void;
    setIsNewbieMode: (mode: boolean) => void;
    setIsSettingsOpen: (open: boolean) => void;
    setIsLibraryOpen: (open: boolean) => void;
    setIsButtonsOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'buttons' | 'help' | 'traits') => void;
    addDiagnosticLog: (msg: string) => void;
    setShowReplayHud: (show: boolean) => void;
    setKeywordEditState: (state: { context: string; displayText: string } | null) => void;
    setKeywordFailureBanner: (state: { context: string; displayText: string } | null) => void;
    setSelectedObjectIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    toggleObjectSelection: (id: string, setId?: string) => void;
    clearObjectSelection: () => void;
    setManagerSelectedSet: (setId: string | null) => void;
    setIsSetManagerOpen: (open: boolean) => void;

    // Generic Updater
    setUI: (update: Partial<UIState> | ((prev: UIState) => UIState)) => void;
    closeAllPanels: () => void;
}

const defaultMumeEditState: MumeEditState = {
    isOpen: false,
    title: '',
    text: '',
    key: ''
};

export const useUIStore = create<UIState>((set) => ({
    drawer: 'none',
    isDrawerPeeking: false,
    mapExpanded: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    popoverState: null,
    mumeEditState: defaultMumeEditState,
    isNewbieMode: false,
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
    managerSelectedSet: null,
    
    gearTab: 'worn',
    playersTab: 'online',
    charTab: 'info',

    setGearTab: (tab) => set({ gearTab: tab }),
    setPlayersTab: (tab) => set({ playersTab: tab }),
    setCharTab: (tab) => set({ charTab: tab }),

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
    setManagerSelectedSet: (setId) => set({ managerSelectedSet: setId }),
    setIsSetManagerOpen: (open) => set({ setManagerOpen: open }),

    setUI: (updater) => set((state) => (typeof updater === 'function' ? updater(state) : (updater as any))),

    closeAllPanels: () => set({
        drawer: 'none',
        isSettingsOpen: false,
        isLibraryOpen: false,
        isButtonsOpen: false,
        setManagerOpen: false
    })
}));

export const getUI = () => useUIStore.getState();
