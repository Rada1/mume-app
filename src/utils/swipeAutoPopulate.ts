/**
 * @file swipeAutoPopulate.ts
 * @description Builds practice-aware swipe-wheel defaults for class tactical buttons.
 */

import { CustomButton, PracticeData, SwipeDirection } from '../types';
import { CLASS_MAPPINGS } from './spellLists';

// --- Logic Section ---

const CLASS_BUTTON_IDS: Record<string, string> = {
    ranger: 'tactical-ranger',
    warrior: 'tactical-warrior',
    mage: 'tactical-mage',
    cleric: 'tactical-cleric',
    thief: 'tactical-thief'
};

const SWIPE_DIRECTIONS: SwipeDirection[] = ['up', 'right', 'down', 'left', 'ne', 'se', 'sw', 'nw'];

const COMMAND_OVERRIDES: Record<string, string> = {
    missile: 'shoot'
};

const normalizeAbilityName = (name: string): string => name.trim().toLowerCase();

const toCommand = (classKey: string, abilityName: string): string => {
    const normalized = normalizeAbilityName(abilityName);
    if (COMMAND_OVERRIDES[normalized]) return COMMAND_OVERRIDES[normalized];
    if (classKey === 'mage' || classKey === 'cleric') return `cast '${abilityName}'`;
    return normalized;
};

const getKnownClassAbilities = (
    classKey: string,
    abilities: Record<string, number>,
    practiceData: PracticeData | null
): string[] => {
    const seen = new Set<string>();
    const known: string[] = [];
    const allowed = new Set((CLASS_MAPPINGS[classKey] || []).map(normalizeAbilityName));

    practiceData?.skills.forEach(skill => {
        const name = skill.name.trim();
        const normalized = normalizeAbilityName(name);
        const skillClass = skill.skillClass?.toLowerCase();
        if (skill.proficiency <= 0 || skillClass !== classKey || !allowed.has(normalized) || seen.has(normalized)) return;
        seen.add(normalized);
        known.push(name);
    });

    (CLASS_MAPPINGS[classKey] || []).forEach(name => {
        const normalized = normalizeAbilityName(name);
        if ((abilities[normalized] || 0) <= 0 || seen.has(normalized)) return;
        seen.add(normalized);
        known.push(name);
    });

    return known;
};

const applySwipeDefaults = (button: CustomButton, classKey: string, knownAbilities: string[]): CustomButton => {
    if (knownAbilities.length === 0) return button;

    const swipeCommands = { ...(button.swipeCommands || {}) };
    const swipeActionTypes = { ...(button.swipeActionTypes || {}) };
    let abilityIndex = 0;
    let changed = false;

    SWIPE_DIRECTIONS.forEach(direction => {
        if (swipeCommands[direction]?.trim()) return;
        const ability = knownAbilities[abilityIndex];
        abilityIndex += 1;
        if (!ability) return;

        swipeCommands[direction] = toCommand(classKey, ability);
        swipeActionTypes[direction] = 'command';
        changed = true;
    });

    return changed ? { ...button, swipeCommands, swipeActionTypes } : button;
};

export const applyPracticeSwipeDefaults = (
    button: CustomButton,
    abilities: Record<string, number>,
    practiceData: PracticeData | null
): CustomButton => {
    const classKey = Object.entries(CLASS_BUTTON_IDS).find(([, id]) => id === button.id)?.[0];
    if (!classKey) return button;

    const knownAbilities = getKnownClassAbilities(classKey, abilities, practiceData);
    return applySwipeDefaults(button, classKey, knownAbilities);
};

