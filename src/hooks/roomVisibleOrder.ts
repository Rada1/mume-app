/** @file roomVisibleOrder.ts — Reconciles visible room lines with GMCP characters. */

// --- Logic Section ---
import type { GmcpOccupant, Message, VisibleRoomSubject } from '../types';

const CHARACTER_KINDS = new Set(['npc', 'enemy', 'neutral', 'ally', 'player']);
const CHARACTER_CATEGORIES = new Set(['cat-npc', 'cat-enemy', 'cat-neutral', 'cat-ally', 'cat-ally-remote']);

const normalize = (value: string): string => value
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/^[*-]+|[*-]+$/g, '')
    .replace(/^(?:a|an|the|some)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const getVisibleRoomSubject = (message: Message): VisibleRoomSubject => {
    const firstEntity = message.tokens?.find(token => token.type === 'entity');
    const isCharacter = firstEntity?.type === 'entity' && (
        CHARACTER_KINDS.has(firstEntity.metadata?.kind?.toLowerCase() || '')
        || CHARACTER_CATEGORIES.has(firstEntity.metadata?.category?.toLowerCase() || '')
    );
    return {
        id: isCharacter ? String(firstEntity.metadata?.occupantId ?? firstEntity.entityId) : null,
        label: isCharacter ? firstEntity.content : '',
        line: message.textOnly || message.textRaw
    };
};

const subjectMatchScore = (subject: VisibleRoomSubject, occupant: GmcpOccupant): number => {
    const label = normalize(subject.label);
    const line = normalize(subject.line);
    return [occupant.name, occupant.short, occupant.shortdesc]
        .filter((name): name is string => Boolean(name))
        .reduce((best, name) => {
            const candidate = normalize(name);
            if (!candidate) return best;
            if (label && candidate === label) return Math.max(best, 1000 + candidate.length);
            if (line === candidate || line.startsWith(`${candidate} `)) return Math.max(best, 500 + candidate.length);
            if (label.length >= 4 && (candidate.includes(label) || label.includes(candidate))) {
                return Math.max(best, 100 + candidate.length);
            }
            return best;
        }, 0);
};

export const applyVisibleRoomOrder = (
    chars: Record<number, GmcpOccupant>,
    subjects: VisibleRoomSubject[]
): Record<number, GmcpOccupant> => {
    if (subjects.length === 0 && Object.values(chars).every(occupant => occupant._visibleRoomOrder === undefined)) {
        return chars;
    }
    const entries = Object.entries(chars);
    const next = Object.fromEntries(entries.map(([key, occupant]) => {
        const { _visibleRoomOrder: _previousOrder, ...rest } = occupant;
        return [key, rest];
    })) as Record<number, GmcpOccupant>;
    const used = new Set<string>();

    subjects.forEach((subject, order) => {
        let match = subject.id && entries.find(([key, occupant]) =>
            !used.has(key) && String(occupant.id) === subject.id
        );
        if (!match) {
            match = entries
                .filter(([key]) => !used.has(key))
                .map(entry => ({ entry, score: subjectMatchScore(subject, entry[1]) }))
                .filter(candidate => candidate.score > 0)
                .sort((left, right) => right.score - left.score
                    || (left.entry[1]._roomOrder ?? Infinity) - (right.entry[1]._roomOrder ?? Infinity))[0]?.entry;
        }
        if (!match) return;
        used.add(match[0]);
        next[Number(match[0])] = { ...next[Number(match[0])], _visibleRoomOrder: order };
    });

    return next;
};
