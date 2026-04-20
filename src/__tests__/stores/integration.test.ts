import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gmcpBus } from '../../events/gmcpBus';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCombatStore } from '../../stores/useCombatStore';
import { useModeStore } from '../../stores/useModeStore';
import { useVitalsStore } from '../../stores/useVitalsStore';

describe('Event Bus to Store Integration', () => {
    beforeEach(() => {
        // Reset stores before each test
        useRoomStore.getState().clear();
        useCombatStore.setState({ opponentId: null, opponentName: null, opponentHealthStatus: null, groupMembers: [] });
        useModeStore.setState({ isSpectating: false });
        useVitalsStore.setState({ hp: 0, maxHp: 0 });
    });

    describe('Char.Vitals', () => {
        it('updates vitals store when Char.Vitals is emitted', () => {
            gmcpBus.emit('Char.Vitals', { hp: 50, maxhp: 100 });
            expect(useVitalsStore.getState().hp).toBe(50);
        });
    });

    describe('Room Occupant Lifecycle', () => {
        it('processes Room.Info, setPlayers, AddPlayer, and RemovePlayer', () => {
            // 1. Enter room
            gmcpBus.emit('Room.Info', { name: 'Test Room' });
            expect(useRoomStore.getState().roomName).toBe('Test Room');

            // 2. Initial players arrive
            gmcpBus.emit('Room.Players', [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);
            expect(useRoomStore.getState().players).toHaveLength(2);

            // 3. New player enters
            gmcpBus.emit('Room.AddPlayer', { id: 3, name: 'Charlie' });
            expect(useRoomStore.getState().players).toHaveLength(3);
            expect(useRoomStore.getState().players.find(p => p.name === 'Charlie')).toBeDefined();

            // 4. Player leaves
            gmcpBus.emit('Room.RemovePlayer', { id: 1, name: 'Alice' });
            expect(useRoomStore.getState().players).toHaveLength(2);
            expect(useRoomStore.getState().players.find(p => p.name === 'Alice')).toBeUndefined();
        });
    });

    describe('Combat Targeting', () => {
        it('resolves opponent health status from Room.CharsCombat based on Char.Opponent', () => {
            gmcpBus.emit('Char.Opponent', '99');
            expect(useCombatStore.getState().opponentId).toBe(99);

            // 2. CharsCombat updates health
            gmcpBus.emit('Room.CharsCombat', [
                { id: 99, name: 'Orc', status: 'Hurt' }
            ]);

            // Assuming findStatus converts 'Hurt' to 'Hurt'
            expect(useCombatStore.getState().opponentHealthStatus).toBe('Hurt');
        });
    });

    describe('Spectate Gate', () => {
        it('blocks room updates when isSpectating is true', () => {
            useModeStore.setState({ isSpectating: true });
            
            gmcpBus.emit('Room.Info', { name: 'Spectated Room' });
            // Should not update
            expect(useRoomStore.getState().roomName).toBeNull();
        });
    });

    describe('Group Management', () => {
        it('matches Add, Update, and Remove operations by id', () => {
            // 1. Add
            gmcpBus.emit('Group.Add', { id: 10, name: 'Tank', hp: 100 });
            expect(useCombatStore.getState().groupMembers).toHaveLength(1);

            // 2. Update
            gmcpBus.emit('Group.Update', { id: 10, hp: 50 });
            expect(useCombatStore.getState().groupMembers[0].hp).toBe(50);

            // 3. Remove
            gmcpBus.emit('Group.Remove', { id: 10 });
            expect(useCombatStore.getState().groupMembers).toHaveLength(0);
        });
    });
});
