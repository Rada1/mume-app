/**
 * @file combatRechargeUtils.test.ts
 * @description Tests combat recharge action normalization and median timing.
 */

import { describe, expect, it } from 'vitest';
import {
    getCombatRechargeActionFromCommand,
    getCombatRechargeActionFromVerb,
    getMedianDuration,
    isOpponentFailedAttackLine,
    isPlayerAttemptAvoidedLine,
    isPlayerFailedAttackLine
} from '../combatRechargeUtils';

describe('combatRechargeUtils', () => {
    it('normalizes player commands into recharge actions', () => {
        expect(getCombatRechargeActionFromCommand('shoot troll')).toBe('shoot');
        expect(getCombatRechargeActionFromCommand('k orc')).toBe('hit');
        expect(getCombatRechargeActionFromCommand('pierce orc')).toBe('hit');
        expect(getCombatRechargeActionFromCommand('slash orc')).toBe('hit');
        expect(getCombatRechargeActionFromCommand('bash target')).toBe('bash');
        expect(getCombatRechargeActionFromCommand('look troll')).toBeNull();
    });

    it('normalizes observed combat verbs into recharge actions', () => {
        expect(getCombatRechargeActionFromVerb('shoot')).toBe('shoot');
        expect(getCombatRechargeActionFromVerb('miss')).toBe('hit');
        expect(getCombatRechargeActionFromVerb('slash')).toBe('hit');
        expect(getCombatRechargeActionFromVerb('kick')).toBe('kick');
    });

    it('returns median sample duration', () => {
        expect(getMedianDuration([5000, 3000, 4000])).toBe(4000);
        expect(getMedianDuration([5000, 3000])).toBe(4000);
        expect(getMedianDuration([])).toBeNull();
    });

    it('detects avoided player attempt lines', () => {
        expect(isPlayerAttemptAvoidedLine('A Morgundul orc-guard swiftly dodges your attempt to slash him.')).toBe(true);
        expect(isPlayerAttemptAvoidedLine('A Morgundul orc-guard swiftly dodges your attempt to pierce him.')).toBe(true);
        expect(isPlayerAttemptAvoidedLine('A Morgundul orc-guard tries to stab you, but your parry is successful.')).toBe(false);
    });

    it('detects player failed attack lines', () => {
        expect(isPlayerFailedAttackLine('You try to pierce a Morgundul orc-guard, but he parries successfully.')).toBe(true);
        expect(isPlayerFailedAttackLine('You try to slash a cavebear, but it parries successfully.')).toBe(true);
        expect(isPlayerFailedAttackLine('A cavebear fails to hit you.')).toBe(false);
    });

    it('detects opponent failed attack lines', () => {
        expect(isOpponentFailedAttackLine('A cavebear fails to hit you.')).toBe(true);
        expect(isOpponentFailedAttackLine('A Morgundul orc-guard fails to stab you.')).toBe(true);
        expect(isOpponentFailedAttackLine('You try to slash a cavebear, but it parries successfully.')).toBe(false);
    });
});
