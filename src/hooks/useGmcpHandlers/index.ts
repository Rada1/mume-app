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

interface GmcpHandlersProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    setDiscoveredItems: (items: string[]) => void;
    characterName: string | null;
    setAbilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => void;
    setCharacterName: (name: string | null) => void;
    setRoomName: (name: string | null) => void;
    setPlayerPosition: (pos: string) => void;
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
    roomPlayers: GmcpOccupant[];
    roomNpcs: GmcpOccupant[];
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
        const match = [...props.roomPlayers, ...props.roomNpcs].find(p =>
            p.id === id || p.name?.toLowerCase() === id.toLowerCase() || p.keyword?.toLowerCase() === id.toLowerCase()
        );
        return match?.name || match?.short || match?.keyword || id;
    }, [props.roomPlayers, props.roomNpcs]);

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

    const { onRoomPlayers, onRoomNpcs, onRoomItems, onAddPlayer, onAddNpc, onRemovePlayer, onRemoveNpc } = useGmcpOccupants({
        ...props,
        lastRoomChangeTimeRef
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
        // Comm messages arrive via plain text through processLine; the GMCP metadata
        // (sender, chan) is forwarded via pendingGmcpCommRef in GameContext before the
        // text line is processed, so no addMessage call is needed here.
    }, []);

    const onCharRide = useCallback((data: any) => {
        console.log('[GMCP] Char.Ride:', data);
        const riding = data && (data.mount || data.mount_name || data.riding);
        const targetSetter = props.isSpectateMode ? props.setPlayerPosition : props.setPlayerPosition; // Wait, setPlayerPosition is already mapped in GameContext
        
        // props.setPlayerPosition is mapped to s.setSpectatePosition in GameContext when in spectate mode!
        
        if (riding) {
            if (props.setIsRiding) props.setIsRiding(true);
            props.setPlayerPosition('riding');
        } else {
            if (props.setIsRiding) props.setIsRiding(false);
            props.setPlayerPosition('standing');
        }
    }, [props.setIsRiding, props.setPlayerPosition, props.isSpectateMode]);

    return {
        onRoomInfo,
        onRoomUpdateExits,
        onRoomPlayers,
        onRoomNpcs,
        onRoomItems,
        onAddPlayer,
        onAddNpc,
        onRemovePlayer,
        onRemoveNpc,
        onCharNameChange,
        onCharInfo,
        onBufferChange: (name: string | null) => props.setBufferName(name),
        onCharVitals,
        onComm,
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
            props.setRoomPlayers([]);
            props.setRoomNpcs([]);
            props.setRoomItems([]);
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
