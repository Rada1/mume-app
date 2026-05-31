/**
 * @file useSpectateLiveCombatStore.ts
 * @description Live ingest store for raw spectated character combat data.
 */

import { create } from 'zustand';
import { gmcpBus } from '../../events/gmcpBus';
import { GroupMember } from '../../types';
import {
    CombatState,
    initialCombatState,
    createCombatActions
} from '../slices/combatSlice';

export const useSpectateLiveCombatStore = create<CombatState>((set, get) => ({
    ...initialCombatState,
    ...createCombatActions(set, get)
}));

export const getSpectateLiveCombat = () => useSpectateLiveCombatStore.getState();

const isRecord = (data: unknown): data is Record<string, unknown> =>
    !!data && typeof data === 'object';

const isSnooped = (data: unknown) =>
    isRecord(data) && (!!data.isSnooped || !!data.spectating);

// --- Logic Section ---

gmcpBus.on('Char.Opponent', (data: any) => {
    if (!isSnooped(data)) return;
    const value = data.data;
    if (typeof value === 'string') {
        getSpectateLiveCombat().setOpponent(null, value, null);
    } else if (value === null) {
        getSpectateLiveCombat().setOpponent(null, null, null);
    }
});

gmcpBus.on('Char.Buffer', (data: any) => {
    if (!isSnooped(data)) return;
    const value = data.data;
    if (typeof value === 'string') {
        getSpectateLiveCombat().setBuffer(value, null);
    } else if (value === null) {
        getSpectateLiveCombat().setBuffer(null, null);
    }
});

gmcpBus.on('Room.Chars.Combat', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveCombat().applyRoomCharsCombat(data as unknown[]);
});

gmcpBus.on('Group.Set', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveCombat().applyGroupSet(data as GroupMember[]);
});

gmcpBus.on('Group.Add', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveCombat().applyGroupAdd(data as GroupMember);
});

gmcpBus.on('Group.Remove', (data) => {
    if (!isSnooped(data)) return;
    const store = getSpectateLiveCombat();
    if (data && data.id) {
        store.applyGroupRemove(data.id);
    } else if (typeof data === 'string' || typeof data === 'number') {
        store.applyGroupRemove(data);
    }
});

gmcpBus.on('Group.Update', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveCombat().applyGroupUpdate(data);
});
