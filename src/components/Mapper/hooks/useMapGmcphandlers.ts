/** @file Coordinates protocol arrival ownership and candidate-based mapper observations. */
import { useRef } from 'react';
import type { MapperTrackingInput, MapperMovementDetail } from '../../../types';
import { useRoomInfoHandler } from './useRoomInfoHandler';
import { useUpdateExitsHandler } from './useUpdateExitsHandler';
import { useTerrainHandler } from './useTerrainHandler';
import { getExitTargetId } from '../mapperUtils';
import { formatMovementArrow, normalizeMovementDirection } from '../../../utils/movementDirections';
import { useMapperMovementEvents } from './useMapperMovementEvents';
import { confirmXmlMovement } from './mapperXmlMovement';
import { useMapperRoomObservations } from './useMapperRoomObservations';

// --- Protocol coordination ---
export const useMapGmcphandlers = (props: MapperTrackingInput) => {
    const lastMovementLogRef = useRef<{ dir: string; time: number } | null>(null);
    const hasGmcpRoomsRef = useRef(false);
    const xmlConfirmedRef = useRef(false);
    const xmlUnresolvedDirection = useRef<string | null>(null);
    const pushPendingMove = (dir: string) => { props.pendingMovesRef.current.push({dir,time:Date.now()}); };
    const emitMovementLog = (dir: string | null | undefined) => {
        const normalized = normalizeMovementDirection(dir), arrow = formatMovementArrow(normalized);
        if (!arrow) return;
        const now = Date.now();
        if (lastMovementLogRef.current?.dir === arrow && now - lastMovementLogRef.current.time < 150) return;
        lastMovementLogRef.current = {dir:arrow,time:now};
        props.addMessage?.('movement', normalized || arrow);
    };
    const {handleRoomInfo:processRoomInfo, locationState} = useRoomInfoHandler({...props,onMoveConfirmed:emitMovementLog});
    const handleMoveConfirmed = (event?: CustomEvent<MapperMovementDetail>) => {
        const result = confirmXmlMovement(props,event,hasGmcpRoomsRef.current,xmlConfirmedRef,emitMovementLog,locationState.current.confidence === 'confirmed');
        if (result && event?.detail.source === 'xml') xmlUnresolvedDirection.current = result.target ? null : result.direction;
    };
    const takeMovementDirection = useMapperMovementEvents(direction => {
        const confirmed = xmlConfirmedRef.current;
        xmlConfirmedRef.current = false;
        const currentId = props.currentRoomIdRef.current;
        const tuple = currentId ? props.preloadedCoordsRef.current[currentId.replace(/^m_/, '')] : undefined;
        const exits = tuple?.[4] as Record<string, unknown> | undefined;
        const exit: unknown = exits?.[direction] ?? (currentId ? props.roomsRef.current[currentId]?.exits[direction] : null);
        const ambiguous = exit && typeof exit === 'object' && 'targets' in exit
            && (!Array.isArray(exit.targets) || exit.targets.length !== 1);
        const target = getExitTargetId(exit).replace(/^m_/, '');
        const known = target && (props.preloadedCoordsRef.current[target] || props.roomsRef.current[`m_${target}`]);
        if (confirmed || ambiguous || !known || locationState.current.confidence !== 'confirmed') {
            if (!confirmed) props.pendingMovesRef.current.shift();
            props.onRoomInfoProcessed?.(null);
            return;
        }
        processRoomInfo({num:0,name:''}, false, direction);
    }, props.activeView === 'self');
    const handleRoomInfo = useMapperRoomObservations(processRoomInfo,takeMovementDirection,hasGmcpRoomsRef,xmlConfirmedRef,xmlUnresolvedDirection,props.characterName);
    const updates = useUpdateExitsHandler(props);
    const terrain = useTerrainHandler(props);
    const handleUpdateExits = (...args: Parameters<typeof updates.handleUpdateExits>) => {
        if (locationState.current.confidence === 'confirmed') updates.handleUpdateExits(...args);
    };
    const handleTerrain = (...args: Parameters<typeof terrain.handleTerrain>) => {
        if (locationState.current.confidence === 'confirmed') terrain.handleTerrain(...args);
    };
    return {handleRoomInfo,handleUpdateExits,handleTerrain,pushPendingMove,handleMoveConfirmed,locationState};
};
