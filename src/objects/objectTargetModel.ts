/**
 * @file objectTargetModel.ts
 * @description Shared projection, classification, identity reconciliation, and command selectors for targetable objects.
 */

import type { DrawerLine, GmcpOccupant } from '../types';
import { getTraitsForName, toTraitId } from '../utils/inlineActionModel';
import { extractMumeKeyword } from '../utils/keywordUtils';
import { getOccupantCommandKeyword } from '../utils/occupantKeywordUtils';

export type ObjectLocation = 'room' | 'inventory' | 'worn' | 'container';

export interface ObjectTargetEntry {
    id: string;
    label: string;
    keyword: string;
    selector: string;
    location: ObjectLocation;
    traits: string[];
    wornLocation?: string;
    source: DrawerLine | GmcpOccupant;
}

export interface ObjectSelectorCandidate {
    id: string;
    label: string;
    keyword: string;
    location: ObjectLocation;
    source: DrawerLine | GmcpOccupant;
    wornLocation?: string;
}

// --- Object Name and Classification ---

export const getObjectTraits = (source: string | DrawerLine | GmcpOccupant): string[] => {
    if (typeof source === 'string') return getTraitsForName(source).map(trait => trait.id);
    const isDrawerLine = 'text' in source;
    const labels = isDrawerLine
        ? [source.text, source.rawText, source.context]
        : [source.name, source.short, source.shortdesc, source.keyword, source.type, source.category,
            ...(source.labels || []), ...(source.flags || [])];
    const traits = getTraitsForName(labels.filter(Boolean).join(' ')).map(trait => trait.id);
    if (isDrawerLine && source.isContainer) traits.push('trait-container');
    if (!isDrawerLine) {
        const explicitTraits = [source.type, source.category, ...(source.labels || []), ...(source.flags || [])]
            .filter((value): value is string => Boolean(value))
            .flatMap(value => {
                const normalized = value.toLowerCase().replace(/^(?:cat|trait|inline)-/, '');
                return [toTraitId(value), toTraitId(`inline-${normalized}`)].filter((trait): trait is string => Boolean(trait));
            });
        traits.push(...explicitTraits);
    }
    return Array.from(new Set(traits));
};

export const hasObjectTrait = (source: string | DrawerLine | GmcpOccupant, traitId: string): boolean =>
    getObjectTraits(source).includes(traitId);

