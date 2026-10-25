/**
 * @file swipeCommandColors.ts
 * @description Resolves the special text colors used by tactical swipe commands.
 */

// --- Logic Section ---
import type { CustomButton } from '../types';

const MOBILE_COMMAND_COLORS = {
    gold: '#ffd700',
    green: 'var(--ansi-bright-green, #44ff70)',
    yellow: 'var(--ansi-bright-yellow, #f5f749)',
    magenta: 'var(--ansi-bright-magenta, #c084fc)',
    cyan: 'var(--ansi-bright-cyan, #38bdf8)',
    red: 'var(--ansi-bright-red, #f87171)',
    orange: '#f97316',
    white: '#f8fafc'
};

export const DEFAULT_COMMAND_TEXT_COLOR = MOBILE_COMMAND_COLORS.gold;

const SWIPE_COMMAND_TEXT_COLORS: Record<string, string> = {
    camp: MOBILE_COMMAND_COLORS.gold,
    climb: MOBILE_COMMAND_COLORS.green,
    swim: MOBILE_COMMAND_COLORS.green,
    ride: MOBILE_COMMAND_COLORS.green,
    group: MOBILE_COMMAND_COLORS.green,
    narrate: MOBILE_COMMAND_COLORS.yellow,
    yell: MOBILE_COMMAND_COLORS.magenta,
    shout: MOBILE_COMMAND_COLORS.red,
    sing: MOBILE_COMMAND_COLORS.yellow,
    say: MOBILE_COMMAND_COLORS.cyan,
    tell: MOBILE_COMMAND_COLORS.green,
    gtell: MOBILE_COMMAND_COLORS.green,
    gsay: MOBILE_COMMAND_COLORS.green,
    protect: MOBILE_COMMAND_COLORS.cyan,
    rescue: MOBILE_COMMAND_COLORS.cyan,
    disengage: MOBILE_COMMAND_COLORS.cyan,
    bandage: MOBILE_COMMAND_COLORS.cyan,
    hide: MOBILE_COMMAND_COLORS.magenta,
    sneak: MOBILE_COMMAND_COLORS.magenta,
    envenom: MOBILE_COMMAND_COLORS.magenta,
    open: MOBILE_COMMAND_COLORS.gold,
    lead: MOBILE_COMMAND_COLORS.green,
    abandon: MOBILE_COMMAND_COLORS.green,
    dismount: MOBILE_COMMAND_COLORS.green,
    close: MOBILE_COMMAND_COLORS.gold,
    lock: MOBILE_COMMAND_COLORS.gold,
    unlock: MOBILE_COMMAND_COLORS.gold,
    saddle: MOBILE_COMMAND_COLORS.gold,
    unsaddle: MOBILE_COMMAND_COLORS.gold,
    recover: MOBILE_COMMAND_COLORS.gold,
    eat: MOBILE_COMMAND_COLORS.gold,
    drink: MOBILE_COMMAND_COLORS.gold,
    throw: MOBILE_COMMAND_COLORS.gold,
    recite: MOBILE_COMMAND_COLORS.gold,
    wield: MOBILE_COMMAND_COLORS.gold,
    use: MOBILE_COMMAND_COLORS.gold,
    smoke: MOBILE_COMMAND_COLORS.gold,
    sheath: MOBILE_COMMAND_COLORS.gold,
    quaff: MOBILE_COMMAND_COLORS.gold,
    draw: MOBILE_COMMAND_COLORS.gold,
    load: MOBILE_COMMAND_COLORS.gold,
    mix: MOBILE_COMMAND_COLORS.gold,
    crush: MOBILE_COMMAND_COLORS.gold,
    pour: MOBILE_COMMAND_COLORS.gold,
    butcher: MOBILE_COMMAND_COLORS.gold,
    cook: MOBILE_COMMAND_COLORS.gold,
    bash: MOBILE_COMMAND_COLORS.red,
    kill: MOBILE_COMMAND_COLORS.red,
    k: MOBILE_COMMAND_COLORS.red,
    hit: MOBILE_COMMAND_COLORS.red,
    assist: MOBILE_COMMAND_COLORS.red,
    charge: MOBILE_COMMAND_COLORS.red,
    kick: MOBILE_COMMAND_COLORS.red,
    backstab: MOBILE_COMMAND_COLORS.red,
    shoot: MOBILE_COMMAND_COLORS.red,
    steal: MOBILE_COMMAND_COLORS.red,
    transfer: MOBILE_COMMAND_COLORS.yellow,
    teleport: MOBILE_COMMAND_COLORS.yellow,
    pick: MOBILE_COMMAND_COLORS.gold,
    knock: MOBILE_COMMAND_COLORS.gold,
    get: MOBILE_COMMAND_COLORS.gold,
    wear: MOBILE_COMMAND_COLORS.gold,
    take: MOBILE_COMMAND_COLORS.gold,
    remove: MOBILE_COMMAND_COLORS.gold,
    hold: MOBILE_COMMAND_COLORS.gold,
    give: MOBILE_COMMAND_COLORS.gold,
    drop: MOBILE_COMMAND_COLORS.gold,
    put: MOBILE_COMMAND_COLORS.gold,
    buy: MOBILE_COMMAND_COLORS.gold,
    sell: MOBILE_COMMAND_COLORS.gold,
    value: MOBILE_COMMAND_COLORS.gold,
    compare: MOBILE_COMMAND_COLORS.gold,
    show: MOBILE_COMMAND_COLORS.gold,
    list: MOBILE_COMMAND_COLORS.gold,
    mend: MOBILE_COMMAND_COLORS.gold,
    empty: MOBILE_COMMAND_COLORS.gold,
    taste: MOBILE_COMMAND_COLORS.gold,
    sip: MOBILE_COMMAND_COLORS.gold,
    forage: MOBILE_COMMAND_COLORS.gold,
    fill: MOBILE_COMMAND_COLORS.gold,
    light: MOBILE_COMMAND_COLORS.gold,
    snuff: MOBILE_COMMAND_COLORS.gold,
    cover: MOBILE_COMMAND_COLORS.gold,
    uncover: MOBILE_COMMAND_COLORS.gold,
};

