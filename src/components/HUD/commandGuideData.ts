/** @file commandGuideData.ts — Searchable reference entries for MUME commands and abilities. */

import { MUME_COMMANDS } from '../../utils/mumeCommandCatalog';
import { PASSIVE_SKILLS, PRACTICE_CLASS_SKILLS, TARGETED_SKILLS, type PracticeClassKey } from '../../utils/practiceClassCatalog';
import { SOCIAL_BUTTONS } from '../../constants/buttons/socials';

export type GuideCategory = 'Combat' | 'Skills & spells' | 'Movement' | 'Items & equipment' | 'Information' | 'Social' | 'Other';

export interface GuideEntry {
    id: string;
    name: string;
    command: string;
    category: GuideCategory;
    searchText: string;
    detail: string;
    abilityClass?: PracticeClassKey;
    isPassive?: boolean;
    needsTarget?: boolean;
}

const GROUPS: Record<GuideCategory, Set<string>> = {
    'Combat': new Set(['kill', 'attack', 'bash', 'backstab', 'consider', 'disengage', 'flee', 'hit', 'kick', 'missile', 'shoot', 'rescue', 'protect', 'assist', 'charge', 'poison', 'shoot', 'tackle']),
    'Movement': new Set(['north', 'south', 'east', 'west', 'up', 'down', 'forward', 'backward', 'climb', 'swim', 'ride', 'dismount', 'follow', 'enter', 'leave', 'exits', 'map', 'track']),
    'Items & equipment': new Set(['get', 'take', 'drop', 'put', 'give', 'wear', 'remove', 'wield', 'hold', 'equipment', 'inventory', 'open', 'close', 'lock', 'unlock', 'buy', 'sell', 'value', 'list', 'pick', 'use', 'eat', 'drink', 'fill', 'empty']),
    'Information': new Set(['look', 'examine', 'score', 'stat', 'levels', 'who', 'where', 'time', 'weather', 'info', 'quests', 'map', 'help', 'practice', 'history', 'achievements']),
    'Social': new Set(['say', 'tell', 'reply', 'ask', 'group', 'follow', 'narrate', 'emote', 'gesture', 'shout', 'whisper', 'sing', 'news', 'board', 'report', ...SOCIAL_BUTTONS.map(button => button.command.split(/\s+/)[0].toLowerCase())]),
    'Skills & spells': new Set(),
    'Other': new Set()
};

const TARGET_COMMANDS = new Set(['kill', 'attack', 'consider', 'assist', 'get', 'give', 'put', 'tell', 'ask', 'follow', 'rescue', 'protect', 'shoot', 'sell', 'buy', 'wear', 'remove', 'wield', 'hold', 'open', 'close', 'lock', 'unlock', 'examine', 'look']);
const INTENT_TERMS: Record<string, string> = {
    look: 'see room surroundings what is around me inspect place',
    exits: 'find exit door direction way out leave room',
    map: 'see map navigate where can i go',
    kill: 'attack fight enemy opponent start combat',
    attack: 'fight enemy opponent start combat',
    consider: 'judge strength compare how strong dangerous enemy',
    flee: 'escape run away retreat get out of combat',
    disengage: 'stop fighting get out of combat retreat',
    assist: 'help ally group member attack their enemy',
    rescue: 'save protect defend ally group member in danger',
    protect: 'guard defend keep ally safe',
    score: 'character status health hit points hp mana condition',
    who: 'players online people currently playing',
    inventory: 'what am i carrying items possessions backpack',
    equipment: 'what am i wearing equipped armor armour gear',
    get: 'pick up take collect loot item from ground',
    wear: 'equip put on armor armour clothing',
    remove: 'unequip take off armor armour clothing',
    wield: 'equip weapon use weapon in hand',
    hold: 'hold equip item in hand',
    put: 'place store item in container bag',
    give: 'hand item to someone transfer object',
    tell: 'send private message whisper to someone',
    say: 'speak talk to nearby people',
    group: 'party group members allies status',
    practice: 'train learn improve skill spell trainer guildmaster',
    help: 'instructions learn about command feature',
    heal: 'restore health hit points hp wounded ally self',
    'cure light': 'heal restore health hit points hp wounded ally self',
    'cure serious': 'heal restore health hit points hp wounded ally self',
    'cure critic': 'heal restore health hit points hp wounded ally self',
    'cure critical': 'heal restore health hit points hp wounded ally self',
    bandage: 'heal restore health treat wounded ally self',
    bless: 'buff help ally improve defense',
    sanctuary: 'protect defend shield self ally',
    armour: 'armor protect defend shield self ally',
    'magic missile': 'attack damage enemy offensive spell',
    backstab: 'sneak attack surprise enemy',
    'find the path': 'navigate directions travel route',
    locate: 'find locate object item person',
    identify: 'learn what an item does inspect object'
};

