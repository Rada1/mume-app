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
    exitFlags: string[] = [],
    currentRoomName: string = '',
    targetRoomName: string = ''
): { isRoad: boolean; isTrail: boolean } => {
    const isCurrentRoad = normalizeTerrain(currentTerrain) === 'Road';
    const isTargetRoad = normalizeTerrain(targetTerrain) === 'Road';

    const hasRoadFlag = exitFlags.some((f: string) => /road|trail|path/i.test(String(f)));
    const curNameLow = currentRoomName.toLowerCase();
    const tarNameLow = targetRoomName.toLowerCase();
    const isTrailName = /trail|path/.test(curNameLow) || /trail|path/.test(tarNameLow);

    // If both ends are explicit Road terrain and have road flag/connection -> Road
    if (isCurrentRoad && isTargetRoad) {
        return { isRoad: true, isTrail: false };
    }

    // If either has road flag, or either has trail in name (and not connecting two roads) -> Trail
    if (hasRoadFlag || isTrailName) {
        return { isRoad: false, isTrail: true };
    }

    return { isRoad: false, isTrail: false };
};

/**
 * Returns active cardinal trail directions for a given room.
 */
export const getRoomTrailDirections = (
    vnum: string,
    currentRoomObj: any,
    ghostExits: Record<string, any> | undefined,
    preloaded: Record<string, any>,
    baseMapExits?: Record<string, any>
): CompassDir[] => {
    const rData = preloaded[vnum];
    const currentTerrain = currentRoomObj?.terrain ?? rData?.[3];
    if (normalizeTerrain(currentTerrain) === 'Road') {
        return [];
    }

    const currentName = String(currentRoomObj?.name || rData?.[5] || '');
    const sId = rData ? String(rData[6]) : vnum;
    const ardaExits = baseMapExits?.[sId]?.[4] || {};
    const activeDirs: CompassDir[] = [];

    for (const dir of COMPASS_DIRS) {
        const ex = ghostExits?.[dir] || currentRoomObj?.exits?.[dir] || ardaExits[dir];
        if (!ex) continue;

        const targetVnum = String(ex.target || ex.gmcpDestId || '');
        const targetData = preloaded[targetVnum];
        const targetTerrain = targetData ? targetData[3] : undefined;
        const targetName = String(targetData?.[5] || '');

        const ardaExit = ardaExits[dir];
        const combinedFlags = [
            ...(ardaExit?.flags || []),
            ...(currentRoomObj?.exits?.[dir]?.flags || []),
            ...(ex.flags || [])
        ];

        const { isTrail } = isTrailExit(currentTerrain, targetTerrain, combinedFlags, currentName, targetName);
        if (isTrail) {
            activeDirs.push(dir);
        }
    }

    return activeDirs;
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