const PURPLE_SWIPE_SPELLS = [
    'shield', 'armour', 'bless', 'sanctuary', 'shroud', 'enchant', 'breath of briskness',
    'detect magic', 'strength', 'sense life', 'detect invisible', 'detect invisibility', 'detect evil', 'detect poison',
    'night vision', 'store', 'protection from evil'
];
const CYAN_SWIPE_SPELLS = ['heal', 'cure serious', 'cure light', 'cure critic', 'cure disease', 'cure blindness', 'remove poison', 'remove curse', 'energy drain'];
const RED_SWIPE_SPELLS = [
    'dispel evil', 'dispel magic', 'harm', 'smother', 'blindness', 'lightning bolt', 'fireball',
    'burning hands', 'chill touch', 'magic missile', 'magic blast', 'shocking grasp', 'raise dead',
    'colour spray', 'call lightning', 'curse', 'poison', 'hold', 'black breath', 'ventriloquate',
    'earthquake', 'silence', 'fear', 'charm', 'sleep'
];
const WHITE_SWIPE_COMMANDS = ['locate', 'locate life', 'watch room', 'scry', 'scout', 'examine', 'track', 'search', 'consider', 'watch', 'reveal', 'where', 'flush', 'call familiar', 'control weather', 'find the path', 'divination'];
const GOLD_SWIPE_COMMANDS = ['create food', 'create water', 'create light'];
const ORANGE_SWIPE_COMMANDS = ['block door', 'break door'];
const GREEN_SWIPE_COMMANDS = ['teleport', 'word of recall', 'portal', 'transfer', 'summon', 'flee', 'escape'];

