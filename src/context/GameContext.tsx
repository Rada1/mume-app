import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useMemo } from 'react';
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
import { MapperRef } from '../components/Mapper/mapperTypes';

import { GameContextType, VitalsContextType, LogContextType, UIContextType } from './GameContext/types';
import { useGmcpHandlers } from '../hooks/useGmcpHandlers/index';
import { useShopHandler } from '../hooks/useShopHandler';
import { useGameProviderState } from './GameContext/state';
import { useKeywordOverrides } from '../hooks/useKeywordOverrides';
import { useSessionManager } from '../hooks/useSessionManager';
import { useAmbientController, useAudioEffects } from '../hooks/useAudioSystem';
import { useSessionRecorder } from '../hooks/useSessionRecorder';
import { useSessionReplayer } from '../hooks/useSessionReplayer';
import { useHelpHandler } from '../hooks/useHelpHandler';
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
    const audioEffects = useAudioEffects();
    const {
        audioCtxRef, initAudio, playMovementSound, playDoorSound, playClickSound,
        playHitImpactSound, playOofSound, playSlashSound, playCleaveSound,
        playSmiteSound, playPierceSound, playStabSound, playArrowHitSound,
        playBuySellSound, playBashSound, playKillSound, playLevelSound,
        playIncantationSound, stopIncantationSound, playMagicExplosionSound,
        playCommMessageSound, triggerHaptic, playEffect, primeSpellSuccess,
        playSound, playRandomSound
    } = audioEffects;

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
    const activeLog = s.activeSession === 'user' ? s.userSession.log : s.spectateSession.log;
    const { messages, setMessages, addMessage, addSystemMessage, flushMessages, clearLog } = activeLog;
    
    const replayer = useSessionReplayer(useCallback((type, payload, isPrivacyMode, isSilent = false) => {
        // ... replayer implementation details ...
    }, []));

    // 5. Networking
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
        bufferName: v.bufferName, roomPlayers: s.roomPlayers, roomNpcs: s.roomNpcs, setGroupMembers: s.setGroupMembers,
        setMumeEditState: s.setMumeEditState, setWhoList: s.setWhoList, setWhereList: s.setWhereList,
        opponentId: s.isSpectateMode ? v.spectateOpponentId : v.opponentId, setOpponentId: s.isSpectateMode ? v.setOpponentId : v.setOpponentId,
        detectLighting: (light) => { if (s.isSpectateMode) s.setSpectateLighting(light as any); else env.detectLighting?.(light); },
        playMovementSound, playDoorSound, setWeather: s.setWeather, setIsFoggy: s.setIsFoggy, setStats: s.isSpectateMode ? s.setSpectateStats : s.setStats,
        playerPositionRef: s.playerPositionRef, setIsRiding: s.setIsRiding, isRidingRef: s.isRidingRef, isSpectateMode: s.isSpectateMode, inlineCategories: s.inlineCategories
    });

    const telnet = useTelnet({
        connectionUrl: settingsStore.connectionUrl,
        processLine: (line) => {}, // Placeholder
        recordEntry: () => {},
        setPrompt: v.setActivePrompt,
        onCharNameChange: gmcpHandlers.onCharNameChange,
        onPositionChange: gmcpHandlers.onPositionChange,
        handlers: { addDiagnosticLog: ui.addDiagnosticLog } as any
    });

    // 6. Final Controller & Parser
    const { spatButtons, setSpatButtons, triggerSpitManual } = useSpatButtons(messages, useRef<HTMLDivElement>(null), triggerHaptic);
    const btn = useButtons({ abilities: s.abilities, characterClass: s.characterClass, characterName: s.characterName, target: v.target, inlineCategories: s.inlineCategories });
    const { processMessageHtml } = useMessageHighlighter(v.target, btn.buttonsRef, s.roomPlayers, s.roomNpcs, s.characterName, s.roomItems, s.inlineCategories, s.isHighlighterEnabled, highlightVersion, s.discoveredItems, {}, s.selectedObjectIds, s.inCombat, s.spectateCharacterName, v.groupMembers);

    const deps: UseGameParserDeps = useMemo(() => ({
        entities: s.entities, isInventoryOpen: s.drawer === 'inventory', isEquipmentOpen: s.drawer === 'equipment',
        isCharacterOpen: s.drawer === 'character', isStatsOpen: s.drawer === 'stats', isPlayersOpen: s.drawer === 'players',
        mapperRef: { current: null }, btn, addMessage, addSystemMessage, pendingGmcpCommRef: { current: null },
        lastCommIdBySenderRef: { current: new Map() }, playHitImpactSound, playOofSound, playSlashSound,
        playCleaveSound, playSmiteSound, playPierceSound, playStabSound, playArrowHitSound,
        playCommMessageSound, playBuySellSound, playBashSound, loadBashSound: () => {},
        playIncantationSound, stopIncantationSound, playMagicExplosionSound,
        playDoorSound, playMovementSound, triggerHaptic, playEffect, primeSpellSuccess,
        playSound, playRandomSound, playKillSound, playLevelSound, sessionMode,
        inCombatRef: { current: false } as any, triggerXpTicker: v.triggerXpTicker, groupMembers: v.groupMembers,
        setDeathRoomId: s.setDeathRoomId, setSpectateInCombat: s.setSpectateInCombat,
        setSpectateOpponentName: s.setSpectateOpponentName, setSpectateOpponentStatus: s.setSpectateOpponentStatus,
        setMood: s.setMood, setSpectateHealthStatus: s.setSpectateHealthStatus, setSpectateStats: s.setSpectateStats,
        setSpectatePosition: s.setSpectatePosition, setSpectateWaiting: s.setSpectateWaiting,
        setSpectateRoomName: s.setSpectateRoomName, setSpectateRoomZone: s.setSpectateRoomZone,
        setSpectateLighting: s.setSpectateLighting, setSpectateWeather: s.setSpectateWeather,
        setSpectateIsFoggy: s.setSpectateIsFoggy, setSpectateCharacterName: s.setSpectateCharacterName,
        setSpectateGroupMembers: s.setSpectateGroupMembers, setSpectateRoomDesc: s.setSpectateRoomDesc,
        setSpectateTerrain: s.setSpectateTerrain, keywordOverrides: {},
        registerEntity: s.registerEntity, setEntities: s.setEntities, playerPosition: s.playerPosition,
        inlineCategories: s.inlineCategories, roomPlayers: s.roomPlayers, accountState: s.accountState,
        accountStageRef: s.accountStageRef, processMessageHtml, triggerHitFlash: v.triggerHitFlash,
        triggerOppHitFlash: v.triggerOppHitFlash, pendingDrawerContainerRef: { current: null },
        lastCommMsgIdRef: { current: null }, lastCommTimeRef: { current: 0 },
        setDiscoveredItems: s.setDiscoveredItems, roomNameRef: { current: '' },
        roomDescRef: { current: '' }, spectateRoomName: s.spectateRoomName,
        spectateRoomDesc: s.spectateRoomDesc, setIsSpectateMode: (v) => {},
        shop: {}, gameState: s.gameState as any, setGameState: s.setGameState,
        ansiConvert: (text: string) => text, isSoundEnabledRef: { current: true },
        soundTriggersRef: { current: [] }, quests: s.quests, setQuests: s.setQuests,
        captureStage: { current: 'none' } as any, isSilentCapture: { current: 0 },
        isDrawerCapture: { current: 0 }, captureOwnerDrawer: { current: 'none' } as any,
        isWaitingForInv: { current: false } as any, isWaitingForEq: { current: false } as any,
        isWaitingForStats: { current: false } as any, isWaitingForInfo: { current: false } as any,
        activeGroupMembers: v.groupMembers, activePrompt: v.activePrompt,
        setInventoryLines: s.setInventoryLines, setStatsLines: s.setStatsLines,
        setInfoLines: s.setInfoLines, setScoreLines: s.setScoreLines,
        setQuestLines: s.setQuestLines, setPracticeLines: s.setPracticeLines,
        setWhoLines: s.setWhoLines, setWhereLines: s.setWhereLines,
        setEqLines: s.setEqLines, setWhoList: s.setWhoList, setWhereList: s.setWhereList,
        executeCommandRef: { current: null }, detectLighting: s.detectLighting,
        setWeather: s.setWeather, setIsFoggy: s.setIsFoggy, setGameTime: s.setGameTime,
        gameTime: s.gameTime, isSpectateMode: s.isSpectateMode, spectateTarget: s.spectateTarget,
        spectateCharacterName: s.spectateCharacterName, addDiagnosticLog: ui.addDiagnosticLog,
        actionsRef: s.actionsRef, setIsPasswordMode: s.setIsPasswordMode,
        setAccountState: s.setAccountState, isNewbieMode: s.isNewbieMode
    }), [s, v, btn, audioEffects, processMessageHtml, sessionMode]);

    const parser = useGameParser(deps, s.userSession);
    const controller = useCommandController({
        telnet, addMessage, initAudio, navIntervalRef: { current: null }, mapperRef: { current: null },
        teleportTargets: settingsStore.teleportTargets, help: {}, isDrawerCapture: { current: 0 },
        isSilentCapture: { current: 0 }, captureStage: { current: 'none' } as any,
        isWaitingForStats: { current: false } as any, isWaitingForEq: { current: false } as any,
        isWaitingForInv: { current: false } as any, isWaitingForInfo: { current: false } as any,
        setInventoryLines: s.setInventoryLines, setStatsLines: s.setStatsLines,
        setInfoLines: s.setInfoLines, setScoreLines: s.setScoreLines, setEqLines: s.setEqLines,
        setCommandPreview: () => {}, input: '', setInput: () => {}, isNewbieMode: s.isNewbieMode,
        status: s.status, target: v.target, setTarget: v.setTarget, setPendingMove: v.setPendingMove,
        activePrompt: '', finalizeCapture: parser.finalizeCapture, popoverState: s.popoverState,
        setPopoverState: s.setPopoverState, setIsCharacterOpen: s.setIsCharacterOpen,
        setIsStatsOpen: s.setIsStatsOpen, setIsEquipmentOpen: s.setIsEquipmentOpen,
        setIsInventoryOpen: s.setIsInventoryOpen, setIsPlayersOpen: s.setIsPlayersOpen,
        setIsSettingsOpen: ui.setIsSettingsOpen, setSettingsTab: ui.setSettingsTab,
        setIsMapExpanded: s.setIsMapExpanded, setUI: s.setUI as any, viewport, triggerHaptic,
        btn, joystick, wasDraggingRef: { current: false }, ui: s.ui as any,
        actions: s.actions, setActions: s.setActions, setActiveDragData: s.setActiveDragData,
        activeDragData: s.activeDragData, practice: {}, heldButton: v.heldButton,
        setHeldButton: v.setHeldButton, parley: s.parley, setParley: s.setParley,
        isTrackpadModifierActive: s.isTrackpadModifierActive, shop: {},
        keywordOverrides: {}, openKeywordEdit: () => {}, lastCommandContextRef: { current: null },
        entities: s.entities, applyOptimisticChange: s.applyOptimisticChange,
        selectedObjectIds: s.selectedObjectIds, toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection, playClickSound, isSoundEnabled: s.isSoundEnabled,
        waiting: false, recordEntry: () => {}, gameState: s.gameState, isPasswordMode: s.isPasswordMode,
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

    return (
        <GameContext.Provider value={{} as any}>
            <VitalsContext.Provider value={v as any}>
                <UIContext.Provider value={ui as any}>
                    <LogContext.Provider value={activeLog as any}>
                        {children}
                    </LogContext.Provider>
                </UIContext.Provider>
            </VitalsContext.Provider>
        </GameContext.Provider>
    );
};
