import { useState, useEffect, useRef, useCallback } from 'react';
import { CustomButton, SoundTrigger, SavedSettings } from '../types';
import { useGame } from '../context/GameContext';
import { DEFAULT_BG, DEFAULT_URL } from '../constants';
import { MessageType } from '../types';

interface UseSettingsDeps {
    addMessage: (type: MessageType, text: string) => void;
    audioCtxRef: React.RefObject<AudioContext | null>;
    initAudio: () => void;
    setButtons: (buttons: CustomButton[]) => void;
}

export function useSettings({ addMessage, audioCtxRef, initAudio, setButtons }: UseSettingsDeps) {
    const { isNoviceMode, setIsNoviceMode, isSoundEnabled, setIsSoundEnabled } = useGame();
    const [bgImage, setBgImage] = useState(DEFAULT_BG);
    const [connectionUrl, setConnectionUrl] = useState(DEFAULT_URL);
    const [loginName, setLoginName] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [soundTriggers, setSoundTriggers] = useState<SoundTrigger[]>([]);
    const [newSoundPattern, setNewSoundPattern] = useState('');
    const [newSoundRegex, setNewSoundRegex] = useState(false);

    // Keep a ref for isSoundEnabled so processLine can read it synchronously
    const isSoundEnabledRef = useRef(isSoundEnabled);
    useEffect(() => { isSoundEnabledRef.current = isSoundEnabled; }, [isSoundEnabled]);


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
            isNoviceMode,
            buttons: [] as any, // filled by caller via onExport
            soundTriggers: soundTriggers.map(({ buffer, ...rest }) => rest)
        };
        // Note: buttons array is injected by the caller — see MudClient.exportSettings wrapper
        return settings;
    };

    const exportSettingsFile = (buttons: CustomButton[]) => {
        const settings: SavedSettings = {
            version: 3, connectionUrl, bgImage, loginName, loginPassword,
            isSoundEnabled, isNoviceMode,
            buttons: buttons.map(b => ({ ...b, isVisible: undefined } as any)),
            soundTriggers: soundTriggers.map(({ buffer, ...rest }) => rest)
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
                    if (settings.isNoviceMode !== undefined) setIsNoviceMode(settings.isNoviceMode);
                    if (settings.buttons) setButtons(settings.buttons.map(b => ({ ...b, isVisible: !b.trigger?.enabled })));
                    if (settings.soundTriggers && audioCtxRef.current) {
                        const restored: SoundTrigger[] = [];
                        for (const s of settings.soundTriggers) {
                            try {
                                const res = await fetch(s.srcData);
                                const ab = await res.arrayBuffer();
                                const ad = await audioCtxRef.current.decodeAudioData(ab);
                                restored.push({ ...s, buffer: ad } as SoundTrigger);
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
                        const newSound: SoundTrigger = {
                            id: Math.random().toString(36).substring(7),
                            pattern: newSoundPattern || file.name,
                            isRegex: newSoundRegex,
                            buffer: ad,
                            srcData,
                            fileName: file.name
                        };
                        setSoundTriggers(prev => [...prev, newSound]);
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
        isNoviceMode, setIsNoviceMode,
        isLoading, setIsLoading,
        isSoundEnabled, setIsSoundEnabled,
        isSoundEnabledRef,
        soundTriggers, setSoundTriggers,
        newSoundPattern, setNewSoundPattern,
        newSoundRegex, setNewSoundRegex,
        handleFileUpload,
        exportSettings,
        exportSettingsFile,
        importSettings,
        handleSoundUpload,
        handleMmapperModeChange,
    };
}
