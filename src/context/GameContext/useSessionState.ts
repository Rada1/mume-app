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
import { classifyOccupant } from '../../services/classification/classifyOccupant';
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
    isSpectateSession: boolean = false,
    audioTriggers?: {
        playCommMessageSound: () => void;
        playCombatHitSound: () => void;
        playLevelUpSound: () => void;
    }
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
    const ui = useUIStore();

    // Map store values to legacy names for compatibility
    const stats = useMemo(() => ({
        hp: vStore?.hp ?? 0, 
        maxHp: vStore?.maxHp ?? 0, 
        mana: vStore?.mana ?? 0, 
        maxMana: vStore?.maxMana ?? 0, 
        move: vStore?.move ?? 0, 
        maxMove: vStore?.maxMove ?? 0, 
        wimpy: vStore?.wimpy ?? 0,
        ob: vStore?.ob,
        db: vStore?.db,
        pb: vStore?.pb,
        armour: vStore?.armour,
        conditions: (vStore as any)?.conditions ?? {}
    }), [vStore?.hp, vStore?.maxHp, vStore?.mana, vStore?.maxMana, vStore?.move, vStore?.maxMove, vStore?.wimpy, vStore?.ob, vStore?.db, vStore?.pb, vStore?.armour, (vStore as any)?.conditions]);

    const playerHealthStatus = vStore?.hpStatus ?? 'healthy';
    const playerPosition = vStore?.position ?? 'standing';
    const inCombat = vStore?.inCombat ?? false;
    const currentTerrain = rStore?.terrain || vStore?.currentTerrain || 'inside';
    const lighting = vStore?.lighting ?? 'normal';
    const weather = vStore?.weather ?? 'calm';
    const isFoggy = vStore?.isFoggy ?? false;
    const isRiding = (vStore as any)?.isRiding ?? false;
    const setIsRiding = useCallback((_flags: any) => {}, []); // Shimming setter for now

    const roomName = rStore?.roomName ?? '';
    const roomDesc = rStore?.roomDesc ?? '';
    const roomExits = Array.isArray(rStore?.exits) ? rStore.exits : Object.keys(rStore?.exits || {});
    const roomZone = rStore?.roomZone ?? '';
    const roomPlayers = useMemo(() => Object.values(rStore?.chars || {}).filter(c => classifyOccupant(c)?.kind === 'player'), [rStore?.chars]);
    const roomNpcs = useMemo(() => Object.values(rStore?.chars || {}).filter(c => classifyOccupant(c)?.kind === 'npc'), [rStore?.chars]);
    const roomItems = rStore?.items ?? [];
    const { whoList, setWhoList, whereList, setWhereList } = rStore;

    const { selectedObjectIds, toggleObjectSelection, clearObjectSelection } = ui;

    const opponentName = cStore?.opponentName ?? null;
    const opponentId = cStore?.opponentId === undefined || cStore?.opponentId === null ? null : String(cStore.opponentId);
    const opponentHealthStatus = cStore?.opponentHealthStatus ?? null;
    const bufferName = cStore?.bufferName ?? null;
    const bufferHealthStatus = cStore?.bufferHealthStatus ?? null;
    const groupMembers = cStore?.groupMembers ?? [];

    // Legacy setters mapped to store actions
    const getCurrentStats = useCallback(() => {
        const currentStore = isSpectateSession ? useSpectateVitalsStore.getState() : useVitalsStore.getState();
        return {
            hp: currentStore.hp ?? 0,
            maxHp: currentStore.maxHp ?? 0,
            mana: currentStore.mana ?? 0,
            maxMana: currentStore.maxMana ?? 0,
            move: currentStore.move ?? 0,
            maxMove: currentStore.maxMove ?? 0,
            wimpy: currentStore.wimpy ?? 0,
            ob: currentStore.ob,
            db: currentStore.db,
            pb: currentStore.pb,
            armour: currentStore.armour,
            conditions: (currentStore as any).conditions ?? {}
        };
    }, [isSpectateSession]);

    const setStats = useCallback((update: any) => {
        const next = typeof update === 'function' ? update(getCurrentStats()) : update;
        (vStore as any).setStats(next);
    }, [getCurrentStats, vStore]);
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
    const setRoomChars = rStore.setChars;
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
    const triggerXpTicker = useCallback((xp?: number) => {
        if (xp !== undefined) {
            _setXpHistory(prev => {
                if (prev.new === xp) return prev;
                return { old: prev.new, new: xp };
            });
        }
        _setXpEvent(prev => prev + 1);
    }, []);

    // Sync XP changes from the store (GMCP) to the ticker state
    useEffect(() => {
        const currentXp = vStore.characterInfo.xp;
        if (currentXp !== undefined && currentXp !== xpHistory.new) {
            triggerXpTicker(currentXp);
        }
    }, [vStore.characterInfo.xp, xpHistory.new, triggerXpTicker]);

    useEffect(() => { roomNameRef.current = roomName; }, [roomName]);

    useEffect(() => { roomDescRefInternal.current = roomDesc; }, [roomDesc]);
    useEffect(() => {
        if (roomDescRef) (roomDescRef as any).current = roomDesc;
    }, [roomDesc, roomDescRef]);

    const [abilities, setAbilities] = useState<Record<string, number>>({});
    const [characterClass, setCharacterClass] = useState<'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none'>('none');
    const [actions, setActions] = useState<import('../../types').GameAction[]>([]);
    const [captureSession, setCaptureSessionInternal] = useState<import('../../types/capture').CaptureSession | null>(null);
    const captureSessionRef = useRef<import('../../types/capture').CaptureSession | null>(null);
    const setCaptureSession = useCallback((valOrFn: import('../../types/capture').CaptureSession | null | ((prev: import('../../types/capture').CaptureSession | null) => import('../../types/capture').CaptureSession | null)) => {
        setCaptureSessionInternal(prev => {
            const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
            captureSessionRef.current = next;
            return next;
        });
    }, []);
    const [mood, setMood] = useState('peaceful');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');
    const [level, setLevel] = useState(1);
    const [currentName, setCurrentName] = useState<string | null>(characterName);
    const [quests, setQuests] = useState<import('../../types').QuestData>({ activeQuests: [], lastUpdated: 0 });
    const registry = useEntityRegistry();

    // --- Message Log ---
    const lastCommIdBySenderRef = useRef(new Map<string, string>());
    const recorder = useSessionRecorder();

    const recordEntry = useCallback((type: any, data: any) => {
        recorder.recordEntry(type, data);
    }, [recorder]);

    const [pendingMove, setPendingMove] = useState<{ dir: string; timestamp: number } | null>(null);
    const [heldButton, setHeldButtonState] = useState<any>(null);
    const heldButtonRef = useRef<any>(null);
    const setHeldButton = useCallback((valOrFn: any) => {
        setHeldButtonState((prev: any) => {
            const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
            heldButtonRef.current = next;
            return next;
        });
    }, []);

    const log = useMessageLog(
        { current: inCombat } as any,
        { players: roomPlayers, npcs: roomNpcs, items: roomItems, roomName, roomDesc },
        lastCommIdBySenderRef,
        isNewbieMode,
        recordEntry,
        roomDescRef,
        pendingMove,
        setPendingMove,
        isAccountModeRef,
        audioTriggers?.playCommMessageSound,
        isSpectateSession
    );

    // --- Parser State ---
    const [inventoryLines, setInventoryLines] = useState<DrawerLine[]>([]);
    const [statsLines, setStatsLines] = useState<DrawerLine[]>([]);
    const [infoLines, setInfoLines] = useState<DrawerLine[]>([]);
    const [scoreLines, setScoreLines] = useState<DrawerLine[]>([]);
    const [questLines, setQuestLines] = useState<DrawerLine[]>([]);
    const [achievementLines, setAchievementLines] = useState<DrawerLine[]>([]);
    const [practiceLines, setPracticeLines] = useState<DrawerLine[]>([]);
    const [whoLines, setWhoLines] = useState<DrawerLine[]>([]);
    const [whereLines, setWhereLines] = useState<DrawerLine[]>([]);
    const [eqLines, setEqLines] = useState<DrawerLine[]>([]);

    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
    const [containerContents, setContainerContents] = useState<Record<string, DrawerLine[]>>({});

    const setActivePromptCompat = useCallback((prompt: string | import('../../types').ActivePrompt | null) => {
        if (typeof prompt === 'string') {
            setActivePrompt({ text: prompt });
        } else {
            setActivePrompt(prompt);
        }
    }, []);

    const setCharacterInfo = useCallback((update: any) => {
        const current = vStore.characterInfo;
        const next = typeof update === 'function' ? update(current) : update;
        vStore.setCharacterInfo(next);
    }, [vStore]);

    const vitals = useMemo<VitalsContextType>(() => ({
        stats, setStats, target, setTarget, activePrompt, setActivePrompt: setActivePromptCompat, rumble, setRumble,
        deathRoomId, setDeathRoomId, heldButton, setHeldButton, heldButtonRef,
        isMendingMode: false, setIsMendingMode: () => {}, mendingTarget: null, setMendingTarget: () => {},
        bufferName, setBufferName, playerHealthStatus, setPlayerHealthStatus, opponentName, opponentId,
        setOpponentId, opponentHealthStatus, bufferHealthStatus, characterInfo: vStore.characterInfo,
        setCharacterInfo, groupMembers, setGroupMembers, xpHistory, xpEvent, triggerXpTicker,
        gameTime, setGameTime,
        pendingMove: null, setPendingMove: () => {},
        setOpponentHealthStatus, setBufferHealthStatus, setOpponentName,
        setSpectateHealthStatus: () => {}, setSpectateOpponentStatus: () => {},
        setSpectateOpponentName: () => {}, setSpectateOpponentId: () => {},
        spectateOpponentName: null, spectateOpponentId: null,
        roomName, characterName
    } as VitalsContextType), [
        stats, target, activePrompt, rumble, deathRoomId, heldButton, setHeldButton, bufferName, playerHealthStatus,
        opponentName, opponentId, opponentHealthStatus, bufferHealthStatus, groupMembers,
        xpHistory, xpEvent, gameTime, roomName, characterName, vStore.characterInfo, setCharacterInfo
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
            roomPlayers,
            roomNpcs,
            roomChars: rStore.chars,
            setRoomChars,
            roomItems, setRoomItems,
            inventoryLines, setInventoryLines,
            statsLines, setStatsLines,
            infoLines, setInfoLines,
            scoreLines, setScoreLines,
            questLines, setQuestLines,
            achievementLines, setAchievementLines,
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
            registry,
            quests, setQuests,
            roomNameRef, roomDescRef: roomDescRefInternal,
            lastCommMsgIdRef, lastCommTimeRef,
            lightningEnabled, setLightningEnabled,
            whoList: rStore.whoList, setWhoList,
            whereList, setWhereList,
            discoveredItems, setDiscoveredItems,
            gameTime, setGameTime,
            roomNum: rStore?.roomNum ?? 0,
            setRoomNum: (num: number) => rStore.setRoomInfo({ roomNum: num }),
            captureSession,
            captureSessionRef,
            setCaptureSession,
            expandedContainers,
            setExpandedContainers,
            containerContents,
            setContainerContents
        },
        log: {
            ...log,
            selectedObjectIds: ui.selectedObjectIds,
            toggleObjectSelection: ui.toggleObjectSelection,
            clearObjectSelection: ui.clearObjectSelection,
            processMessageHtml: (html: string) => html, // Placeholder, elevated in GameContext
            processMessageTokens: () => [], // Placeholder, elevated in GameContext
            lastCommIdBySenderRef
        },
        recorder
    }), [
        vitals, roomName, setRoomName, roomDesc, setRoomDesc, roomExits, setRoomExits,
        roomZone, setRoomZone, currentTerrain, setCurrentTerrain, lighting, setLighting,
        isFoggy, setIsFoggy, inCombat, setInCombat,
        playerPosition, setPlayerPosition, isRiding, setIsRiding, roomPlayers,
        roomNpcs, roomItems, setRoomItems, inventoryLines, statsLines,
        infoLines, scoreLines, questLines, achievementLines, practiceLines, whoLines, whereLines,
        eqLines, abilities, characterClass, actions, mood, spellSpeed, alertness,
        level, currentName, setCurrentName, registry, quests,
        lightningEnabled, rStore.whoList, setWhoList, whereList, setWhereList, log, ui.selectedObjectIds,
        ui.toggleObjectSelection, ui.clearObjectSelection, recorder, discoveredItems,
        gameTime, setGameTime, rStore.roomNum, rStore.chars, captureSession,
        expandedContainers, containerContents
    ]);
};
