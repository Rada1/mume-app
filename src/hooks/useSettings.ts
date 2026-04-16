import { useState, useEffect, useRef, useCallback } from 'react';
import { CustomButton, SoundTrigger, SavedSettings, GameAction, ButtonSetSettings } from '../types';
import { DEFAULT_BG, DEFAULT_URL } from '../constants';
import MASTER_SETTINGS from '../constants/mastersettings.json';
import { usePersistentState } from './usePersistentState';
import { MessageType } from '../types';

interface UseSettingsDeps {
    addMessage: (type: MessageType, text: string) => void;
    audioCtxRef: React.RefObject<AudioContext | null>;
    initAudio: () => void;
    setButtons: (buttons: CustomButton[]) => void;

    // Dependencies previously fetched via useGame()
    isSoundEnabled: boolean;
    setIsSoundEnabled: (val: boolean) => void;
    abilities: Record<string, number>;
    setAbilities: (val: Record<string, number>) => void;
    characterClass: any;
    setCharacterClass: (val: any) => void;
    actions: GameAction[];
    setActions: (val: GameAction[]) => void;
    setSettings: Record<string, ButtonSetSettings>;
    setSetSettings: (val: Record<string, ButtonSetSettings>) => void;
    autoConnect: boolean;
    setAutoConnect: (val: boolean) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;
    uiMode: import('../types').UiMode;
    setUiMode: (val: import('../types').UiMode) => void;
    disable3dScroll: boolean;
    setDisable3dScroll: (val: boolean) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    showRecordingIndicator: boolean;
    setShowRecordingIndicator: (val: boolean) => void;
    showOrganicTerrain: boolean;
    setShowOrganicTerrain: (val: boolean) => void;
    inlineCategories: import('../types').InlineCategoryConfig[];
    setInlineCategories: (val: import('../types').InlineCategoryConfig[]) => void;
    isHighlighterEnabled: boolean;
    setIsHighlighterEnabled: (val: boolean) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    autoSaveSessions: boolean;
    setAutoSaveSessions: (val: boolean) => void;
    isNewbieMode: boolean;
    setIsNewbieMode: (val: boolean) => void;
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
}

