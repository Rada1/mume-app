/** @file commandAutoTarget.test.ts — Verifies room-first automatic targeting. */

// --- Logic Section ---
import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import type { GmcpOccupant, Message } from '../types';
import { createRoomActions, initialRoomState, type RoomState } from '../stores/slices/roomSlice';
import { getRescueTargetSuggestions, getRoomTargetSuggestions } from '../objects/roomTargetSuggestions';
import { getVisibleRoomSubject } from '../hooks/roomVisibleOrder';
import { getAutoRoomTarget, getViableRoomCharacterTargets } from './commandAutoTarget';

describe('automatic room targeting', () => {
    it('chooses the first room occupant despite numeric ID ordering', () => {
        const occupants: GmcpOccupant[] = [
            { id: 10, name: 'a man', type: 'npc', _roomOrder: 2 },
            { id: 20, name: 'an elf', type: 'npc', _roomOrder: 1 },
            { id: 30, name: 'a warg', type: 'npc', _roomOrder: 0 }
        ];

        expect(getViableRoomCharacterTargets('kill', occupants)).toEqual(['warg', 'elf', 'man']);
        expect(getAutoRoomTarget('kill', occupants)).toBe('warg');
    });

    it('chooses 1.orc when four identical occupants are present', () => {
        const occupants: GmcpOccupant[] = [4, 3, 2, 1].map((id, _roomOrder) => ({
            id, name: 'an orc', type: 'npc', _roomOrder
        }));

        expect(getRoomTargetSuggestions(occupants, [], 'characters').map(target => target.value))
            .toEqual(['1.orc', '2.orc', '3.orc', '4.orc']);
        expect(getAutoRoomTarget('bash', occupants)).toBe('1.orc');
    });

    it('prioritizes groupmates fighting in rescue menus and automatic selection', () => {
        const occupants: GmcpOccupant[] = [
            { id: 1, name: 'elf', type: 'player', pc: true, _roomOrder: 0 },
            { id: 2, name: 'man', type: 'player', pc: true, _roomOrder: 1 }
        ];
        const groupMembers = [{ id: 2, name: 'man', hp: 100, fighting: true }];

        expect(getRescueTargetSuggestions(occupants, '', groupMembers).map(target => target.value))
            .toEqual(['man', 'elf', '__blank_target__']);
        expect(getAutoRoomTarget('rescue', occupants, '', undefined, groupMembers)).toBe('man');
    });

    it('keeps arrival order when the room store receives a duplicate add event', () => {
        const useRoom = create<RoomState>((set, get) => ({
            ...initialRoomState,
            ...createRoomActions(set, get)
        }));
        useRoom.getState().setChars({
            30: { id: 30, name: 'a warg', type: 'npc', _roomOrder: 0 },
            20: { id: 20, name: 'an elf', type: 'npc', _roomOrder: 1 }
        });

        useRoom.getState().addChar({ id: 30, name: 'a warg', type: 'npc' });
        useRoom.getState().addChar({ id: 10, name: 'a man', type: 'npc' });

        const occupants = Object.values(useRoom.getState().chars);
        expect(getAutoRoomTarget('kill', occupants)).toBe('warg');
        expect(getViableRoomCharacterTargets('kill', occupants)).toEqual(['warg', 'elf', 'man']);
    });

    it('follows visible rider-first room lines when GMCP lists wargs first', () => {
        const useRoom = create<RoomState>((set, get) => ({
            ...initialRoomState,
            ...createRoomActions(set, get)
        }));
        useRoom.getState().setRoomInfo({ roomNum: 42 });
        useRoom.getState().setChars({
            1: { id: 1, name: 'a hungry warg', type: 'npc', _roomOrder: 0 },
            2: { id: 2, name: 'an Ohurk-uai warg-rider', type: 'npc', _roomOrder: 1 },
            3: { id: 3, name: 'a hungry warg', type: 'npc', _roomOrder: 2 },
            4: { id: 4, name: 'an Ohurk-uai warg-rider', type: 'npc', _roomOrder: 3 }
        });
        const firstLine: Message = {
            id: 'rider-line', type: 'game', timestamp: 0, html: '',
            textRaw: 'An Ohurk-uai warg-rider is here riding a hungry warg.',
            tokens: [
                { type: 'entity', content: 'Ohurk-uai warg-rider', entityId: '2', metadata: { kind: 'npc', occupantId: 2 } },
                { type: 'entity', content: 'hungry warg', entityId: '1', metadata: { kind: 'npc', occupantId: 1 } }
            ]
        };
        useRoom.getState().setVisibleRoomSubjects([
            getVisibleRoomSubject(firstLine),
            { id: '1', label: 'hungry warg', line: 'A hungry warg is standing here.' },
            { id: '4', label: 'Ohurk-uai warg-rider', line: 'An Ohurk-uai warg-rider is here.' },
            { id: '3', label: 'hungry warg', line: 'A hungry warg is standing here.' }
        ], 42);

        expect(getVisibleRoomSubject(firstLine).id).toBe('2');
        expect(getAutoRoomTarget('hit', Object.values(useRoom.getState().chars))).toBe('1.rider');

        useRoom.getState().setChars(previous => Object.fromEntries(Object.entries(previous).map(([key, char]) => [
            key, { ...char, _visibleRoomOrder: undefined }
        ])));
        expect(getAutoRoomTarget('hit', Object.values(useRoom.getState().chars))).toBe('1.rider');
    });
});
