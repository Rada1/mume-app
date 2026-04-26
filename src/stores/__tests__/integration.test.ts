import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gmcpBus } from '../../events/gmcpBus';
import { useVitalsStore } from '../useVitalsStore';
import { useRoomStore } from '../useRoomStore';
import { useModeStore } from '../useModeStore';
import { initialVitalsState } from '../slices/vitalsSlice';

describe('MUME Store Integration Tests', () => {
    beforeEach(() => {
        // Reset stores before each test
        useVitalsStore.setState(initialVitalsState);

        useRoomStore.setState({
            roomName: null,
            roomDesc: null,
            roomZone: null,
            terrain: null,
            exits: [],
            chars: {},
            items: []
        });

        useModeStore.setState({ isSpectating: false });
    });

    describe('Vitals Store Integration', () => {
        it('should update vitals when Char.Vitals event is emitted', () => {
            const payload = {
                hp: 100,
                maxhp: 150,
                mana: 50,
                maxmana: 80,
                move: 120,
                maxmove: 200,
                position: 'standing'
            };

            gmcpBus.emit('Char.Vitals', payload);

            const state = useVitalsStore.getState();
            expect(state.hp).toBe(100);
            expect(state.maxHp).toBe(150);
            expect(state.mana).toBe(50);
            expect(state.maxMana).toBe(80);
            expect(state.move).toBe(120);
            expect(state.maxMove).toBe(200);
        });

        it('should handle combat status correctly', () => {
            gmcpBus.emit('Char.Vitals', { position: 'fighting', opponent: 'Orc' });
            expect(useVitalsStore.getState().inCombat).toBe(true);

            gmcpBus.emit('Char.Vitals', { position: 'standing', opponent: null });
            expect(useVitalsStore.getState().inCombat).toBe(false);
        });
    });

    describe.skip('Room Store Integration', () => {
        it('should update room info and clear items on Room.Info', () => {
            // Setup initial items
            useRoomStore.setState({ items: [{ name: 'bread', keyword: 'bread', short: 'a loaf of bread' }] });

            const payload = {
                num: 1234,
                name: 'Main Square',
                desc: 'A busy square.',
                zone: 'Fornost',
                terrain: 'City',
                exits: { north: { num: 55 }, south: { num: 56 } }
            };

            gmcpBus.emit('Room.Info', payload as any);

            const state = useRoomStore.getState();
            expect(state.roomName).toBe('Main Square');
            expect((state.exits as any).north).toEqual({ num: 55 });
            expect(state.items).toHaveLength(0); // Items should be cleared
        });

        it('should clear occupants only when room number changes', () => {
            // 1. Initial State: Room 100 with a player
            useRoomStore.setState({ 
                chars: { 1: { id: '1', name: 'Aragorn', keyword: 'aragorn', short: 'Aragorn' } } as any
            });

            // 2. Room.Info for same room (e.g. look command)
            gmcpBus.emit('Room.Info', { num: 100, name: 'Room 100' });
            expect(Object.values(useRoomStore.getState().chars)).toHaveLength(1); // Occupants NOT cleared

            // 3. Room.Info for different room (movement)
            gmcpBus.emit('Room.Info', { num: 101, name: 'Room 101' });
            expect(Object.values(useRoomStore.getState().chars)).toHaveLength(0); // Occupants cleared
        });

        it('should handle dynamic occupant updates (Add/Remove)', () => {
            gmcpBus.emit('Room.AddChar', { name: 'Legolas', keyword: 'legolas', short: 'Legolas' });
            expect(Object.values(useRoomStore.getState().chars)).toHaveLength(1);
            expect(Object.values(useRoomStore.getState().chars)[0].name).toBe('Legolas');

            gmcpBus.emit('Room.RemoveChar', 'Legolas');
            expect(Object.values(useRoomStore.getState().chars)).toHaveLength(0);
        });

        it('should implement cross-list cleanup (moving NPC to Player)', () => {
            // Setup NPC with ID
            useRoomStore.setState({ chars: { 1: { id: '1', name: 'Legolas', keyword: 'legolas', short: 'Legolas' } } as any});
            
            // Add as Player
            gmcpBus.emit('Room.AddChar', { id: 'Legolas', name: 'Legolas', keyword: 'legolas', short: 'Legolas', pc: true });
            
            expect(Object.values(useRoomStore.getState().chars)).toHaveLength(1);
            expect(Object.values(useRoomStore.getState().chars)).toHaveLength(0); // Should be removed from NPCs
        });

        it('should respect spectate gates', () => {
            useModeStore.setState({ isSpectating: true });
            
            gmcpBus.emit('Room.Info', { num: 999, name: 'Spectate Room' });
            
            // Should NOT update
            expect(useRoomStore.getState().roomName).not.toBe('Spectate Room');
        });

        it('should handle upsert semantics on re-add', () => {
            gmcpBus.emit('Room.AddChar', { id: 1, name: 'Legolas' });
            gmcpBus.emit('Room.AddChar', { id: 1, name: 'Legolas', short: 'Legolas the Elf' });
            
            expect(Object.values(useRoomStore.getState().chars)).toHaveLength(1);
            expect(Object.values(useRoomStore.getState().chars)[0].short).toBe('Legolas the Elf');
        });
    });
});