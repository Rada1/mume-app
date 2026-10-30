/** @file XML-only movement consumes one queued response and follows only a known unique exit. */
import type { MutableRefObject } from 'react';
import type { MapperTrackingInput, MapperMovementDetail } from '../../../types';
import { getExitTargetId } from '../mapperUtils';
import { normalizeMovementDirection } from '../../../utils/movementDirections';

// --- XML arrival ownership ---
export function confirmXmlMovement(props: MapperTrackingInput, event: CustomEvent<MapperMovementDetail> | undefined,
    gmcpAvailable: boolean, xmlConfirmed: MutableRefObject<boolean>, emitMove: (dir: string | null) => void, locationTrusted = true) {
    const detail = event?.detail;
    if (detail?.source === 'gmcp' || gmcpAvailable || (detail?.source !== 'xml' && xmlConfirmed.current)) return;
    const pending = props.pendingMovesRef.current;
    const eventDir = normalizeMovementDirection(detail?.dir || null);
    const queued = pending.shift();
    const direction = eventDir || normalizeMovementDirection(queued?.dir || null);
    if (eventDir && queued && eventDir !== normalizeMovementDirection(queued.dir)) props.pendingMovesRef.current = [];
    let target: string | null = null;
    const currentId = props.currentRoomIdRef.current;
    if (direction && currentId && locationTrusted) {
        const mapped = props.preloadedCoordsRef.current[currentId.replace(/^m_/, '')];
        const exits = mapped?.[4] as Record<string, unknown> | undefined;
        const exit = props.roomsRef.current[currentId]?.exits[direction] || exits?.[direction];
        const ambiguous = exit && typeof exit === 'object' && 'targets' in exit
            && (!Array.isArray(exit.targets) || exit.targets.length !== 1);
        const raw = getExitTargetId(exit).replace(/^m_/, '');
        if (!ambiguous && raw && (props.preloadedCoordsRef.current[raw] || props.roomsRef.current[`m_${raw}`])) target = `m_${raw}`;
    }
    if (target) { props.currentRoomIdRef.current = target; props.setCurrentRoomId(target); }
    if (detail?.source === 'xml') xmlConfirmed.current = true;
    if (direction) emitMove(direction);
    props.onRoomInfoProcessed?.(target);
    if (props.preMoveRef) props.preMoveRef.current = null;
    if (props.clientPredictionsRef && !props.onRoomInfoProcessed) props.clientPredictionsRef.current = [];
    props.triggerRender?.();
    return {direction,target};
}
