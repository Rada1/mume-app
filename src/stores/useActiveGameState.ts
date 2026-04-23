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
 */
export const useActiveVitals = (): VitalsStore => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    
    if (mode === 'replay' || mode === 'scrubbing') return useReplayVitalsStore() as VitalsStore;
    return (isSpectating && activeView === 'target' ? useSpectateVitalsStore() : useVitalsStore()) as VitalsStore;
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
    
    if (mode === 'replay' || mode === 'scrubbing') return useReplayRoomStore() as RoomStore;
    return (isSpectating && activeView === 'target' ? useSpectateRoomStore() : useRoomStore()) as RoomStore;
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
    
    if (mode === 'replay' || mode === 'scrubbing') return useReplayCombatStore() as CombatStore;
    return (isSpectating && activeView === 'target' ? useSpectateCombatStore() : useCombatStore()) as CombatStore;
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
