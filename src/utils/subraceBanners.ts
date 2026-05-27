/**
 * @file subraceBanners.ts
 * @description Resolves GMCP race and subrace captions to header banner image assets.
 */

import { resolveRaceBackground } from './raceBackgrounds';

// --- Constants ---

const SUBRACE_BASE_PATH = '/assets/Pictures/Subraces/';
export interface SubraceBannerAsset {
    key: string;
    label: string;
    src: string;
    fallbackSrc: string | null;
}

const normalizeBannerToken = (value: string | null | undefined): string => (
    value ?? ''
)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const SUBRACE_KEY_ALIASES: Record<string, string> = {
    broadbeams: 'broadbeam',
    broadbeam: 'broadbeam',
    firebeards: 'firebeard',
    firebeard: 'firebeard',
    longbeards: 'longbeard',
    longbeard: 'longbeard',
    sindar: 'sindar',
    'sindar-elf': 'sindar',
    'sindar-elves': 'sindar',
    silvan: 'silvan',
    'silvan-elf': 'silvan',
    'silvan-elves': 'silvan',
    noldorin: 'noldorin',
    'noldorin-elf': 'noldorin',
    'noldorin-elves': 'noldorin',
    'half-elf': 'half-elf',
    'half-elves': 'half-elf',
    fallohid: 'fallohid',
    'fallohid-hobbit': 'fallohid',
    'fallohid-hobbits': 'fallohid',
    harfoot: 'harfoot',
    harfoots: 'harfoot',
    'harfoot-hobbit': 'harfoot',
    'harfoot-hobbits': 'harfoot',
    stoor: 'stoor',
    stoors: 'stoor',
    'stoor-hobbit': 'stoor',
    'stoor-hobbits': 'stoor',
    beorning: 'beorning',
    beornings: 'beorning',
    rohirrim: 'rohirrim',
    rohirrims: 'rohirrim',
    eriadorian: 'eriadorian',
    eriadorians: 'eriadorian',
    dunadan: 'dunadan',
    dunadans: 'dunadan',
    'black-numenorean': 'black-numenorean',
    'black-numenoreans': 'black-numenorean',
    tarkhnarb: 'tarkhnarb',
    'tarkhnarb-orc': 'tarkhnarb',
    'tarkhnarb-orcs': 'tarkhnarb',
    'morruhk-hai': 'morruhk-hai',
    'morruhk-hai-orc': 'morruhk-hai',
    'morruhk-hai-orcs': 'morruhk-hai',
    zaugurz: 'zaugurz',
    'zaugurz-orc': 'zaugurz',
    'zaugurz-orcs': 'zaugurz',
    cave: 'cave-troll',
    'cave-troll': 'cave-troll',
    'cave-trolls': 'cave-troll',
    hill: 'hill-troll',
    'hill-troll': 'hill-troll',
    'hill-trolls': 'hill-troll',
    mountain: 'mountain-troll',
    'mountain-troll': 'mountain-troll',
    'mountain-trolls': 'mountain-troll',
};

const RACE_KEY_ALIASES: Record<string, string> = {
    ainu: 'ainu',
    ainur: 'ainu',
    dwarf: 'dwarf',
    dwarves: 'dwarf',
    elf: 'elf',
    elves: 'elf',
    'half-elf': 'half-elf',
    hobbit: 'hobbit',
    hobbits: 'hobbit',
    man: 'man',
    men: 'man',
    beorning: 'beorning',
    bear: 'beorning',
    numenorean: 'man',
    orc: 'orc',
    orcs: 'orc',
    troll: 'troll',
    trolls: 'troll',
};

const RACE_DEFAULT_BANNER: Record<string, string> = {
    ainu: 'ainu',
    dwarf: 'dwarves',
    elf: 'elves',
    'half-elf': 'half-elves',
    hobbit: 'hobbits',
    troll: 'tarkhnarb-morruhk-trolls',
};

