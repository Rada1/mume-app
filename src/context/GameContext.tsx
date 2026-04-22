import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    PopoverState, CustomButton, TeleportTarget, GmcpOccupant, SessionMode, CombatHealthStatus
} from '../types';
import { useMessageLog } from '../hooks/useMessageLog';
import { useButtons } from '../hooks/useButtons';
import { useJoystick } from '../hooks/useJoystick';
import { useButtonEditor } from '../hooks/useButtonEditor';
import { useViewport } from '../hooks/useViewport';
import { useEnvironment } from '../hooks/useEnvironment';
import { useMessageHighlighter } from '../hooks/useMessageHighlighter';
import { useTelnet } from '../hooks/useTelnet';
import { ProtocolHandler } from '../utils/telnet/ProtocolHandler';
import { GmcpDecoder } from '../utils/telnet/GmcpDecoder';
import { useGameParser } from '../hooks/GameParser/useGameParser';
import { UseGameParserDeps } from '../hooks/GameParser/types';
import { useCommandController } from '../hooks/useCommandController';
import { useSpatButtons } from '../hooks/useSpatButtons';
import { usePracticeHandler } from '../hooks/usePracticeHandler';
import { useQuestsHandler } from '../hooks/useQuestsHandler';
import { useShopHandler } from '../hooks/useShopHandler';
import { useHelpHandler } from '../hooks/useHelpHandler';
import { useKeywordOverrides } from '../hooks/useKeywordOverrides';
import { MapperRef } from '../components/Mapper/mapperTypes';

import { GameContextType, VitalsContextType, LogContextType, UIContextType } from './GameContext/types';
import { useGmcpHandlers } from '../hooks/useGmcpHandlers/index';
import { useGameProviderState } from './GameContext/state';
import { useSessionManager } from '../hooks/useSessionManager';
import { useAmbientController, useAudioEffects } from '../hooks/useAudioSystem';
import { useSessionRecorder } from '../hooks/useSessionRecorder';
import { useSessionReplayer } from '../hooks/useSessionReplayer';
import { useSettings } from '../hooks/useSettings';
import { useAgentObservability } from '../hooks/useAgentObservability';
import { ansiConvert } from '../utils/ansi';

// --- Store Imports ---
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useVitalsStore } from '../stores/useVitalsStore';
import { useNetworkStore } from '../stores/useNetworkStore';
import { useModeStore } from '../stores/useModeStore';
import { useSessionStore } from '../stores/useSessionStore';

export const GameContext = createContext<GameContextType | undefined>(undefined);
export const VitalsContext = createContext<VitalsContextType | undefined>(undefined);
export const LogContext = createContext<LogContextType | undefined>(undefined);
export const UIContext = createContext<UIContextType | undefined>(undefined);

export const useBaseGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useBaseGame must be used within a GameProvider');
    return context;
};

export const useLog = () => {
    const context = useContext(LogContext);
    if (!context) throw new Error('useLog must be used within a GameProvider');
    return context;
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a GameProvider');
    return context;
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    return context;
};

