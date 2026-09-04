/**
 * @file useSettingsStore.ts
 * @description Persistent user settings store for the MUME client.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UiMode, TeleportTarget, InlineCategoryConfig, ZoneMusicMapping, CategoryOverride, CustomTraitConfig } from '../types';
import { COLOR_ALLY, COLOR_NPC, canonicalizeCategoryId } from '../utils/categorizationUtils';
import { getKindForCategory, getTraitConfig, toCategoryId, toTraitId } from '../utils/inlineActionModel';
import { DEFAULT_URL } from '../constants';
import type { MapBackgroundVisualAdjustments, MapTileVisualAdjustments } from '../components/Mapper/mapperTypes';
import { ZONE_FILTERS } from '../components/Mapper/zoneFilters';
import type { ZoneFilterConfig, ZoneVisualConfig } from '../components/Mapper/zoneFilters';
import { DEFAULT_TERRAIN_COLORS, ROAD_COLOR_LIGHT, PATH_COLOR_LIGHT } from '../components/Mapper/mapperUtils';

// Immersion mode defaults on for desktop-sized viewports. Mirrors the helper in
// useUIStore (kept local to avoid a store-to-store import cycle).
const isDesktopViewport = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

export const DEFAULT_MAP_TILE_VISUALS: MapTileVisualAdjustments = {
    terrainColors: {
        Forest: '#334e2d',
        City: '#393532',
        Building: '#5b5852',
        Field: '#334e2d',
        Hills: '#334e2d',
        Water: '#182b3a',
        Rapids: '#30484f',
        Shallows: '#494e0e',
        Cavern: '#686e8d',
        Tunnel: '#686e8d',
        Brush: '#334e2d',
        Road: '#334e2d',
        Mountains: '#334e2d',
        Grasslands: '#53744e',
    },
    wallColor: '#3a3c42',
    doorColor: '#ffcc00',
    roadColorDark: '#402e26',
    roadColorLight: ROAD_COLOR_LIGHT,
    pathColorDark: '#492f27',
    pathColorLight: PATH_COLOR_LIGHT,
};

export const DEFAULT_MAP_BACKGROUND_VISUALS: MapBackgroundVisualAdjustments = {
    opacity: 1,
    brightness: 0.18,
    saturation: 1,
    grayscale: 0.7,
    contrast: 1,
    hue: 0,
    blurMin: 2,
    blurMax: 30,
    blurScale: 16,
    tintColor: '#1091a5',
    tintOpacity: 0.46,
};

const DEFAULT_FONT_FAMILY = "'Iosevka', monospace";
const LEGACY_DEFAULT_FONT_FAMILY = "'Roboto Mono', monospace";

interface SettingsState {
    connectionUrl: string;
    autoConnect: boolean;
    loginName: string;
    loginPassword?: string;
    rememberLogin: boolean;
    theme: 'dark' | 'light';
    drawerZoom: number;
    isImmersionMode: boolean;
    isPerformanceMode: boolean;
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
    isTimestampEnabled: boolean;
    showDebugEchoes: boolean;
    showLegacyButtons: boolean;
    showDeveloperTools: boolean;
    showSpectatePromptInLog: boolean;
    showChatWindow: boolean;
    showPlayersPanel: boolean;
    showControls: boolean;
    showOrganicTerrain: boolean;
    hidePrompt: boolean;
    showBlockHeaders: boolean;
    isSoundEnabled: boolean;
    isDiscordEnabled: boolean;
    isNewbieMode: boolean;
    autoSaveSessions: boolean;
    soundTriggers: import('../types').SoundTrigger[];
    teleportTargets: TeleportTarget[];
    teleportTargetsByCharacter: Record<string, TeleportTarget[]>;
    currentCharacter: string | null;
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
    zoneFocusGrayscale: boolean;
    showMapperToolbar: boolean;
    isTextRevealEnabled: boolean;
    showBackgroundImage: boolean;
    useLegacyMapArt: boolean;
    mapDrawerOpacity: number;
    characterDrawerOpacity: number;
    bottomBarOpacity: number;
    mapTileVisuals: MapTileVisualAdjustments;
    mapBackgroundVisuals: MapBackgroundVisualAdjustments;
    zoneFilters: Record<string, ZoneFilterConfig>;
    customSoundEffects: Record<string, string>;
    setCustomSoundEffect: (key: string, url: string) => void;
    removeCustomSoundEffect: (key: string) => void;
    setConnectionUrl: (val: string) => void;
    setLoginName: (val: string) => void;
    setLoginPassword: (val: string) => void;
    setRememberLogin: (val: boolean) => void;
    setAutoConnect: (val: boolean) => void;
    setTheme: (val: 'dark' | 'light') => void;
    setDrawerZoom: (val: number) => void;
    setIsImmersionMode: (val: boolean) => void;
    setIsPerformanceMode: (val: boolean) => void;
    setAccentColor: (val: string) => void;
    setBgImage: (val: string | null) => void;
    setBgImageBottom: (val: string | null) => void;
    setFontFamily: (val: string) => void;
    setCharacterDrawerOpacity: (val: number) => void;
    setBottomBarOpacity: (val: number) => void;
    setUiMode: (val: UiMode) => void;
    setIsBloomEnabled: (val: boolean) => void;
    setIsHighlighterEnabled: (val: boolean) => void;
    setDisableSmoothScroll: (val: boolean) => void;
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
    setShowDeveloperTools: (val: boolean) => void;
    setShowSpectatePromptInLog: (val: boolean) => void;
    setShowChatWindow: (val: boolean) => void;
    setShowPlayersPanel: (val: boolean) => void;
    setShowControls: (val: boolean) => void;
    setShowOrganicTerrain: (val: boolean) => void;
    setHidePrompt: (val: boolean) => void;
    setShowBlockHeaders: (val: boolean) => void;
    setIsSoundEnabled: (val: boolean) => void;
    setIsDiscordEnabled: (val: boolean) => void;
    setIsNewbieMode: (val: boolean) => void;
    setAutoSaveSessions: (val: boolean) => void;
    setSoundTriggers: (val: import('../types').SoundTrigger[]) => void;
    setTeleportTargets: (val: TeleportTarget[] | ((prev: TeleportTarget[]) => TeleportTarget[])) => void;
    setCurrentCharacter: (name: string | null) => void;
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
    setZoneFocusGrayscale: (val: boolean) => void;
    setShowMapperToolbar: (val: boolean) => void;
    setIsTextRevealEnabled: (val: boolean) => void;
    setShowBackgroundImage: (val: boolean) => void;
    setUseLegacyMapArt: (val: boolean) => void;
    setMapDrawerOpacity: (val: number) => void;
    setMapTileVisuals: (val: Partial<MapTileVisualAdjustments>) => void;
    setMapBackgroundVisuals: (val: Partial<MapBackgroundVisualAdjustments>) => void;
    resetMapVisuals: () => void;
    setZoneFilter: (zone: string, isDarkMode: boolean, theme: Partial<ZoneVisualConfig>) => void;
    resetZoneFilters: () => void;
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
            drawerZoom: 1.0,
            isImmersionMode: false,
            isPerformanceMode: false,
            accentColor: '#d4aa00',
            bgImage: null,
            bgImageBottom: null,
            fontFamily: DEFAULT_FONT_FAMILY,
            uiMode: 'auto',
            isBloomEnabled: true,
            isHighlighterEnabled: true,
            objectColor: 'rgba(251, 146, 60, 0.95)',
            playerColor: COLOR_ALLY,
            npcColor: COLOR_NPC,
            enemyColor: '#ef4444',
            neutralColor: '#eab308',
            targetColor: '#facc15',
            roomColor: '#22c55e',
            
            disableSmoothScroll: false,
            isTimestampEnabled: false,
            showDebugEchoes: false,
            showLegacyButtons: false,
            showDeveloperTools: false,
            showSpectatePromptInLog: true,
            showChatWindow: false,
            showPlayersPanel: false,
            showControls: true,
            showOrganicTerrain: true,
            hidePrompt: false,
            showBlockHeaders: true,
            
            isSoundEnabled: true,
            isDiscordEnabled: true,
            isNewbieMode: false,
            autoSaveSessions: true,
            soundTriggers: [],
            teleportTargets: [],
            teleportTargetsByCharacter: {},
            currentCharacter: null,
            categoryOverrides: [],
            customTraits: [],
            inlineCategories: [],
            favorites: [],
            zoneMusic: [],
            masterVolume: 1.0,
            sfxVolume: 0.5,
            musicVolume: 0.5,
            customSoundEffects: {},

            allowMapPersistence: true,
            unveilMap: false,
            zoneFocusGrayscale: false,
            showMapperToolbar: false,
            isTextRevealEnabled: true,
            showBackgroundImage: true,
            useLegacyMapArt: true,
            mapDrawerOpacity: 1.0,
            characterDrawerOpacity: 1.0,
            bottomBarOpacity: 1.0,
            mapTileVisuals: DEFAULT_MAP_TILE_VISUALS,
            mapBackgroundVisuals: DEFAULT_MAP_BACKGROUND_VISUALS,
            zoneFilters: ZONE_FILTERS,

            // Setters
            setCustomSoundEffect: (key, url) => set((state) => ({
                customSoundEffects: { ...state.customSoundEffects, [key]: url }
            })),
            removeCustomSoundEffect: (key) => set((state) => {
                const next = { ...state.customSoundEffects };
                delete next[key];
                return { customSoundEffects: next };
            }),
            setConnectionUrl: (connectionUrl) => set({ connectionUrl }),
            setLoginName: (loginName) => set({ loginName }),
            setLoginPassword: (loginPassword) => set({ loginPassword }),
            setRememberLogin: (rememberLogin) => set({ rememberLogin }),
            setAutoConnect: (autoConnect) => set({ autoConnect }),
            setTheme: (theme) => set({ theme }),
            setDrawerZoom: (drawerZoom) => set({ drawerZoom }),
            setIsImmersionMode: (isImmersionMode) => set({ isImmersionMode }),
            setIsPerformanceMode: (isPerformanceMode) => set({ isPerformanceMode }),
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
            setIsTimestampEnabled: (isTimestampEnabled) => set({ isTimestampEnabled }),
            setShowDebugEchoes: (showDebugEchoes) => set({ showDebugEchoes }),
            setShowLegacyButtons: (showLegacyButtons) => set({ showLegacyButtons }),
            setShowDeveloperTools: (showDeveloperTools) => set({ showDeveloperTools }),
            setShowSpectatePromptInLog: (showSpectatePromptInLog) => set({ showSpectatePromptInLog }),
            setShowChatWindow: (showChatWindow) => set({ showChatWindow }),
            setShowPlayersPanel: (showPlayersPanel) => set({ showPlayersPanel }),
            setShowControls: (showControls) => set({ showControls }),
            setShowOrganicTerrain: (showOrganicTerrain) => set({ showOrganicTerrain }),
            setHidePrompt: (hidePrompt) => set({ hidePrompt }),
            setShowBlockHeaders: (showBlockHeaders) => set({ showBlockHeaders }),
            setIsSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
            setIsDiscordEnabled: (isDiscordEnabled) => set({ isDiscordEnabled }),
            setIsNewbieMode: (isNewbieMode) => set({ isNewbieMode }),
            setAutoSaveSessions: (autoSaveSessions) => set({ autoSaveSessions }),
            setSoundTriggers: (soundTriggers) => set({ soundTriggers }),
            setTeleportTargets: (val) => set((state) => {
                const next = typeof val === 'function' ? val(state.teleportTargets) : val;
                const char = state.currentCharacter;
                return {
                    teleportTargets: next,
                    teleportTargetsByCharacter: char
                        ? { ...state.teleportTargetsByCharacter, [char]: next }
                        : state.teleportTargetsByCharacter,
                };
            }),
            setCurrentCharacter: (name) => set((state) => ({
                currentCharacter: name,
                teleportTargets: name ? (state.teleportTargetsByCharacter[name] || []) : [],
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
            setZoneFocusGrayscale: (zoneFocusGrayscale) => set({ zoneFocusGrayscale }),
            setShowMapperToolbar: (showMapperToolbar) => set({ showMapperToolbar }),
            setIsTextRevealEnabled: (isTextRevealEnabled) => set({ isTextRevealEnabled }),
            setShowBackgroundImage: (showBackgroundImage) => set({ showBackgroundImage }),
            setUseLegacyMapArt: (useLegacyMapArt) => set({ useLegacyMapArt }),
            setMapDrawerOpacity: (mapDrawerOpacity) => set({ mapDrawerOpacity }),
            setCharacterDrawerOpacity: (characterDrawerOpacity) => set({ characterDrawerOpacity }),
            setBottomBarOpacity: (bottomBarOpacity) => set({ bottomBarOpacity }),
            setMapTileVisuals: (mapTileVisuals) => set((state) => ({
                mapTileVisuals: {
                    ...state.mapTileVisuals,
                    ...mapTileVisuals,
                    terrainColors: {
                        ...(state.mapTileVisuals.terrainColors || {}),
                        ...mapTileVisuals.terrainColors
                    }
                }
            })),
            setMapBackgroundVisuals: (mapBackgroundVisuals) => set((state) => ({
                mapBackgroundVisuals: { ...state.mapBackgroundVisuals, ...mapBackgroundVisuals }
            })),
            resetMapVisuals: () => set({
                mapTileVisuals: DEFAULT_MAP_TILE_VISUALS,
                mapBackgroundVisuals: DEFAULT_MAP_BACKGROUND_VISUALS
            }),
            setZoneFilter: (zone, isDarkMode, theme) => set((state) => {
                const nextFilters = { ...state.zoneFilters };
                if (!nextFilters[zone]) {
                    nextFilters[zone] = {
                        dark: {},
                        light: {}
                    };
                }
                const modeKey = isDarkMode ? 'dark' : 'light';
                nextFilters[zone] = {
                    ...nextFilters[zone],
                    [modeKey]: {
                        ...nextFilters[zone][modeKey],
                        ...theme,
                        terrainColors: theme.terrainColors !== undefined
                            ? theme.terrainColors
                            : nextFilters[zone][modeKey]?.terrainColors
                    }
                };
                return { zoneFilters: nextFilters };
            }),
            resetZoneFilters: () => set({ zoneFilters: ZONE_FILTERS }),
        }),
        {
            name: 'mume-settings-storage',
            version: 26,
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

                if (version < 5) {
                    if (persistedState.isImmersionMode !== false && (!persistedState.theme || persistedState.theme === 'dark')) {
                        persistedState.theme = 'immersion';
                    }
                }

                if (version < 6) {
                    const legacyTheme = persistedState.theme;
                    const legacyImmersionMode = persistedState.isImmersionMode;
                    persistedState.isImmersionMode = legacyTheme === 'immersion'
                        ? true
                        : legacyImmersionMode ?? false;
                    persistedState.theme = legacyTheme === 'light' ? 'light' : 'dark';
                }

                if (version < 7) {
                    // Magic keys are now scoped per character. Drop the legacy global list
                    // (keys expire after 24h anyway, so losses are bounded) and start fresh.
                    persistedState.teleportTargetsByCharacter = {};
                    delete persistedState.teleportTargets;
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
                
                if (version < 8) {
                    if (persistedState.hidePrompt === undefined) {
                        persistedState.hidePrompt = false;
                    }
                }
                
                if (version < 9) {
                    if (persistedState.showBlockHeaders === undefined) {
                        persistedState.showBlockHeaders = true;
                    }
                }

                if (version < 10) {
                    const oldDefaultNpcColors = new Set([
                        'rgba(253, 224, 71, 0.95)',
                        '#fde047',
                        'rgb(253, 224, 71)'
                    ]);
                    if (!persistedState.npcColor || oldDefaultNpcColors.has(String(persistedState.npcColor).toLowerCase())) {
                        persistedState.npcColor = COLOR_NPC;
                    }
                }

                if (version < 12) {
                    const oldDefaultAllyColors = new Set([
                        '#89cff0',
                        'rgb(137, 207, 240)',
                        '#22c55e',
                        'rgb(34, 197, 94)',
                        '#4173e6',
                    ]);
                    const playerColor = String(persistedState.playerColor || '').toLowerCase();
                    if (!playerColor || oldDefaultAllyColors.has(playerColor)) {
                        persistedState.playerColor = COLOR_ALLY;
                    }

                    if (Array.isArray(persistedState.categoryOverrides)) {
                        persistedState.categoryOverrides = persistedState.categoryOverrides.map((override: CategoryOverride) => {
                            const id = toCategoryId(override.id) || override.id;
                            const color = String(override.color || '').toLowerCase();
                            if ((id === 'cat-ally' || id === 'cat-ally-remote') && oldDefaultAllyColors.has(color)) {
                                  return { ...override, color: COLOR_ALLY };
                            }
                            return override;
                        });
                    }
                }

                if (version < 13) {
                    persistedState.mapTileVisuals = {
                        ...DEFAULT_MAP_TILE_VISUALS,
                        ...(persistedState.mapTileVisuals || {}),
                        terrainColors: {
                            ...DEFAULT_TERRAIN_COLORS,
                            ...(persistedState.mapTileVisuals?.terrainColors || {})
                        }
                    };
                    persistedState.mapBackgroundVisuals = {
                        ...DEFAULT_MAP_BACKGROUND_VISUALS,
                        ...(persistedState.mapBackgroundVisuals || {})
                    };
                }

                if (version < 14) {
                    persistedState.showBackgroundImage = true;
                }

                if (version < 16) {
                    delete persistedState.showBackgroundGrid;
                }

                if (version < 17) {
                    if (persistedState.mapTileVisuals?.terrainColors) {
                        const cleanColors = { ...persistedState.mapTileVisuals.terrainColors };
                        Object.keys(cleanColors).forEach(k => {
                            if (cleanColors[k] === DEFAULT_TERRAIN_COLORS[k]) {
                                delete cleanColors[k];
                            }
                        });
                        persistedState.mapTileVisuals.terrainColors = cleanColors;
                    }
                }

                if (version < 18) {
                    if (!persistedState.fontFamily || persistedState.fontFamily === LEGACY_DEFAULT_FONT_FAMILY) {
                        persistedState.fontFamily = DEFAULT_FONT_FAMILY;
                    }
                }

                if (version < 19) {
                    if (persistedState.accentColor === '#f48f3c') {
                        persistedState.accentColor = '#d4aa00';
                    }
                }

                if (version < 21) {
                    if (!persistedState.fontFamily || persistedState.fontFamily === "'Roboto Mono', monospace") {
                        persistedState.fontFamily = "'Iosevka', monospace";
                    }
                }

                if (version < 22) {
                    if (persistedState.mapDrawerOpacity === undefined) {
                        persistedState.mapDrawerOpacity = 1.0;
                    }
                }

                if (version < 23) {
                    if (persistedState.characterDrawerOpacity === undefined) {
                        persistedState.characterDrawerOpacity = 1.0;
                    }
                }

                if (version < 24) {
                    if (persistedState.bottomBarOpacity === undefined) {
                        persistedState.bottomBarOpacity = 1.0;
                    }
                }

                if (version < 25) {
                    if (persistedState.useLegacyMapArt === undefined) {
                        persistedState.useLegacyMapArt = true;
                    }
                }

                if (version < 26) {
                    persistedState.isImmersionMode = false;
                }

                return persistedState;
            },
            merge: (persistedState: any, currentState) => {
                const merged = { ...currentState, ...(persistedState || {}) } as SettingsState;
                merged.inlineCategories = combineInlineActionConfigs(
                    merged.categoryOverrides || [],
                    merged.customTraits || []
                );

                const persistedColors = merged.mapTileVisuals?.terrainColors || {};
                const cleanedColors: Record<string, string> = {};
                Object.keys(persistedColors).forEach(k => {
                    if (persistedColors[k] && persistedColors[k] !== DEFAULT_TERRAIN_COLORS[k]) {
                        cleanedColors[k] = persistedColors[k];
                    }
                });

                merged.mapTileVisuals = {
                    ...DEFAULT_MAP_TILE_VISUALS,
                    ...(merged.mapTileVisuals || {}),
                    terrainColors: cleanedColors
                };
                merged.mapBackgroundVisuals = {
                    ...DEFAULT_MAP_BACKGROUND_VISUALS,
                    ...(merged.mapBackgroundVisuals || {})
                };
                merged.showBackgroundImage = merged.showBackgroundImage ?? true;
                merged.useLegacyMapArt = merged.useLegacyMapArt ?? true;
                merged.showChatWindow = merged.showChatWindow ?? false;
                merged.showPlayersPanel = merged.showPlayersPanel ?? false;
                let validFilters = merged.zoneFilters;
                if (validFilters) {
                    const firstKey = Object.keys(validFilters)[0];
                    if (firstKey && (
                        typeof (validFilters[firstKey]?.dark as any)?.filter === 'string' ||
                        typeof (validFilters[firstKey]?.dark as any)?.brightness === 'number'
                    )) {
                        validFilters = currentState.zoneFilters;
                    }
                }
                merged.zoneFilters = {
                    ...currentState.zoneFilters,
                    ...(validFilters || {})
                };
                return merged;
            },
            partialize: (state) => {
                const {
                    inlineCategories: _inlineCategories,
                    teleportTargets: _teleportTargets,
                    currentCharacter: _currentCharacter,
                    ...persisted
                } = state;
                return persisted;
            }
        }
    )
);

export const getSettings = () => useSettingsStore.getState();
