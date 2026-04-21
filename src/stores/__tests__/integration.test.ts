import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gmcpBus } from '../../events/gmcpBus';
import { useVitalsStore } from '../useVitalsStore';
import { useRoomStore } from '../useRoomStore';
import { useModeStore } from '../useModeStore';

describe('MUME Store Integration Tests', () => {
    beforeEach(() => {
        // Reset stores before each test
        useVitalsStore.setState({
            hp: 0,
            maxHp: 0,
            mana: 0,
            maxMana: 0,
            move: 0,
            maxMove: 0,
            hpStatus: null,
            position: 'standing',
            inCombat: false,
            currentTerrain: '',
            weather: 'none',
            isFoggy: false
        });

        useRoomStore.setState({
            roomName: null,
            roomDesc: null,
            roomZone: null,
            terrain: null,
            exits: [],
            players: [],
            npcs: [],
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

    describe('Room Store Integration', () => {
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
            expect((state.rawExits as any).north).toEqual({ num: 55 });
            expect(state.items).toHaveLength(0); // Items should be cleared on new room num
        });

        it('should clear occupants only when room number changes', () => {
            // 1. Initial State: Room 100 with a player
            useRoomStore.setState({ 
                players: [{ id: 'Aragorn', name: 'Aragorn', keyword: 'aragorn', short: 'Aragorn' }] as any
            });

            // 2. Room.Info for same room (e.g. look command)
            gmcpBus.emit('Room.Info', { num: 100, name: 'Room 100' } as any);
            useRoomStore.getState().addPlayer({ name: 'Someone' });
            expect(useRoomStore.getState().players).toHaveLength(1); // Occupants NOT cleared

            // 3. Room.Info for different room (movement)
            gmcpBus.emit('Room.Info', { num: 101, name: 'Room 101' } as any);
            expect(useRoomStore.getState().players).toHaveLength(0); // Occupants cleared
        });

        it('should handle dynamic occupant updates (Add/Remove)', () => {
            gmcpBus.emit('Room.AddPlayer', { name: 'Legolas', keyword: 'legolas', short: 'Legolas' });
            expect(useRoomStore.getState().players).toHaveLength(1);
            expect(useRoomStore.getState().players[0].name).toBe('Legolas');

            gmcpBus.emit('Room.RemovePlayer', 'Legolas');
            expect(useRoomStore.getState().players).toHaveLength(0);
        });

        it('should implement cross-list cleanup (moving NPC to Player)', () => {
            // Setup NPC with ID
            useRoomStore.setState({ npcs: [{ id: 'Legolas', name: 'Legolas', keyword: 'legolas', short: 'Legolas' }] });
            
            // Add as Player
            gmcpBus.emit('Room.AddPlayer', { id: 'Legolas', name: 'Legolas', keyword: 'legolas', short: 'Legolas', pc: true });
            
            expect(useRoomStore.getState().players).toHaveLength(1);
            expect(useRoomStore.getState().npcs).toHaveLength(0); // Should be removed from NPCs
        });

        it('should respect spectate gates', () => {
            useModeStore.setState({ isSpectating: true });
            
            gmcpBus.emit('Room.Info', { num: 999, name: 'Spectate Room' });
            
            // Should NOT update
            expect(useRoomStore.getState().roomName).not.toBe('Spectate Room');
        });

        it('should handle upsert semantics on re-add', () => {
            gmcpBus.emit('Room.AddPlayer', { id: 1, name: 'Legolas' });
            gmcpBus.emit('Room.AddPlayer', { id: 1, name: 'Legolas', short: 'Legolas the Elf' });
            
            expect(useRoomStore.getState().players).toHaveLength(1);
            expect(useRoomStore.getState().players[0].short).toBe('Legolas the Elf');
        });
    });
});