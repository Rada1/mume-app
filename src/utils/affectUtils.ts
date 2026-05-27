/**
 * @file affectUtils.ts
 * @description Parsers for character affect data reported by MUME info output.
 */

import type { DrawerLine } from '../types';

export type AffectChipTone = 'magic' | 'herblore' | 'poison' | 'default';

const MAGIC_AFFECTS = new Set([
    'bless',
    'strength',
    'sanctuary',
    'detect evil',
    'detect magic',
    'sense life',
    'shield',
    'armour',
    'armor'
]);

const HERBLORE_AFFECTS = new Set([
    'antidote',
    'baker',
    'clearthought',
    'dark draught',
    'healing',
    'heightened senses',
    'leaf cake',
    'orc draught',
    'orc balm',
    'seeing',
    'shadows',
    'skillful oil',
    'soothing draught',
    'thistle tea',
    'travelling',
    'traveling',
    'walking'
]);

const POISON_AFFECTS = new Set([
    'arachnia',
    'belladonna',
    'drake slumber',
    'hemlock',
    'poison',
    'psylonia',
    'venom'
]);

// --- Logic Section ---

export const normalizeAffectName = (affect: string): string => (
    affect
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

export const getAffectChipTone = (affect: string): AffectChipTone => {
    const normalized = normalizeAffectName(affect);
    if (/^stored\b/.test(normalized) || MAGIC_AFFECTS.has(normalized)) return 'magic';
    if (POISON_AFFECTS.has(normalized)) return 'poison';
    if (HERBLORE_AFFECTS.has(normalized)) return 'herblore';
    return 'default';
};

export const parseAffectedByLines = (lines: Pick<DrawerLine, 'text'>[]): string[] | null => {
    const headerIndex = lines.findIndex(line => /^affected by:?$/i.test(line.text.trim()));
    if (headerIndex === -1) return null;

    const affects: string[] = [];
    for (const line of lines.slice(headerIndex + 1)) {
        const text = line.text.trim();
        if (!text) continue;

        const affectMatch = text.match(/^-\s*(.+?)\s*$/);
        if (!affectMatch) break;

        const affect = affectMatch[1].trim();
        if (affect) affects.push(affect);
    }

    return affects;
};
