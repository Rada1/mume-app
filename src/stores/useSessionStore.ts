/**
 * @file useSessionStore.ts
 * @description Zustand store for session management, recording, and replay states.
 */

import { create } from 'zustand';
import { SessionMode, CombatHealthStatus } from '../types';

interface ReplayHUDState {
    roomName: string;
    roomDesc: string;
    roomTerrain: string;
    roomZone: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    move: number;
    maxMove: number;
    opponentName: string | null;
    opponentHealth: CombatHealthStatus | null;
}

interface SessionState {
    sessionMode: SessionMode;
    replayHUDState: ReplayHUDState;
    isSilentReplay: boolean;
    
    // Callback functions for replayer injection
    roomInfoFn?: (data: any) => void;
    roomExitsFn?: (data: any) => void;
    charVitalsFn?: (data: any) => void;
    roomPlayersFn?: (data: any) => void;
    roomNpcsFn?: (data: any) => void;
    roomItemsFn?: (data: any) => void;
    addPlayerFn?: (data: any) => void;
    addNpcFn?: (data: any) => void;
    removePlayerFn?: (data: any) => void;
    removeNpcFn?: (data: any) => void;
    opponentChangeFn?: (name: string | null) => void;
    commFn?: (sender: string, chan: string, msg: string) => void;
    groupAddFn?: (data: any) => void;
    groupUpdateFn?: (data: any) => void;
    groupRemoveFn?: (id: number) => void;
    groupSetFn?: (data: any[]) => void;

    // Replayer Controls
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackSpeed: number;
    currentIndex: number;
    searchResults: number[];
    trimRange: [number | null, number | null];

    // Actions
    setSessionMode: (mode: SessionMode) => void;
    setReplayHUDState: (state: Partial<ReplayHUDState>) => void;
    setIsSilentReplay: (isSilent: boolean) => void;
    
    setIsPlaying: (playing: boolean) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setPlaybackSpeed: (speed: number) => void;
    setCurrentIndex: (index: number) => void;
    setSearchResults: (results: number[]) => void;
    setTrimRange: (range: [number | null, number | null]) => void;
    setReplayerState: (state: Partial<Pick<SessionState, 'isPlaying' | 'currentTime' | 'duration' | 'playbackSpeed' | 'currentIndex' | 'searchResults' | 'trimRange'>>) => void;
    
    // Setter actions for functions
    setRoomInfoFn: (fn: (data: any) => void) => void;
    setRoomExitsFn: (fn: (data: any) => void) => void;
    setCharVitalsFn: (fn: (data: any) => void) => void;
    setRoomPlayersFn: (fn: (data: any) => void) => void;
    setRoomNpcsFn: (fn: (data: any) => void) => void;
    setRoomItemsFn: (fn: (data: any) => void) => void;
    setAddPlayerFn: (fn: (data: any) => void) => void;
    setAddNpcFn: (fn: (data: any) => void) => void;
    setRemovePlayerFn: (fn: (data: any) => void) => void;
    setRemoveNpcFn: (fn: (data: any) => void) => void;
    setOpponentChangeFn: (fn: (name: string | null) => void) => void;
    setCommFn: (fn: (sender: string, chan: string, msg: string) => void) => void;
    setGroupAddFn: (fn: (data: any) => void) => void;
    setGroupUpdateFn: (fn: (data: any) => void) => void;
    setGroupRemoveFn: (fn: (id: number) => void) => void;
    setGroupSetFn: (fn: (data: any[]) => void) => void;
}

const initialReplayHUDState: ReplayHUDState = {
    roomName: '',
    roomDesc: '',
    roomTerrain: '',
    roomZone: '',
    hp: 0,
    maxHp: 0,
    mana: 0,
    maxMana: 0,
    move: 0,
    maxMove: 0,
    opponentName: null,
    opponentHealth: null,
};

export const useSessionStore = create<SessionState>((set) => ({
    sessionMode: 'live',
    replayHUDState: initialReplayHUDState,
    isSilentReplay: false,

    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackSpeed: 1,
    currentIndex: 0,
    searchResults: [],
    trimRange: [null, null],

    setSessionMode: (sessionMode) => set({ sessionMode }),
    setReplayHUDState: (state) => set((prev) => ({ 
        replayHUDState: { ...prev.replayHUDState, ...state } 
    })),
    setIsSilentReplay: (isSilentReplay) => set({ isSilentReplay }),

    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
    setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
    setCurrentIndex: (currentIndex) => set({ currentIndex }),
    setSearchResults: (searchResults) => set({ searchResults }),
    setTrimRange: (trimRange) => set({ trimRange }),
    setReplayerState: (state) => set((prev) => ({ ...prev, ...state })),

    setRoomInfoFn: (roomInfoFn) => set({ roomInfoFn }),
    setRoomExitsFn: (roomExitsFn) => set({ roomExitsFn }),
    setCharVitalsFn: (charVitalsFn) => set({ charVitalsFn }),
    setRoomPlayersFn: (roomPlayersFn) => set({ roomPlayersFn }),
    setRoomNpcsFn: (roomNpcsFn) => set({ roomNpcsFn }),
    setRoomItemsFn: (roomItemsFn) => set({ roomItemsFn }),
    setAddPlayerFn: (addPlayerFn) => set({ addPlayerFn }),
    setAddNpcFn: (addNpcFn) => set({ addNpcFn }),
    setRemovePlayerFn: (removePlayerFn) => set({ removePlayerFn }),
    setRemoveNpcFn: (removeNpcFn) => set({ removeNpcFn }),
    setOpponentChangeFn: (opponentChangeFn) => set({ opponentChangeFn }),
    setCommFn: (commFn) => set({ commFn }),
    setGroupAddFn: (groupAddFn) => set({ groupAddFn }),
    setGroupUpdateFn: (groupUpdateFn) => set({ groupUpdateFn }),
    setGroupRemoveFn: (groupRemoveFn) => set({ groupRemoveFn }),
    setGroupSetFn: (groupSetFn) => set({ groupSetFn }),
}));
