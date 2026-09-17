/**
 * @file trailUtils.ts
 * @description Helper functions for identifying trail exits and resolving MMapper trail pixmap suffixes.
 */

// --- Logic Section ---

import { normalizeTerrain } from './mapperUtils';

export type CompassDir = 'n' | 'e' | 's' | 'w';

const COMPASS_DIRS: CompassDir[] = ['n', 'e', 's', 'w'];

/**
 * Determines whether an exit between current room and target should be treated as a trail or road.
 */
export const isTrailExit = (
    currentTerrain: string | number | null | undefined,
    targetTerrain: string | number | null | undefined,
    exitFlags: string[] = []
): { isRoad: boolean; isTrail: boolean } => {
    const isCurrentRoad = normalizeTerrain(currentTerrain) === 'Road';
    const isTargetRoad = normalizeTerrain(targetTerrain) === 'Road';

    const hasRoadFlag = exitFlags.some((f: string) => /road|trail|path/i.test(String(f)));
    // If both ends are explicit Road terrain and have road flag/connection -> Road
    if (isCurrentRoad && isTargetRoad) {
        return { isRoad: true, isTrail: false };
    }

    // Trail artwork describes this exit, so it must have explicit route metadata.
    if (hasRoadFlag) {
        return { isRoad: false, isTrail: true };
    }

    return { isRoad: false, isTrail: false };
};

/**
 * Returns active cardinal route directions from explicit exit metadata.
 */
export const getRoomRouteDirections = (
    vnum: string,
    currentRoomObj: any,
    ghostExits: Record<string, any> | undefined,
    preloaded: Record<string, any>,
    baseMapExits?: Record<string, any>
): CompassDir[] => {
    const rData = preloaded[vnum];
    const currentTerrain = currentRoomObj?.terrain ?? rData?.[3];
    const sId = rData ? String(rData[6]) : vnum;
    const ardaExits = baseMapExits?.[sId]?.[4] || rData?.[4] || {};
    const activeDirs: CompassDir[] = [];

    for (const dir of COMPASS_DIRS) {
        const ex = ghostExits?.[dir] || currentRoomObj?.exits?.[dir] || ardaExits[dir];
        if (!ex) continue;

        const targetVnum = String(ex.target || ex.gmcpDestId || '');
        const targetData = preloaded[targetVnum];
        const targetTerrain = targetData ? targetData[3] : undefined;

        const ardaExit = ardaExits[dir];
        const combinedFlags = [
            ...(ardaExit?.flags || []),
            ...(currentRoomObj?.exits?.[dir]?.flags || []),
            ...(ex.flags || [])
        ];

        const { isRoad, isTrail } = isTrailExit(currentTerrain, targetTerrain, combinedFlags);
        if (isRoad || isTrail) {
            activeDirs.push(dir);
        }
    }

    return activeDirs;
};

/** Returns route directions only when the room is a non-road trail tile. */
export const getRoomTrailDirections = (
    vnum: string,
    currentRoomObj: any,
    ghostExits: Record<string, any> | undefined,
    preloaded: Record<string, any>,
    baseMapExits?: Record<string, any>
): CompassDir[] => {
    const rData = preloaded[vnum];
    const terrain = currentRoomObj?.terrain ?? rData?.[3];
    return normalizeTerrain(terrain) === 'Road'
        ? []
        : getRoomRouteDirections(vnum, currentRoomObj, ghostExits, preloaded, baseMapExits);
};

/**
 * Maps an array of active trail directions to MMapper's pixmap filename suffix.
 * Order in MMapper: 'n', 'e', 's', 'w'.
 * Examples:
 *   ['s', 'w'] -> 'sw'
 *   ['n', 's'] -> 'ns'
 *   ['n', 'e', 's', 'w'] -> 'all'
 *   [] -> ''
 */
export const getTrailPixmapSuffix = (dirs: CompassDir[]): string | undefined => {
    if (!dirs || dirs.length === 0) return undefined;
    if (dirs.length === 4) return 'all';

    // Sort according to COMPASS_DIRS order ('n', 'e', 's', 'w')
    const sorted = COMPASS_DIRS.filter(d => dirs.includes(d));
    return sorted.join('');
};
