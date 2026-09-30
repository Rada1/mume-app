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
        const aliases = abilityAliases(name);
        if (aliases.some(alias => learnedNames.has(alias) || (abilities[alias] || 0) > 0)) return true;
        const normalized = normalizeAbility(name);
        const prerequisite = normalized === 'protect' ? 'rescue' : normalized === 'recover' ? 'missile' : '';
        return Boolean(prerequisite && (learnedNames.has(prerequisite) || (abilities[prerequisite] || 0) > 0));
    };
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
        if (classKey === 'ranger' && (key === 'climb' || key === 'swim')) return false;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const WHEEL_FILL_ORDER: SwipeDirection[] = ['nw', 'up', 'ne', 'left', 'right', 'sw', 'down', 'se'];

/** Fill empty directional cells from the remaining usable palette commands, top row to bottom row. */
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
