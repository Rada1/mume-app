/**
 * @file inlineAbilityActions.ts
 * @description Learned, target-aware ability buttons for inline entity menus.
 */

import type { CustomButton, PracticeData } from '../types';
import { createButton } from './buttonFactory';
import { toAbilityCommand } from './abilityCommandUtils';
import { PRACTICE_CLASS_SKILLS, SELF_ONLY_SPELLS, TARGETED_SKILLS } from './practiceClassCatalog';
import type { PracticeClassKey } from './practiceClassCatalog';

// --- Logic Section ---

export const INLINE_ABILITY_FAMILIES = {
    offense: {
        ranger: [],
        thief: ['Attack', 'Backstab', 'Missile'],
        warrior: ['Bash', 'Charge', 'Kick'],
        mage: ['Magic Missile', 'Chill Touch', 'Burning Hands', 'Shocking Grasp', 'Lightning Bolt', 'Colour Spray', 'Call Lightning', 'Fireball', 'Magic Blast'],
        cleric: ['Smother', 'Poison', 'Black Breath', 'Dispel Evil', 'Energy Drain', 'Harm']
    },
    buffs: {
        ranger: [],
        thief: [],
        warrior: [],
        mage: ['Armour', 'Shield', 'Shroud', 'Night Vision', 'Detect Magic', 'Detect Invisibility'],
        cleric: ['Protection from Evil', 'Bless', 'Strength', 'Breath of Briskness', 'Sanctuary', 'Sense Life', 'Detect Evil']
    },
    healing: {
        ranger: ['Bandage'],
        thief: [],
        warrior: [],
        mage: [],
        cleric: ['Cure Light', 'Cure Serious', 'Cure Critic', 'Cure Blindness', 'Cure Disease', 'Remove Poison', 'Heal', 'Transfer', 'Raise Dead']
    },
    control: {
        ranger: [],
        thief: [],
        warrior: [],
        mage: ['Charm', 'Sleep', 'Silence', 'Dispel Magic'],
        cleric: ['Blindness', 'Curse', 'Fear', 'Hold']
    },
    support: {
        ranger: [],
        thief: [],
        warrior: ['Rescue'],
        mage: [],
        cleric: ['Summon', 'Remove Curse']
    },
    mount: {
        ranger: ['Ride'],
        thief: [],
        warrior: [],
        mage: [],
        cleric: []
    },
    utility: {
        ranger: ['Track'],
        thief: ['Steal'],
        warrior: [],
        mage: ['Locate', 'Locate Life', 'Scry', 'Portal', 'Teleport'],
        cleric: []
    },
    doors: {
        ranger: [],
        thief: ['Pick'],
        warrior: ['Bash'],
        mage: ['Block Door'],
        cleric: ['Break Door']
    },
    'object-magic': {
        ranger: [],
        thief: [],
        warrior: [],
        mage: ['Identify', 'Enchant'],
        cleric: []
    },
    resurrection: {
        ranger: [],
        thief: [],
        warrior: [],
        mage: [],
        cleric: ['Raise Dead']
    }
} satisfies Record<string, Record<PracticeClassKey, string[]>>;

export type InlineAbilityFamily = keyof typeof INLINE_ABILITY_FAMILIES;

export const INLINE_BASH_DISENGAGE_BUTTON_ID = 'inline-ability-offense-warrior-bash-disengage';

const CLASS_ORDER: PracticeClassKey[] = ['warrior', 'mage', 'cleric', 'ranger', 'thief'];
const CLASS_TARGET_FAMILIES: InlineAbilityFamily[] = ['offense', 'buffs', 'healing', 'control', 'support', 'utility', 'object-magic'];
const CLASS_TARGET_EXCLUDED_ABILITIES = new Set(['raise dead']);
const OBJECT_TARGETED_ABILITIES = new Set(['bless', 'identify', 'enchant']);

const normalizeAbility = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

const abilityAliases = (name: string): string[] => {
    const normalized = normalizeAbility(name);
    const aliases = new Set([normalized]);
    if (normalized.includes('armour')) aliases.add(normalized.replace(/\barmour\b/g, 'armor'));
    if (normalized.includes('armor')) aliases.add(normalized.replace(/\barmor\b/g, 'armour'));
    if (normalized === 'cure critic') aliases.add('cure critical');
    if (normalized === 'cure critical') aliases.add('cure critic');
    return [...aliases];
};

const getAbilityId = (family: InlineAbilityFamily, classKey: PracticeClassKey, ability: string): string => (
    `inline-ability-${family}-${classKey}-${normalizeAbility(ability).replace(/[^a-z0-9]+/g, '-')}`
);

const familyAbilityNames = (family: InlineAbilityFamily, classKey: PracticeClassKey): string[] => (
    INLINE_ABILITY_FAMILIES[family][classKey].filter(name => (
        PRACTICE_CLASS_SKILLS[classKey].some(skill => normalizeAbility(skill) === normalizeAbility(name)) &&
        (family === 'doors' || TARGETED_SKILLS.has(normalizeAbility(name)) || SELF_ONLY_SPELLS.has(normalizeAbility(name)))
    ))
);

