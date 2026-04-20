import { describe, it, expect, beforeEach } from 'vitest';
import { useCombatStore } from '../useCombatStore';
import { useUIStore } from '../useUIStore';
import { useActiveVitals, useActiveRoom, useActiveCombat, getActiveVitals } from '../useActiveGameState';
import { useModeStore } from '../useModeStore';
import { useSpectateVitalsStore } from '../spectate/useSpectateVitalsStore';
import { gmcpBus } from '../../events/gmcpBus';

describe('Extra Store and Selector Integration', () => {
    beforeEach(() => {
        // Reset stores
        useCombatStore.setState({
            opponentId: null,
            opponentName: null,
            opponentHealthStatus: null,
            bufferName: null,
            bufferHealthStatus: null,
            groupMembers: []
        });
        useUIStore.setState({
            isCharacterOpen: false,
            isStatsOpen: false,
            isInventoryOpen: false,
            isEquipmentOpen: false,
            isPlayersOpen: false
        });
        useModeStore.setState({ isSpectating: false });
    });

    describe('Combat Store', () => {
        it('should handle opponent updates via bus', () => {
            gmcpBus.emit('Char.Opponent', 'Smaug');
            expect(useCombatStore.getState().opponentName).toBe('Smaug');
            
            gmcpBus.emit('Char.Opponent', null);
            expect(useCombatStore.getState().opponentName).toBe(null);
        });

        it('should handle group updates', () => {
            gmcpBus.emit('Group.Set', [{ id: 1, name: 'Aragorn', hp: 100 }]);
            expect(useCombatStore.getState().groupMembers).toHaveLength(1);
            expect(useCombatStore.getState().groupMembers[0].name).toBe('Aragorn');

            gmcpBus.emit('Group.Add', { id: 2, name: 'Legolas', hp: 80 });
            expect(useCombatStore.getState().groupMembers).toHaveLength(2);

            gmcpBus.emit('Group.Remove', { id: 1 });
            expect(useCombatStore.getState().groupMembers).toHaveLength(1);
            expect(useCombatStore.getState().groupMembers[0].id).toBe(2);
        });
    });

    describe('UI Store', () => {
        it('should toggle panels', () => {
            const store = useUIStore.getState();
            store.openCharacter();
            expect(useUIStore.getState().isCharacterOpen).toBe(true);
            
            store.closeAllPanels();
            expect(useUIStore.getState().isCharacterOpen).toBe(false);
        });
    });

    describe('Active Game State Selectors', () => {
        it('should proxy to spectate store when isSpectating is true', () => {
            // Setup spectate data
            useSpectateVitalsStore.setState({ hp: 50 });
            useModeStore.setState({ isSpectating: true });

            // Use the non-hook getter for testing
            const activeVitalsStore = getActiveVitals();
            expect(activeVitalsStore.getState().hp).toBe(50);

            useModeStore.setState({ isSpectating: false });
            const activeVitalsStoreMain = getActiveVitals();
            expect(activeVitalsStoreMain.getState().hp).not.toBe(50);
        });
    });
});
