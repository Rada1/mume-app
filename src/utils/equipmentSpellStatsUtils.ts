export interface EquipmentSpellStats {
    spellAttack: number;
    spellSave: number;
}

const EQUIPMENT_SPELL_STATS: Array<{ names: string[]; spellAttack?: number; spellSave?: number }> = [
    { names: ['coarse dusky robe'], spellAttack: 20 },
    { names: ['ashen blade'], spellAttack: 5, spellSave: -10 },
    { names: ['pure white robe', 'pitch-black robe', 'enruned robe'], spellSave: -10 },
    { names: ['black hooded cloak'], spellSave: 10 },
    { names: ['black and silver surcoat', 'black cape', 'sacred cloak', 'golden belt'], spellSave: -10 },
    { names: ['black runed sceptre', 'black runed dagger'], spellSave: -20 },
    { names: ['istari wand'], spellSave: -30 },
    { names: ['engraved silvery knife'], spellSave: -10 },
    { names: ['ancient dwarven shield', 'defiled dwarven shield', 'smelly piece of worm hide', 'bejewelled shield'], spellSave: -10 },
];

/** Totals known spell modifiers from each currently equipped item line. */
export const calculateEquipmentSpellStats = (equipped: string[]): EquipmentSpellStats => {
    const totals: EquipmentSpellStats = { spellAttack: 0, spellSave: 0 };
    for (const item of equipped) {
        const normalizedItem = item.toLowerCase();
        for (const entry of EQUIPMENT_SPELL_STATS) {
            if (!entry.names.some(name => normalizedItem.includes(name))) continue;
            totals.spellAttack += entry.spellAttack ?? 0;
            totals.spellSave += entry.spellSave ?? 0;
        }
    }
    return totals;
};

export const formatEquipmentSpellStat = (value: number): string => `${value > 0 ? '+' : ''}${value}`;
