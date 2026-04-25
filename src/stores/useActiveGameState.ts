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
 * Returns the currently active Vitals store state.
 * NOTE: Using this hook subscribes the component to ALL vitals changes in that store.
 * Prefer targeted hooks like useActiveTarget() or useActivePrompt().
 */
export const useActiveVitals = (): VitalsStore => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    
    // Always call all hooks to satisfy Rules of Hooks
    const mainStore = useVitalsStore();
    const spectateStore = useSpectateVitalsStore();
    const replayStore = useReplayVitalsStore();

    if (mode === 'replay' || mode === 'scrubbing') return replayStore;
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore);
};

/**
 * Returns the currently active Vitals state (imperative getter).
 */
export const getActiveVitals = (): VitalsStore => {
    const modeState = useModeStore.getState();
    if (modeState.mode === 'replay' || modeState.mode === 'scrubbing') return useReplayVitalsStore.getState();
    const isSpectating = modeState.isSpectating && modeState.activeView === 'target';
    return (isSpectating ? useSpectateVitalsStore.getState() : useVitalsStore.getState());
};

/**
 * Returns the active character name.
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
 * Returns the currently active Room store state.
 */
export const useActiveRoom = (): RoomStore => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    
    const mainStore = useRoomStore();
    const spectateStore = useSpectateRoomStore();
    const replayStore = useReplayRoomStore();

    if (mode === 'replay' || mode === 'scrubbing') return replayStore;
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore);
};

/**
 * Returns the currently active Room state (imperative getter).
 */
export const getActiveRoom = (): RoomStore => {
    const modeState = useModeStore.getState();
    if (modeState.mode === 'replay' || modeState.mode === 'scrubbing') return useReplayRoomStore.getState();
    const isSpectating = modeState.isSpectating && modeState.activeView === 'target';
    return (isSpectating ? useSpectateRoomStore.getState() : useRoomStore.getState());
};

/**
 * Returns the currently active Combat store state.
 */
export const useActiveCombat = (): CombatStore => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    
    const mainStore = useCombatStore();
    const spectateStore = useSpectateCombatStore();
    const replayStore = useReplayCombatStore();

    if (mode === 'replay' || mode === 'scrubbing') return replayStore;
    return (isSpectating && activeView === 'target' ? spectateStore : mainStore);
};

/**
 * Returns the currently active Combat state (imperative getter).
 */
export const getActiveCombat = (): CombatStore => {
    const modeState = useModeStore.getState();
    if (modeState.mode === 'replay' || modeState.mode === 'scrubbing') return useReplayCombatStore.getState();
    const isSpectating = modeState.isSpectating && modeState.activeView === 'target';
    return (isSpectating ? useSpectateCombatStore.getState() : useCombatStore.getState());
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

/**
 * Returns the active room name.
 */
export const useActiveRoomName = () => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    
    const mainName = useRoomStore(state => state.roomName);
    const spectateName = useSpectateRoomStore(state => state.roomName);
    const replayName = useReplayRoomStore(state => state.roomName);

    if (mode === 'replay' || mode === 'scrubbing') return replayName;
    return isSpectating ? spectateName : mainName;
};

/**
 * Returns the active room description.
 */
export const useActiveRoomDesc = () => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    
    const mainDesc = useRoomStore(state => state.roomDesc);
    const spectateDesc = useSpectateRoomStore(state => state.roomDesc);
    const replayDesc = useReplayRoomStore(state => state.roomDesc);

    if (mode === 'replay' || mode === 'scrubbing') return replayDesc;
    return isSpectating ? spectateDesc : mainDesc;
};

/**
 * Returns the active room occupants (players and NPCs).
 */
export const useActiveOccupants = () => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    
    const mainPlayers = useRoomStore(state => state.players);
    const mainNpcs = useRoomStore(state => state.npcs);
    
    const spectatePlayers = useSpectateRoomStore(state => state.players);
    const spectateNpcs = useSpectateRoomStore(state => state.npcs);

    const replayPlayers = useReplayRoomStore(state => state.players);
    const replayNpcs = useReplayRoomStore(state => state.npcs);

    if (mode === 'replay' || mode === 'scrubbing') return { players: replayPlayers, npcs: replayNpcs };
    if (isSpectating) return { players: spectatePlayers, npcs: spectateNpcs };
    return { players: mainPlayers, npcs: mainNpcs };
};

/**
 * Returns the active combat opponent info.
 */
export const useActiveOpponent = () => {
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    
    const mainName = useCombatStore(state => state.opponentName);
    const mainStatus = useCombatStore(state => state.opponentHealthStatus);

    const spectateName = useSpectateCombatStore(state => state.opponentName);
    const spectateStatus = useSpectateCombatStore(state => state.opponentHealthStatus);

    const replayName = useReplayCombatStore(state => state.opponentName);
    const replayStatus = useReplayCombatStore(state => state.opponentHealthStatus);

    if (mode === 'replay' || mode === 'scrubbing') return { name: replayName, status: replayStatus };
    if (isSpectating) return { name: spectateName, status: spectateStatus };
    return { name: mainName, status: mainStatus };
};
