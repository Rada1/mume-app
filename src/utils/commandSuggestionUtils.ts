/**
 * @file commandSuggestionUtils.ts
 * @description Helper functions and interfaces for command, spell, and target suggestion processing.
 */

import type { DrawerLine, GmcpOccupant, PracticeSkill, TeleportTarget } from '../types';
import { getOccupantCommandKeyword } from './occupantKeywordUtils';
import { extractMumeKeyword } from './keywordUtils';
import { getWhoPlayerNames } from './chatWindowUtils';
import { isFluidContainer, isItemContainer, sanitizeGameTarget } from './gameUtils';
import { MAGE_SPELLS } from './spellLists';
import { getMagicKeyId, pruneExpiredMagicKeys } from './magicKeyUtils';
import { getTraitsForName } from './inlineActionModel';
import { getContainerCommand } from './gearPanelUtils';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';
import { BLANK_TARGET_VALUE } from './commandTargetUtils';

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
        const isNpc = normalizedType === 'npc' || source.pc === false || source.pc === 0;
        const hasAllyTag = tags.some(tag => ['ally', 'allies', 'friend', 'grouped'].includes(tag));
        return normalizedType === 'ally' || source.pc === true || source.pc === 1
            || (isNpc && hasAllyTag);
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
    const getAllyPriority = (source: string | GmcpOccupant): number | null => {
        if (typeof source === 'string') return null;
        const normalizedType = normalizeOccupantType(source)?.toLowerCase();
        if (normalizedType === 'enemy' || normalizedType === 'neutral' || normalizedType === 'you' || normalizedType === 'self') return null;

        const tags = [source.category, ...(source.labels || []), ...(source.flags || [])]
            .filter(Boolean)
            .map(tag => String(tag).toLowerCase().replace(/^(?:cat|trait)-/, ''));
        const hasAllyTag = tags.some(tag => ['ally', 'allies', 'friend', 'grouped'].includes(tag));
        const isNpc = (source.type || '').toLowerCase() === 'npc' || source.pc === false || source.pc === 0;
        if (isNpc && (hasAllyTag || normalizedType === 'ally')) return 0;
        if (normalizedType === 'ally' || source.pc === true || source.pc === 1) return 1;
        return null;
    };
    const orderedSources = kind === 'allies'
        ? sources.map((source, index) => ({ source, index, priority: getAllyPriority(source) }))
            .filter((entry): entry is { source: string | GmcpOccupant; index: number; priority: number } => entry.priority !== null)
            .sort((a, b) => a.priority - b.priority)
        : sources.map((source, index) => ({ source, index, priority: 0 }));
    const suggestions = orderedSources.flatMap(({ source, index }) => {
        const occupant: GmcpOccupant = typeof source === 'string' ? { name: source } : source;
        const type = (occupant.type || '').toLowerCase();
        const label = occupant.short || occupant.shortdesc || occupant.name || occupant.keyword || '';
        if (!label || (selfName && label.toLowerCase() === selfName.toLowerCase())) return [];
        const value = getOccupantCommandKeyword(occupant, label);
        if (!value) return [];
        return [{ key: `${occupant.id ?? index}-${value}`, label, value, meta: type || kind }];
    });

    const totalByKeyword = new Map<string, number>();
    suggestions.forEach(({ value }) => {
        const keyword = value.toLowerCase();
        totalByKeyword.set(keyword, (totalByKeyword.get(keyword) || 0) + 1);
    });

    const ordinalByKeyword = new Map<string, number>();
    return suggestions.map(suggestion => {
        const keyword = suggestion.value.toLowerCase();
        const total = totalByKeyword.get(keyword) || 0;
        if (total < 2) return suggestion;

        const ordinal = (ordinalByKeyword.get(keyword) || 0) + 1;
        ordinalByKeyword.set(keyword, ordinal);
        const displayKeyword = suggestion.value.replace(/^[*-]+|[*-]+$/g, '');
        return {
            ...suggestion,
            label: `${ordinal}.${displayKeyword}`,
            value: `${ordinal}.${suggestion.value}`
        };
    });
};

export const getAssistTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    selfName = ''
): CommandTargetSuggestion[] => [
    makeCommandTargetSuggestion('Blank Target', BLANK_TARGET_VALUE, 'source'),
    ...getRoomTargetSuggestions(characters, [], 'allies', selfName)
];

export const getRescueTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    selfName = ''
): CommandTargetSuggestion[] => [
    makeCommandTargetSuggestion('1.ally', '1.ally', 'ally'),
    ...getRoomTargetSuggestions(characters, [], 'allies', selfName)
];

const disambiguateGearSuggestions = (suggestions: CommandTargetSuggestion[]): CommandTargetSuggestion[] => {
    const baseValue = (value: string) => value.trim().replace(/^\d+\./, '');
    const counts = new Map<string, number>();
    suggestions.forEach(suggestion => {
        const key = baseValue(suggestion.value).toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const ordinals = new Map<string, number>();
    return suggestions.map(suggestion => {
        const value = baseValue(suggestion.value);
        const key = value.toLowerCase();
        if ((counts.get(key) || 0) < 2) return suggestion;
        const ordinal = (ordinals.get(key) || 0) + 1;
        ordinals.set(key, ordinal);
        return { ...suggestion, label: `${ordinal}.${value}`, value: `${ordinal}.${value}` };
    });
};

const getRawGearTargetSuggestions = (
    lines: DrawerLine[],
    kind: 'inventory' | 'worn'
): CommandTargetSuggestion[] => lines.flatMap((line, index) => {
    if (!line.isItem || line.isHeader) return [];
    const label = line.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const value = line.context || extractMumeKeyword(label);
    if (!label || !value) return [];
    return [{ key: line.entityId || line.stableId || line.id || `${kind}-${index}`, label, value, meta: kind }];
});

export const getGearTargetSuggestions = (
    lines: DrawerLine[],
    kind: 'inventory' | 'worn'
): CommandTargetSuggestion[] => disambiguateGearSuggestions(getRawGearTargetSuggestions(lines, kind));

export const getInventoryAndWornTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => disambiguateGearSuggestions([
    ...getRawGearTargetSuggestions(inventoryLines, 'inventory'),
    ...getRawGearTargetSuggestions(wornLines, 'worn')
]);

export const getDrinkTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => {
    const fluidContainers = (lines: DrawerLine[]) => lines.filter(line =>
        line.isItem && !line.isHeader && isFluidContainer(`${line.text} ${line.rawText || ''} ${line.context || ''}`)
    );
    return [
        ...getInventoryAndWornTargetSuggestions(fluidContainers(inventoryLines), fluidContainers(wornLines)),
        { key: 'drink-water', label: 'water', value: 'water', meta: 'source' }
    ];
};

export const getLanternTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => getInventoryAndWornTargetSuggestions(
    inventoryLines.filter(line => line.isItem && /\blantern\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`)),
    wornLines.filter(line => line.isItem && /\blantern\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`))
);

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

    return disambiguateGearSuggestions([
        { key: 'container-exit', label: 'Exit', value: 'exit', meta: 'exit' },
        ...roomTargets,
        ...gearTargets(inventoryLines, 'inventory'),
        ...gearTargets(wornLines, 'worn')
    ]);
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
