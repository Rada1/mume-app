import { useModeStore } from './useModeStore';
import { useVitalsStore, VitalsStore } from './useVitalsStore';
import { useSpectateVitalsStore } from './spectate/useSpectateVitalsStore';
import { useRoomStore, RoomStore } from './useRoomStore';
import { useSpectateRoomStore } from './spectate/useSpectateRoomStore';
import { useCombatStore, CombatStore } from './useCombatStore';
import { useSpectateCombatStore } from './spectate/useSpectateCombatStore';
import { useReplayVitalsStore } from './replay/useReplayVitalsStore';
import { useReplayRoomStore } from './replay/useReplayRoomStore';
import { useReplayCombatStore } from './replay/useReplayCombatStore';

/**
 * @file useActiveGameState.ts
 * 
 * Switchboard hooks that automatically return the correct store slice 
 * (Player or Spectated Target) based on useModeStore.isSpectating.
 */

/**
 * Returns the currently active Vitals store.
 * NOTE: Using this hook subscribes the component to ALL vitals changes.
 * Prefer targeted hooks like useActiveTarget() or useActivePrompt().
 */
export const useActiveVitals = (): VitalsStore => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    
    // We must call all hooks to satisfy Rules of Hooks
    const mainStore = useVitalsStore();
    const spectateStore = useSpectateVitalsStore();
    const replayStore = useReplayVitalsStore();

    if (mode === 'replay' || mode === 'scrubbing') return replayStore as VitalsStore;
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore) as VitalsStore;
};

/**
 * Returns the currently active Vitals state (imperative getter).
 */
export const getActiveVitals = (): VitalsStore => {
    const modeState = useModeStore.getState();
    if (modeState.mode === 'replay' || modeState.mode === 'scrubbing') return useReplayVitalsStore.getState() as VitalsStore;
    const isSpectating = modeState.isSpectating && modeState.activeView === 'target';
    return (isSpectating ? useSpectateVitalsStore.getState() : useVitalsStore.getState()) as VitalsStore;
};

/**
 * Returns the active character name.
 * In live/spectate mode, returns the name from useModeStore.
 * In replay mode, returns the name captured in the replay vitals store.
 */
export const useActiveCharacter = () => {
    const mode = useModeStore(state => state.mode);
    const modeName = useModeStore(state => state.activeCharacter);
    const replayName = useReplayVitalsStore(state => state.characterInfo.name);
    
    if (mode === 'replay' || mode === 'scrubbing') return replayName || modeName;
    return modeName;
};

/**
 * Returns the active character name (imperative getter).
 */
export const getActiveCharacter = () => {
    const modeState = useModeStore.getState();
    if (modeState.mode === 'replay' || modeState.mode === 'scrubbing') {
        return useReplayVitalsStore.getState().characterInfo.name || modeState.activeCharacter;
    }
    return modeState.activeCharacter;
};

/**
 * Returns the currently active Room store.
 */
export const useActiveRoom = (): RoomStore => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    
    const mainStore = useRoomStore();
    const spectateStore = useSpectateRoomStore();
    const replayStore = useReplayRoomStore();

    if (mode === 'replay' || mode === 'scrubbing') return replayStore as RoomStore;
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore) as RoomStore;
};

/**
 * Returns the currently active Room state (imperative getter).
 */
export const getActiveRoom = (): RoomStore => {
    const modeState = useModeStore.getState();
    if (modeState.mode === 'replay' || modeState.mode === 'scrubbing') return useReplayRoomStore.getState() as RoomStore;
    const isSpectating = modeState.isSpectating && modeState.activeView === 'target';
    return (isSpectating ? useSpectateRoomStore.getState() : useRoomStore.getState()) as RoomStore;
};

/**
 * Returns the currently active Combat store.
 */
export const useActiveCombat = (): CombatStore => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    
    const mainStore = useCombatStore();
    const spectateStore = useSpectateCombatStore();
    const replayStore = useReplayCombatStore();

    if (mode === 'replay' || mode === 'scrubbing') return replayStore as CombatStore;
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore) as CombatStore;
};

/**
 * Returns the currently active Combat state (imperative getter).
 */
export const getActiveCombat = (): CombatStore => {
    const modeState = useModeStore.getState();
    if (modeState.mode === 'replay' || modeState.mode === 'scrubbing') return useReplayCombatStore.getState() as CombatStore;
    const isSpectating = modeState.isSpectating && modeState.activeView === 'target';
    return (isSpectating ? useSpectateCombatStore.getState() : useCombatStore.getState()) as CombatStore;
};

/**
 * Returns the active target name.
 */
export const useActiveTarget = () => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    
    const mainTarget = useVitalsStore(state => state.target);
    const spectateTarget = useSpectateVitalsStore(state => state.target);
    const replayTarget = useReplayVitalsStore(state => state.target);

    if (mode === 'replay' || mode === 'scrubbing') return replayTarget;
    return isSpectating ? spectateTarget : mainTarget;
};

/**
 * Returns the active prompt.
 */
export const useActivePrompt = () => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    
    const mainPrompt = useVitalsStore(state => state.activePrompt);
    const spectatePrompt = useSpectateVitalsStore(state => state.activePrompt);
    const replayPrompt = useReplayVitalsStore(state => state.activePrompt);

    if (mode === 'replay' || mode === 'scrubbing') return replayPrompt;
    return isSpectating ? spectatePrompt : mainPrompt;
};
