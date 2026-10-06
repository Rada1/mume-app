/** @file Walks mapped routes one confirmed room at a time, with immediate manual takeover. */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { MapperRoom } from '../mapperTypes';
import type { ExecuteCommand, NavigationMap } from '../../../types';
import { findSmartWalkPath, getSmartWalkDirection, normalizeSmartWalkId } from './smartWalkPath';
import { findCanonicalSmartWalkPath, getCanonicalSmartWalkDirection } from './canonicalSmartWalk';
import type { MapData } from '../performance/webcockpit/model';

// --- Logic Section ---
export const useSmartWalk = (
    currentRoomId: string | null,
    rooms: Record<string, MapperRoom>,
    executeCommand: ExecuteCommand,
    preloadedCoordsRef: React.MutableRefObject<NavigationMap>,
    addMessage?: (type: 'system', text: string) => void,
    revealAll?: boolean,
    exploredVnums?: Set<string>,
    canonicalMap?: MapData | null,
    isRiding = false,
    race?: string
) => {
    const [isWalking, setIsWalking] = useState(false);
    const [walkTargetId, setWalkTargetId] = useState<string | null>(null);
    const [walkPath, setWalkPath] = useState<string[]>([]);
    const activeRef = useRef(false);
    const sendingRef = useRef(false);
    const pathRef = useRef<string[]>([]);
    const lastRoomRef = useRef(currentRoomId);

    const stopWalking = useCallback(() => {
        // Cancel synchronously so a queued arrival cannot emit another command.
        activeRef.current = false;
        pathRef.current = [];
        setIsWalking(false);
        setWalkTargetId(null);
        setWalkPath([]);
    }, []);

    const cancelWithMessage = useCallback((message: string) => {
        if (!activeRef.current) return;
        stopWalking();
        addMessage?.('system', message);
    }, [stopWalking, addMessage]);

    const directionTo = useCallback((from: string, to: string) => canonicalMap
        ? getCanonicalSmartWalkDirection(canonicalMap, from, to, rooms)
        : getSmartWalkDirection(from, to, rooms, preloadedCoordsRef.current),
    [canonicalMap, rooms, preloadedCoordsRef]);

    const sendStep = useCallback((direction: string) => {
        if (!activeRef.current) return;
        sendingRef.current = true;
        try {
            executeCommand(direction, false, false, false, false, { fromUi: true, shouldFocus: false });
        } finally {
            sendingRef.current = false;
        }
    }, [executeCommand]);

    const startWalking = useCallback((targetId: string, _initialPath?: string[]) => {
        stopWalking();
        if (!currentRoomId || !targetId) {
            addMessage?.('system', 'Cannot walk: Current location unknown.');
            return;
        }
        // Recompute against current topology; search previews can contain stale
        // live exits, closed doors, or a route generated before mounting.
        const routeOptions = { riding: isRiding, revealAll, exploredVnums, race };
        const route = canonicalMap
            ? findCanonicalSmartWalkPath(canonicalMap, currentRoomId, targetId, rooms, routeOptions)
            : findSmartWalkPath(currentRoomId, targetId, rooms, preloadedCoordsRef.current, routeOptions);
        if (!route) {
            addMessage?.('system', 'No path found to that room.');
            return;
        }
        if (!route.dirs.length) {
            addMessage?.('system', 'You are already there.');
            return;
        }
        pathRef.current = route.ids;
        lastRoomRef.current = currentRoomId;
        activeRef.current = true;
        setWalkPath(route.ids);
        setWalkTargetId(targetId);
        setIsWalking(true);
        const key = normalizeSmartWalkId(targetId);
        const name = preloadedCoordsRef.current[key]?.[5] ?? rooms[targetId]?.name ?? key;
        addMessage?.('system', `Walking to: ${String(name)}...`);
        sendStep(route.dirs[0]);
    }, [stopWalking, currentRoomId, canonicalMap, rooms, preloadedCoordsRef, isRiding, revealAll, exploredVnums, race, addMessage, sendStep]);

    useEffect(() => {
        if (!activeRef.current || currentRoomId === lastRoomRef.current) return;
        lastRoomRef.current = currentRoomId;
        const expected = pathRef.current[1];
        if (!currentRoomId || !expected || normalizeSmartWalkId(currentRoomId) !== normalizeSmartWalkId(expected)) {
            cancelWithMessage('Autowalk stopped: the room did not match the planned route.');
            return;
        }
        const remaining = pathRef.current.slice(1);
        pathRef.current = remaining;
        setWalkPath(remaining);
        if (remaining.length < 2) {
            stopWalking();
            return;
        }
        const direction = directionTo(currentRoomId, remaining[1]);
        if (!direction) {
            cancelWithMessage('Autowalk stopped: the next exit is unavailable.');
            return;
        }
        sendStep(direction);
    }, [currentRoomId, directionTo, sendStep, stopWalking, cancelWithMessage]);

    useEffect(() => {
        const onCommand = (event: Event) => {
            const detail = (event as CustomEvent<{ isSystem?: boolean }>).detail;
            if (!sendingRef.current && !detail?.isSystem) {
                cancelWithMessage('Autowalk stopped. Switching to manual control.');
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') cancelWithMessage('Autowalk stopped.');
        };
        const onFailure = () => cancelWithMessage('Autowalk stopped: movement failed.');
        const onStopEvent = () => stopWalking();
        window.addEventListener('mume-command-sent', onCommand);
        window.addEventListener('mume:numpad-command-press', onCommand);
        window.addEventListener('keydown', onKey);
        window.addEventListener('mume-mapper-move-failed', onFailure);
        window.addEventListener('mume-autowalk-stop', onStopEvent);
        return () => {
            window.removeEventListener('mume-command-sent', onCommand);
            window.removeEventListener('mume:numpad-command-press', onCommand);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('mume-mapper-move-failed', onFailure);
            window.removeEventListener('mume-autowalk-stop', onStopEvent);
        };
    }, [cancelWithMessage, stopWalking]);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('mume-autowalk-state', {
            detail: { isWalking, remainingRooms: Math.max(0, walkPath.length - 1) }
        }));
    }, [isWalking, walkPath.length]);

    useEffect(() => () => { activeRef.current = false; }, []);
    return { isWalking, walkTargetId, walkPath, startWalking, stopWalking };
};
