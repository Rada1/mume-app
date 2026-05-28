/**
 * @file state.ts
 * @description Initializes and composes the global game provider state.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    GameStats, LightingType, WeatherType, DrawerLine, GameAction,
    ParleyState, PopoverState, CombatHealthStatus, QuestData,
    GroupMember, OptimisticChange, SessionSlot
} from '../../types';
import { extractNoun, extractColorTaggedKeyword, sanitizeGameTarget } from '../../utils/gameUtils';
import { useEntityRegistry } from '../../hooks/useEntityRegistry';
import { useSessionState } from './useSessionState';
import { useUIStore } from '../../stores/useUIStore';
import { useInputStore } from '../../stores/useInputStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useModeStore } from '../../stores/useModeStore';
import { useSpectateLiveVitalsStore } from '../../stores/spectate/useSpectateLiveVitalsStore';
import { useSpectateLiveRoomStore } from '../../stores/spectate/useSpectateLiveRoomStore';
import { useSpectateLiveCombatStore } from '../../stores/spectate/useSpectateLiveCombatStore';

export const useGameProviderState = (audioTriggers?: {
    playCommMessageSound: () => void;
    playCombatHitSound: () => void;
    playLevelUpSound: () => void;
}) => {
    // Settings & UI Stores
    const settings = useSettingsStore();
    const uiStore = useUIStore();
    const mode = useModeStore();

    const {
        isNewbieMode, isSoundEnabled, setIsSoundEnabled, theme, setTheme, autoConnect, setAutoConnect,
        showDebugEchoes, setShowDebugEchoes, uiMode, setUiMode, disableSmoothScroll, setDisableSmoothScroll, isHighlighterEnabled, setIsHighlighterEnabled,
        isBloomEnabled, setIsBloomEnabled, isTimestampEnabled, setIsTimestampEnabled,
        isTextRevealEnabled, setIsTextRevealEnabled,
        fontFamily, setFontFamily,
        connectionUrl, setConnectionUrl,
    } = settings;

    // Registry

    // --- Global App State ---
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [gameState, setGameState] = useState<import('../../types').GameState>('account');
    const [characterName, setCharacterName] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState<SessionSlot>('user');
    const [isPasswordMode, setIsPasswordMode] = useState(false);
    const popoverState = uiStore.popoverState;
    const setPopoverState = uiStore.setPopoverState;
    const [parley, setParley] = useState<ParleyState>({ active: false, mode: 'command', command: 'tell', target: null, message: '' });
    const [mumeEditState, setMumeEditState] = [uiStore.mumeEditState, uiStore.setMumeEditState] as const;

    const setInput = useInputStore(s => s.setInput);
    const [commandPreview, setCommandPreview] = useState<string | null>(null);

    const [accountState, setAccountState] = useState<import('../../types').AccountState>({
        stage: 'login',
        characters: [],
        selectedCharacter: null,
        currentPrompt: 'By what name do you wish to be known?'
    });
    const accountStageRef = useRef<import('../../types').AccountStage>('login');
    React.useEffect(() => { accountStageRef.current = accountState.stage; }, [accountState.stage]);

    // --- Activity State ---
    const [messageActivity, setMessageActivity] = useState(0);
    const activityRef = useRef(0);

    // Activity Decay Loop
    React.useEffect(() => {
        const interval = setInterval(() => {
            if (activityRef.current > 0) {
                activityRef.current = Math.max(0, activityRef.current - 0.05);
                setMessageActivity(activityRef.current);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const bumpActivity = useCallback(() => {
        activityRef.current = Math.min(1, activityRef.current + 0.2);
        setMessageActivity(activityRef.current);
    }, []);

    // --- Global Refs ---
    const roomDescRef = useRef<string | null>(null);
    const isAccountModeRef = useRef(true);
    React.useEffect(() => { isAccountModeRef.current = gameState === 'account'; }, [gameState]);

    // --- Session Slots ---
    const spectateAudioTriggers = useMemo(() => audioTriggers ? {
        ...audioTriggers,
        playCommMessageSound: () => {
            if (mode.activeView === 'target') {
                audioTriggers.playCommMessageSound();
            }
        }
    } : undefined, [audioTriggers, mode.activeView]);

    const userSession = useSessionState(characterName, isNewbieMode, gameState, roomDescRef, isAccountModeRef, false, audioTriggers);
    const spectateSession = useSessionState(characterName, isNewbieMode, gameState, roomDescRef, isAccountModeRef, true, spectateAudioTriggers);
    const spectateLiveVitals = useSpectateLiveVitalsStore();
    const spectateLiveRoom = useSpectateLiveRoomStore();
    const spectateLiveCombat = useSpectateLiveCombatStore();

    const active = mode.isSpectating && mode.activeView === 'target' ? spectateSession : userSession;

    // --- UI State ---
    const executeCommandRef = useRef<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>(() => { });
    const ui = {
        ...uiStore,
        stats: active.game.statsLines.length + active.game.scoreLines.length,
        info: active.game.infoLines.length + active.game.practiceLines.length + active.game.questLines.length + active.game.achievementLines.length,
        inventory: active.game.inventoryLines.length + active.game.eqLines.length,
        players: active.game.whoLines.length + active.game.whereLines.length
    };

    // --- Parser Engine (Aliased to active session) ---
    const vitals = {
        ...active.vitals,
        stats: {
            hp: active.vitals.stats?.hp || 0,
            maxHp: active.vitals.stats?.maxHp || 0,
            mana: active.vitals.stats?.mana || 0,
            maxMana: active.vitals.stats?.maxMana || 0,
            move: active.vitals.stats?.move || 0,
            maxMove: active.vitals.stats?.maxMove || 0,
            wimpy: active.vitals.stats?.wimpy || 0,
            ob: active.vitals.stats?.ob,
            db: active.vitals.stats?.db,
            pb: active.vitals.stats?.pb,
            armour: active.vitals.stats?.armour,
            conditions: active.vitals.stats?.conditions || {}
        }
    } as any;

    const game = {
        ...active.game,
        ...settings,
        ...active.game.registry,
        ...ui,
        ui, // Keep nested ui for compatibility
        stats: (vitals as any).stats, // Keep stats in game object too
        status, setStatus,
        gameState, setGameState,
        activeSession, setActiveSession,
        userSession, spectateSession,
        active,

        // Explicit Spectate Values
        spectateRoomName: spectateSession.game.roomName,
        spectateRoomDesc: spectateSession.game.roomDesc,
        spectateRoomNum: spectateSession.game.roomNum,
        spectateInCombat: spectateSession.game.inCombat,
        spectateRoomZone: spectateSession.game.roomZone,
        spectateTerrain: spectateSession.game.currentTerrain,
        spectateLighting: spectateSession.game.lighting,
        spectateWeather: spectateSession.game.weather,
        spectateIsFoggy: spectateSession.game.isFoggy,
        spectateGroupMembers: spectateSession.vitals.groupMembers,
        spectateCharacterName: spectateSession.game.characterName,

        // Explicit Spectate Mapping
        setSpectateStats: spectateLiveVitals.setStats,
        setSpectateWaiting: (waiting: boolean) => spectateLiveVitals.setStats(prev => ({
            ...prev,
            conditions: { ...prev.conditions, waiting }
        })),
        setSpectateCharacterName: (name: string | null) => {
            spectateLiveVitals.setCharacterName(name);
            spectateSession.game.setCharacterName(name);
        },
        setSpectatePosition: spectateLiveVitals.setPosition,
        setSpectateInCombat: spectateLiveVitals.setInCombat,
        setSpectateOpponentName: spectateLiveCombat.setOpponentName,
        setSpectateOpponentStatus: spectateLiveCombat.setOpponentHealthStatus,
        setSpectateRoomNum: (num: number | null) => spectateLiveRoom.setRoomInfo({ roomNum: num ?? 0 }),
        setSpectateRoomName: spectateLiveRoom.setRoomName,
        setSpectateRoomDesc: spectateLiveRoom.setRoomDesc,
        setSpectateRoomZone: spectateLiveRoom.setRoomZone,
        setSpectateActivePrompt: spectateLiveVitals.setActivePrompt,
        setSpectateWeather: spectateLiveVitals.setWeather,
        setSpectateIsFoggy: spectateLiveVitals.setIsFoggy,
        setStats: active.vitals.setStats,
        isSpectateMode: mode.isSpectating,

        isPasswordMode, setIsPasswordMode,
        popoverState, setPopoverState,
        parley, setParley,
        mumeEditState, setMumeEditState,
        selectedObjectIds: active.log.selectedObjectIds,
        toggleObjectSelection: active.log.toggleObjectSelection,
        clearObjectSelection: active.log.clearObjectSelection,
        setInput,
        commandPreview, setCommandPreview,
        diagnosticLogs: uiStore.diagnosticLogs,
        addDiagnosticLog: uiStore.addDiagnosticLog,
        accountState, setAccountState, accountStageRef,
        executeCommandRef,
        roomDescRef,
        isAccountModeRef,
        displayInventoryLines: active.game.inventoryLines,
        displayEqLines: active.game.eqLines,
        spectateQueue: mode.spectateQueue,
        setSpectateQueue: mode.setSpectateQueue,
        lastSnoopStartTime: mode.lastSnoopStartTime,
        setLastSnoopStartTime: mode.setLastSnoopStartTime,
        messageActivity,
        bumpActivity
    } as any;

    return { vitals, game };
};
