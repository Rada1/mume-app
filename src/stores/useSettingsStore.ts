/**
 * @file useSettingsStore.ts
 * @description Persistent user settings store for the MUME client.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UiMode, TeleportTarget, InlineCategoryConfig, ZoneMusicMapping, CategoryOverride, CustomTraitConfig } from '../types';
import { canonicalizeCategoryId } from '../utils/categorizationUtils';
import { getKindForCategory, getTraitConfig, toCategoryId, toTraitId } from '../utils/inlineActionModel';
import { DEFAULT_URL } from '../constants';

interface SettingsState {
    connectionUrl: string;
    autoConnect: boolean;
    loginName: string;
    loginPassword?: string;
    rememberLogin: boolean;
    theme: 'dark' | 'light';
    accentColor: string;
    bgImage: string | null;
    bgImageBottom: string | null;
    fontFamily: string;
    uiMode: UiMode;
    isBloomEnabled: boolean;
    isHighlighterEnabled: boolean;
    objectColor: string;
    playerColor: string;
    npcColor: string;
    enemyColor: string;
    neutralColor: string;
    targetColor: string;
    roomColor: string;
    disableSmoothScroll: boolean;
    isImmersionMode: boolean;
    isTimestampEnabled: boolean;
    showDebugEchoes: boolean;
    showLegacyButtons: boolean;
    showSpectatePromptInLog: boolean;
    showControls: boolean;
    showOrganicTerrain: boolean;
    isSoundEnabled: boolean;
    isNewbieMode: boolean;
    isMmapperMode: boolean;
    autoSaveSessions: boolean;
    soundTriggers: import('../types').SoundTrigger[];
    teleportTargets: TeleportTarget[];
    categoryOverrides: CategoryOverride[];
    customTraits: CustomTraitConfig[];
    inlineCategories: InlineCategoryConfig[];
    favorites: string[];
    zoneMusic: ZoneMusicMapping[];
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    allowMapPersistence: boolean;
    unveilMap: boolean;
    showMapperToolbar: boolean;
    isTextRevealEnabled: boolean;
    setConnectionUrl: (val: string) => void;
    setLoginName: (val: string) => void;
    setLoginPassword: (val: string) => void;
    setRememberLogin: (val: boolean) => void;
    setAutoConnect: (val: boolean) => void;
    setTheme: (val: 'dark' | 'light') => void;
    setAccentColor: (val: string) => void;
    setBgImage: (val: string | null) => void;
    setBgImageBottom: (val: string | null) => void;
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
    setNeutralColor: (val: string) => void;
    setTargetColor: (val: string) => void;
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
    setTeleportTargets: (val: TeleportTarget[] | ((prev: TeleportTarget[]) => TeleportTarget[])) => void;
    setCategoryOverrides: (val: CategoryOverride[] | ((prev: CategoryOverride[]) => CategoryOverride[])) => void;
    setCustomTraits: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
    setInlineCategories: (val: InlineCategoryConfig[] | ((prev: InlineCategoryConfig[]) => InlineCategoryConfig[])) => void;
    setFavorites: (val: string[] | ((prev: string[]) => string[])) => void;
    setZoneMusic: (val: ZoneMusicMapping[]) => void;
    setMasterVolume: (val: number) => void;
    setSfxVolume: (val: number) => void;
    setMusicVolume: (val: number) => void;
    setAllowMapPersistence: (val: boolean) => void;
    setUnveilMap: (val: boolean) => void;
    setShowMapperToolbar: (val: boolean) => void;
    setIsTextRevealEnabled: (val: boolean) => void;
}

interface InlineActionBuckets {
    categoryOverrides: CategoryOverride[];
    customTraits: CustomTraitConfig[];
}

const splitInlineActionConfigs = (configs: InlineCategoryConfig[] = []): InlineActionBuckets => {
    const categoryOverrides: CategoryOverride[] = [];
    const customTraits: CustomTraitConfig[] = [];

    configs.forEach(config => {
        if (!config || typeof config !== 'object' || !config.id) return;
        const categoryId = toCategoryId(config.id);
        const traitId = toTraitId(config.id);
        const defaultTraitIds = Array.isArray(config.defaultTraitIds)
            ? config.defaultTraitIds.map(id => toTraitId(id) || id)
            : undefined;

        if (categoryId || defaultTraitIds || (!!config.color && !traitId && !config.id.startsWith('trait-'))) {
            categoryOverrides.push({
                id: categoryId || config.id,
                kind: config.kind,
                color: config.color,
                defaultTraitIds
            });
            return;
        }

        customTraits.push({
            id: traitId || (config.id.startsWith('trait-') ? config.id : `trait-${config.id.replace(/^inline-/, '')}`),
            kind: config.kind || 'object',
            keywords: config.keywords || [],
            buttonIds: (config as InlineCategoryConfig & { buttonIds?: string[] }).buttonIds
        });
    });

    return {
        categoryOverrides: dedupeById(categoryOverrides),
        customTraits: dedupeById(customTraits)
    };
};

const combineInlineActionConfigs = (
    categoryOverrides: CategoryOverride[] = [],
    customTraits: CustomTraitConfig[] = []
): InlineCategoryConfig[] => [
    ...categoryOverrides.map(override => ({
        id: toCategoryId(override.id) || override.id,
        kind: override.kind || getKindForCategory(override.id) || 'object',
        keywords: [],
        color: override.color,
        defaultTraitIds: override.defaultTraitIds
    })),
    ...customTraits.map(trait => ({
        id: toTraitId(trait.id) || trait.id,
        kind: trait.kind || getTraitConfig(trait.id)?.kind || 'object',
        keywords: trait.keywords || [],
        buttonIds: trait.buttonIds
    }))
];

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
    const byId = new Map<string, T>();
    items.forEach(item => byId.set(item.id, item));
    return Array.from(byId.values());
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Default Values
            connectionUrl: DEFAULT_URL,
            autoConnect: true,
            loginName: '',
            loginPassword: '',
            rememberLogin: true,
            
            theme: 'dark',
            accentColor: '#f48f3c',
            bgImage: null,
            bgImageBottom: null,
            fontFamily: "'Iosevka', monospace",
            uiMode: 'auto',
            isBloomEnabled: true,
            isHighlighterEnabled: true,
            objectColor: 'rgba(251, 146, 60, 0.95)',
            playerColor: '#89CFF0',
            npcColor: 'rgba(253, 224, 71, 0.95)',
            enemyColor: '#ef4444',
            neutralColor: '#eab308',
            targetColor: '#facc15',
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
            categoryOverrides: [],
            customTraits: [],
            inlineCategories: [],
            favorites: [],
            zoneMusic: [],
            masterVolume: 1.0,
            sfxVolume: 0.5,
            musicVolume: 0.5,

            allowMapPersistence: true,
            unveilMap: false,
            showMapperToolbar: false,
            isTextRevealEnabled: true,

            // Setters
            setConnectionUrl: (connectionUrl) => set({ connectionUrl }),
            setLoginName: (loginName) => set({ loginName }),
            setLoginPassword: (loginPassword) => set({ loginPassword }),
            setRememberLogin: (rememberLogin) => set({ rememberLogin }),
            setAutoConnect: (autoConnect) => set({ autoConnect }),
            setTheme: (theme) => set({ theme }),
            setAccentColor: (accentColor) => set({ accentColor }),
            setBgImage: (bgImage) => set({ bgImage }),
            setBgImageBottom: (bgImageBottom) => set({ bgImageBottom }),
            setFontFamily: (fontFamily) => set({ fontFamily }),
            setUiMode: (uiMode) => set({ uiMode }),
            setIsBloomEnabled: (isBloomEnabled) => set({ isBloomEnabled }),
            setIsHighlighterEnabled: (isHighlighterEnabled) => set({ isHighlighterEnabled }),
            setObjectColor: (objectColor) => set({ objectColor }),
            setPlayerColor: (playerColor) => set({ playerColor }),
            setNpcColor: (npcColor) => set({ npcColor }),
            setEnemyColor: (enemyColor) => set({ enemyColor }),
            setNeutralColor: (neutralColor) => set({ neutralColor }),
            setTargetColor: (targetColor) => set({ targetColor }),
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
            setTeleportTargets: (val) => set((state) => ({
                teleportTargets: typeof val === 'function' ? val(state.teleportTargets) : val
            })),
            setCategoryOverrides: (val) => set((state) => {
                const categoryOverrides = typeof val === 'function' ? val(state.categoryOverrides) : val;
                return {
                    categoryOverrides,
                    inlineCategories: combineInlineActionConfigs(categoryOverrides, state.customTraits)
                };
            }),
            setCustomTraits: (val) => set((state) => {
                const customTraits = typeof val === 'function' ? val(state.customTraits) : val;
                return {
                    customTraits,
                    inlineCategories: combineInlineActionConfigs(state.categoryOverrides, customTraits)
                };
            }),
            setInlineCategories: (val) => set((state) => {
                const inlineCategories = typeof val === 'function' ? val(state.inlineCategories) : val;
                const { categoryOverrides, customTraits } = splitInlineActionConfigs(inlineCategories);
                return {
                    categoryOverrides,
                    customTraits,
                    inlineCategories: combineInlineActionConfigs(categoryOverrides, customTraits)
                };
            }),
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
            setIsTextRevealEnabled: (isTextRevealEnabled) => set({ isTextRevealEnabled }),
        }),
        {
            name: 'mume-settings-storage',
            version: 4,
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

                if (version < 3) {
                    if (persistedState.inlineCategories && Array.isArray(persistedState.inlineCategories)) {
                        persistedState.inlineCategories = persistedState.inlineCategories.map((config: any) => {
                            if (!config || typeof config !== 'object' || !config.id) return config;
                            const categoryId = toCategoryId(config.id);
                            const traitId = toTraitId(config.id);
                            const defaultTraitIds = Array.isArray(config.defaultTraitIds)
                                ? config.defaultTraitIds.map((id: string) => toTraitId(id) || id)
                                : config.defaultTraitIds;

                            return {
                                ...config,
                                id: categoryId || traitId || config.id,
                                defaultTraitIds
                            };
                        });
                    }
                }

                if (version < 4 || !persistedState.categoryOverrides || !persistedState.customTraits) {
                    const split = splitInlineActionConfigs(persistedState.inlineCategories || []);
                    persistedState.categoryOverrides = persistedState.categoryOverrides || split.categoryOverrides;
                    persistedState.customTraits = persistedState.customTraits || split.customTraits;
                    persistedState.inlineCategories = combineInlineActionConfigs(
                        persistedState.categoryOverrides,
                        persistedState.customTraits
                    );
                }
                
                return persistedState;
            },
            merge: (persistedState: any, currentState) => {
                const merged = { ...currentState, ...(persistedState || {}) } as SettingsState;
                merged.inlineCategories = combineInlineActionConfigs(
                    merged.categoryOverrides || [],
                    merged.customTraits || []
                );
                return merged;
            },
            partialize: (state) => {
                const { inlineCategories: _inlineCategories, ...persisted } = state;
                return persisted;
            }
        }
    )
);

export const getSettings = () => useSettingsStore.getState();
