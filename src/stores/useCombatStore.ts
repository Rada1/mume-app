import { create } from 'zustand';
import { CombatHealthStatus, GroupMember } from '../types';
import { gmcpBus } from '../events/gmcpBus';
import { findStatus } from '../utils/combatUtils';

export interface CombatState {
    opponentId: number | null;
    opponentName: string | null;
    opponentHealthStatus: CombatHealthStatus | null;
    bufferName: string | null;
    bufferHealthStatus: CombatHealthStatus | null;
    groupMembers: GroupMember[];
}

export interface CombatActions {
    setOpponent: (id: number | null, name: string | null, status: CombatHealthStatus | null) => void;
    setBuffer: (name: string | null, status: CombatHealthStatus | null) => void;
    applyRoomCharsCombat: (data: any[]) => void;
    applyGroupUpdate: (update: any) => void;
    applyGroupRemove: (id: string | number) => void;
    applyGroupAdd: (member: GroupMember) => void;
    applyGroupSet: (members: GroupMember[]) => void;
}

export type CombatStore = CombatState & CombatActions;

export const useCombatStore = create<CombatStore>((set, get) => ({
    opponentId: null,
    opponentName: null,
    opponentHealthStatus: null,
    bufferName: null,
    bufferHealthStatus: null,
    groupMembers: [],

    setOpponent: (id, name, status) => {
        set({ opponentId: id, opponentName: name, opponentHealthStatus: status });
    },

    setBuffer: (name, status) => {
        set({ bufferName: name, bufferHealthStatus: status });
    },

    applyRoomCharsCombat: (data) => {
        if (!Array.isArray(data)) return;

        const { opponentId, opponentName, bufferName } = get();
        let newOpponentHealth: CombatHealthStatus | null = null;
        let newBufferHealth: CombatHealthStatus | null = null;
        
        data.forEach(char => {
            const status = findStatus(char.health || char.condition || char.hp_status || char.status);
            if (!status) return;

            // Prioritize ID match for opponent
            if (opponentId && char.id === opponentId) {
                newOpponentHealth = status;
            } else if (opponentName && !opponentId) {
                // Fallback to name match if no ID yet (only if no direct ID match exists)
                const name = char.name || char.short || char.keyword;
                if (name && (name.toLowerCase() === opponentName.toLowerCase())) {
                    newOpponentHealth = status;
                }
            }

            // Buffer match
            if (bufferName) {
                 const name = char.name || char.short || char.keyword;
                 if (name && (name.toLowerCase() === bufferName.toLowerCase())) {
                    newBufferHealth = status;
                 }
            }
        });
        
        if (newOpponentHealth || newBufferHealth) {
            set((state) => ({
                opponentHealthStatus: newOpponentHealth || state.opponentHealthStatus,
                bufferHealthStatus: newBufferHealth || state.bufferHealthStatus
            }));
        }
    },

    applyGroupUpdate: (update) => {
        set((state) => ({
            groupMembers: state.groupMembers.map(m => String(m.id) === String(update.id) ? { ...m, ...update } : m)
        }));
    },

    applyGroupRemove: (id) => {
        set((state) => ({
            groupMembers: state.groupMembers.filter(m => String(m.id) !== String(id))
        }));
    },

    applyGroupAdd: (member) => {
        set((state) => ({
            groupMembers: [...state.groupMembers, member]
        }));
    },

    applyGroupSet: (members) => {
        set({ groupMembers: members });
    }
}));

gmcpBus.on('Char.Opponent', (data: string | null) => {
    if (typeof data === 'string') {
        useCombatStore.getState().setOpponent(null, data, null);
    } else if (data === null) {
        useCombatStore.getState().setOpponent(null, null, null);
    }
});

gmcpBus.on('Char.Buffer', (data: string | null) => {
    if (typeof data === 'string') {
        useCombatStore.getState().setBuffer(data, null);
    } else if (data === null) {
        useCombatStore.getState().setBuffer(null, null);
    }
});

gmcpBus.on('Room.CharsCombat', (data: any[]) => {
    useCombatStore.getState().applyRoomCharsCombat(data);
});

gmcpBus.on('Group.Set', (data: any[]) => {
    useCombatStore.getState().applyGroupSet(data);
});

gmcpBus.on('Group.Add', (data: any) => {
    useCombatStore.getState().applyGroupAdd(data);
});

gmcpBus.on('Group.Remove', (data: any) => {
    if (data && data.id) {
        useCombatStore.getState().applyGroupRemove(data.id);
    } else if (typeof data === 'string' || typeof data === 'number') {
        useCombatStore.getState().applyGroupRemove(data);
    }
});

gmcpBus.on('Group.Update', (data: any) => {
    useCombatStore.getState().applyGroupUpdate(data);
});

export const getCombat = () => useCombatStore.getState();