const SUBRACE_BANNER_MAP: Record<string, string> = {
    broadbeam: 'dwarves',
    firebeard: 'dwarves',
    longbeard: 'dwarves',
    sindar: 'elves',
    silvan: 'elves',
    noldorin: 'elves',
    'half-elf': 'half-elves',
    fallohid: 'hobbits',
    harfoot: 'hobbits',
    stoor: 'hobbits',
    beorning: 'beornings',
    rohirrim: 'rohirrim',
    eriadorian: 'eriadorians',
    dunadan: 'dunedain',
    'black-numenorean': 'black-numenoreans',
    tarkhnarb: 'tarkhnarb-morruhk-trolls',
    'morruhk-hai': 'tarkhnarb-morruhk-trolls',
    zaugurz: 'zaugurz',
    'cave-troll': 'tarkhnarb-morruhk-trolls',
    'hill-troll': 'tarkhnarb-morruhk-trolls',
    'mountain-troll': 'tarkhnarb-morruhk-trolls',
};

const BANNER_LABELS: Record<string, string> = {
    ainu: 'Ainu',
    elves: 'Elves',
    'half-elves': 'Half-elves',
    hobbits: 'Hobbits',
    dwarves: 'Dwarves',
    dunedain: 'Dunedain',
    rohirrim: 'Rohirrim',
    beornings: 'Beornings',
    eriadorians: 'Eriadorians',
    zaugurz: 'Zaugurz',
    'tarkhnarb-morruhk-trolls': 'Tarkhnarb, Morruhk-hai, and trolls',
    'black-numenoreans': 'Black Numenoreans',
};

const BANNER_IMAGE_MAP: Record<string, string> = {
    ainu: `${SUBRACE_BASE_PATH}ainu.png`,
    elves: `${SUBRACE_BASE_PATH}elf.png`,
    'half-elves': `${SUBRACE_BASE_PATH}halfelf.png`,
    hobbits: `${SUBRACE_BASE_PATH}hobbit.png`,
    dwarves: `${SUBRACE_BASE_PATH}dwarf.png`,
    dunedain: `${SUBRACE_BASE_PATH}dunadain.png`,
    rohirrim: `${SUBRACE_BASE_PATH}rohirrim.png`,
    beornings: `${SUBRACE_BASE_PATH}beorning.png`,
    eriadorians: `${SUBRACE_BASE_PATH}eriadorian.png`,
    zaugurz: `${SUBRACE_BASE_PATH}zaugurz.png`,
    'tarkhnarb-morruhk-trolls': `${SUBRACE_BASE_PATH}tarkmorruhk.png`,
    'black-numenoreans': `${SUBRACE_BASE_PATH}blacknumenorean.png`,
};

const RACE_FALLBACK_SUBRACE_IMAGE: Record<string, string> = {
    hobbit: `${SUBRACE_BASE_PATH}hobbit.png`,
};

// --- Logic Section ---

const resolveKey = (value: string | null | undefined, aliases: Record<string, string>): string | null => {
    const normalized = normalizeBannerToken(value);
    if (!normalized) return null;
    return aliases[normalized] ?? null;
};

export function resolveSubraceBanner(
    race: string | null | undefined,
    subrace: string | null | undefined
): SubraceBannerAsset | null {
    const raceKey = resolveKey(race, RACE_KEY_ALIASES);
    const subraceKey = resolveKey(subrace, SUBRACE_KEY_ALIASES);
    const bannerKey = (subraceKey ? SUBRACE_BANNER_MAP[subraceKey] : null) ?? (raceKey ? RACE_DEFAULT_BANNER[raceKey] : null);
    const fallbackSrc = raceKey
        ? RACE_FALLBACK_SUBRACE_IMAGE[raceKey] ?? resolveRaceBackground(raceKey)
        : null;
    const src = bannerKey ? BANNER_IMAGE_MAP[bannerKey] ?? fallbackSrc : null;
    if (!bannerKey || !src) return null;

    return {
        key: bannerKey,
        label: BANNER_LABELS[bannerKey] ?? bannerKey,
        src,
        fallbackSrc,
    };
}