export function useSettings(deps: UseSettingsDeps) {
    const {
        addMessage, audioCtxRef, initAudio, setButtons,
        isSoundEnabled, setIsSoundEnabled,
        abilities, setAbilities, characterClass, setCharacterClass,
        actions, setActions,
        setSettings, setSetSettings,
        autoConnect, setAutoConnect,
        showDebugEchoes, setShowDebugEchoes,
        uiMode, setUiMode,
        disable3dScroll, setDisable3dScroll,
        disableSmoothScroll, setDisableSmoothScroll,
        isImmersionMode, setIsImmersionMode,
        showRecordingIndicator, setShowRecordingIndicator,
        inlineCategories, setInlineCategories,
        isHighlighterEnabled, setIsHighlighterEnabled,
        isBloomEnabled, setIsBloomEnabled,
        isTimestampEnabled, setIsTimestampEnabled,
        autoSaveSessions, setAutoSaveSessions,
        isNewbieMode, setIsNewbieMode,
        connectionUrl, setConnectionUrl
    } = deps;
    const [bgImage, setBgImage] = useState((MASTER_SETTINGS as any).bgImage || DEFAULT_BG);
    const [loginName, setLoginName] = usePersistentState<string>('mud-login-name', '');
    const [loginPassword, setLoginPassword] = usePersistentState<string>('mud-login-password', '');
    const [isLoading, setIsLoading] = useState(false);
    const [soundTriggers, setSoundTriggers] = useState<SoundTrigger[]>([]);
    const [newSoundPattern, setNewSoundPattern] = useState('');
    const [newSoundRegex, setNewSoundRegex] = useState(false);

    const [favorites, setFavorites] = usePersistentState<string[]>('mud-favorites', []);

    // Keep a ref for isSoundEnabled so processLine can read it synchronously
    const isSoundEnabledRef = useRef(isSoundEnabled);
    useEffect(() => { isSoundEnabledRef.current = isSoundEnabled; }, [isSoundEnabled]);

    const soundTriggersRef = useRef(soundTriggers);
    useEffect(() => { soundTriggersRef.current = soundTriggers; }, [soundTriggers]);


    // Sync connectionUrl when mmapper mode changes (called by MudClient which owns isMmapperMode)
    const handleMmapperModeChange = useCallback((enabled: boolean) => {
        if (enabled) {
            setConnectionUrl('ws://localhost:8080');
        } else if (connectionUrl === 'ws://localhost:8080') {
            setConnectionUrl(DEFAULT_URL);
        }
    }, [connectionUrl]);

    // --- Settings file handlers ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string') setBgImage(ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const exportSettings = () => {
        const settings: SavedSettings = {
            version: 3,
            connectionUrl,
            bgImage,
            loginName,
            loginPassword,
            isSoundEnabled,
            buttons: [] as any, // filled by caller via onExport
            soundTriggers: soundTriggers.map(({ buffer, ...rest }) => rest),
            actions,
            abilities,
            characterClass,
            setSettings,
            autoConnect,
            showDebugEchoes,
            uiMode,
            disable3dScroll,
            disableSmoothScroll,
            isImmersionMode,
            showRecordingIndicator,
            inlineCategories,
            favorites,
            isTimestampEnabled,
            isBloomEnabled,
            autoSaveSessions
        };
        // Note: buttons array is injected by the caller — see MudClient.exportSettings wrapper
        return settings;
    };

    const exportSettingsFile = (buttons: CustomButton[]) => {
        const settings: SavedSettings = {
            version: 3, connectionUrl, bgImage, loginName, loginPassword,
            isBloomEnabled, isTimestampEnabled,
            isSoundEnabled,
            buttons: buttons.map(b => ({ ...b, isVisible: undefined } as any)),
            soundTriggers: soundTriggers.map(({ buffer, ...rest }) => rest),
            actions,
            abilities,
            characterClass,
            setSettings,
            autoConnect,
            showDebugEchoes,
            uiMode,
            disable3dScroll,
            disableSmoothScroll,
            isImmersionMode,
            showRecordingIndicator,
            inlineCategories,
            favorites,
            autoSaveSessions
        };
        const blob = new Blob([JSON.stringify(settings)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mume - settings - ${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importSettings = (e: React.ChangeEvent<HTMLInputElement>, setIsSettingsOpen: (v: boolean) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        initAudio();
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                if (typeof ev.target?.result === 'string') {
                    const settings: SavedSettings = JSON.parse(ev.target.result);
                    if (settings.connectionUrl) setConnectionUrl(settings.connectionUrl);
                    if (settings.bgImage) setBgImage(settings.bgImage);
                    if (settings.loginName) setLoginName(settings.loginName);
                    if (settings.loginPassword) setLoginPassword(settings.loginPassword);
                    if (settings.isSoundEnabled !== undefined) setIsSoundEnabled(settings.isSoundEnabled);
                    if (settings.isNewbieMode !== undefined) setIsNewbieMode(settings.isNewbieMode);
                    if (settings.abilities) setAbilities(settings.abilities);
                    if (settings.characterClass) setCharacterClass(settings.characterClass);
                    if (settings.actions) setActions(settings.actions);
                    if (settings.setSettings) setSetSettings(settings.setSettings);
                    if (settings.autoConnect !== undefined) setAutoConnect(settings.autoConnect);
                    if (settings.showDebugEchoes !== undefined) setShowDebugEchoes(settings.showDebugEchoes);
                    if (settings.uiMode !== undefined) setUiMode(settings.uiMode);
                    if (settings.disable3dScroll !== undefined) setDisable3dScroll(settings.disable3dScroll);
                    if (settings.disableSmoothScroll !== undefined) setDisableSmoothScroll(settings.disableSmoothScroll);
                    if (settings.isImmersionMode !== undefined) setIsImmersionMode(settings.isImmersionMode);
                    if (settings.showRecordingIndicator !== undefined) setShowRecordingIndicator(settings.showRecordingIndicator);
                    if (settings.inlineCategories) setInlineCategories(settings.inlineCategories);
                    if (settings.isHighlighterEnabled !== undefined) setIsHighlighterEnabled(settings.isHighlighterEnabled);
                    if (settings.isBloomEnabled !== undefined) setIsBloomEnabled(settings.isBloomEnabled);
                    if (settings.isTimestampEnabled !== undefined) setIsTimestampEnabled(settings.isTimestampEnabled);
                    if (settings.autoSaveSessions !== undefined) setAutoSaveSessions(settings.autoSaveSessions);
                    if (settings.favorites) setFavorites(settings.favorites);
                    if (settings.buttons) setButtons(settings.buttons.map(b => ({ ...b, isVisible: !b.trigger?.enabled })));
                    if (settings.soundTriggers && audioCtxRef.current) {
                        const restored: SoundTrigger[] = [];
                        for (const s of settings.soundTriggers) {
                            try {
                                const srcDataList = Array.isArray(s.srcData) ? s.srcData : [s.srcData];
                                const buffers: AudioBuffer[] = [];
                                for (const data of srcDataList) {
                                    const res = await fetch(data);
                                    const ab = await res.arrayBuffer();
                                    const ad = await audioCtxRef.current.decodeAudioData(ab);
                                    buffers.push(ad);
                                }
                                restored.push({ ...s, buffers } as SoundTrigger);
                            } catch (err) { console.error("Failed to restore sound:", s.fileName); }
                        }
                        setSoundTriggers(restored);
                    }
                    addMessage('system', 'Settings loaded successfully.');
                    setIsSettingsOpen(false);
                }
            } catch (err) { addMessage('error', 'Failed to load settings file.'); }
            finally { setIsLoading(false); }
        };
        reader.readAsText(file);
    };

    const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        initAudio();
        const file = e.target.files?.[0];
        if (file && audioCtxRef.current) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (typeof ev.target?.result === 'string') {
                    try {
                        const srcData = ev.target.result;
                        const res = await fetch(srcData);
                        const ab = await res.arrayBuffer();
                        const ad = await audioCtxRef.current!.decodeAudioData(ab);

                        const pattern = newSoundPattern || file.name;

                        setSoundTriggers(prev => {
                            const existingIdx = prev.findIndex(t => t.pattern === pattern && t.isRegex === newSoundRegex);
                            if (existingIdx >= 0) {
                                const next = [...prev];
                                const current = next[existingIdx];
                                next[existingIdx] = {
                                    ...current,
                                    buffers: [...(current.buffers || (current.buffer ? [current.buffer] : [])), ad],
                                    srcData: [...(Array.isArray(current.srcData) ? current.srcData : [current.srcData]), srcData],
                                    fileName: [...(Array.isArray(current.fileName) ? current.fileName : [current.fileName]), file.name]
                                };
                                return next;
                            } else {
                                return [...prev, {
                                    id: Math.random().toString(36).substring(7),
                                    pattern,
                                    isRegex: newSoundRegex,
                                    buffers: [ad],
                                    srcData: [srcData],
                                    fileName: [file.name]
                                }];
                            }
                        });
                        setNewSoundPattern('');
                    } catch (err) { addMessage('error', 'Failed to process audio file.'); }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return {
        bgImage, setBgImage,
        connectionUrl, setConnectionUrl,
        loginName, setLoginName,
        loginPassword, setLoginPassword,
        isLoading, setIsLoading,
        isSoundEnabled, setIsSoundEnabled,
        isSoundEnabledRef,
        soundTriggers, setSoundTriggers,
        soundTriggersRef,
        newSoundPattern, setNewSoundPattern,
        newSoundRegex, setNewSoundRegex,
        handleFileUpload,
        exportSettings,
        exportSettingsFile,
        importSettings,
        handleSoundUpload,
        handleMmapperModeChange,
        setSettings, setSetSettings,
        autoConnect, setAutoConnect,
        showDebugEchoes, setShowDebugEchoes,
        uiMode, setUiMode,
        disable3dScroll, setDisable3dScroll,
        disableSmoothScroll, setDisableSmoothScroll,
        isImmersionMode, setIsImmersionMode,
        showRecordingIndicator, setShowRecordingIndicator,
        isHighlighterEnabled, setIsHighlighterEnabled,
        isBloomEnabled, setIsBloomEnabled,
        isTimestampEnabled, setIsTimestampEnabled,
        favorites, setFavorites,
        autoSaveSessions, setAutoSaveSessions
    };
}
