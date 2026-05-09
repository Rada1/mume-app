/**
 * @file classifyOccupant.ts
 * @description Canonical GMCP Room.Chars category mapping for inline and map occupants.
 */

import {
    COLOR_ALLY,
    COLOR_ENEMY,
    COLOR_NEUTRAL,
    COLOR_NPC,
} from '../../utils/categorizationUtils';
import type { GmcpOccupant } from '../../types';

export type CharCategory =
    | 'cat-ally'
    | 'cat-enemy'
    | 'cat-neutral'
    | 'cat-npc';

export type CharKind = 'player' | 'npc';

export interface CharClassification {
    category: CharCategory;
    kind: CharKind;
    color: string;
}

// NPC subtypes (shopkeeper, innkeeper, etc.) all resolve to cat-npc here.
// Their specific trait (trait-shopkeeper, trait-innkeeper, …) is added later
// via keyword matching against the entity name.
const TYPE_MAP: Record<string, CharCategory | null> = {
    // MUME GMCP Room.Chars types — https://mume.org/help/gmcp_room.chars
    ally: 'cat-ally',
    enemy: 'cat-enemy',
    neutral: 'cat-neutral',
    npc: 'cat-npc',
    you: null,

    // Specialized NPC subtypes — trait resolution handles the distinction
    shopkeeper: 'cat-npc',
    dealer: 'cat-npc',
    merchant: 'cat-npc',
    innkeeper: 'cat-npc',
    mount: 'cat-npc',
    guildmaster: 'cat-npc',
    trainer: 'cat-npc',
    guard: 'cat-npc',

    // Legacy aliases produced by older parsers in this codebase
    pc: 'cat-ally',
    player: 'cat-ally',
    self: null,
    mob: 'cat-npc',
    mobile: 'cat-npc',
};

const COLOR_MAP: Record<CharCategory, string> = {
    'cat-ally': COLOR_ALLY,
    'cat-enemy': COLOR_ENEMY,
    'cat-neutral': COLOR_NEUTRAL,
    'cat-npc': COLOR_NPC,
};

const KIND_MAP: Record<CharCategory, CharKind> = {
    'cat-ally': 'player',
    'cat-enemy': 'player',
    'cat-neutral': 'player',
    'cat-npc': 'npc',
};

export function classifyOccupant(
    occ: GmcpOccupant | null | undefined
): CharClassification | null {
    if (!occ) return null;
    const rawType = (occ as { type?: unknown }).type;
    if (typeof rawType !== 'string' || rawType.length === 0) return null;

    const category = TYPE_MAP[rawType.toLowerCase()];

    if (!category) return null;

    return {
        category,
        kind: KIND_MAP[category],
        color: COLOR_MAP[category],
    };
}
