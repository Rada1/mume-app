import {
    COLOR_ALLY,
    COLOR_ENEMY,
    COLOR_NEUTRAL,
    COLOR_NPC,
    getCategoryForName,
} from '../../utils/categorizationUtils';
import type { GmcpOccupant } from '../../types';

export type CharCategory =
    | 'inline-ally'
    | 'inline-enemy'
    | 'inline-neutral'
    | 'inline-npc'
    | 'inline-shopkeeper'
    | 'inline-innkeeper'
    | 'inline-mounts'
    | 'inline-guildmaster'
    | 'inline-trainer'
    | 'inline-guard';

export type CharKind = 'player' | 'npc';

export interface CharClassification {
    category: CharCategory;
    kind: CharKind;
    color: string;
}

const TYPE_MAP: Record<string, CharCategory | null> = {
    // MUME GMCP Room.Chars types — https://mume.org/help/gmcp_room.chars
    ally: 'inline-ally',
    enemy: 'inline-enemy',
    neutral: 'inline-neutral',
    npc: 'inline-npc',
    you: null,

    // Specialized types from MUME
    shopkeeper: 'inline-shopkeeper',
    dealer: 'inline-shopkeeper',
    merchant: 'inline-shopkeeper',
    innkeeper: 'inline-innkeeper',
    mount: 'inline-mounts',
    guildmaster: 'inline-guildmaster',
    trainer: 'inline-trainer',
    guard: 'inline-guard',

    // Legacy producers in this codebase emit these.
    pc: 'inline-ally',
    player: 'inline-ally',
    self: null,
    mob: 'inline-npc',
    mobile: 'inline-npc',
};

const COLOR_MAP: Record<CharCategory, string> = {
    'inline-ally': COLOR_ALLY,
    'inline-enemy': COLOR_ENEMY,
    'inline-neutral': COLOR_NEUTRAL,
    'inline-npc': COLOR_NPC,
    'inline-shopkeeper': COLOR_NPC,
    'inline-innkeeper': COLOR_NPC,
    'inline-mounts': COLOR_NPC,
    'inline-guildmaster': COLOR_NPC,
    'inline-trainer': COLOR_NPC,
    'inline-guard': COLOR_NPC,
};

const KIND_MAP: Record<CharCategory, CharKind> = {
    'inline-ally': 'player',
    'inline-enemy': 'player',
    'inline-neutral': 'player',
    'inline-npc': 'npc',
    'inline-shopkeeper': 'npc',
    'inline-innkeeper': 'npc',
    'inline-mounts': 'npc',
    'inline-guildmaster': 'npc',
    'inline-trainer': 'npc',
    'inline-guard': 'npc',
};

export function classifyOccupant(
    occ: GmcpOccupant | null | undefined
): CharClassification | null {
    if (!occ) return null;
    const rawType = (occ as { type?: unknown }).type;
    if (typeof rawType !== 'string' || rawType.length === 0) return null;

    let category = TYPE_MAP[rawType.toLowerCase()];

    // If it's a generic NPC, try to refine based on keywords in name or shortdesc
    if (category === 'inline-npc' || !category) {
        const nameText = (occ.name || occ.shortdesc || '').toLowerCase();
        const refined = getCategoryForName(nameText);
        // Only accept if it's an inline-npc related category
        if (refined && refined.startsWith('inline-')) {
            // Check if it's one of our valid CharCategory types
            const validSubcats = ['inline-shopkeeper', 'inline-innkeeper', 'inline-mounts', 'inline-guildmaster', 'inline-trainer', 'inline-guard'];
            if (validSubcats.includes(refined)) {
                category = refined as CharCategory;
            }
        }
    }

    if (!category) return null;

    return {
        category,
        kind: KIND_MAP[category],
        color: COLOR_MAP[category],
    };
}
