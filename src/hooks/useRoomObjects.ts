/** @file useRoomObjects.ts — Excludes character descriptions accidentally captured as room objects. */
import { useMemo } from 'react';
import type { GmcpOccupant } from '../types';
import { classifyOccupant } from '../services/classification/classifyOccupant';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';

// --- Character Evidence ---
const normalize = (value: string): string => value.toLowerCase().trim()
    .replace(/^(?:a|an|the|some)\s+/, '').replace(/\s+/g, ' ');

export const isRoomCharacterDescription = (name: string, characters: GmcpOccupant[]): boolean => {
    const label = normalize(name);
    // Corpses and objects depicting/containing a character remain valid objects.
    if (/\b(?:corpse|statue|figurine|portrait|painting|of)\b/.test(label)) return false;
    return characters.some(character => [character.name, character.short, character.shortdesc, character._visibleRoomLabel]
        .some(alias => {
            const characterLabel = normalize(alias || '');
            return characterLabel !== '' && (label === characterLabel || label.endsWith(` ${characterLabel}`));
        }));
};

// --- Room Object Projection ---
export const filterRoomObjects = (items: GmcpOccupant[], characters: GmcpOccupant[]): GmcpOccupant[] =>
    items.filter(item => {
        if (classifyOccupant({ ...item, type: normalizeOccupantType(item) })) return false;
        if (item.id !== undefined && characters.some(character => character.id !== undefined
            && String(character.id) === String(item.id))) return false;
        return !isRoomCharacterDescription(item.name || item.short || item.shortdesc || '', characters);
    });

export const useRoomObjects = (items: GmcpOccupant[], chars: Record<number, GmcpOccupant>) =>
    useMemo(() => filterRoomObjects(items, Object.values(chars)), [items, chars]);
