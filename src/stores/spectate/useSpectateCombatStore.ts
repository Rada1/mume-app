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

gmcpBus.on('Char.Opponent', (data: any) => {
    if (!data?.isSnooped) return;
    const value = data.data;
    if (typeof value === 'string') {
        getSpectateCombat().setOpponent(null, value, null);
    } else if (value === null) {
        getSpectateCombat().setOpponent(null, null, null);
    }
});

gmcpBus.on('Char.Buffer', (data: any) => {
    if (!data?.isSnooped) return;
    const value = data.data;
    if (typeof value === 'string') {
        getSpectateCombat().setBuffer(value, null);
    } else if (value === null) {
        getSpectateCombat().setBuffer(null, null);
    }
});

gmcpBus.on('Room.CharsCombat', (data: any) => {
    if (!data.isSnooped) return;
    getSpectateCombat().applyRoomCharsCombat(data);
});

gmcpBus.on('Group.Set', (data: any) => {
    if (!data.isSnooped) return;
    getSpectateCombat().applyGroupSet(data);
});

gmcpBus.on('Group.Add', (data: any) => {
    if (!data.isSnooped) return;
    getSpectateCombat().applyGroupAdd(data);
});

gmcpBus.on('Group.Remove', (data: any) => {
    if (!data.isSnooped) return;
    const store = getSpectateCombat();
    if (data && data.id) {
        store.applyGroupRemove(data.id);
    } else if (typeof data === 'string' || typeof data === 'number') {
        store.applyGroupRemove(data);
    }
});

gmcpBus.on('Group.Update', (data: any) => {
    if (!data.isSnooped) return;
    getSpectateCombat().applyGroupUpdate(data);
});