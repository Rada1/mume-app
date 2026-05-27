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
    isReplayHUDMinimized: boolean;
    
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
    setIsReplayHUDMinimized: (minimized: boolean) => void;
    
    setIsPlaying: (playing: boolean) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setPlaybackSpeed: (speed: number) => void;
    setCurrentIndex: (index: number) => void;
    setSearchResults: (results: number[]) => void;
    setTrimRange: (range: [number | null, number | null]) => void;
    setReplayerState: (state: Partial<Pick<SessionState, 'isPlaying' | 'currentTime' | 'duration' | 'playbackSpeed' | 'currentIndex' | 'searchResults' | 'trimRange' | 'isReplayHUDMinimized'>>) => void;
}

const initialReplayHUDState: ReplayHUDState = {
    roomName: '',
    roomDesc: '',
    roomTerrain: '',
    roomZone: '',
    hp: 100,
    maxHp: 100,
    mana: 100,
    maxMana: 100,
    move: 100,
    maxMove: 100,
    opponentName: null,
    opponentHealth: null,
};

export const useSessionStore = create<SessionState>((set) => ({
    sessionMode: 'live',
    replayHUDState: initialReplayHUDState,
    isSilentReplay: false,
    isReplayHUDMinimized: false,

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
    setIsReplayHUDMinimized: (isReplayHUDMinimized) => set({ isReplayHUDMinimized }),

    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
    setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
    setCurrentIndex: (currentIndex) => set({ currentIndex }),
    setSearchResults: (searchResults) => set({ searchResults }),
    setTrimRange: (trimRange) => set({ trimRange }),
    setReplayerState: (state) => set((prev) => ({ ...prev, ...state })),

}));
