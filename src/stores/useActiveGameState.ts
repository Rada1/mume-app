import { useModeStore } from './useModeStore';
import { useVitalsStore, VitalsStore } from './useVitalsStore';
import { useSpectateVitalsStore } from './useSpectateVitalsStore';
import { useRoomStore, RoomStore } from './useRoomStore';
import { useSpectateRoomStore } from './useSpectateRoomStore';
import { useCombatStore, CombatStore } from './useCombatStore';
import { useSpectateCombatStore } from './useSpectateCombatStore';

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
    const mainStore = useVitalsStore();
    const spectateStore = useSpectateVitalsStore();
    
    return isSpectating ? spectateStore : mainStore;
};

/**
 * Returns the currently active Vitals state (imperative getter).
 */
export const getActiveVitals = (): VitalsStore => {
    const isSpectating = useModeStore.getState().isSpectating;
    return isSpectating ? useSpectateVitalsStore.getState() : useVitalsStore.getState();
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
    const mainStore = useRoomStore();
    const spectateStore = useSpectateRoomStore();
    
    return isSpectating ? spectateStore : mainStore;
};

/**
 * Returns the currently active Room state (imperative getter).
 */
export const getActiveRoom = (): RoomStore => {
    const isSpectating = useModeStore.getState().isSpectating;
    return isSpectating ? useSpectateRoomStore.getState() : useRoomStore.getState();
};

/**
 * Returns the currently active Combat store.
 */
export const useActiveCombat = (): CombatStore => {
    const isSpectating = useModeStore(state => state.isSpectating);
    const mainStore = useCombatStore();
    const spectateStore = useSpectateCombatStore();
    
    return isSpectating ? spectateStore : mainStore;
};

/**
 * Returns the currently active Combat state (imperative getter).
 */
export const getActiveCombat = (): CombatStore => {
    const isSpectating = useModeStore.getState().isSpectating;
    return isSpectating ? useSpectateCombatStore.getState() : useCombatStore.getState();
};

/**
 * Returns the active target name.
 */
export const useActiveTarget = () => {
    const vitals = useActiveVitals();
    return vitals.target;
};

/**
 * Returns the active prompt.
 */
export const useActivePrompt = () => {
    const vitals = useActiveVitals();
    return vitals.activePrompt;
};
