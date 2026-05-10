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

// Use Room.Chars fighting field to pinpoint the exact opponent by GMCP ID.
// fighting: "you" means that specific character is attacking the player.
// This disambiguates identical-named NPCs (e.g. 3 pack horses, only one fighting).

const isRiddenByPlayer = (char: any) => {
    const text = [char.name, char.short, char.shortdesc, char.desc, char.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return text.includes('ridden by you');
};

const applyFightingYou = (char: any) => {
    if (!char || String(char.fighting).toLowerCase() !== 'you' || char.id == null) return;
    if (isRiddenByPlayer(char)) return;
    const store = useCombatStore.getState();
    store.setOpponentId(char.id);
    if (char.name) store.setOpponentName(char.name);
};

// Full Room.Chars.Set — scan all chars
gmcpBus.on('Room.Chars', (data: any) => {
    if (data?.isSnooped) return;
    const rawList = Array.isArray(data) ? data : (data?.chars || data?.char || data?.list || []);
    if (Array.isArray(rawList)) rawList.forEach(applyFightingYou);
});

// Per-occupant Add/Update — fires when an NPC enters the room or changes state
gmcpBus.on('Room.AddChar', (data: any) => {
    if (data?.isSnooped) return;
    applyFightingYou(data);
});

gmcpBus.on('Room.UpdateChar', (data: any) => {
    if (data?.isSnooped) return;
    applyFightingYou(data);
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
