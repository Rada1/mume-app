import { useState, useCallback, useRef, useEffect } from 'react';
import { MapperRoom } from '../mapperTypes';

export const useSmartWalk = (
    currentRoomId: string | null,
    rooms: Record<string, MapperRoom>,
    executeCommand: (cmd: string) => void,
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>
) => {
    const [isWalking, setIsWalking] = useState(false);
    const targetRoomIdRef = useRef<string | null>(null);
    const isHoldActiveRef = useRef(false);
    const lastRoomIdRef = useRef<string | null>(currentRoomId);

    const getExits = useCallback((id: string) => {
        // 1. Try local rooms
        const local = rooms[id];
        if (local && local.exits) return local.exits;

        // 2. Try master map (remove m_ prefix if present)
        const vnum = id.startsWith('m_') ? id.substring(2) : id;
        const ghost = preloadedCoordsRef.current[vnum];
        if (ghost && ghost[4]) {
            const ghostExits = ghost[4] as Record<string, { target: string }>;
            const formatted: Record<string, any> = {};
            for (const [dir, ex] of Object.entries(ghostExits)) {
                formatted[dir] = { target: `m_${ex.target}`, closed: false };
            }
            return formatted;
        }
        return null;
    }, [rooms, preloadedCoordsRef]);

    const normalizeId = (id: string) => id.startsWith('m_') ? id.substring(2) : id;

    const findPath = useCallback((startId: string, endId: string): string[] | null => {
        if (!startId || !endId) return null;
        if (normalizeId(startId) === normalizeId(endId)) return [];

        const queue: [string, string[]][] = [[startId, []]];
        const visited = new Set<string>([normalizeId(startId)]);

        let iterations = 0;
        while (queue.length > 0 && iterations < 5000) {
            iterations++;
            const [curr, path] = queue.shift()!;
            const exits = getExits(curr);
            if (!exits) continue;

            for (const [dir, exit] of Object.entries(exits)) {
                if (!exit.target || exit.closed) continue;

                const nextId = exit.target;
                const normNext = normalizeId(nextId);
                const normEnd = normalizeId(endId);

                if (normNext === normEnd) return [...path, dir];
                if (!visited.has(normNext)) {
                    visited.add(normNext);
                    queue.push([nextId, [...path, dir]]);
                }
            }
        }
        return null;
    }, [getExits]);

    const stopWalking = useCallback(() => {
        setIsWalking(false);
        isHoldActiveRef.current = false;
        targetRoomIdRef.current = null;
    }, []);

    const startWalking = useCallback((targetId: string) => {
        if (!currentRoomId || !targetId) return;

        targetRoomIdRef.current = targetId;
        isHoldActiveRef.current = true;
        setIsWalking(true);
        lastRoomIdRef.current = currentRoomId;

        const path = findPath(currentRoomId, targetId);
        if (path && path.length > 0) {
            executeCommand(path[0]);
        } else if (normalizeId(currentRoomId) === normalizeId(targetId)) {
            stopWalking();
        }
    }, [currentRoomId, findPath, executeCommand, stopWalking]);

    useEffect(() => {
        if (isWalking && isHoldActiveRef.current && currentRoomId && currentRoomId !== lastRoomIdRef.current) {
            lastRoomIdRef.current = currentRoomId;

            if (normalizeId(currentRoomId) === normalizeId(targetRoomIdRef.current || '')) {
                stopWalking();
                return;
            }

            const newPath = findPath(currentRoomId, targetRoomIdRef.current!);
            if (newPath && newPath.length > 0) {
                executeCommand(newPath[0]);
            } else {
                stopWalking();
            }
        }
    }, [currentRoomId, isWalking, findPath, executeCommand, stopWalking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isHoldActiveRef.current = false;
        };
    }, []);

    return { isWalking, startWalking, stopWalking };
};
