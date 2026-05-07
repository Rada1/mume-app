/**
 * @file combatSlice.ts
 * @description Shared logic for opponent health tracking, buffer status, and group management.
 * This slice is used by both the main useCombatStore and the useSpectateCombatStore.
 */

import { CombatHealthStatus, GroupMember } from '../../types';
import { findStatus, normalizeCombatantName } from '../../utils/combatUtils';

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

const getGroupMemberKey = (member: Partial<GroupMember>) => {
    if (member.id !== undefined && member.id !== null) return String(member.id);
    if (member.name) return member.name.toLowerCase();
    return null;
};

const mergeGroupMember = (existing: GroupMember, update: Partial<GroupMember>) => {
    const merged = { ...existing, ...update };
    if (update.mapid === undefined && existing.mapid !== undefined) merged.mapid = existing.mapid;
    if (update.fighting === undefined && existing.fighting !== undefined) merged.fighting = existing.fighting;
    if (update.name === undefined && existing.name !== undefined) merged.name = existing.name;
    if (update.hp === undefined && existing.hp !== undefined) merged.hp = existing.hp;
    return merged;
};

const upsertGroupMember = (members: GroupMember[], update: GroupMember) => {
    const updateKey = getGroupMemberKey(update);
    if (!updateKey) return members;

    let found = false;
    const next = members.map(member => {
        if (getGroupMemberKey(member) !== updateKey) return member;
        found = true;
        return mergeGroupMember(member, update);
    });

    return found ? next : [...next, update];
};

/**
 * Creates the combat actions for a Zustand store.
 */
export const createCombatActions = (set: any, get: any) => ({
    setOpponent: (id: number | null, name: string | null, status: CombatHealthStatus | null) => {
        set({ opponentId: id, opponentName: name ? normalizeCombatantName(name) : name, opponentHealthStatus: status });
    },

    setOpponentId: (id: string | number | null) => {
        const numericId = id === null ? null : Number(id);
        set({ opponentId: Number.isFinite(numericId) ? numericId : null });
    },

    setBuffer: (name: string | null, status: CombatHealthStatus | null) => {
        set({ bufferName: name ? normalizeCombatantName(name) : name, bufferHealthStatus: status });
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
                newOpponentName = normalizeCombatantName(char.name || char.short || char.keyword) || newOpponentName;
                newOpponentHealth = status;
            } else if (opponentName && !opponentId) {
                // Fallback to name match if no ID yet (only if no direct ID match exists)
                const name = normalizeCombatantName(char.name || char.short || char.keyword);
                if (name && (name.toLowerCase() === normalizeCombatantName(opponentName).toLowerCase())) {
                    newOpponentHealth = status;
                }
            } else if (opponentName && data.length === 1 && !char.id) {
                newOpponentHealth = status;
            }

            // Buffer match
            if (bufferName) {
                 const name = normalizeCombatantName(char.name || char.short || char.keyword);
                 if (name && (name.toLowerCase() === normalizeCombatantName(bufferName).toLowerCase())) {
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
            groupMembers: upsertGroupMember(state.groupMembers, update)
        }));
    },

    applyGroupRemove: (id: string | number) => {
        set((state: CombatState) => ({
            groupMembers: state.groupMembers.filter(m => String(m.id) !== String(id))
        }));
    },

    applyGroupAdd: (member: GroupMember) => {
        set((state: CombatState) => ({
            groupMembers: upsertGroupMember(state.groupMembers, member)
        }));
    },

    applyGroupSet: (members: GroupMember[]) => {
        if (!Array.isArray(members)) {
            set((state: CombatState) => ({
                groupMembers: upsertGroupMember(state.groupMembers, members)
            }));
            return;
        }

        set({ groupMembers: members });
    },

    setOpponentName: (opponentName: string | null | ((prev: string | null) => string | null)) =>
        set((state: CombatState) => {
            const next = typeof opponentName === 'function' ? opponentName(state.opponentName) : opponentName;
            return { opponentName: next ? normalizeCombatantName(next) : next };
        }),

    setOpponentHealthStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ opponentHealthStatus: typeof status === 'function' ? status(state.opponentHealthStatus) : status })),

    setOpponentStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ opponentHealthStatus: typeof status === 'function' ? status(state.opponentHealthStatus) : status })),

    setBufferName: (bufferName: string | null | ((prev: string | null) => string | null)) =>
        set((state: CombatState) => {
            const next = typeof bufferName === 'function' ? bufferName(state.bufferName) : bufferName;
            return { bufferName: next ? normalizeCombatantName(next) : next };
        }),

    setBufferHealthStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ bufferHealthStatus: typeof status === 'function' ? status(state.bufferHealthStatus) : status })),

    setBufferStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: CombatState) => ({ bufferHealthStatus: typeof status === 'function' ? status(state.bufferHealthStatus) : status })),

    setGroupMembers: (groupMembers: GroupMember[] | ((prev: GroupMember[]) => GroupMember[])) => 
        set((state: CombatState) => ({ groupMembers: typeof groupMembers === 'function' ? groupMembers(state.groupMembers) : groupMembers }))
});
