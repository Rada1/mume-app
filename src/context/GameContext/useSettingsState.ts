import { useEffect } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import MASTER_SETTINGS from '../../constants/mastersettings.json';
import { DEFAULT_INLINE_CATEGORIES } from '../../utils/categorizationUtils';
import { InlineCategoryConfig, ZoneMusicMapping } from '../../types';
import { DEFAULT_URL } from '../../constants';

export const useSettingsState = () => {
    const [connectionUrl, setConnectionUrl] = usePersistentState('mud-connection-url', (MASTER_SETTINGS as any).connectionUrl || DEFAULT_URL);

    // Migration: if the user has an old URL stuck in localStorage, force it to the new DEFAULT_URL
    useEffect(() => {
        const legacyUrls = [
            'wss://mume.org/ws-proxy',
            'wss://mume.org/ws-proxy/',
            'wss://mume.org/ws-play'
        ];
        if (legacyUrls.includes(connectionUrl)) {
            setConnectionUrl(DEFAULT_URL);
        }
    }, [connectionUrl, setConnectionUrl, DEFAULT_URL]);

    const [isNewbieMode, setIsNewbieMode] = usePersistentState('mud-newbie-mode', true);
    const [isSoundEnabled, setIsSoundEnabled] = usePersistentState('mud-sound-enabled', (MASTER_SETTINGS as any).isSoundEnabled ?? true);
    const [isMmapperMode, setIsMmapperMode] = usePersistentState('mud-mmapper-mode', false);
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('mud-theme', 'dark');
    const [showControls, setShowControls] = usePersistentState<boolean>('mud-show-controls', (() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('mud-show-controls') : null;
        if (stored !== null) return JSON.parse(stored) as boolean;
        if (typeof window !== 'undefined') {
            // Default show HUD on desktop (fine pointer) OR mobile (coarse pointer)
            return true;
        }
        return false;
    })());
    const [autoConnect, setAutoConnect] = usePersistentState('mud-auto-connect', (MASTER_SETTINGS as any).autoConnect ?? true);
    const [showDebugEchoes, setShowDebugEchoes] = usePersistentState('mud-show-debug-echoes', false);
    const [uiMode, setUiMode] = usePersistentState<any>('mud-ui-mode', (MASTER_SETTINGS as any).uiMode ?? 'auto');
    const [disable3dScroll, setDisable3dScroll] = usePersistentState('mud-disable-3d-scroll', (MASTER_SETTINGS as any).disable3dScroll ?? false);
    const [disableSmoothScroll, setDisableSmoothScroll] = usePersistentState('mud-disable-smooth-scroll', (MASTER_SETTINGS as any).disableSmoothScroll ?? false);
    const [isImmersionMode, setIsImmersionMode] = usePersistentState('mud-immersion-mode', (MASTER_SETTINGS as any).isImmersionMode ?? true);
    const [showOrganicTerrain, setShowOrganicTerrain] = usePersistentState('mud-show-organic-terrain', true);
    const [inlineCategories, setInlineCategories] = usePersistentState<InlineCategoryConfig[]>('mud-inline-categories', (MASTER_SETTINGS as any).inlineCategories || DEFAULT_INLINE_CATEGORIES);
    const [isHighlighterEnabled, setIsHighlighterEnabled] = usePersistentState('mud-highlighter-enabled', true);
    const [isBloomEnabled, setIsBloomEnabled] = usePersistentState('mud-bloom-enabled', (MASTER_SETTINGS as any).isBloomEnabled ?? false);
    const [isSpectateMode, setIsSpectateMode] = usePersistentState('mud-spectate-mode', false);
    const [showSpectatePromptInLog, setShowSpectatePromptInLog] = usePersistentState('mud-show-spectate-prompt', true);
    const [isTimestampEnabled, setIsTimestampEnabled] = usePersistentState('mud-timestamp-enabled', false);
    const [showRecordingIndicator, setShowRecordingIndicator] = usePersistentState('mud-show-recording-indicator', false);
    const [autoSaveSessions, setAutoSaveSessions] = usePersistentState('mud-auto-save-sessions', true);
    const [favorites, setFavorites] = usePersistentState<string[]>('mud-favorites', []);
    const [fontFamily, setFontFamily] = usePersistentState<string>('mud-font-family', "'Roboto Mono', monospace");
    const [zoneMusic, setZoneMusic] = usePersistentState<ZoneMusicMapping[]>('mud-zone-music', [
        { zone: 'Bree', url: '/assets/Sounds/Zone Sounds/BreeSound.wav' },
        { zone: 'the Shire', url: '/assets/Sounds/Zone Sounds/Shire1.mp3' },
        { zone: 'the Blue Mountains', url: '/assets/Sounds/Zone Sounds/Blue Mountains.mp3' },
        { zone: 'the Old Forest', url: '/assets/Sounds/Zone Sounds/Old Forest.mp3' },
        { zone: 'the Barrow-downs', url: '/assets/Sounds/Zone Sounds/barrow downs2.mp3' },
        { zone: 'Lorien', url: '/assets/Sounds/Zone Sounds/Lorien1.mp3' },
        { zone: 'Rivendell', url: '/assets/Sounds/Zone Sounds/Rivendell1.mp3' },
        { zone: 'Moria', url: '/assets/Sounds/Zone Sounds/Moria.mp3' },
        { zone: 'Fangorn Forest', url: '/assets/Sounds/Zone Sounds/Fangorn Forest.mp3' },
    ]);

    return {
        connectionUrl, setConnectionUrl,
        isNewbieMode, setIsNewbieMode,
        isSoundEnabled, setIsSoundEnabled,
        isMmapperMode, setIsMmapperMode,
        theme, setTheme,
        showControls, setShowControls,
        autoConnect, setAutoConnect,
        showDebugEchoes, setShowDebugEchoes,
        uiMode, setUiMode,
        disable3dScroll, setDisable3dScroll,
        disableSmoothScroll, setDisableSmoothScroll,
        isImmersionMode, setIsImmersionMode,
        showRecordingIndicator, setShowRecordingIndicator,
        showOrganicTerrain, setShowOrganicTerrain,
        inlineCategories, setInlineCategories,
        isHighlighterEnabled, setIsHighlighterEnabled,
        isBloomEnabled, setIsBloomEnabled,
        isSpectateMode, setIsSpectateMode,
        showSpectatePromptInLog, setShowSpectatePromptInLog,
        isTimestampEnabled, setIsTimestampEnabled,
        favorites, setFavorites,
        fontFamily, setFontFamily,
        zoneMusic, setZoneMusic,
        autoSaveSessions, setAutoSaveSessions
    };
};
