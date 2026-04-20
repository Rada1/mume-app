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
    setOpponentName: (name: string | null) => void;
    setOpponentHealthStatus: (status: CombatHealthStatus | null) => void;
    setBufferName: (name: string | null) => void;
    setBufferHealthStatus: (status: CombatHealthStatus | null) => void;
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

    setBuffer: (name: string | null, status: CombatHealthStatus | null) => {
        set({ bufferName: name, bufferHealthStatus: status });
    },

    applyRoomCharsCombat: (data: any[]) => {
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
            set((state: CombatState) => ({
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

    setOpponentName: (opponentName: string | null) => {
        set({ opponentName });
    },

    setOpponentHealthStatus: (opponentHealthStatus: CombatHealthStatus | null) => {
        set({ opponentHealthStatus });
    },

    setBufferName: (bufferName: string | null) => {
        set({ bufferName });
    },

    setBufferHealthStatus: (bufferHealthStatus: CombatHealthStatus | null) => {
        set({ bufferHealthStatus });
    }
});
