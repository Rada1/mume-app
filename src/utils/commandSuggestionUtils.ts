/**
 * @file commandSuggestionUtils.ts
 * @description Helper functions and interfaces for command, spell, and target suggestion processing.
 */

import type { DrawerLine, GmcpOccupant, PracticeSkill, TeleportTarget } from '../types';
import { getOccupantCommandKeyword } from './occupantKeywordUtils';
import { extractMumeKeyword } from './keywordUtils';
import { getWhoPlayerNames } from './chatWindowUtils';
import { isItemContainer } from './gameUtils';
import { MAGE_SPELLS } from './spellLists';
import { getMagicKeyId, pruneExpiredMagicKeys } from './magicKeyUtils';
import { getTraitsForName } from './inlineActionModel';
import { getContainerCommand } from './gearPanelUtils';

// --- Type Section ---

export interface CommandTargetSuggestion {
    key: string;
    label: string;
    value: string;
    meta: string;
    containerId?: string;
    containerCommand?: string;
}

export interface CommandTextParts {
    leading: string;
    token: string;
    suffix: string;
    isValid: boolean;
    autocomplete: string;
}

export const makeCommandTargetSuggestion = (
    label: string,
    value: string,
    meta: string
): CommandTargetSuggestion => ({
    key: `${meta}-${value.toLowerCase().replace(/\s+/g, '-')}`,
    label,
    value,
    meta
});

export const getSelfTargetSuggestion = (): CommandTargetSuggestion =>
    makeCommandTargetSuggestion('Self', 'self', 'self');

export const getSelfAndRoomTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    roomItems: Array<string | GmcpOccupant>,
    selfName: string
): CommandTargetSuggestion[] => [
    getSelfTargetSuggestion(),
    ...getRoomTargetSuggestions(characters, roomItems, 'characters', selfName)
];

export const appendNamedTargetSuggestions = (
    roomTargets: CommandTargetSuggestion[],
    extras: Array<{ label: string; value: string; meta: string }>
): CommandTargetSuggestion[] => [
    ...roomTargets,
    ...extras.map(extra => makeCommandTargetSuggestion(extra.label, extra.value, extra.meta))
];

export const getRoomObjectTargetsWithExit = (
    roomObjects: Array<string | GmcpOccupant>
): CommandTargetSuggestion[] => appendNamedTargetSuggestions(
    getRoomTargetSuggestions([], roomObjects, 'objects'),
    [{ label: 'Exit', value: 'exit', meta: 'exit' }]
);

export const getRoomCorpseTargetSuggestions = (
    roomObjects: Array<string | GmcpOccupant>
): CommandTargetSuggestion[] => getRoomTargetSuggestions(
    [],
    roomObjects.filter(source => {
        if (typeof source === 'string') return /\bcorpse\b/i.test(source);
        const searchable = [source.name, source.short, source.shortdesc, source.keyword, source.type, source.category, ...(source.flags || [])]
            .filter(Boolean)
            .join(' ');
        return /\bcorpse\b/i.test(searchable);
    }),
    'objects'
);

export const getMountTargetSuggestions = (
    characters: GmcpOccupant[]
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
        return { key: `magic-key-${target.id || index}`, label, value, meta: 'magic-key' };
    });

// --- Logic Section ---

export const getRoomTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    objects: Array<string | GmcpOccupant>,
    kind: 'characters' | 'allies' | 'objects',
    selfName = ''
): CommandTargetSuggestion[] => {
    const sources = kind === 'objects' ? objects : characters;
    return sources.flatMap((source, index) => {
        const occupant: GmcpOccupant = typeof source === 'string' ? { name: source } : source;
        const type = (occupant.type || '').toLowerCase();
        if (kind === 'allies' && (type === 'enemy' || type === 'npc' || occupant.pc === false || occupant.pc === 0)) return [];
        const label = occupant.short || occupant.shortdesc || occupant.name || occupant.keyword || '';
        if (!label || (selfName && label.toLowerCase() === selfName.toLowerCase())) return [];
        const value = getOccupantCommandKeyword(occupant, label);
        if (!value) return [];
        return [{ key: `${occupant.id ?? index}-${value}`, label, value, meta: type || kind }];
    });
};

export const getGearTargetSuggestions = (
    lines: DrawerLine[],
    kind: 'inventory' | 'worn'
): CommandTargetSuggestion[] => lines.flatMap((line, index) => {
    if (!line.isItem || line.isHeader) return [];
    const label = line.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const value = line.context || extractMumeKeyword(label);
    if (!label || !value) return [];
    return [{ key: line.entityId || line.stableId || line.id || `${kind}-${index}`, label, value, meta: kind }];
});

export const getInventoryAndWornTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => [
    ...getGearTargetSuggestions(inventoryLines, 'inventory'),
    ...getGearTargetSuggestions(wornLines, 'worn')
];

export const getContainerTargetSuggestions = (
    roomItems: Array<string | GmcpOccupant>,
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => {
    const roomTargets = roomItems.flatMap((source, index) => {
        const item: GmcpOccupant = typeof source === 'string' ? { name: source } : source;
        const label = item.short || item.shortdesc || item.name || item.keyword || '';
        const classification = [item.type, item.category, ...(item.flags || [])].join(' ');
        if (!label || (!/container/i.test(classification) && !isItemContainer(label))) return [];
        const suggestion = getRoomTargetSuggestions([], [item], 'objects')[0];
        if (!suggestion) return [];
        const containerId = item.id !== undefined ? String(item.id) : `room-container-${index}-${suggestion.value}`;
        return [{
            ...suggestion,
            key: `room-${containerId}-${suggestion.value}`,
            meta: 'room',
            containerId,
            containerCommand: `look in ${suggestion.value}`
        }];
    });

    const gearTargets = (lines: DrawerLine[], kind: 'inventory' | 'worn') => lines.flatMap((line, index) => {
        if (line.isHeader || !line.isItem || !(line.isContainer || isItemContainer(`${line.text} ${line.rawText || ''}`))) return [];
        const suggestion = getGearTargetSuggestions([line], kind)[0];
        if (!suggestion) return [];
        return [{
            ...suggestion,
            key: `${kind}-${suggestion.key || index}`,
            meta: kind,
            containerId: line.id,
            containerCommand: getContainerCommand(line, lines) || `look in ${suggestion.value}`
        }];
    });

    return [
        { key: 'container-exit', label: 'Exit', value: 'exit', meta: 'exit' },
        ...roomTargets,
        ...gearTargets(inventoryLines, 'inventory'),
        ...gearTargets(wornLines, 'worn')
    ];
};

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
    'accuse', 'apologize', 'applaud', 'beg', 'blush', 'bounce', 'bow', 'burp',
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
