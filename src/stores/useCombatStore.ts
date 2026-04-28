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

gmcpBus.on('Char.Opponent', (data: any) => {
    if (data?.isSnooped) return;
    const store = useCombatStore.getState();
    const value = data && typeof data === 'object' && 'data' in data ? data.data : data;
    if (typeof value === 'string') {
        const idNum = parseInt(value, 10);
        if (!isNaN(idNum) && idNum > 0) {
            store.setOpponentId(idNum);
            if (data?.name) store.setOpponentName(data.name);
        } else {
            store.setOpponentId(null);
            store.setOpponentName(value);
        }
    } else if (typeof value === 'number' && value > 0) {
        store.setOpponentId(value);
        if (data?.name) store.setOpponentName(data.name);
    } else if (value === null) {
        store.setOpponent(null, null, null);
    }
});

gmcpBus.on('Char.Buffer', (data: any) => {
    if (data?.isSnooped) return;
    const store = useCombatStore.getState();
    const value = data && typeof data === 'object' && 'data' in data ? data.data : data;
    if (typeof value === 'string') {
        store.setBuffer(value, null);
    } else if (value === null) {
        store.setBuffer(null, null);
    }
});

gmcpBus.on('Room.Chars.Combat', (data: any) => {
    if (data.isSnooped) return;
    useCombatStore.getState().applyRoomCharsCombat(data);
});

gmcpBus.on('Group.Set', (data: any) => {
    if (data.isSnooped) return;
    useCombatStore.getState().applyGroupSet(data);
});

gmcpBus.on('Group.Add', (data: any) => {
    if (data.isSnooped) return;
    useCombatStore.getState().applyGroupAdd(data);
});

gmcpBus.on('Group.Remove', (data: any) => {
    if (data.isSnooped) return;
    const store = useCombatStore.getState();
    if (data && data.id) {
        store.applyGroupRemove(data.id);
    } else if (typeof data === 'string' || typeof data === 'number') {
        store.applyGroupRemove(data);
    }
});

gmcpBus.on('Group.Update', (data: any) => {
    if (data.isSnooped) return;
    useCombatStore.getState().applyGroupUpdate(data);
});

export const getCombat = () => useCombatStore.getState();
