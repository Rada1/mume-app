/**
 * @file magicKeyUtils.test.ts
 * @description Tests for MUME magic key parsing and command resolution.
 */

import { describe, expect, it } from 'vitest';
import {
    buildKeyedSpellCommand,
    findMagicKeyTarget,
    getMagicKeyId,
    parseKeyedSpellCommand
} from '../magicKeyUtils';
import { TeleportTarget } from '../../types';

const makeTarget = (overrides: Partial<TeleportTarget> = {}): TeleportTarget => ({
    id: 'skiszeoxvi field',
    name: 'In a field',
    label: 'house',
    customName: 'house',
    expiresAt: Date.now() + 60_000,
    ...overrides
});

describe('magicKeyUtils', () => {
    it('uses only the key token when building a keyed spell command', () => {
        const target = makeTarget();

        expect(getMagicKeyId(target)).toBe('skiszeoxvi');
        expect(buildKeyedSpellCommand("cast 'teleport'", target)).toBe("cast 'teleport' skiszeoxvi");
    });

    it('resolves typed custom names for cast spell targets', () => {
        const command = parseKeyedSpellCommand("cast 'teleport' house");
        const target = findMagicKeyTarget([makeTarget()], command?.target || '');

        expect(command?.prefix).toBe("cast 'teleport'");
        expect(target?.id).toBe('skiszeoxvi field');
        expect(target ? buildKeyedSpellCommand(command!.prefix, target) : null).toBe("cast 'teleport' skiszeoxvi");
    });

    it('resolves client teleport shorthands before server aliases see them', () => {
        const command = parseKeyedSpellCommand('tp thisplace');
        const target = findMagicKeyTarget([makeTarget({ customName: 'thisplace', label: 'thisplace' })], command?.target || '');

        expect(command?.prefix).toBe("cast 'teleport'");
        expect(target ? buildKeyedSpellCommand(command!.prefix, target) : null).toBe("cast 'teleport' skiszeoxvi");
    });
});
