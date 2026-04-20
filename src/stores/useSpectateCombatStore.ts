import { create } from 'zustand';
import { CombatHealthStatus, GroupMember } from '../types';
import { findStatus } from '../utils/combatUtils';
import { gmcpBus } from '../events/gmcpBus';
import { useModeStore } from './useModeStore';

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
    setOpponentId: (id: number | null) => void;
    setOpponentName: (name: string | null) => void;
    setOpponentStatus: (status: CombatHealthStatus | null) => void;
    setBuffer: (name: string | null, status: CombatHealthStatus | null) => void;
    setBufferName: (name: string | null) => void;
    setBufferStatus: (status: CombatHealthStatus | null) => void;
    setGroupMembers: (members: any) => void;
    
    applyRoomCharsCombat: (data: any[]) => void;
    applyGroupUpdate: (update: any) => void;
    applyGroupRemove: (id: string | number) => void;
    applyGroupAdd: (member: GroupMember) => void;
    applyGroupSet: (members: GroupMember[]) => void;
}

export type CombatStore = CombatState & CombatActions;

export const useSpectateCombatStore = create<CombatStore>((set, get) => ({
    opponentId: null,
    opponentName: null,
    opponentHealthStatus: null,
    bufferName: null,
    bufferHealthStatus: null,
    groupMembers: [],

    setOpponent: (id, name, status) => set({ opponentId: id, opponentName: name, opponentHealthStatus: status }),
    setOpponentId: (opponentId) => set({ opponentId }),
    setOpponentName: (opponentName) => set({ opponentName }),
    setOpponentStatus: (opponentHealthStatus) => set({ opponentHealthStatus }),
    
    setBuffer: (name, status) => set({ bufferName: name, bufferHealthStatus: status }),
    setBufferName: (bufferName) => set({ bufferName }),
    setBufferStatus: (bufferHealthStatus) => set({ bufferHealthStatus }),
    
    setGroupMembers: (update) => set((state) => {
        const next = typeof update === 'function' ? update(state.groupMembers) : update;
        return { groupMembers: next };
    }),

    applyRoomCharsCombat: (data) => {
        if (!Array.isArray(data)) return;

        const { opponentId, opponentName, bufferName } = get();
        let newOpponentHealth: CombatHealthStatus | null = null;
        let newBufferHealth: CombatHealthStatus | null = null;

        data.forEach(char => {
            const status = findStatus(char.health || char.condition || char.hp_status || char.status);
            if (!status) return;

            if (opponentId && char.id === opponentId) {
                newOpponentHealth = status;
            } else if (opponentName && !opponentId) {
                const name = char.name || char.short || char.keyword;
                if (name && (name.toLowerCase() === opponentName.toLowerCase())) {
                    newOpponentHealth = status;
                }
            }

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
            groupMembers: [...state.groupMembers.filter(m => m.id !== member.id), member]
        }));
    },

    applyGroupSet: (members) => {
        set({ groupMembers: members });
    }
}));

export const getSpectateCombat = () => useSpectateCombatStore.getState();

gmcpBus.on('Char.Opponent', (data: string | null) => {
    if (!useModeStore.getState().isSpectating) return;
    const combat = getSpectateCombat();
    if (data === null || data === "") {
        combat.setOpponent(null, null, null);
    } else {
        const id = parseInt(data);
        if (!isNaN(id)) {
            combat.setOpponent(id, null, null);
        } else {
            combat.setOpponent(null, data, null);
        }
    }
});

gmcpBus.on('Char.Buffer', (data: string | null) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateCombat().setBuffer(data, null);
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
