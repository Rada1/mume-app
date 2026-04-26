import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    PopoverState, CustomButton, TeleportTarget, GmcpOccupant, SessionMode, CombatHealthStatus, MessageType, InlineCategoryConfig, GameEntity
} from '../types';
import { useMessageLog } from '../hooks/useMessageLog';
import { useButtons } from '../hooks/useButtons';
import { useJoystick } from '../hooks/useJoystick';
import { useButtonEditor } from '../hooks/useButtonEditor';
import { useViewport } from '../hooks/useViewport';
import { useEnvironment } from '../hooks/useEnvironment';
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

import { GameContextType, VitalsContextType, LogContextType, UIContextType, DrawerType } from './GameContext/types';
import { useGmcpHandlers } from '../hooks/useGmcpHandlers/index';
import { useGameProviderState } from './GameContext/state';
import { useSessionManager } from '../hooks/useSessionManager';
import { useAmbientController, useAudioEffects } from '../hooks/useAudioSystem';
import { useSessionRecorder, LogEntryType } from '../hooks/useSessionRecorder';
import { useSessionReplayer } from '../hooks/useSessionReplayer';
import { useSettings } from '../hooks/useSettings';
import { useAgentObservability } from '../hooks/useAgentObservability';
import { ansiConvert } from '../utils/ansi';
import { Tokenizer } from '../services/parser/Tokenizer';

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
    
    // 1. Audio System
    useAmbientController();
    const audioEffects = useAudioEffects();
    const {
        audioCtxRef, initAudio, playMovementSound, playDoorSound, playClickSound,
        playHitImpactSound, playOofSound, playSlashSound, playCleaveSound,
        playSmiteSound, playPierceSound, playStabSound, playArrowHitSound,
        playBuySellSound, playBashSound, playKillSound, playLevelSound,
        playIncantationSound, stopIncantationSound, playMagicExplosionSound,
        playCommMessageSound, triggerHaptic, playEffect,
        playSound, playRandomSound
    } = audioEffects;

    // 2. Global State
    const { vitals: v, game: s } = useGameProviderState({
        playCommMessageSound,
        playCombatHitSound: playHitImpactSound,
        playLevelUpSound: playLevelSound
    });

    const ui = useUIStore();
    const settingsStore = useSettingsStore();
    const mapperRef = useRef<MapperRef>(null);

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

    // --- State Refs ---
    const inCombatRef = useRef(false);
    const roomNameRef = useRef<string | null>(null);
    const pendingGmcpCommRef = useRef<{ sender: string; chan: string; msg?: string } | null>(null);
    const lastCommIdBySenderRef = useRef(new Map<string, string>());
    const lastCommMsgIdRef = useRef<string | null>(null);
    const lastCommTimeRef = useRef(0);
    const isWaitingForInv = useRef(false);
    const isWaitingForEq = useRef(false);
    const isWaitingForStats = useRef(false);
    const isWaitingForInfo = useRef(false);
    const isSoundEnabledRef = useRef(true);
    const soundTriggersRef = useRef<any[]>([]);
    const captureStage = useRef<'none' | 'inv' | 'eq' | 'stat' | 'practice' | 'who' | 'where' | 'container'>('none');
    const isSilentCapture = useRef(0);
    const isDrawerCapture = useRef(0);
    const captureOwnerDrawer = useRef<'none' | 'inv' | 'eq' | 'stat' | 'practice' | 'who' | 'where' | 'container'>('none');

    const viewport = useViewport(s.uiMode, s.disableSmoothScroll, s.isImmersionMode, s.fontFamily, s.isTimestampEnabled, s.isNewbieMode);
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
    const routedAddMessage = React.useCallback((type: MessageType, text: string, extra?: any, mid?: string, isRoomName?: boolean, precalculated?: any, shopItem?: any, practiceSkill?: any, practiceHeader?: any, isSystem?: boolean, replyTarget?: string, replyCommand?: string, commSender?: string, commAction?: string, commText?: string, commColor?: string, commSenderTokens?: any, commTextTokens?: any, providedCombatSide?: any, providedIsHitImpact?: boolean, providedIsHitterImpact?: boolean, providedIsSnoop?: boolean, providedIsSnoopInput?: boolean) => {
        const args = [type, text, extra, mid, isRoomName, precalculated, shopItem, practiceSkill, practiceHeader, isSystem, replyTarget, replyCommand, commSender, commAction, commText, commColor, commSenderTokens, commTextTokens, providedCombatSide, providedIsHitImpact, providedIsHitterImpact, providedIsSnoop, providedIsSnoopInput] as const;
        if (type === 'snoop' || type === 'snoop-command' || type === 'snoop-vitals' || providedIsSnoop) {
            (s.spectateSession.log.addMessage as any)(...args);
        } else {
            (s.userSession.log.addMessage as any)(...args);
        }
    }, [s.userSession.log, s.spectateSession.log]);

    const { messages, setMessages, addSystemMessage, flushMessages, clearLog } = activeLog;
    const addMessage = routedAddMessage; // Use the router for the parser

    // 5. Networking
    const telnetRef = useRef<any>(null);
    const sendGMCPProxy = useCallback((pkg: string, data: any = null) => {
        if (telnetRef.current) {
            telnetRef.current.sendGMCP(pkg, data);
        }
    }, []);

    const gmcpHandlers = useGmcpHandlers({
        mapperRef: mapperRef, roomDescRef: s.userSession.game.roomDescRef,
        setCurrentTerrain: s.userSession.game.setCurrentTerrain,
        setRoomChars: s.userSession.game.setRoomChars,
        setRoomItems: s.userSession.game.setRoomItems, characterName: s.userSession.game.characterName,
        setAbilities: s.userSession.game.setAbilities, addMessage, setCharacterName: s.userSession.game.setCharacterName,
        setPlayerPosition: s.userSession.game.setPlayerPosition,
        setInCombat: s.userSession.game.setInCombat,
        setRoomName: s.userSession.game.setRoomName,
        setRoomDesc: s.userSession.game.setRoomDesc,
        setRoomZone: s.userSession.game.setRoomZone,
        setRoomExits: s.userSession.game.setRoomExits, setDiscoveredItems: s.userSession.game.setDiscoveredItems,
        setBufferName: s.userSession.vitals.setBufferName, setPlayerHealthStatus: s.userSession.vitals.setPlayerHealthStatus,
        setOpponentHealthStatus: s.userSession.vitals.setOpponentHealthStatus,
        setBufferHealthStatus: s.userSession.vitals.setBufferHealthStatus, setOpponentName: s.userSession.vitals.setOpponentName,
        setCharacterInfo: s.userSession.vitals.setCharacterInfo, characterInfo: s.userSession.vitals.characterInfo, opponentName: s.userSession.vitals.opponentName,
        bufferName: s.userSession.vitals.bufferName, roomPlayers: s.userSession.game.roomPlayers, roomNpcs: s.userSession.game.roomNpcs, setGroupMembers: s.userSession.vitals.setGroupMembers,
        setMumeEditState: s.setMumeEditState, setWhoList: s.userSession.game.setWhoList, setWhereList: s.userSession.game.setWhereList,
        opponentId: s.userSession.vitals.opponentId, setOpponentId: s.userSession.vitals.setOpponentId,
        detectLighting: env.detectLighting,
        playMovementSound, playDoorSound, setWeather: s.userSession.game.setWeather, setIsFoggy: s.userSession.game.setIsFoggy, 
        setStats: s.userSession.vitals.setStats, // ALWAYS update user session with real GMCP
        playerPositionRef: s.userSession.game.playerPositionRef, setIsRiding: s.userSession.game.setIsRiding, isRidingRef: s.userSession.game.isRidingRef, isSpectateMode: s.isSpectateMode, inlineCategories: s.inlineCategories,
        registerEntity: s.registry.registerEntity,
        sendGMCP: sendGMCPProxy,
        pendingGmcpCommRef
    });

    const replayer = useSessionReplayer(useCallback((type, payload, isPrivacyMode, isSilent = false) => {
        if (isSilent) return;

        if (type === 'rx') {
            // Replayed text messages
            if (typeof payload === 'object' && payload.text) {
                // If it's a pre-processed message from useMessageLog.ts
                routedAddMessage(
                    payload.type,
                    payload.text,
                    payload.extra,
                    payload.mid,
                    payload.isRoomName,
                    payload.precalculated,
                    payload.shopItem,
                    payload.practiceSkill,
                    payload.practiceHeader,
                    false, // isSystem
                    payload.replyTarget,
                    payload.replyCommand,
                    payload.commSender,
                    payload.commAction,
                    payload.commText,
                    payload.commColor,
                    payload.providedCombatSide,
                    payload.providedIsHitImpact,
                    payload.providedIsHitterImpact,
                    payload.providedIsSnoop,
                    payload.providedIsSnoopInput
                );
            } else {
                // Raw text (older logs)
                const text = typeof payload === 'string' ? payload : new TextDecoder().decode(new Uint8Array(payload));
                parserRef.current?.processLine(text);
            }
        } else if (type === 'gmcp') {
            const { pkg, data } = payload;
            const json = typeof data === 'string' ? data : JSON.stringify(data);
            
            // Route through GMCP handlers
            if (pkg.startsWith('Char.Vitals')) {
                gmcpHandlers.onCharVitals(JSON.parse(json));
            } else if (pkg.startsWith('Room.Info')) {
                gmcpHandlers.onRoomInfo(JSON.parse(json));
            } else if (pkg.startsWith('Group')) {
                gmcpHandlers.onGroupSet(JSON.parse(json));
            } else if (pkg.startsWith('Room.Players')) {
                gmcpHandlers.onRoomPlayers(JSON.parse(json));
            } else if (pkg.startsWith('Room.Npcs')) {
                gmcpHandlers.onRoomNpcs(JSON.parse(json));
            } else if (pkg.startsWith('Room.Items')) {
                gmcpHandlers.onRoomItems(JSON.parse(json));
            }
        } else if (type === 'tx') {
            const cmd = typeof payload === 'string' ? payload : String(payload);
            routedAddMessage('user', cmd);
        }
    }, [gmcpHandlers, routedAddMessage]));

    // 5. Telnet & Networking
    const telnet = useTelnet({
        connectionUrl: settingsStore.connectionUrl,
        processLine: (line, tokens) => {
            console.log(`[Socket] Calling processLine for: "${line.substring(0, 30)}"`);
            return parserRef.current?.processLine(line, tokens) ?? null;
        },
        recordEntry: (type, data) => s.userSession.recorder.recordEntry(type, data),
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
            detectLighting: env.detectLighting,
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

    // 6. Final Controller & Parser
    const { spatButtons, setSpatButtons, triggerSpitManual } = useSpatButtons(messages, useRef<HTMLDivElement>(null), triggerHaptic);
    const btn = useButtons({ abilities: s.abilities, characterClass: s.characterClass, characterName: s.characterName, target: v.target, inlineCategories: s.inlineCategories });
    useEffect(() => {
        btn.setAddMessage(addMessage);
    }, [btn, addMessage]);
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

    const deps: UseGameParserDeps = useMemo(() => ({
        // Basic Actions
        addMessage,
        addSystemMessage,
        executeCommandRef: { current: null }, 
        
        // Mapper/World
        mapperRef: mapperRef,
        setDeathRoomId: (id: string | null) => {}, // Placeholder

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
        triggerXpTicker: v.triggerXpTicker,

        // State Refs
        sessionMode: session.sessionMode,
        inCombatRef,
        roomDescRef: s.roomDescRef,
        roomNameRef,
        pendingGmcpCommRef,
        lastCommIdBySenderRef,
        lastCommMsgIdRef,
        lastCommTimeRef,
        isWaitingForInv: isWaitingForInv as any,
        isWaitingForEq: isWaitingForEq as any,
        isWaitingForStats: isWaitingForStats as any,
        isWaitingForInfo: isWaitingForInfo as any,
        isSoundEnabledRef,
        soundTriggersRef,
        captureStage: captureStage as any,
        isSilentCapture,
        isDrawerCapture,
        captureOwnerDrawer: captureOwnerDrawer as any,
        accountStageRef: s.accountStageRef,
        actionsRef: s.actionsRef,

        // UI/Visibility
        isNewbieMode: s.isNewbieMode,
        isInventoryOpen: s.drawer === 'inventory',
        isEquipmentOpen: s.drawer === 'equipment',
        isCharacterOpen: s.drawer === 'character',
        isStatsOpen: s.drawer === 'stats',
        isPlayersOpen: s.drawer === 'players',

        // Session/Game Data
        gameState: s.gameState as any,
        setGameState: s.setGameState,
        characterName: s.characterName,
        spectateCharacterName: s.spectateCharacterName,
        groupMembers: v.groupMembers,
        activeGroupMembers: v.groupMembers,
        isSpectateMode: s.isSpectateMode,
        spectateTarget: s.spectateTarget,
        spectateRoomName: s.spectateRoomName,
        spectateRoomDesc: s.spectateRoomDesc,
        activePrompt: v.activePrompt,
        gameTime: s.gameTime,
        accountState: s.accountState,
        inlineCategories: s.inlineCategories,
        objectColor: settingsStore.objectColor,
        npcColor: settingsStore.npcColor,
        playerColor: settingsStore.playerColor,
        roomColor: settingsStore.roomColor,
        roomPlayers: s.roomPlayers,
        roomNpcs: s.roomNpcs,
        roomItems: s.roomItems,
        target: v.target,
        selectedObjectIds: s.selectedObjectIds,

        // Setters
        setMood: s.setMood,
        setPlayerPosition: s.setPlayerPosition,
        setEntities: s.setEntities,
        setDiscoveredItems: s.setDiscoveredItems,
        setQuests: s.setQuests,
        setIsPasswordMode: s.setIsPasswordMode,
        setAccountState: s.setAccountState,
        setIsSpectateMode: mode.setIsSpectating,
        setGameTime: s.setGameTime,
        setRoomNum: s.userSession.game.setRoomNum,
        setUserRoomNum: s.userSession.game.setRoomNum,
        setWeather: s.setWeather,
        setIsFoggy: s.setIsFoggy,
        setLightningEnabled: s.setLightningEnabled,
        
        // Spectate Setters
        setSpectateStats: s.setSpectateStats,
        setSpectateWaiting: s.setSpectateWaiting,
        setSpectateCharacterName: s.setSpectateCharacterName,
        setSpectatePosition: s.setSpectatePosition,
        setSpectateInCombat: s.setSpectateInCombat,
        setSpectateOpponentName: s.setSpectateOpponentName,
        setSpectateOpponentStatus: s.setSpectateOpponentStatus,
        setSpectateRoomNum: s.spectateSession.game.setRoomNum,
        setSpectateRoomName: s.setSpectateRoomName,
        setSpectateRoomDesc: s.setSpectateRoomDesc,
        setSpectateRoomZone: s.setSpectateRoomZone,
        setSpectateActivePrompt: s.setSpectateActivePrompt,
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
        registerEntity: s.registry.registerEntity,
        entities: s.registry.entities,
        ansiConvert,
        btn,
        quests: s.quests,
        shop: shop,
        practice: practice,
        help: help
    }), [s, v, ui, settingsStore, addMessage, addSystemMessage, playHitImpactSound, playOofSound, playSlashSound, playCleaveSound, playSmiteSound, playPierceSound, playStabSound, playArrowHitSound, playCommMessageSound, playBuySellSound, playBashSound, playIncantationSound, stopIncantationSound, playMagicExplosionSound, playDoorSound, playMovementSound, triggerHaptic, playEffect, playKillSound, playLevelSound, practice, quests, shop, help, keywordOverrides, btn, session.sessionMode, mapperRef]);


    const parser = useGameParser(deps, s.userSession);
    const parserRef = useRef(parser);
    useEffect(() => { parserRef.current = parser; }, [parser]);

    const sessionManager = useSessionManager({
        status: s.status,
        activePrompt: v.activePrompt?.text || '',
        addSystemMessage,
        telnetSendCommand: telnet.send,
        telnetConnect: telnet.connect,
        characterName: s.characterName,
        executeCommand: (cmd, echo, fromMacro) => controller.executeCommand(cmd, echo, fromMacro),
        groupMembers: v.groupMembers,
        spatButtons,
        triggerSpitManual,
        gameState: s.gameState as any,
        accountStage: s.accountState.stage as any,
        isPasswordMode: s.isPasswordMode
    });

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
        keywordOverrides: keywordOverrides.overrides, openKeywordEdit, lastCommandContextRef: { current: null },
        entities: s.entities, applyOptimisticChange: s.applyOptimisticChange,
        selectedObjectIds: s.selectedObjectIds, toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection, playClickSound, isSoundEnabled: s.isSoundEnabled,
        waiting: false, recordEntry: s.userSession.recorder.recordEntry, gameState: s.gameState, isPasswordMode: s.isPasswordMode,
        sessionMode, replayer, isSpectateMode: s.isSpectateMode, setIsSpectateMode: mode.setIsSpectating,
        showSpectatePromptInLog: settingsStore.showSpectatePromptInLog,
        setShowSpectatePromptInLog: settingsStore.setShowSpectatePromptInLog,
        isImmersionMode: settingsStore.isImmersionMode, setIsImmersionMode: settingsStore.setIsImmersionMode,
        isBloomEnabled: settingsStore.isBloomEnabled, setIsBloomEnabled: settingsStore.setIsBloomEnabled,
        isHighlighterEnabled: true, setIsHighlighterEnabled: (v) => {}, // Placeholder
        isTimestampEnabled: settingsStore.isTimestampEnabled, setIsTimestampEnabled: settingsStore.setIsTimestampEnabled,
        disableSmoothScroll: settingsStore.disableSmoothScroll, setDisableSmoothScroll: settingsStore.setDisableSmoothScroll,
        showRecordingIndicator: settingsStore.showRecordingIndicator, setShowRecordingIndicator: settingsStore.setShowRecordingIndicator,
        showLegacyButtons: false, setShowLegacyButtons: (v) => {}, // Placeholder
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
            setManagerOpen: ui.setManagerOpen,
            mapExpanded: ui.mapExpanded,
            isMenuOpen: ui.isMenuOpen,
            isSetMenuOpen: ui.isSetMenuOpen,
            menuView: ui.menuView,
            peekingSource: 'none' as any,
            showMapperToolbar: false,
            characterTab: ui.characterTab,
            managerSelectedSet: ui.managerSelectedSet,
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
        setIsSetManagerOpen: (open: boolean) => ui.setUI({ setManagerOpen: open }),
        setIsPlayersOpen: ui.setIsPlayersOpen,
        setManagerSelectedSet: ui.setManagerSelectedSet,
        handleTabClick: (drawer: any) => {
            ui.setDrawer(drawer);
            if (drawer !== 'none') {
                // Only close map automatically if we're on mobile to save space
                if (viewport.isMobile) {
                    ui.setMapExpanded(false);
                }
                // Trigger fresh data capture for the drawer
                if (drawer === 'inventory') controller.executeCommand('inv', true, true, false, false, { fromUi: true });
                else if (drawer === 'equipment') controller.executeCommand('eq', true, true, false, false, { fromUi: true });
                else if (drawer === 'stats' || drawer === 'character') controller.executeCommand('stat', true, true, false, false, { fromUi: true });
                else if (drawer === 'players') controller.executeCommand('who', true, true, false, false, { fromUi: true });
            }
        },
        displayInventoryLines: s.inventoryLines,
        displayEqLines: s.eqLines,
        statsLines: s.statsLines,
        scoreLines: s.scoreLines,
        infoLines: s.infoLines,
        practiceLines: s.practiceLines,
        questLines: s.questLines,
        whoLines: s.whoLines,
        whereLines: s.whereLines,
        toggleMap: () => {
            if (viewport.isMobile && ui.drawer !== 'none') {
                ui.setDrawer('none');
                ui.setMapExpanded(true);
            } else {
                ui.setMapExpanded(!ui.mapExpanded);
            }
        },
        characterName: s.characterName,
        isRecording: s.userSession.recorder.isRecording,
        duration: s.userSession.recorder.duration,
        showRecordingIndicator: settingsStore.showRecordingIndicator,
        setShowRecordingIndicator: settingsStore.setShowRecordingIndicator,
        startRecording: s.userSession.recorder.startRecording,
        stopRecording: s.userSession.recorder.stopRecording,
        stopAndSave: s.userSession.recorder.stopAndSave,
        saveLog: s.userSession.recorder.saveLog,
        replayer
    }), [ui, s.inventoryLines, s.eqLines, s.statsLines, s.scoreLines, s.infoLines, s.practiceLines, s.questLines, s.whoLines, s.whereLines, s.characterName, s.userSession.recorder, settingsStore.showRecordingIndicator, settingsStore.setShowRecordingIndicator, replayer]);

    const logValue: LogContextType = useMemo(() => ({
        ...activeLog,
        refreshLogHighlights,
        handleLogPointerDown: controller.handleLogPointerDown,
        handleLogPointerUp: controller.handleLogPointerUp,
        processMessageTokens: (rawText: string, location?: string) => {
            const ctx = {
                target: v.target,
                currentOccupants: Object.values(s.roomChars || {}),
                roomChars: s.roomChars,
                roomPlayers: s.roomPlayers,
                roomNpcs: s.roomNpcs,
                activeGroupMembers: v.groupMembers,
                roomItems: s.roomItems,
                inventoryItems: s.inventoryLines,
                equipmentItems: s.eqLines,
                discoveredItems: s.discoveredItems,
                inlineCategories: s.inlineCategories,
                npcColor: settingsStore.npcColor,
                playerColor: settingsStore.playerColor,
                objectColor: settingsStore.objectColor,
                roomColor: settingsStore.roomColor,
                buttons: btn.buttons,
                selectedObjectIds: s.selectedObjectIds,
                onlinePlayers: s.userSession.game.whoList.map(w => w.name)
            };
            return Tokenizer.getInstance().tokenize(rawText, ctx as any, location);
        }
    }), [activeLog, refreshLogHighlights, controller.handleLogPointerDown, controller.handleLogPointerUp, v.target, s.roomPlayers, s.roomNpcs, v.groupMembers, s.roomItems, s.inventoryLines, s.eqLines, s.discoveredItems, s.inlineCategories, settingsStore.npcColor, settingsStore.playerColor, settingsStore.objectColor, settingsStore.roomColor, btn.buttons, s.selectedObjectIds, s.userSession.game.whoList]);

    const value: GameContextType = useMemo(() => ({
        ...s,
        ...v,
        telnet,
        parser,
        ...controller,
        setRoomChars: s.setRoomChars,
        addMessage,
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
        isRecording: s.userSession.recorder.isRecording,
        duration: s.userSession.recorder.duration,
        startRecording: s.userSession.recorder.startRecording,
        stopRecording: s.userSession.recorder.stopRecording,
        stopAndSave: s.userSession.recorder.stopAndSave,
        saveLog: s.userSession.recorder.saveLog,
        mapperRef: mapperRef,
        sessionMode,
        setSessionMode
    }), [
        s, v, telnet, parser, controller, btn, joystick, editor, replayer,
        viewport, env, audioCtxRef, initAudio, spatButtons, ui.diagnosticLogs,
        practice, help, shop, quests, keywordOverrides,
        s.userSession.recorder, mapperRef, sessionMode, setSessionMode
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
