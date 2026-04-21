/**
 * @file useSettingsStore.ts
 * @description Persistent user settings store for the MUME client.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UiMode, TeleportTarget } from '../types';

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
    
    // UI Behavior
    disable3dScroll: boolean;
    disableSmoothScroll: boolean;
    isImmersionMode: boolean;
    isTimestampEnabled: boolean;
    showRecordingIndicator: boolean;
    showDebugEchoes: boolean;
    showLegacyButtons: boolean;
    showSpectatePromptInLog: boolean;
    showControls: boolean;
    showOrganicTerrain: boolean;
    
    // Game/Mechanics
    isSoundEnabled: boolean;
    isNewbieMode: boolean;
    isNoviceMode: boolean;
    isMmapperMode: boolean;
    autoSaveSessions: boolean;
    soundTriggers: import('../types').SoundTrigger[];
    teleportTargets: TeleportTarget[];
    inlineCategories: string[];
    favorites: string[];
    zoneMusic: boolean;

    // Mapper Context Settings
    allowMapPersistence: boolean;
    unveilMap: boolean;
    
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
    setDisable3dScroll: (val: boolean) => void;
    setDisableSmoothScroll: (val: boolean) => void;
    setIsImmersionMode: (val: boolean) => void;
    setIsTimestampEnabled: (val: boolean) => void;
    setShowRecordingIndicator: (val: boolean) => void;
    setShowDebugEchoes: (val: boolean) => void;
    setShowLegacyButtons: (val: boolean) => void;
    setShowSpectatePromptInLog: (val: boolean) => void;
    setShowControls: (val: boolean) => void;
    setShowOrganicTerrain: (val: boolean) => void;
    setIsSoundEnabled: (val: boolean) => void;
    setIsNewbieMode: (val: boolean) => void;
    setIsNoviceMode: (val: boolean) => void;
    setIsMmapperMode: (val: boolean) => void;
    setAutoSaveSessions: (val: boolean) => void;
    setSoundTriggers: (val: import('../types').SoundTrigger[]) => void;
    setTeleportTargets: (val: TeleportTarget[]) => void;
    setInlineCategories: (val: string[]) => void;
    setFavorites: (val: string[]) => void;
    setZoneMusic: (val: boolean) => void;
    setAllowMapPersistence: (val: boolean) => void;
    setUnveilMap: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Default Values
            connectionUrl: 'ws://localhost:8081',
            autoConnect: true,
            loginName: '',
            loginPassword: '',
            
            theme: 'dark',
            accentColor: '#f48f3c',
            bgImage: null,
            fontFamily: 'Inter, system-ui, sans-serif',
            uiMode: 'auto',
            isBloomEnabled: true,
            isHighlighterEnabled: true,
            objectColor: 'rgba(251, 146, 60, 0.95)',
            playerColor: 'rgba(125, 211, 252, 0.9)',
            npcColor: 'rgba(253, 224, 71, 0.95)',
            
            disable3dScroll: false,
            disableSmoothScroll: false,
            isImmersionMode: true,
            isTimestampEnabled: false,
            showRecordingIndicator: true,
            showDebugEchoes: false,
            showLegacyButtons: false,
            showSpectatePromptInLog: false,
            showControls: true,
            showOrganicTerrain: true,
            
            isSoundEnabled: true,
            isNewbieMode: false,
            isNoviceMode: true,
            isMmapperMode: false,
            autoSaveSessions: false,
            soundTriggers: [],
            teleportTargets: [],
            inlineCategories: [],
            favorites: [],
            zoneMusic: true,

            allowMapPersistence: true,
            unveilMap: false,

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
            setDisable3dScroll: (disable3dScroll) => set({ disable3dScroll }),            setDisableSmoothScroll: (disableSmoothScroll) => set({ disableSmoothScroll }),
            setIsImmersionMode: (isImmersionMode) => set({ isImmersionMode }),
            setIsTimestampEnabled: (isTimestampEnabled) => set({ isTimestampEnabled }),
            setShowRecordingIndicator: (showRecordingIndicator) => set({ showRecordingIndicator }),
            setShowDebugEchoes: (showDebugEchoes) => set({ showDebugEchoes }),
            setShowLegacyButtons: (showLegacyButtons) => set({ showLegacyButtons }),
            setShowSpectatePromptInLog: (showSpectatePromptInLog) => set({ showSpectatePromptInLog }),
            setShowControls: (showControls) => set({ showControls }),
            setShowOrganicTerrain: (showOrganicTerrain) => set({ showOrganicTerrain }),
            setIsSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
            setIsNewbieMode: (isNewbieMode) => set({ isNewbieMode }),
            setIsNoviceMode: (isNoviceMode) => set({ isNoviceMode }),
            setIsMmapperMode: (isMmapperMode) => set({ isMmapperMode }),
            setAutoSaveSessions: (autoSaveSessions) => set({ autoSaveSessions }),
            setSoundTriggers: (soundTriggers) => set({ soundTriggers }),
            setTeleportTargets: (teleportTargets) => set({ teleportTargets }),
            setInlineCategories: (inlineCategories) => set({ inlineCategories }),
            setFavorites: (favorites) => set({ favorites }),
            setZoneMusic: (zoneMusic) => set({ zoneMusic }),
            setAllowMapPersistence: (allowMapPersistence) => set({ allowMapPersistence }),
            setUnveilMap: (unveilMap) => set({ unveilMap }),
        }),
        {
            name: 'mume-settings-storage',
        }
    )
);

export const getSettings = () => useSettingsStore.getState();
