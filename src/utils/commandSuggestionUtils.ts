/**
 * @file commandSuggestionUtils.ts
 * @description Helper functions and interfaces for command, spell, and target suggestion processing.
 */

import type { DrawerLine, GmcpOccupant, PracticeSkill, TeleportTarget } from '../types';
import { getWhoPlayerNames } from './chatWindowUtils';
import { sanitizeGameTarget } from './gameUtils';
import { MAGE_SPELLS } from './spellLists';
import { getMagicKeyId, pruneExpiredMagicKeys } from './magicKeyUtils';
import { getTraitsForName } from './inlineActionModel';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';
import { makeCommandTargetSuggestion, type CommandTargetSuggestion } from '../objects/targetSuggestionTypes';
import {
    getAssistTargetSuggestions, getGiveRecipientSuggestions, getGroupTargetSuggestions, getRescueTargetSuggestions,
    getRoomCorpseTargetSuggestions, getRoomObjectTargetsWithExit, getRoomTargetSuggestions
} from '../objects/roomTargetSuggestions';
import {
    getContainerTargetSuggestions, getDrinkTargetSuggestions, getFillTargetSuggestions, getFluidContainerTargetSuggestions,
    getFoodTargetSuggestions, getGearTargetSuggestions, getInventoryAndWornTargetSuggestions,
    getLanternTargetSuggestions
} from '../objects/gearTargetSuggestions';

export { makeCommandTargetSuggestion };
export type { CommandTargetSuggestion };
export {
    getAssistTargetSuggestions, getGiveRecipientSuggestions, getGroupTargetSuggestions, getRescueTargetSuggestions,
    getRoomCorpseTargetSuggestions, getRoomObjectTargetsWithExit, getRoomTargetSuggestions
};
export {
    getContainerTargetSuggestions, getDrinkTargetSuggestions, getFillTargetSuggestions, getFluidContainerTargetSuggestions,
    getFoodTargetSuggestions, getGearTargetSuggestions, getInventoryAndWornTargetSuggestions,
    getLanternTargetSuggestions
};

// --- Type Section ---

export interface CommandTextParts {
    leading: string;
    token: string;
    suffix: string;
    isValid: boolean;
    autocomplete: string;
}

const normalizeTargetSuggestionValue = (value: string): string => {
    const sanitized = sanitizeGameTarget(value) || value.trim();
    return sanitized.toLowerCase().replace(/^\d+\./, '').replace(/^[*-]+|[*-]+$/g, '');
};

export const isTargetSuggestionMatch = (
    suggestion: CommandTargetSuggestion,
    target: string | null | undefined
): boolean => {
    if (!target?.trim()) return false;
    if (suggestion.value.trim().toLowerCase() === target.trim().toLowerCase()) return true;
    return normalizeTargetSuggestionValue(suggestion.value) === normalizeTargetSuggestionValue(target);
};

export const prioritizeTargetSuggestion = (
    suggestions: CommandTargetSuggestion[],
    preferredTarget: string | null | undefined
): CommandTargetSuggestion[] => {
    if (!preferredTarget?.trim() || suggestions.length < 2) return suggestions;

    const exactValue = preferredTarget.trim().toLowerCase();
    let matchIndex = suggestions.findIndex(suggestion => suggestion.value.trim().toLowerCase() === exactValue);
    if (matchIndex < 0) {
        matchIndex = suggestions.findIndex(suggestion => isTargetSuggestionMatch(suggestion, preferredTarget));
    }
    if (matchIndex <= 0) return suggestions;

    return [suggestions[matchIndex], ...suggestions.slice(0, matchIndex), ...suggestions.slice(matchIndex + 1)];
};

