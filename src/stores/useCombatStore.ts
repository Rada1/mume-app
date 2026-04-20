/**
 * @file useCombatStore.ts
 * @description Main store for player's combat state. Gated to ignore updates during spectate sessions.
 */

import { create } from 'zustand';
import { useModeStore } from './useModeStore';
import { gmcpBus } from '../events/gmcpBus';
import { 
    CombatState, 
    initialCombatState, 
    createCombatActions 
} from './slices/combatSlice';

export const useCombatStore = create<CombatState>((set, get) => ({
    ...initialCombatState,
    ...createCombatActions(set, get)
}));

export const getCombat = () => useCombatStore.getState();

// --- Event Subscriptions ---

gmcpBus.on('Char.Opponent', (data: string | null) => {
    if (useModeStore.getState().isSpectating) return;
    if (typeof data === 'string') {
        getCombat().setOpponent(null, data, null);
    } else if (data === null) {
        getCombat().setOpponent(null, null, null);
    }
});

gmcpBus.on('Char.Buffer', (data: string | null) => {
    if (useModeStore.getState().isSpectating) return;
    if (typeof data === 'string') {
        getCombat().setBuffer(data, null);
    } else if (data === null) {
        getCombat().setBuffer(null, null);
    }
});

gmcpBus.on('Room.CharsCombat', (data: any[]) => {
    if (useModeStore.getState().isSpectating) return;
    getCombat().applyRoomCharsCombat(data);
});

gmcpBus.on('Group.Set', (data: any[]) => {
    if (useModeStore.getState().isSpectating) return;
    getCombat().applyGroupSet(data);
});

gmcpBus.on('Group.Add', (data: any) => {
    if (useModeStore.getState().isSpectating) return;
    getCombat().applyGroupAdd(data);
});

gmcpBus.on('Group.Remove', (data: any) => {
    if (useModeStore.getState().isSpectating) return;
    if (data && data.id) {
        getCombat().applyGroupRemove(data.id);
    } else if (typeof data === 'string' || typeof data === 'number') {
        getCombat().applyGroupRemove(data);
    }
});

gmcpBus.on('Group.Update', (data: any) => {
    if (useModeStore.getState().isSpectating) return;
    getCombat().applyGroupUpdate(data);
});
