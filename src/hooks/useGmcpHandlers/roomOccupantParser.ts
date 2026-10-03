/** @file roomOccupantParser.ts — Normalizes and hydrates GMCP room character records. */

// --- Logic Section ---
import type { GmcpOccupant } from '../../types';
import { normalizeOccupantType } from '../../services/classification/normalizeOccupantType';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';

const knownRoomChars = new Map<string, GmcpOccupant>();

export const getRoomCharKey = (id: string | number): number => {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) return numericId;

    const idString = String(id);
    let hash = 0;
    for (let i = 0; i < idString.length; i++) {
        hash = ((hash << 5) - hash + idString.charCodeAt(i)) | 0;
    }
    return hash || -1;
};

export const rememberOccupant = (occupant: GmcpOccupant): void => {
    if (occupant.id === undefined) return;
    const key = String(occupant.id);
    knownRoomChars.set(key, { ...(knownRoomChars.get(key) || {}), ...occupant });
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getFirstName = (record: Record<string, unknown>): string | undefined => (
    [record.name, record.keyword, record.short, record.shortdesc]
        .find((value): value is string => typeof value === 'string' && Boolean(value.trim()))
);

const hydrateOccupant = (occupant: GmcpOccupant): GmcpOccupant => {
    if (occupant.id === undefined) return occupant;
    const cached = knownRoomChars.get(String(occupant.id));
    const hydrated = cached ? { ...cached, ...occupant } : { ...occupant };
    if (!hydrated.name) {
        hydrated.name = hydrated.short || hydrated.shortdesc || hydrated.keyword || hydrated.desc;
    }
    return hydrated;
};

const parseOccupant = (data: unknown, characterName: string | null): GmcpOccupant | null => {
    if (!data) return null;
    if (typeof data === 'string' || typeof data === 'number') {
        const value = String(data);
        const occupant: GmcpOccupant = { id: value, name: value, short: value };
        return rememberAndFilterOccupant(occupant, characterName);
    }
    if (!isRecord(data)) return null;

    const name = getFirstName(data);
    const occupant = {
        ...data,
        id: data.id !== undefined ? String(data.id) : name
    } as GmcpOccupant;
    if (name) occupant.name = name;

    const normalizedType = normalizeOccupantType(data);
    if (normalizedType) occupant.type = normalizedType;
    if (occupant.name || occupant.keyword || occupant.short || occupant.shortdesc) {
        occupant.keyword = getOccupantCommandKeyword(occupant, String(occupant.id || ''));
    }

    return rememberAndFilterOccupant(occupant, characterName);
};

const rememberAndFilterOccupant = (occupant: GmcpOccupant, characterName: string | null): GmcpOccupant | null => {
    if (!occupant.id) return null;
    const hydrated = hydrateOccupant(occupant);
    if (characterName && hydrated.name && hydrated.name.toLowerCase() === characterName.toLowerCase()) return null;
    rememberOccupant(hydrated);
    return hydrated;
};

const getRawOccupantList = (data: unknown): unknown[] => {
    if (Array.isArray(data)) return data;
    if (!isRecord(data)) return data == null ? [] : [data];

    const listKeys = ['chars', 'char', 'members', 'list', 'npcs', 'players'];
    const rawList = listKeys
        .map(key => data[key])
        .find(value => value !== undefined && value !== null) ?? data;
    return Array.isArray(rawList) ? rawList : [rawList];
};

export const parseOccupants = (data: unknown, characterName: string | null): GmcpOccupant[] => (
    getRawOccupantList(data)
        .map(entry => parseOccupant(entry, characterName))
        .filter((entry): entry is GmcpOccupant => !!entry && entry.id !== undefined)
);
