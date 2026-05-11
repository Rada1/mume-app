/**
 * @file raceBackgrounds.test.ts
 * @description Verifies GMCP race captions resolve to avatar background assets.
 */

import { describe, expect, it } from 'vitest';
import { resolveRaceBackground, resolveRaceBackgroundScale } from '../raceBackgrounds';

// --- Resolver Tests ---

describe('resolveRaceBackground', () => {
    it('resolves simple race captions', () => {
        expect(resolveRaceBackground('Troll')).toBe('/assets/Pictures/Avatars/troll.png');
        expect(resolveRaceBackground('Elf')).toBe('/assets/Pictures/Avatars/elf.png');
        expect(resolveRaceBackground('Man')).toBe('/assets/Pictures/Avatars/man.png');
    });

    it('resolves multi-word race aliases without using subrace data', () => {
        expect(resolveRaceBackground('Half-Elf')).toBe('/assets/Pictures/Avatars/half-elf.png');
        expect(resolveRaceBackground('half elf')).toBe('/assets/Pictures/Avatars/half-elf.png');
    });

    it('resolves bear and numenorean race assets from current avatar files', () => {
        expect(resolveRaceBackground('Bear')).toBe('/assets/Pictures/Avatars/beorning.png');
        expect(resolveRaceBackground('Numenorean')).toBe('/assets/Pictures/Avatars/man.png');
    });

    it('resolves race-specific avatar scales', () => {
        expect(resolveRaceBackgroundScale('Man')).toBe(0.9);
        expect(resolveRaceBackgroundScale('Orc')).toBe(0.9);
        expect(resolveRaceBackgroundScale('Troll')).toBe(1.4);
        expect(resolveRaceBackgroundScale('Hobbit')).toBe(0.7);
        expect(resolveRaceBackgroundScale('Dwarf')).toBe(0.8);
        expect(resolveRaceBackgroundScale('Bear')).toBe(1);
        expect(resolveRaceBackgroundScale('Numenorean')).toBe(0.9);
        expect(resolveRaceBackgroundScale('Elf')).toBe(0.9);
    });

    it('returns null when no race asset matches', () => {
        expect(resolveRaceBackground(null)).toBeNull();
        expect(resolveRaceBackground('Maiar')).toBeNull();
        expect(resolveRaceBackgroundScale('Maiar')).toBe(1);
    });
});
