import { test, expect } from '@playwright/test';
import { getCategoryForName, getGlowColorForCategory } from '../src/utils/categorizationUtils';

test.describe('Categorization Utils Unit Tests', () => {
    test('getCategoryForName - basic matching', () => {
        expect(getCategoryForName('a black orc')).toBe('inline-npc');
        expect(getCategoryForName('a long sword')).toBe('inline-weapon');
        expect(getCategoryForName('a loaf of bread')).toBe('inline-food');
    });

    test('getCategoryForName - case insensitivity', () => {
        expect(getCategoryForName('ORC')).toBe('inline-npc');
        expect(getCategoryForName('Sword')).toBe('inline-weapon');
    });

    test('getCategoryForName - word boundaries', () => {
        // 'man' is a keyword for 'npc'.
        expect(getCategoryForName('orman')).toBe(null); // 'man' is a keyword, 'orman' contains it but shouldn't match
        expect(getCategoryForName('a man')).toBe('inline-npc');
        expect(getCategoryForName('man-eater')).toBe('inline-npc'); // hyphen counts as boundary in the regex [^a-z]
    });

    test('getCategoryForName - multi-word keywords', () => {
        // 'street-lamp' is a keyword in 'misc'
        expect(getCategoryForName('a street-lamp')).toBe('inline-misc');
    });

    test('getCategoryForName - punctuation and edge cases', () => {
        expect(getCategoryForName('orc.')).toBe('inline-npc');
        expect(getCategoryForName('sword,')).toBe('inline-weapon');
        expect(getCategoryForName('')).toBe(null);
        // @ts-ignore
        expect(getCategoryForName(null)).toBe(null);
    });

    test('getCategoryForName - custom categories precedence', () => {
        const customCategories = [
            { id: 'custom-orc', keywords: ['orc'], color: 'red' }
        ];
        // Custom categories should be checked first
        expect(getCategoryForName('an orc', customCategories)).toBe('inline-custom-orc');
    });

    test('getCategoryForName - custom categories fallback', () => {
        const customCategories = [
            { id: 'custom-foo', keywords: ['foo'], color: 'blue' }
        ];
        // 'orc' is not in custom, should fall back to default
        expect(getCategoryForName('an orc', customCategories)).toBe('inline-npc');
    });

    test('getGlowColorForCategory - basic colors', () => {
        const npcColor = getGlowColorForCategory('inline-npc');
        expect(typeof npcColor).toBe('string');
        expect(npcColor).toContain('rgba');

        const objColor = getGlowColorForCategory('inline-default');
        expect(typeof objColor).toBe('string');
        expect(objColor).toContain('rgba');
    });

    test('getGlowColorForCategory - inheritance', () => {
        const npcColor = getGlowColorForCategory('inline-npc');
        const innkeeperColor = getGlowColorForCategory('inline-innkeeper');
        expect(innkeeperColor).toBe(npcColor);

        const objColor = getGlowColorForCategory('inline-default');
        const weaponColor = getGlowColorForCategory('inline-weapon');
        expect(weaponColor).toBe(objColor);
    });

    test('getGlowColorForCategory - player color', () => {
        const playerColor = getGlowColorForCategory('inline-player');
        expect(playerColor).toBe('rgba(125, 211, 252, 0.9)');
    });

    test('getGlowColorForCategory - custom overrides', () => {
        const customCategories = [
            { id: 'npc', keywords: ['orc'], color: 'custom-npc-color' }
        ];
        expect(getGlowColorForCategory('inline-npc', customCategories)).toBe('custom-npc-color');
        // innkeeper should also inherit this custom npc color
        expect(getGlowColorForCategory('inline-innkeeper', customCategories)).toBe('custom-npc-color');
    });

    test('getGlowColorForCategory - fallback for unknown category', () => {
        const defaultColor = getGlowColorForCategory('inline-default');
        expect(getGlowColorForCategory('unknown-category')).toBe(defaultColor);
    });
});
