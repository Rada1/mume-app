// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { canCommandAcceptTarget, applyTargetToCommand } from './commandTargetUtils';

describe('commandTargetUtils', () => {
    describe('canCommandAcceptTarget', () => {
        it('identifies targeted spells', () => {
            expect(canCommandAcceptTarget("cast 'fireball'")).toBe(true);
            expect(canCommandAcceptTarget("c 'magic missile'")).toBe(true);
            expect(canCommandAcceptTarget("commune 'bless'")).toBe(true);
            expect(canCommandAcceptTarget("cast 'cure light'")).toBe(true);
        });

        it('rejects self or area spells that do not accept targets', () => {
            expect(canCommandAcceptTarget("cast 'shroud'")).toBe(false);
            expect(canCommandAcceptTarget("cast 'earthquake'")).toBe(false);
            expect(canCommandAcceptTarget("cast 'word of recall'")).toBe(false);
        });

        it('identifies targeted combat skills and verbs', () => {
            expect(canCommandAcceptTarget('bash')).toBe(true);
            expect(canCommandAcceptTarget('kick')).toBe(true);
            expect(canCommandAcceptTarget('kill')).toBe(true);
            expect(canCommandAcceptTarget('consider')).toBe(true);
            expect(canCommandAcceptTarget('assist')).toBe(true);
        });

        it('rejects movement or utility commands without %n', () => {
            expect(canCommandAcceptTarget('flee')).toBe(false);
            expect(canCommandAcceptTarget('score')).toBe(false);
            expect(canCommandAcceptTarget('inventory')).toBe(false);
        });

        it('accepts any command with %n wildcard', () => {
            expect(canCommandAcceptTarget('open %n')).toBe(true);
            expect(canCommandAcceptTarget('look at %n|room')).toBe(true);
        });
    });

    describe('applyTargetToCommand', () => {
        it('appends target to targeted spell when target is provided', () => {
            expect(applyTargetToCommand("cast 'fireball'", 'Cave Orc')).toBe("cast 'fireball' Cave Orc");
            expect(applyTargetToCommand("c 'magic missile'", 'troll')).toBe("c 'magic missile' troll");
        });

        it('leaves targeted spell bare when no target is provided', () => {
            expect(applyTargetToCommand("cast 'fireball'", null)).toBe("cast 'fireball'");
            expect(applyTargetToCommand("cast 'fireball'", '')).toBe("cast 'fireball'");
        });

        it('appends target to combat verbs when provided', () => {
            expect(applyTargetToCommand('bash', 'Cave Orc')).toBe('bash Cave Orc');
            expect(applyTargetToCommand('kill', 'troll')).toBe('kill troll');
        });

        it('does not append target to non-targeted commands', () => {
            expect(applyTargetToCommand('flee', 'Cave Orc')).toBe('flee');
            expect(applyTargetToCommand("cast 'shroud'", 'Cave Orc')).toBe("cast 'shroud'");
            expect(applyTargetToCommand('score', 'Cave Orc')).toBe('score');
        });

        it('substitutes %n when present', () => {
            expect(applyTargetToCommand('look at %n', 'gate')).toBe('look at gate');
            expect(applyTargetToCommand('look at %n', null)).toBe('look at');
            expect(applyTargetToCommand('open %n|exit', null)).toBe('open exit');
            expect(applyTargetToCommand('open %n|exit', 'door')).toBe('open door');
        });
    });
});
