/**
 * @file useSpectateCombatStore.ts
 * @description Store for spectated character's combat state. Gated to ONLY update during spectate sessions.
 */

import { create } from 'zustand';
import { useModeStore } from '../useModeStore';
import { gmcpBus } from '../../events/gmcpBus';
import { 
    CombatState, 
    initialCombatState, 
    createCombatActions 
} from '../slices/combatSlice';

export const useSpectateCombatStore = create<CombatState>((set, get) => ({
    ...initialCombatState,
    ...createCombatActions(set, get)
}));

export const getSpectateCombat = () => useSpectateCombatStore.getState();

// --- Event Subscriptions ---

gmcpBus.on('Char.Opponent', (data: string | null) => {
    if (!useModeStore.getState().isSpectating) return;
    if (typeof data === 'string') {
        getSpectateCombat().setOpponent(null, data, null);
    } else if (data === null) {
        getSpectateCombat().setOpponent(null, null, null);
    }
});

gmcpBus.on('Char.Buffer', (data: string | null) => {
    if (!useModeStore.getState().isSpectating) return;
    if (typeof data === 'string') {
        getSpectateCombat().setBuffer(data, null);
    } else if (data === null) {
        getSpectateCombat().setBuffer(null, null);
    }
});

gmcpBus.on('Room.CharsCombat', (data: any[]) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateCombat().applyRoomCharsCombat(data);
});

gmcpBus.on('Group.Set', (data: any[]) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateCombat().applyGroupSet(data);
});

gmcpBus.on('Group.Add', (data: any) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateCombat().applyGroupAdd(data);
});

gmcpBus.on('Group.Remove', (data: any) => {
    if (!useModeStore.getState().isSpectating) return;
    if (data && data.id) {
        getSpectateCombat().applyGroupRemove(data.id);
    } else if (typeof data === 'string' || typeof data === 'number') {
        getSpectateCombat().applyGroupRemove(data);
    }
});

gmcpBus.on('Group.Update', (data: any) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateCombat().applyGroupUpdate(data);
});