export const prioritizeOffensiveRoomEntitySuggestions = (
    suggestions: CommandTargetSuggestion[]
): CommandTargetSuggestion[] => suggestions
    .map((suggestion, index) => ({
        suggestion,
        index,
        priority: suggestion.meta?.toLowerCase() === 'enemy' ? 0
            : suggestion.meta?.toLowerCase() === 'npc' ? 1
            : 2
    }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .map(entry => entry.suggestion);

export const getSelfTargetSuggestion = (): CommandTargetSuggestion =>
    makeCommandTargetSuggestion('Self', 'self', 'self');

export const getSelfAndRoomTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    roomItems: Array<string | GmcpOccupant>,
    selfName: string
): CommandTargetSuggestion[] => {
    const isAlly = (source: string | GmcpOccupant): boolean => {
        if (typeof source === 'string') return false;
        const normalizedType = normalizeOccupantType(source)?.toLowerCase();
        if (['enemy', 'neutral', 'you', 'self'].includes(normalizedType || '')) return false;
        const tags = [source.category, ...(source.labels || []), ...(source.flags || [])]
            .filter(Boolean)
            .map(tag => String(tag).toLowerCase().replace(/^(?:cat|trait)-/, ''));
        const hasAllyTag = tags.some(tag => ['ally', 'allies', 'friend', 'grouped'].includes(tag));
        return normalizedType === 'ally' || normalizedType === 'player' || source.pc === true || source.pc === 1
            || hasAllyTag;
    };
    const isNpc = (source: string | GmcpOccupant): boolean => {
        if (typeof source === 'string') return true;
        const normalizedType = normalizeOccupantType(source)?.toLowerCase();
        return !['enemy', 'neutral', 'you', 'self', 'ally'].includes(normalizedType || '')
            && (normalizedType === 'npc' || source.pc === false || source.pc === 0);
    };
    const orderedCharacters = [
        ...characters.filter(isAlly),
        ...characters.filter(source => !isAlly(source) && isNpc(source))
    ];

    return [
        getSelfTargetSuggestion(),
        ...getRoomTargetSuggestions(orderedCharacters, roomItems, 'characters', selfName)
    ];
};

export const getSelfAndRoomAlliesTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    selfName: string
): CommandTargetSuggestion[] => [
    getSelfTargetSuggestion(),
    ...getRoomTargetSuggestions(characters, [], 'allies', selfName)
];

export const appendNamedTargetSuggestions = (
    roomTargets: CommandTargetSuggestion[],
    extras: Array<{ label: string; value: string; meta: string }>
): CommandTargetSuggestion[] => [
    ...roomTargets,
    ...extras.map(extra => makeCommandTargetSuggestion(extra.label, extra.value, extra.meta))
];

export const getMountTargetSuggestions = (
    characters: GmcpOccupant[],
    includeUnsaddleAll = false
): CommandTargetSuggestion[] => {
    const mounts = characters.filter(occupant => {
        const type = (occupant.type || '').toLowerCase();
        const isNpc = type === 'npc' || type === 'mount' || occupant.pc === false || occupant.pc === 0;
        if (!isNpc) return false;

        const traitTags = [occupant.category, ...(occupant.labels || []), ...(occupant.flags || [])]
            .filter(Boolean)
            .map(tag => String(tag).toLowerCase().replace(/^trait-/, '').replace(/^inline-/, ''));
        const hasMountTrait = type === 'mount'
            || traitTags.some(tag => tag === 'mount' || tag === 'mounts')
            || getTraitsForName([occupant.name, occupant.short, occupant.shortdesc, occupant.keyword].filter(Boolean).join(' '))
                .some(trait => trait.id === 'trait-mount');
        return hasMountTrait;
    });

    return [
        makeCommandTargetSuggestion('Mount', 'mount', 'mount'),
        ...(includeUnsaddleAll ? [makeCommandTargetSuggestion('Mount All', 'mount all', 'mount')] : []),
        ...getRoomTargetSuggestions(mounts, [], 'characters')
    ];
};

