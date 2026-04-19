import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useMemo } from 'react';
import {
    PopoverState, CustomButton, TeleportTarget, GmcpOccupant, SessionMode, CombatHealthStatus
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
import { GmcpDecoder } from '../utils/telnet/GmcpDecoder';
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
import { useHelpHandler } from '../hooks/useHelpHandler';
import { useAgentObservability } from '../hooks/useAgentObservability';

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
    const roomPlayers = s.roomPlayers || [];
    const roomNpcs = s.roomNpcs || [];
    const roomItems = s.roomItems || [];
    const roomZone = s.roomZone || '';
    const isNewbieMode = s.isNewbieMode || false;
    const isSoundEnabled = s.isSoundEnabled || false;
    const characterClass = s.characterClass || 'none';
    const abilities = s.abilities || {};
    const lighting = s.lighting || 'none';
    const lightningEnabled = s.lightningEnabled || false;
    const weather = s.weather || 'none';
    const isFoggy = s.isFoggy || false;
    const actions = s.actions || [];
    const actionsRef = s.actionsRef;
    const groupMembers = s.groupMembers || [];
    const inCombat = s.inCombat || false;
    const status = s.status || 'disconnected';
    const characterName = s.characterName || null;
    const mood = s.mood || 'peaceful';
    const spellSpeed = s.spellSpeed || 'normal';
    const alertness = s.alertness || 'normal';
    const playerPosition = s.playerPosition || 'standing';
    const isImmersionMode = s.isImmersionMode ?? true;
    const isBloomEnabled = s.isBloomEnabled ?? true;
    const fontFamily = s.fontFamily || 'Inter';
    const handleTabClick = s.handleTabClick;
    const toggleMap = s.toggleMap;
    const isSpectateMode = s.isSpectateMode;
    const spectateTargetId = s.spectateTargetId;
    const spectateTarget = useMemo(() => {
        if (!isSpectateMode || spectateTargetId == null) return null;
        const target = groupMembers.find(m => {
            const mIdStr = String(m.id);
            const targetIdStr = String(spectateTargetId);
            return mIdStr === targetIdStr || m.name === targetIdStr;
        });
        return target ?? null;
    }, [isSpectateMode, spectateTargetId, groupMembers]);

    const { stats, rumble, target, activePrompt } = v;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
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

    React.useEffect(() => {
        const handleCloseSettings = () => setIsSettingsOpen(false);
        window.addEventListener('mume-close-settings', handleCloseSettings);
        return () => window.removeEventListener('mume-close-settings', handleCloseSettings);
    }, []);

    const addDiagnosticLog = useCallback((msg: string) => {
        setDiagnosticLogs(prev => [msg, ...prev].slice(0, 50));
    }, []);

    // --- Mode State ---
    const [sessionMode, setSessionMode] = useState<SessionMode>('live');
    React.useEffect(() => { sessionModeRef.current = sessionMode; }, [sessionMode]);
    // uiMode is already managed by 's' (game state)

    // --- Replayer "Shadow" State for HUD ---
    const [replayHUDState, setReplayHUDState] = useState({
        roomName: '',
        roomDesc: '',
        roomTerrain: '',
        roomZone: '',
        hp: 0,
        maxHp: 0,
        mana: 0,
        maxMana: 0,
        move: 0,
        maxMove: 0,
        opponentName: null as string | null,
        opponentHealth: null as CombatHealthStatus | null,
    });
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
    React.useEffect(() => { inCombatHookRef.current = inCombat; }, [inCombat]);

    const recorder = useSessionRecorder();
    const isSilentReplayRef = useRef(false);
    const sessionModeRef = useRef<SessionMode>('live');
    const replayerRef = useRef<any>(null);

    const roomContext = useMemo(() => ({
        players: s.roomPlayers,
        npcs: s.roomNpcs,
        items: s.roomItems,
        setIsPasswordMode: s.setIsPasswordMode,
        roomName: s.roomName,
        roomDesc: s.roomDesc
    }), [s.roomPlayers, s.roomNpcs, s.roomItems, s.roomName, s.roomDesc, s.setIsPasswordMode]);

    const agent = useAgentObservability(v, s);

    const sanitizedRecordEntry = useCallback((type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any, options?: { mask?: boolean }) => {
        const isSensitive = s.gameState !== 'playing' || s.isPasswordMode || options?.mask;
        recorder.recordEntry(type, data, { mask: isSensitive });
        agent.recordEvent(type, isSensitive ? (type === 'tx' ? '********' : data) : data);
    }, [s.gameState, s.isPasswordMode, recorder.recordEntry, agent]);

    const isAccountModeRef = useRef(s.gameState === 'account');
    React.useEffect(() => { isAccountModeRef.current = s.gameState === 'account'; }, [s.gameState]);

    const captureStage = useRef<'stat' | 'eq' | 'inv' | 'practice' | 'who' | 'where' | 'container' | 'none'>('none');
    const isDrawerCapture = useRef(0);
    const isSilentCapture = useRef(0);
    const isWaitingForStats = useRef(false);
    const isWaitingForEq = useRef(false);
    const isWaitingForInv = useRef(false);
    const isWaitingForInfo = useRef(false);
    const captureOwnerDrawer = useRef<'stat' | 'eq' | 'inv' | 'practice' | 'who' | 'where' | 'container' | 'none'>('none');
    const pendingDrawerContainerRef = useRef<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>(null);

    const { messages, setMessages, addMessage, flushMessages, isCombatLine, clearLog } = useMessageLog(
        inCombatHookRef,
        roomContext,
        lastCommIdBySenderRef,
        isNewbieMode,
        sanitizedRecordEntry,
        s.roomDescRef,
        v.pendingMove,
        v.setPendingMove,
        isAccountModeRef
    );

    // --- Safety Sanatization ---
    // [Mod] Disabled: don't clear the previous log data when logging in
    // const prevGameStateRef = useRef(s.gameState);
    // React.useEffect(() => {
    //     if (prevGameStateRef.current === 'account' && s.gameState === 'playing') {
    //         console.log('[Sanitization] State transition detected: account -> playing. Clearing log.');
    //         clearLog();
    //     }
    //     prevGameStateRef.current = s.gameState;
    // }, [s.gameState, clearLog]);

    const addSystemMessage = useCallback((text: string) => addMessage('system', text, undefined, undefined, undefined, { textOnly: text, lower: text.toLowerCase() }, undefined, undefined, undefined, true), [addMessage]);

    // Keyword failure detection: watch last message for MUME "not found" patterns
    const FAILURE_RE = /\bi see no such thing\b|\byou don't see that\b|\bno such thing here\b|\bthat's not here\b/i;
    React.useEffect(() => {
        if (!messages.length) return;
        const last = messages[messages.length - 1];
        if (FAILURE_RE.test(last.textRaw || '') && lastCommandContextRef.current) {
            const snapshot = lastCommandContextRef.current;
            setKeywordFailureBanner(snapshot);
            setTimeout(() => setKeywordFailureBanner(null), 5000);
        }
    }, [messages]);

    const playerWaiting = v.stats.conditions?.waiting;
    const effectiveWaiting = s.isSpectateMode ? s.spectateWaiting : playerWaiting;

    // Diagnostic log for props flow
    if (v.stats.conditions && 'waiting' in v.stats.conditions) {
        console.log(`[Context/Vitals] playerWaiting=${playerWaiting}, effectiveWaiting=${effectiveWaiting}`);
    }

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

    const isReplaying = sessionMode === 'replay';
    const finalRoomZone = isReplaying ? replayHUDState.roomZone : (s.isSpectateMode ? s.spectateRoomZone : s.roomZone);
    const finalTerrain = isReplaying ? replayHUDState.roomTerrain : (s.isSpectateMode ? s.spectateTerrain : s.currentTerrain);
    const finalLighting = isReplaying ? env.lighting : (s.isSpectateMode ? s.spectateLighting : s.lighting);
    const finalWeather = isReplaying ? env.weather : (s.isSpectateMode ? s.spectateWeather : s.weather);
    const finalInCombat = isReplaying ? false : (s.isSpectateMode ? s.spectateInCombat : s.inCombat);
    const finalPosition = isReplaying ? 'standing' : (s.isSpectateMode ? s.spectatePosition : s.playerPosition);
    const finalWaiting = isReplaying ? false : effectiveWaiting;

    // DEBUG LOGS
    if (isReplaying || s.isSpectateMode) {
        console.log(`[Flow/Debug] sessionMode=${sessionMode}, roomZone=${finalRoomZone}, terrain=${finalTerrain}, lighting=${finalLighting}, weather=${finalWeather}, isImmersionMode=${s.isImmersionMode}`);
    }

    const audio = useGameAudio({
        isSoundEnabled: s.isSoundEnabled,
        roomZone: finalRoomZone,
        zoneMusic: s.zoneMusic,
        inCombat: finalInCombat,
        lighting: typeof finalLighting === 'string' ? finalLighting : 'none',
        gameTime: v.activePrompt?.time || s.gameTime,
        currentTerrain: finalTerrain,
        weather: finalWeather as any,
        playerPosition: finalPosition,
        waiting: finalWaiting,
        manualCancelRef,
        gameState: s.gameState,
        isSpectateMode: false, // Picked effective values above
    });

    const {
        audioCtxRef,
        initAudio,
        playSound: rawPlaySound,
        setPlaySound,
        playRandomSound: rawPlayRandomSound,
        playMovementSound: rawPlayMovementSound,
        loadMovementSound,
        playDoorSound: rawPlayDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound,
        playHitImpactSound: rawPlayHitImpactSound,
        loadHitImpactSound,
        playOofSound: rawPlayOofSound,
        loadOofSound,
        playSlashSound: rawPlaySlashSound,
        loadSlashSound,
        playCleaveSound: rawPlayCleaveSound,
        loadCleaveSound,
        playSmiteSound: rawPlaySmiteSound,
        loadSmiteSound,
        playPierceSound: rawPlayPierceSound,
        loadPierceSound,
        playStabSound: rawPlayStabSound,
        loadStabSound,
        loadAllWeaponSounds,
        playIncantationSound: rawPlayIncantationSound,
        stopIncantationSound: rawPlayStopIncantationSound,
        playMagicExplosionSound: rawPlayMagicExplosionSound,
        primeSpellSuccess: rawPrimeSpellSuccess,
        loadSpellSounds,
        playCommMessageSound: rawPlayCommMessageSound,
        stopCommMessageSound: rawStopCommMessageSound,
        playBuySellSound: rawPlayBuySellSound,
        loadBuySellSound,
        playBashSound: rawPlayBashSound,
        loadBashSound,
        playArrowHitSound: rawPlayArrowHitSound,
        loadArrowHitSound,
        playKillSound: rawPlayKillSound,
        loadKillSound,
        playLevelSound: rawPlayLevelSound,
        loadLevelSound,
        triggerHaptic: rawTriggerHaptic,
        setTriggerHaptic
    } = audio;

    // --- Tactical Audio Suppression Logic ---
    // We want tactical sounds to play during 1x Replay playback, but NOT during
    // seeking (silent rehydration) or high-speed playback (2x/5x).
    const checkSuppression = () => {
        const isReplaying = sessionModeRef.current === 'replay';
        const speed = replayerRef.current?.state?.speed || 1;
        return isReplaying && (isSilentReplayRef.current || speed > 1);
    };

    const playSound = useCallback((...args: Parameters<typeof rawPlaySound>) => !checkSuppression() && rawPlaySound(...args), [rawPlaySound]);
    const playRandomSound = useCallback((...args: Parameters<typeof rawPlayRandomSound>) => !checkSuppression() && rawPlayRandomSound(...args), [rawPlayRandomSound]);
    const playMovementSound = useCallback((...args: Parameters<typeof rawPlayMovementSound>) => !checkSuppression() && rawPlayMovementSound(...args), [rawPlayMovementSound]);
    const playDoorSound = useCallback((...args: Parameters<typeof rawPlayDoorSound>) => !checkSuppression() && rawPlayDoorSound(...args), [rawPlayDoorSound]);
    const playHitImpactSound = useCallback((...args: Parameters<typeof rawPlayHitImpactSound>) => !checkSuppression() && rawPlayHitImpactSound(...args), [rawPlayHitImpactSound]);
    const playOofSound = useCallback((...args: Parameters<typeof rawPlayOofSound>) => !checkSuppression() && rawPlayOofSound(...args), [rawPlayOofSound]);
    const playSlashSound = useCallback((...args: Parameters<typeof rawPlaySlashSound>) => !checkSuppression() && rawPlaySlashSound(...args), [rawPlaySlashSound]);
    const playCleaveSound = useCallback((...args: Parameters<typeof rawPlayCleaveSound>) => !checkSuppression() && rawPlayCleaveSound(...args), [rawPlayCleaveSound]);
    const playSmiteSound = useCallback((...args: Parameters<typeof rawPlaySmiteSound>) => !checkSuppression() && rawPlaySmiteSound(...args), [rawPlaySmiteSound]);
    const playPierceSound = useCallback((...args: Parameters<typeof rawPlayPierceSound>) => !checkSuppression() && rawPlayPierceSound(...args), [rawPlayPierceSound]);
    const playStabSound = useCallback((...args: Parameters<typeof rawPlayStabSound>) => !checkSuppression() && rawPlayStabSound(...args), [rawPlayStabSound]);
    const playIncantationSound = useCallback((...args: Parameters<typeof rawPlayIncantationSound>) => !checkSuppression() && rawPlayIncantationSound(...args), [rawPlayIncantationSound]);
    const stopIncantationSound = useCallback((...args: Parameters<typeof rawPlayStopIncantationSound>) => !checkSuppression() && rawPlayStopIncantationSound(...args), [rawPlayStopIncantationSound]);
    const playMagicExplosionSound = useCallback((...args: Parameters<typeof rawPlayMagicExplosionSound>) => !checkSuppression() && rawPlayMagicExplosionSound(...args), [rawPlayMagicExplosionSound]);
    const primeSpellSuccess = useCallback((...args: Parameters<typeof rawPrimeSpellSuccess>) => !checkSuppression() && rawPrimeSpellSuccess(...args), [rawPrimeSpellSuccess]);
    const playCommMessageSound = useCallback((...args: Parameters<typeof rawPlayCommMessageSound>) => !checkSuppression() && rawPlayCommMessageSound(...args), [rawPlayCommMessageSound]);
    const stopCommMessageSound = useCallback((...args: Parameters<typeof rawStopCommMessageSound>) => !checkSuppression() && rawStopCommMessageSound(...args), [rawStopCommMessageSound]);
    const playBuySellSound = useCallback((...args: Parameters<typeof rawPlayBuySellSound>) => !checkSuppression() && rawPlayBuySellSound(...args), [rawPlayBuySellSound]);
    const playBashSound = useCallback((...args: Parameters<typeof rawPlayBashSound>) => !checkSuppression() && rawPlayBashSound(...args), [rawPlayBashSound]);
    const playArrowHitSound = useCallback((...args: Parameters<typeof rawPlayArrowHitSound>) => !checkSuppression() && rawPlayArrowHitSound(...args), [rawPlayArrowHitSound]);
    const playKillSound = useCallback((...args: Parameters<typeof rawPlayKillSound>) => !checkSuppression() && rawPlayKillSound(...args), [rawPlayKillSound]);
    const playLevelSound = useCallback((...args: Parameters<typeof rawPlayLevelSound>) => !checkSuppression() && rawPlayLevelSound(...args), [rawPlayLevelSound]);
    const triggerHaptic = useCallback((...args: Parameters<typeof rawTriggerHaptic>) => !checkSuppression() && rawTriggerHaptic(...args), [rawTriggerHaptic]);

    React.useEffect(() => {
        if (initAudio) {
            initAudio();
        }
    }, [initAudio]);





    const gmcpHandlers = useGmcpHandlers({
        mapperRef,
        roomDescRef: s.roomDescRef,
        setCurrentTerrain: s.isSpectateMode ? s.setSpectateTerrain : s.setCurrentTerrain,
        setRoomPlayers: s.isSpectateMode ? s.setSpectateGroupMembers : s.setRoomPlayers, // Note: occupants handling might need more thought, but this helps vitals
        setRoomNpcs: s.setRoomNpcs,
        setRoomItems: s.setRoomItems,
        characterName: s.characterName,
        setAbilities: s.setAbilities,
        addMessage,
        setCharacterName: s.setCharacterName,
        setPlayerPosition: s.isSpectateMode ? s.setSpectatePosition : s.setPlayerPosition,
        setInCombat: s.isSpectateMode ? s.setSpectateInCombat : s.setInCombat,
        setRoomName: s.isSpectateMode ? s.setSpectateRoomName : s.setRoomName,
        setRoomDesc: s.isSpectateMode ? s.setSpectateRoomDesc : s.setRoomDesc,
        setRoomZone: s.isSpectateMode ? s.setSpectateRoomZone : s.setRoomZone,
        setRoomExits: s.setRoomExits, // Exits can stay shared for mapper
        setDiscoveredItems: s.setDiscoveredItems,
        setBufferName: v.setBufferName,
        setPlayerHealthStatus: s.isSpectateMode ? v.setSpectateHealthStatus : v.setPlayerHealthStatus,
        setOpponentHealthStatus: s.isSpectateMode ? v.setSpectateOpponentStatus : v.setOpponentHealthStatus,
        setBufferHealthStatus: v.setBufferHealthStatus,
        setOpponentName: s.isSpectateMode ? v.setSpectateOpponentName : v.setOpponentName,
        setCharacterInfo: v.setCharacterInfo,
        characterInfo: v.characterInfo,
        opponentName: s.isSpectateMode ? v.spectateOpponentName : v.opponentName,
        bufferName: v.bufferName,
        roomPlayers: s.roomPlayers,
        roomNpcs: s.roomNpcs,
        setGroupMembers: s.setGroupMembers,
        setMumeEditState: s.setMumeEditState,
        setWhoList: s.setWhoList,
        setWhereList: s.setWhereList,
        opponentId: s.isSpectateMode ? v.spectateOpponentId : v.opponentId,
        setOpponentId: s.isSpectateMode ? v.setSpectateOpponentId : v.setOpponentId,
        detectLighting: (light) => {
            if (s.isSpectateMode) s.setSpectateLighting(light as any);
            else env.detectLighting?.(light);
        },
        playMovementSound,
        playDoorSound,
        setWeather: s.setWeather,
        setIsFoggy: s.setIsFoggy,
        setStats: s.isSpectateMode ? s.setSpectateStats : s.setStats,

        playerPositionRef: s.playerPositionRef,

        setIsRiding: s.setIsRiding,
        isRidingRef: s.isRidingRef,
        isSpectateMode: s.isSpectateMode,
        inlineCategories: s.inlineCategories
    });

    const { spatButtons, setSpatButtons, triggerSpit, triggerSpitManual } = useSpatButtons(messages, containerRef, triggerHaptic);

    const btn = useButtons({
        abilities,
        characterClass,
        characterName,
        target: v.target,
        inlineCategories: s.inlineCategories
    });
    const joystick = useJoystick(triggerHaptic, s.roomExits);
    const editor = useButtonEditor(btn, containerRef);
    const viewport = useViewport(s.uiMode, s.disableSmoothScroll, s.disable3dScroll, s.isImmersionMode, s.fontFamily, s.isTimestampEnabled);

    const practice = usePracticeHandler(s.setAbilities);
    const shop = useShopHandler();
    const help = useHelpHandler();

    const settings = useSettings({
        addMessage, audioCtxRef, initAudio,
        setButtons: btn.setButtons,
        isSoundEnabled, setIsSoundEnabled: s.setIsSoundEnabled,
        abilities, setAbilities: s.setAbilities,
        characterClass, setCharacterClass: s.setCharacterClass,
        actions: s.actions, setActions: s.setActions,
        setSettings: btn.setSettings, setSetSettings: btn.setSetSettings,
        autoConnect: s.autoConnect, setAutoConnect: s.setAutoConnect,
        connectionUrl: s.connectionUrl, setConnectionUrl: s.setConnectionUrl,
        showDebugEchoes: s.showDebugEchoes, setShowDebugEchoes: s.setShowDebugEchoes,
        uiMode: s.uiMode, setUiMode: s.setUiMode,
        disable3dScroll: s.disable3dScroll, setDisable3dScroll: s.setDisable3dScroll,
        disableSmoothScroll: s.disableSmoothScroll, setDisableSmoothScroll: s.setDisableSmoothScroll,
        isImmersionMode: s.isImmersionMode, setIsImmersionMode: s.setIsImmersionMode,
        showRecordingIndicator: s.showRecordingIndicator, setShowRecordingIndicator: s.setShowRecordingIndicator,
        showOrganicTerrain: s.showOrganicTerrain, setShowOrganicTerrain: s.setShowOrganicTerrain,
        inlineCategories: s.inlineCategories, setInlineCategories: s.setInlineCategories,
        isHighlighterEnabled: s.isHighlighterEnabled, setIsHighlighterEnabled: s.setIsHighlighterEnabled,
        isBloomEnabled: s.isBloomEnabled, setIsBloomEnabled: s.setIsBloomEnabled,
        isTimestampEnabled: s.isTimestampEnabled, setIsTimestampEnabled: s.setIsTimestampEnabled,
        autoSaveSessions: s.autoSaveSessions, setAutoSaveSessions: s.setAutoSaveSessions,
        isNewbieMode: s.isNewbieMode, setIsNewbieMode: s.setIsNewbieMode
    });

    const [input, setInput] = useState("");
    const actualTarget = v.target;
    // In spectate mode, merge both sources:
    //   s.groupMembers       – group events delivered via the spectator's own binary GMCP channel
    //                          (MUME sends the snooped player's group data here, so this is the
    //                          primary source for live snooping)
    //   s.spectateGroupMembers – group events parsed from text-leaked snoop lines
    //                          (populated in replay / theater mode and as a fallback)
    // Deduplication by name is handled inside buildHighlighterCandidates.
    const activeGroupMembers = s.isSpectateMode
        ? [...s.groupMembers, ...s.spectateGroupMembers]
        : s.groupMembers;
    const { processMessageHtml } = useMessageHighlighter(actualTarget, btn.buttonsRef, roomPlayers, roomNpcs, s.characterName, roomItems, s.inlineCategories, s.isHighlighterEnabled, highlightVersion, s.discoveredItems, keywordOverrides, s.selectedObjectIds, s.inCombat, s.spectateCharacterName, activeGroupMembers);


    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const deps: any = {
        mapperRef,
        btn,
        addMessage,
        playSound,
        playHitImpactSound,
        playOofSound,
        playSlashSound,
        playCleaveSound,
        playSmiteSound,
        playPierceSound,
        playStabSound,
        playArrowHitSound,
        playKillSound,
        playLevelSound,
        playBashSound,
        loadBashSound,
        playRandomSound,
        playMovementSound,
        playDoorSound,
        triggerHaptic,
        actionsRef: s.actionsRef,
        executeCommandRef: s.executeCommandRef,
        addDiagnosticLog,
        keywordOverrides,
        isSoundEnabledRef: settings.isSoundEnabledRef,
        soundTriggersRef: settings.soundTriggersRef,
        showDebugEchoes: s.showDebugEchoes,
        popoverState: s.popoverState,
        setPopoverState: s.setPopoverState,
        setDiscoveredItems: s.setDiscoveredItems,
        setQuests: s.setQuests,
        quests: s.quests,
        mumeEditState: s.mumeEditState,
        setMumeEditState: s.setMumeEditState,
        shop,
        practice,
        registerEntity: s.registerEntity,
        setEntities: s.setEntities,
        isPlayersOpen: s.ui.drawer === 'players',
        isInventoryOpen: s.ui.drawer === 'inventory',
        isEquipmentOpen: s.ui.drawer === 'equipment',
        isCharacterOpen: s.ui.drawer === 'character',
        isStatsOpen: s.ui.drawer === 'stats',
        triggerXpTicker: v.triggerXpTicker,
        triggerHitFlash: v.triggerHitFlash,
        triggerOppHitFlash: v.triggerOppHitFlash,
        pendingGmcpCommRef,
        lastCommIdBySenderRef: s.userSession.log.lastCommIdBySenderRef,
        lastCommMsgIdRef: s.userSession.log.lastCommMsgIdRef,
        lastCommTimeRef: s.userSession.log.lastCommTimeRef,
        accountState: s.accountState,
        setAccountState: s.setAccountState,
        accountStageRef: s.accountStageRef,
        setGameState: s.setGameState,
        setMessages,
        isSpectateMode: s.isSpectateMode,
        spectateCharacterName: s.spectateCharacterName,
        processMessageHtml,
        sessionMode,
        help,
        setLightningEnabled: s.setLightningEnabled || s.userSession.game.setLightningEnabled,
        setIsPasswordMode: s.setIsPasswordMode,
        spectateQueue: s.spectateQueue,
        setSpectateQueue: s.setSpectateQueue,
        lastSnoopStartTime: s.lastSnoopStartTime,
        setLastSnoopStartTime: s.setLastSnoopStartTime,
        addSystemMessage,
        setGameTime: s.setGameTime,
        gameTime: s.gameTime,
        setIsSpectateMode: s.setIsSpectateMode,
        isMobile: viewport.isMobile,
        entities: s.entities,
        inlineCategories: s.inlineCategories,
        roomName: s.roomName,
        roomNameRef: s.roomNameRef,
        roomDescRef: s.roomDescRef,
        roomPlayers: s.roomPlayers,
        roomNpcs: s.roomNpcs,
        roomItems: s.roomItems,
        setRoomItems: s.setRoomItems,
        setStats: v.setStats,
        setWhoList: s.setWhoList,
        setWhereList: s.setWhereList,
        setDeathRoomId: s.setDeathRoomId,
        groupMembers,
        captureStage,
        isDrawerCapture,
        isSilentCapture,
        isWaitingForStats,
        isWaitingForEq,
        isWaitingForInv,
        isWaitingForInfo,
        captureOwnerDrawer,
        pendingDrawerContainerRef,
        playIncantationSound,
        playCommMessageSound,
        playBuySellSound,
        stopIncantationSound,
        primeSpellSuccess,
        playMagicExplosionSound,
        setSpectateStats: s.setSpectateStats,
        setSpectateHealthStatus: s.setSpectateHealthStatus,
        setSpectateOpponentName: s.setSpectateOpponentName,
        setSpectateOpponentStatus: s.setSpectateOpponentStatus,
        setSpectatePosition: s.setSpectatePosition,
        setSpectateWaiting: s.setSpectateWaiting,
        setSpectateRoomName: s.setSpectateRoomName,
        setSpectateTerrain: s.setSpectateTerrain,
        setSpectateRoomZone: s.setSpectateRoomZone,
        setSpectateLighting: s.setSpectateLighting,
        setSpectateWeather: s.setSpectateWeather,
        setSpectateIsFoggy: s.setSpectateIsFoggy,
        setSpectateInCombat: s.setSpectateInCombat,
        setSpectateCharacterName: s.setSpectateCharacterName,
        setSpectateGroupMembers: s.setSpectateGroupMembers,
        setSpectateRoomDesc: s.setSpectateRoomDesc,
        spectateRoomName: s.spectateRoomName,
        spectateRoomDesc: s.spectateRoomDesc,
        setRoomExits: s.setRoomExits,
        detectLighting: s.detectLighting,
        setWeather: s.setWeather,
        setIsFoggy: s.setIsFoggy,
        setRoomName: s.setRoomName,
        setRoomDesc: s.setRoomDesc,
        setRoomZone: s.setRoomZone,
        setAbilities: s.setAbilities,
        setCharacterClass: s.setCharacterClass,
        setInCombat: s.setInCombat,
        inCombatRef: inCombatHookRef,
    };

    const parser = useGameParser(deps, s.userSession);
    const spectateParser = useGameParser(deps, s.spectateSession);

    const processLine = useCallback((line: string) => {
        // --- Prefix Routing Logic ---
        if (line.startsWith('&')) {
            const match = line.match(/^&([A-Z])\s*(.*)/); // Match &<Letter> [Space] <Content>
            if (match) {
                const content = match[2];
                spectateParser.processLine(content);
                return;
            }
        }
        // Fallback or non-prefixed lines go to User session
        parser.processLine(line);
    }, [parser, spectateParser]);

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
                if (name && s.executeCommandRef.current) {
                    // Send hidden time command when entering the game
                    setTimeout(() => s.executeCommandRef.current?.('time', true, true, true, true), 1500);
                }
                if (name && !s.userSession.recorder.isRecording && s.autoSaveSessions) {
                    console.log(`[Recorder] User Char.Name received. Auto-starting recording: ${name}`);
                    s.userSession.recorder.startRecording(name);
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
            onCoreGoodbye: () => {
                if (s.userSession.recorder.isRecording && s.autoSaveSessions) {
                    console.log('[Recorder] Core.Goodbye received. Saving User session...');
                    s.userSession.recorder.stopAndSave();
                }
                if (s.spectateSession.recorder.isRecording && s.autoSaveSessions) {
                    console.log('[Recorder] Core.Goodbye received. Saving Spectate session...');
                    s.spectateSession.recorder.stopAndSave();
                }
            },
            onDisconnect: () => {
                console.log('[GameContext] Disconnect! Clearing tactical buffers.');
                s.setIsPasswordMode(false);
                if (s.userSession.recorder.isRecording && s.autoSaveSessions) {
                    s.userSession.recorder.stopAndSave();
                }
                if (s.spectateSession.recorder.isRecording && s.autoSaveSessions) {
                    s.spectateSession.recorder.stopAndSave();
                }
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
            onEchoChange: (visible: boolean) => {
                s.setIsPasswordMode(!visible);
            },
            addDiagnosticLog
        }
    });

    // --- Section: Auto-Save on Tab Close ---
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            if (recorder.isRecording) {
                // Browsers often block downloads on unload, but we attempt it here.
                // It works reliably on disconnect/logout which is the primary use case.
                recorder.stopAndSave();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [recorder.isRecording, recorder.stopAndSave]);


    React.useLayoutEffect(() => {
        document.documentElement.style.setProperty('--font-main', fontFamily);
    }, [fontFamily]);

    // --- Replayer Logic ---
    const isPrivacyModeActiveRef = useRef(false);
    const applyPrivacyScrubbing = useCallback((text: string, isPrivacyMode: boolean) => {
        if (!isPrivacyMode) return text;
        
        let scrubbed = text.replace(/\b(Str|Int|Wis|Dex|Con|Wil|Per):\s*(\d+)/gi, (match, label, val) => {
            return `${label}:${'I'.repeat(val.length)}`;
        });
        
        scrubbed = scrubbed.replace(/(\d+)\/(\d+)\s*(hits|hp|mana|sp|moves|mv)/gi, (match, current, max, unit) => {
            return `${'I'.repeat(current.length)}/${'I'.repeat(max.length)} ${unit}`;
        });
        
        scrubbed = scrubbed.replace(/(\d+)(h|m|v)\b/gi, (match, val, unit) => {
            return `${'I'.repeat(val.length)}${unit}`;
        });
        
        return scrubbed;
    }, []);

    const replayerBufferRef = useRef('');
    const replayerProtocolHandlerRef = useRef<ProtocolHandler | null>(null);

    // Replay-side GMCP decoder. Reuses the exact routing logic of the live
    // GmcpDecoder (pkg -> handler + Char.Vitals stats/weather/light extraction +
    // Comm.Channel parsing), so replay fires the same handlers as live play.
    // A handlers-ref indirection (mirroring useTelnet) keeps callbacks fresh
    // across re-renders without re-instantiating the decoder (its charVitalsState
    // must persist across the playback).
    const replayGmcpHandlersRef = useRef<any>(null);
    React.useEffect(() => {
        replayGmcpHandlersRef.current = {
            setStats: v.setStats,
            setWeather: s.setWeather,
            setIsFoggy: s.setIsFoggy,
            setInCombat: (val: boolean, force?: boolean) => s.setInCombat(val, force),
            detectLighting: (light: string) => {
                if (s.isSpectateMode) s.setSpectateLighting(light as any);
                else env.detectLighting?.(light);
            },
            onOpponentChange: (name: string | null) => v.setOpponentName(name),
            onBufferChange: (name: string | null) => v.setBufferName(name),
            onAddPlayer: gmcpHandlers.onAddPlayer,
            onRemovePlayer: gmcpHandlers.onRemovePlayer,
            onRoomItems: gmcpHandlers.onRoomItems,
            onRoomInfo: (data: any) => {
                gmcpHandlers.onRoomInfo(data);
                if (mapperRef.current) mapperRef.current.handleRoomInfo(data);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: { ...data, spectating: true } }));
                }
            },
            onRoomUpdateExits: gmcpHandlers.onRoomUpdateExits,
            onCharVitals: (data: any) => {
                gmcpHandlers.onCharVitals(data);
                if (data?.terrain && mapperRef.current) mapperRef.current.handleTerrain(data.terrain);
                if (data?.terrain && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { detail: data.terrain }));
                }
            },
            onRoomPlayers: gmcpHandlers.onRoomPlayers,
            onRoomNpcs: gmcpHandlers.onRoomNpcs,
            onAddNpc: gmcpHandlers.onAddNpc,
            onRemoveNpc: gmcpHandlers.onRemoveNpc,
            onCharNameChange: gmcpHandlers.onCharNameChange,
            onCharInfo: gmcpHandlers.onCharInfo,
            onPositionChange: gmcpHandlers.onPositionChange,
            // Mirror live behavior: stash GMCP comm metadata for the text-line
            // parser to attach to the upcoming plain-text message.
            onComm: (sender: string, chan: string, msg: string) => {
                pendingGmcpCommRef.current = { sender, chan, msg };
                gmcpHandlers.onComm?.(sender, chan, msg);
            },
            onGroupAdd: gmcpHandlers.onGroupAdd,
            onGroupUpdate: gmcpHandlers.onGroupUpdate,
            onGroupRemove: gmcpHandlers.onGroupRemove,
            onGroupSet: gmcpHandlers.onGroupSet,
            onMumeEdit: gmcpHandlers.onMumeEdit,
            onDisconnect: gmcpHandlers.onDisconnect,
            onRoomCharsCombat: gmcpHandlers.onRoomCharsCombat,
            onCharRide: gmcpHandlers.onCharRide,
            onCorePing: () => {},
            onCoreGoodbye: () => {}
        };
    });

    const replayGmcpDecoderRef = useRef<GmcpDecoder | null>(null);
    if (!replayGmcpDecoderRef.current) {
        const proxy = (k: string) => (...args: any[]) => replayGmcpHandlersRef.current?.[k]?.(...args);
        replayGmcpDecoderRef.current = new GmcpDecoder({
            setStats: proxy('setStats') as any,
            setWeather: proxy('setWeather') as any,
            setIsFoggy: proxy('setIsFoggy') as any,
            setInCombat: proxy('setInCombat') as any,
            detectLighting: proxy('detectLighting') as any,
            onOpponentChange: proxy('onOpponentChange'),
            onBufferChange: proxy('onBufferChange'),
            onAddPlayer: proxy('onAddPlayer'),
            onRemovePlayer: proxy('onRemovePlayer'),
            onRoomItems: proxy('onRoomItems'),
            onRoomInfo: proxy('onRoomInfo'),
            onRoomUpdateExits: proxy('onRoomUpdateExits'),
            onCharVitals: proxy('onCharVitals'),
            onRoomPlayers: proxy('onRoomPlayers'),
            onRoomNpcs: proxy('onRoomNpcs'),
            onAddNpc: proxy('onAddNpc'),
            onRemoveNpc: proxy('onRemoveNpc'),
            onCharNameChange: proxy('onCharNameChange'),
            onCharInfo: proxy('onCharInfo'),
            onPositionChange: proxy('onPositionChange'),
            onComm: proxy('onComm'),
            onGroupAdd: proxy('onGroupAdd'),
            onGroupUpdate: proxy('onGroupUpdate'),
            onGroupRemove: proxy('onGroupRemove'),
            onGroupSet: proxy('onGroupSet'),
            onMumeEdit: proxy('onMumeEdit'),
            onDisconnect: proxy('onDisconnect'),
            onRoomCharsCombat: proxy('onRoomCharsCombat'),
            onCharRide: proxy('onCharRide'),
            onCorePing: proxy('onCorePing'),
            onCoreGoodbye: proxy('onCoreGoodbye')
        });
    }

    if (!replayerProtocolHandlerRef.current) {
        replayerProtocolHandlerRef.current = new ProtocolHandler({
            sendBytes: () => {},
            sendGMCP: () => {},
            addMessage: (type, text, ...args) => {
                addMessage(type as any, text, ...args);
            },
            // GMCP subnegotiation is intentionally ignored here. Recordings
            // include both raw rx bytes (which pass through this protocol
            // handler) and separate 'gmcp' entries. The gmcp-entry path below
            // feeds replayGmcpDecoder, so dispatching here too would double-fire
            // every handler (duplicate comm bubbles, stats updates, etc.).
            handleSubnegotiation: () => {},
            processText: (text) => {
                const scrubbed = applyPrivacyScrubbing(text, isPrivacyModeActiveRef.current);
                replayerBufferRef.current += scrubbed;
                const lines = replayerBufferRef.current.split('\n');
                replayerBufferRef.current = lines.pop() || '';
                for (let i = 0; i < lines.length; i++) {
                    parser.processLine(lines[i]);
                }
                
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

    const replayer = useSessionReplayer(useCallback((type, payload, isPrivacyMode, isSilent = false) => {
        isPrivacyModeActiveRef.current = isPrivacyMode;
        isSilentReplayRef.current = isSilent;
        sessionModeRef.current = sessionMode;
        replayerRef.current = replayer;
        
        if (isSilent) {
            if (type === 'gmcp') {
                const { pkg, data } = payload;
                // Recorded as { pkg, data: jsonString } (useTelnet.ts); older
                // logs or non-replay callers may already pass a parsed object.
                const dataObj = typeof data === 'string' ? (data ? JSON.parse(data) : null) : data;
                setReplayHUDState(prev => {
                    const next = { ...prev };
                    if (pkg === 'Room.Info' && dataObj) {
                        next.roomName = dataObj.name || '';
                        next.roomDesc = dataObj.desc || '';
                        next.roomTerrain = dataObj.terrain || dataObj.environment || '';
                        next.roomZone = dataObj.zone || dataObj.area || '';

                        if (mapperRef.current) {
                            mapperRef.current.handleRoomInfo(dataObj);
                        }
                    } else if (pkg === 'Char.Vitals' && dataObj) {
                        if (dataObj.hp !== undefined) next.hp = dataObj.hp;
                        if (dataObj.maxhp !== undefined) next.maxHp = dataObj.maxhp;
                        if (dataObj.mana !== undefined) next.mana = dataObj.mana;
                        if (dataObj.maxmana !== undefined) next.maxMana = dataObj.maxmana;
                        if (dataObj.move !== undefined) next.move = dataObj.move;
                        if (dataObj.maxmove !== undefined) next.maxMove = dataObj.maxmove;
                        if (dataObj.opponent !== undefined) {
                            next.opponentName = dataObj.opponent ? 'Opponent' : null;
                        }

                        if (dataObj.terrain && mapperRef.current) {
                            mapperRef.current.handleTerrain(dataObj.terrain);
                        }
                    }
                    return next;
                });
            }
            return;
        }

        if (type === 'rx') {
            replayerProtocolHandlerRef.current?.handleRawData(new Uint8Array(payload));
        } else if (type === 'gmcp') {
            const { pkg, data } = payload;
            const jsonStr = typeof data === 'string' ? data : (data != null ? JSON.stringify(data) : '');
            const dataObj = typeof data === 'string' ? (data ? JSON.parse(data) : null) : data;

            setReplayHUDState(prev => {
                const next = { ...prev };
                if (pkg === 'Room.Info' && dataObj) {
                    next.roomName = dataObj.name || '';
                    next.roomDesc = dataObj.desc || '';
                    next.roomTerrain = dataObj.terrain || dataObj.environment || '';
                    next.roomZone = dataObj.zone || dataObj.area || '';
                } else if (pkg === 'Char.Vitals' && dataObj) {
                    if (dataObj.hp !== undefined) next.hp = dataObj.hp;
                    if (dataObj.maxhp !== undefined) next.maxHp = dataObj.maxhp;
                    if (dataObj.hp_status) next.opponentHealth = dataObj.hp_status;
                }
                return next;
            });

            // Route through the same GmcpDecoder used in live play so every
            // dependent system (lighting, weather, zone music, comm bubbles,
            // combat state, groups, etc.) fires exactly as it did during recording.
            replayGmcpDecoderRef.current?.decode(pkg, jsonStr);
        } else if (type === 'tx') {
            addMessage('user', applyPrivacyScrubbing(payload, isPrivacyMode), false);
        }
    }, [gmcpHandlers, parser, addMessage, flushMessages, applyPrivacyScrubbing]));

    const theaterReplayer = useMemo(() => ({
        ...replayer,
        loadLog: (log: import('../hooks/useSessionRecorder').SessionLog) => {
            console.log('[Replayer] Loading log and entering Theater Mode');
            setSessionMode('replay');
            setMessages([]); 
            replayer.loadLog(log);
        },
        clearLog: () => {
            console.log('[Replayer] Clearing log and exiting Theater Mode');
            setSessionMode('live');
            replayer.clearLog();
        },
        setIsVisible: (visible: boolean) => {
            if (!visible) setSessionMode('live');
            replayer.setIsVisible(visible);
        }
    }), [replayer, setMessages, setSessionMode]);

    const controllerDeps = React.useMemo(() => ({
        telnet,
        addMessage,
        initAudio,
        navIntervalRef,
        mapperRef,
        teleportTargets,
        help,
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
        isNewbieMode: s.isNewbieMode,
        status: s.status,
        target: v.target,
        setTarget: v.setTarget,
        setPendingMove: v.setPendingMove,
        activePrompt: v.activePrompt?.text ?? '',
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
        gameState: s.gameState,
        isPasswordMode: s.isPasswordMode,
        sessionMode,
        replayer,
        accountState: s.accountState,
        setAccountState: s.setAccountState,
        accountStageRef: s.accountStageRef,
        clearLog
    }), [
        telnet, addMessage, initAudio, mapperRef, teleportTargets, s.isDrawerCapture, s.isSilentCapture, s.captureStage,
        s.isWaitingForStats, s.isWaitingForEq, s.isWaitingForInv, s.isWaitingForInfo, s.setInventoryLines, s.setStatsLines, s.setEqLines,
        input, setInput, s.isNewbieMode, s.status, v.target, v.setTarget, v.setPendingMove, parser.finalizeCapture, s.popoverState,
        s.setPopoverState, s.setIsCharacterOpen, s.setIsStatsOpen, s.setIsEquipmentOpen, s.setIsInventoryOpen,
        s.setIsPlayersOpen, setIsSettingsOpen, setSettingsTab, s.setIsMapExpanded, s.setUI, viewport, triggerHaptic,
        btn, joystick, editor.wasDraggingRef, s.ui, s.actions, s.setActions, s.setActiveDragData, s.activeDragData,
        practice, v.heldButton, v.setHeldButton, s.parley, s.setParley, s.isTrackpadModifierActive, shop,
        keywordOverrides, openKeywordEdit, lastCommandContextRef, s.entities, s.applyOptimisticChange,
        s.selectedObjectIds, s.toggleObjectSelection, s.clearObjectSelection, playClickSound, s.isSoundEnabled,
        v.stats.conditions?.waiting, sanitizedRecordEntry, v.activePrompt, clearLog, s.gameState,
        sessionMode, theaterReplayer, s.accountState, s.setAccountState, s.accountStageRef,
        clearLog
    ]);

    const controller = useCommandController(controllerDeps);
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
    React.useEffect(() => {
        if (s.executeCommandRef) s.executeCommandRef.current = executeCommand;
    }, [executeCommand, s.executeCommandRef]);

    const { prepareLoginAttempt } = useSessionManager({
        status: s.status,
        activePrompt: v.activePrompt?.text ?? '',
        loginName: settings.loginName,
        loginPassword: settings.loginPassword,
        addSystemMessage,
        telnetSendCommand: telnet.sendCommand,
        telnetConnect: telnet.connect,
        characterName: s.characterName,
        executeCommand,
        autoConnect: s.autoConnect,
        groupMembers: s.groupMembers,
        spatButtons,
        triggerSpitManual,
        gameState: s.gameState,
        accountStage: s.accountState.stage,
        isPasswordMode: s.isPasswordMode
    });

    // --- Section: Terminal Synchronization ---
    const lastSyncRef = useRef({ cols: 0, rows: 0 });
    React.useEffect(() => {
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
    React.useEffect(() => {
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
        isLibraryOpen, setIsLibraryOpen,
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
        showRecordingIndicator: s.showRecordingIndicator,
        setShowRecordingIndicator: s.setShowRecordingIndicator,
        startRecording: recorder.startRecording,
        stopRecording: recorder.stopRecording,
        stopAndSave: recorder.stopAndSave,
        saveLog: recorder.saveLog,
        replayer: theaterReplayer
    }), [
        s.ui, s.popoverState, s.setPopoverState, isSettingsOpen, isLibraryOpen, settingsTab,
        s.setIsCharacterOpen, s.setIsEquipmentOpen, s.setIsInventoryOpen, s.setIsMapExpanded, s.setIsSetManagerOpen, s.setUI, s.setIsPlayersOpen,
        s.handleTabClick, s.toggleMap, s.showRecordingIndicator, s.setShowRecordingIndicator,
        recorder.isRecording, recorder.duration, recorder.startRecording, recorder.stopRecording, recorder.stopAndSave, recorder.saveLog,
        theaterReplayer
    ]);

    const gameValue = useMemo(() => {
        const isReplaying = sessionMode === 'replay';
        const base = { ...s };
        
        if (isReplaying) {
            base.roomName = replayHUDState.roomName || 'Archive View';
            base.roomDesc = replayHUDState.roomDesc;
            base.currentTerrain = replayHUDState.roomTerrain;
            base.roomZone = replayHUDState.roomZone;
        } else if (isSpectateMode && spectateTarget) {
            base.roomName = spectateTarget.room || s.roomName;
            base.characterName = spectateTarget.name || s.characterName;
            const isTargetFighting = spectateTarget.fighting || spectateTarget.position?.toLowerCase() === 'fighting';
            base.inCombat = isTargetFighting ?? false;
        }

        return {
            ...base,
            sessionMode, setSessionMode,
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
            playSound, 
            playRandomSound, 
            playDoorSound, 
            setPlaySound, triggerHaptic, 
            setTriggerHaptic, playClickSound, playCommMessageSound, stopCommMessageSound, primeSpellSuccess,

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
            mapperRef, ...settings, audioCtxRef,
            telnet, parser, practice, help,
            spatButtons, setSpatButtons,
            gameState: s.gameState, setGameState: s.setGameState, prepareLoginAttempt,
            diagnosticLogs, addDiagnosticLog,
            refreshLogHighlights,
            addMessage, addSystemMessage,
            isMendingMode: v.isMendingMode, setIsMendingMode: v.setIsMendingMode,
            mendingTarget: v.mendingTarget, setMendingTarget: v.setMendingTarget,
            heldButton: v.heldButton, setHeldButton: v.setHeldButton,
            accountState: s.accountState, setAccountState: s.setAccountState,
            keywordOverrides, openKeywordEdit,
            keywordEditState, setKeywordEditState,
            setKeywordOverride, removeOverride: removeKeywordOverride,
            keywordFailureBanner, setKeywordFailureBanner,
            detectLighting: env.detectLighting,
            setDetectLighting: (fn: (text: string) => void) => { /* internal use */ },
            isRecording: recorder.isRecording,
            duration: recorder.duration,
            startRecording: recorder.startRecording,
            stopRecording: recorder.stopRecording,
            stopAndSave: recorder.stopAndSave,
            saveLog: recorder.saveLog,
            recordEntry: recorder.recordEntry,
            spectateQueue: s.spectateQueue,
            setSpectateQueue: s.setSpectateQueue,
            lastSnoopStartTime: s.lastSnoopStartTime,
            setLastSnoopStartTime: s.setLastSnoopStartTime,
            parley: s.parley,
            setParley: s.setParley,
            selectedObjectIds: s.selectedObjectIds,
            toggleObjectSelection: s.toggleObjectSelection,
            clearObjectSelection: s.clearObjectSelection,
            isSpectateMode,
            spectateCharacterName: s.spectateCharacterName || base.characterName,
            setSpectateCharacterName: s.setSpectateCharacterName,
            addToQueue: parser.addToQueue,
            rotateQueue: parser.rotateQueue,
            removeFromQueue: parser.removeFromQueue,
        };
    }, [
        s, sessionMode, replayHUDState, isSpectateMode, spectateTarget, accentColor, teleportTargets,
        roomInfoFn, roomExitsFn, charVitalsFn, roomPlayersFn, roomNpcsFn, roomItemsFn,
        addPlayerFn, addNpcFn, removePlayerFn, removeNpcFn, opponentChangeFn,
        playSound, triggerHaptic, playCommMessageSound, stopCommMessageSound,
        btn, joystick, editor, viewport, env, v,
        input, handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick,
        handleDragStart, handleDragEnd,
        settings, audioCtxRef, telnet, parser, spatButtons, diagnosticLogs, addDiagnosticLog,
        handleLogPointerDown, handleLogPointerUp,
        handleSaveMumeEdit, s.setQuests, addMessage, addSystemMessage,
        s.spectateCharacterName, s.setSpectateCharacterName, s.spectateQueue, s.lastSnoopStartTime,
        s.gameState, s.setGameState, prepareLoginAttempt, theaterReplayer,
        parser.addToQueue, parser.rotateQueue, parser.removeFromQueue
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
    React.useEffect(() => {
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
        const isReplaying = sessionMode === 'replay' || sessionMode === 'scrubbing';
        
        if (isReplaying) {
            return {
                ...v,
                stats: {
                    ...v.stats,
                    hp: replayHUDState.hp,
                    maxHp: replayHUDState.maxHp,
                    mana: replayHUDState.mana,
                    maxMana: replayHUDState.maxMana,
                    move: replayHUDState.move,
                    maxMove: replayHUDState.maxMove,
                },
                opponentName: replayHUDState.opponentName,
                opponentHealthStatus: replayHUDState.opponentHealth,
                roomName: replayHUDState.roomName
            };
        }
        
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
    }, [v, sessionMode, replayHUDState, s.isSpectateMode, s.spectateStats, s.spectateHealthStatus, s.spectateOpponentName, s.spectateOpponentStatus, s.spectateCharacterName, s.spectateRoomName]);

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
