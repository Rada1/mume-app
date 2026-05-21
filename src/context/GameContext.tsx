import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    PopoverState, CustomButton, TeleportTarget, GmcpOccupant, SessionMode, CombatHealthStatus, MessageType, InlineCategoryConfig, GameEntity
} from '../types';
import { useMessageLog } from '../hooks/useMessageLog';
import { useReplayMessages } from '../hooks/useReplayMessages';
import { useButtons } from '../hooks/useButtons';
import { useJoystick } from '../hooks/useJoystick';
import { useButtonEditor } from '../hooks/useButtonEditor';
import { useViewport } from '../hooks/useViewport';
import { useEnvironment } from '../hooks/useEnvironment';
import { useTelnet } from '../hooks/useTelnet';
import { ProtocolHandler } from '../utils/telnet/ProtocolHandler';
import { GmcpDecoder } from '../utils/telnet/GmcpDecoder';
import { gmcpBus } from '../events/gmcpBus';
import { useGameParser } from '../hooks/GameParser/useGameParser';
import { UseGameParserDeps } from '../hooks/GameParser/types';
import { useCommandController } from '../hooks/useCommandController';
import { useSpatButtons } from '../hooks/useSpatButtons';
import { usePracticeHandler } from '../hooks/usePracticeHandler';
import { useQuestsHandler } from '../hooks/useQuestsHandler';
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
import { useSpectateBuffer } from '../hooks/useSpectateBuffer';
import { useSpectateBufferSync } from '../hooks/useSpectateBufferSync';
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
import { useEffectTimerStore } from '../stores/useEffectTimerStore';

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

    // 3. Ambient Controller (Must be after state initialization)
    useAmbientController(s.accountState.stage);

    const ui = useUIStore();
    const settingsStore = useSettingsStore();
    const mapperRef = useRef<MapperRef>(null);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : null;
            settingsStore.setBgImage(result);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, [settingsStore]);

    const handleBottomFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : null;
            if (!dataUrl) return;

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Chroma key: make near-white pixels transparent; flatten everything else to pure black
                // Preserve "glowing" pixels (high saturation/color, e.g. the green glowing eyes)
                const whiteThreshold = 220;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
                        // Near-white → transparent
                        data[i + 3] = 0;
                    } else {
                        // Check if this is a "glowing" colored pixel (e.g. green eyes)
                        const max = Math.max(r, g, b);
                        const min = Math.min(r, g, b);
                        const saturation = max > 0 ? (max - min) / max : 0;
                        const isGlowing = saturation > 0.4 && max > 80;

                        if (isGlowing) {
                            // Keep original glowing color
                        } else {
                            // Force to pure black silhouette
                            data[i] = 0;
                            data[i + 1] = 0;
                            data[i + 2] = 0;
                            data[i + 3] = 255;
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                const result = canvas.toDataURL('image/png');
                settingsStore.setBgImageBottom(result);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, [settingsStore]);

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
    const isSoundEnabledRef = useRef(true);
    const soundTriggersRef = useRef<any[]>([]);
    const captureStage = useRef<any>('none');
    const captureOwnerDrawer = useRef<any>('none');
    const nextCommandIsSilent = useRef(false);

    const viewport = useViewport(s.uiMode, s.disableSmoothScroll, s.isImmersionMode, s.fontFamily, s.isTimestampEnabled, s.isNewbieMode);
    const mode = useModeStore();
    const session = useSessionStore();
    const { sessionMode, setSessionMode, replayHUDState, setReplayHUDState, isSilentReplay } = session;

    // 4. Session & Replayer
    const replayMsg = useReplayMessages();
    const activeLog = mode.activeView === 'self' ? s.userSession.log : s.spectateSession.log;
    
    // Stable message routing: ensure snoop lines always land in the spectate bucket 
    // regardless of which view is currently active. This prevents "leaking" snoop 
    // data into the main log or losing our own tells while viewing the target.
    const routedAddMessage = React.useCallback((type: MessageType, text: string, extra?: any, mid?: string, isRoomName?: boolean, precalculated?: any, shopItem?: any, practiceSkill?: any, practiceHeader?: any, isSystem?: boolean, replyTarget?: string, replyCommand?: string, commSender?: string, commAction?: string, commText?: string, commColor?: string, commSenderTokens?: any, commTextTokens?: any, providedCombatSide?: any, providedIsHitImpact?: boolean, providedIsDamageImpact?: boolean, providedIsAvoidDamageImpact?: boolean, providedIsMissImpact?: boolean, providedIsHitterImpact?: boolean, providedIsSnoop?: boolean, providedIsSnoopInput?: boolean) => {
        const textOnly = (precalculated?.textOnly || text || '').replace(/\x1b\[[0-9;]*m/g, '').trim();
        const looksLikePrompt = textOnly.length <= 80 && (
            type === 'prompt' ||
            textOnly === '>' ||
            (textOnly.endsWith('>') && /(?:^|[\s\[\]!(*>])(?:HP|MA|MV|SP):\w+/i.test(textOnly))
        );

        const isBlankLine = textOnly.length === 0;

        // Spectate snoop output is routed to the target log, but MUME also sends
        // the observer's prompt/spacer between snoop bursts. Keep that boundary
        // useful for parsers while preventing USERS log prompt spam.
        if (mode.isSpectating && !providedIsSnoop && (looksLikePrompt || isBlankLine)) {
            return;
        }

        // Bump activity for atmospheric effects
        s.bumpActivity();

        const args = [type, text, extra, mid, isRoomName, precalculated, shopItem, practiceSkill, practiceHeader, isSystem, replyTarget, replyCommand, commSender, commAction, commText, commColor, commSenderTokens, commTextTokens, providedCombatSide, providedIsHitImpact, providedIsDamageImpact, providedIsAvoidDamageImpact, providedIsMissImpact, providedIsHitterImpact, providedIsSnoop, providedIsSnoopInput] as const;
        if (type === 'snoop' || type === 'snoop-command' || type === 'snoop-vitals' || providedIsSnoop) {
            (s.spectateSession.log.addMessage as any)(...args);
        } else {
            (s.userSession.log.addMessage as any)(...args);
        }
    }, [s.userSession.log, s.spectateSession.log, s.bumpActivity, mode.isSpectating]);

    const { messages, setMessages, addSystemMessage, flushMessages, clearLog } = activeLog;
    const addMessage = routedAddMessage; // Use the router for the parser

    // 5. Networking
    const telnetRef = useRef<any>(null);
    const sendGMCPProxy = useCallback((pkg: string, data: any = null) => {
        if (telnetRef.current) {
            telnetRef.current.sendGMCP(pkg, data);
        }
    }, []);
    const sendCommandProxy = useCallback((cmd: string) => {
        telnetRef.current?.sendCommand(cmd);
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
        setMood: s.setMood,
        setBufferName: s.userSession.vitals.setBufferName, setPlayerHealthStatus: s.userSession.vitals.setPlayerHealthStatus,
        setOpponentHealthStatus: s.userSession.vitals.setOpponentHealthStatus,
        setBufferHealthStatus: s.userSession.vitals.setBufferHealthStatus, setOpponentName: s.userSession.vitals.setOpponentName,
        setCharacterInfo: s.userSession.vitals.setCharacterInfo, characterInfo: s.userSession.vitals.characterInfo, opponentName: s.userSession.vitals.opponentName,
        bufferName: s.userSession.vitals.bufferName, roomChars: s.userSession.game.roomChars, roomPlayers: s.userSession.game.roomPlayers, roomNpcs: s.userSession.game.roomNpcs, setGroupMembers: s.userSession.vitals.setGroupMembers,
        setMumeEditState: s.setMumeEditState, setWhoList: s.userSession.game.setWhoList, setWhereList: s.userSession.game.setWhereList,
        opponentId: s.userSession.vitals.opponentId, setOpponentId: s.userSession.vitals.setOpponentId,
        detectLighting: env.detectLighting,
        playMovementSound, playDoorSound, setWeather: s.userSession.game.setWeather, setIsFoggy: s.userSession.game.setIsFoggy, 
        setStats: s.userSession.vitals.setStats, // ALWAYS update user session with real GMCP
        playerPositionRef: s.userSession.game.playerPositionRef, setIsRiding: s.userSession.game.setIsRiding, isRidingRef: s.userSession.game.isRidingRef, isSpectateMode: s.isSpectateMode, inlineCategories: s.inlineCategories,
        registerEntity: s.registry.registerEntity,
        sendGMCP: sendGMCPProxy,
        sendCommand: sendCommandProxy,
        pendingGmcpCommRef,
        gameTime: s.gameTime,
        setGameTime: s.setGameTime
    });

    // Stable ref to gmcpHandlers so replay onData can dispatch without stale closures.
    const gmcpHandlersRef = useRef(gmcpHandlers);
    useEffect(() => { gmcpHandlersRef.current = gmcpHandlers; }, [gmcpHandlers]);

    // Mirrors useTelnet.onGmcp but without server setup calls — routes GMCP from replay
    // log entries to the same handlers that live data uses (map, lighting, vitals, music).
    const dispatchReplayGmcp = useCallback((pkg: string, dataStr: string) => {
        const h = gmcpHandlersRef.current as any;
        let parsed: any = null;
        try { parsed = JSON.parse(dataStr); } catch (_) {}
        const pkgLower = pkg.toLowerCase();
        const isRoomCharsFullSet = [
            'room.chars',
            'room.chars.set',
            'room.chars.list',
            'room.players',
            'room.npcs',
            'mume.client.chars'
        ].includes(pkgLower);
        const isRoomCharAdd = [
            'room.chars.add',
            'room.char.add',
            'room.players.add',
            'room.npcs.add',
            'room.addplayer',
            'room.addnpc',
            'room.addchar'
        ].includes(pkgLower);
        const isRoomCharUpdate = [
            'room.chars.update',
            'room.char.update',
            'room.players.update',
            'room.npcs.update'
        ].includes(pkgLower);
        const isRoomCharRemove = [
            'room.chars.remove',
            'room.char.remove',
            'room.players.remove',
            'room.npcs.remove',
            'room.removeplayer',
            'room.removenpc',
            'room.removechar'
        ].includes(pkgLower);

        if (pkg.startsWith('Char.Vitals')) h.onCharVitals?.(parsed);
        else if (pkg.startsWith('Room.Info')) h.onRoomInfo?.(parsed);
        else if (pkgLower === 'group.set' || pkgLower === 'group') h.onGroupSet?.(parsed);
        else if (pkgLower === 'group.add') h.onGroupAdd?.(parsed);
        else if (pkgLower === 'group.update') h.onGroupUpdate?.(parsed);
        else if (pkgLower === 'group.remove') h.onGroupRemove?.(parsed);
        else if (isRoomCharAdd) h.onAddChar?.(parsed);
        else if (isRoomCharUpdate) h.onUpdateChar?.(parsed);
        else if (isRoomCharRemove) h.onRemoveChar?.(parsed);
        else if (pkg.startsWith('Room.Players') && isRoomCharsFullSet) h.onRoomPlayers?.(parsed);
        else if (isRoomCharsFullSet) h.onRoomNpcs?.(parsed);

        // Generic routing for remaining packages (Char.Ride, Mume.MumeEdit, etc.)
        const parts = pkg.split('.');
        const handlerName = `on${parts[0]}${parts[parts.length - 1]}`;
        if (!pkgLower.startsWith('group.') && h[handlerName]) h[handlerName](parsed);
    }, []);

    const replayer = useSessionReplayer(useCallback((type, payload, isPrivacyMode, isSilent = false) => {
        if (type === 'gmcp') {
            // Always process GMCP — including during silent rehydration (seek) so that
            // map position, vitals, and lighting are correct at the seek target.
            const { pkg, data } = payload as { pkg: string; data: string };
            dispatchReplayGmcp(pkg, data);
            return;
        }

        if (isSilent) return; // Don't add messages during silent rehydration

        if (type === 'rx') {
            if (typeof payload === 'object' && payload.text) {
                // Pre-processed message — inject directly into sandboxed replay store
                replayMsg.addMessage(
                    payload.type, payload.text, payload.extra, payload.mid,
                    payload.isRoomName, payload.precalculated,
                    payload.shopItem, payload.practiceSkill, payload.practiceHeader,
                    false,
                    payload.replyTarget, payload.replyCommand,
                    payload.commSender, payload.commAction, payload.commText, payload.commColor,
                    undefined, undefined,
                    payload.providedCombatSide, payload.providedIsHitImpact,
                    payload.providedIsDamageImpact, payload.isAvoidDamageImpact,
                    payload.isMissImpact, payload.providedIsHitterImpact,
                    payload.providedIsSnoop, payload.providedIsSnoopInput
                );
            } else {
                // Raw text (older logs) — add as plain game message, no parser
                const text = typeof payload === 'string' ? payload : new TextDecoder().decode(new Uint8Array(payload));
                replayMsg.addMessage('game', text);
            }
        } else if (type === 'tx') {
            const cmd = typeof payload === 'string' ? payload : String(payload);
            replayMsg.addMessage('user', cmd);
        }
    }, [replayMsg.addMessage, dispatchReplayGmcp]));

    // 5. Telnet & Networking
    const gameStateRef = React.useRef(s.gameState);
    React.useEffect(() => { gameStateRef.current = s.gameState; }, [s.gameState]);

    const telnet = useTelnet({
        connectionUrl: settingsStore.connectionUrl,
        processLine: (line, tokens) => {
            return parserRef.current?.processLine(line, tokens) ?? null;
        },
        getGameState: () => gameStateRef.current,
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

    // Scope per-character stores (magic keys, effect timers) to the active character.
    useEffect(() => {
        const name = s.characterName;
        useSettingsStore.getState().setCurrentCharacter(name);
        useEffectTimerStore.getState().setCurrentCharacter(name);
    }, [s.characterName]);

    // --- Always-on recording: auto-start on connect, auto-save on disconnect ---
    const previousStatusRef = useRef(s.status);
    useEffect(() => {
        if (s.status === 'connected') {
            s.userSession.recorder.startRecording(s.characterName || undefined, 'user');
        } else if (s.status === 'disconnected') {
            if (s.userSession.recorder.isRecording) {
                s.userSession.recorder.stopAndSave(s.characterName || undefined);
            }

            if (previousStatusRef.current !== 'disconnected') {
                s.setGameState('account');
                s.setAccountState(prev => ({
                    ...prev,
                    stage: 'none',
                    currentPrompt: undefined,
                    creationPrompt: undefined,
                    selectedCharacter: null,
                    charCapture: null
                }));
                s.setIsPasswordMode(false);
                v.setActivePrompt(null);
                captureStage.current = 'none' as any;
            }
        }

        previousStatusRef.current = s.status;
    }, [s.status]); // eslint-disable-line react-hooks/exhaustive-deps

    const spectateBuffer = useSpectateBuffer();
    const noopSound = useCallback(() => {}, []);

    // --- DVR: sync vitals/weather/audio state with buffer position ---
    const { recordHit, recordOof, recordClick } = useSpectateBufferSync({
        isSpectating: mode.isSpectating,
        displayCutoff: spectateBuffer.displayCutoff,
        isLive: spectateBuffer.isLive,
        isPlaying: spectateBuffer.isPlaying,
        playHitImpactSound: mode.activeView === 'target' ? playHitImpactSound : noopSound,
        playOofSound: mode.activeView === 'target' ? playOofSound : noopSound,
        playClickSound: mode.activeView === 'target' ? playClickSound : noopSound,
    });

    // Wrapped spectate sounds: record every snooped event, but only play when the
    // target channel is the visible live channel.
    const playHitImpactSoundSpectate = useCallback((modifier?: any) => {
        recordHit(modifier);
        if (!mode.isSpectating || mode.activeView !== 'target' || !spectateBuffer.isLive) return;
        playHitImpactSound(modifier);
    }, [playHitImpactSound, mode.isSpectating, mode.activeView, recordHit, spectateBuffer.isLive]);

    const playOofSoundSpectate = useCallback(() => {
        recordOof();
        if (!mode.isSpectating || mode.activeView !== 'target' || !spectateBuffer.isLive) return;
        playOofSound();
    }, [playOofSound, mode.isSpectating, mode.activeView, recordOof, spectateBuffer.isLive]);

    const playClickSoundSpectate = useCallback(() => {
        recordClick();
        if (!mode.isSpectating || mode.activeView !== 'target' || !spectateBuffer.isLive) return;
        playClickSound();
    }, [playClickSound, mode.isSpectating, mode.activeView, recordClick, spectateBuffer.isLive]);

    // --- DVR: track GMCP room-info snapshots so seeking replays the correct map state ---
    const spectateRoomSnapshotsRef = useRef<Array<{ timestamp: number; detail: any }>>([]);

    useEffect(() => {
        if (!mode.isSpectating) {
            spectateRoomSnapshotsRef.current = [];
            return;
        }
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            spectateRoomSnapshotsRef.current.push({ timestamp: Date.now(), detail });
            // Only forward to mapper when watching live; buffer restore handles the non-live case
            if (spectateBuffer.isLive) {
                window.dispatchEvent(new CustomEvent('mume-gmcp-room-info', { detail }));
            }
        };
        window.addEventListener('mume-spectate-room-update', handler);
        return () => window.removeEventListener('mume-spectate-room-update', handler);
    }, [mode.isSpectating, spectateBuffer.isLive]);

    useEffect(() => {
        if (spectateBuffer.isLive) return;
        const cutoff = spectateBuffer.displayCutoff;
        const snapshots = spectateRoomSnapshotsRef.current;
        let best: { timestamp: number; detail: any } | null = null;
        for (const snap of snapshots) {
            if (snap.timestamp <= cutoff) best = snap;
        }
        if (best) {
            window.dispatchEvent(new CustomEvent('mume-gmcp-room-info', { detail: best.detail }));
        }
    }, [spectateBuffer.isLive, spectateBuffer.displayCutoff]);

    // --- Always-on spectate recording: auto-start/stop with spectate session ---
    useEffect(() => {
        if (mode.isSpectating) {
            s.spectateSession.recorder.startRecording(s.characterName || undefined, 'spectate', mode.spectateTarget || undefined);
        } else {
            if (s.spectateSession.recorder.isRecording) {
                s.spectateSession.recorder.stopAndSave();
            }
            spectateBuffer.clear();
        }
    }, [mode.isSpectating]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Record snooped GMCP events into spectate session log for replay ---
    // Room.Info and Room.UpdateExits arrive as text lines (via parseLogGmcp), never as
    // structured GMCP entries, so they would be absent from the log and the map/music
    // would not update during replay. Subscribe here and persist them as 'gmcp' entries
    // so that dispatchReplayGmcp can route them to onRoomInfo / onRoomUpdateExits.
    useEffect(() => {
        if (!mode.isSpectating) return;
        const unsubs = (['Room.Info', 'Room.UpdateExits'] as const).map(event =>
            gmcpBus.on(event, (data: any) => {
                if (!data.isSnooped) return;
                s.spectateSession.recorder.recordEntry('gmcp', {
                    pkg: event,
                    data: JSON.stringify(data)
                });
            })
        );
        return () => unsubs.forEach(u => u());
    }, [mode.isSpectating]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Replay session lifecycle: drive sessionMode from replayer.log ---
    useEffect(() => {
        if (replayer.log) {
            setSessionMode('replay');
        } else {
            setSessionMode('live');
            replayMsg.clearMessages();
        }
    }, [replayer.log]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const practice = usePracticeHandler(s.setAbilities, s.setPracticeLines);
    const btn = useButtons({
        abilities: s.abilities,
        characterClass: s.characterClass,
        characterName: s.characterName,
        characterInfo: v.characterInfo,
        target: v.target,
        inlineCategories: s.inlineCategories,
        practiceData: practice.practiceData
    });
    useEffect(() => {
        btn.setAddMessage(addMessage);
    }, [btn, addMessage]);
    const joystick = useJoystick(triggerHaptic, s.roomExits, playClickSound);
    const editor = useButtonEditor(btn);
    const help = useHelpHandler();
    const quests = useQuestsHandler(s.setQuests, s.quests.activeQuests);
    const keywordOverrides = useKeywordOverrides();
    const openKeywordEdit = useCallback((context: string, displayText: string) => {
        ui.setKeywordEditState({ context, displayText });
    }, [ui]);
    const parserExecuteCommandRef = useRef<null | ((command: string, echo?: boolean, fromMacro?: boolean, silent?: boolean, fromDrawer?: boolean) => void)>(null);

    const deps: UseGameParserDeps = useMemo(() => ({
        // Basic Actions
        addMessage,
        addSystemMessage,
        clearLog,
        executeCommandRef: parserExecuteCommandRef,
        
        // Mapper/World
        mapperRef: mapperRef,
        setDeathRoomId: (id: string | null) => {}, // Placeholder

        // Handlers
        practiceHandler: practice,
        questsHandler: quests,
        helpHandler: help,
        keywordOverrides: keywordOverrides.overrides,

        // Audio/Visual
        playEffect,
        playHitImpactSound,
        playOofSound,
        playSpectateHitImpactSound: playHitImpactSoundSpectate,
        playSpectateOofSound: playOofSoundSpectate,
        playKillSound,
        playLevelSound,
        playClickSound: playClickSoundSpectate,
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
        isSoundEnabledRef,
        soundTriggersRef,
        captureStage,
        captureOwnerDrawer,
        accountStageRef: s.accountStageRef,
        actionsRef: s.actionsRef,

        // UI/Visibility
        isMobile: viewport.isMobile,
        isNewbieMode: s.isNewbieMode,
        drawer: ui.drawer,

        // Session/Game Data
        gameState: s.gameState as any,
        setGameState: s.setGameState,
        characterName: s.characterName,
        spectateCharacterName: s.spectateCharacterName,
        groupMembers: v.groupMembers,
        activeGroupMembers: v.groupMembers,
        isSpectateMode: s.isSpectateMode,
        activeView: mode.activeView,
        spectateTarget: s.spectateTarget,
        spectateRoomName: s.spectateRoomName,
        spectateRoomDesc: s.spectateRoomDesc,
        activePrompt: v.activePrompt,
        gameTime: s.gameTime,
        accountState: s.accountState,
        inlineCategories: s.inlineCategories,
        spectateQueue: s.spectateQueue,
        setSpectateQueue: s.setSpectateQueue,
        lastSnoopStartTime: s.lastSnoopStartTime,
        setLastSnoopStartTime: s.setLastSnoopStartTime,
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
        setSpectateRoomNum: s.setSpectateRoomNum,
        setSpectateRoomName: s.setSpectateRoomName,
        setSpectateRoomDesc: s.setSpectateRoomDesc,
        setSpectateRoomZone: s.setSpectateRoomZone,
        setSpectateActivePrompt: s.setSpectateActivePrompt,
        setSpectateWeather: s.setSpectateWeather,
        setSpectateIsFoggy: s.setSpectateIsFoggy,
        setSpectateLightningEnabled: s.spectateSession.game.setLightningEnabled,
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
        setAchievementLines: s.setAchievementLines,
        setWhoList: s.active.game.setWhoList,
        setWhereList: s.active.game.setWhereList,
        
        captureSession: s.active.game.captureSession,
        setCaptureSession: s.active.game.setCaptureSession,
        captureSessionRef: s.active.game.captureSessionRef,

        sendCommand: sendCommandProxy,
        setInput: s.setInput,

        // Others
        addDiagnosticLog: ui.addDiagnosticLog,
        registerEntity: s.registry.registerEntity,
        entities: s.registry.entities,
        entitiesRef: s.registry.entitiesRef,
        ansiConvert,
        btn,
        quests: s.quests,
        practice: practice,
        help: help
    }), [s, v, ui, viewport, settingsStore, mode, addMessage, addSystemMessage, clearLog, playHitImpactSound, playOofSound, playHitImpactSoundSpectate, playOofSoundSpectate, playClickSoundSpectate, playSlashSound, playCleaveSound, playSmiteSound, playPierceSound, playStabSound, playArrowHitSound, playCommMessageSound, playBuySellSound, playBashSound, playIncantationSound, stopIncantationSound, playMagicExplosionSound, playDoorSound, playMovementSound, triggerHaptic, playEffect, playKillSound, playLevelSound, practice, quests, help, keywordOverrides, btn, session.sessionMode, mapperRef]);


    const parser = useGameParser(deps, s.userSession);
    const parserRef = useRef(parser);
    useEffect(() => { parserRef.current = parser; }, [parser]);

    const sessionManager = useSessionManager({
        status: s.status,
        activePrompt: v.activePrompt?.text || '',
        addSystemMessage,
        telnetSendCommand: telnet.send,
        telnetConnect: telnet.connect,
        groupMembers: v.groupMembers,
        spatButtons,
        triggerSpitManual,
        gameState: s.gameState as any,
        accountStage: s.accountState.stage as any,
        isPasswordMode: s.isPasswordMode
    });

    const executeCommandRef = useRef<any>(null);

    const uiValue: UIContextType = useMemo(() => {
        const requestDrawerRefresh = (drawer: DrawerType) => {
            if (drawer === 'equipment') {
                const gearCommand = ui.gearTab === 'worn' ? 'eq' : ui.gearTab === 'inv' ? 'inv' : 'look';
                executeCommandRef.current?.(gearCommand, true, true, false, true);
            } else if (drawer === 'players') {
                if (ui.playersTab === 'online') {
                    s.setWhoLines([]);
                    executeCommandRef.current?.('who', true, true, false, true);
                } else if (ui.playersTab === 'nearby' && s.whereLines.length === 0) {
                    s.setWhereLines([]);
                    executeCommandRef.current?.('where', true, true, false, true);
                }
            } else if (drawer === 'character') {
                if (ui.charTab === 'info') executeCommandRef.current?.('info', true, true, false, true);
                else if (ui.charTab === 'quests') executeCommandRef.current?.('quest', true, true, false, true);
                else if (ui.charTab === 'skills') executeCommandRef.current?.('practice', true, true, false, true);
                else if (ui.charTab === 'achievements') executeCommandRef.current?.('achievement', true, true, false, true);
            }
        };

        return {
            ui: {
            drawer: ui.drawer,
            isDrawerPeeking: ui.isDrawerPeeking,
            peekingDrawer: ui.isDrawerPeeking ? (ui.drawer as any) : 'none',
            setManagerOpen: ui.setManagerOpen,
            mapExpanded: ui.mapExpanded,
            isMenuOpen: ui.isMenuOpen,
            isSetMenuOpen: ui.isSetMenuOpen,
            menuView: ui.menuView,
            mapMode: ui.mapMode,
            peekingSource: 'none' as any,
            showMapperToolbar: settingsStore.showMapperToolbar,
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
        setIsMapExpanded: ui.setMapExpanded,
        setIsSetManagerOpen: (open: boolean) => ui.setUI({ setManagerOpen: open }),
        setManagerSelectedSet: ui.setManagerSelectedSet,
        setShowMapperToolbar: settingsStore.setShowMapperToolbar,
        gearTab: ui.gearTab,
        setGearTab: ui.setGearTab,
        playersTab: ui.playersTab,
        setPlayersTab: ui.setPlayersTab,
        charTab: ui.charTab,
        setCharTab: ui.setCharTab,
        handleTabClick: (drawer: 'none' | 'character' | 'players' | 'equipment' | 'status') => {
            if (drawer === 'none') {
                ui.setDrawer('none');
                return;
            }
            if (ui.drawer === drawer) {
                requestDrawerRefresh(drawer);
                return;
            }

            ui.setDrawer(drawer);
            requestDrawerRefresh(drawer);
            playEffect('drawertab');
            if (viewport.isMobile) {
                ui.setMapExpanded(false);
            }
        },
        displayInventoryLines: s.inventoryLines,
        displayEqLines: s.eqLines,
        statsLines: s.statsLines,
        scoreLines: s.scoreLines,
        playerLines: [...s.whoLines, ...s.whereLines],
        infoLines: s.infoLines,
        practiceLines: s.practiceLines,
        questLines: s.questLines,
        achievementLines: s.achievementLines,
        whoLines: s.whoLines,
        whereLines: s.whereLines,
        setWhoLines: s.setWhoLines,
        setWhereLines: s.setWhereLines,
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
        replayer,
        spectateBuffer,
        };
    }, [ui, s.inventoryLines, s.eqLines, s.statsLines, s.scoreLines, s.infoLines, s.practiceLines, s.questLines, s.achievementLines, s.whoLines, s.whereLines, s.characterName, s.userSession.recorder, settingsStore.showMapperToolbar, settingsStore.setShowMapperToolbar, replayer, spectateBuffer]);

    const controller = useCommandController({
        telnet, addMessage, initAudio, navIntervalRef: { current: null }, mapperRef,
        teleportTargets: settingsStore.teleportTargets, help, 
        captureStage,
        setInventoryLines: s.setInventoryLines, setStatsLines: s.setStatsLines,
        setInfoLines: s.setInfoLines, setAchievementLines: s.setAchievementLines, setScoreLines: s.setScoreLines, setEqLines: s.setEqLines,
        setCommandPreview: s.setCommandPreview, input: s.input, setInput: s.setInput, isNewbieMode: s.isNewbieMode,
        status: s.status, target: v.target, setTarget: v.setTarget, setPendingMove: v.setPendingMove,
        activePrompt: v.activePrompt?.text || '', finalizeCapture: parser.finalizeCapture, popoverState: s.popoverState,
        setPendingFlags: parser.setPendingFlags,
        setPopoverState: s.setPopoverState,
        handleTabClick: uiValue.handleTabClick,
        setGearTab: uiValue.setGearTab,
        setPlayersTab: uiValue.setPlayersTab,
        setCharTab: uiValue.setCharTab,
        setIsSettingsOpen: ui.setIsSettingsOpen, setSettingsTab: ui.setSettingsTab,
        setIsMapExpanded: s.setIsMapExpanded, setUI: s.setUI as any, viewport, triggerHaptic,
        btn, joystick, wasDraggingRef: { current: false }, ui: s.ui as any,
        actions: s.actions, setActions: s.setActions, practice, heldButton: v.heldButton,
        setHeldButton: v.setHeldButton, parley: s.parley, setParley: s.setParley,
        isTrackpadModifierActive: s.isTrackpadModifierActive,
        keywordOverrides: keywordOverrides.overrides, openKeywordEdit, lastCommandContextRef: { current: null },
        entities: s.entities, applyOptimisticChange: s.applyOptimisticChange,
        selectedObjectIds: s.selectedObjectIds, toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection, playClickSound, playEffect, isSoundEnabled: s.isSoundEnabled,
        waiting: !!v.stats?.conditions?.waiting, recordEntry: s.userSession.recorder.recordEntry, gameState: s.gameState, isPasswordMode: s.isPasswordMode,
        sessionMode, replayer, isSpectateMode: s.isSpectateMode, setIsSpectateMode: mode.setIsSpectating,
        showSpectatePromptInLog: settingsStore.showSpectatePromptInLog,
        setShowSpectatePromptInLog: settingsStore.setShowSpectatePromptInLog,
        isImmersionMode: settingsStore.isImmersionMode,
        isBloomEnabled: settingsStore.isBloomEnabled, setIsBloomEnabled: settingsStore.setIsBloomEnabled,
        isHighlighterEnabled: true, setIsHighlighterEnabled: (v) => {}, // Placeholder
        isTimestampEnabled: settingsStore.isTimestampEnabled, setIsTimestampEnabled: settingsStore.setIsTimestampEnabled,
        disableSmoothScroll: settingsStore.disableSmoothScroll, setDisableSmoothScroll: settingsStore.setDisableSmoothScroll,
        showLegacyButtons: false, setShowLegacyButtons: (v) => {}, // Placeholder
        uiMode: settingsStore.uiMode, setUiMode: settingsStore.setUiMode,
        fontFamily: settingsStore.fontFamily, setFontFamily: settingsStore.setFontFamily,
        favorites: settingsStore.favorites, setFavorites: settingsStore.setFavorites,
        accountState: s.accountState, setAccountState: s.setAccountState,
        accountStageRef: s.accountStageRef, clearLog,
        nextCommandIsSilent
    });

    useEffect(() => {
        executeCommandRef.current = controller.executeCommand;
        parserExecuteCommandRef.current = controller.executeCommand;
    }, [controller.executeCommand]);

    const logValue: LogContextType = useMemo(() => ({
        ...activeLog,
        replayMessages: replayMsg.messages,
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
    }), [activeLog, replayMsg.messages, refreshLogHighlights, controller.handleLogPointerDown, controller.handleLogPointerUp, v.target, s.roomPlayers, s.roomNpcs, v.groupMembers, s.roomItems, s.inventoryLines, s.eqLines, s.discoveredItems, s.inlineCategories, settingsStore.npcColor, settingsStore.playerColor, settingsStore.objectColor, settingsStore.roomColor, btn.buttons, s.selectedObjectIds, s.userSession.game.whoList]);

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
        selectedObjectIds: s.selectedObjectIds,
        toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection,
        accountStageRef: s.accountStageRef,
        gameTime: s.gameTime,
        setGameTime: s.setGameTime,
        bgImage: settingsStore.bgImage,
        bgImageBottom: settingsStore.bgImageBottom,
        setBgImage: settingsStore.setBgImage,
        setBgImageBottom: settingsStore.setBgImageBottom,
        teleportTargets: settingsStore.teleportTargets,
        setTeleportTargets: settingsStore.setTeleportTargets,
        practice,
        help,
        quests,
        keywordOverrides: keywordOverrides.overrides,
        containerRef: { current: null },
        handleFileUpload,
        handleBottomFileUpload,
        exportSettings: () => ({}),
        exportSettingsFile: () => {},
        importSettings: () => {},
        handleSoundUpload: () => {},
        handleMmapperModeChange: () => {},
        isRecording: s.userSession.recorder.isRecording,
        duration: s.userSession.recorder.duration,
        mapperRef: mapperRef,
        sessionMode,
        setSessionMode,
        addToQueue: parser.addToQueue,
        rotateQueue: parser.rotateQueue,
        removeFromQueue: parser.removeFromQueue
    }), [
        s, v, telnet, parser, controller, btn, joystick, editor, replayer,
        viewport, env, audioCtxRef, initAudio, spatButtons, ui.diagnosticLogs,
        practice, help, quests, keywordOverrides,
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
