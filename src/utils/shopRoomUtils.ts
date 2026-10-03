/** @file shopRoomUtils.ts — Map flag lookup for the current shop room. */
import type { MapperRoom } from '../components/Mapper/mapperTypes';

// --- Logic Section ---
export const getShopRoomLabel = (
    roomId: string | null,
    rooms: Record<string, MapperRoom>,
    preloadedRoom?: readonly unknown[]
): string | null => {
    if (!roomId) return null;
    const rawId = String(roomId).replace(/^m_/, '');
    const room = rooms[roomId] || rooms[`m_${rawId}`];
    const flags = [
        ...(Array.isArray(preloadedRoom?.[7]) ? preloadedRoom[7] : []),
        ...(Array.isArray(preloadedRoom?.[8]) ? preloadedRoom[8] : []),
        ...(Array.isArray(room?.mobFlags) ? room.mobFlags : []),
        ...(Array.isArray(room?.loadFlags) ? room.loadFlags : [])
    ].map(flag => String(flag).toUpperCase());

    if (flags.includes('WEAPON_SHOP')) return 'Weapon shop';
    if (flags.includes('ARMOUR_SHOP')) return 'Armour shop';
    if (flags.includes('FOOD_SHOP')) return 'Food shop';
    if (flags.includes('PET_SHOP')) return 'Pet shop';
    if (flags.some(flag => flag === 'SHOP' || flag === 'STORE')) return 'Shop';
    return null;
};
