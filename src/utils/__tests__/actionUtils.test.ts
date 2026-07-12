/**
 * @file actionUtils.test.ts
 * @description Inline action filtering coverage for character-gated traits.
 */

import { describe, expect, it } from 'vitest';
import { CharacterInfo, CustomButton, EntityCapability, GameEntity } from '../../types';
import { isButtonValidForEntity } from '../actionUtils';

// --- Test Data ---

const makeButton = (id: string, command: string): CustomButton => ({
    id,
    label: id,
    command,
    setId: 'inline-corpses',
    actionType: 'command',
    display: 'inline',
    style: {},
    position: { x: 0, y: 0, w: 80, h: 40 },
    isVisible: true
});

const corpse: GameEntity = {
    id: 'corpse-1',
    name: 'corpse',
    noun: 'corpse',
    category: 'cat-room-object',
    kind: 'object',
    location: 'room',
    capabilities: [EntityCapability.Corpse]
};

const character = (race: string, subrace: string = ''): CharacterInfo => ({
    name: 'Tester',
    level: 1,
    xp: 0,
    xpMax: 0,
    tnl: 0,
    tp: 0,
    tpMax: 0,
    tpnl: 0,
    race,
    subrace,
    subclass: '',
    class: 'Warrior',
    gold: 0
});

// --- Logic Section ---

