import React, { useCallback, useRef } from 'react';
import { GmcpRoomInfo, GmcpUpdateExits } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';

interface UseGmcpRoomProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    setRoomZone: (zone: string | null) => void;
    setRoomExits: (exits: string[]) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<import('../../types').GmcpOccupant[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<import('../../types').GmcpOccupant[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<import('../../types').GmcpOccupant[]>>;
    setDiscoveredItems: (items: string[]) => void;
    roomDescRef?: React.RefObject<string>;
    detectLighting?: (symbol: string | number) => void;
    playMovementSound?: (isRiding: boolean) => void;
    playDoorSound?: (isOpen: boolean) => void;
    isSpectateMode?: boolean;
    isRidingRef?: React.RefObject<boolean>;
    playerPositionRef: React.MutableRefObject<string>;
    lastRoomChangeTimeRef: React.MutableRefObject<number>;
    lastRoomNumRef: React.MutableRefObject<number | string | null>;
    lastExitsRef: React.MutableRefObject<Record<string, any>>;
}

export const useGmcpRoom = ({
    mapperRef,
    setCurrentTerrain,
    setRoomName,
    setRoomDesc,
    setRoomZone,
    setRoomExits,
    setRoomPlayers,
    setRoomNpcs,
    setRoomItems,
    setDiscoveredItems,
    roomDescRef,
    detectLighting,
    playMovementSound,
    playDoorSound,
    isSpectateMode,
    isRidingRef,
    playerPositionRef,
    lastRoomChangeTimeRef,
    lastRoomNumRef,
    lastExitsRef
}: UseGmcpRoomProps) => {

    const onRoomInfo = useCallback((data: GmcpRoomInfo) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-room-info', { detail: data }));

        const roomNum = data.num || data.id || data.vnum;
        const roomChanged = roomNum !== undefined && roomNum !== lastRoomNumRef.current;
        lastRoomNumRef.current = roomNum ?? null;

        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
        if (data.name) setRoomName(data.name);
        if (data.desc !== undefined && setRoomDesc) setRoomDesc(data.desc);
        if (roomDescRef) (roomDescRef as { current: string }).current = data.desc || '';

        let zone = data.zone || data.area;
        if (!zone && roomNum !== undefined && mapperRef.current?.preloadedCoordsRef?.current) {
            const staticData = mapperRef.current.preloadedCoordsRef.current[String(roomNum)];
            if (staticData && staticData[9]) {
                zone = staticData[9];
            }
        }
        if (zone) setRoomZone(zone);

        // Drive lighting from GMCP Room Info
        const light = data.light ?? data.l;
        if (light !== undefined && light !== null && detectLighting) {
            detectLighting(light);
        }

        if (data.exits) {
            setRoomExits(Object.keys(data.exits));
            lastExitsRef.current = data.exits;
        }

        // Always clear items on Room.Info to ensure 'look' resyncs objects correctly.
        setRoomItems([]);
        setDiscoveredItems([]);

        if (roomChanged) {
            // Only clear occupants when physically moving rooms.
            setRoomPlayers([]);
            setRoomNpcs([]);
            lastRoomChangeTimeRef.current = Date.now();
            if (playMovementSound) {
                // Determine riding status: if spectating, we can check Room.Chars or fallback.
                const isRiding = isRidingRef?.current || playerPositionRef.current === 'riding' || playerPositionRef.current === 'mounted';
                playMovementSound(isRiding);
            }
        }
    }, [mapperRef, setCurrentTerrain, setRoomName, setRoomDesc, setRoomExits, setRoomZone, setRoomPlayers, setRoomNpcs, setRoomItems, setDiscoveredItems, playMovementSound, isSpectateMode, detectLighting, isRidingRef, playerPositionRef, lastRoomChangeTimeRef, lastRoomNumRef, lastExitsRef, roomDescRef]);

    const onRoomUpdateExits = useCallback((data: GmcpUpdateExits) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-update-exits', { detail: data }));
        if (data.exits) {
            console.log('[GMCP] Room.UpdateExits:', data.exits);
            // Door detection logic
            if (playDoorSound) {
                const oldExits = lastExitsRef.current;
                const newExits = data.exits;

                // Track total visible/open exits
                const getVisibleCount = (ex: Record<string, any>) =>
                    Object.values(ex).filter(v => v !== false && (typeof v !== 'object' || !v.flags?.includes('closed'))).length;

                const oldVisibleCount = getVisibleCount(oldExits);
                const newVisibleCount = getVisibleCount(newExits);

                console.log('[GMCP] Door Detection:', { oldVisibleCount, newVisibleCount, oldExits: Object.keys(oldExits), newExits: Object.keys(newExits) });

                if (newVisibleCount > oldVisibleCount) {
                    console.log('[GMCP] Triggering Door Open');
                    playDoorSound(true);
                } else if (newVisibleCount < oldVisibleCount) {
                    console.log('[GMCP] Triggering Door Close');
                    playDoorSound(false);
                }
            }

            lastExitsRef.current = data.exits;
            setRoomExits(Object.keys(data.exits));
        }
    }, [setRoomExits, playDoorSound, isSpectateMode, lastExitsRef]);

    return { onRoomInfo, onRoomUpdateExits };
};
