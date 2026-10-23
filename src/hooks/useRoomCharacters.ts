/** @file useRoomCharacters.ts — Reconciles room occupants with GMCP group locations. */
import { useMemo } from 'react';
import type { GmcpOccupant, GroupMember } from '../types';
import { classifyOccupant } from '../services/classification/classifyOccupant';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';
import { isGroupMemberOccupant } from '../utils/groupTargetSuggestions';
import { getRoomCharKey } from './useGmcpHandlers/roomOccupantParser';
import { reconcileSyntheticRoomOccupants } from '../utils/roomOccupantReconciliation';

// --- Room Reconciliation ---
const roomId = (value: string | number | undefined): string | null => {
    if (value === undefined || String(value).trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? String(number) : null;
};

export const reconcileRoomCharacters = (
    chars: Record<number, GmcpOccupant>,
    members: GroupMember[],
    currentRoomNum: number,
    currentMapId?: number,
    characterName: string | null = null
): Record<number, GmcpOccupant> => {
    const currentIds = new Set([roomId(currentRoomNum), roomId(currentMapId)].filter(id => id !== null));
    const result = { ...reconcileSyntheticRoomOccupants(chars) };
    for (const member of members) {
        const name = member.name || member.label;
        if (!name || member.type === 'you' || member.type === 'self'
            || name.toLowerCase() === characterName?.toLowerCase()) continue;
        // Names are not location evidence: many different rooms share a title.
        const location = roomId(member.mapid) ?? roomId(member.room);
        if (!location || !currentIds.has(location)) continue;

        const existing = Object.entries(result).find(([, occupant]) => isGroupMemberOccupant(occupant, [member]));
        const type = normalizeOccupantType({ type: member.type });
        const fallbackType = classifyOccupant({ type }) ? type : 'ally';
        if (existing) {
            const [key, occupant] = existing;
            // Partial arrival packets can omit type; keep richer Room.Chars data.
            if (!classifyOccupant(occupant)) result[Number(key)] = { ...occupant, type: fallbackType };
            continue;
        }
        let syntheticId: string | number = member.id;
        let syntheticKey = getRoomCharKey(syntheticId);
        if (result[syntheticKey]) {
            syntheticId = `group:${member.id}`;
            syntheticKey = getRoomCharKey(syntheticId);
            while (result[syntheticKey]) syntheticKey += 1;
        }
        result[syntheticKey] = {
            id: syntheticId,
            name,
            type: fallbackType,
            labels: ['grouped'],
            _roomNum: currentRoomNum
        };
    }
    return result;
};

// --- Reactive Room Projection ---
export const useRoomCharacters = (
    chars: Record<number, GmcpOccupant>,
    members: GroupMember[],
    currentRoomNum: number,
    currentMapId: number | undefined,
    characterName: string | null
) => useMemo(() => {
    const roomChars = reconcileRoomCharacters(chars, members, currentRoomNum, currentMapId, characterName);
    const occupants = Object.values(roomChars);
    return {
        roomChars,
        roomPlayers: occupants.filter(occupant => classifyOccupant(occupant)?.kind === 'player'),
        roomNpcs: occupants.filter(occupant => classifyOccupant(occupant)?.kind === 'npc')
    };
}, [chars, members, currentRoomNum, currentMapId, characterName]);
