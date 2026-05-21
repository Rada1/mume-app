import React, { useRef, useCallback } from 'react';
import {
    GmcpOccupant,
    MessageType,
    CombatHealthStatus,
    GroupMember,
    GmcpMumeEdit
} from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { useGmcpRoom } from './useGmcpRoom';
import { useGmcpVitals } from './useGmcpVitals';
import { useGmcpOccupants } from './useGmcpOccupants';
import { useGmcpGroup } from './useGmcpGroup';
import { normalizeCombatantName } from '../../utils/combatUtils';
import { getMumeTimeFromEpoch, MUME_MONTHS } from '../../utils/mumeTimeUtils';

interface GmcpHandlersProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomChars?: React.Dispatch<React.SetStateAction<Record<number, GmcpOccupant>>>;
    setRoomItems?: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setDiscoveredItems: (items: string[]) => void;
    characterName: string | null;
    setAbilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => void;
    setCharacterName: (name: string | null) => void;
    setRoomName: (name: string | null) => void;
    setPlayerPosition: (pos: string) => void;
    setMood?: (val: string) => void;
    setRoomDesc: (desc: string | null) => void;
    setRoomExits: (exits: string[]) => void;
    setRoomZone: (zone: string | null) => void;
    setBufferName: (name: string | null) => void;
    setPlayerHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (status: CombatHealthStatus | null) => void;
    setBufferHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentName: (name: string | null) => void;
    characterInfo: import('../../types').CharacterInfo;
    setCharacterInfo: React.Dispatch<React.SetStateAction<import('../../types').CharacterInfo>>;
    opponentName: string | null;
    opponentId: string | null;
    setOpponentId: (id: string | null) => void;
    bufferName: string | null;
    roomChars?: Record<number, GmcpOccupant>;
    roomPlayers?: GmcpOccupant[];
    roomNpcs?: GmcpOccupant[];
    suppressNextTextHeaderRef?: React.MutableRefObject<boolean>;
    setGroupMembers: React.Dispatch<React.SetStateAction<GroupMember[]>>;
    setMumeEditState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; text: string; key: string }>>;
    setWhoList: React.Dispatch<React.SetStateAction<string[]>>;
    setWhereList: React.Dispatch<React.SetStateAction<import('../../types').WhereEntry[]>>;
    detectLighting?: (symbol: string | number) => void;
    playMovementSound?: (isRiding: boolean) => void;
    playDoorSound?: (isOpen: boolean) => void;
    playerPositionRef?: React.RefObject<string>;
    setIsRiding?: (val: boolean) => void;
    isRidingRef?: React.RefObject<boolean>;
    registerEntity?: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    roomDescRef?: React.RefObject<string>;
    setInCombat?: (val: boolean, force?: boolean) => void;
    setWeather: (weather: import('../../types').WeatherType) => void;
    setIsFoggy: (isFoggy: boolean) => void;
    setStats: (stats: any) => void;
    isSpectateMode?: boolean;
    inlineCategories: import('../../types').InlineCategoryConfig[];
    sendGMCP?: (pkg: string, data?: any) => void;
    sendCommand?: (cmd: string) => void;
    pendingGmcpCommRef?: React.MutableRefObject<{ sender: string; chan: string; msg?: string } | null>;
    gameTime: import('../../types').MumeTime | null;
    setGameTime: (time: import('../../types').MumeTime | null) => void;
}

