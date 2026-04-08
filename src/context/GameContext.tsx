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
import { useGmcpHandlers } from '../hooks/useGmcpHandlers';
import { useShopHandler } from '../hooks/useShopHandler';
import { useGameProviderState } from './GameContext/state';
import { useKeywordOverrides } from '../hooks/useKeywordOverrides';
import { useSessionManager } from '../hooks/useSessionManager';
import { useGameAudio } from '../hooks/useGameAudio';
import { useSessionRecorder } from '../hooks/useSessionRecorder';
import { useSessionReplayer } from '../hooks/useSessionReplayer';
import { useSpectateMode } from './GameContext/hooks/useSpectateMode';
import { useTerminalSync } from './GameContext/hooks/useTerminalSync';
import { useKeyboardVisibility } from './GameContext/hooks/useKeyboardVisibility';
import { useGameContextUI } from './GameContext/hooks/useGameContextUI';
import { useGameContextVitals } from './GameContext/hooks/useGameContextVitals';
import { useGameContextValue } from './GameContext/hooks/useGameContextValue';
import { useGameContextAudio } from './GameContext/hooks/useGameContextAudio';
import { useGameContextParser } from './GameContext/hooks/useGameContextParser';
import { useGameContextTelnet } from './GameContext/hooks/useGameContextTelnet';
import { useGameContextController } from './GameContext/hooks/useGameContextController';

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
        isBloomEnabled
    } = s;

    const { stats, rumble, target, activePrompt } = v;
    const { isSpectateMode, spectateTargetId, groupMembers } = s;

    const spectateTarget = useSpectateMode({ isSpectateMode, spectateTargetId, groupMembers });

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
        roomName: s.roomName
    }), [s.roomPlayers, s.roomNpcs, s.roomItems, s.roomName]);

    const sanitizedRecordEntry = useCallback((type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any) => {
        const isSensitive = s.gameState !== 'playing';
        recorder.recordEntry(type, data, { mask: isSensitive });
    }, [s.gameState, recorder.recordEntry]);

    const { messages, setMessages, addMessage, flushMessages, isCombatLine } = useMessageLog(
        inCombatHookRef,
        s.isMobileBrevityMode,
        roomContext,
        lastCommIdBySenderRef,
        isNewbieMode,
        s.moveDirQueueRef,
        s.activeMoveDirRef,
        sanitizedRecordEntry
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

    const audioMethods = useGameContextAudio({ s, v, manualCancelRef });
    const {
        audioCtxRef, initAudio, playSound, setPlaySound, playRandomSound, playMovementSound, playDoorSound,
        playClickSound, playHitImpactSound, playIncantationSound, stopIncantationSound, playMagicExplosionSound,
        playCommMessageSound, stopCommMessageSound, playTutorialExitSound, triggerHaptic, setTriggerHaptic
    } = audioMethods;



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
    const viewport = useViewport(s.uiMode, s.disableSmoothScroll, s.disable3dScroll, s.isImmersionMode);

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
    const { processMessageHtml } = useMessageHighlighter(v.target, btn.buttonsRef, roomPlayers, roomNpcs, s.characterName, roomItems, s.inlineCategories, s.isHighlighterEnabled, highlightVersion, s.discoveredItems, keywordOverrides, s.selectedObjectIds);


    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const parser = useGameContextParser({
        s, v, env, btn, mapperRef, addMessage, addSystemMessage, playSound, playHitImpactSound, playRandomSound, playDoorSound,
        triggerHaptic, addDiagnosticLog, keywordOverrides, settings, practice, shop, roomDescRef, pendingGmcpCommRef,
        lastCommIdBySenderRef, viewport, spectateTarget, audioMethods
    });


    const { processLine } = parser;

    const telnet = useGameContextTelnet({
        s, v, settings, processLine, sanitizedRecordEntry, gmcpHandlers, addMessage, flushMessages, env,
        roomInfoFn, roomExitsFn, charVitalsFn, roomPlayersFn, roomNpcsFn, roomItemsFn, addPlayerFn, addNpcFn,
        removePlayerFn, removeNpcFn, opponentChangeFn, pendingGmcpCommRef, commFn, groupAddFn, groupUpdateFn,
        groupRemoveFn, groupSetFn, addDiagnosticLog
    });

    const controller = useGameContextController({
        s, v, telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets, input, setInput,
        isNoviceMode, parser, setIsSettingsOpen, setSettingsTab, viewport, triggerHaptic, btn, joystick, editor, practice, shop,
        keywordOverrides, openKeywordEdit, lastCommandContextRef, playClickSound, sanitizedRecordEntry
    });
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
    useTerminalSync({ gameState: s.gameState, viewport, executeCommand });

    // Handle keyboard-triggered visibility for buttons
    useKeyboardVisibility({
        isKeyboardOpen: viewport.isKeyboardOpen,
        rawButtons: btn.rawButtons,
        setButtons: btn.setButtons,
        triggerSpitManual
    });

    const uiValue = useGameContextUI({
        s,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        recorder,
        replayer
    });

    const gameValue = useGameContextValue({
        s, v, isSpectateMode, spectateTarget, accentColor, setAccentColor, teleportTargets, setTeleportTargets,
        roomInfoFn, setRoomInfoFn, roomExitsFn, setRoomExitsFn, charVitalsFn, setCharVitalsFn,
        roomPlayersFn, setRoomPlayersFn, roomNpcsFn, setRoomNpcsFn, roomItemsFn, setRoomItemsFn,
        addPlayerFn, setAddPlayerFn, addNpcFn, setAddNpcFn, removePlayerFn, setRemovePlayerFn,
        removeNpcFn, setRemoveNpcFn, opponentChangeFn, setOpponentChangeFn,
        groupAddFn, setGroupAddFn, groupUpdateFn, setGroupUpdateFn, groupRemoveFn, setGroupRemoveFn, groupSetFn, setGroupSetFn,
        playSound, playRandomSound, playDoorSound, setPlaySound, triggerHaptic, setTriggerHaptic, playClickSound, playCommMessageSound, stopCommMessageSound, playTutorialExitSound,
        btn, joystick, editor, containerRef, viewport, env, initAudio, input, setInput,
        handleSend, handleInputSwipe, executeCommand, handleButtonClick, handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp, handleDragStart, handleDragEnd,
        handleSaveMumeEdit, mapperRef, settings, audioCtxRef, telnet, parser, practice, spatButtons, setSpatButtons,
        prepareLoginAttempt, diagnosticLogs, addDiagnosticLog, refreshLogHighlights, addMessage, addSystemMessage,
        keywordOverrides, openKeywordEdit, keywordEditState, setKeywordEditState, setKeywordOverride, removeKeywordOverride, keywordFailureBanner, setKeywordFailureBanner,
        recorder
    });

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

    const { effectiveVitals } = useGameContextVitals({ v, s });

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
