import { create } from 'zustand';
import { gmcpBus } from '../events/gmcpBus';
import { useModeStore } from './useModeStore';
import { CombatState, initialCombatState, createCombatActions } from './slices/combatSlice';

export type CombatStore = CombatState;

export const useCombatStore = create<CombatStore>((set, get) => ({
    ...initialCombatState,
    ...createCombatActions(set, get),
}));

// --- Event Subscriptions ---

gmcpBus.on('Char.Opponent', (data: string | null) => {
    if (useModeStore.getState().isSpectating) return;
    const store = useCombatStore.getState();
    if (typeof data === 'string') {
        const idNum = parseInt(data, 10);
        if (!isNaN(idNum) && idNum > 0) {
            store.setOpponent(idNum, null, null);
        } else {
            store.setOpponent(null, data, null);
        }
    } else if (data === null) {
        store.setOpponent(null, null, null);
    }
});

gmcpBus.on('Char.Buffer', (data: string | null) => {
    if (useModeStore.getState().isSpectating) return;
    const store = useCombatStore.getState();
    if (typeof data === 'string') {
        store.setBuffer(data, null);
    } else if (data === null) {
        store.setBuffer(null, null);
    }
});

gmcpBus.on('Room.CharsCombat', (data: any[]) => {
    if (useModeStore.getState().isSpectating) return;
    useCombatStore.getState().applyRoomCharsCombat(data);
});

gmcpBus.on('Group.Set', (data: any[]) => {
    if (useModeStore.getState().isSpectating) return;
    useCombatStore.getState().applyGroupSet(data);
});

gmcpBus.on('Group.Add', (data: any) => {
    if (useModeStore.getState().isSpectating) return;
    useCombatStore.getState().applyGroupAdd(data);
});

gmcpBus.on('Group.Remove', (data: any) => {
    if (useModeStore.getState().isSpectating) return;
    const store = useCombatStore.getState();
    if (data && data.id) {
        store.applyGroupRemove(data.id);
    } else if (typeof data === 'string' || typeof data === 'number') {
        store.applyGroupRemove(data);
    }
});

gmcpBus.on('Group.Update', (data: any) => {
    if (useModeStore.getState().isSpectating) return;
    useCombatStore.getState().applyGroupUpdate(data);
});

export const getCombat = () => useCombatStore.getState();
