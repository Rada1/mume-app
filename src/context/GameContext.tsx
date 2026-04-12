import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import {
    PopoverState, CustomButton, TeleportTarget, GmcpOccupant
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
import { ProtocolHandler } from '../utils/telnet/ProtocolHandler';
import { IAC, SB, SE, TELNET_GMCP } from '../constants';
import { useGameParser } from '../hooks/GameParser/useGameParser';
import { useCommandController } from '../hooks/useCommandController';
import { useSettings } from '../hooks/useSettings';
import { useSpatButtons } from '../hooks/useSpatButtons';
import { usePracticeHandler } from '../hooks/usePracticeHandler';
import { MapperRef } from '../components/Mapper/mapperTypes';

import { GameContextType, VitalsContextType, LogContextType, UIContextType } from './GameContext/types';
import { useGmcpHandlers } from '../hooks/useGmcpHandlers/index';
import { useShopHandler } from '../hooks/useShopHandler';
import { useGameProviderState } from './GameContext/state';
import { useKeywordOverrides } from '../hooks/useKeywordOverrides';
import { useSessionManager } from '../hooks/useSessionManager';
import { useGameAudio } from '../hooks/useGameAudio';
import { useSessionRecorder } from '../hooks/useSessionRecorder';
import { useSessionReplayer } from '../hooks/useSessionReplayer';

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
    // --- Section: Game Logic Refresh ---
    const [highlightVersion, setHighlightVersion] = useState(0);
    const refreshLogHighlights = useCallback(() => {
        setHighlightVersion(v => v + 1);
    }, []);

    const { vitals, game } = useGameProviderState();
    const v = vitals;
    const s = game;

    // Destructure some commonly used values for brevity in dependencies
    const {
        roomPlayers, roomNpcs, roomItems,
        roomZone,
        isNoviceMode, isNewbieMode, isSoundEnabled, characterClass, abilities,
        lighting, lightningEnabled, weather, isFoggy,
        actions, actionsRef,
        inCombat, status, characterName,
        mood, spellSpeed, alertness, playerPosition,
        isImmersionMode,
        isCrtEnabled,
        isBloomEnabled,
        fontFamily,
        handleTabClick,
        toggleMap
    } = s;

    const { stats, rumble, target, activePrompt } = v;
    const { isSpectateMode, spectateTargetId, groupMembers } = s;

    const spectateTarget = useMemo(() => {
        if (!isSpectateMode || spectateTargetId == null) return null;
        const target = groupMembers.find(m => {
            const mIdStr = String(m.id);
            const targetIdStr = String(spectateTargetId);
            return mIdStr === targetIdStr || m.name === targetIdStr;
        });
        if (!target) {
            console.warn('[Spectate] Target not found in groupMembers!', {
                spectateTargetId,
                memberIds: groupMembers.map(m => m.id),
                memberNames: groupMembers.map(m => m.name)
            });
        }
        return target ?? null;
    }, [isSpectateMode, spectateTargetId, groupMembers]);

    // Use a ref for the previous target to detect changes
    const prevSpectateTargetIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (spectateTarget && spectateTarget.id !== prevSpectateTargetIdRef.current) {
            console.log('[Spectate] Switched Target to:', spectateTarget.name,
                '| HP:', spectateTarget.hp, '| Mana:', spectateTarget.mana,
                '| Room:', spectateTarget.room, '| MapID:', spectateTarget.mapid,
                '| Fighting:', spectateTarget.fighting,
                '| Full:', JSON.stringify(spectateTarget));
            prevSpectateTargetIdRef.current = spectateTarget.id;
        } else if (!spectateTarget && prevSpectateTargetIdRef.current !== null) {
            console.log('[Spectate] Target cleared');
            prevSpectateTargetIdRef.current = null;
        }
    }, [spectateTarget]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'general' | 'sound' | 'actions' | 'help'>('general');

    // --- Keyword Override System ---
    const { overrides: keywordOverrides, setOverride: setKeywordOverride, removeOverride: removeKeywordOverride } = useKeywordOverrides();
    const [keywordEditState, setKeywordEditState] = useState<{ context: string; displayText: string } | null>(null);
    const [keywordFailureBanner, setKeywordFailureBanner] = useState<{ context: string; displayText: string } | null>(null);
    const lastCommandContextRef = useRef<{ context: string; displayText: string } | null>(null);
    const manualCancelRef = useRef(false);
    const openKeywordEdit = useCallback((context: string, displayText: string) => {
        setKeywordEditState({ context, displayText });
    }, []);
    const [accentColor, setAccentColor] = usePersistentState('mud-accent-color', '#4a90e2');
    const [teleportTargets, setTeleportTargets] = usePersistentState<TeleportTarget[]>('mud-teleport-targets', []);
    const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);

    useEffect(() => {
        const handleCloseSettings = () => setIsSettingsOpen(false);
        window.addEventListener('mume-close-settings', handleCloseSettings);
        return () => window.removeEventListener('mume-close-settings', handleCloseSettings);
    }, []);

    const addDiagnosticLog = useCallback((msg: string) => {
        setDiagnosticLogs(prev => [msg, ...prev].slice(0, 50));
    }, []);

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
    const [commFn, setCommFn] = useState<(sender: string, chan: string, msg: string) => void>();
    const pendingGmcpCommRef = useRef<{ sender: string; chan: string; msg?: string } | null>(null);
    const [groupAddFn, setGroupAddFn] = useState<(data: any) => void>();
    const [groupUpdateFn, setGroupUpdateFn] = useState<(data: any) => void>();
    const [groupRemoveFn, setGroupRemoveFn] = useState<(id: number) => void>();
    const [groupSetFn, setGroupSetFn] = useState<(data: any[]) => void>();
    const lastCommIdBySenderRef = useRef<Map<string, string>>(new Map());

    const inCombatHookRef = useRef(false);
    useEffect(() => { inCombatHookRef.current = inCombat; }, [inCombat]);

    const recorder = useSessionRecorder();

    const roomContext = useMemo(() => ({
        players: s.roomPlayers,
        npcs: s.roomNpcs,
        items: s.roomItems,
        roomName: s.roomName,
        roomDesc: s.roomDesc
    }), [s.roomPlayers, s.roomNpcs, s.roomItems, s.roomName, s.roomDesc]);

    const sanitizedRecordEntry = useCallback((type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any) => {
        const isSensitive = s.gameState !== 'playing';
        recorder.recordEntry(type, data, { mask: isSensitive });
    }, [s.gameState, recorder.recordEntry]);

    const isAccountModeRef = useRef(s.gameState === 'account');
    useEffect(() => { isAccountModeRef.current = s.gameState === 'account'; }, [s.gameState]);

    const { messages, setMessages, addMessage, flushMessages, isCombatLine, clearLog } = useMessageLog(
        inCombatHookRef,
        s.isMobileBrevityMode,
        roomContext,
        lastCommIdBySenderRef,
        isNewbieMode,
        sanitizedRecordEntry,
        s.roomDescRef,
        v.pendingMove,
        v.setPendingMove,
        isAccountModeRef
    );
    const addSystemMessage = useCallback((text: string) => addMessage('system', text, undefined, undefined, undefined, { textOnly: text, lower: text.toLowerCase() }, undefined, undefined, undefined, true), [addMessage]);

    // Keyword failure detection: watch last message for MUME "not found" patterns
    const FAILURE_RE = /\bi see no such thing\b|\byou don't see that\b|\bno such thing here\b|\bthat's not here\b/i;
    useEffect(() => {
        if (!messages.length) return;
        const last = messages[messages.length - 1];
        if (FAILURE_RE.test(last.textRaw || '') && lastCommandContextRef.current) {
            const snapshot = lastCommandContextRef.current;
            setKeywordFailureBanner(snapshot);
            setTimeout(() => setKeywordFailureBanner(null), 5000);
        }
    }, [messages]);

    const {
        audioCtxRef,
        initAudio,
        playSound,
        setPlaySound,
        playRandomSound,
        playMovementSound,
        loadMovementSound,
        playDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound,
        playHitImpactSound,
        loadHitImpactSound,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadSpellSounds,
        playCommMessageSound,
        stopCommMessageSound,
        playTutorialExitSound,
        loadTutorialExitSound,
        loadCommMessageSound,


        triggerHaptic,

        setTriggerHaptic
    } = useGameAudio({
        isSoundEnabled: s.isSoundEnabled,
        roomZone: s.roomZone,
        zoneMusic: s.zoneMusic,
        inCombat: s.inCombat,
        lighting: s.lighting,
        currentTerrain: s.currentTerrain,
        weather: s.weather,
        playerPosition: s.playerPosition,
        waiting: s.isSpectateMode ? s.spectateWaiting : v.stats.conditions?.waiting,
        manualCancelRef,
        gameState: s.gameState,
        isSpectateMode: s.isSpectateMode
    });

    useEffect(() => {
        if (initAudio && loadClickSound && loadMovementSound && loadDoorSound && loadHitImpactSound && loadSpellSounds && loadCommMessageSound) {
            initAudio();
            loadClickSound();
            loadMovementSound();
            loadDoorSound();
            loadHitImpactSound();
            loadSpellSounds();
            loadCommMessageSound();
            loadTutorialExitSound();
        }

    }, [initAudio, loadClickSound, loadMovementSound, loadDoorSound, loadHitImpactSound, loadSpellSounds, loadCommMessageSound, loadTutorialExitSound]);



    const containerRef = useRef<HTMLDivElement>(null);
    const mapperRef = useRef<MapperRef>(null);

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
        alertness,
        setAlertness: s.setAlertness,
        setDetectLighting: (fn) => { /* internal use */ }
    });

    const roomDescRef = React.useRef<string>('');

    const gmcpHandlers = useGmcpHandlers({
        mapperRef,
        roomDescRef,
        setCurrentTerrain: s.setCurrentTerrain,
        setRoomPlayers: s.setRoomPlayers,
        setRoomNpcs: s.setRoomNpcs,
        setRoomItems: s.setRoomItems,
        characterName: s.characterName,
        setAbilities: s.setAbilities,
        addMessage,
        setCharacterName: s.setCharacterName,
        setPlayerPosition: s.setPlayerPosition,
        setRoomName: s.setRoomName,
        setRoomDesc: s.setRoomDesc,
        setRoomZone: s.setRoomZone,
        isMobileBrevityMode: s.isMobileBrevityMode,
        setRoomExits: s.setRoomExits,
        setDiscoveredItems: s.setDiscoveredItems,
        setBufferName: v.setBufferName,
        setPlayerHealthStatus: v.setPlayerHealthStatus,
        setOpponentHealthStatus: v.setOpponentHealthStatus,
        setBufferHealthStatus: v.setBufferHealthStatus,
        setOpponentName: v.setOpponentName,
        setCharacterInfo: v.setCharacterInfo,
        characterInfo: v.characterInfo,
        opponentName: v.opponentName,
        bufferName: v.bufferName,
        roomPlayers: s.roomPlayers,
        roomNpcs: s.roomNpcs,
        setGroupMembers: s.setGroupMembers,
        setMumeEditState: s.setMumeEditState,
        setWhoList: s.setWhoList,
        setWhereList: s.setWhereList,
        opponentId: v.opponentId,
        setOpponentId: v.setOpponentId,
        detectLighting: env.detectLighting,
        playMovementSound,
        playDoorSound,
        playerPositionRef: s.playerPositionRef,
        setIsRiding: s.setIsRiding,
        isRidingRef: s.isRidingRef,
        isSpectateMode: s.isSpectateMode
    });

    const { spatButtons, setSpatButtons, triggerSpit, triggerSpitManual } = useSpatButtons(messages, containerRef, triggerHaptic);

    const btn = useButtons(abilities, characterClass, s.characterName, v.target, s.inlineCategories);
    const joystick = useJoystick(triggerHaptic, s.roomExits);
    const editor = useButtonEditor(btn, containerRef);
    const viewport = useViewport(s.uiMode, s.disableSmoothScroll, s.disable3dScroll, s.isImmersionMode, s.fontFamily);

    const practice = usePracticeHandler(s.setAbilities);
    const shop = useShopHandler();

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
        isImmersionMode: s.isImmersionMode, setIsImmersionMode: s.setIsImmersionMode,
        isMobileBrevityMode: s.isMobileBrevityMode, setIsMobileBrevityMode: s.setIsMobileBrevityMode,
        showOrganicTerrain: s.showOrganicTerrain, setShowOrganicTerrain: s.setShowOrganicTerrain,
        inlineCategories: s.inlineCategories, setInlineCategories: s.setInlineCategories,
        isHighlighterEnabled: s.isHighlighterEnabled, setIsHighlighterEnabled: s.setIsHighlighterEnabled,
        isCrtEnabled: s.isCrtEnabled, setIsCrtEnabled: s.setIsCrtEnabled,
        isBloomEnabled: s.isBloomEnabled, setIsBloomEnabled: s.setIsBloomEnabled,
        isTimestampEnabled: s.isTimestampEnabled, setIsTimestampEnabled: s.setIsTimestampEnabled
    });

    const [input, setInput] = useState("");
    const actualTarget = v.target;
    const { processMessageHtml } = useMessageHighlighter(actualTarget, btn.buttonsRef, roomPlayers, roomNpcs, s.characterName, roomItems, s.inlineCategories, s.isHighlighterEnabled, highlightVersion, s.discoveredItems, keywordOverrides, s.selectedObjectIds, s.inCombat, s.spectateCharacterName, s.groupMembers);


    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const parser = useGameParser({
        isInventoryOpen: s.ui.drawer === 'inventory',
        isEquipmentOpen: s.ui.drawer === 'equipment',
        isCharacterOpen: s.ui.drawer === 'character',
        isStatsOpen: s.ui.drawer === 'stats',
        isPlayersOpen: s.ui.drawer === 'players',
        mapperRef,
        btn: {
            buttonsRef: btn.buttonsRef,
            setButtons: btn.setButtons,
            buttonTimers: btn.buttonTimers,
            setActiveSet: btn.setActiveSet,
        },
        addMessage, playSound, playHitImpactSound, playRandomSound, playDoorSound, triggerHaptic,
        setWeather: s.setWeather,
        setIsFoggy: s.setIsFoggy,
        setStats: v.setStats,
        setAbilities: s.setAbilities,
        setCharacterClass: s.setCharacterClass,
        setInCombat: s.setInCombat,
        inCombatRef: s.inCombatRef,
        setLightningEnabled: s.setLightningEnabled,
        setPlayerPosition: s.setPlayerPosition,
        setMood: s.setMood,
        detectLighting: env.detectLighting,
        setCurrentTerrain: s.setCurrentTerrain,
        addDiagnosticLog,
        keywordOverrides,
        isSoundEnabledRef: settings.isSoundEnabledRef,
        soundTriggersRef: settings.soundTriggersRef,
        actionsRef: s.actionsRef,
        executeCommandRef: s.executeCommandRef,
        setInventoryLines: s.setInventoryLines,
        setStatsLines: s.setStatsLines,
        setInfoLines: s.setInfoLines,
        setScoreLines: s.setScoreLines,
        setQuestLines: s.setQuestLines,
        setPracticeLines: s.setPracticeLines,
        setWhoLines: s.setWhoLines,
        setWhereLines: s.setWhereLines,
        setEqLines: s.setEqLines,
        setWhoList: s.setWhoList,
        setWhereList: s.setWhereList,
        captureStage: s.captureStage,
        practice,
        shop,
        isDrawerCapture: s.isDrawerCapture,
        isSilentCapture: s.isSilentCapture,
        isWaitingForStats: s.isWaitingForStats,
        isWaitingForEq: s.isWaitingForEq,
        isWaitingForInv: s.isWaitingForInv,
        isWaitingForInfo: s.isWaitingForInfo,
        roomNameRef: s.roomNameRef,
        roomDescRef,
        roomName: s.roomName,
        setRoomName: s.setRoomName,
        setRoomDesc: s.setRoomDesc,
        isNewbieMode: s.isNewbieMode,
        popoverState: s.popoverState,
        setPopoverState: s.setPopoverState,
        pendingDrawerContainerRef: s.pendingDrawerContainerRef,
        setDiscoveredItems: s.setDiscoveredItems,
        setPlayerHealthStatus: v.setPlayerHealthStatus,
        setOpponentHealthStatus: v.setOpponentHealthStatus,
        setOpponentName: v.setOpponentName,
        setBufferHealthStatus: v.setBufferHealthStatus,
        setBufferName: v.setBufferName,
        setCharacterInfo: v.setCharacterInfo,
        setSpectateStats: s.setSpectateStats,
        setSpectateHealthStatus: s.setSpectateHealthStatus,
        setSpectateOpponentName: s.setSpectateOpponentName,
        setSpectateOpponentStatus: s.setSpectateOpponentStatus,
        setSpectatePosition: s.setSpectatePosition,
        setSpectateWaiting: s.setSpectateWaiting,
        setSpectateRoomName: s.setSpectateRoomName,
        setSpectateInCombat: s.setSpectateInCombat,
        setSpectateCharacterName: s.setSpectateCharacterName,
        characterInfo: v.characterInfo,
        setQuests: s.setQuests,
        quests: s.quests,
        mumeEditState: s.mumeEditState,
        setMumeEditState: s.setMumeEditState,
        triggerXpTicker: v.triggerXpTicker,
        triggerHitFlash: v.triggerHitFlash,
        triggerOppHitFlash: v.triggerOppHitFlash,
        addSystemMessage,
        pendingGmcpCommRef,
        lastCommIdBySenderRef,
        groupMembers: s.groupMembers,
        setEntities: s.setEntities,
        playIncantationSound,
        playCommMessageSound,
        stopIncantationSound,
        playTutorialExitSound,
        playMagicExplosionSound,
        deathRoomId: v.deathRoomId,
        setDeathRoomId: v.setDeathRoomId,
        accountState: v.accountState,
        setAccountState: v.setAccountState,
        setGameState: s.setGameState,
        activePrompt: v.activePrompt,
        gameState: s.gameState,
        isMobile: viewport.isMobile,
        playerPosition: s.playerPosition,
        isSpectateMode: s.isSpectateMode,
        processMessageHtml: processMessageHtml,
        spectateTarget,
        setMessages,
        clearLog,
        setRoomPlayers: s.setRoomPlayers,
        setRoomNpcs: s.setRoomNpcs,
        setRoomItems: s.setRoomItems,
        roomPlayers: s.roomPlayers,
        spectateCharacterName: s.spectateCharacterName,
        registerEntity: s.registerEntity,
        spectateStats: v.spectateStats,
        characterName: s.characterName
    });


    const { processLine } = parser;

    const telnet = useTelnet({
        connectionUrl: settings.connectionUrl,
        processLine,
        recordEntry: sanitizedRecordEntry,
        setPrompt: v.setActivePrompt,
        onCharNameChange: gmcpHandlers.onCharNameChange,
        onPositionChange: gmcpHandlers.onPositionChange,
        handlers: {
            setStatus: s.setStatus, setStats: v.setStats, setWeather: s.setWeather,
            setIsFoggy: s.setIsFoggy, setInCombat: s.setInCombat,
            addMessage, flushMessages, detectLighting: env.detectLighting,
            onRoomInfo: (data) => { gmcpHandlers.onRoomInfo(data); roomInfoFn?.(data); },
            onRoomUpdateExits: (data) => { gmcpHandlers.onRoomUpdateExits(data); roomExitsFn?.(data); },
            onCharVitals: (data) => { gmcpHandlers.onCharVitals(data); charVitalsFn?.(data); },
            onRoomPlayers: (data) => { gmcpHandlers.onRoomPlayers(data); roomPlayersFn?.(data); },
            onRoomNpcs: (data) => { gmcpHandlers.onRoomNpcs(data); roomNpcsFn?.(data); },
            onRoomItems: (data) => { gmcpHandlers.onRoomItems(data); roomItemsFn?.(data); },
            onAddPlayer: (data: string | GmcpOccupant) => { gmcpHandlers.onAddPlayer(data); addPlayerFn?.(data); },
            onAddNpc: (data: string | GmcpOccupant) => { gmcpHandlers.onAddNpc(data); addNpcFn?.(data); },
            onRemovePlayer: (data: string | GmcpOccupant) => { gmcpHandlers.onRemovePlayer(data); removePlayerFn?.(data); },
            onRemoveNpc: (data: string | GmcpOccupant) => { gmcpHandlers.onRemoveNpc(data); removeNpcFn?.(data); },
            onCharNameChange: (name) => {
                gmcpHandlers.onCharNameChange(name);
                if (name && !recorder.isRecording) {
                    console.log(`[Recorder] Char.Name received. Auto-starting recording for character: ${name}`);
                    recorder.startRecording(name);
                }
            },
            onCharInfo: gmcpHandlers.onCharInfo,
            onPositionChange: gmcpHandlers.onPositionChange,
            onOpponentChange: (name) => { opponentChangeFn?.(name); v.setOpponentName(name); },
            onComm: (sender, chan, msg) => { pendingGmcpCommRef.current = { sender, chan, msg }; commFn?.(sender, chan, msg); },
            onGroupAdd: (data) => { gmcpHandlers.onGroupAdd(data); groupAddFn?.(data); },
            onGroupUpdate: (data) => { gmcpHandlers.onGroupUpdate(data); groupUpdateFn?.(data); },
            onGroupRemove: (id) => { gmcpHandlers.onGroupRemove(id); groupRemoveFn?.(id); },
            onGroupSet: (data) => { gmcpHandlers.onGroupSet(data); groupSetFn?.(data); },
            onCharRide: gmcpHandlers.onCharRide,
            onCorePing: () => {
                // Initializer moved to onCharNameChange
            },
            onDisconnect: () => {
                console.log('[GameContext] Disconnect! Clearing tactical buffers.');
                s.setStatsLines([]);
                s.setScoreLines([]);
                s.setInfoLines([]);
                s.setInventoryLines([]);
                s.setEqLines([]);
                s.setWhoLines([]);
                s.setWhereLines([]);
                s.setQuestLines([]);
                s.setPracticeLines([]);
            },
            addDiagnosticLog
        }
    });


    React.useLayoutEffect(() => {
        document.documentElement.style.setProperty('--font-main', fontFamily);
    }, [fontFamily]);

    const controllerDeps = React.useMemo(() => ({
        telnet,
        addMessage,
        initAudio,
        navIntervalRef,
        mapperRef,
        teleportTargets,
        isDrawerCapture: s.isDrawerCapture,
        isSilentCapture: s.isSilentCapture,
        captureStage: s.captureStage,
        isWaitingForStats: s.isWaitingForStats,
        isWaitingForEq: s.isWaitingForEq,
        isWaitingForInv: s.isWaitingForInv,
        isWaitingForInfo: s.isWaitingForInfo,
        setInventoryLines: s.setInventoryLines,
        setStatsLines: s.setStatsLines,
        setInfoLines: s.setInfoLines,
        setScoreLines: s.setScoreLines,
        setEqLines: s.setEqLines,
        setCommandPreview: () => { },
        input,
        setInput,
        isNoviceMode: s.isNoviceMode,
        isNewbieMode: s.isNewbieMode,
        status: s.status,
        target: v.target,
        setTarget: v.setTarget,
        setPendingMove: v.setPendingMove,
        activePrompt: v.activePrompt,
        finalizeCapture: parser.finalizeCapture,
        popoverState: s.popoverState,
        setPopoverState: s.setPopoverState,
        setIsCharacterOpen: s.setIsCharacterOpen,
        setIsStatsOpen: s.setIsStatsOpen,
        setIsEquipmentOpen: s.setIsEquipmentOpen,
        setIsInventoryOpen: s.setIsInventoryOpen,
        setIsPlayersOpen: s.setIsPlayersOpen,
        setIsSettingsOpen,
        setSettingsTab,
        setIsMapExpanded: s.setIsMapExpanded,
        setUI: s.setUI as any,
        viewport,
        triggerHaptic,
        btn,
        joystick,
        wasDraggingRef: editor.wasDraggingRef,
        ui: s.ui as any,
        actions: s.actions,
        setActions: s.setActions,
        setActiveDragData: s.setActiveDragData,
        activeDragData: s.activeDragData,
        practice,
        heldButton: v.heldButton,
        setHeldButton: v.setHeldButton,
        parley: s.parley,
        setParley: s.setParley,
        isTrackpadModifierActive: s.isTrackpadModifierActive,
        shop,
        keywordOverrides,
        openKeywordEdit,
        lastCommandContextRef,
        entities: s.entities,
        applyOptimisticChange: s.applyOptimisticChange,
        selectedObjectIds: s.selectedObjectIds,
        toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection,
        playClickSound,
        isSoundEnabled: s.isSoundEnabled,
        waiting: !!v.stats.conditions?.waiting,
        recordEntry: sanitizedRecordEntry,
        clearLog,
        gameState: s.gameState,

    }), [
        telnet, addMessage, initAudio, mapperRef, teleportTargets, s.isDrawerCapture, s.isSilentCapture, s.captureStage,
        s.isWaitingForStats, s.isWaitingForEq, s.isWaitingForInv, s.isWaitingForInfo, s.setInventoryLines, s.setStatsLines, s.setEqLines,
        input, setInput, isNoviceMode, s.isNewbieMode, s.status, v.target, v.setTarget, v.setPendingMove, parser.finalizeCapture, s.popoverState,
        s.setPopoverState, s.setIsCharacterOpen, s.setIsStatsOpen, s.setIsEquipmentOpen, s.setIsInventoryOpen,
        s.setIsPlayersOpen, setIsSettingsOpen, setSettingsTab, s.setIsMapExpanded, s.setUI, viewport, triggerHaptic,
        btn, joystick, editor.wasDraggingRef, s.ui, s.actions, s.setActions, s.setActiveDragData, s.activeDragData,
        practice, v.heldButton, v.setHeldButton, s.parley, s.setParley, s.isTrackpadModifierActive, shop,
        keywordOverrides, openKeywordEdit, lastCommandContextRef, s.entities, s.applyOptimisticChange,
        s.selectedObjectIds, s.toggleObjectSelection, s.clearObjectSelection, playClickSound, s.isSoundEnabled,
        vitals.stats.conditions?.waiting, sanitizedRecordEntry, v.activePrompt, clearLog, s.gameState
    ]);

    const controller = useCommandController(controllerDeps);
    // --- Replayer Logic ---
    const isPrivacyModeActiveRef = useRef(false);
    const applyPrivacyScrubbing = useCallback((text: string, isPrivacyMode: boolean) => {
        if (!isPrivacyMode) return text;
        
        // Replace digits in stats with 'I' barcode
        let scrubbed = text.replace(/\b(Str|Int|Wis|Dex|Con|Wil|Per):\s*(\d+)/gi, (match, label, val) => {
            return `${label}:${'I'.repeat(val.length)}`;
        });
        
        // Replace digits in vitals/score with 'I' barcode
        scrubbed = scrubbed.replace(/(\d+)\/(\d+)\s*(hits|hp|mana|sp|moves|mv)/gi, (match, current, max, unit) => {
            return `${'I'.repeat(current.length)}/${'I'.repeat(max.length)} ${unit}`;
        });
        
        // Condensed vitals (443h, 97m, 122v)
        scrubbed = scrubbed.replace(/(\d+)(h|m|v)\b/gi, (match, val, unit) => {
            return `${'I'.repeat(val.length)}${unit}`;
        });
        
        return scrubbed;
    }, []);

    const replayerBufferRef = useRef('');
    const replayerProtocolHandlerRef = useRef<ProtocolHandler | null>(null);

    // Initialize handler with stable callbacks
    if (!replayerProtocolHandlerRef.current) {
        replayerProtocolHandlerRef.current = new ProtocolHandler({
            sendBytes: () => {}, 
            sendGMCP: () => {},  
            addMessage: (type, text, ...args) => {
                // Force immediate refresh for replayer messages
                addMessage(type as any, text, ...args);
            },
            handleSubnegotiation: (buffer) => {
                const cmd = buffer[0];
                if (cmd === TELNET_GMCP) {
                    const raw = new TextDecoder().decode(new Uint8Array(buffer.slice(1)));
                    let splitIdx = raw.search(/[\s\{\[]/);
                    const pkg = splitIdx > -1 ? raw.substring(0, splitIdx).trim() : raw;
                    const json = splitIdx > -1 ? raw.substring(splitIdx).trim() : '';
                    const data = json ? JSON.parse(json) : null;
                    const parts = pkg.split('.');
                    const leaf = parts[parts.length - 1];
                    const handlerName = `on${leaf}`;
                    if ((gmcpHandlers as any)[handlerName]) {
                        (gmcpHandlers as any)[handlerName](data);
                    }
                    
                    // Direct Mapper sync for Room.Info
                    if (pkg === 'Room.Info' && mapperRef.current) {
                        mapperRef.current.handleRoomInfo(data);
                        // Forward to event listeners with spectating flag
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { 
                                detail: { ...data, spectating: true } 
                            }));
                        }
                    }
                    // Direct Mapper sync for Char.Vitals terrain
                    if (pkg === 'Char.Vitals' && data.terrain && mapperRef.current) {
                        mapperRef.current.handleTerrain(data.terrain);
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { 
                                detail: data.terrain 
                            }));
                        }
                    }
                }
            },
            processText: (text) => {
                const scrubbed = applyPrivacyScrubbing(text, isPrivacyModeActiveRef.current);
                replayerBufferRef.current += scrubbed;
                const lines = replayerBufferRef.current.split('\n');
                replayerBufferRef.current = lines.pop() || '';
                for (let i = 0; i < lines.length; i++) {
                    parser.processLine(lines[i]);
                }
                
                // Prompt handling (similar to useTelnet)
                const remaining = replayerBufferRef.current;
                if (remaining) {
                    const clean = remaining.replace(/\x1b\[[0-9;]*m/g, '').trim();
                    if (clean.endsWith('>') || clean.endsWith(':')) {
                        parser.processLine(remaining);
                        flushMessages();
                    }
                }
            }
        });
    }

    const replayer = useSessionReplayer(useCallback((type, payload, isPrivacyMode) => {
        isPrivacyModeActiveRef.current = isPrivacyMode;
        if (type === 'rx') {
            replayerProtocolHandlerRef.current?.handleRawData(new Uint8Array(payload));
        } else if (type === 'gmcp') {
            const { pkg, data } = payload;
            const params = typeof data === 'string' ? JSON.parse(data) : data;
            const parts = pkg.split('.');
            const leaf = parts[parts.length - 1];
            const handlerName = `on${leaf}`;
            if ((gmcpHandlers as any)[handlerName]) {
                (gmcpHandlers as any)[handlerName](params);
            }
            // Direct Mapper sync for explicit GMCP
            if (pkg === 'Room.Info' && mapperRef.current) {
                mapperRef.current.handleRoomInfo(params);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { 
                        detail: { ...params, spectating: true } 
                    }));
                }
            }
            if (pkg === 'Char.Vitals' && params.terrain && mapperRef.current) {
                mapperRef.current.handleTerrain(params.terrain);
            }
        } else if (type === 'tx') {
            addMessage('user', applyPrivacyScrubbing(payload, isPrivacyMode), false);
        }
    }, [gmcpHandlers, parser, addMessage, flushMessages, applyPrivacyScrubbing]));

    const { handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp, handleDragStart, handleDragEnd } = controller;

    const handleSaveMumeEdit = useCallback((text: string) => {
        if (s.mumeEditState.key === 'text-editor') {
            const lines = text.split('\n');
            lines.forEach(line => {
                executeCommand(line, true, true);
            });
            executeCommand('%e', true, true);
        } else {
            if (typeof window !== 'undefined' && (window as any).mumeTelnet?.sendGmcp) {
                (window as any).mumeTelnet.sendGmcp('Mume.Client.Edit', JSON.stringify({
                    key: s.mumeEditState.key,
                    text: text,
                    playHitImpactSound: playHitImpactSound,
                    playIncantationSound: playIncantationSound,
                    stopIncantationSound: stopIncantationSound,
                    playMagicExplosionSound: playMagicExplosionSound
                }));
            }
        }
        s.setMumeEditState(prev => ({ ...prev, isOpen: false }));
    }, [s.mumeEditState.key, executeCommand, s.setMumeEditState, playHitImpactSound, playIncantationSound, stopIncantationSound, playMagicExplosionSound]);

    // Update the ref so the state and parser components can call it
    useEffect(() => {
        if (s.executeCommandRef) s.executeCommandRef.current = executeCommand;
    }, [executeCommand, s.executeCommandRef]);

    const { prepareLoginAttempt } = useSessionManager({
        status: s.status,
        activePrompt: v.activePrompt,
        loginName: settings.loginName,
        loginPassword: settings.loginPassword,
        addSystemMessage,
        telnetSendCommand: telnet.sendCommand,
        telnetConnect: telnet.connect,
        characterName: s.characterName,
        executeCommand,
        autoConnect: s.autoConnect,
        hasSeenOnboarding: s.hasSeenOnboarding,
        isNoviceMode,
        groupMembers: s.groupMembers,
        spatButtons,
        triggerSpitManual,
        gameState: s.gameState
    });

    // --- Section: Terminal Synchronization ---
    const lastSyncRef = useRef({ cols: 0, rows: 0 });
    useEffect(() => {
        if (s.gameState === 'disconnected' || s.gameState === 'account' || !viewport.columns || !viewport.rows) return;

        // Skip if dimensions haven't changed since last SUCCESSFUL sync command
        if (viewport.columns === lastSyncRef.current.cols &&
            viewport.rows === lastSyncRef.current.rows) return;

        const timer = setTimeout(() => {
            // Re-check inside timer in case it changed back or already fired
            if (viewport.columns === lastSyncRef.current.cols &&
                viewport.rows === lastSyncRef.current.rows) return;

            console.log(`[Sync] Terminal: ${viewport.columns}x${viewport.rows}`);
            
            // Combine into one command to minimize silent capture overhead (decrements only 1 per prompt)
            executeCommand(`change width ${viewport.columns}; change length ${viewport.rows}`, true, true);
            
            // Update the ref so we don't spam if executeCommand identity shifts again
            lastSyncRef.current = { cols: viewport.columns, rows: viewport.rows };
        }, 500); // 500ms settle time

        return () => clearTimeout(timer);
    }, [viewport.columns, viewport.rows, s.gameState, executeCommand]);

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

    const uiValue = useMemo(() => ({
        ui: s.ui, setUI: s.setUI,
        popoverState: s.popoverState, setPopoverState: s.setPopoverState,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        setIsStatsOpen: s.setIsStatsOpen,
        setIsCharacterOpen: s.setIsCharacterOpen,
        setIsEquipmentOpen: s.setIsEquipmentOpen,
        setIsInventoryOpen: s.setIsInventoryOpen,
        setIsMapExpanded: s.setIsMapExpanded,
        setIsSetManagerOpen: s.setIsSetManagerOpen,
        setIsPlayersOpen: s.setIsPlayersOpen,
        characterName: s.characterName,
        handleTabClick: s.handleTabClick,
        toggleMap: s.toggleMap,
        isRecording: recorder.isRecording,
        duration: recorder.duration,
        startRecording: recorder.startRecording,
        stopRecording: recorder.stopRecording,
        saveLog: recorder.saveLog,
        replayer: replayer
    }), [
        s.ui, s.popoverState, s.setPopoverState, isSettingsOpen, settingsTab,
        s.setIsCharacterOpen, s.setIsEquipmentOpen, s.setIsInventoryOpen, s.setIsMapExpanded, s.setIsSetManagerOpen, s.setUI, s.setIsPlayersOpen,
        s.handleTabClick, s.toggleMap,
        recorder.isRecording, recorder.duration, recorder.startRecording, recorder.stopRecording, recorder.saveLog,
        replayer.log, replayer.state, replayer.loadLog, replayer.clearLog, replayer.play, replayer.pause, replayer.seek, replayer.setSpeed,
        replayer.setIsVisible, replayer.setPrivacyMode, replayer.startExport, replayer.stopExport
    ]);

    const gameValue = useMemo(() => {
        const base = { ...s };
        if (isSpectateMode && spectateTarget) {
            base.roomName = spectateTarget.room || s.roomName;
            base.characterName = spectateTarget.name || s.characterName;
            // Use spectated player's fighting state; default to false (not the player's own combat)
            const isTargetFighting = spectateTarget.fighting || spectateTarget.position?.toLowerCase() === 'fighting';
            base.inCombat = isTargetFighting ?? false;
        }

        return {
            ...base,
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
            opponentId: v.opponentId, setOpponentId: v.setOpponentId,
            onGroupAdd: groupAddFn, setOnGroupAdd: setGroupAddFn,
            onGroupUpdate: groupUpdateFn, setOnGroupUpdate: setGroupUpdateFn,
            onGroupRemove: groupRemoveFn, setOnGroupRemove: setGroupRemoveFn,
            onGroupSet: groupSetFn, setOnGroupSet: setGroupSetFn,
            playSound, playRandomSound, playDoorSound, setPlaySound, triggerHaptic, setTriggerHaptic, playClickSound, playCommMessageSound, stopCommMessageSound, playTutorialExitSound,

            btn, joystick, editor, containerRef, viewport, env,
            initAudio,
            setSettings: btn.setSettings, setSetSettings: btn.setSetSettings,
            input, setInput,
            handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick,
            handleLogPointerDown, handleLogPointerUp,
            handleDragStart, handleDragEnd,
            quests: s.quests, setQuests: s.setQuests,
            groupMembers: s.groupMembers, setGroupMembers: s.setGroupMembers,
            mumeEditState: s.mumeEditState, setMumeEditState: s.setMumeEditState,
            handleSaveMumeEdit,
            hasSeenOnboarding: s.hasSeenOnboarding, setHasSeenOnboarding: s.setHasSeenOnboarding,
            mapperRef, ...settings, audioCtxRef,
            telnet, parser, practice,
            spatButtons, setSpatButtons,
            gameState: s.gameState, setGameState: s.setGameState, prepareLoginAttempt,
            diagnosticLogs, addDiagnosticLog,
            refreshLogHighlights,
            addMessage, addSystemMessage,
            isMendingMode: v.isMendingMode, setIsMendingMode: v.setIsMendingMode,
            mendingTarget: v.mendingTarget, setMendingTarget: v.setMendingTarget,
            heldButton: v.heldButton, setHeldButton: v.setHeldButton,
            accountState: v.accountState, setAccountState: v.setAccountState,
            keywordOverrides, openKeywordEdit,
            keywordEditState, setKeywordEditState,
            setKeywordOverride, removeKeywordOverride,
            keywordFailureBanner, setKeywordFailureBanner,
            detectLighting: env.detectLighting,
            setDetectLighting: (fn: (text: string) => void) => { /* internal use */ },
            isRecording: recorder.isRecording,
            duration: recorder.duration,
            startRecording: recorder.startRecording,
            stopRecording: recorder.stopRecording,
            saveLog: recorder.saveLog,
            recordEntry: recorder.recordEntry
        };
    }, [
        s, isSpectateMode, spectateTarget, accentColor, teleportTargets,
        roomInfoFn, roomExitsFn, charVitalsFn, roomPlayersFn, roomNpcsFn, roomItemsFn,
        addPlayerFn, addNpcFn, removePlayerFn, removeNpcFn, opponentChangeFn,
        playSound, triggerHaptic, playCommMessageSound, stopCommMessageSound, playTutorialExitSound,
        btn, joystick, editor, viewport, env, v,
        input, handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick,
        handleDragStart, handleDragEnd,
        settings, audioCtxRef, telnet, parser, spatButtons, diagnosticLogs, addDiagnosticLog,
        handleLogPointerDown, handleLogPointerUp,
        handleSaveMumeEdit, s.setQuests, addMessage, addSystemMessage,
        s.gameState, s.setGameState, prepareLoginAttempt
    ]);

    const logValue = useMemo(() => ({
        messages,
        setMessages,
        addMessage,
        addSystemMessage,
        isCombatLine,
        processMessageHtml,
        refreshLogHighlights,
        handleLogPointerDown,
        handleLogPointerUp,
        selectedObjectIds: s.selectedObjectIds,
        toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection
    }), [messages, setMessages, addMessage, addSystemMessage, isCombatLine, processMessageHtml, refreshLogHighlights, handleLogPointerDown, handleLogPointerUp, s.selectedObjectIds, s.toggleObjectSelection, s.clearObjectSelection]);

    // Reset mending mode when drawer closes
    useEffect(() => {
        if (s.ui.drawer === 'none' && v.isMendingMode) {
            v.setIsMendingMode(false);
            v.setMendingTarget(null);
        }
    }, [s.ui.drawer, v.isMendingMode]);

    const effectiveStats = useMemo(() => {
        if (s.isSpectateMode) {
            return s.spectateStats;
        }
        return v.stats;
    }, [s.isSpectateMode, s.spectateStats, v.stats]);

    const effectiveVitals = useMemo(() => {
        if (s.isSpectateMode) {
            return {
                ...v,
                stats: s.spectateStats,
                playerHealthStatus: s.spectateHealthStatus,
                opponentName: s.spectateOpponentName,
                opponentHealthStatus: s.spectateOpponentStatus,
                characterName: s.spectateCharacterName,
                roomName: s.spectateRoomName
            };
        }
        return v;
    }, [v, s.isSpectateMode, s.spectateStats, s.spectateHealthStatus, s.spectateOpponentName, s.spectateOpponentStatus, s.spectateCharacterName, s.spectateRoomName]);

    // Spectate Mapper Sync handled via textual Room.Info parsing in useLogGmcpParser.ts

    return (
        <GameContext.Provider value={gameValue as any}>
            <VitalsContext.Provider value={effectiveVitals}>
                <UIContext.Provider value={uiValue as any}>
                    <LogContext.Provider value={logValue as any}>
                        {children}
                    </LogContext.Provider>
                </UIContext.Provider>
            </VitalsContext.Provider>
        </GameContext.Provider>
    );
};