describe('isButtonValidForEntity', () => {
    it('keeps shared corpse actions available to non-Orc/Troll characters', () => {
        expect(isButtonValidForEntity(
            makeButton('btn-corpse-butcher', 'butcher %n'),
            corpse.id,
            'cat-room-object',
            { buttons: [], entities: { [corpse.id]: corpse }, characterInfo: character('Man') },
            undefined,
            'corpse'
        )).toBe(true);
    });

    it('blocks Orc/Troll corpse actions for other races', () => {
        expect(isButtonValidForEntity(
            makeButton('btn-corpse-drain', 'drain %n'),
            corpse.id,
            'cat-room-object',
            { buttons: [], entities: { [corpse.id]: corpse }, characterInfo: character('Man') },
            undefined,
            'corpse'
        )).toBe(false);
    });

    it('allows corpse disposal actions for all races', () => {
        expect(isButtonValidForEntity(
            makeButton('btn-corpse-bury', 'bury %n'),
            corpse.id,
            'cat-room-object',
            { buttons: [], entities: { [corpse.id]: corpse }, characterInfo: character('Man') },
            undefined,
            'corpse'
        )).toBe(true);
    });

    it('allows Orc/Troll corpse actions for Orcs', () => {
        expect(isButtonValidForEntity(
            makeButton('btn-corpse-drain', 'drain %n'),
            corpse.id,
            'cat-room-object',
            { buttons: [], entities: { [corpse.id]: corpse }, characterInfo: character('Orc') },
            undefined,
            'corpse'
        )).toBe(true);
    });

    it('allows Camp Rent for Numenoreans in rooms', () => {
        const room: GameEntity = {
            id: 'room-1',
            name: 'room',
            noun: 'room',
            category: 'cat-room',
            kind: 'room',
            location: 'room',
            capabilities: []
        };
        const numenorean = character('Numenorean');
        expect(isButtonValidForEntity(
            makeButton('btn-camp-rent', 'camp rent'),
            room.id,
            'cat-room',
            { buttons: [], entities: { [room.id]: room }, characterInfo: numenorean },
            undefined,
            'room'
        )).toBe(true);
    });

    it('allows Camp Rent for Black Numenoreans in rooms', () => {
        const room: GameEntity = {
            id: 'room-1',
            name: 'room',
            noun: 'room',
            category: 'cat-room',
            kind: 'room',
            location: 'room',
            capabilities: []
        };
        const blackNumenorean = character('Black Numenorean');
        expect(isButtonValidForEntity(
            makeButton('btn-camp-rent', 'camp rent'),
            room.id,
            'cat-room',
            { buttons: [], entities: { [room.id]: room }, characterInfo: blackNumenorean },
            undefined,
            'room'
        )).toBe(true);
    });

    it('allows Camp Rent for Black Númenóreans (with accents) in rooms', () => {
        const room: GameEntity = {
            id: 'room-1',
            name: 'room',
            noun: 'room',
            category: 'cat-room',
            kind: 'room',
            location: 'room',
            capabilities: []
        };
        const blackNumenoreanAccent = character('Black Númenórean');
        expect(isButtonValidForEntity(
            makeButton('btn-camp-rent', 'camp rent'),
            room.id,
            'cat-room',
            { buttons: [], entities: { [room.id]: room }, characterInfo: blackNumenoreanAccent },
            undefined,
            'room'
        )).toBe(true);
    });

    it('blocks Camp Rent for non-Numenoreans in rooms', () => {
        const room: GameEntity = {
            id: 'room-1',
            name: 'room',
            noun: 'room',
            category: 'cat-room',
            kind: 'room',
            location: 'room',
            capabilities: []
        };
        const standardMan = character('Man', '');
        expect(isButtonValidForEntity(
            makeButton('btn-camp-rent', 'camp rent'),
            room.id,
            'cat-room',
            { buttons: [], entities: { [room.id]: room }, characterInfo: standardMan },
            undefined,
            'room'
        )).toBe(false);
    });

    describe('btn-room-drink-water terrain rules', () => {
        const room: GameEntity = {
            id: 'room-water-1',
            name: 'watery room',
            noun: 'room',
            category: 'cat-room',
            kind: 'room',
            location: 'room',
            capabilities: []
        };
        const defaultMan = character('Man');

        it('allows Drink Water in a water sector', () => {
            expect(isButtonValidForEntity(
                makeButton('btn-room-drink-water', 'drink water'),
                room.id,
                'cat-room',
                { buttons: [], entities: { [room.id]: room }, characterInfo: defaultMan, currentTerrain: 'water' },
                undefined,
                'room'
            )).toBe(true);
        });

        it('allows Drink Water in a shallows sector', () => {
            expect(isButtonValidForEntity(
                makeButton('btn-room-drink-water', 'drink water'),
                room.id,
                'cat-room',
                { buttons: [], entities: { [room.id]: room }, characterInfo: defaultMan, currentTerrain: 'shallows' },
                undefined,
                'room'
            )).toBe(true);
        });

        it('allows Drink Water in a rapids sector', () => {
            expect(isButtonValidForEntity(
                makeButton('btn-room-drink-water', 'drink water'),
                room.id,
                'cat-room',
                { buttons: [], entities: { [room.id]: room }, characterInfo: defaultMan, currentTerrain: 'rapids' },
                undefined,
                'room'
            )).toBe(true);
        });

        it('allows Drink Water in an underwater sector', () => {
            expect(isButtonValidForEntity(
                makeButton('btn-room-drink-water', 'drink water'),
                room.id,
                'cat-room',
                { buttons: [], entities: { [room.id]: room }, characterInfo: defaultMan, currentTerrain: 'underwater' },
                undefined,
                'room'
            )).toBe(true);
        });

        it('blocks Drink Water in a field sector', () => {
            expect(isButtonValidForEntity(
                makeButton('btn-room-drink-water', 'drink water'),
                room.id,
                'cat-room',
                { buttons: [], entities: { [room.id]: room }, characterInfo: defaultMan, currentTerrain: 'field' },
                undefined,
                'room'
            )).toBe(false);
        });

        it('blocks Drink Water when terrain is undefined', () => {
            expect(isButtonValidForEntity(
                makeButton('btn-room-drink-water', 'drink water'),
                room.id,
                'cat-room',
                { buttons: [], entities: { [room.id]: room }, characterInfo: defaultMan },
                undefined,
                'room'
            )).toBe(false);
        });
    });
});