export const useVitals = () => {
    const context = useContext(VitalsContext);
    if (!context) throw new Error('useVitals must be used within a GameProvider');
    return context;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Basic State
    const [highlightVersion, setHighlightVersion] = useState(0);
    const refreshLogHighlights = useCallback(() => setHighlightVersion(v => v + 1), []);
    
    const { vitals: v, game: s } = useGameProviderState();
    const ui = useUIStore();
    const settingsStore = useSettingsStore();
    
    // 2. Audio System
    useAmbientController();
    const {
        audioCtxRef, initAudio, playMovementSound, playDoorSound, playClickSound,
        playHitImpactSound, playOofSound, playSlashSound, playCleaveSound,
        playSmiteSound, playPierceSound, playStabSound, playArrowHitSound,
        playBuySellSound, playBashSound, playKillSound, playLevelSound,
        playIncantationSound, stopIncantationSound, playMagicExplosionSound,
        playCommMessageSound, triggerHaptic, playEffect,
        playSound, playRandomSound
    } = useAudioEffects();

    // 3. Logic Hooks
    const env = useEnvironment({
        lighting: s.lighting || 'none', setLighting: s.setLighting,
        lightningEnabled: s.lightningEnabled, setLightningEnabled: s.setLightningEnabled,
        weather: s.weather || 'none', setWeather: s.setWeather,
        isFoggy: s.isFoggy, setIsFoggy: s.setIsFoggy,
        mood: s.mood, setMood: s.setMood,
        spellSpeed: s.spellSpeed, setSpellSpeed: s.setSpellSpeed,
        alertness: s.alertness, setAlertness: s.setAlertness
    });

    const viewport = useViewport(s.uiMode, s.disableSmoothScroll, s.isImmersionMode, s.fontFamily, s.isTimestampEnabled);
    const mode = useModeStore();
    const session = useSessionStore();
    const { 
        sessionMode, setSessionMode, replayHUDState, setReplayHUDState, isSilentReplay,
        setRoomInfoFn, setRoomExitsFn, setCharVitalsFn, setRoomPlayersFn, setRoomNpcsFn,
        setRoomItemsFn, setAddPlayerFn, setAddNpcFn, setRemovePlayerFn, setRemoveNpcFn,
        setOpponentChangeFn, setCommFn, setGroupAddFn, setGroupUpdateFn, setGroupRemoveFn, setGroupSetFn
    } = session;

    // 4. Session & Replayer
    const activeLog = mode.activeView === 'self' ? s.userSession.log : s.spectateSession.log;
    
    // Stable message routing: ensure snoop lines always land in the spectate bucket 
    // regardless of which view is currently active. This prevents "leaking" snoop 
    // data into the main log or losing our own tells while viewing the target.
    const routedAddMessage = React.useCallback((type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: any, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => {
        if (type === 'snoop' || type === 'snoop-command' || type === 'snoop-vitals') {
            s.spectateSession.log.addMessage(type, text, combatOverride, mid, isRoomName, precalculated, shopItem, practiceSkill, practiceHeader, skipBrevity);
        } else {
            s.userSession.log.addMessage(type, text, combatOverride, mid, isRoomName, precalculated, shopItem, practiceSkill, practiceHeader, skipBrevity);
        }
    }, [s.userSession.log, s.spectateSession.log]);

    const { messages, setMessages, addSystemMessage, flushMessages, clearLog } = activeLog;
    const addMessage = routedAddMessage; // Use the router for the parser
    
    const replayer = useSessionReplayer(useCallback((type, payload, isPrivacyMode, isSilent = false) => {
        // ... replayer implementation details ...
    }, []));

    // 5. Networking
    const telnetRef = useRef<any>(null);
    const sendGMCPProxy = useCallback((pkg: string, data: any = null) => {
        if (telnetRef.current) {
            telnetRef.current.sendGMCP(pkg, data);
        }
    }, []);

    const gmcpHandlers = useGmcpHandlers({
        mapperRef: useRef<MapperRef>(null), roomDescRef: s.roomDescRef,
        setCurrentTerrain: s.isSpectateMode ? s.setSpectateTerrain : s.setCurrentTerrain,
        setRoomPlayers: s.isSpectateMode ? s.setSpectateGroupMembers : s.setRoomPlayers,
        setRoomNpcs: s.setRoomNpcs, setRoomItems: s.setRoomItems, characterName: s.characterName,
        setAbilities: s.setAbilities, addMessage, setCharacterName: s.setCharacterName,
        setPlayerPosition: s.isSpectateMode ? s.setSpectatePosition : s.setPlayerPosition,
        setInCombat: s.isSpectateMode ? s.setSpectateInCombat : s.setInCombat,
        setRoomName: s.isSpectateMode ? s.setSpectateRoomName : s.setRoomName,
        setRoomDesc: s.isSpectateMode ? s.setSpectateRoomDesc : s.setRoomDesc,
        setRoomZone: s.isSpectateMode ? s.setSpectateRoomZone : s.setRoomZone,
        setRoomExits: s.setRoomExits, setDiscoveredItems: s.setDiscoveredItems,
        setBufferName: v.setBufferName, setPlayerHealthStatus: s.isSpectateMode ? v.setSpectateHealthStatus : v.setPlayerHealthStatus,
        setOpponentHealthStatus: s.isSpectateMode ? v.setSpectateOpponentStatus : v.setOpponentHealthStatus,
        setBufferHealthStatus: v.setBufferHealthStatus, setOpponentName: s.isSpectateMode ? v.setSpectateOpponentName : v.setOpponentName,
        setCharacterInfo: v.setCharacterInfo, characterInfo: v.characterInfo, opponentName: s.isSpectateMode ? v.spectateOpponentName : v.opponentName,
        bufferName: v.bufferName, roomPlayers: s.roomPlayers, roomNpcs: s.roomNpcs, setGroupMembers: v.setGroupMembers,
        setMumeEditState: s.setMumeEditState, setWhoList: s.setWhoList, setWhereList: s.setWhereList,
        opponentId: s.isSpectateMode ? v.spectateOpponentId : v.opponentId, setOpponentId: s.isSpectateMode ? v.setOpponentId : v.setOpponentId,
        detectLighting: (light) => { if (s.isSpectateMode) s.setSpectateLighting(light as any); else env.detectLighting?.(light); },
        playMovementSound, playDoorSound, setWeather: s.setWeather, setIsFoggy: s.setIsFoggy, setStats: s.isSpectateMode ? s.setSpectateStats : s.setStats,
        playerPositionRef: s.playerPositionRef, setIsRiding: s.setIsRiding, isRidingRef: s.isRidingRef, isSpectateMode: s.isSpectateMode, inlineCategories: s.inlineCategories,
        sendGMCP: sendGMCPProxy
    });

    // 5. Telnet & Networking
    const telnet = useTelnet({
        connectionUrl: settingsStore.connectionUrl,
        processLine: (line) => parserRef.current?.processLine(line),
        recordEntry: (type, data) => recorderRef.current?.recordEntry(type, data),
        setPrompt: v.setActivePrompt,
        onCharNameChange: gmcpHandlers.onCharNameChange,
        onPositionChange: gmcpHandlers.onPositionChange,
        handlers: {
            setStatus: s.setStatus,
            setStats: s.setStats,
            setWeather: s.setWeather,
            setIsFoggy: s.setIsFoggy,
            setInCombat: s.setInCombat,
            addMessage,
            detectLighting: (light) => { if (s.isSpectateMode) s.setSpectateLighting(light as any); else env.detectLighting?.(light); },
            addDiagnosticLog: ui.addDiagnosticLog,
            onEchoChange: (visible: boolean) => {
                console.log('[GameContext] onEchoChange:', visible);
                s.setIsPasswordMode(!visible);
            },
            ...gmcpHandlers
        }
    });

    useEffect(() => {
        telnetRef.current = telnet;
    }, [telnet]);

    // --- State Synchronization ---
    useEffect(() => {
        // Safety: ensure password mode is reset when entering game
        if (s.gameState === 'playing' && s.isPasswordMode) {
            console.log('[GameContext] Resetting isPasswordMode for playing state');
            s.setIsPasswordMode(false);
        }
    }, [s.gameState]);

    useEffect(() => {
        if (s.isPasswordMode) {
            console.log('[GameContext] isPasswordMode is now TRUE (Input masked)');
        } else {
            console.log('[GameContext] isPasswordMode is now FALSE (Input visible)');
        }
    }, [s.isPasswordMode]);

    const recorder = useSessionRecorder();
    const recorderRef = useRef(recorder);
    useEffect(() => { recorderRef.current = recorder; }, [recorder]);
    const { isRecording, duration, startRecording, stopRecording, stopAndSave, saveLog, recordEntry } = recorder;

    // 6. Final Controller & Parser
    const { spatButtons, setSpatButtons, triggerSpitManual } = useSpatButtons(messages, useRef<HTMLDivElement>(null), triggerHaptic);
    const btn = useButtons({ abilities: s.abilities, characterClass: s.characterClass, characterName: s.characterName, target: v.target, inlineCategories: s.inlineCategories });
    const joystick = useJoystick(triggerHaptic, s.roomExits);
    const editor = useButtonEditor(btn);
    const help = useHelpHandler();
    const practice = usePracticeHandler(s.setAbilities);
    const shop = useShopHandler();
    const quests = useQuestsHandler(s.setQuests, s.quests.activeQuests);
    const keywordOverrides = useKeywordOverrides();
    const openKeywordEdit = useCallback((context: string, displayText: string) => {
        ui.setKeywordEditState({ context, displayText });
    }, [ui]);
    const { processMessageHtml } = useMessageHighlighter(v.target, btn.buttonsRef, s.roomPlayers, s.roomNpcs, s.characterName, s.roomItems, s.inlineCategories, s.isHighlighterEnabled, highlightVersion, s.discoveredItems, {}, s.selectedObjectIds, s.inCombat, s.spectateCharacterName, v.groupMembers);

    const deps: UseGameParserDeps = useMemo(() => ({
        // Basic Actions
        addMessage,
        addSystemMessage,
        executeCommandRef: { current: null }, // Controller will fill this or we can pass actual ref if available

        // Handlers
        practiceHandler: practice,
        questsHandler: quests,
        shopHandler: shop,
        helpHandler: help,
        keywordOverrides: keywordOverrides.overrides,

        // Audio/Visual
        playEffect,
        playHitImpactSound,
        playOofSound,
        playKillSound,
        playLevelSound,
        playSlashSound,
        playCleaveSound,
        playSmiteSound,
        playPierceSound,
        playStabSound,
        playArrowHitSound,
        playCommMessageSound,
        playBuySellSound,
        playBashSound,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        playDoorSound,
        playMovementSound,
        triggerHaptic,
        triggerHitFlash: v.triggerHitFlash,
        triggerOppHitFlash: v.triggerOppHitFlash,
        triggerXpTicker: v.triggerXpTicker,

        // State Refs
        inCombatRef: { current: false },
        roomDescRef: { current: null },
        roomNameRef: { current: null },
        pendingGmcpCommRef: { current: null },
        lastCommIdBySenderRef: { current: new Map() },
        lastCommMsgIdRef: { current: null },
        lastCommTimeRef: { current: 0 },
        isWaitingForInv: { current: false },
        isWaitingForEq: { current: false },
        isWaitingForStats: { current: false },
        isWaitingForInfo: { current: false },
        isSoundEnabledRef: { current: true },
        soundTriggersRef: { current: [] },
        captureStage: { current: 'none' },
        isSilentCapture: { current: 0 },
        isDrawerCapture: { current: 0 },
        captureOwnerDrawer: { current: 'none' },
        accountStageRef: s.accountStageRef,
        actionsRef: s.actionsRef,

        // UI/Visibility
        isNewbieMode: s.isNewbieMode,
        isInventoryOpen: s.drawer === 'inventory',
        isEquipmentOpen: s.drawer === 'equipment',
        isCharacterOpen: s.drawer === 'character',
        isStatsOpen: s.drawer === 'stats',
        isPlayersOpen: s.drawer === 'players',
        processMessageHtml,

        // Session/Game Data
        gameState: s.gameState as any,
        setGameState: s.setGameState,
        characterName: s.characterName,
        spectateCharacterName: s.spectateCharacterName,
        groupMembers: v.groupMembers,
        isSpectateMode: s.isSpectateMode,
        spectateTarget: s.spectateTarget,
        spectateRoomName: s.spectateRoomName,
        spectateRoomDesc: s.spectateRoomDesc,
        activePrompt: v.activePrompt,
        gameTime: s.gameTime,
        accountState: s.accountState,
        inlineCategories: s.inlineCategories,
        roomPlayers: s.roomPlayers,
        selectedObjectIds: s.selectedObjectIds,

        // Setters
        setInCombat: s.setInCombat,
        setMood: s.setMood,
        setPlayerPosition: s.setPlayerPosition,
        setEntities: s.setEntities,
        setDiscoveredItems: s.setDiscoveredItems,
        setQuests: s.setQuests,
        setIsPasswordMode: s.setIsPasswordMode,
        setAccountState: s.setAccountState,
        setIsSpectateMode: s.setIsSpectateMode,
        setGameTime: s.setGameTime,
        setWeather: s.setWeather,
        setIsFoggy: s.setIsFoggy,
        
        // Spectate Setters
        setSpectateInCombat: s.setSpectateInCombat,
        setSpectateOpponentName: s.setSpectateOpponentName,
        setSpectateOpponentStatus: s.setSpectateOpponentStatus,
        setSpectateHealthStatus: s.setSpectateHealthStatus,
        setSpectateStats: s.setSpectateStats,
        setSpectatePosition: s.setSpectatePosition,
        setSpectateWaiting: s.setSpectateWaiting,
        setSpectateRoomName: s.setSpectateRoomName,
        setSpectateRoomZone: s.setSpectateRoomZone,
        setSpectateLighting: s.setSpectateLighting,
        setSpectateWeather: s.setSpectateWeather,
        setSpectateIsFoggy: s.setSpectateIsFoggy,
        setSpectateCharacterName: s.setSpectateCharacterName,
        setSpectateGroupMembers: s.setSpectateGroupMembers,
        setSpectateRoomDesc: s.setSpectateRoomDesc,
        setSpectateTerrain: s.setSpectateTerrain,

        // Drawer Setters
        setInventoryLines: s.setInventoryLines,
        setEqLines: s.setEqLines,
        setStatsLines: s.setStatsLines,
        setPracticeLines: s.setPracticeLines,
        setWhoLines: s.setWhoLines,
        setWhereLines: s.setWhereLines,
        setScoreLines: s.setScoreLines,
        setInfoLines: s.setInfoLines,
        setQuestLines: s.setQuestLines,
        setWhoList: s.setWhoList,
        setWhereList: s.setWhereList,

        // Others
        addDiagnosticLog: ui.addDiagnosticLog,
        registerEntity: s.registerEntity,
        entities: s.entities,
        ansiConvert,
        btn,
        quests: s.quests
    }), [s, v, ui, addMessage, addSystemMessage, playHitImpactSound, playOofSound, playSlashSound, playCleaveSound, playSmiteSound, playPierceSound, playStabSound, playArrowHitSound, playCommMessageSound, playBuySellSound, playBashSound, playIncantationSound, stopIncantationSound, playMagicExplosionSound, playDoorSound, playMovementSound, triggerHaptic, playEffect, playKillSound, playLevelSound, processMessageHtml, practice, quests, shop, help, keywordOverrides, btn]);

    const parser = useGameParser(deps, s.userSession);
    const parserRef = useRef(parser);
    useEffect(() => { parserRef.current = parser; }, [parser]);
    const controller = useCommandController({
        telnet, addMessage, initAudio, navIntervalRef: { current: null }, mapperRef: { current: null },
        teleportTargets: settingsStore.teleportTargets, help, isDrawerCapture: { current: 0 },
        isSilentCapture: { current: 0 }, captureStage: { current: 'none' } as any,
        isWaitingForStats: { current: false } as any, isWaitingForEq: { current: false } as any,
        isWaitingForInv: { current: false } as any, isWaitingForInfo: { current: false } as any,
        setInventoryLines: s.setInventoryLines, setStatsLines: s.setStatsLines,
        setInfoLines: s.setInfoLines, setScoreLines: s.setScoreLines, setEqLines: s.setEqLines,
        setCommandPreview: s.setCommandPreview, input: s.input, setInput: s.setInput, isNewbieMode: s.isNewbieMode,
        status: s.status, target: v.target, setTarget: v.setTarget, setPendingMove: v.setPendingMove,
        activePrompt: v.activePrompt?.text || '', finalizeCapture: parser.finalizeCapture, popoverState: s.popoverState,
        setPopoverState: s.setPopoverState, setIsCharacterOpen: s.setIsCharacterOpen,
        setIsStatsOpen: s.setIsStatsOpen, setIsEquipmentOpen: s.setIsEquipmentOpen,
        setIsInventoryOpen: s.setIsInventoryOpen, setIsPlayersOpen: s.setIsPlayersOpen,
        setIsSettingsOpen: ui.setIsSettingsOpen, setSettingsTab: ui.setSettingsTab,
        setIsMapExpanded: s.setIsMapExpanded, setUI: s.setUI as any, viewport, triggerHaptic,
        btn, joystick, wasDraggingRef: { current: false }, ui: s.ui as any,
        actions: s.actions, setActions: s.setActions, setActiveDragData: s.setActiveDragData,
        activeDragData: s.activeDragData, practice, heldButton: v.heldButton,
        setHeldButton: v.setHeldButton, parley: s.parley, setParley: s.setParley,
        isTrackpadModifierActive: s.isTrackpadModifierActive, shop,
        keywordOverrides, openKeywordEdit, lastCommandContextRef: { current: null },
        entities: s.entities, applyOptimisticChange: s.applyOptimisticChange,
        selectedObjectIds: s.selectedObjectIds, toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection, playClickSound, isSoundEnabled: s.isSoundEnabled,
        waiting: false, recordEntry, gameState: s.gameState, isPasswordMode: s.isPasswordMode,
        sessionMode, replayer, isSpectateMode: s.isSpectateMode, setIsSpectateMode: (v) => {},
        showSpectatePromptInLog: settingsStore.showSpectatePromptInLog,
        setShowSpectatePromptInLog: settingsStore.setShowSpectatePromptInLog,
        isImmersionMode: settingsStore.isImmersionMode, setIsImmersionMode: settingsStore.setIsImmersionMode,
        isBloomEnabled: settingsStore.isBloomEnabled, setIsBloomEnabled: settingsStore.setIsBloomEnabled,
        isHighlighterEnabled: settingsStore.isHighlighterEnabled, setIsHighlighterEnabled: settingsStore.setIsHighlighterEnabled,
        isTimestampEnabled: settingsStore.isTimestampEnabled, setIsTimestampEnabled: settingsStore.setIsTimestampEnabled,
        disableSmoothScroll: settingsStore.disableSmoothScroll, setDisableSmoothScroll: settingsStore.setDisableSmoothScroll,
        showRecordingIndicator: settingsStore.showRecordingIndicator, setShowRecordingIndicator: settingsStore.setShowRecordingIndicator,
        showLegacyButtons: settingsStore.showLegacyButtons, setShowLegacyButtons: settingsStore.setShowLegacyButtons,
        uiMode: settingsStore.uiMode, setUiMode: settingsStore.setUiMode,
        fontFamily: settingsStore.fontFamily, setFontFamily: settingsStore.setFontFamily,
        favorites: settingsStore.favorites, setFavorites: settingsStore.setFavorites,
        accountState: s.accountState, setAccountState: s.setAccountState,
        accountStageRef: s.accountStageRef, clearLog
    });

    const uiValue: UIContextType = useMemo(() => ({
        ui: {
            drawer: ui.drawer,
            isDrawerPeeking: ui.isDrawerPeeking,
            peekingDrawer: ui.isDrawerPeeking ? (ui.drawer as any) : 'none',
            setManagerOpen: ui.isSetMenuOpen,
            mapExpanded: ui.mapExpanded,
            isMenuOpen: ui.isMenuOpen,
            isSetMenuOpen: ui.isSetMenuOpen,
            menuView: ui.menuView,
            peekingSource: 'none' as any,
            showMapperToolbar: false,
            characterTab: ui.characterTab,
        },
        setUI: ui.setUI as any,
        popoverState: ui.popoverState,
        setPopoverState: ui.setPopoverState,
        isSettingsOpen: ui.isSettingsOpen,
        setIsSettingsOpen: ui.setIsSettingsOpen,
        isLibraryOpen: ui.isLibraryOpen,
        setIsLibraryOpen: ui.setIsLibraryOpen,
        settingsTab: ui.settingsTab,
        setSettingsTab: ui.setSettingsTab,
        setIsStatsOpen: ui.setIsStatsOpen,
        setIsCharacterOpen: ui.setIsCharacterOpen,
        setIsEquipmentOpen: ui.setIsEquipmentOpen,
        setIsInventoryOpen: ui.setIsInventoryOpen,
        setIsMapExpanded: ui.setMapExpanded,
        setIsSetManagerOpen: (open: boolean) => ui.setUI({ isSetMenuOpen: open }),
        setIsPlayersOpen: ui.setIsPlayersOpen,
        handleTabClick: (drawer: any) => ui.setDrawer(drawer),
        displayInventoryLines: s.inventoryLines,
        displayEqLines: s.eqLines,
        toggleMap: () => ui.setMapExpanded(!ui.mapExpanded),
        characterName: s.characterName,
        isRecording,
        duration,
        showRecordingIndicator: settingsStore.showRecordingIndicator,
        setShowRecordingIndicator: settingsStore.setShowRecordingIndicator,
        startRecording,
        stopRecording,
        stopAndSave,
        saveLog,
        replayer
    }), [ui, s.inventoryLines, s.eqLines, s.characterName, isRecording, duration, settingsStore.showRecordingIndicator, settingsStore.setShowRecordingIndicator, startRecording, stopRecording, stopAndSave, saveLog, replayer]);

    const logValue: LogContextType = useMemo(() => ({
        ...activeLog,
        refreshLogHighlights,
        handleLogPointerDown: controller.handleLogPointerDown,
        handleLogPointerUp: controller.handleLogPointerUp
    }), [activeLog, refreshLogHighlights, controller.handleLogPointerDown, controller.handleLogPointerUp]);

    const value: GameContextType = useMemo(() => ({
        ...s,
        ...v,
        telnet,
        parser,
        ...controller,
        btn,
        joystick,
        editor,
        replayer,
        viewport,
        env,
        audioCtxRef,
        initAudio,
        playSound,
        playRandomSound,
        playDoorSound,
        playClickSound,
        playCommMessageSound,
        triggerHaptic,
        spatButtons,
        setSpatButtons,
        triggerSpitManual,
        diagnosticLogs: ui.diagnosticLogs,
        addDiagnosticLog: ui.addDiagnosticLog,
        activeDragData: s.activeDragData,
        setActiveDragData: s.setActiveDragData,
        selectedObjectIds: s.selectedObjectIds,
        toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection,
        accountStageRef: s.accountStageRef,
        gameTime: s.gameTime,
        setGameTime: s.setGameTime,
        practice,
        help,
        shop,
        quests,
        keywordOverrides: keywordOverrides.overrides,
        draggedTarget: s.draggedTarget,
        setDraggedTarget: s.setDraggedTarget,
        containerRef: { current: null },
        handleFileUpload: () => {}, // TODO: Implement if needed
        exportSettings: () => ({}),
        exportSettingsFile: () => {},
        importSettings: () => {},
        handleSoundUpload: () => {},
        handleMmapperModeChange: () => {},
        isRecording,
        duration,
        startRecording,
        stopRecording,
        stopAndSave,
        saveLog,
    }), [
        s, v, telnet, parser, controller, btn, joystick, editor, replayer,
        viewport, env, audioCtxRef, initAudio, spatButtons, ui.diagnosticLogs,
        practice, help, shop, quests, keywordOverrides,
        isRecording, duration, startRecording, stopRecording, stopAndSave, saveLog
    ]);

    return (
        <GameContext.Provider value={value}>
            <VitalsContext.Provider value={v as any}>
                <UIContext.Provider value={uiValue}>
                    <LogContext.Provider value={logValue}>
                        {children}
                    </LogContext.Provider>
                </UIContext.Provider>
            </VitalsContext.Provider>
        </GameContext.Provider>
    );
};
