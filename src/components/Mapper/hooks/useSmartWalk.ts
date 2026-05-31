/**
 * @file useSmartWalk.ts
 * @description Custom hook providing optimized pathfinding and smart-walk capabilities.
 * Uses A* (A-Star) search with coordinate heuristics for high performance.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MapperRoom } from '../mapperTypes';
import { ExecuteCommand } from '../../../types';
import { findSmartWalkPath, getSmartWalkDirection, normalizeSmartWalkId } from './smartWalkPath';

export const useSmartWalk = (
    currentRoomId: string | null,
    rooms: Record<string, MapperRoom>,
    executeCommand: ExecuteCommand,
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>,
    addMessage?: (type: any, text: string) => void,
    revealAll?: boolean,
    exploredVnums?: Set<string>
) => {
    const [isWalking, setIsWalking] = useState(false);
    const [walkTargetId, setWalkTargetId] = useState<string | null>(null);
    const [walkPath, setWalkPath] = useState<string[]>([]);
    const targetRoomIdRef = useRef<string | null>(null);
    const isHoldActiveRef = useRef(false);
    const lastRoomIdRef = useRef<string | null>(currentRoomId);

    // --- Helpers Section ---

    const normalizeId = normalizeSmartWalkId;

    const getDirectionToNextRoom = useCallback((fromId: string, toId: string): string | null => {
        return getSmartWalkDirection(fromId, toId, rooms, preloadedCoordsRef.current);
    }, [rooms, preloadedCoordsRef]);

    // --- Pathfinding Section ---

    const findPath = useCallback((startId: string, endId: string): { dirs: string[], ids: string[] } | null => {
        if (!startId || !endId) return null;
        const normStart = normalizeId(startId);
        const normEnd = normalizeId(endId);
        
        if (normStart === normEnd) return { dirs: [], ids: [startId] };

        return findSmartWalkPath(startId, endId, rooms, preloadedCoordsRef.current, {
            revealAll,
            exploredVnums
        });
    }, [rooms, preloadedCoordsRef, revealAll, exploredVnums]);

    // --- Control Section ---

    const stopWalking = useCallback(() => {
        setIsWalking(false);
        setWalkTargetId(null);
        setWalkPath([]);
        isHoldActiveRef.current = false;
        targetRoomIdRef.current = null;
    }, []);

    const startWalking = useCallback((targetId: string, initialPath?: string[]) => {
        if (!currentRoomId || !targetId) {
            if (!currentRoomId) addMessage?.('system', 'Cannot walk: Current location unknown.');
            return;
        }
        
        const normTarget = normalizeId(targetId);
        const normCurrent = normalizeId(currentRoomId);
        
        if (isHoldActiveRef.current && targetRoomIdRef.current === targetId && isWalking) {
            return;
        }

        targetRoomIdRef.current = targetId;
        setWalkTargetId(targetId);
        isHoldActiveRef.current = true;
        setIsWalking(true);
        lastRoomIdRef.current = currentRoomId;

        let pathResult: { dirs: string[], ids: string[] } | null = null;

        if (initialPath && initialPath.length > 1) {
            const normPathStart = normalizeId(initialPath[0]);
            const normPathEnd = normalizeId(initialPath[initialPath.length - 1]);
            
            if (normPathStart === normCurrent && normPathEnd === normTarget) {
                const nextRoomId = initialPath[1];
                const dir = getDirectionToNextRoom(currentRoomId, nextRoomId);
                if (dir) {
                    pathResult = {
                        dirs: [dir],
                        ids: initialPath
                    };
                }
            }
        }

        if (!pathResult) {
            pathResult = findPath(currentRoomId, targetId);
        }

        if (pathResult && pathResult.ids.length > 1) {
            setWalkPath(pathResult.ids);
            const destRoom = rooms[targetId] || (targetId.startsWith('m_') ? null : rooms[`m_${targetId}`]);
            const destName = destRoom?.name || (preloadedCoordsRef.current[normTarget]?.[5]) || normTarget;
            addMessage?.('system', `Walking to: ${destName}...`);
            
            const nextDir = pathResult.dirs[0] || getDirectionToNextRoom(currentRoomId, pathResult.ids[1]);
            if (nextDir) {
                executeCommand(nextDir, false, false, false, false, { fromUi: true });
            } else {
                stopWalking();
            }
        } else if (normCurrent === normTarget) {
            addMessage?.('system', 'You are already there.');
            stopWalking();
        } else {
            addMessage?.('system', 'No path found to that room.');
            stopWalking();
        }
    }, [currentRoomId, isWalking, findPath, executeCommand, stopWalking, addMessage, rooms, preloadedCoordsRef, getDirectionToNextRoom]);

    useEffect(() => {
        if (isWalking && isHoldActiveRef.current && currentRoomId && currentRoomId !== lastRoomIdRef.current) {
            lastRoomIdRef.current = currentRoomId;

            if (!targetRoomIdRef.current) {
                stopWalking();
                return;
            }

            const normCurrent = normalizeId(currentRoomId);
            const normTarget = normalizeId(targetRoomIdRef.current);
            if (normCurrent === normTarget) {
                stopWalking();
                return;
            }

            let advancedPath: string[] | null = null;
            if (walkPath.length > 1) {
                const normExpectedNext = normalizeId(walkPath[1]);
                if (normCurrent === normExpectedNext) {
                    advancedPath = walkPath.slice(1);
                } else if (walkPath.length > 2 && normCurrent === normalizeId(walkPath[2])) {
                    advancedPath = walkPath.slice(2);
                }
            }

            if (advancedPath && advancedPath.length > 1) {
                setWalkPath(advancedPath);
                const nextRoomId = advancedPath[1];
                const nextDir = getDirectionToNextRoom(currentRoomId, nextRoomId);
                if (nextDir) {
                    executeCommand(nextDir, false, false, false, false, { fromUi: true });
                    return;
                }
            }

            const newPath = findPath(currentRoomId, targetRoomIdRef.current);
            if (newPath && newPath.dirs.length > 0) {
                setWalkPath(newPath.ids);
                executeCommand(newPath.dirs[0], false, false, false, false, { fromUi: true });
            } else {
                setTimeout(() => {
                    if (isHoldActiveRef.current && isWalking && targetRoomIdRef.current) {
                        const retryPath = findPath(currentRoomId, targetRoomIdRef.current);
                        if (retryPath && retryPath.dirs.length > 0) {
                            setWalkPath(retryPath.ids);
                            executeCommand(retryPath.dirs[0], false, false, false, false, { fromUi: true });
                        } else {
                            stopWalking();
                        }
                    }
                }, 100);
            }
        }
    }, [currentRoomId, isWalking, findPath, executeCommand, stopWalking, walkPath, getDirectionToNextRoom]);

    useEffect(() => {
        return () => {
            isHoldActiveRef.current = false;
        };
    }, []);

    return { isWalking, walkTargetId, walkPath, startWalking, stopWalking };
};
