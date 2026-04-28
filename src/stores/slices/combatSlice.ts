/**
 * @file combatSlice.ts
 * @description Shared logic for opponent health tracking, buffer status, and group management.
 * This slice is used by both the main useCombatStore and the useSpectateCombatStore.
 */

import { CombatHealthStatus, GroupMember } from '../../types';
import { findStatus } from '../../utils/combatUtils';

export interface CombatState {
    opponentId: number | null;
    opponentName: string | null;
    opponentHealthStatus: CombatHealthStatus | null;
    bufferName: string | null;
    bufferHealthStatus: CombatHealthStatus | null;
    groupMembers: GroupMember[];

    setOpponent: (id: number | null, name: string | null, status: CombatHealthStatus | null) => void;
    setBuffer: (name: string | null, status: CombatHealthStatus | null) => void;
    applyRoomCharsCombat: (data: any[]) => void;
    applyGroupUpdate: (update: any) => void;
    applyGroupRemove: (id: string | number) => void;
    applyGroupAdd: (member: GroupMember) => void;
    applyGroupSet: (members: GroupMember[]) => void;
    setOpponentId: (id: string | number | null) => void;
    setOpponentName: (name: string | null | ((prev: string | null) => string | null)) => void;
    setOpponentHealthStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => void;
    setOpponentStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => void;
    setBufferName: (name: string | null | ((prev: string | null) => string | null)) => void;
    setBufferHealthStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => void;
    setBufferStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => void;
    setGroupMembers: (members: GroupMember[] | ((prev: GroupMember[]) => GroupMember[])) => void;
}

export const initialCombatState = {
    opponentId: null,
    opponentName: null,
    opponentHealthStatus: null,
    bufferName: null,
    bufferHealthStatus: null,
    groupMembers: []
};

// --- Logic Section ---

/**
 * Creates the combat actions for a Zustand store.
 */
export const createCombatActions = (set: any, get: any) => ({
    setOpponent: (id: number | null, name: string | null, status: CombatHealthStatus | null) => {
        set({ opponentId: id, opponentName: name, opponentHealthStatus: status });
    },

    setOpponentId: (id: string | number | null) => {
        const numericId = id === null ? null : Number(id);
        set({ opponentId: Number.isFinite(numericId) ? numericId : null });
    },

    setBuffer: (name: string | null, status: CombatHealthStatus | null) => {
        set({ bufferName: name, bufferHealthStatus: status });
    },

    applyRoomCharsCombat: (data: any[]) => {
        if (!Array.isArray(data)) return;

        const { opponentId, opponentName, bufferName } = get();
        let newOpponentName: string | null = null;
        let newOpponentHealth: CombatHealthStatus | null = null;
        let newBufferHealth: CombatHealthStatus | null = null;
        
        data.forEach(char => {
            const status = findStatus(char.health || char.condition || char.hp_status || char.status);
            if (!status) return;

            // Prioritize ID match for opponent
            if (opponentId && String(char.id) === String(opponentId)) {
                newOpponentName = char.name || char.short || char.keyword || newOpponentName;
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
            set((state: CombatState) => ({
                opponentName: newOpponentName || state.opponentName,
                opponentHealthStatus: newOpponentHealth || state.opponentHealthStatus,
                bufferHealthStatus: newBufferHealth || state.bufferHealthStatus
            }));
        }
    },

    applyGroupUpdate: (update: any) => {
        set((state: CombatState) => ({
            groupMembers: state.groupMembers.map(m => String(m.id) === String(update.id) ? { ...m, ...update } : m)
        }));
    },

    applyGroupRemove: (id: string | number) => {
        set((state: CombatState) => ({
            groupMembers: state.groupMembers.filter(m => String(m.id) !== String(id))
        }));
    },

    applyGroupAdd: (member: GroupMember) => {
        set((state: CombatState) => ({
            groupMembers: [...state.groupMembers, member]
        }));
    },

    applyGroupSet: (members: GroupMember[]) => {
        set({ groupMembers: members });
    },

    setOpponentName: (opponentName: string | null | ((prev: string | null) => string | null)) => 
        set((state: CombatState) => ({ opponentName: typeof opponentName === 'function' ? opponentName(state.opponentName) : opponentName })),

    setOpponentHealthStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ opponentHealthStatus: typeof status === 'function' ? status(state.opponentHealthStatus) : status })),

    setOpponentStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ opponentHealthStatus: typeof status === 'function' ? status(state.opponentHealthStatus) : status })),

    setBufferName: (bufferName: string | null | ((prev: string | null) => string | null)) => 
        set((state: CombatState) => ({ bufferName: typeof bufferName === 'function' ? bufferName(state.bufferName) : bufferName })),

    setBufferHealthStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ bufferHealthStatus: typeof status === 'function' ? status(state.bufferHealthStatus) : status })),

    setBufferStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ bufferHealthStatus: typeof status === 'function' ? status(state.bufferHealthStatus) : status })),

    setGroupMembers: (groupMembers: GroupMember[] | ((prev: GroupMember[]) => GroupMember[])) => 
        set((state: CombatState) => ({ groupMembers: typeof groupMembers === 'function' ? groupMembers(state.groupMembers) : groupMembers }))
});
