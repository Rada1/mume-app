/** @file Correlates arrivals once, then resolves identity through the shared location machine. */
import type { GmcpRoomInfo, MapperRoom } from '../mapperTypes';
import type { MapperRoomInfoProps, MapperLocationState } from '../../../types';
import { getExitTargetId, stripAnsi } from '../mapperUtils';
import { getMatchRoom } from '../roomObservationIndex';
import { locateRoomObservation, createRoomLocationState } from '../roomLocationMachine';
import { normalizeMovementDirection } from '../../../utils/movementDirections';

// --- Shared room projection ---
function activeRoom(props: MapperRoomInfoProps, id: string | null): MapperRoom | null {
    if (!id) return null;
    if (props.roomsRef.current[id]) return props.roomsRef.current[id];
    const match = getMatchRoom(props, id);
    if (!match) return null;
    return {...match,gmcpId:match.serverId,zone:match.area,notes:'',createdAt:0,
        exits:Object.fromEntries(Object.entries(match.exits).map(([dir,exit]) => {
            const target = getExitTargetId(exit).replace(/^m_/, '');
            return [dir,{target:target ? `m_${target}` : '',gmcpDestId:Number(props.preloadedCoordsRef.current[target]?.[6]) || 0,
                closed:false,hasDoor:typeof exit === 'object' && exit.hasDoor,flags:typeof exit === 'object' ? exit.flags : [],
                doorFlags:typeof exit === 'object' ? exit.doorFlags : [],
                targets:typeof exit === 'object' ? exit.targets?.map(id => `m_${String(id).replace(/^m_/, '')}`) : undefined}];
        }))};
}

// --- Arrival ownership is independent of matching confidence ---
export function resolveMovingRoom(props: MapperRoomInfoProps, data: GmcpRoomInfo, movementAlreadyConfirmed: boolean,
    confirmedDirection?: string | null, location = createRoomLocationState()) {
    const gmcpId = Number(data.num ?? data.vnum ?? data.id ?? 0);
    const gmcpName = stripAnsi(data.name) || 'Unknown Room';
    const isVnumZero = !Number.isFinite(gmcpId) || gmcpId < 1;
    const isSpectateUpdate = data.spectating === true, isTextRoomEvent = data.source === 'text';
    const isScoutObservation = data.scouting === true && !isSpectateUpdate;
    const activeRoomId = props.currentRoomIdRef.current;
    const currentActiveRoom = activeRoom(props, activeRoomId);
    const idChanged = !currentActiveRoom || currentActiveRoom.gmcpId !== gmcpId;
    const pending = props.pendingMovesRef.current;
    const isLikelyMove = !movementAlreadyConfirmed && !isSpectateUpdate && !isScoutObservation
        && ((!isVnumZero && idChanged) || (confirmedDirection !== undefined ? confirmedDirection !== null
            : (!isVnumZero ? idChanged : pending.length > 0)));
    let dirUsed: string | null = movementAlreadyConfirmed ? normalizeMovementDirection(confirmedDirection || null) : null;
    if (isLikelyMove) {
        dirUsed = normalizeMovementDirection(confirmedDirection || null);
        if (!dirUsed && !isVnumZero && currentActiveRoom) {
            dirUsed = Object.keys(currentActiveRoom.exits).find(dir => currentActiveRoom.exits[dir].gmcpDestId === gmcpId) || null;
        }
        const queued = pending.shift();
        if (!dirUsed) dirUsed = normalizeMovementDirection(queued?.dir || null);
        else if (queued && normalizeMovementDirection(queued.dir) !== dirUsed) props.pendingMovesRef.current = [];
        if (dirUsed && queued) props.onMoveConfirmed?.(dirUsed);
    }
    // Scout/spectate candidates must never mutate the player's confidence or paths.
    const state: MapperLocationState = isSpectateUpdate || isScoutObservation ? createRoomLocationState() : location;
    const match = locateRoomObservation(props, state, data, isScoutObservation ? null : activeRoomId, dirUsed);
    const matchedInternalId = match.id?.startsWith('m_') && props.preloadedCoordsRef.current[match.id.substring(2)]
        ? match.id.substring(2) : null;
    return {gmcpId,gmcpName,targetId:match.id,ghostData:matchedInternalId ? props.preloadedCoordsRef.current[matchedInternalId] : null,
        matchedInternalId,discoverySource:match.source,isSpectateUpdate,isTextRoomEvent,isScoutObservation,
        activeRoomId,currentActiveRoom,now:Date.now(),dirUsed,isVnumZero,isLikelyMove,isRelocation:match.relocation};
}
