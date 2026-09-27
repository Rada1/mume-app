// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
    applyTargetToCommand,
    canCommandAcceptTarget,
    getCommandTargetMenuKind,
    getDefaultCommandTarget
} from './commandTargetUtils';

describe('commandTargetUtils', () => {
    describe('canCommandAcceptTarget', () => {
        it('identifies targeted spells', () => {
            expect(canCommandAcceptTarget("cast 'fireball'")).toBe(true);
            expect(canCommandAcceptTarget("c 'magic missile'")).toBe(true);
            expect(canCommandAcceptTarget("commune 'bless'")).toBe(true);
            expect(canCommandAcceptTarget("cast 'cure light'")).toBe(true);
        });

        it('opens target menus for the requested self-targeted spells', () => {
            [
                'bless', 'cure light', 'cure serious', 'heal', 'cure critic', 'cure disease',
                'create water', 'strength', 'remove poison', 'shroud', 'cure blindness', 'sanctuary'
            ].forEach(spell => {
                expect(canCommandAcceptTarget(`cast '${spell}'`)).toBe(true);
                expect(getCommandTargetMenuKind(`cast '${spell}'`)).toBe('self-room');
                expect(getDefaultCommandTarget(`cast '${spell}'`)).toBe('self');
            });
            expect(canCommandAcceptTarget('bandage')).toBe(true);
            expect(getDefaultCommandTarget('bandage')).toBe('self');
        });

        it('opens room-target menus for the requested offensive spells', () => {
            [
                'magic missile', 'ventriloquate', 'smother', 'chill touch', 'burning hands',
                'shocking grasp', 'lightning bolt', 'dispel evil', 'harm', 'colour spray',
                'fireball', 'call lightning', 'charm', 'sleep', 'silence', 'hold', 'curse', 'blindness',
                'energy drain'
            ].forEach(spell => {
                expect(canCommandAcceptTarget(`cast '${spell}'`)).toBe(true);
            });
            expect(getCommandTargetMenuKind("cast 'fireball'")).toBe('room-spell-with-extras');
            expect(getCommandTargetMenuKind("cast 'burning hands'")).toBe('room-spell-with-extras');
            expect(getCommandTargetMenuKind("cast 'magic missile'")).toBe('room-spell');
            expect(getCommandTargetMenuKind("cast 'energy drain'")).toBe('room-spell');
        });

        it('routes special commands to spellbook, key, and Bash target menus', () => {
            expect(getCommandTargetMenuKind("cast 'store'")).toBe('mage-spells');
            expect(getCommandTargetMenuKind("cast 'raise dead'")).toBe('room-corpses');
            expect(getCommandTargetMenuKind("cast 'enchant'")).toBe('gear');
            expect(canCommandAcceptTarget("cast 'enchant'")).toBe(true);
            expect(getCommandTargetMenuKind("cast 'portal'")).toBe('magic-keys');
            expect(getCommandTargetMenuKind("cast 'scry'")).toBe('magic-keys');
            expect(getCommandTargetMenuKind("cast 'watch room'")).toBe('magic-keys');
            expect(getCommandTargetMenuKind('teleport')).toBe('magic-keys');
            expect(getCommandTargetMenuKind('scry')).toBe('magic-keys');
            expect(getCommandTargetMenuKind('bash')).toBe('bash');
            expect(getCommandTargetMenuKind('pick')).toBe('pick');
            expect(getDefaultCommandTarget('close')).toBe('exit');
            expect(getDefaultCommandTarget('pick %n|exit')).toBe('exit');
        });

        it('uses room mount menus with mount as the default for Ride and Lead', () => {
            for (const command of ['ride', 'lead']) {
                expect(canCommandAcceptTarget(command)).toBe(true);
                expect(getCommandTargetMenuKind(command)).toBe('mounts');
                expect(getDefaultCommandTarget(command)).toBe('mount');
            }
        });

        it('still accepts area and self spells that have an explicit target-menu override', () => {
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

        it('recognizes door and container actions as targetable commands', () => {
            expect(canCommandAcceptTarget('open')).toBe(true);
            expect(canCommandAcceptTarget('close')).toBe(true);
            expect(canCommandAcceptTarget('lock')).toBe(true);
            expect(canCommandAcceptTarget('unlock')).toBe(true);
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

        it('replaces a door target without dropping the swipe direction', () => {
            expect(applyTargetToCommand('close exit west', 'iron door')).toBe('close iron door west');
        });

        it('does not append target to non-targeted commands', () => {
            expect(applyTargetToCommand('flee', 'Cave Orc')).toBe('flee');
            expect(applyTargetToCommand("cast 'shroud'", 'self')).toBe("cast 'shroud' self");
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
