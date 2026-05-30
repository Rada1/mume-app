/**
 * @file subraceBanners.test.ts
 * @description Verifies GMCP race/subrace captions resolve to header banner assets.
 */

import { describe, expect, it } from 'vitest';
import { resolveSubraceBanner } from '../subraceBanners';

// --- Resolver Tests ---

describe('resolveSubraceBanner', () => {
    it('clumps canonical subraces into banner slots', () => {
        expect(resolveSubraceBanner('Dwarf', 'Broadbeams')?.key).toBe('dwarves');
        expect(resolveSubraceBanner('Dwarf', 'Firebeards')?.key).toBe('dwarves');
        expect(resolveSubraceBanner('Elf', 'Silvan Elves')?.key).toBe('elves');
        expect(resolveSubraceBanner('Hobbit', 'Stoors')?.key).toBe('hobbits');
        expect(resolveSubraceBanner('Orc', 'Morruhk-hai Orcs')?.key).toBe('tarkhnarb-morruhk-trolls');
        expect(resolveSubraceBanner('Troll', 'Mountain trolls')?.key).toBe('tarkhnarb-morruhk-trolls');
    });

    it('treats half-elf race as its own banner key when subrace is empty', () => {
        const banner = resolveSubraceBanner('Half-Elf', '');

        expect(banner?.key).toBe('half-elves');
        expect(banner?.src).toBe('/assets/Pictures/Subraces/halfelf.png');
        expect(banner?.fallbackSrc).toBe('/assets/Pictures/Avatars/half-elf.png');
    });

    it('resolves ainu once art is added', () => {
        const banner = resolveSubraceBanner('Ainu', '');
        expect(banner?.key).toBe('ainu');
        expect(banner?.src).toBe('/assets/Pictures/Subraces/ainu.png');
    });

    it('uses available race-level image fallbacks until subrace art exists', () => {
        expect(resolveSubraceBanner('Hobbit', 'Harfoot')?.fallbackSrc).toBe('/assets/Pictures/Subraces/hobbit.png');
        expect(resolveSubraceBanner('Man', 'Dunadans')?.fallbackSrc).toBe('/assets/Pictures/Avatars/man.png');
    });

    it('uses the matching banner image for each configured slot', () => {
        expect(resolveSubraceBanner('Dwarf', 'Longbeards')?.src).toBe('/assets/Pictures/Subraces/dwarf.png');
        expect(resolveSubraceBanner('Elf', 'Sindar')?.src).toBe('/assets/Pictures/Subraces/elf.png');
        expect(resolveSubraceBanner('Man', 'Dunadan')?.src).toBe('/assets/Pictures/Subraces/dunadain.png');
        expect(resolveSubraceBanner('Man', 'Rohirrim')?.src).toBe('/assets/Pictures/Subraces/rohirrim.png');
        expect(resolveSubraceBanner('Man', 'Rohir')?.src).toBe('/assets/Pictures/Subraces/rohirrim.png');
        expect(resolveSubraceBanner('Man', 'Black Numenorean')?.src).toBe('/assets/Pictures/Subraces/blacknumenorean.png');
        expect(resolveSubraceBanner('Orc', 'Zaugurz')?.src).toBe('/assets/Pictures/Subraces/zaugurz.png');
        expect(resolveSubraceBanner('Orc', 'Tarkhnarb')?.src).toBe('/assets/Pictures/Subraces/tarkmorruhk.png');
    });

    it('supports the custom banner groups for men and orcs', () => {
        expect(resolveSubraceBanner('Man', 'Dunadan')?.key).toBe('dunedain');
        expect(resolveSubraceBanner('Man', 'Rohirrim')?.key).toBe('rohirrim');
        expect(resolveSubraceBanner('Man', 'Rohir')?.key).toBe('rohirrim');
        expect(resolveSubraceBanner('Man', 'Beorning')?.key).toBe('beornings');
        expect(resolveSubraceBanner('Man', 'Eriadorian')?.key).toBe('eriadorians');
        expect(resolveSubraceBanner('Man', 'Black Numenorean')?.key).toBe('black-numenoreans');
        expect(resolveSubraceBanner('Orc', 'Zaugurz')?.key).toBe('zaugurz');
        expect(resolveSubraceBanner('Orc', 'Tarkhnarb')?.key).toBe('tarkhnarb-morruhk-trolls');
    });

    it('returns null when neither race nor subrace can resolve to a banner', () => {
        expect(resolveSubraceBanner('Maiar', '')).toBeNull();
        expect(resolveSubraceBanner('', '')).toBeNull();
    });
});
