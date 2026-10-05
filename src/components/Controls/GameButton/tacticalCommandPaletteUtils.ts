/** @file tacticalCommandPaletteUtils.ts — Builds complete class-action palettes. */

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

export const getClassCommandLearnedState = (
    command: string,
    classKey: PracticeClassKey,
    practiceData: PracticeData | null | undefined,
    abilities: Record<string, number>
): boolean | undefined => {
    const requestedAbility = canonicalAbility(getButtonAbilityName(command));
    const abilityName = PRACTICE_CLASS_SKILLS[classKey].find(name => canonicalAbility(name) === requestedAbility);
    if (!abilityName) return undefined;
    if (canonicalAbility(abilityName) === 'escape') return true;

    const learnedNames = new Set((practiceData?.skills || [])
        .filter(skill => skill.proficiency > 0 && (skill.skillClass?.toLowerCase() === classKey || getPracticeClassKey(skill.name) === classKey))
        .flatMap(skill => abilityAliases(skill.name)));
    const aliases = abilityAliases(abilityName);
    if (aliases.some(alias => learnedNames.has(alias) || (abilities[alias] || 0) > 0)) return true;

    const prerequisite = requestedAbility === 'protect' ? 'rescue' : requestedAbility === 'recover' ? 'missile' : '';
    return prerequisite
        ? learnedNames.has(prerequisite) || (abilities[prerequisite] || 0) > 0
        : false;
};

// --- Public API ---
export const getClassPalette = (
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
        .filter(name => !PASSIVE_SKILLS.has(normalizeAbility(name)));
    const isLearned = (name: string): boolean => {
        const normalized = normalizeAbility(name);
        if (normalized === 'escape') return true;
        const aliases = abilityAliases(name);
        if (aliases.some(alias => learnedNames.has(alias) || (abilities[alias] || 0) > 0)) return true;
        const prerequisite = normalized === 'protect' ? 'rescue' : normalized === 'recover' ? 'missile' : '';
        return Boolean(prerequisite && (learnedNames.has(prerequisite) || (abilities[prerequisite] || 0) > 0));
    };
    const assignedCommands = [
        button.command,
        ...Object.values(button.swipeCommands || {}),
        ...Object.values(button.longSwipeCommands || {})
    ];
    const assignedAbilities = new Set(assignedCommands.flatMap(command => abilityAliases(getButtonAbilityName(command))));

    const learnedCommands = classAbilities.map((name): TacticalPaletteCommand => {
        const aliases = new Set(abilityAliases(name));
        const existing = buttons.find(candidate =>
            getClassKeyFromSetId(candidate.setId) === classKey
            && aliases.has(getButtonAbilityName(candidate.command, candidate.label))
        );
        const item = existing
            ? { key: existing.id, label: existing.label, command: existing.command, actionType: existing.actionType, setId: existing.setId }
            : { key: `class-${classKey}-${normalizeAbility(name)}`, label: name, command: toAbilityCommand(classKey, name), actionType: 'command' as const, setId };
        return { ...item, isLearned: isLearned(name) };
    }).filter(item => !abilityAliases(getButtonAbilityName(item.command, item.label)).some(alias => assignedAbilities.has(alias)));

    const additionalGeneratedCommands = buttons
        .filter(button => {
            if (getClassKeyFromSetId(button.setId) !== classKey) return false;
            const abilityName = getButtonAbilityName(button.command, button.label);
            if (abilityAliases(abilityName).some(alias => assignedAbilities.has(alias))) return false;
            return true;
        })
        .map(button => ({
            key: button.id,
            label: button.label,
            command: button.command,
            actionType: button.actionType,
            setId: button.setId,
            isLearned: isLearned(getButtonAbilityName(button.command, button.label))
        }));

    const seen = new Set<string>();
    return [...learnedCommands, ...additionalGeneratedCommands].filter(item => {
        const key = canonicalAbility(getButtonAbilityName(item.command, item.label));
        if (classKey === 'thief' && key === 'attack') return false;
        if (classKey === 'ranger' && (key === 'climb' || key === 'swim')) return false;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const WHEEL_FILL_ORDER: SwipeDirection[] = ['up', 'right', 'down', 'left', 'nw', 'ne', 'sw', 'se'];

/** Fill empty cardinal cells first, then diagonals, leaving remaining commands in the palette below the wheel. */
export const fillEmptyWheelCells = (
    button: CustomButton,
    commands: TacticalPaletteCommand[]
): CustomButton => {
    const available = commands.filter(item => item.isLearned !== false && item.command.trim());
    if (!available.length) return button;

    const swipeCommands = { ...(button.swipeCommands || {}) };
    const swipeActionTypes = { ...(button.swipeActionTypes || {}) };
    const assigned = new Set([
        button.command,
        ...Object.values(button.swipeCommands || {}),
        ...Object.values(button.longSwipeCommands || {})
    ].map(command => command.trim().toLowerCase()).filter(Boolean));
    let commandIndex = 0;
    let changed = false;

    WHEEL_FILL_ORDER.forEach(direction => {
        if (swipeCommands[direction]?.trim() || button.longSwipeCommands?.[direction]?.trim()) return;
        while (commandIndex < available.length && assigned.has(available[commandIndex].command.trim().toLowerCase())) {
            commandIndex += 1;
        }
        const item = available[commandIndex++];
        if (!item) return;
        swipeCommands[direction] = item.command;
        swipeActionTypes[direction] = item.actionType || 'command';
        assigned.add(item.command.trim().toLowerCase());
        changed = true;
    });

    return changed ? { ...button, swipeCommands, swipeActionTypes } : button;
};
