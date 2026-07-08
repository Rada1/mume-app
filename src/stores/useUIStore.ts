/**
 * @file useUIStore.ts
 * @description Zustand store for shared layout, drawer, and transient UI state.
 */

import { create } from 'zustand';
import { PopoverState, DrawerType, ObjectDragState, QuickButton } from '../types';
import type { ArchiveEditorContext } from './useArchiveStore';

export interface SelectedTargetInfo {
    id: string;
    setId?: string;
    category?: string;
    context?: string;
    displayName?: string;
    keyword?: string;
    accentColor?: string;
    menuDisplay?: 'list' | 'dial';
    parentNoun?: string;
}

export interface MumeEditState {
    isOpen: boolean;
    title: string;
    text: string;
    key: string;
    mode: 'edit' | 'view';
    context: ArchiveEditorContext | null;
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
    isShaperOpen: boolean;
    isShaperAccessOpen: boolean;
    settingsTab: 'general' | 'sound' | 'actions' | 'buttons' | 'map' | 'help' | 'replays';
    diagnosticLogs: string[];
    showReplayHud: boolean;
    characterTab: 'info' | 'practice' | 'quests';
    
    setManagerOpen: boolean;
    // Header Menu State
    isMenuOpen: boolean;
    isSetMenuOpen: boolean;
    menuView: 'main' | 'availableSets';
    mapMode: 'edit' | 'play';
    
    // Keyword Edit UI
    keywordEditState: { context: string; displayText: string } | null;
    keywordFailureBanner: { context: string; displayText: string } | null;
    selectedObjectIds: Set<string>;
    selectedTarget: SelectedTargetInfo | null;
    objectDragState: ObjectDragState | null;
    managerSelectedSet: string | null;
    
    // Tab States for Drawers
    gearTab: 'worn' | 'inv' | 'vicinity';
    playersTab: 'online' | 'nearby' | 'group';
    charTab: 'info' | 'quests' | 'skills' | 'achievements';

    // Quick buttons (ephemeral, session-only)
    quickButtons: QuickButton[];
    addQuickButton: (btn: { label: string; command: string }) => void;
    removeQuickButton: (id: string) => void;

    // Shop panel
    isShopOpen: boolean;
    setIsShopOpen: (open: boolean) => void;
    shopItems: import('../types').ShopItem[];
    setShopItems: (items: import('../types').ShopItem[]) => void;
    heldShopAction: 'buy' | 'show' | 'compare' | 'sell' | 'value' | null;
    setHeldShopAction: (action: 'buy' | 'show' | 'compare' | 'sell' | 'value' | null) => void;
    compareFirstTarget: number | null;
    setCompareFirstTarget: (num: number | null) => void;
    shopBalance: string | null;
    setShopBalance: (balance: string | null) => void;
    shopBalanceRequested: boolean;
    setShopBalanceRequested: (v: boolean) => void;
    shopkeeperName: string | null;
    setShopkeeperName: (name: string | null) => void;

    // Actions
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills' | 'achievements') => void;
    
    setDrawer: (drawer: DrawerType) => void;
    setIsDrawerPeeking: (peeking: boolean) => void;
    setMapExpanded: (expanded: boolean) => void;
    
    setPopoverState: (state: PopoverState | null) => void;
    setMumeEditState: (state: MumeEditState | ((prev: MumeEditState) => MumeEditState)) => void;
    setIsNewbieMode: (mode: boolean) => void;
    setIsSettingsOpen: (open: boolean) => void;
    setIsLibraryOpen: (open: boolean) => void;
    setIsButtonsOpen: (open: boolean) => void;
    setIsShaperOpen: (open: boolean) => void;
    setIsShaperAccessOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'buttons' | 'map' | 'help' | 'replays') => void;
    addDiagnosticLog: (msg: string) => void;
    setShowReplayHud: (show: boolean) => void;
    setKeywordEditState: (state: { context: string; displayText: string } | null) => void;
    setKeywordFailureBanner: (state: { context: string; displayText: string } | null) => void;
    setSelectedObjectIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    toggleObjectSelection: (info: SelectedTargetInfo) => void;
    clearObjectSelection: () => void;
    setObjectDragState: (state: ObjectDragState | null) => void;
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
    key: '',
    mode: 'edit',
    context: null
};

const isDesktopViewport = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

export const useUIStore = create<UIState>((set) => ({
    drawer: isDesktopViewport() ? 'account' : 'none',
    isDrawerPeeking: false,
    mapExpanded: typeof window !== 'undefined' ? isDesktopViewport() : true,
    popoverState: null,
    mumeEditState: defaultMumeEditState,
    isNewbieMode: false,
    isSettingsOpen: false,
    isLibraryOpen: false,
    isButtonsOpen: false,
    isShaperOpen: false,
    isShaperAccessOpen: false,
    settingsTab: 'general',
    diagnosticLogs: [],
    showReplayHud: false,
    characterTab: 'info',
    setManagerOpen: false,
    isMenuOpen: false,
    isSetMenuOpen: false,
    menuView: 'main',
    mapMode: 'play',
    keywordEditState: null,
    keywordFailureBanner: null,
    selectedObjectIds: new Set<string>(),
    selectedTarget: null,
    objectDragState: null,
    managerSelectedSet: null,
    
    quickButtons: [],
    addQuickButton: ({ label, command }) => set((state) => ({
        quickButtons: [...state.quickButtons, { id: `qb-${Date.now()}`, label, command }]
    })),
    removeQuickButton: (id) => set((state) => ({
        quickButtons: state.quickButtons.filter(b => b.id !== id)
    })),

    isShopOpen: false,
    setIsShopOpen: (open) => set({ isShopOpen: open }),
    shopItems: [],
    setShopItems: (items) => set({ shopItems: items }),
    heldShopAction: null,
    setHeldShopAction: (action) => set({ heldShopAction: action }),
    compareFirstTarget: null,
    setCompareFirstTarget: (num) => set({ compareFirstTarget: num }),
    shopBalance: null,
    setShopBalance: (balance) => set({ shopBalance: balance }),
    shopBalanceRequested: false,
    setShopBalanceRequested: (v) => set({ shopBalanceRequested: v }),
    shopkeeperName: null,
    setShopkeeperName: (name) => set({ shopkeeperName: name }),

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
    setIsShaperOpen: (open) => set({ isShaperOpen: open }),
    setIsShaperAccessOpen: (open) => set({ isShaperAccessOpen: open }),
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
    toggleObjectSelection: (info) => set((state) => {
        const isSame = state.selectedTarget?.id === info.id;
        if (isSame) {
            return { selectedObjectIds: new Set(), selectedTarget: null };
        }
        return {
            selectedObjectIds: new Set<string>([info.id]),
            selectedTarget: info,
        };
    }),
    clearObjectSelection: () => set({ selectedObjectIds: new Set(), selectedTarget: null }),
    setObjectDragState: (state) => set({ objectDragState: state }),
    setManagerSelectedSet: (setId) => set({ managerSelectedSet: setId }),
    setIsSetManagerOpen: (open) => set({ setManagerOpen: open }),

    setUI: (updater) => set((state) => (typeof updater === 'function' ? updater(state) : (updater as any))),

    closeAllPanels: () => set({
        drawer: 'none',
        isSettingsOpen: false,
        isLibraryOpen: false,
        isButtonsOpen: false,
        isShaperOpen: false,
        isShaperAccessOpen: false,
        setManagerOpen: false
    })
}));

export const getUI = () => useUIStore.getState();