export const getLearnedMageSpellSuggestions = (
    practiceSkills: PracticeSkill[] = [],
    abilities: Record<string, number> = {}
): CommandTargetSuggestion[] => {
    const learnedNames = new Map<string, string>();
    practiceSkills.forEach(skill => {
        if (skill.skillClass?.toLowerCase() !== 'mage' || skill.proficiency <= 0) return;
        const name = skill.name.trim().replace(/\s+/g, ' ');
        if (name) learnedNames.set(name.toLowerCase(), name);
    });
    Object.entries(abilities).forEach(([name, proficiency]) => {
        const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (proficiency > 0 && MAGE_SPELLS.some(spell => spell.toLowerCase() === normalized)) {
            learnedNames.set(normalized, MAGE_SPELLS.find(spell => spell.toLowerCase() === normalized) || name);
        }
    });

    const canonicalOrder = MAGE_SPELLS
        .filter(spell => learnedNames.has(spell.toLowerCase()))
        .map(spell => spell.toLowerCase());
    const additionalLearned = Array.from(learnedNames.keys()).filter(name => !canonicalOrder.includes(name));
    return [...canonicalOrder, ...additionalLearned].map(name => {
        const label = learnedNames.get(name) || name;
        return { key: `mage-spell-${name}`, label, value: name, meta: 'spell' };
    });
};

export const getMagicKeyTargetSuggestions = (targets: TeleportTarget[]): CommandTargetSuggestion[] =>
    pruneExpiredMagicKeys(targets).map((target, index) => {
        const value = getMagicKeyId(target);
        const label = target.label || target.name || value;
        return { key: `magic-key-${target.id || index}`, label, value, meta: 'magic-key', customLabel: target.customName, expiresAt: target.expiresAt, isFavorite: target.isFavorite };
    }).sort((left, right) => Number(Boolean(right.isFavorite)) - Number(Boolean(left.isFavorite)));

// --- Logic Section ---

export const getWhoTargetSuggestions = (
    whoList: string[],
    selfName = ''
): CommandTargetSuggestion[] => {
    const names = getWhoPlayerNames(whoList);
    return names.flatMap((name, index) => {
        if (!name || (selfName && name.toLowerCase() === selfName.toLowerCase())) return [];
        return [{ key: `who-${index}-${name}`, label: name, value: name, meta: 'who' }];
    });
};

export const MUME_SOCIAL_COMMANDS = [
    'accuse', 'apologise', 'applaud', 'beg', 'blush', 'bounce', 'bow', 'burp',
    'cackle', 'chuckle', 'clap', 'comfort', 'cough', 'curtsey', 'dance', 'frown',
    'gasp', 'giggle', 'glare', 'grin', 'hiccup', 'hug', 'hum', 'kiss',
    'laugh', 'lick', 'love', 'moan', 'mumble', 'no', 'nod', 'poke',
    'ponder', 'pout', 'purr', 'ruffle', 'shiver', 'shrug', 'sigh', 'slap',
    'smile', 'smirk', 'snap', 'sneeze', 'snicker', 'sniff', 'snore', 'spit',
    'stare', 'strut', 'thank', 'think', 'tickle', 'wave', 'wink', 'yawn', 'yes'
];

export const getSocialTargetSuggestions = (): CommandTargetSuggestion[] => (
    MUME_SOCIAL_COMMANDS.map((soc, index) => ({
        key: `social-${index}-${soc}`,
        label: soc.charAt(0).toUpperCase() + soc.slice(1),
        value: soc,
        meta: 'social'
    }))
);

/**
 * Replaces or appends the target argument for a command string.
 */
export const replaceCommandArgumentToken = (command: string, target: string): string => {
    const leadingWhitespace = command.match(/^\s*/)?.[0] ?? '';
    const leadingTrimmed = command.trimStart();
    const commandMatch = /^(\S+)(\s*)([\s\S]*)$/.exec(leadingTrimmed);
    if (!commandMatch) return command;

    const commandToken = commandMatch[1];
    const spacing = commandMatch[2] || ' ';
    const argumentText = commandMatch[3] || '';
    const argumentLeading = argumentText.match(/^\s*/)?.[0] ?? '';
    const argumentRest = argumentText.slice(argumentLeading.length);
    const trailing = argumentRest.replace(/^\S*/, '');

    return `${leadingWhitespace}${commandToken}${spacing}${argumentLeading}${target}${trailing || ' '}`;
};

/**
 * Maps suggestion index to 1-9 or 0 hotkey string.
 */
export const suggestionHotkeyForIndex = (index: number): string | null => {
    if (index < 9) return String(index + 1);
    if (index === 9) return '0';
    return null;
};
