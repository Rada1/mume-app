/** 
 * @file useSessionState.ts
 * Manages the state for a single game session (God or Spectated).
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { 
    GameStats, Message, CombatHealthStatus, GroupMember, DrawerLine, 
    LightingType, WeatherType, WhereEntry 
} from '../../types';
import { useMessageLog } from '../../hooks/useMessageLog';
import { useSessionRecorder } from '../../hooks/useSessionRecorder';
import { useEntityRegistry } from '../../hooks/useEntityRegistry';
import { SessionContextType, VitalsContextType, LogContextType } from './types';

export const useSessionState = (
    characterName: string | null,
    isNewbieMode: boolean,
    gameState: string,
    roomDescRef: React.RefObject<string | null>,
    isAccountModeRef: React.RefObject<boolean>
): SessionContextType => {
    // --- Vitals State ---
    const [stats, setStats] = useState<GameStats>({
        hp: 0, maxHp: 1, mana: 0, maxMana: 1, move: 0, maxMove: 1, wimpy: 0
    });
    const [target, setTarget] = useState<string | null>(null);
    const [activePrompt, setActivePrompt] = useState("");
    const [rumble, setRumble] = useState(false);
    const [deathRoomId, setDeathRoomId] = useState<string | null>(null);
    const [playerHealthStatus, setPlayerHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [opponentName, setOpponentName] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [opponentHealthStatus, setOpponentHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [bufferName, setBufferName] = useState<string | null>(null);
    const [bufferHealthStatus, setBufferHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
    const [gameTime, setGameTime] = useState<import('../../types').MumeTime | null>(null);
    const [xpHistory, setXpHistory] = useState({ old: 0, new: 0 });
    const [xpEvent, setXpEvent] = useState(0);
    const triggerXpTicker = useCallback(() => setXpEvent(Date.now()), []);
    const [hitFlashEvent, setHitFlashEvent] = useState(0);
    const [oppHitFlashEvent, setOppHitFlashEvent] = useState(0);
    const triggerHitFlash = useCallback(() => setHitFlashEvent(c => c + 1), []);
    const triggerOppHitFlash = useCallback(() => setOppHitFlashEvent(c => c + 1), []);

    // --- Game State ---
    const [roomName, setRoomName] = useState<string | null>(null);
    const [roomDesc, setRoomDesc] = useState<string | null>(null);
    const [roomExits, setRoomExits] = useState<string[]>([]);
    const [roomZone, setRoomZone] = useState<string | null>(null);
    const [currentTerrain, setCurrentTerrain] = useState<string>('city');
    const [lighting, setLighting] = useState<LightingType>('none');
    const [weather, setWeather] = useState<WeatherType>('none');
    const [isFoggy, setIsFoggy] = useState(false);
    const [inCombat, setInCombat] = useState(false);
    const [playerPosition, setPlayerPosition] = useState('standing');
    const [isRiding, setIsRiding] = useState(false);
    const [roomPlayers, setRoomPlayers] = useState<import('../../types').GmcpOccupant[]>([]);
    const [roomNpcs, setRoomNpcs] = useState<import('../../types').GmcpOccupant[]>([]);

    // --- Parser Refs & Synchronization ---
    const roomNameRef = useRef<string | null>(null);
    const roomDescRefInternal = useRef<string | null>(null);
    const lastCommMsgIdRef = useRef<string | null>(null);
    const lastCommTimeRef = useRef<number>(0);
    const [lightningEnabled, setLightningEnabled] = useState(false);

    React.useEffect(() => { roomNameRef.current = roomName; }, [roomName]);
    React.useEffect(() => { roomDescRefInternal.current = roomDesc; }, [roomDesc]);
    React.useEffect(() => {
        if (roomDescRef) (roomDescRef as any).current = roomDesc;
    }, [roomDesc, roomDescRef]);
    const [roomItems, setRoomItems] = useState<import('../../types').GmcpOccupant[]>([]);
    const [abilities, setAbilities] = useState<Record<string, number>>({});
    const [characterClass, setCharacterClass] = useState<'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none'>('none');
    const [actions, setActions] = useState<import('../../types').GameAction[]>([]);
    const [mood, setMood] = useState('peaceful');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');
    const [level, setLevel] = useState(1);
    const [currentName, setCurrentName] = useState<string | null>(characterName);
    const [teleportTargets, setTeleportTargets] = useState<string[]>([]);
    const [quests, setQuests] = useState<import('../../types').QuestData>({ activeQuests: [], lastUpdated: 0 });
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

    const vitals = useMemo<VitalsContextType>(() => ({
        stats, setStats, target, setTarget, activePrompt, setActivePrompt, rumble, setRumble,
        deathRoomId, setDeathRoomId, heldButton: null, setHeldButton: () => {},
        isMendingMode: false, setIsMendingMode: () => {}, mendingTarget: null, setMendingTarget: () => {},
        bufferName, setBufferName, playerHealthStatus, setPlayerHealthStatus, opponentName, opponentId,
        setOpponentId, opponentHealthStatus, bufferHealthStatus, characterInfo: {} as any, 
        setCharacterInfo: () => {}, groupMembers, setGroupMembers, xpHistory, xpEvent, triggerXpTicker,
        hitFlashEvent, oppHitFlashEvent, triggerHitFlash, triggerOppHitFlash, gameTime, setGameTime
    }), [
        stats, target, activePrompt, rumble, deathRoomId, bufferName, playerHealthStatus,
        opponentName, opponentId, opponentHealthStatus, bufferHealthStatus, groupMembers,
        xpHistory, xpEvent, hitFlashEvent, oppHitFlashEvent, gameTime
    ]);

    return {
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
            whereList, setWhereList
        },
        log: {
            ...log,
            lastCommIdBySenderRef
        },
        recorder
    };
};
