import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import {
    PopoverState, CustomButton, TeleportTarget
} from '../types';
import { usePersistentState } from '../hooks/usePersistentState';
import { useMessageLog } from '../hooks/useMessageLog';
import { useButtons } from '../hooks/useButtons';
import { useJoystick } from '../hooks/useJoystick';
import { useButtonEditor } from '../hooks/useButtonEditor';
import { useViewport } from '../hooks/useViewport';
import { useEnvironment } from '../hooks/useEnvironment';
import { useMessageHighlighter } from '../hooks/useMessageHighlighter';
import { useTelnet } from '../hooks/useTelnet';
import { useGameParser } from '../hooks/useGameParser';
import { useCommandController } from '../hooks/useCommandController';
import { useSettings } from '../hooks/useSettings';
import { useSoundSystem } from '../hooks/useSoundSystem';
import { useSpatButtons } from '../hooks/useSpatButtons';
import { MapperRef } from '../components/Mapper/mapperTypes';

import { GameContextType, VitalsContextType } from './GameContext/types';
import { useGmcpHandlers } from '../hooks/useGmcpHandlers';
import { useGameProviderState } from './GameContext/state';

export const GameContext = createContext<GameContextType | undefined>(undefined);
export const VitalsContext = createContext<VitalsContextType | undefined>(undefined);

export const useBaseGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useBaseGame must be used within a GameProvider');
    return context;
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    const vitals = useContext(VitalsContext);
    if (!vitals) throw new Error('useVitals must be used within a GameProvider');
    return useMemo(() => ({ ...context, ...vitals }), [context, vitals]);
};

