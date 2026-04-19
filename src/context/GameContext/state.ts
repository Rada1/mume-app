import React, { useState, useRef, useCallback, useMemo } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { 
    GameStats, LightingType, WeatherType, DrawerLine, GameAction, 
    ParleyState, PopoverState, CombatHealthStatus, QuestData, 
    GroupMember, OptimisticChange, SessionSlot 
} from '../../types';
import MASTER_SETTINGS from '../../constants/mastersettings.json';
import { extractNoun, extractColorTaggedKeyword, sanitizeGameTarget } from '../../utils/gameUtils';
import { useSettingsState } from './useSettingsState';
import { useUIState } from './useUIState';
import { useEntityRegistry } from '../../hooks/useEntityRegistry';
import { useSessionState } from './useSessionState';

export const useGameProviderState = () => {
    // Settings & Mode
    const settings = useSettingsState();
    const {
        isNewbieMode, isSoundEnabled, setIsSoundEnabled, isMmapperMode, setIsMmapperMode, theme, setTheme, showControls, setShowControls, autoConnect, setAutoConnect,
        showDebugEchoes, setShowDebugEchoes, uiMode, setUiMode, disable3dScroll, setDisable3dScroll, disableSmoothScroll, setDisableSmoothScroll, isImmersionMode, setIsImmersionMode, showOrganicTerrain, setShowOrganicTerrain, inlineCategories, setInlineCategories, isHighlighterEnabled, setIsHighlighterEnabled,
        isBloomEnabled, setIsBloomEnabled, isTimestampEnabled, setIsTimestampEnabled, favorites, setFavorites, zoneMusic, setZoneMusic,
        fontFamily, setFontFamily,
        connectionUrl, setConnectionUrl,
        showRecordingIndicator, setShowRecordingIndicator,
        autoSaveSessions, setAutoSaveSessions
    } = settings;

    // Registry

    // --- Global App State ---
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [gameState, setGameState] = useState<import('../../types').GameState>('disconnected');
    const [characterName, setCharacterName] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState<SessionSlot>('user');
    const [isPasswordMode, setIsPasswordMode] = useState(false);
    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
    const [parley, setParley] = useState<ParleyState>({ active: false, command: 'tell', target: null });
    const [mumeEditState, setMumeEditState] = useState<{ isOpen: boolean; title: string; text: string; key: string }>({
        isOpen: false, title: '', text: '', key: ''
    });
    const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
    const toggleObjectSelection = useCallback((id: string, setId?: string, context?: string) => {
        setSelectedObjectIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);
    const clearObjectSelection = useCallback(() => setSelectedObjectIds(new Set()), []);

    const [draggedTarget, setDraggedTarget] = useState<{ name: string; type: string; x: number; y: number } | null>(null);
    const [activeDragData, setActiveDragData] = useState<unknown>(null);

    const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
    const [accountState, setAccountState] = useState<import('../../types').AccountState>({
        stage: 'none', characters: [], selectedCharacter: null
    });
    const accountStageRef = useRef<import('../../types').AccountStage>('none');
    React.useEffect(() => { accountStageRef.current = accountState.stage; }, [accountState.stage]);

    // --- Global Refs ---
    const roomDescRef = useRef<string | null>(null);
    const isAccountModeRef = useRef(false);
    React.useEffect(() => { isAccountModeRef.current = gameState === 'account'; }, [gameState]);

    // --- Session Slots ---
    const userSession = useSessionState(characterName, isNewbieMode, gameState, roomDescRef, isAccountModeRef);
    const spectateSession = useSessionState(characterName, isNewbieMode, gameState, roomDescRef, isAccountModeRef);

    const active = activeSession === 'user' ? userSession : spectateSession;

    // --- UI State ---
    const executeCommandRef = useRef<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>(() => { });
    const ui = useUIState(executeCommandRef, {
        stats: active.game.statsLines.length + active.game.scoreLines.length,
        info: active.game.infoLines.length + active.game.practiceLines.length + active.game.questLines.length,
        inventory: active.game.inventoryLines.length + active.game.eqLines.length,
        players: active.game.whoLines.length + active.game.whereLines.length
    });

    // --- Parser Engine (Aliased to active session) ---
    const vitals = active.vitals;
    const game = {
        ...active.game,
        ...settings,
        ...active.game.registry,
        ...ui,
        status, setStatus,
        gameState, setGameState,
        activeSession, setActiveSession,
        userSession, spectateSession,

        // Explicit Spectate Values
        spectateRoomName: spectateSession.game.roomName,
        spectateRoomDesc: spectateSession.game.roomDesc,
        spectateInCombat: spectateSession.game.inCombat,
        spectateRoomZone: spectateSession.game.roomZone,
        spectateTerrain: spectateSession.game.currentTerrain,
        spectateLighting: spectateSession.game.lighting,
        spectateWeather: spectateSession.game.weather,
        spectateIsFoggy: spectateSession.game.isFoggy,
        spectateGroupMembers: spectateSession.vitals.groupMembers,
        spectateCharacterName: spectateSession.game.characterName,

        // Explicit Spectate Mapping
        setSpectateStats: spectateSession.vitals.setStats,
        setSpectateHealthStatus: spectateSession.vitals.setPlayerHealthStatus,
        setSpectateOpponentName: spectateSession.vitals.setOpponentName,
        setSpectateOpponentStatus: spectateSession.vitals.setOpponentHealthStatus,
        setSpectatePosition: spectateSession.game.setPlayerPosition,
        setSpectateWaiting: (waiting: boolean) => spectateSession.vitals.setStats(prev => ({ 
            ...prev, 
            conditions: { ...prev.conditions, waiting } 
        })),
        setSpectateRoomName: spectateSession.game.setRoomName,
        setSpectateTerrain: spectateSession.game.setCurrentTerrain,
        setSpectateRoomZone: spectateSession.game.setRoomZone,
        setSpectateLighting: spectateSession.game.setLighting,
        setSpectateWeather: spectateSession.game.setWeather,
        setSpectateIsFoggy: spectateSession.game.setIsFoggy,
        setSpectateInCombat: spectateSession.game.setInCombat,
        setSpectateCharacterName: spectateSession.game.setCharacterName,
        setSpectateGroupMembers: spectateSession.vitals.setGroupMembers,
        setSpectateRoomDesc: spectateSession.game.setRoomDesc,

        isPasswordMode, setIsPasswordMode,
        popoverState, setPopoverState,
        parley, setParley,
        mumeEditState, setMumeEditState,
        selectedObjectIds, toggleObjectSelection, clearObjectSelection,
        draggedTarget, setDraggedTarget,
        activeDragData, setActiveDragData,
        diagnosticLogs, addDiagnosticLog: (msg: string) => setDiagnosticLogs(p => [msg, ...p].slice(0, 50)),
        accountState, setAccountState, accountStageRef,
        executeCommandRef,
        roomDescRef,
        isAccountModeRef
    } as any;

    return { vitals, game };
};
