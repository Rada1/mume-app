import { describe, it, expect } from 'vitest';
import {
    doesCommandMatchDeckItem,
    doesCommandMatchSkill,
    doesCommandMatchQuickButton
} from './commandFeedbackUtils';

describe('commandFeedbackUtils', () => {
    describe('doesCommandMatchDeckItem', () => {
        it('matches Kill with kill, k, and targets', () => {
            const killItem = { label: 'Kill', cmd: 'kill ' };
            expect(doesCommandMatchDeckItem('kill troll', killItem)).toBe(true);
            expect(doesCommandMatchDeckItem('k orc', killItem)).toBe(true);
            expect(doesCommandMatchDeckItem('kill', killItem)).toBe(true);
            expect(doesCommandMatchDeckItem('k', killItem)).toBe(true);
            expect(doesCommandMatchDeckItem('kick troll', killItem)).toBe(false);
            expect(doesCommandMatchDeckItem('look', killItem)).toBe(false);
        });

        it('matches Flee with flee and fl', () => {
            const fleeItem = { label: 'Flee', cmd: 'flee' };
            expect(doesCommandMatchDeckItem('flee', fleeItem)).toBe(true);
            expect(doesCommandMatchDeckItem('fl', fleeItem)).toBe(true);
            expect(doesCommandMatchDeckItem('fleeing', fleeItem)).toBe(false);
        });

        it('matches Consider and Assist with abbreviations and targets', () => {
            const considerItem = { label: 'Consider', cmd: 'consider ' };
            expect(doesCommandMatchDeckItem('consider troll', considerItem)).toBe(true);
            expect(doesCommandMatchDeckItem('con orc', considerItem)).toBe(true);
            expect(doesCommandMatchDeckItem('cons elf', considerItem)).toBe(true);

            const assistItem = { label: 'Assist', cmd: 'assist ' };
            expect(doesCommandMatchDeckItem('assist gandalf', assistItem)).toBe(true);
            expect(doesCommandMatchDeckItem('ass gandalf', assistItem)).toBe(true);
        });

        it('matches Say with prefix apostrophe and say command', () => {
            const sayItem = { label: 'Say', cmd: 'say ' };
            expect(doesCommandMatchDeckItem("'hello everyone", sayItem)).toBe(true);
            expect(doesCommandMatchDeckItem('say hi', sayItem)).toBe(true);
            expect(doesCommandMatchDeckItem('say', sayItem)).toBe(true);
            expect(doesCommandMatchDeckItem('yell hello', sayItem)).toBe(false);
        });

        it('matches Emote with colon prefix and emote/em commands', () => {
            const emoteItem = { label: 'Emote', cmd: 'emote ' };
            expect(doesCommandMatchDeckItem(':waves happily', emoteItem)).toBe(true);
            expect(doesCommandMatchDeckItem('emote bows', emoteItem)).toBe(true);
            expect(doesCommandMatchDeckItem('em smiles', emoteItem)).toBe(true);
        });

        it('distinguishes between Camp and Camp Rent', () => {
            const campItem = { label: 'Camp', cmd: 'camp' };
            const campRentItem = { label: 'Camp Rent', cmd: 'camp rent' };

            expect(doesCommandMatchDeckItem('camp', campItem)).toBe(true);
            expect(doesCommandMatchDeckItem('camp rent', campItem)).toBe(false);

            expect(doesCommandMatchDeckItem('camp rent', campRentItem)).toBe(true);
            expect(doesCommandMatchDeckItem('camp', campRentItem)).toBe(false);
        });

        it('matches Utility items like Score, Inventory, Equipment', () => {
            expect(doesCommandMatchDeckItem('sc', { label: 'Score', cmd: 'score' })).toBe(true);
            expect(doesCommandMatchDeckItem('score', { label: 'Score', cmd: 'score' })).toBe(true);
            expect(doesCommandMatchDeckItem('i', { label: 'Inventory', cmd: 'inventory' })).toBe(true);
            expect(doesCommandMatchDeckItem('inv', { label: 'Inventory', cmd: 'inventory' })).toBe(true);
            expect(doesCommandMatchDeckItem('eq', { label: 'Equipment', cmd: 'equipment' })).toBe(true);
        });
    });

    describe('doesCommandMatchSkill', () => {
        it('matches skills with targets and abbreviations', () => {
            const bandageSkill = { label: 'Bandage', practiceName: 'bandage', cmd: 'bandage' };
            expect(doesCommandMatchSkill('bandage elf', bandageSkill)).toBe(true);
            expect(doesCommandMatchSkill('band elf', bandageSkill)).toBe(true);
            expect(doesCommandMatchSkill('bandage', bandageSkill)).toBe(true);
            expect(doesCommandMatchSkill('bash orc', bandageSkill)).toBe(false);

            const backstabSkill = { label: 'Backstab', practiceName: 'backstab', cmd: 'backstab' };
            expect(doesCommandMatchSkill('backstab orc', backstabSkill)).toBe(true);
            expect(doesCommandMatchSkill('bs orc', backstabSkill)).toBe(true);

            const rescueSkill = { label: 'Rescue', practiceName: 'rescue', cmd: 'rescue' };
            expect(doesCommandMatchSkill('res frodo', rescueSkill)).toBe(true);
            expect(doesCommandMatchSkill('rescue frodo', rescueSkill)).toBe(true);
        });

        it('matches spells with cast and c syntax with quotes and abbreviations', () => {
            const mmSpell = { label: 'Magic Missile', practiceName: 'magic missile', cmd: "cast 'magic missile'" };
            expect(doesCommandMatchSkill("cast 'magic missile' orc", mmSpell)).toBe(true);
            expect(doesCommandMatchSkill("c 'magic missile' orc", mmSpell)).toBe(true);
            expect(doesCommandMatchSkill("c 'mag mis' orc", mmSpell)).toBe(true);
            expect(doesCommandMatchSkill("c 'magic missile'", mmSpell)).toBe(true);
            expect(doesCommandMatchSkill("c magic missile orc", mmSpell)).toBe(true);

            const armourSpell = { label: 'Armour', practiceName: 'armour', cmd: "cast 'armour'" };
            expect(doesCommandMatchSkill("c 'armour'", armourSpell)).toBe(true);
            expect(doesCommandMatchSkill("c 'arm'", armourSpell)).toBe(true);
            expect(doesCommandMatchSkill("cast armour", armourSpell)).toBe(true);
            expect(doesCommandMatchSkill("c armour", armourSpell)).toBe(true);
            expect(doesCommandMatchSkill("c 'magic missile'", armourSpell)).toBe(false);
        });

        it('distinguishes Cure Light and Cure Serious correctly', () => {
            const cureLight = { label: 'Cure Light', practiceName: 'cure light', cmd: "cast 'cure light'" };
            const cureSerious = { label: 'Cure Serious', practiceName: 'cure serious', cmd: "cast 'cure serious'" };

            expect(doesCommandMatchSkill("c 'cur lig' me", cureLight)).toBe(true);
            expect(doesCommandMatchSkill("c 'cur ser' me", cureLight)).toBe(false);

            expect(doesCommandMatchSkill("c 'cur ser' me", cureSerious)).toBe(true);
            expect(doesCommandMatchSkill("c 'cur lig' me", cureSerious)).toBe(false);
        });
    });

    describe('doesCommandMatchQuickButton', () => {
        it('matches exact commands or prefix commands', () => {
            expect(doesCommandMatchQuickButton('rest', 'rest')).toBe(true);
            expect(doesCommandMatchQuickButton('kill troll', 'kill')).toBe(true);
            expect(doesCommandMatchQuickButton('cast heal me', "cast 'heal' me")).toBe(false);
            expect(doesCommandMatchQuickButton("cast 'heal' me", "cast 'heal' me")).toBe(true);
        });
    });
});
