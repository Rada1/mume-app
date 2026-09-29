/**
 * @file commandTargetUtils.ts
 * @description Utilities to detect targetable MUME commands and format commands with targets.
 */

// --- Logic Section ---
import { TARGETED_SKILLS } from './practiceClassCatalog';
import { getSpellSyntax } from './spellSyntaxUtils';
import { sanitizeGameTarget } from './gameUtils';

export const BLANK_TARGET_VALUE = '__blank_target__';

const TARGETED_VERBS = new Set([
    'kill', 'consider', 'assist', 'bash', 'kick', 'backstab',
    'charge', 'rescue', 'bandage', 'track', 'order', 'shoot',
    'hit', 'target', 'steal', 'envenom', 'examine', 'look',
    'open', 'close', 'lock', 'unlock', 'ride', 'lead',
    'disarm', 'tell', 'whisper', 'ask', 'social', 'portal', 'teleport'
]);

const SELF_TARGETED_SPELLS = new Set([
    'bless', 'cure light', 'cure serious', 'heal', 'cure critic', 'cure critical', 'bandage',
    'cure disease', 'create water', 'strength', 'remove poison', 'shroud',
    'cure blindness', 'sanctuary'
]);

const NO_ARGUMENT_SPELLS = new Set([
    'armour', 'shield', 'create food', 'sense life', 'detect magic', 'detect evil',
    'detect invisible', 'detect invisibility', 'word of recall', 'call familiar',
    'locate', 'magic blast', 'protection from evil', 'fear', 'breath of briskness'
]);

const SELF_ONLY_SPELLS = new Set([
    'night vision'
]);

const ROOM_TARGETED_SPELLS = new Set([
    'magic missile', 'ventriloquate', 'smother', 'chill touch', 'burning hands',
    'shocking grasp', 'lightning bolt', 'dispel evil', 'harm', 'colour spray',
    'fireball', 'call lightning', 'charm', 'sleep', 'silence', 'hold', 'curse',
    'blindness', 'energy drain', 'earthquake', 'dispel magic', 'darkness'
]);

const NON_SINGLE_TARGET_ROOM_SPELLS = new Set(['earthquake', 'darkness', 'ventriloquate']);
const HOSTILE_SINGLE_TARGET_VERBS = new Set([
    'kill', 'bash', 'kick', 'backstab', 'charge', 'shoot', 'hit', 'attack', 'steal', 'disarm'
]);
const HOSTILE_SINGLE_TARGET_SPELLS = new Set([
    'poison', 'black breath', 'fear'
]);

export type CommandTargetMenuKind =
    | 'containers'
    | 'self-room'
    | 'self-allies'
    | 'self-only'
    | 'self-inventory'
    | 'movement-wheel'
    | 'room-spell'
    | 'room-spell-with-extras'
    | 'door-direction'
    | 'gear'
    | 'worn-weapons'
    | 'weather-options'
    | 'room-corpses'
    | 'mounts'
    | 'lanterns'
    | 'mage-spells'
    | 'magic-keys'
    | 'bash'
    | 'pick'
    | 'who'
    | 'social'
    | 'room';

const getSpellName = (command: string): string | null => {
    const match = command.trim().match(/^(?:cast|c|commune)\s+['"]([^'"]+)['"]/i);
    return match?.[1]?.trim().toLowerCase() || null;
};

const getNoArgumentSpellCommand = (command: string): string | null => {
    const trimmed = command.trim();
    const spell = getSpellName(trimmed);
    if (!spell || !NO_ARGUMENT_SPELLS.has(spell)) return null;

    const commandPrefix = trimmed.match(/^((?:cast|c|commune)\s+['"][^'"]+['"])/i);
    return commandPrefix?.[1] || trimmed;
};

/** Classifies commands whose mobile hold menu has a specialized target list. */
export const getCommandTargetMenuKind = (command: string): CommandTargetMenuKind | null => {
    const trimmed = command.trim();
    if (!trimmed) return null;

    const verb = trimmed.split(/\s+/, 1)[0].toLowerCase();
    if (['open', 'close', 'lock', 'unlock'].includes(verb)) return 'containers';
    if (['ride', 'lead', 'saddle', 'unsaddle', 'abandon', 'dismount'].includes(verb)) return 'mounts';
    if (verb === 'bash') return 'bash';
    if (verb === 'scout') return /%n\s*\|\s*exit/i.test(trimmed) ? 'door-direction' : 'movement-wheel';
    if (verb === 'pick') return 'pick';
    if (['portal', 'teleport', 'scry'].includes(verb) || verb === 'watch') return 'magic-keys';
    if (['tell', 'whisper', 'ask'].includes(verb)) return 'who';
    if (verb === 'social') return 'social';
    if (verb === 'escape') return 'self-only';
    if (verb === 'hide') return 'self-inventory';

    const spell = getSpellName(trimmed);
        if (spell) {
        if (NO_ARGUMENT_SPELLS.has(spell)) return null;
        if (spell === 'block door' || spell === 'break door') return 'door-direction';
        if (spell === 'raise dead') return 'room-corpses';
        if (spell === 'enchant') return 'gear';
        if (spell === 'identify') return 'gear';
        if (spell === 'create light') return 'lanterns';
        if (spell === 'control weather') return 'weather-options';
        if (spell === 'store') return 'mage-spells';
        if (['portal', 'teleport', 'scry', 'watch room'].includes(spell)) return 'magic-keys';
        if (SELF_ONLY_SPELLS.has(spell)) return 'self-only';
        if (spell === 'bless') return 'self-allies';
        if (SELF_TARGETED_SPELLS.has(spell)) return 'self-room';
        if (spell === 'black breath') return 'room';
        if (ROOM_TARGETED_SPELLS.has(spell)) {
            return spell === 'fireball' || spell === 'burning hands'
                ? 'room-spell-with-extras'
                : 'room-spell';
        }
        if (TARGETED_SKILLS.has(spell) || getSpellSyntax(spell).includes('<target>')) return 'room';
        return null;
    }

    if (trimmed.includes('%n')) return 'room';
    if (verb === 'bandage') return 'self-room';
    if (verb === 'envenom') return 'worn-weapons';
    if (TARGETED_VERBS.has(verb) || TARGETED_SKILLS.has(verb)) return 'room';
    return null;
};

