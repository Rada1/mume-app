import { useEffect } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import MASTER_SETTINGS from '../../constants/mastersettings.json';
import { DEFAULT_INLINE_CATEGORIES } from '../../utils/categorizationUtils';
import { InlineCategoryConfig, ZoneMusicMapping } from '../../types';
import { DEFAULT_URL } from '../../constants';

export const useSettingsState = () => {
    const [connectionUrl, setConnectionUrl] = usePersistentState('mud-connection-url', (MASTER_SETTINGS as any).connectionUrl || DEFAULT_URL);

    // Migration: if the user has the old 'ws-proxy' stuck in localStorage, force it to 'ws-play'
    useEffect(() => {
        if (connectionUrl === 'wss://mume.org/ws-proxy') {
            setConnectionUrl(DEFAULT_URL);
        }
    }, [connectionUrl, setConnectionUrl]);

    const [isNoviceMode, setIsNoviceMode] = usePersistentState('mud-novice-mode', (MASTER_SETTINGS as any).isNoviceMode ?? false);
    const [isSoundEnabled, setIsSoundEnabled] = usePersistentState('mud-sound-enabled', (MASTER_SETTINGS as any).isSoundEnabled ?? true);
    const [isMmapperMode, setIsMmapperMode] = usePersistentState('mud-mmapper-mode', false);
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('mud-theme', 'dark');
    const [showControls, setShowControls] = usePersistentState<boolean>('mud-show-controls', (() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('mud-show-controls') : null;
        if (stored !== null) return JSON.parse(stored) as boolean;
        if (typeof window !== 'undefined') {
            return window.matchMedia('(pointer: coarse)').matches;
        }
        return false;
    })());
    const [autoConnect, setAutoConnect] = usePersistentState('mud-auto-connect', (MASTER_SETTINGS as any).autoConnect ?? true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = usePersistentState('mud-has-seen-onboarding', false);
    const [showDebugEchoes, setShowDebugEchoes] = usePersistentState('mud-show-debug-echoes', false);
    const [uiMode, setUiMode] = usePersistentState<any>('mud-ui-mode', (MASTER_SETTINGS as any).uiMode ?? 'auto');
    const [disable3dScroll, setDisable3dScroll] = usePersistentState('mud-disable-3d-scroll', (MASTER_SETTINGS as any).disable3dScroll ?? false);
    const [disableSmoothScroll, setDisableSmoothScroll] = usePersistentState('mud-disable-smooth-scroll', (MASTER_SETTINGS as any).disableSmoothScroll ?? false);
    const [isImmersionMode, setIsImmersionMode] = usePersistentState('mud-immersion-mode', (MASTER_SETTINGS as any).isImmersionMode ?? true);
    const [isMobileBrevityMode, setIsMobileBrevityMode] = usePersistentState('mud-mobile-brevity', false);
    const [showOrganicTerrain, setShowOrganicTerrain] = usePersistentState('mud-show-organic-terrain', true);
    const [inlineCategories, setInlineCategories] = usePersistentState<InlineCategoryConfig[]>('mud-inline-categories', (MASTER_SETTINGS as any).inlineCategories || DEFAULT_INLINE_CATEGORIES);
    const [isHighlighterEnabled, setIsHighlighterEnabled] = usePersistentState('mud-highlighter-enabled', true);
    const [isCrtEnabled, setIsCrtEnabled] = usePersistentState('mud-crt-enabled', false);
    const [isBloomEnabled, setIsBloomEnabled] = usePersistentState('mud-bloom-enabled', false);
    const [favorites, setFavorites] = usePersistentState<string[]>('mud-favorites', []);
    const [zoneMusic, setZoneMusic] = usePersistentState<ZoneMusicMapping[]>('mud-zone-music', [
        { zone: 'Bree', url: '/assets/Sounds/Zone Sounds/BreeSound.wav' },
        { zone: 'the Shire', url: '/assets/Music/shire.mp3' },
        { zone: 'the Blue Mountains', url: '/assets/Music/blue_mountains.mp3' },
        { zone: 'the Old Forest', url: '/assets/Music/old_forest.mp3' },
        { zone: 'the Barrow-downs', url: '/assets/Music/downs.mp3' },
    ]);

    return {
        connectionUrl, setConnectionUrl,
        isNoviceMode, setIsNoviceMode,
        isSoundEnabled, setIsSoundEnabled,
        isMmapperMode, setIsMmapperMode,
        theme, setTheme,
        showControls, setShowControls,
        autoConnect, setAutoConnect,
        hasSeenOnboarding, setHasSeenOnboarding,
        showDebugEchoes, setShowDebugEchoes,
        uiMode, setUiMode,
        disable3dScroll, setDisable3dScroll,
        disableSmoothScroll, setDisableSmoothScroll,
        isImmersionMode, setIsImmersionMode,
        isMobileBrevityMode, setIsMobileBrevityMode,
        showOrganicTerrain, setShowOrganicTerrain,
        inlineCategories, setInlineCategories,
        isHighlighterEnabled, setIsHighlighterEnabled,
        isCrtEnabled, setIsCrtEnabled,
        isBloomEnabled, setIsBloomEnabled,
        favorites, setFavorites,
        zoneMusic, setZoneMusic
    };
};