export const getInlineAbilityButtonIds = (family: InlineAbilityFamily): string[] => (
    CLASS_ORDER.flatMap(classKey => familyAbilityNames(family, classKey).map(name => getAbilityId(family, classKey, name)))
);

/** Button IDs for learned, targetable abilities shown in a class trait. */
export const getInlineClassTargetButtonIds = (classKey: PracticeClassKey): string[] => [
    ...CLASS_TARGET_FAMILIES.flatMap(family => familyAbilityNames(family, classKey)
        .filter(name => TARGETED_SKILLS.has(normalizeAbility(name)))
        .filter(name => !SELF_ONLY_SPELLS.has(normalizeAbility(name)))
        .filter(name => !CLASS_TARGET_EXCLUDED_ABILITIES.has(normalizeAbility(name)))
        .map(name => getAbilityId(family, classKey, name))),
    ...(classKey === 'warrior' ? [INLINE_BASH_DISENGAGE_BUTTON_ID] : [])
];

const getInlineTargetKinds = (ability: string, family: InlineAbilityFamily): Array<'character' | 'object' | 'exit'> => {
    if (family === 'doors') return ['exit'];
    const normalized = normalizeAbility(ability);
    if (normalized === 'bless') return ['character', 'object'];
    if (OBJECT_TARGETED_ABILITIES.has(normalized)) return ['object'];
    return ['character'];
};

const getLearnedProficiency = (
    ability: string,
    classKey: PracticeClassKey,
    abilities: Record<string, number>,
    practiceData: PracticeData | null
): number => {
    const aliases = new Set(abilityAliases(ability));
    const mapProficiency = Math.max(0, ...Object.entries(abilities)
        .filter(([name]) => aliases.has(normalizeAbility(name)))
        .map(([, proficiency]) => proficiency));
    const practiceProficiency = Math.max(0, ...(practiceData?.skills
        .filter(skill => !skill.skillClass || skill.skillClass.toLowerCase() === classKey)
        .filter(skill => abilityAliases(skill.name).some(alias => aliases.has(alias)))
        .map(skill => skill.proficiency) || []));
    return Math.max(mapProficiency, practiceProficiency);
};

const createInlineAbilityButton = (
    family: InlineAbilityFamily,
    classKey: PracticeClassKey,
    ability: string
): CustomButton => {
    const baseCommand = toAbilityCommand(classKey, ability);
    const command = SELF_ONLY_SPELLS.has(normalizeAbility(ability))
        ? baseCommand
        : /%n/i.test(baseCommand) ? baseCommand : `${baseCommand} %n`;
    const classLabel = classKey.charAt(0).toUpperCase() + classKey.slice(1);
    const button = createButton({
        id: getAbilityId(family, classKey, ability),
        label: ability,
        command,
        setId: classKey === 'mage' || classKey === 'cleric' ? `${classKey}spelllist` : `${classKey}skilllist`,
        color: '#c9a84c',
        shape: 'rect',
        width: 160,
        height: 32
    });
    return {
        ...button,
        inlineSubgroup: classLabel,
        ...(TARGETED_SKILLS.has(normalizeAbility(ability)) || family === 'doors'
            ? { inlineTargetKinds: getInlineTargetKinds(ability, family) }
            : {})
    };
};

/** Creates only learned abilities that accept the selected entity as a target. */
export const createLearnedInlineAbilityButtons = (
    abilities: Record<string, number>,
    practiceData: PracticeData | null
): CustomButton[] => {
    const buttons: CustomButton[] = [];
    for (const family of Object.keys(INLINE_ABILITY_FAMILIES) as InlineAbilityFamily[]) {
        for (const classKey of CLASS_ORDER) {
            for (const ability of familyAbilityNames(family, classKey)) {
                if (getLearnedProficiency(ability, classKey, abilities, practiceData) <= 0) continue;
                buttons.push(createInlineAbilityButton(family, classKey, ability));
            }
        }
    }
    if (getLearnedProficiency('Bash', 'warrior', abilities, practiceData) > 0) {
        const button = createButton({
            id: INLINE_BASH_DISENGAGE_BUTTON_ID,
            label: 'Bash Disengage',
            command: 'bash dis %n',
            setId: 'warriorskilllist',
            color: '#c9a84c',
            shape: 'rect',
            width: 160,
            height: 32
        });
        buttons.push({ ...button, inlineSubgroup: 'Warrior', inlineTargetKinds: ['character'] });
    }
    return buttons;
};

/** All inline ability button IDs, used by default trait definitions. */
export const INLINE_ABILITY_BUTTON_IDS: Record<InlineAbilityFamily, string[]> = Object.fromEntries(
    (Object.keys(INLINE_ABILITY_FAMILIES) as InlineAbilityFamily[]).map(family => [family, getInlineAbilityButtonIds(family)])
) as Record<InlineAbilityFamily, string[]>;
