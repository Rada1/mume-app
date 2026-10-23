/** @file useRoomCharacters.test.ts — Regression checks for followers missing from Room.Chars. */
import { describe, expect, it } from 'vitest';
import type { GmcpOccupant, GroupMember } from '../types';
import { reconcileRoomCharacters } from './useRoomCharacters';
import { getCommandActionTargetEntries, getCommandRoomTargetGroups } from '../objects/commandActionTargetModel';

// --- Follower Location Checks ---
const horse: GroupMember = { id: 17, name: 'pack horse', hp: 'bad', mapid: '420' };

describe('room groupmate reconciliation', () => {
    it('makes a same-room follower available to room commands without Room.Chars.Add', () => {
        const chars = reconcileRoomCharacters({}, [horse], 420);
        const entries = getCommandActionTargetEntries(Object.values(chars), [], [], [], [], [horse]);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ id: 'roomchars:17', scope: 'room', groupMember: horse, keyword: 'horse' });
        expect(getCommandRoomTargetGroups(entries).flatMap(section => section.entries)).toHaveLength(1);
    });

    it('updates when the follower catches up, leaves, or is ungrouped without persisting synthetic occupants', () => {
        const raw = {};
        expect(Object.values(reconcileRoomCharacters(raw, [horse], 421))).toHaveLength(0);
        expect(Object.values(reconcileRoomCharacters(raw, [{ ...horse, mapid: 421 }], 421))).toHaveLength(1);
        expect(Object.values(reconcileRoomCharacters(raw, [{ ...horse, mapid: 422 }], 421))).toHaveLength(0);
        expect(Object.values(reconcileRoomCharacters(raw, [], 421))).toHaveLength(0);
        expect(raw).toEqual({});
    });

    it('accepts numeric room locations and a separate Room.Info map ID', () => {
        expect(Object.values(reconcileRoomCharacters({}, [horse], 19, 420))).toHaveLength(1);
        expect(Object.values(reconcileRoomCharacters({}, [{ ...horse, mapid: undefined, room: '420' }], 420))).toHaveLength(1);
    });

    it('does not infer presence from room titles or missing, invalid, or zero IDs', () => {
        for (const mapid of [undefined, '', 0, 'bad']) {
            const member = { ...horse, mapid, room: 'Western Zones' };
            expect(reconcileRoomCharacters({}, [member], 420)).toEqual({});
        }
        expect(reconcileRoomCharacters({}, [{ ...horse, mapid: 0 }], 0)).toEqual({});
        expect(reconcileRoomCharacters({}, [{ ...horse, mapid: 421, room: '420' }], 420)).toEqual({});
    });

    it('keeps authoritative identity, classification, labels, and order without duplicates', () => {
        const occupant: GmcpOccupant = { id: '17', name: 'pack horse', short: 'a sturdy pack horse', type: 'npc', _roomOrder: 2 };
        const result = reconcileRoomCharacters({ 17: occupant }, [horse], 420);
        expect(Object.values(result)).toEqual([occupant]);
        expect(result[17]).toBe(occupant);
    });

    it('matches aliases without duplicating a text arrival and repairs missing classification', () => {
        const occupant = { id: 'syn:pack horse', name: 'a pack horse' };
        const result = reconcileRoomCharacters({ 99: occupant }, [horse], 420);
        expect(Object.values(result)).toEqual([{ ...occupant, type: 'ally' }]);
        expect(occupant).not.toHaveProperty('type');
    });

    it('retains a reported NPC type and excludes the current character', () => {
        expect(Object.values(reconcileRoomCharacters({}, [{ ...horse, type: 'npc' }], 420))[0]?.type).toBe('npc');
        expect(reconcileRoomCharacters({}, [{ ...horse, type: 'you' }], 420)).toEqual({});
        expect(reconcileRoomCharacters({}, [horse], 420, undefined, 'Pack Horse')).toEqual({});
    });
});
