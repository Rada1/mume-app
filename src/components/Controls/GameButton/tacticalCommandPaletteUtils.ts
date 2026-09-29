/** @file tacticalCommandPaletteUtils.ts — Builds complete learned class-action palettes. */

import type { CustomButton, PracticeData, SwipeDirection } from '../../../types';
import { getPracticeClassKey, PASSIVE_SKILLS, PRACTICE_CLASS_SKILLS, type PracticeClassKey } from '../../../utils/practiceClassCatalog';
import { toAbilityCommand } from '../../../utils/abilityCommandUtils';
import { getClassKeyFromSetId } from '../../../utils/skillPresentation';
import type { TacticalPaletteCommand } from './TacticalCommandPalette';

// --- Logic Section ---
const normalizeAbility = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const abilityAliases = (value: string): string[] => {
    const normalized = normalizeAbility(value);
    if (normalized === 'cure critical') return [normalized, 'cure critic'];
    if (normalized === 'cure critic') return [normalized, 'cure critical'];
    return [normalized];
};

const canonicalAbility = (value: string): string => {
    const normalized = normalizeAbility(value);
    return normalized === 'cure critical' ? 'cure critic' : normalized;
};

const getButtonAbilityName = (command: string, label = ''): string => {
    const quotedName = command.match(/^(?:cast|commune)\s+'([^']+)'/i)?.[1];
    return normalizeAbility(quotedName || label || command.split(' ')[0]);
};

// --- Public API ---
export const getLearnedClassPalette = (
    classKey: PracticeClassKey,
    setId: string,
    practiceData: PracticeData | null | undefined,
    abilities: Record<string, number>,
    button: CustomButton,
    buttons: CustomButton[]
): TacticalPaletteCommand[] => {
    const learnedNames = new Set((practiceData?.skills || [])
        .filter(skill => skill.proficiency > 0 && (skill.skillClass?.toLowerCase() === classKey || getPracticeClassKey(skill.name) === classKey))
        .flatMap(skill => abilityAliases(skill.name)));
    const classAbilities = PRACTICE_CLASS_SKILLS[classKey]
        .filter(name => !PASSIVE_SKILLS.has(normalizeAbility(name)))
        .filter(name => abilityAliases(name).some(alias => learnedNames.has(alias) || (abilities[alias] || 0) > 0));
    const assignedDirections = new Set([
        ...Object.keys(button.swipeCommands || {}),
        ...Object.keys(button.longSwipeCommands || {})
    ]);
    const assignedCommands = [button.command, ...Array.from(assignedDirections).map(direction => {
        const dir = direction as SwipeDirection;
        return button.swipeCommands?.[dir] || button.longSwipeCommands?.[dir] || '';
    })];
    const assignedAbilities = new Set(assignedCommands.flatMap(command => abilityAliases(getButtonAbilityName(command))));

    const learnedCommands = classAbilities.map((name): TacticalPaletteCommand => {
        const aliases = new Set(abilityAliases(name));
        const existing = buttons.find(candidate =>
            getClassKeyFromSetId(candidate.setId) === classKey
            && aliases.has(getButtonAbilityName(candidate.command, candidate.label))
            && !candidate.isDimmed
        );
        const item = existing
            ? { key: existing.id, label: existing.label, command: existing.command, actionType: existing.actionType, setId: existing.setId }
            : { key: `learned-${classKey}-${normalizeAbility(name)}`, label: name, command: toAbilityCommand(classKey, name), actionType: 'command' as const, setId };
        return item;
    }).filter(item => !abilityAliases(getButtonAbilityName(item.command, item.label)).some(alias => assignedAbilities.has(alias)));

    const additionalGeneratedCommands = buttons
        .filter(button => {
            if (getClassKeyFromSetId(button.setId) !== classKey || button.isDimmed) return false;
            const abilityName = getButtonAbilityName(button.command, button.label);
            if (abilityAliases(abilityName).some(alias => assignedAbilities.has(alias))) return false;
            return abilityAliases(abilityName).some(alias => learnedNames.has(alias) || (abilities[alias] || 0) > 0)
                || (abilityName === 'recover' && learnedNames.has('missile'));
        })
        .map(button => ({
            key: button.id,
            label: button.label,
            command: button.command,
            actionType: button.actionType,
            setId: button.setId
        }));

    const seen = new Set<string>();
    return [...learnedCommands, ...additionalGeneratedCommands].filter(item => {
        const key = canonicalAbility(getButtonAbilityName(item.command, item.label));
        if (classKey === 'ranger' && (key === 'climb' || key === 'swim')) return false;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
