/** @file roomWaterUtils.ts — Room water detection for drink targets and actions. */

import type { MapperRoom } from '../components/Mapper/mapperTypes';

// --- Logic Section ---

const isWaterFlag = (flag: string): boolean => /water|pond|well|fountain/i.test(flag);

export const hasDrinkableRoomWater = (terrain: string | null | undefined, flags: string[] = []): boolean => {
    const normalizedTerrain = (terrain || '').toLowerCase().trim();
    const hasWaterTerrain = /(^|[\s_-])(water|underwater|rapids?)(?=$|[\s_-])/.test(normalizedTerrain);
    return hasWaterTerrain || flags.some(isWaterFlag);
};

export const getMapperRoomFlags = (
    roomId: string | null,
    rooms: Record<string, MapperRoom>,
    preloadedCoords: Record<string, unknown>
): string[] => {
    const rawId = String(roomId || '').replace(/^m_/, '');
    if (!rawId) return [];
    const room = rooms[roomId || ''] || rooms[`m_${rawId}`] || rooms[rawId];
    const preloaded = preloadedCoords[rawId] as readonly unknown[] | undefined;
    return [
        ...(Array.isArray(preloaded?.[7]) ? preloaded[7] as string[] : []),
        ...(Array.isArray(preloaded?.[8]) ? preloaded[8] as string[] : []),
        ...(room?.mobFlags || []),
        ...(room?.loadFlags || []),
        ...(room?.roomQuestFlags || []),
        ...(room?.details || [])
    ].map(String);
};
