/** 
 * @file useSessionState.ts
 * Manages the state for a single game session (God or Spectated).
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { 
    GameStats, Message, CombatHealthStatus, GroupMember, DrawerLine, 
    LightingType, WeatherType, WhereEntry 
} from '../../types';
import { useMessageLog } from '../../hooks/useMessageLog';
import { useSessionRecorder } from '../../hooks/useSessionRecorder';
import { useEntityRegistry } from '../../hooks/useEntityRegistry';
import { useUIStore } from '../../stores/useUIStore';
import { useVitalsStore } from '../../stores/useVitalsStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCombatStore } from '../../stores/useCombatStore';
import { useSpectateVitalsStore } from '../../stores/spectate/useSpectateVitalsStore';
import { useSpectateRoomStore } from '../../stores/spectate/useSpectateRoomStore';
import { useSpectateCombatStore } from '../../stores/spectate/useSpectateCombatStore';
import { SessionContextType, VitalsContextType, LogData } from './types';

export const useSessionState = (
    characterName: string | null,
    isNewbieMode: boolean,
    gameState: string,
    roomDescRef: React.RefObject<string | null>,
    isAccountModeRef: React.RefObject<boolean>,
    isSpectateSession: boolean = false
): SessionContextType => {
    // --- Store Selection ---
    // --- Store Selection (Unconditional hook calls to respect Rules of Hooks) ---
    const vStoreMain = useVitalsStore();
    const vStoreSpectate = useSpectateVitalsStore();
    const rStoreMain = useRoomStore();
    const rStoreSpectate = useSpectateRoomStore();
    const cStoreMain = useCombatStore();
    const cStoreSpectate = useSpectateCombatStore();

    const vStore = isSpectateSession ? vStoreSpectate : vStoreMain;
    const rStore = isSpectateSession ? rStoreSpectate : rStoreMain;
    const cStore = isSpectateSession ? cStoreSpectate : cStoreMain;

    // Map store values to legacy names for compatibility
    const stats = useMemo(() => ({
        hp: vStore.hp, maxHp: vStore.maxHp, 
        mana: vStore.mana, maxMana: vStore.maxMana, 
        move: vStore.move, maxMove: vStore.maxMove, 
        wimpy: vStore.wimpy
    }), [vStore.hp, vStore.maxHp, vStore.mana, vStore.maxMana, vStore.move, vStore.maxMove, vStore.wimpy]);
    const playerHealthStatus = vStore.hpStatus;
    const playerPosition = vStore.position;
    const inCombat = vStore.inCombat;
    const currentTerrain = vStore.currentTerrain;
    const lighting = vStore.lighting;
    const weather = vStore.weather;
    const isFoggy = vStore.isFoggy;
    const isRiding = (vStore as any).isRiding ?? false;
    const setIsRiding = useCallback((_flags: any) => {}, []); // Shimming setter for now

    const roomName = rStore.roomName;
    const roomDesc = rStore.roomDesc;
    const roomExits = Array.isArray(rStore.exits) ? rStore.exits : Object.keys(rStore.exits || {});
    const roomZone = rStore.roomZone;
    const roomPlayers = rStore.players;
    const roomNpcs = rStore.npcs;
    const roomItems = rStore.items;

    const opponentName = cStore.opponentName;
    const opponentId = cStore.opponentId === null ? null : String(cStore.opponentId);
    const opponentHealthStatus = cStore.opponentHealthStatus;
    const bufferName = cStore.bufferName;
    const bufferHealthStatus = cStore.bufferHealthStatus;
    const groupMembers = cStore.groupMembers;

    // Legacy setters mapped to store actions
    const setStats = (update: any) => vStore.applyCharVitals(typeof update === 'function' ? update(stats) : update);
    const setRoomName = rStore.setRoomName;
    const setRoomDesc = rStore.setRoomDesc;
    const setRoomExits = rStore.setExits;
    const setRoomZone = rStore.setRoomZone;
    const setCurrentTerrain = rStore.setTerrain;
    const setLighting = vStore.setLighting;
    const setWeather = vStore.setWeather;
    const setIsFoggy = vStore.setIsFoggy;
    const setInCombat = vStore.setInCombat;
    const setPlayerPosition = vStore.setPosition;
    const setRoomPlayers = rStore.setPlayers;
    const setRoomNpcs = rStore.setNpcs;
    const setRoomItems = rStore.setItems;
    const setOpponentName = (cStore as any).setOpponentName;
    const setOpponentId = (cStore as any).setOpponentId;
    const setOpponentHealthStatus = (cStore as any).setOpponentStatus;
    const setBufferName = (cStore as any).setBufferName;
    const setBufferHealthStatus = (cStore as any).setBufferStatus;
    const setGroupMembers = cStore.setGroupMembers;
    const setPlayerHealthStatus = (vStore as any).setHpStatus;


    // --- Parser Refs & Synchronization ---
    const roomNameRef = useRef<string | null>(null);
    const roomDescRefInternal = useRef<string | null>(null);
    const lastCommMsgIdRef = useRef<string | null>(null);
    const lastCommTimeRef = useRef<number>(0);
    const [lightningEnabled, setLightningEnabled] = useState(false);
    const [discoveredItems, setDiscoveredItems] = useState<string[]>([]);
    const [target, setTargetInternal] = useState<string | null>(null);
    const setTarget = useCallback((val: string | null) => {
        setTargetInternal(val);
        vStore.setTarget(val);
    }, []);

    const [activePrompt, setActivePromptInternal] = useState<import('../../types').ActivePrompt | null>(null);
    const setActivePrompt = useCallback((prompt: string | import('../../types').ActivePrompt | null) => {
        const p = typeof prompt === 'string' ? { text: prompt } : prompt;
        setActivePromptInternal(p);
        vStore.setActivePrompt(p);
    }, []);

    const [rumble, setRumble] = useState(false);
    const [deathRoomId, setDeathRoomId] = useState<string | null>(null);
    const [gameTime, setGameTime] = useState<import('../../types').MumeTime | null>(null);
    const [xpHistory, _setXpHistory] = useState({ old: 0, new: 0 });
    const [xpEvent, _setXpEvent] = useState(0);
    const triggerXpTicker = () => {};
    const [hitFlashEvent, _setHitFlashEvent] = useState(0);
    const [oppHitFlashEvent, _setOppHitFlashEvent] = useState(0);
    const triggerHitFlash = () => {};
    const triggerOppHitFlash = () => {};

    useEffect(() => { roomNameRef.current = roomName; }, [roomName]);
    useEffect(() => { roomDescRefInternal.current = roomDesc; }, [roomDesc]);
    useEffect(() => {
        if (roomDescRef) (roomDescRef as any).current = roomDesc;
    }, [roomDesc, roomDescRef]);

    const [abilities, setAbilities] = useState<Record<string, number>>({});
    const [characterClass, setCharacterClass] = useState<'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none'>('none');
    const [actions, setActions] = useState<import('../../types').GameAction[]>([]);
    const [mood, setMood] = useState('peaceful');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');
    const [level, setLevel] = useState(1);
    const [currentName, setCurrentName] = useState<string | null>(characterName);
    const [teleportTargets, setTeleportTargets] = useState<import('../../types').TeleportTarget[]>([]);
    const [quests, setQuests] = useState<import('../../types').QuestData>({ activeQuests: [], lastUpdated: 0 });
    const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
    const toggleObjectSelection = useCallback((id: string, setId?: string, _context?: string) => {
        setSelectedObjectIds(prev => {
            const next = setId ? new Set<string>(prev) : new Set<string>();
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const clearObjectSelection = useCallback(() => {
        setSelectedObjectIds(new Set());
    }, []);

    const registry = useEntityRegistry();

    // --- Message Log ---
    const lastCommIdBySenderRef = useRef(new Map<string, string>());
    const recorder = useSessionRecorder();

    const recordEntry = useCallback((type: any, data: any) => {
        recorder.recordEntry(type, data);
    }, [recorder]);

    const [pendingMove, setPendingMove] = useState<{ dir: string; timestamp: number } | null>(null);

    const log = useMessageLog(
        { current: inCombat } as any,
        { players: roomPlayers, npcs: roomNpcs, items: roomItems, roomName, roomDesc },
        lastCommIdBySenderRef,
        isNewbieMode,
        recordEntry,
        roomDescRef,
        pendingMove,
        setPendingMove,
        isAccountModeRef
    );

    // --- Parser State ---
    const [inventoryLines, setInventoryLines] = useState<DrawerLine[]>([]);
    const [statsLines, setStatsLines] = useState<DrawerLine[]>([]);
    const [infoLines, setInfoLines] = useState<DrawerLine[]>([]);
    const [scoreLines, setScoreLines] = useState<DrawerLine[]>([]);
    const [questLines, setQuestLines] = useState<DrawerLine[]>([]);
    const [practiceLines, setPracticeLines] = useState<DrawerLine[]>([]);
    const [whoLines, setWhoLines] = useState<DrawerLine[]>([]);
    const [whereLines, setWhereLines] = useState<DrawerLine[]>([]);
    const [whoList, setWhoList] = useState<string[]>([]);
    const [whereList, setWhereList] = useState<WhereEntry[]>([]);
    const [eqLines, setEqLines] = useState<DrawerLine[]>([]);

    const setActivePromptCompat = useCallback((prompt: string | import('../../types').ActivePrompt | null) => {
        if (typeof prompt === 'string') {
            setActivePrompt({ text: prompt });
        } else {
            setActivePrompt(prompt);
        }
    }, []);

    const vitals = useMemo<VitalsContextType>(() => ({
        stats, setStats, target, setTarget, activePrompt, setActivePrompt: setActivePromptCompat, rumble, setRumble,
        deathRoomId, setDeathRoomId, heldButton: null, setHeldButton: () => {},
        isMendingMode: false, setIsMendingMode: () => {}, mendingTarget: null, setMendingTarget: () => {},
        bufferName, setBufferName, playerHealthStatus, setPlayerHealthStatus, opponentName, opponentId,
        setOpponentId, opponentHealthStatus, bufferHealthStatus, characterInfo: {} as any,
        setCharacterInfo: () => {}, groupMembers, setGroupMembers, xpHistory, xpEvent, triggerXpTicker,
        hitFlashEvent, oppHitFlashEvent, triggerHitFlash, triggerOppHitFlash, gameTime, setGameTime,
        pendingMove: null, setPendingMove: () => {},
        setOpponentHealthStatus, setBufferHealthStatus, setOpponentName,
        setSpectateHealthStatus: () => {}, setSpectateOpponentStatus: () => {},
        setSpectateOpponentName: () => {}, setSpectateOpponentId: () => {},
        spectateOpponentName: null, spectateOpponentId: null,
        roomName, characterName
    } as VitalsContextType), [
        stats, target, activePrompt, rumble, deathRoomId, bufferName, playerHealthStatus,
        opponentName, opponentId, opponentHealthStatus, bufferHealthStatus, groupMembers,
        xpHistory, xpEvent, hitFlashEvent, oppHitFlashEvent, gameTime
    ]);

    return useMemo(() => ({
        vitals,
        game: {
            roomName, setRoomName,
            roomDesc, setRoomDesc,
            roomExits, setRoomExits,
            roomZone, setRoomZone,
            currentTerrain, setCurrentTerrain,
            lighting, setLighting,
            weather, setWeather,
            isFoggy, setIsFoggy,
            inCombat, setInCombat,
            playerPosition, setPlayerPosition,
            isRiding, setIsRiding,
            roomPlayers, setRoomPlayers,
            roomNpcs, setRoomNpcs,
            roomItems, setRoomItems,
            inventoryLines, setInventoryLines,
            statsLines, setStatsLines,
            infoLines, setInfoLines,
            scoreLines, setScoreLines,
            questLines, setQuestLines,
            practiceLines, setPracticeLines,
            whoLines, setWhoLines,
            whereLines, setWhereLines,
            eqLines, setEqLines,
            abilities, setAbilities,
            characterClass, setCharacterClass,
            actions, setActions,
            mood, setMood,
            spellSpeed, setSpellSpeed,
            alertness, setAlertness,
            level, setLevel,
            characterName: currentName, setCharacterName: setCurrentName,
            registry, teleportTargets, setTeleportTargets,
            quests, setQuests,
            roomNameRef, roomDescRef: roomDescRefInternal,
            lastCommMsgIdRef, lastCommTimeRef,
            lightningEnabled, setLightningEnabled,
            whoList, setWhoList,
            whereList, setWhereList,
            discoveredItems, setDiscoveredItems,
            gameTime, setGameTime
        },
        log: {
            ...log,
            selectedObjectIds,
            toggleObjectSelection,
            clearObjectSelection,
            processMessageHtml: (html: string) => html, // Placeholder, elevated in GameContext
            lastCommIdBySenderRef
        },
        recorder
    }), [
        vitals, roomName, setRoomName, roomDesc, setRoomDesc, roomExits, setRoomExits,
        roomZone, setRoomZone, currentTerrain, setCurrentTerrain, lighting, setLighting,
        weather, setWeather, isFoggy, setIsFoggy, inCombat, setInCombat,
        playerPosition, setPlayerPosition, isRiding, setIsRiding, roomPlayers, setRoomPlayers,
        roomNpcs, setRoomNpcs, roomItems, setRoomItems, inventoryLines, statsLines,
        infoLines, scoreLines, questLines, practiceLines, whoLines, whereLines,
        eqLines, abilities, characterClass, actions, mood, spellSpeed, alertness,
        level, currentName, setCurrentName, registry, teleportTargets, quests,
        lightningEnabled, whoList, whereList, log, selectedObjectIds,
        toggleObjectSelection, clearObjectSelection, recorder, discoveredItems,
        gameTime, setGameTime
    ]);
};
