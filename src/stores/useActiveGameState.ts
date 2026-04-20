/**
 * @file useActiveGameState.ts
 * @description Unifying selectors to access either the player's own state or the spectated character's state.
 * Use these hooks in the UI to ensure automatic switching when entering/leaving spectate mode.
 */

import { useModeStore } from './useModeStore';
import { useVitalsStore } from './useVitalsStore';
import { useSpectateVitalsStore } from './spectate/useSpectateVitalsStore';
import { useRoomStore } from './useRoomStore';
import { useSpectateRoomStore } from './spectate/useSpectateRoomStore';
import { useCombatStore } from './useCombatStore';
import { useSpectateCombatStore } from './spectate/useSpectateCombatStore';

/**
 * Returns the currently active Vitals state (Main or Spectate).
 */
export const useActiveVitals = () => {
    const isSpectating = useModeStore(state => state.isSpectating);
    const mainStore = useVitalsStore();
    const spectateStore = useSpectateVitalsStore();

    return isSpectating ? spectateStore : mainStore;
};

/** Non-hook version for unit tests */
export const getActiveVitals = () => {
    const isSpectating = useModeStore.getState().isSpectating;
    return isSpectating ? useSpectateVitalsStore : useVitalsStore;
};

/**
 * Returns the currently active Room state (Main or Spectate).
 */
export const useActiveRoom = () => {
    const isSpectating = useModeStore(state => state.isSpectating);
    const mainStore = useRoomStore();
    const spectateStore = useSpectateRoomStore();

    return isSpectating ? spectateStore : mainStore;
};

/** Non-hook version for unit tests */
export const getActiveRoom = () => {
    const isSpectating = useModeStore.getState().isSpectating;
    return isSpectating ? useSpectateRoomStore : useRoomStore;
};

/**
 * Returns the currently active Combat state (Main or Spectate).
 */
export const useActiveCombat = () => {
    const isSpectating = useModeStore(state => state.isSpectating);
    const mainStore = useCombatStore();
    const spectateStore = useSpectateCombatStore();

    return isSpectating ? spectateStore : mainStore;
};

/** Non-hook version for unit tests */
export const getActiveCombat = () => {
    const isSpectating = useModeStore.getState().isSpectating;
    return isSpectating ? useSpectateCombatStore : useCombatStore;
};
