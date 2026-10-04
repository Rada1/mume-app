/** @file useRoomDrinkWater.ts — Current room water availability for drink menus. */

import { useMemo } from 'react';
import { useMapper } from '../context/useMapper';
import { useRoomStore } from '../stores/useRoomStore';
import { getMapperRoomFlags, hasDrinkableRoomWater } from '../utils/roomWaterUtils';

// --- Logic Section ---

export const useRoomDrinkWater = (): boolean => {
    const terrain = useRoomStore(state => state.terrain);
    const mapper = useMapper();
    const roomFlags = useMemo(() => getMapperRoomFlags(
        mapper.currentRoomId,
        mapper.rooms,
        mapper.preloadedCoordsRef.current || {}
    ), [mapper.currentRoomId, mapper.preloadedCoordsRef, mapper.renderVersion, mapper.rooms]);
    const rawRoomId = String(mapper.currentRoomId || '').replace(/^m_/, '');
    const mappedTerrain = mapper.rooms[mapper.currentRoomId || '']?.terrain
        || mapper.rooms[`m_${rawRoomId}`]?.terrain
        || mapper.rooms[rawRoomId]?.terrain;
    return hasDrinkableRoomWater(terrain || mappedTerrain, roomFlags);
};
