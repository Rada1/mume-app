/** @file Applies resolved room metadata and exit topology to the live map. */
import type { GmcpRoomInfo, MapperRoom } from '../mapperTypes';
import { normalizeTerrain, DIRS, getExitTargetId, stripAnsi } from '../mapperUtils';
import { sanitizeTextDerivedDoorExits } from '../mapperExitSanitizer';
import { recordLearnedServerId } from '../learnedServerIds';
import { mergeExitDoorState } from './exitDoorState';
import { normalizeMapRoomFlag } from '../../../utils/mapRoomFlags';
import type { MapperRoomInfoProps } from '../../../types';
import type { resolveMovingRoom } from './resolveMovingRoom';

// --- Observation updates ---
export function applyRoomInfoObservation(props: MapperRoomInfoProps, data: GmcpRoomInfo, resolved: ReturnType<typeof resolveMovingRoom> & { predX: number; predY: number; predZ: number }) {
    const { roomsRef, preloadedCoordsRef, serverIdIndexRef, discoverySourceRef, lastDetectedTerrainRef, baseMapExitsRef, mapEditMode, onRoomInfoProcessed } = props;
    const { gmcpId, gmcpName, targetId, ghostData, matchedInternalId, discoverySource, isSpectateUpdate, isTextRoomEvent, isScoutObservation, activeRoomId, currentActiveRoom, now, dirUsed, isVnumZero, isLikelyMove, predX, predY, predZ } = resolved;
    const name = stripAnsi(data.name) || 'Unknown Room';
    const desc = data.desc || '';
    let zone = data.area || data.zone || (ghostData ? ghostData[9] : 'Unknown Zone');
    const freshTerrain = normalizeTerrain(data.terrain || data.environment || null);
    const questFlags = data.room_quest_flags || [];
    const details = data.details || [];

    discoverySourceRef.current = discoverySource;

    // Check for any changes without relying on React's functional updater closures,
    // which can lead to stale local variables in strict mode.
    let topologyChanged = false;
    const gmcpIdNumber = Number(gmcpId) || 0;
    const gmcpIdKey = String(gmcpId);

    // --- Persisted server-id backfill ---
    // We confidently resolved this live GMCP server id to a preloaded base-map room.
    // The Ardanazgûm map predates GMCP, so most rooms have an empty server-id slot;
    // adopt the id here so future arrivals hit the fast EXACT_VNUM path, and persist it
    // so the mapping survives reloads. Covers BOTH match styles: a `matchedInternalId`
    // (ghost/Arda/fingerprint hits) and a plain `m_<vnum>` targetId resolved via an
    // existing exit. Guarded to real (non-dark, non-zero) ids only.
    const backfillVnum = matchedInternalId
        || (targetId && targetId.startsWith('m_') ? targetId.substring(2) : null);
    if (!isVnumZero && gmcpIdNumber > 0 && backfillVnum) {
        const mappedRoom = preloadedCoordsRef.current[backfillVnum];
        const currentServerId = Array.isArray(mappedRoom) ? mappedRoom[6] : undefined;
        const hasServerId = currentServerId !== undefined && currentServerId !== null && String(currentServerId) !== '' && String(currentServerId) !== '0';

        if (Array.isArray(mappedRoom) && !hasServerId) {
            // Empty slot — adopt and persist the learned mapping.
            mappedRoom[6] = gmcpIdKey;
            serverIdIndexRef.current[gmcpIdKey] = backfillVnum;
            recordLearnedServerId(gmcpIdKey, backfillVnum);
        } else if (Array.isArray(mappedRoom) && String(currentServerId) === gmcpIdKey) {
            // Slot already holds this id (from the map file or a prior learn) — just index it.
            serverIdIndexRef.current[gmcpIdKey] = backfillVnum;
        } else if (!serverIdIndexRef.current[gmcpIdKey]) {
            // Slot holds a DIFFERENT id: don't overwrite a known-good mapping or persist a
            // contradiction; only add an in-memory index alias if nothing else claims it.
            serverIdIndexRef.current[gmcpIdKey] = backfillVnum;
        }
    }

    // Use the current stable ref to determine changes synchronously
    const prevRooms = roomsRef.current;
    let newRooms = prevRooms;
    let existingRoom = newRooms[targetId!];

    if (isTextRoomEvent) {
        const sanitizeStoredRoom = (roomId: string | null | undefined) => {
            if (!roomId) return;
            const storedRoom = newRooms[roomId];
            if (!storedRoom) return;
            const sanitizedRoom = sanitizeTextDerivedDoorExits(storedRoom);
            if (sanitizedRoom !== storedRoom) {
                if (!topologyChanged) newRooms = { ...prevRooms };
                newRooms[roomId] = sanitizedRoom;
                topologyChanged = true;
                if (roomId === targetId) existingRoom = sanitizedRoom;
            }
        };

        sanitizeStoredRoom(activeRoomId);
        sanitizeStoredRoom(targetId);

        if (targetId) existingRoom = newRooms[targetId];
    }

    if (!existingRoom) {
        // Defense in depth for play mode: only ever materialize a room that the preloaded
        // base map actually knows about (a ghost/Arda hit, or an m_<vnum> that exists in
        // the preloaded set). Anything else would be a fabricated room — block it unless
        // the user is explicitly in map edit mode.
        if (!mapEditMode) {
            const vnumKey = targetId!.startsWith('m_') ? targetId!.substring(2) : null;
            const isPreloadedBacked = !!ghostData || (vnumKey != null && !!preloadedCoordsRef.current[vnumKey]);
            if (!isPreloadedBacked) {
                onRoomInfoProcessed?.(null);
                return;
            }
        }
        topologyChanged = true;
        newRooms = { ...prevRooms };
        let nx = predX, ny = predY, nz = predZ;
        if (ghostData) [nx, ny, nz] = ghostData;
        else if (!currentActiveRoom && !ghostData) { nx = 0; ny = 0; nz = 0; }

        const rawGmcpId = String(gmcpId);
        const mData = (baseMapExitsRef?.current?.[rawGmcpId]) || (ghostData);
        const mLight = mData ? (Array.isArray(mData) ? mData[10] : mData.light) : undefined;
        const mSundeath = mData ? (Array.isArray(mData) ? mData[11] : mData.sundeath) : undefined;

        const newRoom: MapperRoom = {
            id: targetId!, gmcpId: Number(gmcpId) || 0, name, desc,
            x: nx, y: ny, z: nz,
            zone, terrain: freshTerrain || lastDetectedTerrainRef.current || 'Unknown Terrain',
            exits: {}, notes: "",
            mobFlags: Array.from(new Set(ghostData ? ghostData[7] : [])),
            loadFlags: Array.from(new Set(ghostData ? ghostData[8] : [])),
            roomQuestFlags: questFlags,
            details: details.length > 0 ? details : undefined,
            // NEW FORMAT: 1 is Dark, 0 is Lit. Default 0.
            light: data.light !== undefined ? data.light : (mLight !== undefined ? mLight : 0),
            // NEW FORMAT: 0 is No-Sundeath (Death), 1 is Safe. Default 1.
            sundeath: data.sundeath !== undefined ? data.sundeath : (mSundeath !== undefined ? mSundeath : 1),
            createdAt: Date.now()
        };
        newRooms[targetId!] = newRoom;

        if (!isSpectateUpdate && currentActiveRoom && dirUsed && activeRoomId !== targetId) {
            newRooms[currentActiveRoom.id] = {
                ...currentActiveRoom,
                exits: { ...currentActiveRoom.exits, [dirUsed]: { ...currentActiveRoom.exits[dirUsed], target: targetId!, gmcpDestId: Number(gmcpId) || 0, closed: false } }
            };
            const d = DIRS[dirUsed];
            if (d && d.opp) newRooms[targetId!].exits[d.opp] = { ...newRooms[targetId!].exits[d.opp], target: currentActiveRoom.id, closed: false };
        }
    } else {
        const finalTerrain = (data.terrain || data.environment) ? normalizeTerrain(data.terrain || data.environment) : existingRoom.terrain;
        const sourceMobFlags: string[] = existingRoom.mapFlagsEdited ? existingRoom.mobFlags || [] : ghostData ? ghostData[7] : existingRoom.mobFlags || [];
        const newMobFlags = existingRoom.mapAttributesEdited?.includes('light')
            ? sourceMobFlags.filter(flag => !['DARK', 'NOLIGHT'].includes(normalizeMapRoomFlag(flag))) : sourceMobFlags;
        const newLoadFlags = existingRoom.mapFlagsEdited ? existingRoom.loadFlags || [] : ghostData ? ghostData[8] : existingRoom.loadFlags || [];
        const newRoomQuestFlags = questFlags.length > 0 ? questFlags : existingRoom.roomQuestFlags || [];
        const newDetails = details.length > 0 ? details : existingRoom.details;

        const rawGmcpId = String(gmcpId);
        const mData = (baseMapExitsRef?.current?.[rawGmcpId]) || (ghostData);
        const mLight = mData ? (Array.isArray(mData) ? mData[10] : mData.light) : undefined;
        const mSundeath = mData ? (Array.isArray(mData) ? mData[11] : mData.sundeath) : undefined;

        // Check dynamic properties too
        const arraysDiffer = (a: readonly unknown[], b: readonly unknown[]) => a.length !== b.length || a.some((v, i) => v !== b[i]);

        const isDark = isVnumZero;
        const needsUpdate = !isDark && (
            existingRoom.gmcpId !== gmcpIdNumber ||
            existingRoom.terrain !== finalTerrain ||
            existingRoom.name !== name ||
            existingRoom.desc !== desc ||
            arraysDiffer(existingRoom.mobFlags || [], newMobFlags) ||
            arraysDiffer(existingRoom.loadFlags || [], newLoadFlags) ||
            arraysDiffer(existingRoom.roomQuestFlags || [], newRoomQuestFlags) ||
            arraysDiffer(existingRoom.details || [], newDetails || []) ||
            (ghostData && (existingRoom.x !== ghostData[0] || existingRoom.y !== ghostData[1])) ||
            (!isSpectateUpdate && currentActiveRoom && dirUsed && activeRoomId !== targetId) ||
            (data.light !== undefined && existingRoom.light !== data.light) ||
            (data.sundeath !== undefined && existingRoom.sundeath !== data.sundeath)
        );

        if (needsUpdate) {
            topologyChanged = true;
            newRooms = { ...prevRooms };
            newRooms[targetId!] = {
                ...existingRoom,
                gmcpId: isDark ? (existingRoom.gmcpId || 0) : gmcpIdNumber,
                name, desc, zone,
                terrain: finalTerrain,
                mobFlags: newMobFlags,
                loadFlags: newLoadFlags,
                roomQuestFlags: newRoomQuestFlags,
                details: newDetails,
                // light 1 is Dark, 0 is Lit
                light: existingRoom.mapAttributesEdited?.includes('light') ? existingRoom.light : data.light !== undefined ? data.light : (mLight !== undefined ? mLight : (existingRoom.light ?? 0)),
                // sundeath 0 is Death, 1 is Safe
                sundeath: existingRoom.mapAttributesEdited?.includes('sundeath') ? existingRoom.sundeath : data.sundeath !== undefined ? data.sundeath : (mSundeath !== undefined ? mSundeath : (existingRoom.sundeath ?? 1))
            };
            if (ghostData) {
                const [nx, ny, nz] = ghostData;
                newRooms[targetId!] = { ...newRooms[targetId!], x: nx, y: ny, z: nz };
            }
            if (!isSpectateUpdate && currentActiveRoom && dirUsed && activeRoomId !== targetId) {
                newRooms[currentActiveRoom.id] = { ...currentActiveRoom, exits: { ...currentActiveRoom.exits, [dirUsed]: { ...currentActiveRoom.exits[dirUsed], target: targetId!, gmcpDestId: Number(gmcpId) || 0, closed: false } } };
                const d = DIRS[dirUsed];
                if (d && d.opp) newRooms[targetId!] = { ...newRooms[targetId!], exits: { ...newRooms[targetId!].exits, [d.opp]: { ...newRooms[targetId!].exits[d.opp], target: currentActiveRoom.id, closed: false } } };
            }
        }
    }

    // Text exits contain destination room names, not door names or vnums.
    // Keep them available for matching, but never persist them as topology.
    if (data.exits && !isVnumZero && !isTextRoomEvent) {
        const room = newRooms[targetId!];
        const updatedExits: MapperRoom['exits'] = {};
        let exitsChanged = false;

        for (const dir in data.exits) {
            const gmcpExit = data.exits[dir];
            if (gmcpExit === false) continue;
            const existingExit = room.exits?.[dir];
            const gmcpDestId = typeof gmcpExit === 'number' ? gmcpExit : gmcpExit.id ?? existingExit?.gmcpDestId;
            const doorState = mergeExitDoorState(existingExit, gmcpExit);

            let internalTarget = undefined;
            if (gmcpDestId) {
                const mappedDestination = serverIdIndexRef.current[String(gmcpDestId)];
                if (mappedDestination) internalTarget = `m_${mappedDestination}`;
                else internalTarget = Object.keys(newRooms).find(key => String(newRooms[key].gmcpId) === String(gmcpDestId));
            }
            const fallbackExit = ghostData?.[4]?.[dir];
            const mergedFlags = doorState.flags.length > 0
                ? doorState.flags
                : (existingExit?.flags ?? (typeof fallbackExit === 'object' ? fallbackExit?.flags : undefined) ?? []);
            const nextExit = {
                ...existingExit,
                target: internalTarget || (fallbackExit ? `m_${getExitTargetId(fallbackExit)}` : existingExit?.target) || "",
                gmcpDestId,
                name: doorState.name,
                doorName: existingExit?.doorName ?? doorState.name,
                flags: mergedFlags,
                closed: doorState.closed,
                hasDoor: doorState.hasDoor,
            };
            updatedExits[dir] = nextExit;

            if (!existingExit
                || existingExit.target !== nextExit.target
                || existingExit.gmcpDestId !== gmcpDestId
                || existingExit.closed !== nextExit.closed
                || existingExit.hasDoor !== nextExit.hasDoor
                || existingExit.name !== nextExit.name
                || existingExit.doorName !== nextExit.doorName
                || existingExit.flags?.join('|') !== nextExit.flags.join('|')) {
                exitsChanged = true;
            }
        }

        // Also check if any exits were removed
        if (!exitsChanged && room.exits) {
            for (const dir in room.exits) {
                if (!(dir in updatedExits)) {
                    exitsChanged = true;
                    break;
                }
            }
        }

        if (exitsChanged) {
            if (!topologyChanged) {
                newRooms = { ...prevRooms };
                topologyChanged = true;
            }
            newRooms[targetId!] = { ...room, exits: updatedExits };
        }
    }

    return { newRooms, topologyChanged };
}
