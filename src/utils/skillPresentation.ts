/**
 * @file skillPresentation.ts
 * @description Shared class-aware display helpers for skill buttons and swipes.
 */

import { getPracticeClassKey, PracticeClassKey } from './practiceClassCatalog';

export interface SkillActionPresentation {
    label: string;
    classKey: PracticeClassKey | null;
    kind: 'skill' | 'spell' | 'menu' | 'command';
}

// --- Logic Section ---

const CLASS_MENU_ALIASES: Record<string, { classKey: PracticeClassKey; kind: 'skill' | 'spell' }> = {
    rangerskilllist: { classKey: 'ranger', kind: 'skill' },
    warriorskilllist: { classKey: 'warrior', kind: 'skill' },
    thiefskilllist: { classKey: 'thief', kind: 'skill' },
    mageskilllist: { classKey: 'mage', kind: 'spell' },
    magespelllist: { classKey: 'mage', kind: 'spell' },
    clericspelllist: { classKey: 'cleric', kind: 'spell' }
};

const titleCase = (value: string): string => value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ');

export const getClassKeyFromSetId = (setId?: string): PracticeClassKey | null => {
    const normalized = (setId || '').toLowerCase();
    if (normalized.includes('ranger')) return 'ranger';
    if (normalized.includes('warrior')) return 'warrior';
    if (normalized.includes('thief')) return 'thief';
    if (normalized.includes('mage')) return 'mage';
    if (normalized.includes('cleric')) return 'cleric';
    return null;
};

export const getSkillPresentation = (
    command: string,
    fallbackLabel = '',
    fallbackClass?: PracticeClassKey | null
): SkillActionPresentation => {
    const trimmed = command.trim();
    const normalized = trimmed.toLowerCase();
    const menuMatch = CLASS_MENU_ALIASES[normalized];
    if (menuMatch) {
        return {
            label: `${titleCase(menuMatch.classKey)} ${menuMatch.kind === 'spell' ? 'Spells' : 'Skills'}`,
            classKey: menuMatch.classKey,
            kind: 'menu'
        };
    }

    const quotedAbility = normalized.match(/^(?:cast|commune)\s+'([^']+)'/);
    if (quotedAbility) {
        const name = quotedAbility[1];
        return {
            label: titleCase(name),
            classKey: getPracticeClassKey(name) || fallbackClass || null,
            kind: 'spell'
        };
    }

    const label = trimmed || fallbackLabel;
    const classKey = getPracticeClassKey(label) || fallbackClass || null;
    return {
        label: titleCase(label),
        classKey,
        kind: classKey ? 'skill' : 'command'
    };
};
