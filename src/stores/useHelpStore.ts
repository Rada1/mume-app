/**
 * @file useHelpStore.ts
 * @description Store for MUME help topics, history navigation, and docked help window state.
 */

import { create } from 'zustand';

// --- Types Section ---

export interface HelpHistoryEntry {
    topic: string;
    data: string;
}

export interface HelpStoreState {
    isOpen: boolean;
    currentTopic: string;
    helpData: string;
    history: HelpHistoryEntry[];
    historyIndex: number;
    isLoading: boolean;

    setIsOpen: (isOpen: boolean) => void;
    setHelpData: (topic: string, data: string) => void;
    setIsLoading: (isLoading: boolean) => void;
    goBack: () => void;
    goForward: () => void;
    clear: () => void;
}

// --- Store Implementation ---

export const useHelpStore = create<HelpStoreState>((set, get) => ({
    isOpen: false,
    currentTopic: '',
    helpData: '',
    history: [],
    historyIndex: -1,
    isLoading: false,

    setIsOpen: (isOpen: boolean) => set({ isOpen }),

    setHelpData: (topic: string, data: string) => {
        const { history, historyIndex } = get();
        const trimmed = data.trim();
        if (!trimmed) return;

        // Truncate forward history if we navigated back and then viewed a new topic
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ topic, data });

        set({
            currentTopic: topic,
            helpData: data,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isLoading: false,
            isOpen: true
        });
    },

    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    goBack: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
            const nextIdx = historyIndex - 1;
            const entry = history[nextIdx];
            set({
                historyIndex: nextIdx,
                currentTopic: entry.topic,
                helpData: entry.data
            });
        }
    },

    goForward: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
            const nextIdx = historyIndex + 1;
            const entry = history[nextIdx];
            set({
                historyIndex: nextIdx,
                currentTopic: entry.topic,
                helpData: entry.data
            });
        }
    },

    clear: () => set({
        currentTopic: '',
        helpData: '',
        history: [],
        historyIndex: -1,
        isLoading: false
    })
}));
