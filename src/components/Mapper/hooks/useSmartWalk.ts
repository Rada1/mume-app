import { useState, useCallback, useRef, useEffect } from 'react';
import { MapperRoom } from '../mapperTypes';

export const useSmartWalk = (
    currentRoomId: string | null,
    rooms: Record<string, MapperRoom>,
    executeCommand: (cmd: string) => void,
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>,
    addMessage?: (type: any, text: string) => void
) => {
    const [isWalking, setIsWalking] = useState(false);
    const [walkTargetId, setWalkTargetId] = useState<string | null>(null);
    const [walkPath, setWalkPath] = useState<string[]>([]);
    const targetRoomIdRef = useRef<string | null>(null);
    const isHoldActiveRef = useRef(false);
    const lastRoomIdRef = useRef<string | null>(currentRoomId);

    const normalizeId = (id: string | null) => {
        if (!id) return '';
        if (id.startsWith('m_')) return id.substring(2);
        if (id.startsWith('r_')) return id.substring(2);
        return id;
    };

    const getExits = useCallback((id: string) => {
        if (!id) return null;

        const normId = normalizeId(id);
        
        // 1. Try local rooms with various ID formats (raw, prefixed, numeric)
        const local = rooms[id] || rooms[`m_${normId}`] || rooms[normId];
        if (local && local.exits && Object.keys(local.exits).length > 0) {
            return local.exits;
        }

        // 2. Try master map (remove m_ prefix if present)
        const ghost = preloadedCoordsRef.current[normId];
        if (ghost && ghost[4]) {
            const ghostExits = ghost[4] as Record<string, { target: string }>;
            const formatted: Record<string, any> = {};
            for (const [dir, ex] of Object.entries(ghostExits)) {
                // Ensure the ghost target is ALWAYS prefixed for our BFS
                const targetVnum = String(ex.target);
                formatted[dir] = { 
                    target: targetVnum.startsWith('m_') ? targetVnum : `m_${targetVnum}`, 
                    closed: false 
                };
            }
            return formatted;
        }
        return null;
    }, [rooms, preloadedCoordsRef]);

    const findPath = useCallback((startId: string, endId: string): { dirs: string[], ids: string[] } | null => {
        if (!startId || !endId) return null;
        const normStart = normalizeId(startId);
        const normEnd = normalizeId(endId);
        
        if (normStart === normEnd) return { dirs: [], ids: [startId] };

        console.group(`[SmartWalk] BFS Trace: ${startId} -> ${endId}`);
        console.log(`Normalized: ${normStart} -> ${normEnd}`);

        const queue: [string, string[], string[]][] = [[startId, [], [startId]]];
        const visited = new Set<string>([normStart]);

        let iterations = 0;
        while (queue.length > 0 && iterations < 3000) {
            iterations++;
            const [curr, dirs, ids] = queue.shift()!;
            
            const exits = getExits(curr);
            if (!exits) continue;

            for (const [dir, exit] of Object.entries(exits)) {
                if (!exit.target || exit.closed) continue;

                let nextId = String(exit.target);
                if (!nextId.startsWith('m_') && !nextId.startsWith('r_') && /^\d+$/.test(nextId)) {
                    nextId = `m_${nextId}`;
                }

                const normNext = normalizeId(nextId);

                if (normNext === normEnd) {
                    const finalDirs = [...dirs, dir];
                    const finalIds = [...ids, nextId];
                    console.log(`[SmartWalk] Success! Found path in ${iterations} steps:`, finalDirs);
                    console.groupEnd();
                    return { dirs: finalDirs, ids: finalIds };
                }

                if (!visited.has(normNext)) {
                    visited.add(normNext);
                    queue.push([nextId, [...dirs, dir], [...ids, nextId]]);
                }
            }
        }
        console.warn(`[SmartWalk] BFS Failed after ${iterations} iterations.`);
        console.groupEnd();
        return null;
    }, [getExits]);

    const stopWalking = useCallback(() => {
        setIsWalking(false);
        setWalkTargetId(null);
        setWalkPath([]);
        isHoldActiveRef.current = false;
        targetRoomIdRef.current = null;
    }, []);

    const startWalking = useCallback((targetId: string) => {
        if (!currentRoomId || !targetId) {
            if (!currentRoomId) addMessage?.('system', 'Cannot walk: Current location unknown.');
            return;
        }
        
        const normTarget = normalizeId(targetId);
        const normCurrent = normalizeId(currentRoomId);
        
        // Safety: If we're already walking to this target, don't restart (prevents command spam)
        if (isHoldActiveRef.current && targetRoomIdRef.current === targetId && isWalking) {
            return;
        }

        targetRoomIdRef.current = targetId;
        setWalkTargetId(targetId);
        isHoldActiveRef.current = true;
        setIsWalking(true);
        lastRoomIdRef.current = currentRoomId;

        const pathResult = findPath(currentRoomId, targetId);
        if (pathResult && pathResult.dirs.length > 0) {
            setWalkPath(pathResult.ids);
            const destRoom = rooms[targetId] || (targetId.startsWith('m_') ? null : rooms[`m_${targetId}`]);
            const destName = destRoom?.name || (preloadedCoordsRef.current[normTarget]?.[5]) || normTarget;
            addMessage?.('system', `Walking to: ${destName}...`);
            executeCommand(pathResult.dirs[0]);
        } else if (normCurrent === normTarget) {
            addMessage?.('system', 'You are already there.');
            stopWalking();
        } else {
            addMessage?.('system', 'No path found to that room.');
            stopWalking();
        }
    }, [currentRoomId, isWalking, findPath, executeCommand, stopWalking, addMessage, rooms, preloadedCoordsRef]);

    useEffect(() => {
        if (isWalking && isHoldActiveRef.current && currentRoomId && currentRoomId !== lastRoomIdRef.current) {
            lastRoomIdRef.current = currentRoomId;

            // Check if we reached the goal (using normalized IDs for stability)
            const normCurrent = normalizeId(currentRoomId);
            const normTarget = normalizeId(targetRoomIdRef.current);
            if (normCurrent === normTarget) {
                stopWalking();
                return;
            }

            // Recalculate path from current position
            const newPath = findPath(currentRoomId, targetRoomIdRef.current!);
            if (newPath && newPath.dirs.length > 0) {
                setWalkPath(newPath.ids);
                executeCommand(newPath.dirs[0]);
            } else {
                // If path is temporarily lost (e.g. room loading lag), wait ONE frame before stopping
                setTimeout(() => {
                    if (isHoldActiveRef.current && isWalking) {
                        const retryPath = findPath(currentRoomId, targetRoomIdRef.current!);
                        if (retryPath && retryPath.dirs.length > 0) {
                            setWalkPath(retryPath.ids);
                            executeCommand(retryPath.dirs[0]);
                        } else {
                            stopWalking();
                        }
                    }
                }, 100);
            }
        }
    }, [currentRoomId, isWalking, findPath, executeCommand, stopWalking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isHoldActiveRef.current = false;
        };
    }, []);

    return { isWalking, walkTargetId, walkPath, startWalking, stopWalking };
};
