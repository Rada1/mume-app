import { useModeStore } from './useModeStore';
import { useVitalsStore, VitalsStore } from './useVitalsStore';
import { useSpectateVitalsStore } from './spectate/useSpectateVitalsStore';
import { useRoomStore, RoomStore } from './useRoomStore';
import { useSpectateRoomStore } from './spectate/useSpectateRoomStore';
import { useCombatStore, CombatStore } from './useCombatStore';
import { useSpectateCombatStore } from './spectate/useSpectateCombatStore';

/**
 * @file useActiveGameState.ts
 * 
 * Switchboard hooks that automatically return the correct store slice 
 * (Player or Spectated Target) based on useModeStore.isSpectating.
 */

/**
 * Returns the currently active Vitals store.
 */
export const useActiveVitals = (): VitalsStore => {
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const mainStore = useVitalsStore();
    const spectateStore = useSpectateVitalsStore();
    
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore) as VitalsStore;
};

/**
 * Returns the currently active Vitals state (imperative getter).
 */
export const getActiveVitals = (): VitalsStore => {
    const mode = useModeStore.getState();
    const isSpectating = mode.isSpectating && mode.activeView === 'target';
    return (isSpectating ? useSpectateVitalsStore.getState() : useVitalsStore.getState()) as VitalsStore;
};

/**
 * Returns the active character name (always returns the player's name, 
 * even if spectating a target).
 */
export const useActiveCharacter = () => {
    return useModeStore(state => state.activeCharacter);
};

/**
 * Returns the currently active Room store.
 */
export const useActiveRoom = (): RoomStore => {
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const mainStore = useRoomStore();
    const spectateStore = useSpectateRoomStore();
    
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore) as RoomStore;
};

/**
 * Returns the currently active Room state (imperative getter).
 */
export const getActiveRoom = (): RoomStore => {
    const mode = useModeStore.getState();
    const isSpectating = mode.isSpectating && mode.activeView === 'target';
    return (isSpectating ? useSpectateRoomStore.getState() : useRoomStore.getState()) as RoomStore;
};

/**
 * Returns the currently active Combat store.
 */
export const useActiveCombat = (): CombatStore => {
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const mainStore = useCombatStore();
    const spectateStore = useSpectateCombatStore();
    
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore) as CombatStore;
};

/**
 * Returns the currently active Combat state (imperative getter).
 */
export const getActiveCombat = (): CombatStore => {
    const mode = useModeStore.getState();
    const isSpectating = mode.isSpectating && mode.activeView === 'target';
    return (isSpectating ? useSpectateCombatStore.getState() : useCombatStore.getState()) as CombatStore;
};

/**
 * Returns the active target name.
 */
export const useActiveTarget = () => {
    const vitals = useActiveVitals();
    return (vitals as any).target;
};

/**
 * Returns the active prompt.
 */
export const useActivePrompt = () => {
    const vitals = useActiveVitals();
    return (vitals as any).activePrompt;
};
