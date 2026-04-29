import React, { useCallback } from 'react';
import { GmcpOccupant, GmcpRoomInfo, GmcpUpdateExits } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import { gmcpBus } from '../../events/gmcpBus';

interface UseGmcpRoomProps {
    mapperRef: React.RefObject<MapperRef>;
    setCurrentTerrain: (terrain: string) => void;
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    setRoomZone: (zone: string | null) => void;
    setRoomExits: (exits: string[]) => void;
    setRoomChars?: React.Dispatch<React.SetStateAction<Record<number, import('../../types').GmcpOccupant>>>;
    setRoomItems?: React.Dispatch<React.SetStateAction<import('../../types').GmcpOccupant[]>>;
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
    sendGMCP?: (pkg: string, data?: any) => void;
}

const normalizeRoomObjectName = (name: string) => name
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, '')
    .replace(/^(?:a|an|the|some)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]$/g, '')
    .trim();

const parseRoomItemsFromDescription = (desc?: string | null): GmcpOccupant[] => {
    if (!desc) return [];

    const items: GmcpOccupant[] = [];
    const matcher = /<object\b[^>]*>(.*?)<\/object>/gis;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(desc)) !== null) {
        const name = normalizeRoomObjectName(match[1]);
        const label = name || 'object';

        items.push({
            id: `roomitems:${label}:${items.length}`,
            name: label,
            short: label
        });
    }

    return items;
};

export const useGmcpRoom = ({
    mapperRef,
    setCurrentTerrain,
    setRoomName,
    setRoomDesc,
    setRoomZone,
    setRoomExits,
    setRoomItems,
    setRoomChars,
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
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mume-gmcp-room-info', { detail: data }));
            
            const terrain = data.terrain || data.environment;
            if (terrain) {
                window.dispatchEvent(new CustomEvent('mume-gmcp-terrain', { detail: terrain }));
            }
        }

        const roomNum = data.num || data.id || data.vnum;
        const roomChanged = roomNum !== undefined && roomNum !== lastRoomNumRef.current;
        lastRoomNumRef.current = roomNum ?? null;

        if (roomChanged) {
            console.groupCollapsed(`[GMCP Room.Entry] ${data.name || '(unnamed room)'} #${roomNum ?? '?'}`);
            console.log('Room.Info raw:', data);
            console.log('Room.Info summary:', {
                roomNum,
                name: data.name,
                zone: data.zone || data.area,
                terrain: data.terrain || data.environment,
                exits: data.exits ? Object.keys(data.exits) : []
            });
            console.log('Occupant GMCP watch: waiting for server-pushed Room.Chars/Add/Update/Remove packets.');
            console.groupEnd();
        }

        const terrain = data.terrain || data.environment;
        if (terrain) setCurrentTerrain(terrain);
        if (data.name) setRoomName(data.name);
        if (data.desc !== undefined && setRoomDesc) setRoomDesc(data.desc);
        if (roomDescRef) (roomDescRef as { current: string }).current = data.desc || '';

        let zone = data.zone || data.area;
        if (!zone && roomNum !== undefined && (mapperRef.current as any)?.serverIdIndexRef?.current) {
            const vnum = mapperRef.current.serverIdIndexRef.current[String(roomNum)];
            const staticData = vnum ? mapperRef.current.preloadedCoordsRef.current[vnum] : null;
            if (staticData && staticData[9]) {
                zone = staticData[9];
            }
        }
        if (zone) setRoomZone(zone);

        // --- Store Sync ---
        gmcpBus.emit('Room.Info', { ...data, zone, isSnooped: false });

        // Drive lighting from GMCP Room Info
        const light = data.light ?? data.l;
        if (light !== undefined && light !== null && detectLighting) {
            detectLighting(light);
        }

        if (data.exits) {
            setRoomExits(Object.keys(data.exits));
            lastExitsRef.current = data.exits;
        }

        if (roomChanged) {
            lastRoomChangeTimeRef.current = Date.now();
            
            // Clear occupants and items for the new room so that text processing
            // doesn't use stale data from the previous room.
            setRoomItems?.(parseRoomItemsFromDescription(data.desc));
            setRoomChars?.({});
            
            // if (playMovementSound) {
            //     // Determine riding status: if spectating, we can check Room.Chars or fallback.
            //     const isRiding = isRidingRef?.current || playerPositionRef.current === 'riding' || playerPositionRef.current === 'mounted';
            //     playMovementSound(isRiding);
            // }
        }
    }, [mapperRef, setCurrentTerrain, setRoomName, setRoomDesc, setRoomExits, setRoomZone, setRoomItems, setRoomChars, setDiscoveredItems, playMovementSound, isSpectateMode, detectLighting, isRidingRef, playerPositionRef, lastRoomChangeTimeRef, lastRoomNumRef, lastExitsRef, roomDescRef]);

    const onRoomUpdateExits = useCallback((data: GmcpUpdateExits) => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-gmcp-room-exits', { detail: data }));
        
        // --- Store Sync ---
        gmcpBus.emit('Room.UpdateExits', { ...data, isSnooped: false });

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
