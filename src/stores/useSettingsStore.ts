/**
 * @file useSettingsStore.ts
 * @description Persistent user settings store for the MUME client.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UiMode, TeleportTarget, InlineCategoryConfig, ZoneMusicMapping } from '../types';
import { canonicalizeCategoryId } from '../utils/categorizationUtils';
import { DEFAULT_URL } from '../constants';

interface SettingsState {
    // Connection
    connectionUrl: string;
    autoConnect: boolean;
    loginName: string;
    loginPassword?: string; // Optional for auto-login
    
    // Appearance
    theme: 'dark' | 'light';
    accentColor: string;
    bgImage: string | null;
    fontFamily: string;
    uiMode: UiMode;
    isBloomEnabled: boolean;
    isHighlighterEnabled: boolean;
    objectColor: string;
    playerColor: string;
    npcColor: string;
    enemyColor: string;
    roomColor: string;
    
    // UI Behavior
    disableSmoothScroll: boolean;
    isImmersionMode: boolean;
    isTimestampEnabled: boolean;
    showDebugEchoes: boolean;
    showLegacyButtons: boolean;
    showSpectatePromptInLog: boolean;
    showControls: boolean;
    showOrganicTerrain: boolean;
    
    // Game/Mechanics
    isSoundEnabled: boolean;
    isNewbieMode: boolean;
    isMmapperMode: boolean;
    autoSaveSessions: boolean;
    soundTriggers: import('../types').SoundTrigger[];
    teleportTargets: TeleportTarget[];
    inlineCategories: InlineCategoryConfig[];
    favorites: string[];
    zoneMusic: ZoneMusicMapping[];
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;

    // Mapper Context Settings
    allowMapPersistence: boolean;
    unveilMap: boolean;
    showMapperToolbar: boolean;
    
    // Actions
    setConnectionUrl: (val: string) => void;
    setLoginName: (val: string) => void;
    setLoginPassword: (val: string) => void;
    setAutoConnect: (val: boolean) => void;
    setTheme: (val: 'dark' | 'light') => void;
    setAccentColor: (val: string) => void;
    setBgImage: (val: string | null) => void;
    setFontFamily: (val: string) => void;
    setUiMode: (val: UiMode) => void;
    setIsBloomEnabled: (val: boolean) => void;
    setIsHighlighterEnabled: (val: boolean) => void;
    setDisableSmoothScroll: (val: boolean) => void;
    setIsImmersionMode: (val: boolean) => void;
    setObjectColor: (val: string) => void;
    setPlayerColor: (val: string) => void;
    setNpcColor: (val: string) => void;
    setEnemyColor: (val: string) => void;
    setRoomColor: (val: string) => void;
    setIsTimestampEnabled: (val: boolean) => void;
    setShowDebugEchoes: (val: boolean) => void;
    setShowLegacyButtons: (val: boolean) => void;
    setShowSpectatePromptInLog: (val: boolean) => void;
    setShowControls: (val: boolean) => void;
    setShowOrganicTerrain: (val: boolean) => void;
    setIsSoundEnabled: (val: boolean) => void;
    setIsNewbieMode: (val: boolean) => void;
    setIsMmapperMode: (val: boolean) => void;
    setAutoSaveSessions: (val: boolean) => void;
    setSoundTriggers: (val: import('../types').SoundTrigger[]) => void;
    setTeleportTargets: (val: TeleportTarget[]) => void;
    setInlineCategories: (val: InlineCategoryConfig[] | ((prev: InlineCategoryConfig[]) => InlineCategoryConfig[])) => void;
    setFavorites: (val: string[] | ((prev: string[]) => string[])) => void;
    setZoneMusic: (val: ZoneMusicMapping[]) => void;
    setMasterVolume: (val: number) => void;
    setSfxVolume: (val: number) => void;
    setMusicVolume: (val: number) => void;
    setAllowMapPersistence: (val: boolean) => void;
    setUnveilMap: (val: boolean) => void;
    setShowMapperToolbar: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Default Values
            connectionUrl: DEFAULT_URL,
            autoConnect: true,
            loginName: '',
            loginPassword: '',
            
            theme: 'dark',
            accentColor: '#f48f3c',
            bgImage: null,
            fontFamily: "'Space Mono', monospace",
            uiMode: 'auto',
            isBloomEnabled: true,
            isHighlighterEnabled: true,
            objectColor: 'rgba(251, 146, 60, 0.95)',
            playerColor: '#89CFF0',
            npcColor: 'rgba(253, 224, 71, 0.95)',
            enemyColor: '#ef4444',
            roomColor: '#22c55e',
            
            disableSmoothScroll: false,
            isImmersionMode: true,
            isTimestampEnabled: false,
            showDebugEchoes: false,
            showLegacyButtons: false,
            showSpectatePromptInLog: true,
            showControls: true,
            showOrganicTerrain: true,
            
            isSoundEnabled: true,
            isNewbieMode: false,
            isMmapperMode: false,
            autoSaveSessions: false,
            soundTriggers: [],
            teleportTargets: [],
            inlineCategories: [],
            favorites: [],
            zoneMusic: [],
            masterVolume: 1.0,
            sfxVolume: 0.7,
            musicVolume: 0.5,

            allowMapPersistence: true,
            unveilMap: false,
            showMapperToolbar: false,

            // Setters
            setConnectionUrl: (connectionUrl) => set({ connectionUrl }),
            setLoginName: (loginName) => set({ loginName }),
            setLoginPassword: (loginPassword) => set({ loginPassword }),
            setAutoConnect: (autoConnect) => set({ autoConnect }),
            setTheme: (theme) => set({ theme }),
            setAccentColor: (accentColor) => set({ accentColor }),
            setBgImage: (bgImage) => set({ bgImage }),
            setFontFamily: (fontFamily) => set({ fontFamily }),
            setUiMode: (uiMode) => set({ uiMode }),
            setIsBloomEnabled: (isBloomEnabled) => set({ isBloomEnabled }),
            setIsHighlighterEnabled: (isHighlighterEnabled) => set({ isHighlighterEnabled }),
            setObjectColor: (objectColor) => set({ objectColor }),
            setPlayerColor: (playerColor) => set({ playerColor }),
            setNpcColor: (npcColor) => set({ npcColor }),
            setEnemyColor: (enemyColor) => set({ enemyColor }),
            setRoomColor: (roomColor) => set({ roomColor }),
            setDisableSmoothScroll: (disableSmoothScroll) => set({ disableSmoothScroll }),
            setIsImmersionMode: (isImmersionMode) => set({ isImmersionMode }),
            setIsTimestampEnabled: (isTimestampEnabled) => set({ isTimestampEnabled }),
            setShowDebugEchoes: (showDebugEchoes) => set({ showDebugEchoes }),
            setShowLegacyButtons: (showLegacyButtons) => set({ showLegacyButtons }),
            setShowSpectatePromptInLog: (showSpectatePromptInLog) => set({ showSpectatePromptInLog }),
            setShowControls: (showControls) => set({ showControls }),
            setShowOrganicTerrain: (showOrganicTerrain) => set({ showOrganicTerrain }),
            setIsSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
            setIsNewbieMode: (isNewbieMode) => set({ isNewbieMode }),
            setIsMmapperMode: (isMmapperMode) => set({ isMmapperMode }),
            setAutoSaveSessions: (autoSaveSessions) => set({ autoSaveSessions }),
            setSoundTriggers: (soundTriggers) => set({ soundTriggers }),
            setTeleportTargets: (teleportTargets) => set({ teleportTargets }),
            setInlineCategories: (val) => set((state) => ({ 
                inlineCategories: typeof val === 'function' ? val(state.inlineCategories) : val 
            })),
            setFavorites: (val) => set((state) => ({ 
                favorites: typeof val === 'function' ? val(state.favorites) : val 
            })),
            setZoneMusic: (zoneMusic) => set({ zoneMusic }),
            setMasterVolume: (masterVolume) => set({ masterVolume }),
            setSfxVolume: (sfxVolume) => set({ sfxVolume }),
            setMusicVolume: (musicVolume) => set({ musicVolume }),
            setAllowMapPersistence: (allowMapPersistence) => set({ allowMapPersistence }),
            setUnveilMap: (unveilMap) => set({ unveilMap }),
            setShowMapperToolbar: (showMapperToolbar) => set({ showMapperToolbar }),
        }),
        {
            name: 'mume-settings-storage',
            version: 2,
            migrate: (persistedState: any, version: number) => {
                if (version < 1) {
                    // Update category IDs to canonical format
                    if (persistedState.inlineCategories && Array.isArray(persistedState.inlineCategories)) {
                        persistedState.inlineCategories = persistedState.inlineCategories.map((cat: any) => {
                            if (typeof cat === 'object' && cat.id) {
                                return {
                                    ...cat,
                                    id: canonicalizeCategoryId(cat.id)
                                };
                            }
                            return cat;
                        });
                    }
                }
                
                if (version < 2) {
                    // Convert zoneMusic from boolean to array
                    if (typeof persistedState.zoneMusic === 'boolean') {
                        persistedState.zoneMusic = [];
                    }
                }
                
                return persistedState;
            }
        }
    )
);

export const getSettings = () => useSettingsStore.getState();
