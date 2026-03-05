import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
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
import { MapperRef } from '../components/Mapper/mapperTypes';

import { GameContextType } from './GameContext/types';
import { useGmcpHandlers } from '../hooks/useGmcpHandlers';
import { useGameProviderState } from './GameContext/state';

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const s = useGameProviderState();

    // Destructure some commonly used values for brevity in dependencies
    const {
        inCombat, inCombatRef, characterName, roomPlayers, roomNpcs,
        characterName: charName, roomItems, target, status,
        isNoviceMode, isSoundEnabled, abilities, characterClass,
        lighting, lightningEnabled, weather, isFoggy, mood, spellSpeed, alertness
    } = s;

    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'general' | 'sound' | 'actions'>('general');
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

    const { messages, setMessages, addMessage, isCombatLine, isCommunicationLine } = useMessageLog(inCombatRef);
    const addSystemMessage = useCallback((text: string) => addMessage('system', text), [addMessage]);

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
        characterName,
        setAbilities: s.setAbilities,
        addMessage,
        setCharacterName: s.setCharacterName,
        setPlayerPosition: s.setPlayerPosition
    });

    const btn = useButtons(abilities, characterClass);
    const joystick = useJoystick();
    const editor = useButtonEditor(btn, containerRef);
    const viewport = useViewport();
    const env = useEnvironment({
        lighting,
        setLighting: s.setLighting,
        lightningEnabled,
        setLightningEnabled: s.setLightningEnabled,
        weather,
        setWeather: s.setWeather,
        isFoggy,
        setIsFoggy: s.setIsFoggy,
        mood,
        setMood: s.setMood,
        spellSpeed,
        setSpellSpeed: s.setSpellSpeed,
        alertness,
        setAlertness: s.setAlertness,
        setDetectLighting: (fn) => { /* internal use */ }
    });

    const { audioCtxRef, initAudio } = useSoundSystem();
    const settings = useSettings({
        addMessage, audioCtxRef, initAudio,
        setButtons: btn.setButtons,
        isNoviceMode, setIsNoviceMode: s.setIsNoviceMode,
        isSoundEnabled, setIsSoundEnabled: s.setIsSoundEnabled,
        abilities, setAbilities: s.setAbilities,
        characterClass, setCharacterClass: s.setCharacterClass,
        actions: s.actions, setActions: s.setActions,
        setSettings: btn.setSettings, setSetSettings: btn.setSetSettings
    });

    const { processMessageHtml } = useMessageHighlighter(target, btn.buttonsRef, roomPlayers, roomNpcs, characterName, roomItems);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [activePrompt, setActivePrompt] = useState("");
    const [input, setInput] = useState("");

    const getMessageClassStyle = useCallback((index: number, total: number) => {
        const anchorIndex = focusedIndex !== null ? focusedIndex : total - 1;
        const distance = anchorIndex - index;
        if (distance < 10) return 'msg-latest';
        if (distance < 30) return 'msg-recent';
        if (distance < 100) return 'msg-old';
        return 'msg-ancient';
    }, [focusedIndex]);

    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Create a ref for executeCommand so the parser can use it before the controller is initialized
    const executeCommandRef = useRef<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>(() => { });

    const parser = useGameParser({
        isInventoryOpen: s.ui.drawer === 'inventory',
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
        setStats: s.setStats,
        setAbilities: s.setAbilities,
        setCharacterClass: s.setCharacterClass,
        setRumble: s.setRumble,
        setHitFlash: s.setHitFlash,
        setDeathStage: s.setDeathStage,
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
        isWaitingForStats: s.isWaitingForStats,
        isWaitingForEq: s.isWaitingForEq,
        isWaitingForInv: s.isWaitingForInv
    });

    const { processLine } = parser;

    const telnet = useTelnet({
        connectionUrl: settings.connectionUrl,
        processLine,
        setPrompt: setActivePrompt,
        onCharNameChange: gmcpHandlers.onCharNameChange,
        onPositionChange: gmcpHandlers.onPositionChange,
        handlers: {
            setStatus: s.setStatus, setStats: s.setStats, setWeather: s.setWeather,
            setIsFoggy: s.setIsFoggy, setInCombat: s.setInCombat,
            addMessage, setRumble: s.setRumble, setHitFlash: s.setHitFlash,
            setDeathStage: s.setDeathStage, detectLighting: env.detectLighting,
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
            onOpponentChange: (name) => { opponentChangeFn?.(name); }
        }
    });


    const controller = useCommandController({
        telnet, addMessage, initAudio: () => { },
        navIntervalRef, mapperRef, teleportTargets,
        setCommandPreview: () => { }, setInput, triggerHaptic, btn, joystick,
        wasDraggingRef: editor.wasDraggingRef,
        captureStage: s.captureStage, isDrawerCapture: s.isDrawerCapture,
        isWaitingForStats: s.isWaitingForStats, isWaitingForEq: s.isWaitingForEq, isWaitingForInv: s.isWaitingForInv,
        setInventoryLines: s.setInventoryLines, setStatsLines: s.setStatsLines, setEqLines: s.setEqLines,
        input, isNoviceMode, status, target, setTarget: s.setTarget,
        popoverState, setPopoverState,
        setIsInventoryOpen: s.setIsInventoryOpen,
        setIsCharacterOpen: s.setIsCharacterOpen,
        setIsRightDrawerOpen: s.setIsRightDrawerOpen,
        setIsMapExpanded: s.setIsMapExpanded,
        viewport,
        ui: s.ui,
        actions: s.actions,
        setActions: s.setActions
    });

    const { handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick } = controller;

    // Update the ref so the parser components can call it
    useEffect(() => {
        executeCommandRef.current = executeCommand;
    }, [executeCommand]);

    return (
        <GameContext.Provider value={{
            ...s,
            popoverState, setPopoverState,
            isSettingsOpen, setIsSettingsOpen,
            settingsTab, setSettingsTab,
            accentColor, setAccentColor,
            showControls: s.showControls, setShowControls: s.setShowControls,
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
            focusedIndex, setFocusedIndex, getMessageClassStyle,
            activePrompt, setActivePrompt, input, setInput,
            handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick,
            mapperRef, ...settings, audioCtxRef,
            telnet, parser,
            detectLighting: (sym) => { }, setDetectLighting: (fn) => { }
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    return context;
};
