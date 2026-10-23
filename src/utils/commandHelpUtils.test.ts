/**
 * @file commandHelpUtils.test.ts
 * @description Unit tests for command help topic resolution.
 */

import { describe, it, expect } from 'vitest';
import { resolveHelpTopic } from './commandHelpUtils';

describe('resolveHelpTopic', () => {
    it('resolves direct commands and commands with %n target wildcards', () => {
        expect(resolveHelpTopic('kill %n')).toBe('kill');
        expect(resolveHelpTopic('assist %n')).toBe('assist');
        expect(resolveHelpTopic('rescue %n')).toBe('rescue');
        expect(resolveHelpTopic('protect %n')).toBe('protect');
        expect(resolveHelpTopic('backstab %n')).toBe('backstab');
        expect(resolveHelpTopic('flee')).toBe('flee');
        expect(resolveHelpTopic('look')).toBe('look');
        expect(resolveHelpTopic('examine %n')).toBe('examine');
        expect(resolveHelpTopic('look in %n')).toBe('look');
    });

    it('resolves spells from cast, c, and commune commands', () => {
        expect(resolveHelpTopic("cast 'cure light' %n")).toBe('cure light');
        expect(resolveHelpTopic("c 'magic missile' %n")).toBe('magic missile');
        expect(resolveHelpTopic("commune 'sanctuary'")).toBe('sanctuary');
        expect(resolveHelpTopic("cast fireball %n")).toBe('fireball');
        expect(resolveHelpTopic("cast")).toBe('cast');
    });

    it('normalizes common MUME abbreviations', () => {
        expect(resolveHelpTopic('con %n')).toBe('consider');
        expect(resolveHelpTopic('ex %n')).toBe('examine');
        expect(resolveHelpTopic('sc')).toBe('score');
        expect(resolveHelpTopic('st')).toBe('stat');
        expect(resolveHelpTopic('inf')).toBe('info');
        expect(resolveHelpTopic('wh')).toBe('who');
        expect(resolveHelpTopic('whe')).toBe('where');
        expect(resolveHelpTopic('whoi %n')).toBe('whois');
        expect(resolveHelpTopic('pr')).toBe('practice');
        expect(resolveHelpTopic('eq')).toBe('equipment');
        expect(resolveHelpTopic('inv')).toBe('inventory');
    });

    it('resolves items, gear, and shop commands', () => {
        expect(resolveHelpTopic('get %n %p')).toBe('get');
        expect(resolveHelpTopic('drop %n')).toBe('drop');
        expect(resolveHelpTopic('wear %n')).toBe('wear');
        expect(resolveHelpTopic('remove %n')).toBe('remove');
        expect(resolveHelpTopic('wield %n')).toBe('wield');
        expect(resolveHelpTopic('hold %n')).toBe('hold');
        expect(resolveHelpTopic('buy 2 item')).toBe('buy');
        expect(resolveHelpTopic('sell item')).toBe('sell');
        expect(resolveHelpTopic('value item')).toBe('value');
        expect(resolveHelpTopic('mend item')).toBe('mend');
        expect(resolveHelpTopic('list')).toBe('list');
        expect(resolveHelpTopic('show 3')).toBe('show');
        expect(resolveHelpTopic('compare 3 item')).toBe('compare');
    });

    it('handles mount and travel commands', () => {
        expect(resolveHelpTopic('ride %n')).toBe('ride');
        expect(resolveHelpTopic('lead %n')).toBe('lead');
        expect(resolveHelpTopic('dismount')).toBe('dismount');
        expect(resolveHelpTopic('unsaddle %p %n')).toBe('unsaddle');
    });

    it('handles preexisting help commands and fallbacks', () => {
        expect(resolveHelpTopic('help track')).toBe('track');
        expect(resolveHelpTopic("help 'cure serious'")).toBe('cure serious');
        expect(resolveHelpTopic('', 'Heal')).toBe('heal');
    });
});
