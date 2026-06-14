/**
 * @file shaperLiveRoomDiscovery.ts
 * @description Parses live builder room listings for Shaper imports.
 */

const normalizeRoomNumber = (zoneNumber: number, suffix: string): string => {
    const value = suffix.padStart(2, '0');
    return `${zoneNumber}:${value}`;
};

// --- Parse Section ---
export const parseShaperBuildListRooms = (output: string, zoneNumber: number): string[] => {
    const rooms = new Set<string>();
    const zone = String(zoneNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp(`\\b${zone}\\s*:\\s*(\\d{1,3})\\b`, 'g'),
        new RegExp(`\\b${zone}(\\d{2})\\b`, 'g')
    ];

    for (const pattern of patterns) {
        for (const match of output.matchAll(pattern)) {
            rooms.add(normalizeRoomNumber(zoneNumber, match[1]));
        }
    }

    return [...rooms].sort((a, b) => {
        const left = Number(a.split(':')[1]);
        const right = Number(b.split(':')[1]);
        return left - right;
    });
};