const INLINE_TRAIT_COLORS: Record<string, string> = {
    'trait-combat': MOBILE_COMMAND_COLORS.red,
    'trait-mage': MOBILE_COMMAND_COLORS.magenta,
    'trait-warrior': MOBILE_COMMAND_COLORS.red,
    'trait-ranger': MOBILE_COMMAND_COLORS.green,
    'trait-thief': MOBILE_COMMAND_COLORS.yellow,
    'trait-cleric': MOBILE_COMMAND_COLORS.cyan,
    'trait-offense': MOBILE_COMMAND_COLORS.red,
    'trait-retreat': MOBILE_COMMAND_COLORS.red,
    'trait-control': MOBILE_COMMAND_COLORS.red,
    'trait-buffs': MOBILE_COMMAND_COLORS.magenta,
    'trait-healing': MOBILE_COMMAND_COLORS.cyan,
    'trait-support': MOBILE_COMMAND_COLORS.green,
    'trait-utility': MOBILE_COMMAND_COLORS.white,
    'trait-door-actions': MOBILE_COMMAND_COLORS.orange,
    'trait-container': MOBILE_COMMAND_COLORS.gold,
    'trait-object-magic': MOBILE_COMMAND_COLORS.magenta,
    'trait-resurrection': MOBILE_COMMAND_COLORS.red,
    'trait-mount': MOBILE_COMMAND_COLORS.green,
    'trait-social': MOBILE_COMMAND_COLORS.cyan,
    'trait-communication': MOBILE_COMMAND_COLORS.cyan,
    'trait-examine': MOBILE_COMMAND_COLORS.white,
    'trait-observable': MOBILE_COMMAND_COLORS.white,
    'trait-consider': MOBILE_COMMAND_COLORS.white,
    'trait-identify': MOBILE_COMMAND_COLORS.white,
    'trait-group': MOBILE_COMMAND_COLORS.green,
    'trait-converse': MOBILE_COMMAND_COLORS.cyan
};

export const getInlineTraitTextColor = (traitId: string): string | undefined => INLINE_TRAIT_COLORS[traitId];

export const getSwipeCommandTextColor = (command: string): string | undefined => {
    const normalizedCommand = command.trim().toLowerCase();
    const spell = normalizedCommand.match(/^(?:cast|c|commune|skill)\s+['"]([^'"]+)['"]/i)?.[1]
        || normalizedCommand.replace(/^(?:cast|c|commune|skill)\s+/i, '').replace(/^['"]/, '').replace(/['"](?=\s|$)/g, '');
    if (ORANGE_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return MOBILE_COMMAND_COLORS.orange;
    }
    if (GOLD_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return MOBILE_COMMAND_COLORS.gold;
    }
    if (CYAN_SWIPE_SPELLS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return MOBILE_COMMAND_COLORS.cyan;
    }
    if (RED_SWIPE_SPELLS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return MOBILE_COMMAND_COLORS.red;
    }
    if (PURPLE_SWIPE_SPELLS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return MOBILE_COMMAND_COLORS.magenta;
    }
    if (WHITE_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return MOBILE_COMMAND_COLORS.white;
    }
    if (GREEN_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return MOBILE_COMMAND_COLORS.green;
    }
    const verb = spell.split(/\s+/)[0];
    return SWIPE_COMMAND_TEXT_COLORS[verb];
};

/** Shared command label color used by menus, suggestions, and sent command echoes. */
export const getCommandTextColor = (command: string, traitId?: string): string => {
    const commandMatch = command.trim().match(/^(?:cast|c|commune|skill)\s+/i);
    const swipeColor = getSwipeCommandTextColor(command);
    if (!commandMatch && traitId === 'trait-door-actions') return MOBILE_COMMAND_COLORS.orange;
    return swipeColor || (traitId ? getInlineTraitTextColor(traitId) : undefined) || DEFAULT_COMMAND_TEXT_COLOR;
};

/** The Utility deck button keeps every command label white, independent of command type. */
export const getButtonSwipeCommandTextColor = (
    button: Pick<CustomButton, 'id' | 'setId'>,
    command: string
): string | undefined => button.id === 'deck-category-utility'
    ? '#ffffff'
    : getSwipeCommandTextColor(command);

export const isRedCodedSwipeCommand = (command: string): boolean => {
    const color = getSwipeCommandTextColor(command)?.toLowerCase() || '';
    return color.includes('red') || /#(?:f87171|ef4444|ff0000)\b/.test(color);
};

/** Global locked targets only flow to red offensive actions; Assist is red for display but social. */
export const canUseLockedTargetForCommand = (command: string): boolean =>
    !/^assist(?:\s|$)/i.test(command.trim()) && isRedCodedSwipeCommand(command);