export const useGmcpHandlers = (props: GmcpHandlersProps) => {
    const lastRoomNumRef = useRef<number | string | null>(null);
    const lastExitsRef = useRef<Record<string, any>>({});
    const lastRoomChangeTimeRef = useRef(0);
    const playerPositionRefInternal = useRef('standing');
    const playerPositionRef = props.playerPositionRef || playerPositionRefInternal;

    const { onRoomInfo, onRoomUpdateExits } = useGmcpRoom({
        ...props,
        playerPositionRef: playerPositionRef as any,
        lastRoomChangeTimeRef,
        lastRoomNumRef,
        lastExitsRef
    });

    const getCharNameFromId = useCallback((id: string | null | undefined): string | null => {
        if (!id) return null;
        const idString = String(id);
        const normalizedId = normalizeCombatantName(idString).toLowerCase();
        const match = Object.values(props.roomChars || {}).find(p =>
            String(p.id) === idString ||
            normalizeCombatantName(p.name).toLowerCase() === normalizedId ||
            normalizeCombatantName(p.keyword).toLowerCase() === normalizedId
        );
        return normalizeCombatantName(match?.name || match?.short || match?.keyword || idString);
    }, [props.roomChars]);

    React.useEffect(() => {
        if (!props.opponentId) return;
        const opponentName = getCharNameFromId(props.opponentId);
        if (opponentName && opponentName !== props.opponentId) {
            props.setOpponentName(opponentName);
        }
    }, [props.opponentId, props.roomChars, props.setOpponentName, getCharNameFromId]);

    const findStatus = useCallback((str: string | undefined): CombatHealthStatus | null => {
        if (!str) return null;
        const s = str.toLowerCase();
        if (s.includes('healthy')) return 'Healthy';
        if (s.includes('fine')) return 'Fine';
        if (s.includes('hurt')) return 'Hurt';
        if (s.includes('wounded')) return 'Wounded';
        if (s.includes('bad')) return 'Bad';
        if (s.includes('awful')) return 'Awful';
        if (s.includes('stunned')) return 'Stunned';
        if (s.includes('dying') || s.includes('bleeding')) return 'Dying';
        return null;
    }, []);

    const { onCharVitals, onCharInfo, onRoomCharsCombat } = useGmcpVitals({
        ...props,
        setCurrentWeather: props.setWeather,
        setIsFoggy: props.setIsFoggy,
        getCharNameFromId,
        findStatus,
        playerPositionRef: playerPositionRef as any
    });

    const { onRoomChars, onAddChar, onUpdateChar, onRemoveChar } = useGmcpOccupants({
        ...props,
        lastRoomChangeTimeRef,
        lastRoomNumRef
    });

    const { onGroupAdd, onGroupUpdate, onGroupRemove, onGroupSet } = useGmcpGroup({
        setGroupMembers: props.setGroupMembers,
        setStats: props.setStats,
        characterName: props.characterName
    });

    const onCharNameChange = useCallback((name: string | null) => {
        if (props.isSpectateMode) return; // Don't let user's name change affect spectate HUD
        
        if (props.characterName && name !== props.characterName) {
            props.setAbilities({});
            const msg = `Character changed to ${name}. Abilities reset.`;
            props.addMessage('system', msg, undefined, undefined, undefined, { textOnly: msg, lower: msg.toLowerCase() });
        }
        props.setCharacterName(name);
    }, [props.characterName, props.setAbilities, props.addMessage, props.setCharacterName, props.isSpectateMode]);

    const onComm = useCallback((_sender: string, _chan: string, _msg: string) => {
        // Comm bubbles are rendered from XML-tagged text lines only. GMCP comm
        // packets are intentionally ignored here because they can race ahead of
        // the visible line and cause the wrong log entry to become a bubble.
    }, []);

    const onEvent = useCallback((pkg: string, data: any) => {
        const pkgLower = pkg.toLowerCase();
        if (pkgLower === 'event.sun') {
            const secondsOfDay = typeof data === 'number' ? data : parseInt(data);
            if (!isNaN(secondsOfDay)) {
                const dayMinutes = secondsOfDay / 60;
                
                let daysElapsed = 0;
                if (props.gameTime) {
                    const monthIndex = MUME_MONTHS.indexOf(props.gameTime.month);
                    daysElapsed = (props.gameTime.year - 2850) * 360 + (monthIndex >= 0 ? monthIndex : 0) * 30 + (props.gameTime.day - 1);
                } else {
                    const defaultEpoch = 1517443173;
                    const elapsedMinutes = Math.floor(Date.now() / 1000 - defaultEpoch);
                    daysElapsed = Math.floor(elapsedMinutes / 1440);
                }

                const totalMinutes = daysElapsed * 1440 + dayMinutes;
                const calibratedEpoch = Math.floor(Date.now() / 1000) - totalMinutes;

                console.log(`[useGmcpHandlers] Calibrated starting epoch via Event.Sun: ${calibratedEpoch} (secondsOfDay: ${secondsOfDay})`);
                const newMumeTime = getMumeTimeFromEpoch(calibratedEpoch, Date.now());
                props.setGameTime(newMumeTime);
            }
        }
    }, [props.gameTime, props.setGameTime]);

    const onCharRide = useCallback((data: any) => {
        // console.log('[GMCP] Char.Ride:', data);
        const riding = data && (data.mount || data.mount_name || data.riding);
        const targetSetter = props.isSpectateMode ? props.setPlayerPosition : props.setPlayerPosition; // Wait, setPlayerPosition is already mapped in GameContext
        
        // props.setPlayerPosition is mapped to s.setSpectatePosition in GameContext when in spectate mode!
        
        if (riding) {
            if (props.setIsRiding) props.setIsRiding(true);
            props.setPlayerPosition('riding');
            props.setInCombat?.(false, true);
            props.setOpponentId(null);
            props.setOpponentName(null);
            props.setOpponentHealthStatus(null);
        } else {
            if (props.setIsRiding) props.setIsRiding(false);
            props.setPlayerPosition('standing');
        }
    }, [props.setIsRiding, props.setPlayerPosition, props.setInCombat, props.setOpponentId, props.setOpponentName, props.setOpponentHealthStatus, props.isSpectateMode]);

    return {
        onRoomInfo,
        onRoomUpdateExits,
        onRoomChars,
        onRoomPlayers: onRoomChars,
        onRoomNpcs: onRoomChars,
        onAddChar,
        onUpdateChar,
        onRemoveChar,
        onCharNameChange,
        onCharInfo,
        onCharStatusVars: onCharInfo,
        onCharStatus: onCharInfo,
        onBufferChange: (name: string | null) => props.setBufferName(name),
        onCharVitals,
        onComm,
        onEvent,
        onRoomCharsCombat,
        onPositionChange: (pos: string) => props.setPlayerPosition(pos),
        onGroupAdd,
        onGroupUpdate,
        onGroupRemove,
        onGroupSet,
        onMumeEdit: (data: GmcpMumeEdit) => {
            if (data && data.key) {
                props.setMumeEditState({
                    isOpen: true,
                    title: data.title || 'Mume Editor',
                    text: data.text || '',
                    key: data.key
                });
            }
        },
        onDisconnect: () => {
            props.setCharacterName(null);
            props.setGroupMembers([]);
            if (props.setRoomChars) props.setRoomChars({});
            if (props.setRoomItems) props.setRoomItems([]);
            props.setWhoList([]);
            props.setWhereList([]);
        },
        onCharRide,
        // State Setters (Mandatory for GmcpDecoder)
        setStats: props.setStats,
        setWeather: props.setWeather,
        setIsFoggy: props.setIsFoggy,
        setInCombat: props.setInCombat,
        detectLighting: props.detectLighting
    };
};