export const useVitals = () => {
    const context = useContext(VitalsContext);
    if (!context) throw new Error('useVitals must be used within a GameProvider');
    return context;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { vitals, game } = useGameProviderState();
    const v = vitals;
    const s = game;

    // Destructure some commonly used values for brevity in dependencies
    const {
        roomPlayers, roomNpcs, roomItems,
        isNoviceMode, isSoundEnabled, characterClass, abilities,
        lighting, lightningEnabled, weather, isFoggy,
        actions, actionsRef,
        inCombat, status, characterName,
        mood, spellSpeed, alertness, playerPosition
    } = s;

    const { stats, rumble, hitFlash, deathStage, target, activePrompt } = v;

    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'general' | 'sound' | 'actions' | 'help'>('general');
    const [accentColor, setAccentColor] = usePersistentState('mud-accent-color', '#4a90e2');
    const [teleportTargets, setTeleportTargets] = usePersistentState<TeleportTarget[]>('mud-teleport-targets', []);

    // GMCP Handlers States
    const [roomInfoFn, setRoomInfoFn] = useState<(data: any) => void>();
    const [roomExitsFn, setRoomExitsFn] = useState<(data: any) => void>();
    const [charVitalsFn, setCharVitalsFn] = useState<(data: any) => void>();
    const [roomPlayersFn, setRoomPlayersFn] = useState<(data: any) => void>();
    const [roomNpcsFn, setRoomNpcsFn] = useState<(data: any) => void>();
    const [roomItemsFn, setRoomItemsFn] = useState<(data: any) => void>();
    const [addPlayerFn, setAddPlayerFn] = useState<(data: any) => void>();
    const [addNpcFn, setAddNpcFn] = useState<(data: any) => void>();
    const [removePlayerFn, setRemovePlayerFn] = useState<(data: any) => void>();
    const [removeNpcFn, setRemoveNpcFn] = useState<(data: any) => void>();
    const [opponentChangeFn, setOpponentChangeFn] = useState<(name: string | null) => void>();

    const inCombatHookRef = useRef(false);
    useEffect(() => { inCombatHookRef.current = inCombat; }, [inCombat]);
    const { messages, setMessages, addMessage, flushMessages, isCombatLine, isCommunicationLine } = useMessageLog(inCombatHookRef);
    const addSystemMessage = useCallback((text: string) => addMessage('system', text, undefined, undefined, undefined, { textOnly: text, lower: text.toLowerCase() }), [addMessage]);

    const playSoundRef = useRef<(buffer: AudioBuffer) => void>(() => { });
    const setPlaySound = useCallback((fn: (buffer: AudioBuffer) => void) => { playSoundRef.current = fn; }, []);
    const playSound = useCallback((buffer: AudioBuffer) => playSoundRef.current(buffer), []);

    const triggerHapticRef = useRef<(ms: number) => void>(() => { });
    const setTriggerHaptic = useCallback((fn: (ms: number) => void) => { triggerHapticRef.current = fn; }, []);
    const triggerHaptic = useCallback((ms: number) => triggerHapticRef.current(ms), []);

    const containerRef = useRef<HTMLDivElement>(null);
    const mapperRef = useRef<MapperRef>(null);

    const gmcpHandlers = useGmcpHandlers({
        mapperRef,
        setCurrentTerrain: s.setCurrentTerrain,
        setRoomPlayers: s.setRoomPlayers,
        setRoomNpcs: s.setRoomNpcs,
        setRoomItems: s.setRoomItems,
        characterName: s.characterName,
        setAbilities: s.setAbilities,
        addMessage,
        setCharacterName: s.setCharacterName,
        setPlayerPosition: s.setPlayerPosition,
        setRoomName: s.setRoomName
    });

    const { spatButtons, setSpatButtons, triggerSpit, triggerSpitManual } = useSpatButtons(messages, containerRef, triggerHaptic);

    const btn = useButtons(abilities, characterClass);
    const joystick = useJoystick(triggerHaptic);
    const editor = useButtonEditor(btn, containerRef);
    const viewport = useViewport(s.uiMode, s.disableSmoothScroll, s.disable3dScroll, s.isImmersionMode);
    const env = useEnvironment({
        lighting,
        setLighting: s.setLighting,
        lightningEnabled,
        setLightningEnabled: s.setLightningEnabled,
        weather,
        setWeather: s.setWeather,
        isFoggy,
        setIsFoggy: s.setIsFoggy,
        mood: s.mood,
        setMood: s.setMood,
        spellSpeed: s.spellSpeed,
        setSpellSpeed: s.setSpellSpeed,
        alertness: s.alertness,
        setAlertness: s.setAlertness,
        setDetectLighting: (fn) => { /* internal use */ }
    });

    const { audioCtxRef, initAudio, triggerHaptic: soundSystemHaptic } = useSoundSystem();
    // Wire the real haptic function into the ref immediately
    triggerHapticRef.current = soundSystemHaptic;
    const settings = useSettings({
        addMessage, audioCtxRef, initAudio,
        setButtons: btn.setButtons,
        isNoviceMode, setIsNoviceMode: s.setIsNoviceMode,
        isSoundEnabled, setIsSoundEnabled: s.setIsSoundEnabled,
        abilities, setAbilities: s.setAbilities,
        characterClass, setCharacterClass: s.setCharacterClass,
        actions: s.actions, setActions: s.setActions,
        setSettings: btn.setSettings, setSetSettings: btn.setSetSettings,
        autoConnect: s.autoConnect, setAutoConnect: s.setAutoConnect,
        showDebugEchoes: s.showDebugEchoes, setShowDebugEchoes: s.setShowDebugEchoes,
        uiMode: s.uiMode, setUiMode: s.setUiMode,
        disable3dScroll: s.disable3dScroll, setDisable3dScroll: s.setDisable3dScroll,
        disableSmoothScroll: s.disableSmoothScroll, setDisableSmoothScroll: s.setDisableSmoothScroll,
        isImmersionMode: s.isImmersionMode, setIsImmersionMode: s.setIsImmersionMode
    });

    const { processMessageHtml } = useMessageHighlighter(v.target, btn.buttonsRef, roomPlayers, roomNpcs, s.characterName, roomItems);

    const [input, setInput] = useState("");

    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Create a ref for executeCommand so the parser can use it before the controller is initialized
    const executeCommandRef = useRef<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>(() => { });

    const parser = useGameParser({
        isItemsOpen: s.ui.drawer === 'items',
        isCharacterOpen: s.ui.drawer === 'character',
        mapperRef,
        btn: {
            buttonsRef: btn.buttonsRef,
            setButtons: btn.setButtons,
            buttonTimers: btn.buttonTimers,
            setActiveSet: btn.setActiveSet,
        },
        addMessage, playSound, triggerHaptic,
        setWeather: s.setWeather,
        setIsFoggy: s.setIsFoggy,
        setStats: v.setStats,
        setAbilities: s.setAbilities,
        setCharacterClass: s.setCharacterClass,
        setRumble: v.setRumble,
        setHitFlash: v.setHitFlash,
        setDeathStage: v.setDeathStage,
        setInCombat: s.setInCombat,
        setLightningEnabled: s.setLightningEnabled,
        setPlayerPosition: s.setPlayerPosition,
        detectLighting: env.detectLighting,
        setCurrentTerrain: s.setCurrentTerrain,
        isSoundEnabledRef: settings.isSoundEnabledRef,
        soundTriggersRef: settings.soundTriggersRef,
        actionsRef: s.actionsRef,
        executeCommandRef,
        setInventoryLines: s.setInventoryLines,
        setStatsLines: s.setStatsLines,
        setEqLines: s.setEqLines,
        captureStage: s.captureStage,
        isDrawerCapture: s.isDrawerCapture,
        isSilentCapture: s.isSilentCapture,
        isWaitingForStats: s.isWaitingForStats,
        isWaitingForEq: s.isWaitingForEq,
        isWaitingForInv: s.isWaitingForInv,
        roomNameRef: s.roomNameRef,
        showDebugEchoes: s.showDebugEchoes
    });

    const { processLine } = parser;

    const telnet = useTelnet({
        connectionUrl: settings.connectionUrl,
        processLine,
        setPrompt: v.setActivePrompt,
        onCharNameChange: gmcpHandlers.onCharNameChange,
        onPositionChange: gmcpHandlers.onPositionChange,
        handlers: {
            setStatus: s.setStatus, setStats: v.setStats, setWeather: s.setWeather,
            setIsFoggy: s.setIsFoggy, setInCombat: s.setInCombat,
            addMessage, flushMessages, setRumble: v.setRumble, setHitFlash: v.setHitFlash,
            setDeathStage: v.setDeathStage, detectLighting: env.detectLighting,
            onRoomInfo: (data) => { gmcpHandlers.onRoomInfo(data); roomInfoFn?.(data); },
            onRoomUpdateExits: (data) => { gmcpHandlers.onRoomUpdateExits(data); roomExitsFn?.(data); },
            onCharVitals: (data) => { gmcpHandlers.onCharVitals(data); charVitalsFn?.(data); },
            onRoomPlayers: (data) => { gmcpHandlers.onRoomPlayers(data); roomPlayersFn?.(data); },
            onRoomNpcs: (data) => { gmcpHandlers.onRoomNpcs(data); roomNpcsFn?.(data); },
            onRoomItems: (data) => { gmcpHandlers.onRoomItems(data); roomItemsFn?.(data); },
            onAddPlayer: (data) => { gmcpHandlers.onAddPlayer(data); addPlayerFn?.(data); },
            onAddNpc: (data) => { gmcpHandlers.onAddNpc(data); addNpcFn?.(data); },
            onRemovePlayer: (data) => { gmcpHandlers.onRemovePlayer(data); removePlayerFn?.(data); },
            onRemoveNpc: (data) => { gmcpHandlers.onRemoveNpc(data); removeNpcFn?.(data); },
            onCharNameChange: gmcpHandlers.onCharNameChange,
            onPositionChange: gmcpHandlers.onPositionChange,
            onOpponentChange: (name) => { opponentChangeFn?.(name); }
        }
    });


    const controller = useCommandController({
        telnet, addMessage, initAudio: () => { },
        navIntervalRef, mapperRef, teleportTargets,
        setCommandPreview: () => { }, setInput, triggerHaptic, btn, joystick,
        wasDraggingRef: editor.wasDraggingRef,
        setIsSettingsOpen, setSettingsTab,
        captureStage: s.captureStage, isDrawerCapture: s.isDrawerCapture, isSilentCapture: s.isSilentCapture,
        isWaitingForStats: s.isWaitingForStats, isWaitingForEq: s.isWaitingForEq, isWaitingForInv: s.isWaitingForInv,
        setInventoryLines: s.setInventoryLines, setStatsLines: s.setStatsLines, setEqLines: s.setEqLines,
        input, isNoviceMode, status: s.status, target: v.target, setTarget: v.setTarget,
        popoverState, setPopoverState,
        setIsCharacterOpen: s.setIsCharacterOpen,
        setIsItemsDrawerOpen: s.setIsItemsDrawerOpen,
        setIsMapExpanded: s.setIsMapExpanded,
        viewport,
        ui: s.ui,
        actions: s.actions,
        setActions: s.setActions
    });

    const { handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick, handleDragStart } = controller;

    // Update the ref so the parser components can call it
    useEffect(() => {
        executeCommandRef.current = executeCommand;
    }, [executeCommand]);

    // Auto-login session tracking
    const autoLoginSessionRef = useRef({ nameSent: false, passwordSent: false, lastStatus: '' });

    useEffect(() => {
        // Reset session tracking when we start a new connection
        if (s.status === 'connecting' && autoLoginSessionRef.current.lastStatus !== 'connecting') {
            autoLoginSessionRef.current = { nameSent: false, passwordSent: false, lastStatus: 'connecting' };
        }
        autoLoginSessionRef.current.lastStatus = s.status;

        if (s.status !== 'connected' || !v.activePrompt) return;

        const lower = v.activePrompt.toLowerCase();

        // Handle Name Prompt
        if (settings.loginName && !autoLoginSessionRef.current.nameSent) {
            if (lower.includes("by what name do you wish to be known?") || lower.includes("what is your name?") || lower.includes("character's name")) {
                autoLoginSessionRef.current.nameSent = true;
                addSystemMessage(`Auto-login: Sending name: ${settings.loginName}`);
                executeCommand(settings.loginName, true, true);
            }
        }

        // Handle Password Prompt (only if name was sent or we don't have a name/prompt for it)
        if (settings.loginPassword && !autoLoginSessionRef.current.passwordSent) {
            if (lower.includes("password:")) {
                autoLoginSessionRef.current.passwordSent = true;
                addSystemMessage(`Auto-login: Sending password...`);
                executeCommand(settings.loginPassword, true, true);
            }
        }
    }, [v.activePrompt, s.status, settings.loginName, settings.loginPassword, executeCommand, addSystemMessage]);

    // Practice sync on character detection
    const lastSyncedCharRef = useRef<string | null>(null);
    useEffect(() => {
        if (s.characterName && s.characterName !== lastSyncedCharRef.current && s.status === 'connected') {
            lastSyncedCharRef.current = s.characterName;
            // Delay slightly to ensure login sequence is fully finished
            setTimeout(() => {
                executeCommand('practice', true, true);
            }, 2000);
        } else if (!s.characterName) {
            lastSyncedCharRef.current = null;
        }
    }, [s.characterName, s.status, executeCommand]);

    // Only on mount
    useEffect(() => {
        if (s.autoConnect && s.status === 'disconnected') {
            telnet.connect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Phase 1: First-Run Onboarding Greeting
    useEffect(() => {
        if (s.status === 'connected' && !s.hasSeenOnboarding && s.isNoviceMode) {
            const greetingMessages = [
                "Welcome! The map (top-right) tracks your movement automatically.",
                "Vitals (top-center) show your status. Click a target's name in the log to lock onto them.",
                "Tactical buttons (bottom-sides) can be swiped for extra actions."
            ];
            greetingMessages.forEach((msg, i) => {
                setTimeout(() => {
                    addSystemMessage(msg);
                }, 1000 * (i + 1));
            });
        }
    }, [s.status, s.hasSeenOnboarding, s.isNoviceMode, addSystemMessage]);

    // Handle keyboard-triggered visibility for buttons
    useEffect(() => {
        const isKeyboardOpen = viewport.isKeyboardOpen;
        if (isKeyboardOpen) {
            btn.rawButtons.forEach(b => {
                if (b.trigger?.enabled && b.trigger.onKeyboard && b.trigger.spit) {
                    triggerSpitManual(b);
                }
            });
        }

        btn.setButtons(prev => {
            let changed = false;
            const next = prev.map(b => {
                if (b.trigger?.enabled && (b.trigger.onKeyboard || b.trigger.offKeyboard) && !b.trigger.spit) {
                    const shouldBeVisible = isKeyboardOpen;
                    if (b.isVisible !== shouldBeVisible) {
                        changed = true;
                        return { ...b, isVisible: shouldBeVisible };
                    }
                }
                return b;
            });
            return changed ? next : prev;
        });
    }, [viewport.isKeyboardOpen, btn.setButtons, btn.rawButtons, triggerSpitManual]);

    const gameValue = useMemo(() => ({
        ...s,
        popoverState, setPopoverState,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        accentColor, setAccentColor,
        teleportTargets, setTeleportTargets,
        onRoomInfo: roomInfoFn, setOnRoomInfo: setRoomInfoFn,
        onRoomUpdateExits: roomExitsFn, setOnRoomUpdateExits: setRoomExitsFn,
        onCharVitals: charVitalsFn, setOnCharVitals: setCharVitalsFn,
        onRoomPlayers: roomPlayersFn, setOnRoomPlayers: setRoomPlayersFn,
        onRoomNpcs: roomNpcsFn, setOnRoomNpcs: setRoomNpcsFn,
        onRoomItems: roomItemsFn, setOnRoomItems: setRoomItemsFn,
        onAddPlayer: addPlayerFn, setOnAddPlayer: setAddPlayerFn,
        onAddNpc: addNpcFn, setOnAddNpc: setAddNpcFn,
        onRemovePlayer: removePlayerFn, setOnRemovePlayer: setRemovePlayerFn,
        onRemoveNpc: removeNpcFn, setOnRemoveNpc: setRemoveNpcFn,
        onOpponentChange: opponentChangeFn, setOnOpponentChange: setOpponentChangeFn,
        messages, setMessages, addMessage, addSystemMessage,
        isCombatLine, isCommunicationLine,
        playSound, setPlaySound, triggerHaptic, setTriggerHaptic,
        btn, joystick, editor, containerRef, viewport, env, processMessageHtml,
        setSettings: btn.setSettings, setSetSettings: btn.setSetSettings,
        input, setInput,
        handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick,
        hasSeenOnboarding: s.hasSeenOnboarding, setHasSeenOnboarding: s.setHasSeenOnboarding,
        mapperRef, ...settings, audioCtxRef,
        telnet, parser,
        spatButtons, setSpatButtons,
        detectLighting: env.detectLighting,
        setDetectLighting: (fn: (text: string) => void) => { /* internal use */ }
    }), [
        s, popoverState, isSettingsOpen, settingsTab, accentColor, teleportTargets,
        roomInfoFn, roomExitsFn, charVitalsFn, roomPlayersFn, roomNpcsFn, roomItemsFn,
        addPlayerFn, addNpcFn, removePlayerFn, removeNpcFn, opponentChangeFn,
        messages, setMessages, addMessage, addSystemMessage,
        isCombatLine, isCommunicationLine, playSound, triggerHaptic,
        btn, joystick, editor, viewport, env, processMessageHtml,
        input, handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick,
        settings, audioCtxRef, telnet, parser
    ]);

    return (
        <GameContext.Provider value={gameValue as any}>
            <VitalsContext.Provider value={v}>
                {children}
            </VitalsContext.Provider>
        </GameContext.Provider>
    );
};

