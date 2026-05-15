/**
 * @file effectTimerCatalog.ts
 * @description Known timer durations and aliases for MUME spells and herblores.
 */

import { EffectTimerCatalogEntry } from '../types';

const min = (value: number) => value * 60_000;
const mumeHours = (value: number) => min(value);

export const EFFECT_TIMER_CATALOG: EffectTimerCatalogEntry[] = [
    {
        id: 'spell-armour',
        name: 'Armour',
        kind: 'spell',
        aliases: ['armour', 'armor'],
        durationMs: min(30),
        endPatterns: [/less protected/i, /armou?r spell .*wears off/i]
    },
    {
        id: 'spell-bless',
        name: 'Bless',
        kind: 'spell',
        aliases: ['bless'],
        durationMs: min(30),
        endPatterns: [/blessing .*wears off/i, /feel less blessed/i]
    },
    {
        id: 'spell-shield',
        name: 'Shield',
        kind: 'spell',
        aliases: ['shield'],
        durationMs: min(30),
        endPatterns: [/shield .*wears off/i]
    },
    {
        id: 'spell-sense-life',
        name: 'Sense Life',
        kind: 'spell',
        aliases: ['sense life'],
        durationMs: min(30),
        endPatterns: [/sense life .*wears off/i]
    },
    {
        id: 'spell-detect-invisibility',
        name: 'Detect Invisibility',
        kind: 'spell',
        aliases: ['detect invisibility', 'detect invis'],
        durationMs: min(30),
        endPatterns: [/detect invisibility .*wears off/i]
    },
    {
        id: 'spell-strength',
        name: 'Strength',
        kind: 'spell',
        aliases: ['strength'],
        durationMs: min(30),
        endPatterns: [/feel weaker/i, /strength .*wears off/i]
    },
    {
        id: 'spell-sanctuary',
        name: 'Sanctuary',
        kind: 'sanctuary',
        aliases: ['sanctuary', 'sanc'],
        durationMs: min(8),
        endPatterns: [/white aura .*fades/i, /sanctuary .*wears off/i]
    },
    {
        id: 'spell-blindness',
        name: 'Blindness',
        kind: 'blind',
        aliases: ['blindness', 'blind'],
        durationMs: min(8),
        endPatterns: [/is no longer blind/i, /blindness .*wears off/i]
    },
    {
        id: 'herb-travelling',
        name: 'Travelling',
        kind: 'herblore',
        aliases: ['travelling', 'traveling', 'mug of brew'],
        phases: [
            { label: 'strong', durationMs: mumeHours(120), effects: ['Move regen +10', 'Move +10'] },
            { label: 'fading', durationMs: mumeHours(24), effects: ['Move regen +7', 'Move +7'] },
            { label: 'weak', durationMs: mumeHours(24), effects: ['Move regen +3', 'Move +3'] }
        ]
    },
    {
        id: 'herb-walking',
        name: 'Walking',
        kind: 'herblore',
        aliases: ['walking', 'bowl of brew'],
        phases: [
            { label: 'strong', durationMs: mumeHours(24), effects: ['Move regen +10', 'Willpower -3'] },
            { label: 'fading', durationMs: mumeHours(120), effects: ['Move regen +5', 'Willpower -1'] },
            { label: 'weak', durationMs: mumeHours(24), effects: ['Move regen +3', 'Willpower -1'] }
        ]
    },
    {
        id: 'herb-strength',
        name: 'Strength Herblore',
        kind: 'herblore',
        aliases: ['strength herblore', 'maroon bottle'],
        durationMs: mumeHours(120)
    },
    {
        id: 'herb-soothing',
        name: 'Soothing Draught',
        kind: 'herblore',
        aliases: ['soothing draught', 'herbal draught'],
        phases: [
            { label: 'strong', durationMs: mumeHours(4), effects: ['HP regen +15', 'Constitution +2'] },
            { label: 'fading', durationMs: mumeHours(5), effects: ['HP regen +5', 'Dexterity -2'] }
        ]
    },
    {
        id: 'herb-skilful-oil',
        name: 'Skilful Oil',
        kind: 'herblore',
        aliases: ['skilful oil', 'skillful oil', 'scented oil'],
        phases: [
            { label: 'strong', durationMs: mumeHours(8), effects: ['OB +5', 'DB +5'] },
            { label: 'stiff', durationMs: mumeHours(4), effects: ['OB -5', 'DB -10'] }
        ]
    },
    {
        id: 'herb-heightened-senses',
        name: 'Heightened Senses',
        kind: 'herblore',
        aliases: ['heightened senses'],
        phases: [
            { label: 'sharp', durationMs: mumeHours(2.5), effects: ['Awareness +30%', 'Track +50%'] },
            { label: 'faded', durationMs: mumeHours(2), effects: ['Slower track'] }
        ]
    },
    {
        id: 'herb-dark-draught',
        name: 'Dark Draught',
        kind: 'herblore',
        aliases: ['dark draught', 'scorched leather flask'],
        phases: [
            { label: 'dark aura', durationMs: mumeHours(3.5), effects: ['Sun malus removed'] },
            { label: 'faded', durationMs: mumeHours(60), effects: ['Cannot refresh normally'] }
        ]
    }
];

export const findEffectTimerEntry = (text: string) => {
    const normalized = text.toLowerCase();
    return EFFECT_TIMER_CATALOG.find(entry =>
        entry.aliases.some(alias => normalized.includes(alias.toLowerCase()))
    );
};
