/**
 * @file regenUtils.ts
 * @description Calculates visible HP, mana, and move regeneration modifiers.
 */

// --- Logic Section ---
import { EffectTimer } from '../types';
import { getTimerPhase } from '../stores/useEffectTimerStore';

export type RegenStat = 'hp' | 'mana' | 'move';
export type RegenTotals = Record<RegenStat, number>;

interface RegenInput {
    equipped: string[];
    race?: string;
    position?: string;
    age?: string | number;
    attributes?: Partial<Record<'int' | 'wis' | 'dex' | 'con' | 'wil', number>>;
    timers: EffectTimer[];
    now?: number;
}

const emptyTotals = (): RegenTotals => ({ hp: 0, mana: 0, move: 0 });

const EQUIPMENT_REGEN: Array<{ names: string[]; regen: Partial<RegenTotals> }> = [
    { names: ['fine grey cloak'], regen: { hp: -1 } },
    { names: ['roughly stitched cloak'], regen: { move: 3 } },
    { names: ['finely woven cloak', 'tainted grey cloak', 'forest green cloak', 'ragged blackened cloak', 'russet cloak', 'huge black bear fur', 'imposing golden mantle', 'scorched grisly fur'], regen: { move: 5 } },
    { names: ['woollen traveller\'s cloak'], regen: { move: 2 } },
    { names: ['majestic golden fur', 'gleaming belt', 'golden belt'], regen: { move: 3 } },
    { names: ['belt of fell hide'], regen: { hp: 3, move: 3 } },
    { names: ['black runed sceptre'], regen: { mana: 5 } },
];

const RACE_REGEN: Record<string, Partial<RegenTotals>> = {
    elf: { hp: -1.1, mana: 2, move: -2.6 },
    'half-elf': { hp: -0.6, mana: 1, move: -2.2 },
    dwarf: { hp: 1, mana: -1, move: -0.3 },
    hobbit: { hp: 0.5, mana: -3, move: -2.2 },
    orc: { hp: 1.3, move: -3.2 },
    numenorean: { hp: -0.1, mana: 1, move: 1 },
    dunadan: { hp: -0.1, mana: 1, move: 1 },
};

const POSITION_REGEN: Record<string, number> = {
    sitting: 1,
    resting: 2,
    sleeping: 4,
};

const AGE_REGEN = [
    { hp: 3, mana: 0, move: 3 }, { hp: 2, mana: 1, move: 3 },
    { hp: 1, mana: 3, move: 2 }, { hp: 0, mana: 6, move: 1 },
    { hp: -1, mana: 8, move: -3 }, { hp: -2, mana: 10, move: -6 },
    { hp: -5, mana: 6, move: -9 },
];

const ageMilestones = (race: string) => {
    if (/noldo/.test(race)) return [63, 84, 112, 140, 175, 227, 315];
    if (/sinda/.test(race)) return [54, 72, 96, 120, 150, 195, 270];
    if (/elf/.test(race)) return [45, 60, 80, 100, 125, 162, 225];
    if (/(dwarf|half-elf|orc|troll)/.test(race)) return [36, 48, 64, 80, 100, 130, 180];
    if (/(dunadan|numenorean|hobbit)/.test(race)) return [27, 36, 48, 60, 75, 97, 135];
    return [18, 24, 32, 40, 50, 65, 90];
};

const add = (totals: RegenTotals, modifier: Partial<RegenTotals>) => {
    for (const stat of ['hp', 'mana', 'move'] as const) totals[stat] += modifier[stat] ?? 0;
};

const parsePhaseEffects = (effects: string[] | undefined) => {
    const regen = emptyTotals();
    for (const effect of effects || []) {
        const match = effect.match(/^(HP|Mana|Move) regen\s*([+-]\d+)/i);
        if (!match) continue;
        const stat = match[1].toLowerCase() === 'hp' ? 'hp' : match[1].toLowerCase() === 'mana' ? 'mana' : 'move';
        regen[stat] += Number(match[2]);
    }
    return regen;
};

const ageModifier = (age: string | number | undefined, race: string) => {
    const years = Number(String(age || '').match(/\d+(?:\.\d+)?/)?.[0]);
    if (!Number.isFinite(years)) return emptyTotals();
    const milestones = ageMilestones(race);
    const upper = milestones.findIndex(value => years <= value);
    if (upper <= 0) return AGE_REGEN[0];
    if (upper === -1) return AGE_REGEN[AGE_REGEN.length - 1];
    const ratio = (years - milestones[upper - 1]) / (milestones[upper] - milestones[upper - 1]);
    const from = AGE_REGEN[upper - 1];
    const to = AGE_REGEN[upper];
    return {
        hp: from.hp + (to.hp - from.hp) * ratio,
        mana: from.mana + (to.mana - from.mana) * ratio,
        move: from.move + (to.move - from.move) * ratio,
    };
};

/** Adds every known active modifier. Unknown server data is deliberately omitted. */
export const calculateRegen = ({ equipped, race = '', position = '', age, attributes = {}, timers, now }: RegenInput): RegenTotals => {
    const totals = emptyTotals();
    const equipmentText = equipped.join(' ').toLowerCase();
    for (const entry of EQUIPMENT_REGEN) {
        if (entry.names.some(name => equipmentText.includes(name))) add(totals, entry.regen);
    }
    const normalizedRace = race.toLowerCase();
    const raceKey = Object.keys(RACE_REGEN).find(key => normalizedRace.includes(key));
    if (raceKey) add(totals, RACE_REGEN[raceKey]);
    const positionBonus = POSITION_REGEN[position.toLowerCase()] || 0;
    add(totals, { hp: positionBonus, mana: positionBonus, move: positionBonus });
    add(totals, ageModifier(age, normalizedRace));
    add(totals, {
        hp: (attributes.con || 0) * 0.1,
        mana: (attributes.int || 0) * 0.4 + (attributes.wis || 0) * 0.4 + (attributes.wil || 0) * 0.5,
        move: (attributes.dex || 0) * 0.2 + (attributes.con || 0) * 0.9,
    });
    for (const timer of timers) add(totals, parsePhaseEffects(getTimerPhase(timer, now)?.effects));
    return totals;
};

export const formatRegen = (value: number) => `${value >= 0 ? '+' : ''}${Number(value.toFixed(1))}`;