export const getCorpseCommandKeyword = (label: string): string => {
    const clean = label.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^(?:\d+\.)?[\w'-]+-corpse$/i.test(clean)) return clean.toLowerCase();

    const bodyName = clean
        .replace(/^(?:(?:the|a|an)\s+)?corpse(?:\s+of)?\s+/i, '')
        .replace(/\s+corpse$/i, '')
        .replace(/^(?:a|an|the)\s+/i, '')
        .trim();
    const bodyKeyword = extractMumeKeyword(bodyName).replace(/\s+/g, '-').toLowerCase();
    return bodyKeyword && bodyKeyword !== 'corpse' ? `${bodyKeyword}-corpse` : 'corpse';
};

export const getDrawerObjectKeyword = (line: DrawerLine): string => {
    const label = line.context || line.text;
    return hasObjectTrait(line, 'trait-corpse')
        ? getCorpseCommandKeyword(label)
        : (line.context || extractMumeKeyword(line.text)).toLowerCase().trim();
};

export const getRoomObjectKeyword = (source: GmcpOccupant, fallbackLabel = ''): string => {
    const label = source.short || source.shortdesc || source.name || source.keyword || fallbackLabel;
    const explicitCorpseKeyword = source.keyword?.trim() || '';
    if (hasObjectTrait(source, 'trait-corpse') && /^(?:\d+\.)?[\w'-]+-corpse$/i.test(explicitCorpseKeyword)) {
        return explicitCorpseKeyword.toLowerCase();
    }
    return hasObjectTrait(source, 'trait-corpse')
        ? getCorpseCommandKeyword(label)
        : getOccupantCommandKeyword(source, fallbackLabel).toLowerCase().trim();
};

// --- Shared Target Projection ---

export const createObjectTargetEntries = (
    candidates: ObjectSelectorCandidate[],
    ordinalScope: (candidate: ObjectSelectorCandidate) => string = candidate => candidate.location
): ObjectTargetEntry[] => {
    const totals = new Map<string, number>();
    candidates.forEach(candidate => {
        const key = `${ordinalScope(candidate)}\u0000${candidate.keyword.toLowerCase()}`;
        totals.set(key, (totals.get(key) || 0) + 1);
    });

    const seen = new Map<string, number>();
    return candidates.map(candidate => {
        const key = `${ordinalScope(candidate)}\u0000${candidate.keyword.toLowerCase()}`;
        const ordinal = (seen.get(key) || 0) + 1;
        seen.set(key, ordinal);
        const selector = (totals.get(key) || 0) > 1 ? `${ordinal}.${candidate.keyword}` : candidate.keyword;
        return {
            ...candidate,
            selector,
            traits: getObjectTraits(candidate.source)
        };
    });
};

export const getGearObjectCandidates = (
    lines: DrawerLine[],
    location: 'inventory' | 'worn'
): ObjectSelectorCandidate[] => lines.flatMap((line, index) => {
    if (!line.isItem || line.isHeader) return [];
    const label = line.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const keyword = getDrawerObjectKeyword(line);
    if (!label || !keyword) return [];
    return [{
        id: line.stableId || line.entityId || line.id || `${location}-${index}`,
        label,
        keyword,
        location,
        source: line,
        wornLocation: location === 'worn' ? line.prefix : undefined
    }];
});

export const getRoomObjectCandidates = (
    sources: Array<string | GmcpOccupant>
): ObjectSelectorCandidate[] => sources.flatMap((source, index) => {
    const item: GmcpOccupant = typeof source === 'string' ? { name: source } : source;
    const label = item.short || item.shortdesc || item.name || item.keyword || '';
    const keyword = getRoomObjectKeyword(item, label);
    if (!label || !keyword) return [];
    const id = item.objectId || (item.id !== undefined ? String(item.id) : `room-object-${index}-${keyword}`);
    return [{ id, label, keyword, location: 'room' as const, source: item }];
});

// --- Snapshot Identity Reconciliation ---

const normalizeObjectLabel = (value: string): string => value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Preserve instance IDs across complete inventory/equipment/container captures. */
export const reconcileObjectSnapshot = (
    previous: DrawerLine[],
    incoming: DrawerLine[]
): DrawerLine[] => {
    const unmatched = previous.filter(line => line.isItem && !line.isHeader);
    return incoming.map(line => {
        if (!line.isItem || line.isHeader) return line;
        const label = normalizeObjectLabel(line.text);
        const keyword = getDrawerObjectKeyword(line);
        const exactIndex = unmatched.findIndex(candidate =>
            normalizeObjectLabel(candidate.text) === label && (candidate.prefix || '') === (line.prefix || '')
        );
        const matchIndex = exactIndex >= 0 ? exactIndex : unmatched.findIndex(candidate =>
            getDrawerObjectKeyword(candidate) === keyword
        );
        if (matchIndex < 0) return { ...line, stableId: line.stableId || line.id };
        const [match] = unmatched.splice(matchIndex, 1);
        return {
            ...line,
            id: match.id,
            stableId: match.stableId || match.entityId || match.id
        };
    });
};

/** Keep surviving room object IDs when GMCP republishes the same room snapshot. */
export const reconcileRoomObjectSnapshot = (
    previous: GmcpOccupant[],
    incoming: GmcpOccupant[]
): GmcpOccupant[] => {
    const unmatched = [...previous];
    return incoming.map(item => {
        const label = normalizeObjectLabel(item.name || item.short || item.shortdesc || '');
        const matchIndex = unmatched.findIndex(candidate =>
            normalizeObjectLabel(candidate.name || candidate.short || candidate.shortdesc || '') === label
        );
        if (matchIndex < 0) return item;
        const [match] = unmatched.splice(matchIndex, 1);
        const id = match.objectId || (match.id !== undefined ? String(match.id) : undefined);
        return id ? { ...item, id, objectId: id } : item;
    });
};

/** Resolve an ordinal command selector to the matching occurrence in one location list. */
export const findObjectOccurrence = <T>(
    items: T[],
    selector: string,
    getKeyword: (item: T) => string
): number => {
    const match = selector.trim().match(/^(?:(\d+)\.)?(.+)$/);
    if (!match) return -1;
    const ordinal = Math.max(1, Number(match[1] || 1));
    const keyword = match[2].toLowerCase();
    let occurrence = 0;
    for (let index = 0; index < items.length; index += 1) {
        if (getKeyword(items[index]) !== keyword) continue;
        occurrence += 1;
        if (occurrence === ordinal) return index;
    }
    return -1;
};
