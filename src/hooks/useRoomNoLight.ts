/** @file useRoomNoLight.ts — Suppress celestial effects for rooms marked dark or no-light. */
import { useMapper } from '../context/useMapper';

// --- Room Flag Section ---
const isNoLight = (value: unknown): boolean => typeof value === 'string'
    && ['NOLIGHT', 'DARK'].includes(value.toUpperCase().replace(/[\s_-]/g, ''));
const isDarkLighting = (value: unknown): boolean => value === 1 || value === '1' || isNoLight(value);

export function useRoomNoLight(): boolean {
    const { currentRoomId, rooms, preloadedCoordsRef } = useMapper();
    if (!currentRoomId) return false;
    const rawId = currentRoomId.replace(/^m_/, '');
    const room = rooms[currentRoomId] ?? rooms[`m_${rawId}`] ?? rooms[rawId];
    const preloaded = preloadedCoordsRef.current[rawId];
    const flags: unknown = room && 'flags' in room ? room.flags : undefined;
    return [...(room?.mobFlags ?? []), ...(Array.isArray(flags) ? flags : []), ...(preloaded?.[7] ?? [])].some(isNoLight)
        || isDarkLighting(room?.light) || isDarkLighting(preloaded?.[10]);
}
