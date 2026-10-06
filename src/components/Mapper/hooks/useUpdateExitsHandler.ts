import { useCallback } from 'react';
import { MapperRoom } from '../mapperTypes';
import { DIRS } from '../mapperUtils';
import { mergeExitDoorState } from './exitDoorState';

interface UpdateExitsProps {
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    triggerRender?: () => void;
}

export const useUpdateExitsHandler = ({ setRooms, currentRoomIdRef, preloadedCoordsRef, serverIdIndexRef, triggerRender }: UpdateExitsProps) => {
    const handleUpdateExits = useCallback((data: any) => {
        const activeId = currentRoomIdRef.current;
        if (!activeId) return;

        const exitUpdates = data.exits || data;

        setRooms(prev => {
            const activeRoom = prev[activeId];
            if (!activeRoom) return prev;

            const nextRooms = { ...prev };
            const newExits = { ...activeRoom.exits };

            for (const dir in exitUpdates) {
                const update = exitUpdates[dir];
                if (update === false) delete newExits[dir];
                else {
                    const existingExit = newExits[dir];
                    const gmcpDestId = typeof update === 'number' ? update : (update.id || existingExit?.gmcpDestId);
                    const doorState = mergeExitDoorState(existingExit, update, true);

                    newExits[dir] = {
                        ...existingExit,
                        ...doorState,
                        gmcpDestId,
                    };

                    const targetId = newExits[dir]?.target;
                    const mappedId = gmcpDestId ? serverIdIndexRef.current[String(gmcpDestId)] : undefined;
                    const neighborId = mappedId ? `m_${mappedId}` : targetId || (gmcpDestId ? Object.keys(nextRooms).find(k => String(nextRooms[k].gmcpId) === String(gmcpDestId)) : null);
                    if (neighborId) newExits[dir].target = neighborId;

                    if (neighborId && nextRooms[neighborId]) {
                        const neighbor = nextRooms[neighborId];
                        const oppDir = DIRS[dir]?.opp;
                        if (oppDir) {
                            const neighborEx = neighbor.exits[oppDir];
                            if (neighborEx && (neighborEx.hasDoor || doorState.hasDoor)) {
                                nextRooms[neighborId] = {
                                    ...neighbor,
                                    exits: {
                                        ...neighbor.exits,
                                        [oppDir]: {
                                            ...neighborEx,
                                            closed: doorState.closed,
                                            hasDoor: true,
                                            flags: doorState.flags
                                        }
                                    }
                                };
                            }
                        }
                    }
                }
            }

            nextRooms[activeId] = { ...activeRoom, exits: newExits };
            return nextRooms;
        });
        triggerRender?.();
    }, [currentRoomIdRef, setRooms, preloadedCoordsRef, serverIdIndexRef, triggerRender]);

    return { handleUpdateExits };
};