/** Identifies offensive, single-target commands whose menus should favor the current target. */
export const isOffensiveSingleTargetCommand = (command: string): boolean => {
    const kind = getCommandTargetMenuKind(command);
    if (kind === 'bash') return true;

    const spell = getSpellName(command);
    if (spell) {
        if (kind === 'room-spell' || kind === 'room-spell-with-extras') {
            return !NON_SINGLE_TARGET_ROOM_SPELLS.has(spell);
        }
        return kind === 'room' && HOSTILE_SINGLE_TARGET_SPELLS.has(spell);
    }

    return kind === 'room' && HOSTILE_SINGLE_TARGET_VERBS.has(command.trim().split(/\s+/, 1)[0].toLowerCase());
};

/** Target preselected when a specialized menu opens without an explicit choice. */
export const getDefaultCommandTarget = (command: string): string | null => {
    const verb = command.trim().split(/\s+/, 1)[0].toLowerCase();
    if (verb === 'look' || verb === 'assist') return BLANK_TARGET_VALUE;
    if (verb === 'rescue') return '1.ally';

    const kind = getCommandTargetMenuKind(command);
    if (kind === 'self-room' || kind === 'self-allies' || kind === 'self-only') return 'self';
    if (kind === 'self-inventory') return 'self';
    if (kind === 'mounts') return 'mount';
    if (kind === 'containers' || kind === 'pick' || kind === 'door-direction') return 'exit';
    return null;
};

/**
 * Checks if a given MUME command string accepts a target entity.
 */
export const canCommandAcceptTarget = (command: string): boolean => {
    if (!command || !command.trim()) return false;
    const trimmed = command.trim();
    if (getNoArgumentSpellCommand(trimmed)) return false;

    // Explicit wildcard target placeholder
    if (trimmed.includes('%n')) return true;

    if (getCommandTargetMenuKind(trimmed)) return true;

    // Check for quoted spell: cast 'fireball' or c 'fireball' or commune 'bless'
    const spellMatch = trimmed.match(/^(?:cast|c|commune)\s+'([^']+)'/i);
    if (spellMatch) {
        const spellName = spellMatch[1].trim().toLowerCase();
        if (TARGETED_SKILLS.has(spellName)) return true;
        const syntax = getSpellSyntax(spellName);
        return syntax.includes('<target>');
    }

    // Check for targeted combat/skill verbs
    const verbMatch = trimmed.match(/^([a-zA-Z]+)(?:\s+.*)?$/);
    if (verbMatch) {
        const verb = verbMatch[1].toLowerCase();
        if (TARGETED_VERBS.has(verb)) return true;
        if (TARGETED_SKILLS.has(verb)) return true;
    }

    return false;
};

/**
 * Applies a target to a command string if the command accepts a target.
 * If command already has %n, replaces %n.
 * If command does not have %n and is targeted, appends the target unless already present.
 */
export const applyTargetToCommand = (command: string, target: string | null): string => {
    if (!command || !command.trim()) return command;
    const noArgumentSpellCommand = getNoArgumentSpellCommand(command);
    if (noArgumentSpellCommand) return noArgumentSpellCommand;

    const cleanTarget = target && target !== BLANK_TARGET_VALUE
        ? (sanitizeGameTarget(target) || target.trim())
        : null;

    // Handle %n wildcard
    if (command.includes('%n')) {
        if (command.match(/%n\|/)) {
            return command.replace(/%n\|([^\s]+)/g, (_match, fallback) => {
                return cleanTarget || fallback;
            });
        }
        if (cleanTarget) {
            return command.replace(/%n/g, cleanTarget);
        }
        return command.replace(/\s*%n/g, '').trim();
    }

    if (!cleanTarget) return command.trim();

    // If the command cannot accept a target (e.g. 'flee' or 'score'), leave as-is.
    if (!canCommandAcceptTarget(command)) {
        return command;
    }

    const trimmed = command.trim();

    // Door swipes append a direction after their exit/container argument
    // (for example, "close exit west"). Replace the target argument while
    // retaining that trailing direction.
    const doorMatch = trimmed.match(/^(open|close|lock|unlock|knock)\s+(\S+)(?:\s+(.*))?$/i);
    if (doorMatch) {
        const [, verb, , trailingArgs] = doorMatch;
        return `${verb} ${cleanTarget}${trailingArgs ? ` ${trailingArgs}` : ''}`;
    }

    // Quoted spell: cast 'fireball' -> cast 'fireball' orc
    const spellMatch = trimmed.match(/^((?:cast|c|commune)\s+'[^']+')(?:\s+(.*))?$/i);
    if (spellMatch) {
        const base = spellMatch[1];
        const existingArg = (spellMatch[2] || '').trim();
        // If an explicit target was already attached (e.g. cast 'fireball' guard), replace it or keep
        return `${base} ${cleanTarget}`;
    }

    // Verb command: bash -> bash orc, kill -> kill orc
    const verbMatch = trimmed.match(/^([a-zA-Z]+)(?:\s+(.*))?$/);
    if (verbMatch) {
        const verb = verbMatch[1];
        return `${verb} ${cleanTarget}`;
    }

    return `${trimmed} ${cleanTarget}`;
};
