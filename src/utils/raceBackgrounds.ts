/**
 * @file raceBackgrounds.ts
 * @description Maps GMCP character race captions to bottom background avatar assets.
 * Images should be placed in public/assets/Pictures/Avatars/.
 */

// --- Race Key -> Asset Path Map ---

const BASE_PATH = '/assets/Pictures/Avatars/';

export const RACE_BACKGROUND_MAP: Record<string, string> = {
    'bear': `${BASE_PATH}beorning.png`,
    'beorning': `${BASE_PATH}beorning.png`,
    'dwarf': `${BASE_PATH}dwarf.png`,
    'elf': `${BASE_PATH}elf.png`,
    'half elf': `${BASE_PATH}half-elf.png`,
    'half-elf': `${BASE_PATH}half-elf.png`,
    'half_elf': `${BASE_PATH}half-elf.png`,
    'hobbit': `${BASE_PATH}hobbit.png`,
    'man': `${BASE_PATH}man.png`,
    'numenorean': `${BASE_PATH}man.png`,
    'númenórean': `${BASE_PATH}man.png`,
    'orc': `${BASE_PATH}orc.png`,
    'troll': `${BASE_PATH}troll.png`,
};

export const RACE_BACKGROUND_SCALE_MAP: Record<string, number> = {
    'bear': 1,
    'beorning': 1,
    'dwarf': 0.8,
    'elf': 0.9,
    'half elf': 1,
    'half-elf': 1,
    'half_elf': 1,
    'hobbit': 0.7,
    'man': 0.9,
    'numenorean': 0.9,
    'númenórean': 0.9,
    'orc': 0.9,
    'troll': 1.4,
};

// --- Resolver ---

export function resolveRaceBackground(race: string | null | undefined): string | null {
    if (!race) return null;
    const key = race.toLowerCase().trim();
    return RACE_BACKGROUND_MAP[key] ?? null;
}

export function resolveRaceBackgroundScale(race: string | null | undefined): number {
    if (!race) return 1;
    const key = race.toLowerCase().trim();
    return RACE_BACKGROUND_SCALE_MAP[key] ?? 1;
}
