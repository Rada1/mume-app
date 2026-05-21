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
        startPatterns: [/A blue transparent wall slowly appears/i, /encase .* in a blue transparent wall/i, /magic armou?r is revitalised/i],
        endPatterns: [/less protected/i, /armou?r spell .*wears off/i]
    },
    {
        id: 'spell-bless',
        name: 'Bless',
        kind: 'spell',
        aliases: ['bless'],
        durationMs: min(30),
        startPatterns: [/You feel righteous/i, /You bless/i, /renewed light shine upon you/i],
        endPatterns: [/blessing .*wears off/i, /feel less blessed/i]
    },
    {
        id: 'spell-shield',
        name: 'Shield',
        kind: 'spell',
        aliases: ['shield'],
        durationMs: min(30),
        startPatterns: [/You feel protected/i],
        endPatterns: [/shield .*wears off/i]
    },
    {
        id: 'spell-sense-life',
        name: 'Sense Life',
        kind: 'spell',
        aliases: ['sense life'],
        durationMs: min(30),
        startPatterns: [/You feel your awareness improve/i],
        endPatterns: [/sense life .*wears off/i]
    },
    {
        id: 'spell-detect-invisibility',
        name: 'Detect Invisibility',
        kind: 'spell',
        aliases: ['detect invisibility', 'detect invis'],
        durationMs: min(30),
        startPatterns: [/Your eyes tingle/i],
        endPatterns: [/detect invisibility .*wears off/i]
    },
    {
        id: 'spell-strength',
        name: 'Strength',
        kind: 'spell',
        aliases: ['strength'],
        durationMs: min(30),
        startPatterns: [/You feel stronger/i],
        endPatterns: [/feel weaker/i, /strength .*wears off/i]
    },
    {
        id: 'spell-sanctuary',
        name: 'Sanctuary',
        kind: 'sanctuary',
        aliases: ['sanctuary', 'sanc'],
        durationMs: min(8),
        startPatterns: [/white aura surrounds/i],
        endPatterns: [/white aura .*fades/i, /sanctuary .*wears off/i]
    },
    {
        id: 'spell-blindness',
        name: 'Blindness',
        kind: 'blind',
        aliases: ['blindness', 'blind'],
        durationMs: min(8),
        startPatterns: [/You are blinded/i, /You block out the light/i],
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
        id: 'herb-clear-thought',
        name: 'Clear Thought',
        kind: 'herblore',
        aliases: ['clear thought', 'clear-thought', 'pungent brew'],
        phases: [
            { label: 'strong', durationMs: mumeHours(2), effects: ['Mana regen +15', 'Mana +15'] },
            { label: 'fading', durationMs: mumeHours(4), effects: ['Mana regen +7', 'Mana +7'] },
            { label: 'exhausted', durationMs: mumeHours(6), effects: ['Mana regen -3', 'Mana -5'] }
        ]
    },
    {
        id: 'herb-antidote-found',
        name: 'Antidote Bottle (Found)',
        kind: 'herblore',
        aliases: ['brown bottle', 'found antidote'],
        durationMs: min(70)
    },
    {
        id: 'herb-antidote-mixed',
        name: 'Antidote Bottle (Mixed)',
        kind: 'herblore',
        aliases: ['antidote', 'mixed antidote'],
        durationMs: min(144)
    },
    {
        id: 'herb-healing',
        name: 'Healing',
        kind: 'herblore',
        aliases: ['healing', 'philtre'],
        phases: [
            { label: 'mending', durationMs: mumeHours(63), effects: ['HP regen +15', 'Constitution +2'] },
            { label: 'tired', durationMs: mumeHours(63), effects: ['HP regen +5', 'Move -2'] }
        ]
    },
    {
        id: 'herb-orc-balm',
        name: 'Orc Balm',
        kind: 'herblore',
        aliases: ['orc balm', 'orc-balm', 'putrid dark balm'],
        phases: [
            { label: 'strong', durationMs: mumeHours(3), effects: ['HP regen +16', 'Mana regen -6'] },
            { label: 'fading', durationMs: mumeHours(6), effects: ['HP regen +8', 'Mana regen -3'] },
            { label: 'weak', durationMs: mumeHours(3), effects: ['HP regen +4', 'Mana regen -1'] }
        ]
    },
    {
        id: 'herb-seeing',
        name: 'Seeing',
        kind: 'herblore',
        aliases: ['seeing', 'phosphorescent bottle'],
        phases: [
            { label: 'bright', durationMs: mumeHours(10), effects: ['Night vision', 'Perception +3', 'Constitution -1'] },
            { label: 'dim', durationMs: mumeHours(15), effects: ['Night vision', 'Perception +2', 'Constitution -1'] },
            { label: 'faint', durationMs: mumeHours(40), effects: ['Night vision', 'Perception +1'] }
        ]
    },
    {
        id: 'herb-shadows',
        name: 'Shadows',
        kind: 'herblore',
        aliases: ['shadows', 'sombre bottle', 'shadow world'],
        phases: [
            { label: 'shadow', durationMs: mumeHours(10), effects: ['Shadow world', 'Perception -3', 'Willpower -1'] },
            { label: 'fading', durationMs: mumeHours(60), effects: ['Dodge +2', 'Perception -2'] },
            { label: 'faint', durationMs: mumeHours(30), effects: ['Dodge +1', 'Perception -1'] }
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
            { label: 'sharp', durationMs: mumeHours(4.5), effects: ['Awareness +30%', 'Track +50%'] },
            { label: 'faded', durationMs: mumeHours(25), effects: ['Cannot refresh normally'] }
        ]
    },
    {
        id: 'herb-thistle-tea',
        name: 'Thistle Tea',
        kind: 'herblore',
        aliases: ['thistle tea', 'cup of thistle tea'],
        phases: [
            { label: 'active', durationMs: mumeHours(6), effects: ['Haste'] },
            { label: 'recover', durationMs: mumeHours(18), effects: ['Haste recovery'] }
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
    },
    {
        id: 'poison-arachnia',
        name: 'Arachnia Poison',
        kind: 'poison',
        aliases: ['arachnia', 'dirty reddish vial'],
        durationMs: min(60)
    },
    {
        id: 'poison-belladonna',
        name: 'Belladonna Poison',
        kind: 'poison',
        aliases: ['belladonna', 'dark violet vial'],
        durationMs: min(60)
    },
    {
        id: 'poison-drake-slumber',
        name: 'Drake-Slumber Poison',
        kind: 'poison',
        aliases: ['drake-slumber', 'drake slumber', 'glass flask'],
        durationMs: min(20)
    },
    {
        id: 'poison-hemlock',
        name: 'Hemlock Poison',
        kind: 'poison',
        aliases: ['hemlock poison', 'green stinking vial'],
        durationMs: min(60)
    },
    {
        id: 'poison-psylonia',
        name: 'Psylonia Poison',
        kind: 'poison',
        aliases: ['psylonia', 'mildew covered vial'],
        durationMs: min(60)
    },
    {
        id: 'poison-venom',
        name: 'Venom Poison',
        kind: 'poison',
        aliases: ['venom poison', 'foetid green vial'],
        durationMs: min(60)
    }
];

export const findEffectTimerEntry = (text: string) => {
    const normalized = text.toLowerCase();
    return EFFECT_TIMER_CATALOG.find(entry =>
        entry.aliases.some(alias => normalized.includes(alias.toLowerCase()))
    );
};
