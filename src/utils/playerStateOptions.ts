/** @file playerStateOptions.ts — Shared option lists for the player's state controls. */

// --- State Option Types ---
export interface StateOption {
    label: string;
    value: string;
    command?: string;
}

// --- State Option Catalog ---
export const POSITION_OPTIONS: StateOption[] = [
    { label: 'Standing', value: 'standing', command: 'stand' },
    { label: 'Sitting', value: 'sitting', command: 'sit' },
    { label: 'Resting', value: 'resting', command: 'rest' },
    { label: 'Sleeping', value: 'sleeping', command: 'sleep' }
];

export const ALERTNESS_OPTIONS: StateOption[] = [
    { label: 'Normal', value: 'normal', command: 'cha alert normal' },
    { label: 'Careful', value: 'careful', command: 'cha alert careful' },
    { label: 'Attentive', value: 'attentive', command: 'cha alert attentive' },
    { label: 'Vigilant', value: 'vigilant', command: 'cha alert vigilant' },
    { label: 'Paranoid', value: 'paranoid', command: 'cha alert paranoid' }
];

export const MOOD_OPTIONS: StateOption[] = [
    { label: 'Wimpy', value: 'wimpy', command: 'cha mood wimpy' },
    { label: 'Prudent', value: 'prudent', command: 'cha mood prudent' },
    { label: 'Normal', value: 'normal', command: 'cha mood normal' },
    { label: 'Brave', value: 'brave', command: 'cha mood brave' },
    { label: 'Aggressive', value: 'aggressive', command: 'cha mood aggressive' },
    { label: 'Berserk', value: 'berserk', command: 'cha mood berserk' }
];

export const SPELL_SPEED_OPTIONS: StateOption[] = [
    { label: 'Quick', value: 'quick', command: 'change spell quick' },
    { label: 'Fast', value: 'fast', command: 'change spell fast' },
    { label: 'Normal', value: 'normal', command: 'change spell normal' },
    { label: 'Careful', value: 'careful', command: 'change spell careful' },
    { label: 'Thorough', value: 'thorough', command: 'change spell thorough' }
];

// --- Current State Selection ---
export const getSelectedStateCommand = (group: string | null, value: string | undefined): string | undefined => {
    const options = {Position: POSITION_OPTIONS, Mood: MOOD_OPTIONS, 'Cast Speed': SPELL_SPEED_OPTIONS, Alertness: ALERTNESS_OPTIONS};
    const normalized = (value || '').trim().toLowerCase();
    const selected = group === 'Position' && ['mounted', 'riding'].includes(normalized) ? 'standing' : normalized;
    return options[group as keyof typeof options]?.find(option => option.value === selected)?.command;
};
