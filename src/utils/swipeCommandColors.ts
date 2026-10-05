/**
 * @file swipeCommandColors.ts
 * @description Resolves the special text colors used by tactical swipe commands.
 */

// --- Logic Section ---
import type { CustomButton } from '../types';

const SWIPE_COMMAND_TEXT_COLORS: Record<string, string> = {
    camp: '#ffd700',
    climb: 'var(--ansi-bright-green, #44ff70)',
    swim: 'var(--ansi-bright-green, #44ff70)',
    ride: 'var(--ansi-bright-green, #44ff70)',
    narrate: 'var(--ansi-bright-yellow, #f5f749)',
    yell: 'var(--ansi-bright-magenta, #c084fc)',
    say: 'var(--ansi-bright-cyan, #38bdf8)',
    tell: 'var(--ansi-bright-green, #44ff70)',
    gtell: 'var(--ansi-bright-green, #44ff70)',
    gsay: 'var(--ansi-bright-cyan, #38bdf8)',
    protect: 'var(--ansi-bright-cyan, #38bdf8)',
    rescue: 'var(--ansi-bright-cyan, #38bdf8)',
    bandage: 'var(--ansi-bright-cyan, #38bdf8)',
    hide: 'var(--ansi-bright-magenta, #c084fc)',
    sneak: 'var(--ansi-bright-magenta, #c084fc)',
    envenom: 'var(--ansi-bright-magenta, #c084fc)',
    open: '#ffd700',
    lead: 'var(--ansi-bright-green, #44ff70)',
    abandon: 'var(--ansi-bright-green, #44ff70)',
    dismount: 'var(--ansi-bright-green, #44ff70)',
    close: '#ffd700',
    lock: '#ffd700',
    unlock: '#ffd700',
    saddle: '#ffd700',
    unsaddle: '#ffd700',
    recover: '#ffd700',
    eat: '#ffd700',
    drink: '#ffd700',
    throw: '#ffd700',
    recite: '#ffd700',
    wield: '#ffd700',
    use: '#ffd700',
    smoke: '#ffd700',
    sheath: '#ffd700',
    quaff: '#ffd700',
    draw: '#ffd700',
    load: '#ffd700',
    mix: '#ffd700',
    crush: '#ffd700',
    pour: '#ffd700',
    butcher: '#ffd700',
    cook: '#ffd700',
    bash: 'var(--ansi-bright-red, #f87171)',
    hit: 'var(--ansi-bright-red, #f87171)',
    assist: 'var(--ansi-bright-red, #f87171)',
    charge: 'var(--ansi-bright-red, #f87171)',
    kick: 'var(--ansi-bright-red, #f87171)',
    backstab: 'var(--ansi-bright-red, #f87171)',
    shoot: 'var(--ansi-bright-red, #f87171)',
    steal: 'var(--ansi-bright-red, #f87171)',
    transfer: 'var(--ansi-bright-yellow, #f5f749)',
    teleport: 'var(--ansi-bright-yellow, #f5f749)',
    give: '#c0c0c0',
    drop: '#c0c0c0',
    put: '#c0c0c0',
    pick: '#f97316',
    get: '#ffd700',
    wear: '#ffd700',
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
const WHITE_SWIPE_COMMANDS = ['locate', 'locate life', 'watch room', 'scry', 'scout', 'look', 'examine', 'track', 'search', 'consider', 'watch', 'reveal', 'where', 'flush', 'call familiar', 'control weather', 'find the path', 'divination'];
const GOLD_SWIPE_COMMANDS = ['create food', 'create water', 'create light'];
const ORANGE_SWIPE_COMMANDS = ['block door', 'break door'];
const GREEN_SWIPE_COMMANDS = ['teleport', 'word of recall', 'portal', 'transfer', 'summon', 'flee', 'escape'];

export const getSwipeCommandTextColor = (command: string): string | undefined => {
    const normalizedCommand = command.trim().toLowerCase();
    const spell = normalizedCommand.match(/^(?:cast|c|commune|skill)\s+['"]([^'"]+)['"]/i)?.[1]
        || normalizedCommand.replace(/^(?:cast|c|commune|skill)\s+/i, '').replace(/^['"]/, '').replace(/['"](?=\s|$)/g, '');
    if (ORANGE_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return '#f97316';
    }
    if (GOLD_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return '#ffd700';
    }
    if (CYAN_SWIPE_SPELLS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return 'var(--ansi-bright-cyan, #38bdf8)';
    }
    if (RED_SWIPE_SPELLS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return 'var(--ansi-bright-red, #f87171)';
    }
    if (PURPLE_SWIPE_SPELLS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return 'var(--ansi-bright-magenta, #c084fc)';
    }
    if (WHITE_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return '#f8fafc';
    }
    if (GREEN_SWIPE_COMMANDS.some(name => spell === name || spell.startsWith(`${name} `))) {
        return 'var(--ansi-bright-green, #44ff70)';
    }
    const verb = spell.split(/\s+/)[0];
    return SWIPE_COMMAND_TEXT_COLORS[verb];
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
