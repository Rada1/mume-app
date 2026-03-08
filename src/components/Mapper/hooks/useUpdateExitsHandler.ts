import { useCallback } from 'react';
import { MapperRoom } from '../mapperTypes';
import { DIRS } from '../mapperUtils';

interface UpdateExitsProps {
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
}

export const useUpdateExitsHandler = ({ setRooms, currentRoomIdRef, preloadedCoordsRef }: UpdateExitsProps) => {
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
                    const gmcpDestId = typeof update === 'number' ? update : (update.id || newExits[dir]?.gmcpDestId);
                    let name = typeof update === 'object' ? update.name : undefined;
                    let flags = typeof update === 'object' ? (update.flags || []) : undefined;

                    const nextFlags = (typeof update === 'object') ? (flags || []) : (newExits[dir]?.flags || []);
                    const exFlagsLow = nextFlags.map(f => f.toLowerCase());
                    const isClosed = exFlagsLow.includes('closed') || exFlagsLow.includes('locked');
                    const isDoor = isClosed || 
                        (typeof update === 'object' && (update as any).door) ||
                        !!name || // In MUME GMCP, if a name is provided, it's a door/vines/etc.
                        exFlagsLow.some(f => /door|gate|portcullis|secret/i.test(f));

                    newExits[dir] = {
                        ...newExits[dir],
                        name: name || newExits[dir]?.name,
                        flags: nextFlags,
                        gmcpDestId,
                        closed: isClosed,
                        hasDoor: !!isDoor
                    };

                    const targetId = newExits[dir]?.target;
                    const neighborId = targetId || (gmcpDestId ? (preloadedCoordsRef.current[String(gmcpDestId)] ? `m_${gmcpDestId}` : Object.keys(nextRooms).find(k => String(nextRooms[k].gmcpId) === String(gmcpDestId))) : null);

                    if (neighborId && nextRooms[neighborId]) {
                        const neighbor = nextRooms[neighborId];
                        const oppDir = DIRS[dir]?.opp;
                        if (oppDir) {
                            const neighborEx = neighbor.exits[oppDir];
                            if (neighborEx && (neighborEx.hasDoor || isDoor)) {
                                nextRooms[neighborId] = {
                                    ...neighbor,
                                    exits: {
                                        ...neighbor.exits,
                                        [oppDir]: {
                                            ...neighborEx,
                                            closed: isClosed,
                                            hasDoor: true,
                                            flags: nextFlags
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
    }, [currentRoomIdRef, setRooms, preloadedCoordsRef]);

    return { handleUpdateExits };
};