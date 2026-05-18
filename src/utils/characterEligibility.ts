/**
 * @file characterEligibility.ts
 * @description Character race, subrace, and class eligibility helpers for buttons.
 */

import { CharacterInfo, CustomButton } from '../types';

// --- Logic Section ---

type ButtonRequirement = NonNullable<CustomButton['requirement']>;

const normalize = (value: string | null | undefined): string => (
    (value || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ')
);

const matchesAny = (actual: string | null | undefined, required?: string[]): boolean => {
    if (!required?.length) return true;
    const normalizedActual = normalize(actual);
    return required.some(value => normalize(value) === normalizedActual);
};

export const isButtonEligibleForCharacter = (
    requirement: ButtonRequirement | undefined,
    characterInfo?: Pick<CharacterInfo, 'race' | 'subrace' | 'class'> | null,
    characterClass?: string
): boolean => {
    if (!requirement) return true;

    const classValue = characterClass && characterClass !== 'none'
        ? characterClass
        : characterInfo?.class;

    return (
        matchesAny(classValue, requirement.characterClass) &&
        matchesAny(characterInfo?.race, requirement.race) &&
        matchesAny(characterInfo?.subrace, requirement.subrace)
    );
};
