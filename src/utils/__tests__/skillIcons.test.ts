/**
 * @file skillIcons.test.ts
 * @description Verifies the skill/spell name→icon resolver and its fallbacks.
 */

import { describe, expect, it } from 'vitest';
import { Bandage, Mountain, Footprints, Eye, Shield, Sparkles, Sword, Star } from 'lucide-react';
import { resolveSkillIcon } from '../skillIcons';

describe('resolveSkillIcon', () => {
    it('maps known ranger skills (as shown in the deck)', () => {
        expect(resolveSkillIcon('Bandage')).toBe(Bandage);
        expect(resolveSkillIcon('Climb')).toBe(Mountain);
        expect(resolveSkillIcon('Ride')).toBe(Footprints);
        expect(resolveSkillIcon('Awareness')).toBe(Eye);
    });

    it('is case-insensitive', () => {
        expect(resolveSkillIcon('CLIMB')).toBe(Mountain);
    });

    it('falls back by category for unmapped skills', () => {
        expect(resolveSkillIcon('unknown passive', { isPassive: true })).toBe(Shield);
        expect(resolveSkillIcon('unknown spell', { isSpell: true })).toBe(Sparkles);
        expect(resolveSkillIcon('unknown attack', { isTargeted: true })).toBe(Sword);
        expect(resolveSkillIcon('mystery skill')).toBe(Star);
    });

    it('prefers the per-skill override over the category fallback', () => {
        // heal is targeted but has an explicit icon, so it must not fall to Sword.
        expect(resolveSkillIcon('heal', { isTargeted: true, isSpell: true })).not.toBe(Sword);
    });
});
