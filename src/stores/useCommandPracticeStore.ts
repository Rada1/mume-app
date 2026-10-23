/** @file useCommandPracticeStore.ts — Captures training replies independently of target selection. */
import { create } from 'zustand';
import type { CommandPracticeReportState } from '../types';
import { useRoomStore } from './useRoomStore';

// --- Report State ---
export const useCommandPracticeStore = create<CommandPracticeReportState>(set => ({
    requestId: 0, pendingCommand: null, skillName: '', lines: [],
    begin: (pendingCommand, skillName) => set(state => ({
        pendingCommand, skillName, lines: [], requestId: state.requestId + 1
    })),
    complete: (requestId, lines) => set(state => state.requestId === requestId && state.pendingCommand
        ? { lines, pendingCommand: null } : state),
    clear: () => set(state => ({ requestId: state.requestId + 1, pendingCommand: null, skillName: '', lines: [] }))
}));

// --- Room Transition Cleanup ---
useRoomStore.subscribe((room, previous) => {
    if (room.mapId !== previous.mapId || room.roomNum !== previous.roomNum || room.roomName !== previous.roomName) {
        useCommandPracticeStore.getState().clear();
    }
});
