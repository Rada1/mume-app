/**
 * @file useSettings.ts
 * @description Compatibility shim for the legacy useSettings hook.
 * This hook wraps the Zustand settings store and provides stable
 * refs for isSoundEnabled and soundTriggers so that consumers
 * (GameContext, GameParser, etc.) can read them without re-renders.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { SoundTrigger } from '../types';

// --- Interface ---

interface UseSettingsInput {
    addMessage: (...args: any[]) => void;
    audioCtxRef: React.RefObject<AudioContext | null>;
    initAudio: () => void;
    setButtons?: (...args: any[]) => void;
    isSoundEnabled?: boolean;
    setIsSoundEnabled?: (val: boolean) => void;
    abilities?: Record<string, number>;
    setAbilities?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    characterClass?: string;
    setCharacterClass?: (...args: any[]) => void;
    actions?: any[];
    setActions?: (...args: any[]) => void;
    setSettings?: (...args: any[]) => void;
    setSetSettings?: (...args: any[]) => void;
    autoConnect?: boolean;
    setAutoConnect?: (val: boolean) => void;
    connectionUrl?: string;
    setConnectionUrl?: (...args: any[]) => void;
    showDebugEchoes?: boolean;
    setShowDebugEchoes?: (val: boolean) => void;
    uiMode?: any;
    setUiMode?: (val: any) => void;
    disableSmoothScroll?: boolean;
    setDisableSmoothScroll?: (val: boolean) => void;
    isImmersionMode?: boolean;
    setIsImmersionMode?: (val: boolean) => void;
    showRecordingIndicator?: boolean;
    setShowRecordingIndicator?: (val: boolean) => void;
    showOrganicTerrain?: boolean;
    setShowOrganicTerrain?: (val: boolean) => void;
    inlineCategories?: any[];
    setInlineCategories?: (...args: any[]) => void;
    isHighlighterEnabled?: boolean;
    setIsHighlighterEnabled?: (val: boolean) => void;
    isBloomEnabled?: boolean;
    setIsBloomEnabled?: (val: boolean) => void;
    isTimestampEnabled?: boolean;
    setIsTimestampEnabled?: (val: boolean) => void;
    autoSaveSessions?: boolean;
    setAutoSaveSessions?: (val: boolean) => void;
    isNewbieMode?: boolean;
    setIsNewbieMode?: (val: boolean) => void;
    [key: string]: any;
}

// --- Hook ---

/**
 * Provides stable refs for audio state that need to be readable
 * inside callbacks without stale closure issues.
 */
export function useSettings(input: UseSettingsInput) {
    const store = useSettingsStore();

    // Stable ref for sound enabled state
    const isSoundEnabledRef = useRef<boolean>(store.isSoundEnabled);
    useEffect(() => {
        isSoundEnabledRef.current = store.isSoundEnabled;
    }, [store.isSoundEnabled]);

    // Stable ref for sound triggers (managed externally, kept empty by default)
    const soundTriggersRef = useRef<SoundTrigger[]>([]);

    // Connection URL derived from store
    const connectionUrl = store.connectionUrl;

    return {
        isSoundEnabledRef,
        soundTriggersRef,
        connectionUrl,
    };
}