const getIntentTerms = (name: string): string => INTENT_TERMS[name.toLowerCase()] || '';

const labelFor = (value: string): string => value.replace(/\b\w/g, letter => letter.toUpperCase());
const abilityCommand = (name: string, abilityClass: PracticeClassKey): string => {
    const normalized = name.toLowerCase();
    const base = abilityClass === 'mage' || abilityClass === 'cleric' ? `cast '${normalized}'` : normalized === 'missile' ? 'shoot' : normalized;
    return TARGETED_SKILLS.has(normalized) ? `${base} <target>` : base;
};

export const buildCommandGuideEntries = (): GuideEntry[] => {
    const skillNames = new Set<string>();
    const skills: GuideEntry[] = [];
    (Object.entries(PRACTICE_CLASS_SKILLS) as [PracticeClassKey, string[]][]).forEach(([abilityClass, names]) => {
        names.forEach(name => {
            const normalized = name.toLowerCase();
            const command = abilityCommand(name, abilityClass);
            const id = `${abilityClass}:${normalized}`;
            if (skillNames.has(id)) return;
            skillNames.add(id);
            const isPassive = PASSIVE_SKILLS.has(normalized);
            skills.push({
                id, name, command, category: 'Skills & spells', abilityClass, isPassive,
                needsTarget: TARGETED_SKILLS.has(normalized),
                detail: `${labelFor(abilityClass)} ${isPassive ? 'passive skill' : abilityClass === 'mage' || abilityClass === 'cleric' ? 'spell' : 'skill'}`,
                searchText: `${name} ${abilityClass} ${command} skill spell ${getIntentTerms(name)}`.toLowerCase()
            });
        });
    });

    const skillCommands = new Set(skills.map(item => item.command.split(' <')[0].replace(/^cast '|'$/g, '').toLowerCase()));
    const commands = MUME_COMMANDS.map(entry => {
        const name = entry.full;
        const category = (Object.keys(GROUPS) as GuideCategory[]).find(group => GROUPS[group].has(name)) || 'Other';
        const needsTarget = TARGET_COMMANDS.has(name);
        const command = `${name}${needsTarget ? ' <target>' : ''}`;
        return {
            id: `command:${name}`, name: labelFor(name), command, category,
            needsTarget, detail: category === 'Other' ? 'MUME command' : `${category} command`,
            searchText: `${entry.display} ${entry.minimum} ${name} ${category} command ${getIntentTerms(name)}`.toLowerCase()
        } satisfies GuideEntry;
    }).filter(item => !skillCommands.has(item.name.toLowerCase()));

    const unique = new Map<string, GuideEntry>();
    [...skills, ...commands].forEach(item => {
        const key = `${item.category}:${item.command.toLowerCase()}`;
        if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values()).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
};

export const GUIDE_CATEGORIES: GuideCategory[] = ['Combat', 'Skills & spells', 'Movement', 'Items & equipment', 'Information', 'Social', 'Other'];
