/** @file mountEligibility.ts — Character race restrictions for riding room mounts. */
import type { CharacterInfo } from '../types';

// --- Mount and Rider Eligibility Section ---
const normalize = (value: string | null | undefined): string => (value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]+/g, ' ').trim();
const LIGHT_RACES = new Set(['man', 'men', 'human', 'elf', 'elves', 'half elf', 'halfelf', 'dwarf', 'dwarves', 'hobbit', 'hobbits', 'beorning', 'bear', 'dunadan']);
const MOUNT_ACTIONS = new Set(['btn-mount-ride', 'btn-mount-lead', 'btn-mount-abandon', 'btn-mount-dismount']);

export const isMountEligibleForCharacter = (name: string | null, character?: CharacterInfo): boolean => {
    const mount = normalize(name);
    const race = normalize(character?.race);
    const subrace = normalize(character?.subrace);
    const isOrc = /\borcs?\b/.test(race);
    const isMorruhk = /^morruhk(?: hai)?(?: orcs?)?$/.test(subrace);
    const isTarkhnarb = /^tarkhnarb(?: orcs?)?$/.test(subrace);
    const isBlackNumenorean = ['numenorean', 'black numenorean'].includes(race)
        || subrace === 'black numenorean';
    const isLight = LIGHT_RACES.has(race) && !isBlackNumenorean;
    if (/\btrolls?\b/.test(race)) return false;
    if (isOrc) {
        if (/\bslavering warg\b/.test(mount)) return isMorruhk;
        return (isMorruhk || isTarkhnarb) && /\b(?:hungry warg|brown wolf)\b/.test(mount);
    }
    if (/\b(?:warg|wolf)\b/.test(mount)) return false;
    if (/\bblack steed\b/.test(mount)) return isBlackNumenorean;
    if (/\bhorse of the rohirrim\b|\bdales pony\b/.test(mount)) return isLight;
    if (/\bdonkey\b/.test(mount)) return isLight || isBlackNumenorean;
    // Preserve ordinary mount handling before the character snapshot arrives.
    return !race || isLight || isBlackNumenorean;
};

export const isMountActionEligible = (buttonId: string, name: string | null, character?: CharacterInfo): boolean => (
    !MOUNT_ACTIONS.has(buttonId) || isMountEligibleForCharacter(name, character)
);
